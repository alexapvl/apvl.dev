let scrollbarRoot: HTMLDivElement | null = null;
let scrollbarThumb: HTMLDivElement | null = null;
let listenersBound = false;
let frameId = 0;

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

function updateScrollbar() {
  if (!scrollbarRoot || !scrollbarThumb) return;

  const doc = document.documentElement;
  const maxScroll = doc.scrollHeight - window.innerHeight;

  if (maxScroll <= 1) {
    scrollbarRoot.hidden = true;
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
  };

  const handlePointerUp = () => {
    dragging = false;
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  };

  scrollbarThumb.addEventListener("pointerdown", (event) => {
    dragging = true;
    startY = event.clientY;
    startScrollY = window.scrollY;
    scrollbarThumb?.setPointerCapture(event.pointerId);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    event.preventDefault();
  });
}

export function initOverlayScrollbar() {
  ensureScrollbar();

  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("astro:page-load", scheduleUpdate);
  }

  bindDrag();
  scheduleUpdate();
}
