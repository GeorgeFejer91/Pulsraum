(() => {
  const root = document.documentElement;
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'pulsraum.theme';
  let preference;
  let toggle;
  let themeColor;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {
    // The toggle still works when the browser blocks storage.
  }

  function applyTheme() {
    const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    if (toggle) {
      toggle.checked = theme === 'dark';
      themeColor.content = getComputedStyle(root).backgroundColor;
    }
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    toggle = document.getElementById('theme-toggle');
    themeColor = document.querySelector('meta[name="theme-color"]');
    applyTheme();
    toggle.closest('label').hidden = false;
    toggle.addEventListener('change', () => {
      preference = toggle.checked ? 'dark' : 'light';
      applyTheme();
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // Keep the selected theme for this page.
      }
    });
    systemTheme.addEventListener('change', applyTheme);
  }, { once: true });
})();
