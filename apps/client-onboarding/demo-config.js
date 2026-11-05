window.FIRSTMILE_DEMO =
  ["true", "onboarding"].includes(document.documentElement.dataset.demo) ||
  new URLSearchParams(location.search).get("demo") === "1";
