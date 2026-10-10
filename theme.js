// Runs before styles paint. The default follows the device, including live changes.
(() => {
  const key = 'za-appearance';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const modes = ['auto', 'light', 'dark'];
  const labels = {auto:'Auto (device)', light:'Light', dark:'Dark'};
  const valid = value => modes.includes(value) ? value : 'auto';
  let preference = 'auto';
  try { preference = valid(localStorage.getItem(key)); } catch {}
  function apply() {
    const theme = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appearance = preference;
    document.querySelectorAll('[data-theme-cycle]').forEach(button => {
      const next = modes[(modes.indexOf(preference) + 1) % modes.length];
      button.dataset.mode = preference;
      const label = `Appearance: ${labels[preference]}. Switch to ${labels[next]}.`;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
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
    document.querySelectorAll('[data-theme-cycle]').forEach(button => {
      button.addEventListener('click', () => {
        preference = modes[(modes.indexOf(preference) + 1) % modes.length];
        try { localStorage.setItem(key, preference); } catch {}
        apply();
      });
    });
  });
})();
