// Runs before styles paint. The default follows the device, including live changes.
(() => {
  const key = 'za-appearance';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
  let preference = 'auto';
  try { preference = valid(localStorage.getItem(key)); } catch {}
  function apply() {
    const theme = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appearance = preference;
    document.querySelectorAll('[data-theme-choice]').forEach(select => { select.value = preference; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#131a19' : '#f6f5f0';
  }
  apply();
  media.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.newValue); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-choice]').forEach(select => {
      select.addEventListener('change', () => {
        preference = valid(select.value);
        try { localStorage.setItem(key, preference); } catch {}
        apply();
      });
    });
  });
})();
