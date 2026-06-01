/**
 * Mobile navigation — drwr sheet + hamburger trigger
 */

import { Sheet } from "@alexapvl/drwr";

const MOBILE_QUERY = "(max-width: 640px)";
const SHEET_TOP_PADDING = 40;
const SHEET_SIDE_PADDING = 16;
const SHEET_CLOSE_THRESHOLD = 0.2;
const SNAP_VELOCITY_THRESHOLD = 400;
const SNAP_FLING_THRESHOLD = 1200;

type MobileNavWindow = Window & {
  __mobileNavSheet?: Sheet;
  __mobileNavEscapeHandler?: (event: KeyboardEvent) => void;
  __mobileNavDragSyncCleanup?: () => void;
};

class VelocityTracker {
  private samples: { time: number; value: number }[] = [];

  reset(): void {
    this.samples = [];
  }

  add(value: number): void {
    this.samples.push({ time: performance.now(), value });
    if (this.samples.length > 8) {
      this.samples.shift();
    }
  }

  getVelocity(): number {
    if (this.samples.length < 2) return 0;

    const last = this.samples[this.samples.length - 1];
    let first = this.samples[0];

    for (let i = this.samples.length - 2; i >= 0; i--) {
      if (last.time - this.samples[i].time >= 30) {
        first = this.samples[i];
        break;
      }
    }

    const deltaTime = (last.time - first.time) / 1000;
    return deltaTime === 0 ? 0 : (last.value - first.value) / deltaTime;
  }
}

/** Mirrors drwr's snap resolver (T in @alexapvl/drwr). */
function resolveSnapTarget(
  currentH: number,
  velocity: number,
  snapPixels: number[],
): number {
  if (snapPixels.length === 0) return currentH;
  if (snapPixels.length === 1) return snapPixels[0];

  const sorted = [...snapPixels].sort((a, b) => a - b);

  if (Math.abs(velocity) > SNAP_FLING_THRESHOLD) {
    return velocity > 0 ? sorted[sorted.length - 1] : sorted[0];
  }

  if (Math.abs(velocity) > SNAP_VELOCITY_THRESHOLD) {
    if (velocity > 0) {
      for (const point of sorted) {
        if (point > currentH + 2) return point;
      }
      return sorted[sorted.length - 1];
    }

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] < currentH - 2) return sorted[i];
    }
    return sorted[0];
  }

  let closest = sorted[0];
  let closestDistance = Math.abs(currentH - sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const distance = Math.abs(currentH - sorted[i]);
    if (distance < closestDistance) {
      closest = sorted[i];
      closestDistance = distance;
    }
  }

  return closest;
}

/** Mirrors drwr's drag onEnd close decision. */
function willCloseOnDragRelease(
  currentH: number,
  trackerVelocity: number,
  snapPixels: number[],
  closeThreshold: number,
): boolean {
  const velocity = -trackerVelocity;
  let target = resolveSnapTarget(currentH, velocity, snapPixels);

  const positiveSnaps = snapPixels.filter((px) => px > 0);
  if (
    positiveSnaps.length > 0 &&
    currentH < positiveSnaps[0] * closeThreshold
  ) {
    target = 0;
  }

  return target <= 0.5;
}

function getHamburgerBtn(): HTMLButtonElement | null {
  return document.getElementById("hamburger-btn") as HTMLButtonElement | null;
}

