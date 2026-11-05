window.WORKLEDGER_DEMO =
  ["true", "workledger"].includes(document.documentElement.dataset.demo) ||
  new URLSearchParams(location.search).get("demo") === "1";
