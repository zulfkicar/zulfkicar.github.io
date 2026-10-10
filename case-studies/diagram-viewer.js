for (const button of document.querySelectorAll('[data-diagram-fit]')) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const frame = document.getElementById(button.getAttribute('aria-controls'));
    const fit = button.getAttribute('aria-pressed') !== 'true';
    frame.dataset.fit = String(fit);
    button.setAttribute('aria-pressed', String(fit));
    button.textContent = fit ? 'Readable size' : 'Fit overview';
    button.previousElementSibling.textContent = fit ? 'Overview fitted to this page.' : 'Scroll to explore at readable size.';
    frame.scrollLeft = 0;
  });
}
