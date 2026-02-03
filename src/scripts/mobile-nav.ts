/**
 * Mobile navigation script
 * Handles hamburger menu toggle, bottom sheet animations, and touch gestures
 * Persists state across page navigations using localStorage
 */

const NAV_STATE_KEY = "mobile-nav-open";

let isOpen = false;
let isDragging = false;
let startY = 0;
let currentY = 0;
let sheetHeight = 0;

// Element references
let hamburgerBtn: HTMLButtonElement | null = null;
let sheet: HTMLElement | null = null;
let overlay: HTMLElement | null = null;

/**
 * Get persisted nav state from localStorage
 */
function getPersistedState(): boolean {
  try {
    return localStorage.getItem(NAV_STATE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Persist nav state to localStorage
 */
function persistState(open: boolean): void {
  try {
    localStorage.setItem(NAV_STATE_KEY, open.toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Initialize mobile navigation
 * Called on page load and after View Transitions
 */
export function initMobileNav(): void {
  // Get element references
  hamburgerBtn = document.getElementById(
    "hamburger-btn"
  ) as HTMLButtonElement | null;
  sheet = document.getElementById("mobile-sheet");
  overlay = document.getElementById("mobile-nav-overlay");

  if (!hamburgerBtn || !sheet || !overlay) {
    return;
  }

  // Restore persisted state instead of always closing
  const persistedState = getPersistedState();
  if (persistedState) {
    openSheet();
  } else {
    closeSheet();
  }

  // Remove existing listeners to prevent duplicates
  hamburgerBtn.removeEventListener("click", handleToggle);
  overlay.removeEventListener("click", handleClose);

  // Add event listeners
  hamburgerBtn.addEventListener("click", handleToggle);
  overlay.addEventListener("click", handleClose);

  // Touch gestures for the sheet
  sheet.removeEventListener("touchstart", handleTouchStart);
  sheet.removeEventListener("touchmove", handleTouchMove);
  sheet.removeEventListener("touchend", handleTouchEnd);

  sheet.addEventListener("touchstart", handleTouchStart, { passive: true });
  sheet.addEventListener("touchmove", handleTouchMove, { passive: false });
  sheet.addEventListener("touchend", handleTouchEnd, { passive: true });

  // Close on link click (navigation)
  const navLinks = sheet.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleClose);
    link.addEventListener("click", handleClose);
  });

  // Close on escape key
  document.removeEventListener("keydown", handleKeyDown);
  document.addEventListener("keydown", handleKeyDown);
}

/**
 * Toggle the menu open/closed
 */
function handleToggle(): void {
  if (isOpen) {
    closeSheet();
  } else {
    openSheet();
  }
}

/**
 * Open the bottom sheet
 */
function openSheet(): void {
  if (!hamburgerBtn || !sheet || !overlay) return;

  isOpen = true;
  hamburgerBtn.setAttribute("aria-expanded", "true");
  hamburgerBtn.setAttribute("aria-label", "Close menu");
  sheet.classList.add("open");
  overlay.classList.add("active");

  // Prevent body scroll when sheet is open
  document.body.style.overflow = "hidden";

  // Persist state
  persistState(true);
}

/**
 * Close the bottom sheet
 */
function closeSheet(): void {
  if (!hamburgerBtn || !sheet || !overlay) return;

  isOpen = false;
  hamburgerBtn.setAttribute("aria-expanded", "false");
  hamburgerBtn.setAttribute("aria-label", "Open menu");
  sheet.classList.remove("open");
  overlay.classList.remove("active");

  // Restore body scroll
  document.body.style.overflow = "";

  // Reset any drag transform
  sheet.style.transform = "";

  // Persist state
  persistState(false);
}

/**
 * Handle close action
 */
function handleClose(): void {
  closeSheet();
}

/**
 * Handle escape key
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape" && isOpen) {
    closeSheet();
  }
}

/**
 * Handle touch start for drag gesture
 */
function handleTouchStart(e: TouchEvent): void {
  if (!sheet) return;

  isDragging = true;
  startY = e.touches[0].clientY;
  currentY = startY;
  sheetHeight = sheet.offsetHeight;
  sheet.classList.add("dragging");
}

/**
 * Handle touch move for drag gesture
 */
function handleTouchMove(e: TouchEvent): void {
  if (!isDragging || !sheet) return;

  currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;

  // Only allow dragging down (positive delta) when sheet is open
  if (deltaY > 0) {
    // Prevent default to stop page scroll while dragging
    e.preventDefault();

    // Apply drag transform with resistance
    const resistance = 0.6;
    const translateY = deltaY * resistance;
    sheet.style.transform = `translateY(${translateY}px)`;
  }
}

/**
 * Handle touch end for drag gesture
 */
function handleTouchEnd(): void {
  if (!isDragging || !sheet) return;

  isDragging = false;
  sheet.classList.remove("dragging");

  const deltaY = currentY - startY;
  const threshold = sheetHeight * 0.3; // 30% of sheet height to trigger close

  if (deltaY > threshold) {
    // Close the sheet
    closeSheet();
  } else {
    // Snap back to open position
    sheet.style.transform = "";
  }
}
