// Theme toggle functionality
export function initTheme() {
  // Only initialize once
  if ((window as any).__themeInitialized) return;
  (window as any).__themeInitialized = true;

  type Theme = 'light' | 'dark';

  const getStoredTheme = (): 'light' | 'dark' | null => {
    return localStorage.getItem('theme') as 'light' | 'dark' | null;
  };

  const getSystemTheme = (): Theme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getCurrentTheme = (): Theme => {
    return getStoredTheme() || getSystemTheme();
  };

  const setTheme = (theme: Theme, animate = false) => {
    if (animate) {
      document.documentElement.classList.add('theme-transitioning');
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));

    if (animate) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    }
  };

  const toggleTheme = () => {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next, true);
  };

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!getStoredTheme()) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // Expose toggle function globally for keybind handler
  (window as any).toggleTheme = toggleTheme;
}
