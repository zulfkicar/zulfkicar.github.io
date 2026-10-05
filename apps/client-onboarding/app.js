import { api } from "./api.js";
import { e, icon, stamp, toast, modal } from "./ui.js";
let state,
  view = "intake",
  selected = null,
  plan = null;
const root = document.querySelector("#app");
const sample = `Company: Fieldwork Studio\nContact: Alex Taylor\nEmail: alex@example.test\nProject: New service website\nDue: ${new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10)}\nDeliverables:\n- Review the current website\n- Prepare the service page designs\n- Build and test the new website\nNotes: Confirm staging access and brand assets during kickoff.`;
const status = (client) =>
  client.status === "draft"
    ? complete(client.payload)
      ? "Ready for review"
      : "Needs information"
    : { approved: "In progress", completed: "Completed", held: "Held" }[
        client.status
      ] || client.status;
const complete = (p) =>
  p.company &&
  p.contact_name &&
  p.contact_email &&
  p.project &&
  p.due_date &&
  p.deliverables?.length;
const labelClass = (client) =>
  client.status === "draft"
    ? complete(client.payload)
      ? "ready"
      : "missing"
    : client.status;
const titles = {
  workspace: "Client workspace",
  tasks: "Delivery checklist",
  welcome: "Welcome message draft",
  webhook: "Destination handoff",
};
const glyphs = {
  workspace: "folder",
  tasks: "list",
  welcome: "mail",
  webhook: "link",
};

async function refresh() {
  state = await api("/state");
  if (!selected && state.clients.length) selected = state.clients[0].id;
  if (selected) plan = await api(`/clients/${selected}/preview`);
  render();
}
function login() {
  root.innerHTML = `<main class="login"><div class="brand-icon">${icon("arrow")}</div><p class="eyebrow">FIRST MILE</p><h1>Start the work well.</h1><p>Turn a client brief into a reviewed, repeatable project setup.</p><form id="login"><label>Workspace password<input name="password" type="password" value="demo-firstmile" autocomplete="current-password" required></label><button class="primary" type="submit">Open intake desk ${icon("arrow")}</button></form><aside><strong>Example workspace</strong><p>Password: demo-firstmile<br>Client names and briefs are synthetic.</p></aside></main>`;
  document.querySelector("#login").onsubmit = async (event) => {
    event.preventDefault();
    try {
      await api("/login", {
        method: "POST",
        body: { password: new FormData(event.target).get("password") },
      });
      await refresh();
    } catch (error) {
      toast(error.message, true);
    }
  };
}

