(() => {
  const modes = ['auto', 'light', 'dark'];
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'auto';
  try { const saved = localStorage.getItem('za-appearance'); if (modes.includes(saved)) preference = saved; } catch {}
  function apply() {
    const theme = preference === 'auto' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appearance = preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181b1b' : '#f2f1ec');
    document.querySelectorAll('[data-theme-cycle]').forEach(button => {
      const next = modes[(modes.indexOf(preference) + 1) % modes.length];
      const label = `Appearance: ${preference[0].toUpperCase() + preference.slice(1)}. Switch to ${next[0].toUpperCase() + next.slice(1)}.`;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.querySelector('.theme-mode').textContent = preference[0].toUpperCase() + preference.slice(1);
    });
    window.dispatchEvent(new CustomEvent('appearancechange', { detail: { theme } }));
  }
  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-cycle]').forEach(button => button.addEventListener('click', () => {
      preference = modes[(modes.indexOf(preference) + 1) % modes.length];
      try { localStorage.setItem('za-appearance', preference); } catch {}
      apply();
    }));
  });
})();
