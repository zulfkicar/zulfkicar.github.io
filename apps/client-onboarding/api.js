export async function api(path, options = {}) {
  if (window.FIRSTMILE_DEMO) {
    const { demoApi } = await import("./demo.js");
    return demoApi(path, options);
  }
  const response = await fetch(`./api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "The operation did not finish");
    error.status = response.status;
    throw error;
  }
  return data;
}
