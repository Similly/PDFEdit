/**
 * Theme utility — manages dark/light mode preference.
 * Stores the user's choice in localStorage and applies it to <html>.
 */

const STORAGE_KEY = 'pdf-edit-theme';

/** Returns the current effective theme: 'dark' or 'light' */
export function getTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies the given theme to the document */
function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

/** Toggles between dark and light, returns the new theme */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  return next;
}

/** Call once on app init to apply the stored/system preference */
export function initTheme() {
  applyTheme(getTheme());
}

/**
 * Creates a small icon button that toggles the theme.
 * @returns {HTMLButtonElement}
 */
export function createThemeToggleBtn() {
  const btn = document.createElement('button');
  btn.className = 'btn-icon theme-toggle-btn';
  btn.id = 'btn-theme-toggle';
  btn.title = 'Toggle Dark / Light Mode';

  const updateIcon = () => {
    const isDark = getTheme() === 'dark';
    btn.innerHTML = `<span class="material-symbols-outlined">${isDark ? 'light_mode' : 'dark_mode'}</span>`;
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  };

  updateIcon();

  btn.addEventListener('click', () => {
    toggleTheme();
    updateIcon();
  });

  return btn;
}