function render() {
  root.innerHTML = `<header class="app-header"><a class="brand" href="#"><span class="brand-icon">${icon("arrow")}</span>first mile<span class="brand-divider"></span><small>Client operations</small></a><div><span class="environment">${window.FIRSTMILE_DEMO ? "Browser demonstration" : "Example workspace"}</span><button class="icon-button" id="logout" aria-label="Sign out">${icon("logout")}</button></div></header>${window.FIRSTMILE_DEMO ? '<div class="mobile-demo-label">Browser demo · synthetic records · changes stay here</div>' : ""}<div class="app-width"><nav class="navigation">${[
    [
      "intake",
      "Intake desk",
      state.clients.filter((c) => c.status === "draft").length,
    ],
    ["activity", "Run history", state.runs.length],
    ["outputs", "Workspaces", state.workspaces.length],
    ["connections", "Connections", null],
  ]
    .map(
      ([id, title, count]) =>
        `<button data-view="${id}" class="${view === id ? "active" : ""}">${title}${count !== null ? `<span>${count}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}<a href="https://github.com/zulfkicar/client-onboarding" target="_blank" rel="noreferrer">Source code ${icon("arrow")}</a></nav><main>${{ intake: intake, activity: activity, outputs: outputs, connections: connections }[view]()}</main><footer><span>Clear scope. Reviewed actions. A trace of what happened.</span><span>${window.FIRSTMILE_DEMO ? "Demo changes stay in this browser." : "Records persist in your workspace."}</span></footer></div>`;
  bind();
}
function heading(kicker, title, description, action = "") {
  return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function intake() {
  const client = state.clients.find((c) => c.id === selected),
    run = state.runs.find((r) => r.client_id === selected);
  return (
    heading(
      "CLIENT INTAKE",
      "A good beginning, every time.",
      "Review the scope once. Let the routine setup follow.",
      `<button class="primary" id="new-client">${icon("plus")} New client brief</button>`,
    ) +
    `<div class="overview"><div><span>BRIEFS TO REVIEW</span><strong>${state.clients.filter((c) => c.status === "draft").length}</strong></div><div><span>READY FOR REVIEW</span><strong>${state.clients.filter((c) => c.status === "draft" && complete(c.payload)).length}</strong></div><div><span>WORKSPACES CREATED</span><strong>${state.workspaces.length}</strong></div><div><span>HELD RUNS</span><strong>${state.runs.filter((r) => r.status === "held").length}</strong></div></div><div class="desk-layout"><section class="panel inbox"><div class="panel-head"><h2>Incoming briefs</h2><span>${state.clients.length} records</span></div>${state.clients.map((c) => `<button class="client-row ${selected === c.id ? "selected" : ""}" data-client="${e(c.id)}"><span class="company-avatar">${e((c.payload.company || "?").slice(0, 2).toUpperCase())}</span><span class="client-copy"><strong>${e(c.payload.company || "Unnamed client")}</strong><small>${e(c.payload.project || "Project details needed")}</small><span class="client-meta">${stamp(c.created_at)} · ${e(c.source)}</span></span><span class="status ${labelClass(c)}">${e(status(c))}</span>${icon("arrow")}</button>`).join("") || '<p class="empty">Your first client brief starts here.</p>'}<div class="inbox-note">${icon("document")}<span>Each brief becomes a versioned plan. You review the destinations before anything runs.</span></div></section><section class="panel review">${client ? `<div class="panel-head"><div><p class="eyebrow">SELECTED BRIEF · REVISION ${client.revision}</p><h2>${e(client.payload.company || "Client brief")}</h2></div><button class="text-button" id="edit-client" ${client.status !== "draft" ? "disabled" : ""}>Edit brief</button></div><div class="review-body"><p class="project-name">${e(client.payload.project || "Project name needed")}</p><div class="scope"><span>Contact <strong>${e(client.payload.contact_name || "Not provided")}</strong></span><span>Target date <strong>${e(client.payload.due_date || "Not provided")}</strong></span></div><p class="section-label">THE PROVISIONING PLAN</p><div class="steps">${plan.operations.map((op, i) => `<div class="step"><span class="step-icon">${icon(glyphs[op.kind])}</span><div><strong>${e(op.title)}</strong><small>${e(op.destination)}</small><p>${e(op.description)}</p></div><span class="step-number">0${i + 1}</span></div>`).join("")}</div>${!plan.valid ? `<div class="needs-info"><strong>Complete the brief first</strong><ul>${plan.warnings.map((w) => `<li>${e(w)}</li>`).join("")}</ul></div>` : ""}${run ? `<div class="run-preview"><span class="status ${e(run.status)}">${e(run.status)}</span><p>${run.status === "completed" ? "The workspace, tasks, and welcome draft are ready." : e(run.error || "The approved plan is being processed.")}</p><button class="secondary" id="view-run">Inspect run ${icon("arrow")}</button></div>` : `<button class="primary full" id="review-plan" ${!plan.valid ? "disabled" : ""}>Review and provision ${icon("arrow")}</button><p class="quiet">The welcome message is prepared as a draft.</p>`}</div>` : '<div class="empty">Select a brief to inspect its plan.</div>'}</section></div>`
  );
}
function activity() {
  return (
    heading(
      "EXECUTION HISTORY",
      "Know what happened.",
      "Every step keeps its result. Held runs resume from unfinished work.",
    ) +
    `<div class="runs">${state.runs.map((run) => `<section class="panel run-panel"><div class="panel-head"><div><h2>${e(run.snapshot.payload.company)}</h2><p>${e(run.snapshot.payload.project)} · ${stamp(run.created_at)}</p></div><span class="status ${e(run.status)}">${e(run.status)}</span></div><div class="run-steps">${run.steps.map((step) => `<article class="execution-step"><span class="execution-icon ${e(step.status)}">${step.status === "succeeded" ? icon("check") : icon(glyphs[step.kind])}</span><div><strong>${e(titles[step.kind])}</strong><small>${e(step.status)} · ${step.attempts} ${step.attempts === 1 ? "attempt" : "attempts"}</small>${step.error ? `<p class="step-error">${e(step.error)}</p>` : ""}<details><summary>Inspect result</summary><pre>${e(JSON.stringify(step.output, null, 2))}</pre></details></div></article>`).join("")}</div>${run.status === "held" ? `<div class="run-actions"><p>Confirm destination state before resuming. Completed native steps will be skipped.</p><button class="primary" data-resume="${e(run.id)}">Resume remaining steps ${icon("arrow")}</button></div>` : ""}</section>`).join("") || '<section class="panel empty"><h2>No runs yet</h2><p>Review and approve a complete brief to provision the first workspace.</p></section>'}</div>`
  );
}
function outputs() {
  return (
    heading(
      "PROVISIONED WORK",
      "Everything ready for the handoff.",
      "Inspect the native workspace, delivery checklist, and message draft.",
    ) +
    `<div class="outputs">${
      state.workspaces
        .map(
          (w) =>
            `<section class="panel"><div class="panel-head"><div><p class="eyebrow">CLIENT WORKSPACE</p><h2>${e(w.name)}</h2></div><span class="status completed">Created</span></div><div class="output-body"><p class="section-label">DELIVERY CHECKLIST</p>${state.tasks
              .filter((t) => t.workspace_id === w.id)
              .map(
                (t) =>
                  `<div class="output-task"><span>${icon(t.kind === "setup" ? "link" : "check")}</span>${e(t.title)}<small>${e(t.kind)}</small></div>`,
              )
              .join(
                "",
              )}<p class="section-label message-label">WELCOME MESSAGE</p>${state.messages
              .filter((m) => m.workspace_id === w.id)
              .map(
                (m) =>
                  `<div class="message"><div><span class="status draft">Draft · not sent</span><small>To ${e(m.recipient)}</small></div><strong>${e(m.subject)}</strong><pre>${e(m.body)}</pre></div>`,
              )
              .join("")}</div></section>`,
        )
        .join("") ||
      '<section class="panel empty"><h2>No workspaces yet</h2><p>The first approved brief will create one.</p></section>'
    }</div>`
  );
}
function connections() {
  const example = {
    event_id: "example-brief-001",
    client: {
      company: "Fieldwork Studio",
      contact_name: "Alex Taylor",
      contact_email: "alex@example.test",
      project: "Service website",
      due_date: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
      deliverables: ["Prepare the homepage"],
    },
  };
  return (
    heading(
      "CONNECTIONS",
      "A small, clear integration surface.",
      "Native destinations work immediately. External handoffs are optional.",
    ) +
    `<div class="connection-grid"><section class="panel"><div class="connection-head">${icon("folder")}<span class="status completed">Ready</span></div><h2>Native workspace</h2><p>Project records, task checklists, and welcome drafts stay in this app. Each action has a stable record ID.</p></section><section class="panel"><div class="connection-head">${icon("link")}<span class="status ${state.connections.inbound ? "completed" : "draft"}">${state.connections.inbound ? "Connected" : "Not configured"}</span></div><h2>Incoming client briefs</h2><p>Accept structured briefs from a form, CRM, or workflow platform through a Bearer-authenticated webhook.</p><code>POST /hooks/client-brief</code><p class="quiet">Set INBOUND_TOKEN on the server. Keys are not shown in the browser.</p></section><section class="panel"><div class="connection-head">${icon("arrow")}<span class="status ${state.connections.destination ? "completed" : "draft"}">${state.connections.destination ? "Connected" : "Native only"}</span></div><h2>Approved handoff</h2><p>Publish the reviewed client snapshot to a configured HTTPS endpoint, with a stable delivery key and optional Bearer authentication.</p><p class="quiet">Set DESTINATION_URL and DESTINATION_TOKEN. The receiver must honour Idempotency-Key.</p></section><section class="panel"><div class="connection-head">${icon("spark")}<span class="status ${state.connections.ai ? "completed" : "draft"}">${state.connections.ai ? "Connected" : "Structured text"}</span></div><h2>Brief extraction</h2><p>${state.connections.ai ? "A configured provider can propose fields from free text. You review the extracted scope before running it." : "The labelled-text importer works without a provider key. Free-text extraction requires a configured AI provider."}</p><p class="quiet">Optional providers: Claude, OpenAI, and DeepSeek.</p></section><section class="panel payload-panel"><div class="panel-head"><div><h2>Example inbound payload</h2><p>Synthetic data for testing an integration</p></div><button class="secondary" id="copy-payload">Copy JSON</button></div><pre id="payload">${e(JSON.stringify(example, null, 2))}</pre></section></div>`
  );
}

function editBrief(client = null) {
  const p = client?.payload || {};
  modal(
    client ? "Edit the client brief" : "A new client brief",
    `<form id="brief-form">${!client ? `<details class="import"><summary>Start from brief text</summary><p>Without an AI connection, use Company, Contact, Email, Project, Due, and Notes labels, with bullet-point deliverables.</p><textarea id="brief-text" rows="5" maxlength="12000" placeholder="Paste the client's scope here…"></textarea><div><button type="button" class="secondary" id="use-sample">Use sample brief</button><button type="button" class="primary" id="extract">${icon("spark")} ${state.connections.ai ? "Extract draft" : "Read labelled brief"}</button></div><small id="extraction-source"></small></details>` : ""}<div class="form-grid"><label>Company<input name="company" value="${e(p.company)}" maxlength="120"></label><label>Project name<input name="project" value="${e(p.project)}" maxlength="150"></label><label>Contact name<input name="contact_name" value="${e(p.contact_name)}" maxlength="120"></label><label>Contact email<input name="contact_email" type="email" value="${e(p.contact_email)}"></label></div><label>Target date<input name="due_date" type="date" value="${e(p.due_date)}"></label><label>Deliverables<textarea name="deliverables" rows="4" placeholder="One deliverable per line">${e((p.deliverables || []).join("\n"))}</textarea></label><label>Notes<textarea name="notes" rows="2" maxlength="3000">${e(p.notes)}</textarea></label><div class="form-footer"><small>You can save an incomplete draft.</small><button class="primary" type="submit">Save brief ${icon("arrow")}</button></div></form>`,
    async (data) => {
      const payload = Object.fromEntries(data);
      payload.deliverables = String(payload.deliverables)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const key of Object.keys(payload))
        if (payload[key] === "") delete payload[key];
      const result = await api(client ? `/clients/${client.id}` : "/clients", {
        method: client ? "PATCH" : "POST",
        body: payload,
      });
      selected = (result.client || result).id;
      toast("Brief saved");
      await refresh();
    },
  );
  document
    .querySelector("#use-sample")
    ?.addEventListener(
      "click",
      () => (document.querySelector("#brief-text").value = sample),
    );
  document
    .querySelector("#extract")
    ?.addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        const result = await api("/extract", {
          method: "POST",
          body: { text: document.querySelector("#brief-text").value },
        });
        const form = document.querySelector("#brief-form");
        for (const [key, value] of Object.entries(result.draft)) {
          const input = form.elements.namedItem(key);
          if (input)
            input.value = Array.isArray(value) ? value.join("\n") : value;
        }
        document.querySelector("#extraction-source").textContent =
          result.source === "ai_extraction"
            ? "AI-extracted draft. Review each field."
            : "Imported from labelled text. Review each field.";
      } catch (error) {
        toast(error.message, true);
      } finally {
        document.querySelector("#extract").disabled = false;
      }
    });
}
function reviewPlan() {
  const c = state.clients.find((c) => c.id === selected);
  modal(
    "Review the provisioning plan",
    `<form><p class="review-intro">${e(c.payload.company)} · ${e(c.payload.project)}</p><div class="approval-steps">${plan.operations.map((op) => `<div>${icon(glyphs[op.kind])}<span><strong>${e(op.title)}</strong><small>${e(op.destination)}</small></span>${icon("check")}</div>`).join("")}</div><p class="quiet">This approval freezes revision ${c.revision}. The welcome message remains a draft. ${state.connections.destination ? "The approved snapshot will also be sent to the configured webhook." : "All destinations are inside this workspace."}</p><button class="primary full" type="submit">Approve and run ${icon("arrow")}</button></form>`,
    async () => {
      await api(`/clients/${c.id}/approve`, {
        method: "POST",
        body: { fingerprint: plan.fingerprint },
      });
      view = "activity";
      toast("Reviewed plan queued");
      await refresh();
    },
  );
}
function bind() {
  document.querySelector(".brand").onclick = (event) => {
    event.preventDefault();
    view = "intake";
    render();
  };
  document.querySelector("#logout").onclick = async () => {
    await api("/logout", { method: "POST" });
    login();
  };
  document.querySelectorAll("[data-view]").forEach(
    (button) =>
      (button.onclick = () => {
        view = button.dataset.view;
        render();
      }),
  );
  document.querySelectorAll("[data-client]").forEach(
    (button) =>
      (button.onclick = async () => {
        selected = button.dataset.client;
        plan = await api(`/clients/${selected}/preview`);
        render();
      }),
  );
  document
    .querySelector("#new-client")
    ?.addEventListener("click", () => editBrief());
  document
    .querySelector("#edit-client")
    ?.addEventListener("click", () =>
      editBrief(state.clients.find((c) => c.id === selected)),
    );
  document.querySelector("#review-plan")?.addEventListener("click", reviewPlan);
  document.querySelector("#view-run")?.addEventListener("click", () => {
    view = "activity";
    render();
  });
  document.querySelectorAll("[data-resume]").forEach(
    (button) =>
      (button.onclick = async () => {
        try {
          await api(`/runs/${button.dataset.resume}/resume`, {
            method: "POST",
          });
          toast("Remaining steps queued");
          await refresh();
        } catch (error) {
          toast(error.message, true);
        }
      }),
  );
  document
    .querySelector("#copy-payload")
    ?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          document.querySelector("#payload").textContent,
        );
        toast("Example payload copied");
      } catch {
        toast("Select the example payload to copy it manually");
      }
    });
}
setInterval(() => {
  if (state?.runs.some((r) => ["queued", "running"].includes(r.status)))
    refresh().catch((error) => toast(error.message, true));
}, 1500);
refresh().catch((error) => {
  if (error.status === 401) login();
  else {
    root.innerHTML = `<main class="login"><h1>The desk is unavailable.</h1><p>${e(error.message)}</p><button class="primary" id="reload">Try again</button></main>`;
    document.querySelector("#reload").onclick = () => location.reload();
  }
});
