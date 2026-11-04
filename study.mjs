// Legacy deep links open their enclosing disclosures before scrolling to the target.
function revealFragment() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  let disclosure = target.closest('details');
  let revealed = false;
  while (disclosure) {
    if (!disclosure.open) { disclosure.open = true; revealed = true; }
    disclosure = disclosure.parentElement?.closest('details');
  }
  if (revealed) requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
}
window.addEventListener('hashchange', revealFragment);
revealFragment();

// The outer workbench owns navigation when this document is embedded.
if(window.self!==window.top)document.documentElement.dataset.embedded='true';
