import { formatRelativeTime } from "../utils/project-status";

function updateRelativeTimes(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-relative-at]")) {
    const at = el.dataset.relativeAt;
    if (!at) continue;

    const date = new Date(at);
    if (Number.isNaN(date.getTime())) continue;

    const prefix = el.dataset.relativePrefix?.trim();
    const relative = formatRelativeTime(date);
    el.textContent = prefix ? `${prefix} ${relative}` : relative;
  }
}

let refreshInterval: number | undefined;

export function initRelativeTimes() {
  if (refreshInterval !== undefined) {
    window.clearInterval(refreshInterval);
  }

  updateRelativeTimes();
  refreshInterval = window.setInterval(() => updateRelativeTimes(), 60_000);
}
