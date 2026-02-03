// Theme toggle functionality
export function initTheme() {
  // Only initialize once
  if ((window as any).__themeInitialized) return;
  (window as any).__themeInitialized = true;

  const getStoredTheme = (): 'light' | 'dark' | null => {
    return localStorage.getItem('theme') as 'light' | 'dark' | null;
  };

  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getCurrentTheme = (): 'light' | 'dark' => {
    return getStoredTheme() || getSystemTheme();
  };

  const setTheme = (theme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Dispatch custom event for other components (e.g., WebGL gradient)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };

  const toggleTheme = () => {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
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
