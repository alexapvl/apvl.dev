import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ProjectRepoMeta {
  pushedAt: string;
  archived?: boolean;
  lastCommitMessage?: string;
}

export type ProjectMetaMap = Record<string, ProjectRepoMeta>;

interface ProjectMetaFile {
  projects: ProjectMetaMap;
  fetchedAt: string;
}

const meta = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/project-meta.json"), "utf-8")
) as ProjectMetaFile;

export const projectMeta = meta.projects;
export const projectMetaFetchedAt = meta.fetchedAt;
