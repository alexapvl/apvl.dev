import { navigate } from "astro:transitions/client";

// Keyboard shortcuts handler
export function initKeybinds() {
  // Only initialize once
  if ((window as any).__keybindsInitialized) return;
  (window as any).__keybindsInitialized = true;

  type AppWindow = Window & {
    __navPanelExpanded?: boolean;
  };

  const appWindow = window as AppWindow;
  appWindow.__navPanelExpanded ??= false;

  // Get nav panel element fresh each time (DOM changes with View Transitions)
  function getNavPanel() {
    return document.getElementById("nav-panel");
  }

  function setNavPanelExpanded(expanded: boolean) {
    appWindow.__navPanelExpanded = expanded;
    const panel = getNavPanel();
    if (!panel) return;

    panel.classList.toggle("expanded", expanded);

    panel
      .querySelector<HTMLButtonElement>('[data-nav-action="toggle"]')
      ?.setAttribute("aria-expanded", expanded ? "true" : "false");

    const keybinds = panel.querySelector<HTMLElement>("#nav-keybinds");
    if (keybinds) keybinds.inert = !expanded;

    panel
      .querySelector(".label-collapsed")
      ?.toggleAttribute("aria-hidden", expanded);
    panel
      .querySelector(".label-expanded")
      ?.toggleAttribute("aria-hidden", !expanded);
  }

  function expandNavPanel() {
    setNavPanelExpanded(true);
  }

  function collapseNavPanel() {
    setNavPanelExpanded(false);
  }

  function toggleNavPanel() {
    if (appWindow.__navPanelExpanded) {
      collapseNavPanel();
    } else {
      expandNavPanel();
    }
  }

  function syncNavPanelState() {
    const panel = getNavPanel();
    if (!panel) return;

    panel.classList.add("state-sync");
    setNavPanelExpanded(!!appWindow.__navPanelExpanded);
    requestAnimationFrame(() => {
      panel.classList.remove("state-sync");
    });
  }

  function toggleTheme() {
    if (typeof (window as any).toggleTheme === "function") {
      (window as any).toggleTheme();
    }
  }

  function toggleMusic() {
    if ((window as any).musicPlayer) {
      (window as any).musicPlayer.toggle();
    }
  }

  function go(path: string) {
    if (window.location.pathname !== path) {
      navigate(path);
    }
  }

  // Expose for external use
  (window as any).toggleNavPanel = toggleNavPanel;
  syncNavPanelState();
  document.addEventListener("astro:after-swap", syncNavPanelState);
  document.addEventListener("astro:page-load", syncNavPanelState);

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
        toggleTheme();
        break;

      case "m":
        toggleMusic();
        break;

      case "n":
        toggleNavPanel();
        break;

      case "t":
        go("/thoughts");
        break;

      case "s":
        go("/stuff");
        break;

      case "h":
        go("/");
        break;

      case "backspace":
        e.preventDefault();
        history.back();
        break;
    }
  });

  document.addEventListener("click", (event) => {
    const trigger = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-nav-action]",
    );
    if (!trigger) return;

    switch (trigger.dataset.navAction) {
      case "toggle":
        toggleNavPanel();
        break;
      case "theme":
        toggleTheme();
        break;
      case "music":
        toggleMusic();
        break;
      case "back":
        history.back();
        break;
    }
  });
}
