let data;
const key = "firstmile-demo-v1";
const now = () => new Date().toISOString();
const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(value)),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
function save() {
  localStorage.setItem(key, JSON.stringify(data));
}
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function load() {
  if (data) return;
  try {
    data = JSON.parse(localStorage.getItem(key) || "null");
  } catch {}
  if (!data) {
    data = {
      clients: [
        {
          id: "atlas",
          payload: {
            company: "Atlas Coffee",
            contact_name: "Jamie Reed",
            contact_email: "jamie@example.test",
            project: "Spring storefront refresh",
            due_date: new Date(Date.now() + 21 * 86400000)
              .toISOString()
              .slice(0, 10),
            deliverables: [
              "Review the current storefront",
              "Prepare a visual direction",
              "Build the product landing page",
            ],
            notes: "Confirm product photography and staging access at kickoff.",
          },
          revision: 1,
          status: "draft",
          source: "example",
          created_at: now(),
        },
        {
          id: "studio",
          payload: {
            company: "Northline Studio",
            project: "Brand website",
            deliverables: ["Prepare a brand homepage"],
          },
          revision: 1,
          status: "draft",
          source: "example",
          created_at: now(),
        },
      ],
      runs: [],
      workspaces: [],
      tasks: [],
      messages: [],
      events: [],
      connections: { inbound: false, destination: false, ai: false },
      signed_in: true,
    };
    save();
  }
}
function plan(client) {
  const p = client.payload,
    missing = [
      "company",
      "contact_name",
      "contact_email",
      "project",
      "due_date",
    ].filter((k) => !p[k]);
  if (!p.deliverables?.length) missing.push("deliverables");
  return {
    valid: missing.length === 0,
    warnings: missing.map(
      (k) =>
        `${{ company: "Company", contact_name: "Contact name", contact_email: "Contact email", project: "Project", due_date: "Target date", deliverables: "Deliverables" }[k]} is required`,
    ),
    operations: [
      {
        kind: "workspace",
        title: "Create a client workspace",
        destination: "Native workspace",
        description: p.project || "Project name required",
      },
      {
        kind: "tasks",
        title: "Prepare the delivery checklist",
        destination: "Native tasks",
        description: `${p.deliverables?.length || 0} deliverables plus kickoff and access checks`,
      },
      {
        kind: "welcome",
        title: "Prepare a welcome message",
        destination: "Draft outbox",
        description: "Saved as a draft for review. No email is sent.",
      },
    ],
  };
}
function execute(client) {
  const p = client.payload,
    id = crypto.randomUUID(),
    workspaceId = `workspace-${client.id}`;
  data.workspaces.push({
    id: workspaceId,
    client_id: client.id,
    name: p.project,
  });
  const titles = [
    "Schedule the kickoff",
    "Confirm required access",
    ...p.deliverables,
  ];
  titles.forEach((title, i) =>
    data.tasks.push({
      id: `${id}-${i}`,
      workspace_id: workspaceId,
      title,
      kind: i < 2 ? "setup" : "delivery",
    }),
  );
  data.messages.push({
    id: `${id}-welcome`,
    workspace_id: workspaceId,
    recipient: p.contact_email,
    subject: `Getting started: ${p.project}`,
    body: `Hi ${p.contact_name},\n\nYour project workspace is ready. Our checklist covers:\n${p.deliverables.map((d) => "- " + d).join("\n")}\n\nTarget date: ${p.due_date}. We will confirm access and arrange a kickoff before starting delivery.`,
    status: "draft",
  });
  const run = {
    id,
    client_id: client.id,
    snapshot: { payload: structuredClone(p), revision: client.revision },
    status: "completed",
    created_at: now(),
    finished_at: now(),
    error: "",
    steps: [
      {
        kind: "workspace",
        status: "succeeded",
        attempts: 1,
        output: { workspace_id: workspaceId, name: p.project },
      },
      {
        kind: "tasks",
        status: "succeeded",
        attempts: 1,
        output: { task_count: titles.length, titles },
      },
      {
        kind: "welcome",
        status: "succeeded",
        attempts: 1,
        output: { recipient: p.contact_email, status: "draft" },
      },
    ],
  };
  data.runs.unshift(run);
  client.status = "completed";
  return run;
}
export async function demoApi(path, { method = "GET", body = {} } = {}) {
  load();
  let result;
  if (path === "/login") {
    data.signed_in = true;
    result = { ok: true };
  } else if (path === "/logout") {
    data.signed_in = false;
    result = { ok: true };
  } else {
    if (!data.signed_in) fail("Sign in to open the workspace", 401);
    if (path === "/state") result = data;
    else if (path === "/clients" && method === "POST") {
      const client = {
        id: crypto.randomUUID(),
        payload: body,
        revision: 1,
        status: "draft",
        created_at: now(),
        source: "manual",
      };
      data.clients.unshift(client);
      result = { client };
    } else if (path.startsWith("/clients/")) {
      const [, id, action] = path.slice(1).split("/"),
        client = data.clients.find((c) => c.id === id);
      if (!client) fail("Brief not found", 404);
      if (action === "preview") {
        result = plan(client);
        result.fingerprint = await hash({
          payload: client.payload,
          revision: client.revision,
        });
      } else if (action === "approve") {
        const expected = await hash({
          payload: client.payload,
          revision: client.revision,
        });
        if (expected !== body.fingerprint)
          fail("This preview has changed", 409);
        if (!plan(client).valid) fail("Complete the brief first");
        result = data.runs.find((r) => r.client_id === id) || execute(client);
      } else if (method === "PATCH") {
        if (client.status !== "draft")
          fail("Approved briefs are immutable", 409);
        client.payload = body;
        client.revision++;
        result = client;
      }
    } else if (path === "/extract") {
      const lines = String(body.text || "").split(/\r?\n/),
        get = (label) =>
          lines
            .find((l) => l.toLowerCase().startsWith(label + ":"))
            ?.slice(label.length + 1)
            .trim() || "";
      result = {
        source: "structured_text",
        draft: {
          company: get("company"),
          contact_name: get("contact"),
          contact_email: get("email"),
          project: get("project"),
          due_date: get("due"),
          deliverables: lines
            .filter((l) => /^\s*[-*]\s+/.test(l))
            .map((l) => l.replace(/^\s*[-*]\s+/, "")),
          notes: get("notes"),
        },
      };
    } else fail("This operation requires the self-hosted server");
  }
  save();
  return structuredClone(result);
}
