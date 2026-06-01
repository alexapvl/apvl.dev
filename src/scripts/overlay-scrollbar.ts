let scrollbarRoot: HTMLDivElement | null = null;
let scrollbarThumb: HTMLDivElement | null = null;
let listenersBound = false;
let frameId = 0;
let hideTimeout = 0;
const HIDE_DELAY_MS = 900;

function ensureScrollbar() {
  scrollbarRoot = document.querySelector(".page-scrollbar");
  scrollbarThumb = document.querySelector(".page-scrollbar-thumb");

  if (scrollbarRoot && scrollbarThumb) return;

  scrollbarRoot = document.createElement("div");
  scrollbarRoot.className = "page-scrollbar";
  scrollbarRoot.setAttribute("aria-hidden", "true");

  scrollbarThumb = document.createElement("div");
  scrollbarThumb.className = "page-scrollbar-thumb";

  scrollbarRoot.appendChild(scrollbarThumb);
  document.body.appendChild(scrollbarRoot);
}

function isPageScrollLocked(): boolean {
  return (
    document.body.style.overflow === "hidden" ||
    document.documentElement.style.overflow === "hidden"
  );
}

function scheduleHide() {
  if (hideTimeout) {
    window.clearTimeout(hideTimeout);
  }

  hideTimeout = window.setTimeout(() => {
    hideTimeout = 0;
    if (scrollbarRoot?.classList.contains("is-dragging")) return;
    scrollbarRoot?.classList.remove("is-visible");
  }, HIDE_DELAY_MS);
}

function showScrollbar() {
  if (!scrollbarRoot || scrollbarRoot.hidden || isPageScrollLocked()) return;

  scrollbarRoot.classList.add("is-visible");
  scheduleHide();
}

function updateScrollbar() {
  if (!scrollbarRoot || !scrollbarThumb) return;

  const doc = document.documentElement;
  const maxScroll = doc.scrollHeight - window.innerHeight;

  if (maxScroll <= 1 || isPageScrollLocked()) {
    scrollbarRoot.hidden = true;
    scrollbarRoot.classList.remove("is-visible");
    return;
  }

  scrollbarRoot.hidden = false;

  const trackHeight = window.innerHeight;
  const thumbHeight = Math.max(
    40,
    (window.innerHeight / doc.scrollHeight) * trackHeight
  );
  const maxThumbTop = trackHeight - thumbHeight;
  const thumbTop = (window.scrollY / maxScroll) * maxThumbTop;

  scrollbarThumb.style.height = `${thumbHeight}px`;
  scrollbarThumb.style.transform = `translateY(${thumbTop}px)`;
}

function scheduleUpdate() {
  if (frameId) return;

  frameId = requestAnimationFrame(() => {
    frameId = 0;
    updateScrollbar();
  });
}

function onScroll() {
  scheduleUpdate();
  showScrollbar();
}

function bindDrag() {
  if (!scrollbarThumb) return;
  if (scrollbarThumb.dataset.dragBound === "true") return;
  scrollbarThumb.dataset.dragBound = "true";

  let dragging = false;
  let startY = 0;
  let startScrollY = 0;

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragging) return;

    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const thumbHeight = scrollbarThumb?.offsetHeight ?? 0;
    const maxThumbTop = window.innerHeight - thumbHeight;

    if (maxThumbTop <= 0) return;

    const delta = event.clientY - startY;
    const scrollDelta = (delta / maxThumbTop) * maxScroll;
    window.scrollTo({ top: startScrollY + scrollDelta });
    showScrollbar();
  };

  const handlePointerUp = () => {
    dragging = false;
    scrollbarRoot?.classList.remove("is-dragging");
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    scheduleHide();
  };

  scrollbarThumb.addEventListener("pointerdown", (event) => {
    dragging = true;
    startY = event.clientY;
    startScrollY = window.scrollY;
    scrollbarRoot?.classList.add("is-dragging");
    showScrollbar();
    scrollbarThumb?.setPointerCapture(event.pointerId);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    event.preventDefault();
  });
}

function watchScrollLock() {
  const observer = new MutationObserver(scheduleUpdate);

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
}

export function initOverlayScrollbar() {
  ensureScrollbar();

  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("astro:page-load", scheduleUpdate);
    watchScrollLock();
  }

  bindDrag();
  scheduleUpdate();
}
