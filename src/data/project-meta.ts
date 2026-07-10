import meta from "./project-meta.json";

export interface ProjectRepoMeta {
  pushedAt: string;
  archived?: boolean;
  lastCommitMessage?: string;
}

export type ProjectMetaMap = Record<string, ProjectRepoMeta>;

export const projectMeta = meta.projects as ProjectMetaMap;
export const projectMetaFetchedAt = meta.fetchedAt;
