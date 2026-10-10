import {exportStudies} from './export-studies.mjs';
export const studies = [
  {
    "id": "memory-layer",
    "number": "01",
    "category": "APPLIED AI / KNOWLEDGE RETRIEVAL",
    "overviewOnly": true,
    "title": "Give the model company context.",
    "name": "Operational AI memory layer",
    "summary": "A company knowledge layer connects process documentation, vector retrieval, and an LLM backend to answer questions with operational context.",
    "stack": [
      "Cloudflare Workers",
      "MCP",
      "pgvector",
      "Fine-tuned LLM",
      "Claude / OpenAI / Gemini"
    ],
    "problem": [
      "General-purpose models do not know how a particular business works. Useful answers need its processes, terminology, and documentation.",
      "I prepared that knowledge for retrieval and connected it to a model backend, combining document processing, vector memory, and model integrations."
    ],
    "ownership": "I built the memory layer, prepared and cleaned the operational documentation, generated vector embeddings, and integrated the model services. The backend included a fine-tuned LLM and integrations with Claude, OpenAI, and Gemini.",
    "diagrams": [],
    "steps": [],
    "decisions": [],
    "outcomes": [
      "Enabled answers grounded in company process documentation.",
      "Connected document preparation, vector retrieval, MCP, and model integrations in one knowledge system."
    ],
    "scope": "This overview describes the capabilities I implemented. Architecture and model-training details are not available for a technical walkthrough. Retrieval accuracy and time savings were not measured separately.",
    "basis": "Based on my implementation account, including document preparation, vector memory, MCP, the fine-tuned backend, and model-provider integrations.",
    "group": "Applied AI"
  },
  {
    "id": "workforce-platform",
    "number": "02",
    "category": "BUSINESS SOFTWARE / WORKFORCE OPERATIONS",
    "title": "One place to understand the team’s work.",
    "name": "Central workforce platform",
    "summary": "Tasks, time tracking, team activity, and KPIs become one management tool, while Airtable and the application continue to exchange updates.",
    "stack": [
      "React",
      "TypeScript",
      "Express / tRPC",
      "Drizzle",
      "MySQL / TiDB",
      "Airtable"
    ],
    "problem": [
      "Management needed a joined-up view of what the team was working on, what was taking time, and where bottlenecks were forming. Task records, time logs, and reporting sources needed to be usable together.",
      "Airtable also remained an active operational system. Building a better front end could not mean losing updates, leaving task state stale, or assuming the application was the only writer."
    ],
    "ownership": "I built and maintain the central workforce application and its bidirectional Airtable integration. My work spans task execution, time tracking, operational visibility, management reporting, permissions, and the synchronization paths that support them.",
    "diagrams": [
      {
        "file": "workforce-architecture",
        "title": "Separate the read path from the write path",
        "caption": "Baseline architecture: serialized application actions write through the Airtable client, then refresh the SQL mirror. Scheduled jobs bring external Airtable edits back into the application."
      },
      {
        "file": "workforce-action",
        "title": "Follow a task action through the system",
        "caption": "The direct-write path uses the provider’s response to refresh the mirror. Database-authoritative and outbox paths are gated migration modes, discussed below."
      }
    ],
    "steps": [
      [
        "Resolve the person and permissions",
        "The backend resolves the caller and applies capability and data-scope rules before serving operational data or accepting a mutation."
      ],
      [
        "Serialize task and timer actions",
        "Start, pause, resume, and completion actions go through a shared action path. Row-based locks coordinate the user’s actions across pooled database connections."
      ],
      [
        "Update the operational records",
        "The baseline writer sends task and time-log changes to Airtable. Returned records feed the SQL mirror without another provider read solely to refresh the same record."
      ],
      [
        "Bring external changes back",
        "Scheduled synchronization pulls Airtable changes into the SQL mirrors. Per-table jobs separate failure budgets so one slow table does not hold up every other table."
      ],
      [
        "Turn the records into management views",
        "SQL mirrors and read models support task, time, organization, and KPI views. Management can inspect activity, time spent, and bottlenecks through the central application."
      ]
    ],
    "decisions": [
      [
        "A database pool changes how locks work",
        "Session-scoped database locks can remain held when acquisition and release land on different pooled connections. The implemented lock state lives in shared database rows instead."
      ],
      [
        "Two directions require two contracts",
        "Application mutations and externally edited Airtable records have different entry points. The mirror refresh after a write complements scheduled reconciliation rather than replacing it."
      ],
      [
        "Migrate storage in controlled stages",
        "Direct, shadow, outbox, and database-first writer modes allow each table family to move independently. The architecture shows the baseline path, while the alternatives support a gradual cutover."
      ],
      [
        "Keep reporting meaning stable",
        "KPI source mappings and reporting logic are a separate subsystem. Access, task state, and reporting calculations should not silently change together during a storage migration."
      ]
    ],
    "outcomes": [
      "Gave management one tool for team activity, time allocation, KPIs, and bottleneck visibility.",
      "Kept the application connected to the existing Airtable workflows in both directions.",
      "Added engineering controls around ordering, mirror freshness, permissions, and gradual migration."
    ],
    "scope": "The map shows the Airtable-first write path. SQL supports reporting and mirrored records, while database-first writes are introduced gradually. Reporting still uses a mix of data sources. Productivity and latency changes have not been benchmarked.",
    "basis": "Reviewed application README, task-action state machine, SQL locking implementation, mirror synchronization, writer interface, and architecture decisions.",
    "group": "Business software"
  },
  {
    "id": "ticket-sync",
    "number": "03",
    "category": "AUTOMATION / BIDIRECTIONAL SYNC",
    "title": "Keep one support conversation across three systems.",
    "name": "Slack and ticketing synchronization",
    "summary": "Slack conversations and support tickets stay linked in both directions, with Airtable providing a reporting copy of the ticket records.",
    "stack": [
      "Slack",
      "Ticketing API",
      "Airtable",
      "Zapier",
      "Cloudflare Workers",
      "Webhooks"
    ],
    "problem": [
      "Support conversations and ticket records lived in different tools. A Slack reply, a ticket update, and the corresponding Airtable record needed to stay associated as work moved between teams and systems.",
      "The automation also had substantial cost exposure. The ticket-sync workflow represented roughly half of total Zapier task usage, making it an important part of the wider move toward owned, code-based integrations."
    ],
    "ownership": "I built and maintained the bidirectional Slack–ticketing integration and the downstream Airtable synchronization. I also moved automation workflows from Zapier to Cloudflare Workers as part of a broader cost-reduction effort.",
    "diagrams": [
      {
        "file": "ticket-architecture",
        "title": "Conversation, ticket, and record",
        "caption": "Slack and the ticketing platform exchange messages and updates. Airtable receives ticket records for reporting. Zapier and Cloudflare Workers represent the legacy and migrated execution paths."
      },
      {
        "file": "ticket-exchange",
        "title": "A conversation crosses the boundary",
        "caption": "A support message creates or updates a linked ticket. Replies return to the same Slack thread, while changes also update the reporting record. This sequence illustrates the flow rather than replaying a live ticket."
      }
    ],
    "steps": [
      [
        "Receive an event from the working tool",
        "Slack events and ticket-platform callbacks initiate separate directions of the integration. Each direction carries the conversation or ticket context needed by the destination."
      ],
      [
        "Apply the routing rules",
        "Filters, conditional paths, lookups, formatting, and code steps determine how each event reaches its destination. Migrating the automation requires preserving these rules alongside the API calls."
      ],
      [
        "Keep the conversation associated",
        "Slack messages and ticket updates need to resolve to the same support conversation. A reply belongs with its existing ticket and thread, rather than becoming an unrelated record."
      ],
      [
        "Maintain the reporting copy",
        "Ticket information also flows to Airtable for record keeping. That downstream copy is a separate handoff from the Slack-to-ticket conversation itself."
      ]
    ],
    "decisions": [
      [
        "Preserve the workflow contract during migration",
        "A short Worker can still be wrong if it drops a branch or changes a field mapping. The important unit is the end-to-end behavior, not how few lines replace the Zap."
      ],
      [
        "Treat acknowledgments as evidence at a specific boundary",
        "A Slack receipt or ticket-platform reply is evidence of that stage. It does not independently establish that every downstream Airtable record is present. The monitoring and audit system checks the gaps."
      ],
      [
        "Make delivery and recovery inspectable",
        "The related Threadbridge project demonstrates a Slack/Jira bridge with a delivery journal, duplicate suppression, and recovery. It is a separate implementation you can run and inspect."
      ]
    ],
    "outcomes": [
      "Kept Slack conversations, internal tickets, and Airtable records connected.",
      "The ticket-sync workflow represented roughly half of total Zapier task consumption.",
      "Across the wider Zapier-to-Workers migration, task consumption fell 50% and task-cost savings exceeded $25,000. These are program-level results, not an isolated measurement of this one service."
    ],
    "scope": "The diagrams simplify the integration to show the main handoffs. The wider migration’s savings are reported separately from this service. Not every workflow has moved to Workers, and the system does not promise exactly-once delivery.",
    "basis": "Reviewed private Zap export structures and integration documentation. Diagrams contain only abstract system roles and representative exchanges.",
    "related": {
      "href": "../../apps/threadbridge/",
      "label": "Explore Threadbridge: a runnable Slack/Jira bridge"
    },
    "group": "Automation & integrations"
  },
  {
    "id": "support-monitoring",
    "number": "04",
    "category": "RELIABILITY / MONITORING & RECONCILIATION",
    "title": "Detect missing handoffs in a support pipeline.",
    "name": "Support monitoring and ticket reconciliation",
    "summary": "Delayed checks catch unattended messages. Scheduled audits check channel coverage and reconcile ticket records, including failures the live checks cannot see.",
    "stack": [
      "Cloudflare Workers",
      "Durable Objects",
      "SQLite",
      "KV",
      "Slack API",
      "Airtable"
    ],
    "problem": [
      "Webhook-driven workflows can fail quietly. A missing acknowledgment might indicate an unattended support message or a broken sync, but a single reaction check is not a complete audit of the ticket pipeline.",
      "Monitoring also has its own blind spots: a bot can miss a channel, an old thread can become active again, and an expected ticket record can be missing from the reporting system."
    ],
    "ownership": "The engineering work combines delayed message checks with weekly and monthly reconciliation. Message-specific state, scheduled execution, progress checkpoints, and operator scorecards make the checks recoverable and inspectable.",
    "diagrams": [
      {
        "file": "support-architecture",
        "title": "Live checks and structural audits",
        "caption": "The message detector uses a per-message Durable Object. Scheduled audit state machines compare Slack and Airtable evidence and publish scorecards."
      },
      {
        "file": "support-audit",
        "title": "A long audit becomes resumable work",
        "caption": "The monthly implementation checkpoints phase and cursor state in SQLite, advances through bounded alarm ticks, then writes evidence to KV and a scorecard to Slack."
      }
    ],
    "steps": [
      [
        "Filter the incoming message",
        "The handler excludes bot messages and irrelevant event types, checks the monitored channel pattern, and sends the candidate to a deterministically named Durable Object."
      ],
      [
        "Check after the waiting window",
        "An alarm triggers after the configured delay. The object checks the root message for the expected receipt reaction and classifies the result, including special handling for thread broadcasts."
      ],
      [
        "Audit coverage and records",
        "Weekly checks cover channel membership, form-ticket synchronization, and unresolved alerts. The monthly sweep expands active threads and reconciles Slack evidence against Airtable ticket records."
      ],
      [
        "Keep a run inspectable",
        "The audit stores intermediate state and cursors in SQLite, writes final evidence to KV, and posts a scorecard. It can progress across invocations rather than depending on one long request."
      ]
    ],
    "decisions": [
      [
        "A receipt is a signal, not proof of the whole pipeline",
        "The live check and the record audit answer different questions. Their combination exposes failures that neither detector can establish alone."
      ],
      [
        "Checkpoint before continuing long work",
        "The audit separates enumeration, thread expansion, user classification, ticket matching, and reconciliation into bounded phases. This fits the implementation’s invocation budget and makes progress recoverable."
      ],
      [
        "Explain blind spots",
        "The delayed checker has a stale-check guard and can skip a candidate when user lookup fails. Coverage audits matter because a silent detector is not evidence that every message was handled."
      ]
    ],
    "outcomes": [
      "Made unattended messages and missing synchronization receipts visible to operators.",
      "Added a second layer of checks for channel coverage and cross-system record gaps.",
      "Produced archived evidence and classified findings instead of relying only on live alerts."
    ],
    "scope": "Receipt checks are a heuristic for acknowledgment. They do not prove that every downstream record exists. Scheduled audits address coverage and record consistency, but detection accuracy and missed-ticket reduction have not been benchmarked.",
    "basis": "Reviewed EchoBot message handler, delayed-check Durable Object, monthly audit state machine, and operating documentation.",
    "group": "Reliability & analytics"
  },
  {
    "id": "usage-observability",
    "number": "05",
    "category": "ANALYTICS / OPERATIONAL REPORTING",
    "title": "Measure what people did, not how often the app polled.",
    "name": "Workforce activity analytics",
    "summary": "A read-only reporting Worker turns application request logs into recognizable actions, team views, and activity patterns.",
    "stack": [
      "Cloudflare Workers",
      "TiDB HTTP SQL",
      "SQL aggregation",
      "Browser filtering",
      "CSV export"
    ],
    "problem": [
      "Raw request volume mixes deliberate work with automatic background traffic. A polling-heavy screen can produce many requests without the user starting or completing additional tasks.",
      "Management needed reporting that describes recognizable actions and team activity, with refreshable views rather than manually rebuilt snapshots."
    ],
    "ownership": "The reporting implementation combines a Cloudflare Worker, SQL aggregation, and a browser dashboard. Live refresh and saved reports share the same interface, with filters for teams, people, dates, and action categories.",
    "diagrams": [
      {
        "file": "usage-architecture",
        "title": "Aggregate on the server, explore in the browser",
        "caption": "The Worker reads request logs and employee mappings through the TiDB HTTP driver. A compact reporting payload feeds the dashboard and client-side filters."
      }
    ],
    "steps": [
      [
        "Read the recorded activity",
        "SQL queries aggregate request logs by person, action, and day, and join employee and team mappings. The reporting path reads the operational database rather than triggering workflow writes."
      ],
      [
        "Classify deliberate and automatic actions",
        "The action registry distinguishes task starts, pauses, completions, and report views from queue polling and session refresh traffic."
      ],
      [
        "Present recognizable views",
        "The report offers a detailed dashboard, a plain-language at-a-glance view, and a person-by-day activity map. Date, department, category, and employee filters share the same payload."
      ],
      [
        "Refresh without a rebuild",
        "The browser fetches a new aggregate payload on refresh. The same interface can also display a static snapshot, keeping rendering and data collection separate."
      ]
    ],
    "decisions": [
      [
        "Use business actions as the reporting unit",
        "Separating background presence from deliberate actions prevents raw polling volume from becoming an apparent measure of engagement."
      ],
      [
        "Keep database access on the server",
        "The Worker uses an HTTP SQL driver appropriate to its runtime. Database credentials stay out of the browser, which receives reporting data rather than SQL access."
      ],
      [
        "Bound the interpretation",
        "An activity gap is an observation about recorded app use. It is not automatically a measure of employee productivity, offline work, or task quality."
      ]
    ],
    "outcomes": [
      "Made application usage readable as task and reporting actions.",
      "Provided team and activity views with refresh and export controls.",
      "Separated operational activity from automatic traffic in the reporting model."
    ],
    "scope": "The dashboard measures recorded application activity, not offline work or task quality. Available history depends on log retention. Employee records and production telemetry are excluded from this case study.",
    "basis": "Reviewed the reporting README, action-category registry, SQL aggregation, and Worker routes.",
    "group": "Reliability & analytics"
  },
  ...exportStudies
];