function syncHamburger(open: boolean): void {
  const hamburgerBtn = getHamburgerBtn();
  if (!hamburgerBtn) return;

  hamburgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
  hamburgerBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function getMaxSheetHeight(): number {
  return Math.max(0, window.innerHeight - SHEET_TOP_PADDING);
}

function getContentSnapPoint(container: HTMLElement): number {
  const contentEl = container.querySelector(".drwr-content");
  const handleEl = container.querySelector(".drwr-handle");
  const maxHeight = getMaxSheetHeight();

  if (!contentEl || maxHeight <= 0) return 1;

  const contentHeight =
    contentEl.scrollHeight + (handleEl?.getBoundingClientRect().height ?? 0);

  return Math.min(1, Math.max(0.15, contentHeight / maxHeight));
}

function getSnapPixels(container: HTMLElement): number[] {
  const contentSnap = getContentSnapPoint(container);
  const openHeight = contentSnap * getMaxSheetHeight();
  return [0, openHeight].sort((a, b) => a - b);
}

function getSheetHeight(sheetEl: HTMLElement): number {
  const styledHeight = parseFloat(sheetEl.style.height);
  if (Number.isFinite(styledHeight) && styledHeight > 0) {
    return styledHeight;
  }

  return sheetEl.getBoundingClientRect().height;
}

function bindDragCloseSync(container: HTMLElement): void {
  const sheetEl = container.querySelector(".drwr-sheet");
  if (!sheetEl) return;

  const appWindow = window as MobileNavWindow;
  appWindow.__mobileNavDragSyncCleanup?.();

  const tracker = new VelocityTracker();

  const onPointerDown = (event: PointerEvent) => {
    tracker.reset();
    tracker.add(event.clientY);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (sheetEl.getAttribute("data-dragging") !== "true") return;
    tracker.add(event.clientY);
  };

  const onPointerUp = () => {
    if (sheetEl.getAttribute("data-dragging") !== "true") {
      tracker.reset();
      return;
    }

    const currentH = getSheetHeight(sheetEl);
    const willClose = willCloseOnDragRelease(
      currentH,
      tracker.getVelocity(),
      getSnapPixels(container),
      SHEET_CLOSE_THRESHOLD,
    );

    if (willClose) {
      syncHamburger(false);
    }

    tracker.reset();
  };

  sheetEl.addEventListener("pointerdown", onPointerDown, true);
  sheetEl.addEventListener("pointermove", onPointerMove, true);
  sheetEl.addEventListener("pointerup", onPointerUp, true);
  sheetEl.addEventListener("pointercancel", onPointerUp, true);

  appWindow.__mobileNavDragSyncCleanup = () => {
    sheetEl.removeEventListener("pointerdown", onPointerDown, true);
    sheetEl.removeEventListener("pointermove", onPointerMove, true);
    sheetEl.removeEventListener("pointerup", onPointerUp, true);
    sheetEl.removeEventListener("pointercancel", onPointerUp, true);
  };
}

function bindSheetCloseSync(container: HTMLElement): void {
  const overlay = container.querySelector(".drwr-overlay");
  overlay?.addEventListener("click", () => syncHamburger(false));

  const appWindow = window as MobileNavWindow;

  if (appWindow.__mobileNavEscapeHandler) {
    document.removeEventListener("keydown", appWindow.__mobileNavEscapeHandler);
  }

  appWindow.__mobileNavEscapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      syncHamburger(false);
    }
  };

  document.addEventListener("keydown", appWindow.__mobileNavEscapeHandler);
}

function handleHamburgerClick(): void {
  const appWindow = window as MobileNavWindow;
  const sheet = appWindow.__mobileNavSheet;
  if (!sheet) return;

  if (sheet.isOpen) {
    syncHamburger(false);
    sheet.close();
  } else {
    syncHamburger(true);
    sheet.open();
  }
}

export function destroyMobileNav(): void {
  const appWindow = window as MobileNavWindow;
  const sheet = appWindow.__mobileNavSheet;
  const hamburgerBtn = getHamburgerBtn();

  if (hamburgerBtn) {
    hamburgerBtn.removeEventListener("click", handleHamburgerClick);
  }

  if (appWindow.__mobileNavEscapeHandler) {
    document.removeEventListener("keydown", appWindow.__mobileNavEscapeHandler);
    appWindow.__mobileNavEscapeHandler = undefined;
  }

  appWindow.__mobileNavDragSyncCleanup?.();
  appWindow.__mobileNavDragSyncCleanup = undefined;

  if (sheet) {
    sheet.destroy();
    appWindow.__mobileNavSheet = undefined;
  }
}

export function initMobileNav(): void {
  if (!window.matchMedia(MOBILE_QUERY).matches) {
    destroyMobileNav();
    return;
  }

  const container = document.getElementById("mobile-sheet");
  const hamburgerBtn = getHamburgerBtn();

  if (!container || !hamburgerBtn) {
    return;
  }

  const appWindow = window as MobileNavWindow;

  if (appWindow.__mobileNavSheet) {
    destroyMobileNav();
  }

  const sheet = new Sheet(container, {
    snapPoints: [0, 1],
    topPadding: SHEET_TOP_PADDING,
    closeThreshold: SHEET_CLOSE_THRESHOLD,
    dragHandle: true,
    width: 95,
    sidePadding: SHEET_SIDE_PADDING,
    ariaLabel: "navigation",
    onClose: () => syncHamburger(false),
  });

  const contentSnap = getContentSnapPoint(container);
  sheet.setSnapPoints([0, contentSnap]);

  appWindow.__mobileNavSheet = sheet;

  bindSheetCloseSync(container);
  bindDragCloseSync(container);

  hamburgerBtn.removeEventListener("click", handleHamburgerClick);
  hamburgerBtn.addEventListener("click", handleHamburgerClick);

  const navLinks = container.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleNavLinkClick);
    link.addEventListener("click", handleNavLinkClick);
  });

  syncHamburger(sheet.isOpen);
}

function handleNavLinkClick(): void {
  syncHamburger(false);
  const appWindow = window as MobileNavWindow;
  appWindow.__mobileNavSheet?.close();
}
