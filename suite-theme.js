/* Single appearance controller; preserves the existing cross-page preference. */
(() => {
  if (window.__portfolioAppearance) return;
  window.__portfolioAppearance = true;
  const key = 'za-appearance', modes = ['auto', 'light', 'dark'];
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => modes.includes(value) ? value : 'auto';
  const labels = {auto: 'Auto (device)', light: 'Light', dark: 'Dark'};
  let preference = 'auto';
  try { preference = valid(localStorage.getItem(key)); } catch {}
  function apply() {
    const theme = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appearance = preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1b1e26' : '#f5f2ec');
    for (const button of document.querySelectorAll('[data-theme-cycle],[data-suite-theme]')) {
      const next = modes[(modes.indexOf(preference) + 1) % modes.length];
      button.dataset.mode = preference;
      const label = `Appearance: ${labels[preference]}. Switch to ${labels[next]}.`;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      const caption = button.querySelector?.('.theme-mode');
      if (caption) caption.textContent = preference === 'auto' ? 'Auto' : labels[preference];
      const glyph = button.querySelector?.('.appearance-glyph');
      if (glyph) glyph.textContent = {auto:'◐', light:'☼', dark:'☾'}[preference];
    }
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function')
      window.dispatchEvent(new CustomEvent('appearancechange', {detail: {theme}}));
  }
  apply();
  media.addEventListener('change', () => { if (preference === 'auto') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.newValue); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    for (const button of document.querySelectorAll('[data-theme-cycle],[data-suite-theme]'))
      button.addEventListener('click', () => {
        preference = modes[(modes.indexOf(preference) + 1) % modes.length];
        try { localStorage.setItem(key, preference); } catch {}
        apply();
      });
  });
})();
