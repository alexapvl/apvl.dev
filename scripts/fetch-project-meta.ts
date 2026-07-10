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

function loadExistingMeta(): MetaFile {
  if (!existsSync(META_PATH)) {
    return { projects: {}, fetchedAt: new Date(0).toISOString() };
  }

  try {
    return JSON.parse(readFileSync(META_PATH, "utf-8")) as MetaFile;
  } catch {
    return { projects: {}, fetchedAt: new Date(0).toISOString() };
  }
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
): Promise<ProjectRepoMeta | null> {
  const repoRes = await githubFetch(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) {
    console.warn(
      `fetch-project-meta: repo ${owner}/${repo} failed (${repoRes.status})`
    );
    return null;
  }

  const repoData = (await repoRes.json()) as {
    pushed_at: string;
    archived?: boolean;
  };

  let lastCommitMessage: string | undefined;
  const commitsRes = await githubFetch(
    `/repos/${owner}/${repo}/commits?per_page=1`,
    token
  );

  if (commitsRes.ok) {
    const commits = (await commitsRes.json()) as Array<{
      commit?: { message?: string };
    }>;
    lastCommitMessage = commits[0]?.commit?.message?.split("\n")[0]?.trim();
  }

  const meta: ProjectRepoMeta = {
    pushedAt: repoData.pushed_at,
    lastCommitMessage,
  };

  if (repoData.archived) {
    meta.archived = true;
  }

  return meta;
}

async function main() {
  if (process.env.SKIP_PROJECT_META_FETCH === "1") {
    console.log("fetch-project-meta: skipped (SKIP_PROJECT_META_FETCH=1)");
    return;
  }

  const existing = loadExistingMeta();
  const projects: Record<string, ProjectRepoMeta> = { ...existing.projects };
  const token = process.env.GITHUB_TOKEN;
  const entries = getStuffEntries().filter((entry) => entry.github);

  if (entries.length === 0) {
    console.log("fetch-project-meta: no GitHub repos found in stuff collection");
    return;
  }

  let updated = 0;

  for (const entry of entries) {
    const parsed = parseGithubUrl(entry.github!);
    if (!parsed) {
      console.warn(
        `fetch-project-meta: could not parse GitHub URL for ${entry.slug}`
      );
      continue;
    }

    try {
      const meta = await fetchRepoMeta(parsed.owner, parsed.repo, token);
      if (!meta) continue;

      projects[entry.slug] = meta;
      updated += 1;
      console.log(`fetch-project-meta: updated ${entry.slug}`);
    } catch (error) {
      console.warn(`fetch-project-meta: ${entry.slug} failed`, error);
    }
  }

  if (updated === 0) {
    console.log(
      "fetch-project-meta: no updates from GitHub, keeping existing metadata"
    );
    return;
  }

  const output: MetaFile = {
    projects,
    fetchedAt: new Date().toISOString(),
  };

  writeFileSync(META_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`fetch-project-meta: wrote ${updated} project(s) to project-meta.json`);
}

main().catch((error) => {
  console.warn("fetch-project-meta: failed, keeping existing metadata", error);
});
