export const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M18 6 6 18",
  folder: "M3 7h6l2 2h10v11H3z M3 7V4h6l2 3",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h1 M3 12h1 M3 18h1",
  mail: "M3 5h18v14H3z m0 0 9 7 9-7",
  link: "M9 15 15 9 M8 10l-2 2a4 4 0 0 0 6 6l2-2 M10 8l2-2a4 4 0 0 1 6 6l-2 2",
  clock: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  document: "M5 3h9l5 5v13H5z M14 3v5h5 M8 12h8 M8 16h5",
  logout: "M9 4H4v16h5 M13 8l4 4-4 4 M8 12h13",
};
export const icon = (name) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.document}"/></svg>`;
export const stamp = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function toast(message, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.className = `visible ${error ? "error" : ""}`;
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => (el.className = ""), 4500);
}
export function modal(title, body, submit) {
  const dialog = document.querySelector("#dialog");
  document.querySelector("#dialog-body").innerHTML =
    `<div class="modal-head"><h2>${e(title)}</h2><button class="icon-button" data-close aria-label="Close dialog">${icon("close")}</button></div>${body}`;
  dialog.showModal();
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  const form = dialog.querySelector("form");
  if (form && submit)
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        await submit(new FormData(form));
        dialog.close();
      } catch (error) {
        toast(error.message, true);
      } finally {
        button.disabled = false;
      }
    };
}
