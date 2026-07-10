import type { ProjectRole } from "../utils/project-status";

type SortMode = "updated" | "shipped";
type RoleFilter = "all" | ProjectRole;

function isStuffPage(pathname = window.location.pathname): boolean {
  return pathname.replace(/\/$/, "") === "/stuff";
}

function getStuffPathname(): string {
  return window.location.pathname;
}

function getAvailableRoles(root: HTMLElement): ProjectRole[] {
  const value = root.dataset.stuffRoles ?? "";
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean) as ProjectRole[];
}

function getSortFromUrl(): SortMode {
  const value = new URLSearchParams(window.location.search).get("sort");
  if (value === "shipped" || value === "added" || value === "newest") {
    return "shipped";
  }
  return "updated";
}

function getRoleFromUrl(availableRoles: ProjectRole[]): RoleFilter {
  const value = new URLSearchParams(window.location.search).get("role");
  if (!value || value === "all") return "all";
  if (availableRoles.includes(value as ProjectRole)) {
    return value as ProjectRole;
  }
  return "all";
}

function updateUrl(sort: SortMode, role: RoleFilter) {
  const params = new URLSearchParams();
  if (sort !== "updated") params.set("sort", sort);
  if (role !== "all") params.set("role", role);

  const query = params.toString();
  const pathname = getStuffPathname();
  const nextUrl = query ? `${pathname}?${query}` : pathname;
  const currentUrl = `${pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    history.replaceState(null, "", nextUrl);
  }
}

function applyFilters(root: HTMLElement) {
  const grid = root.querySelector<HTMLElement>("[data-stuff-grid]");
  const emptyState = root.querySelector<HTMLElement>("[data-stuff-empty]");
  if (!grid) return;

  const availableRoles = getAvailableRoles(root);
  const sort = getSortFromUrl();
  const role = getRoleFromUrl(availableRoles);
  const items = [...grid.querySelectorAll<HTMLElement>("[data-stuff-item]")];

  items.sort((a, b) => {
    if (sort === "updated") {
      return Number(b.dataset.activeDate) - Number(a.dataset.activeDate);
    }
    return Number(b.dataset.pubDate) - Number(a.dataset.pubDate);
  });

  for (const item of items) {
    grid.appendChild(item);
  }

  let visibleCount = 0;

  for (const item of items) {
    const matchesRole = role === "all" || item.dataset.role === role;
    item.hidden = !matchesRole;
    if (matchesRole) visibleCount += 1;
  }

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }

  root.querySelectorAll<HTMLButtonElement>("[data-stuff-sort]").forEach((btn) => {
    const isActive = btn.dataset.stuffSort === sort;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });

  root.querySelectorAll<HTMLButtonElement>("[data-stuff-role]").forEach((btn) => {
    const isActive = btn.dataset.stuffRole === role;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function setupPopstateListener() {
  const win = window as Window & { __stuffFiltersPopstate?: boolean };
  if (win.__stuffFiltersPopstate) return;

  win.__stuffFiltersPopstate = true;
  window.addEventListener("popstate", () => {
    if (!isStuffPage()) return;
    const root = document.querySelector<HTMLElement>("[data-stuff-filters]");
    if (root) applyFilters(root);
  });
}

export function initStuffFilters() {
  const root = document.querySelector<HTMLElement>("[data-stuff-filters]");
  if (!root || root.dataset.initialized === "true") return;

  root.dataset.initialized = "true";
  setupPopstateListener();

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const availableRoles = getAvailableRoles(root);
    const sort = getSortFromUrl();
    const role = getRoleFromUrl(availableRoles);

    const nextSort = target.dataset.stuffSort as SortMode | undefined;
    if (nextSort) {
      updateUrl(nextSort, role);
      applyFilters(root);
      return;
    }

    const nextRole = target.dataset.stuffRole as RoleFilter | undefined;
    if (nextRole) {
      updateUrl(sort, nextRole);
      applyFilters(root);
    }
  });

  applyFilters(root);
}
