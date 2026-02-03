import { navigate } from "astro:transitions/client";

// Keyboard shortcuts handler
export function initKeybinds() {
  // Only initialize once
  if ((window as any).__keybindsInitialized) return;
  (window as any).__keybindsInitialized = true;

  let navPanelExpanded = false;

  // Get nav panel element fresh each time (DOM changes with View Transitions)
  function getNavPanel() {
    return document.getElementById("nav-panel");
  }

  function expandNavPanel() {
    const panel = getNavPanel();
    if (panel) {
      navPanelExpanded = true;
      panel.classList.add("expanded");
    }
  }

  function collapseNavPanel() {
    const panel = getNavPanel();
    if (panel) {
      navPanelExpanded = false;
      panel.classList.remove("expanded");
    }
  }

  function toggleNavPanel() {
    if (navPanelExpanded) {
      collapseNavPanel();
    } else {
      expandNavPanel();
    }
  }

  // Reset panel state after navigation (DOM is replaced)
  document.addEventListener("astro:after-swap", () => {
    navPanelExpanded = false;
  });

  // Expose for external use
  (window as any).toggleNavPanel = toggleNavPanel;

  document.addEventListener("keydown", (e) => {
    // Ignore if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    // Ignore if modifier keys are pressed
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case "0":
        // Toggle theme
        if (typeof (window as any).toggleTheme === "function") {
          (window as any).toggleTheme();
        }
        break;

      case "m":
        // Toggle music
        if ((window as any).musicPlayer) {
          (window as any).musicPlayer.toggle();
        }
        break;

      case "n":
        // Toggle navigation panel
        toggleNavPanel();
        break;

      case "t":
        // Navigate to blog (using View Transitions)
        if (window.location.pathname !== "/thoughts") {
          navigate("/thoughts");
        }
        break;

      case "s":
        // Navigate to stuff (using View Transitions)
        if (window.location.pathname !== "/stuff") {
          navigate("/stuff");
        }
        break;

      case "h":
        // Go to home page (using View Transitions)
        if (window.location.pathname !== "/") {
          navigate("/");
        }
        break;

      case "backspace":
        // Go back - history.back() works with View Transitions
        e.preventDefault();
        history.back();
        break;
    }
  });
}
