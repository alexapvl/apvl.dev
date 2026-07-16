import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STUFF_DIR = join(ROOT, "src/content/stuff");
const META_PATH = join(ROOT, "src/data/project-meta.json");

interface ProjectRepoMeta {
  pushedAt: string;
  archived?: boolean;
  lastCommitMessage?: string;
}

interface MetaFile {
  projects: Record<string, ProjectRepoMeta>;
  fetchedAt: string;
}

interface StuffEntry {
  slug: string;
  github?: string;
}

const IGNORED_COMMIT_AUTHORS = new Set(["github-actions[bot]"]);
const IGNORED_COMMIT_MESSAGE_PATTERNS = [
  /^chore:\s*refresh project metadata/i,
];

function isIgnoredCommit(entry: {
  author?: { login?: string | null } | null;
  commit?: { message?: string };
}): boolean {
  const author = entry.author?.login;
  if (author && IGNORED_COMMIT_AUTHORS.has(author)) return true;

  const message = entry.commit?.message?.split("\n")[0]?.trim() ?? "";
  if (!message) return true;

  return IGNORED_COMMIT_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(message)
  );
}

function getStuffEntries(): StuffEntry[] {
  const entries: StuffEntry[] = [];

  for (const dir of readdirSync(STUFF_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const filePath = join(STUFF_DIR, dir.name, "index.mdx");
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, "utf-8");
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const slug =
      frontmatter.match(/^slug:\s*["']?([^"'\n]+)["']?/m)?.[1] ?? dir.name;
    const github = frontmatter.match(/^github:\s*["']?([^"'\n]+)["']?/m)?.[1];

    entries.push({ slug, github });
  }

  return entries;
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

function getGithubToken(): string {
  const environmentToken =
    process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (environmentToken) return environmentToken;

  try {
    const cliToken = execFileSync("gh", ["auth", "token"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (cliToken) return cliToken;
  } catch {
    // The error below includes both supported authentication paths.
  }

  throw new Error(
    "GitHub authentication required: set GITHUB_TOKEN or run `gh auth login`"
  );
}

async function githubFetch(path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "apvl-dev-fetch-script",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`https://api.github.com${path}`, { headers });
}

async function fetchRepoMeta(
  owner: string,
  repo: string,
  token?: string
): Promise<ProjectRepoMeta> {
  const repoRes = await githubFetch(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) {
    throw new Error(
      `repo ${owner}/${repo} request failed (${repoRes.status})`
    );
  }

  const repoData = (await repoRes.json()) as {
    pushed_at: string;
    archived?: boolean;
  };

  let lastCommitMessage: string | undefined;
  let pushedAt = repoData.pushed_at;
  const commitsRes = await githubFetch(
    `/repos/${owner}/${repo}/commits?per_page=10`,
    token
  );

  if (!commitsRes.ok) {
    throw new Error(
      `commits for ${owner}/${repo} request failed (${commitsRes.status})`
    );
  }

  const commits = (await commitsRes.json()) as Array<{
    author?: { login?: string | null } | null;
    commit?: { message?: string; author?: { date?: string } };
  }>;

  const meaningful = commits.find((entry) => !isIgnoredCommit(entry));

  if (meaningful?.commit) {
    lastCommitMessage =
      meaningful.commit.message?.split("\n")[0]?.trim() || undefined;
    if (meaningful.commit.author?.date) {
      pushedAt = meaningful.commit.author.date;
    }
  }

  const meta: ProjectRepoMeta = {
    pushedAt,
    lastCommitMessage,
  };

  if (repoData.archived) {
    meta.archived = true;
  }

  return meta;
}

async function main() {
  const projects: Record<string, ProjectRepoMeta> = {};
  const token = getGithubToken();
  const entries = getStuffEntries().filter((entry) => entry.github);

  if (entries.length === 0) {
    throw new Error("no GitHub repos found in stuff collection");
  }

  for (const entry of entries) {
    const parsed = parseGithubUrl(entry.github!);
    if (!parsed) {
      throw new Error(
        `could not parse GitHub URL for ${entry.slug}: ${entry.github}`
      );
    }

    projects[entry.slug] = await fetchRepoMeta(
      parsed.owner,
      parsed.repo,
      token
    );
    console.log(`fetch-project-meta: updated ${entry.slug}`);
  }

  const output: MetaFile = {
    projects,
    fetchedAt: new Date().toISOString(),
  };

  writeFileSync(META_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `fetch-project-meta: wrote ${entries.length} project(s) to project-meta.json`
  );
}

main().catch((error) => {
  console.error("fetch-project-meta: failed", error);
  process.exitCode = 1;
});
