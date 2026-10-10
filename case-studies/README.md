# Baam engineering case studies

[Read the case studies](https://zulfkicar.github.io/case-studies/)

These are public architecture narratives, not releases of workplace code or data. The source definitions below also generate the static portfolio pages.

## Operational AI memory layer

A Cloudflare-hosted memory layer connects internal process documentation to an LLM backend so responses can use the company’s own operational context.

[Read the full case study](https://zulfkicar.github.io/case-studies/memory-layer/)

**Scope:** This page is a written overview of the capabilities I implemented. No workflow diagram, deployment topology, or training internals are published. No standalone accuracy or time-saving figure is assigned to this system.

## Central workforce platform

Tasks, time tracking, team activity, and KPIs become one management tool, while Airtable and the application continue to exchange updates.

[Read the full case study](https://zulfkicar.github.io/case-studies/workforce-platform/)

### Separate the read path from the write path

Baseline architecture: serialized application actions write through the Airtable client, then refresh the SQL mirror. Scheduled jobs bring external Airtable edits back into the application.

```mermaid
flowchart TB
  U[Team members and management] --> UI[React workforce application]
  UI --> API[Express and tRPC API]
  API --> AUTH[Caller / capability / data-scope checks]
  AUTH --> READ[Reporting and read services]
  READ --> DB[(MySQL / TiDB mirrors and read models)]
  DB --> READ
  READ --> UI
  AUTH --> ACT[Serialized task and timer actions]
  ACT --> LOCK[Row-based user lock and action queue]
  LOCK --> WRITE[Baseline Airtable writer]
  WRITE --> AT[(Airtable operational records)]
  AT -->|Response records| ECHO[Inline mirror refresh]
  ECHO --> DB
  AT -->|External edits| SYNC[Per-table scheduled synchronization]
  SYNC --> DB
  KPI[KPI ingestion and calculations] --> DB
  HS[Hubstaff integration] --> API
```

### Follow a task action through the system

The direct-write path uses the provider’s response to refresh the mirror. Database-authoritative and outbox paths are gated migration modes, discussed below.

```mermaid
sequenceDiagram
  autonumber
  participant User as Team member
  participant API as API
  participant Lock as Action lock
  participant AT as Airtable
  participant DB as SQL mirror
  User->>API: Task or timer action
  API->>API: Authorize caller
  API->>Lock: Acquire user lock
  Lock-->>API: Action ready
  API->>AT: Write record
  AT-->>API: Updated records
  API->>DB: Refresh mirror
  API->>Lock: Release lock
  API-->>User: Action result
  Note over AT,DB: Scheduled sync imports external edits
```

**Scope:** The diagram describes the baseline flow in the inspected implementation. It does not claim that all reads are SQL-only or that every writer family is database-authoritative. No before/after productivity or latency result is claimed.

## Slack–ticketing–Airtable synchronization

A bidirectional bridge keeps Slack and the internal ticketing platform connected, with ticket records synchronized to Airtable for operational record keeping.

[Read the full case study](https://zulfkicar.github.io/case-studies/ticket-sync/)

### Conversation, ticket, and record

Logical topology of the workplace integration. Zapier exports document the legacy orchestration. Migrated automations use Cloudflare Workers. The diagram does not imply that every exported path has been ported.

```mermaid
flowchart LR
  S[Slack conversation] -->|Message or reply| H[Sync workflow handlers]
  H -->|Ticket operation| T[Internal ticketing platform]
  T -->|Ticket event or reply| H
  H -->|Thread response| S
  H -->|Record synchronization| A[(Airtable records)]
  Z[Legacy Zapier orchestration] -. Existing path .-> H
  W[Migrated Cloudflare Worker automations] -. Code-based path .-> H
  S -. Receipt evidence .-> M[Support monitoring and audit]
  A -. Record evidence .-> M
```

### A conversation crosses the boundary

A representative exchange explains the dual-sync contract. Internal API names, identities, and payloads are abstracted. It is not an execution trace from a customer ticket.

```mermaid
sequenceDiagram
  autonumber
  participant S as Slack thread
  participant W as Sync workflow
  participant T as Ticket system
  participant A as Airtable
  S->>W: Support message
  W->>T: Create / update ticket
  T-->>W: Ticket identity
  W-->>S: Thread response
  W->>A: Store ticket record
  T->>W: Reply / update
  W->>S: Mirror reply
  W->>A: Update record
  Note over S,A: Representative contract · not a customer trace
```

**Scope:** The topology and ownership are based on my implementation account, supported by the export structures and integration documentation. No live private endpoints are exposed, and no exactly-once delivery or complete migration claim is made.

## EchoBot and ticket-sync audit

Delayed checks catch unattended messages. Scheduled audits check channel coverage and reconcile ticket records, including failures the live checks cannot see.

[Read the full case study](https://zulfkicar.github.io/case-studies/support-monitoring/)

### Live checks and structural audits

The message detector uses a per-message Durable Object. Scheduled audit state machines compare Slack and Airtable evidence and publish scorecards.

```mermaid
flowchart TB
  S[Slack message event] --> F[Bot / event / channel filters]
  F --> DO[Per-message Durable Object]
  DO --> AL[Scheduled alarm]
  AL --> R[Read root message and receipt reaction]
  R --> OK[Receipt present / classify result]
  R --> ALERT[Missing receipt / operator alert]
  CRON[Weekly and monthly schedules] --> AUDIT[Checkpointed audit state machines]
  SL[Slack channel and thread evidence] --> AUDIT
  AT[Airtable ticket records] --> AUDIT
  AUDIT <--> DB[(SQLite phase and cursor state)]
  AUDIT --> KV[(KV evidence archive)]
  AUDIT --> SCORE[Slack scorecard and classified findings]
```

### A long audit becomes resumable work

The monthly implementation checkpoints phase and cursor state in SQLite, advances through bounded alarm ticks, then writes evidence to KV and a scorecard to Slack.

```mermaid
flowchart TB
  I[Initialize run and channel coverage] --> S[Sweep message history]
  S --> T[Expand active threads]
  T --> U[Classify authors and receipts]
  U --> A[Read alerts and Airtable tickets]
  A --> R[Reconcile unmatched records]
  R --> E[Archive evidence and publish scorecard]
  S -. Save cursor .-> DB[(Durable Object SQLite)]
  T -. Save phase state .-> DB
  U -. Save phase state .-> DB
  A -. Save cursor .-> DB
  DB -. Next bounded alarm tick .-> RESUME[Resume current phase]
  RESUME -. Continue .-> S
  RESUME -. Continue .-> T
  RESUME -. Continue .-> U
  RESUME -. Continue .-> A
```

**Scope:** The architecture is supported by source and documentation. No missed-ticket reduction, audit accuracy, or measured time savings is claimed. A receipt-based alert remains a heuristic rather than direct confirmation of every provider write.

## Workforce usage observability

A read-only reporting Worker turns application request logs into recognizable actions, team views, and activity patterns.

[Read the full case study](https://zulfkicar.github.io/case-studies/usage-observability/)

### Aggregate on the server, explore in the browser

The Worker reads request logs and employee mappings through the TiDB HTTP driver. A compact reporting payload feeds the dashboard and client-side filters.

```mermaid
flowchart LR
  DB[(Request logs and employee mappings)] --> SQL[Server-side SQL aggregation]
  SQL --> REG[Classify actions and background traffic]
  REG --> PAY[Compact reporting payload]
  PAY --> UI[Browser dashboard]
  UI -->|Refresh| W[Cloudflare reporting Worker]
  W -->|TiDB HTTP SQL driver| SQL
  UI --> F[Date / team / category filters]
  F --> V[Detailed view / activity map / exports]
  SNAP[Static snapshot producer] -. Same UI contract .-> UI
```

**Scope:** The case study publishes the reporting architecture, not employee records or production telemetry. Retention limits the available history. No headcount, individual activity, or benchmark performance figures are published.

## Employee updates and acknowledgment tracking

Scheduled announcements, reusable recipient delivery, and two acknowledgment deadlines connect communication to a follow-up process.

[Read the full case study](https://zulfkicar.github.io/case-studies/employee-updates/)

### Publish, deliver, then check acknowledgment

A logical overview of four related exported definitions. The initial delivery and deadline-monitoring paths are separate. Provider calls check acknowledgment state, while Airtable holds the associated records.

```mermaid
flowchart LR
  A[Update record] --> WAIT[Publication time and filters]
  WAIT --> PUB[Shared delivery workflows]
  PUB --> DEDUP[Merge and deduplicate recipients]
  DEDUP --> LOOP[Per-person lookup and Slack delivery]
  LOOP --> LOG[(Delivery and acknowledgment records)]
  LOG --> D1[First deadline and HTTP check]
  D1 --> REM[Record updates and reminders]
  REM --> D2[Second deadline and HTTP check]
  D2 --> FOLLOW[Record updates and further follow-up]
```

**Scope:** This is an abstraction of exported configuration, not a live replay. All four definitions are marked on in the export snapshot. One notification Sub-Zap places a return step before later processing in its parent graph, so the export alone does not establish that every downstream step executes. No delivery rate or compliance improvement is claimed.

## Billing-request intake and completion

A structured Slack submission becomes an Airtable request. A separate reaction-driven path updates the matching record when the request is completed.

[Read the full case study](https://zulfkicar.github.io/case-studies/billing-requests/)

### Two events, one operational record

The message path filters, parses, looks up context, and creates a request. The reaction path filters a completion signal and updates a matching record. It records the request lifecycle; it does not execute a refund.

```mermaid
flowchart LR
  S[Slack request message] --> F[Intake filters]
  F --> P[Python field normalization]
  P --> L[Related context lookup]
  L --> A[(Airtable request record)]
  R[Completion reaction] --> RF[Completion filters]
  RF --> FIND[Find matching request]
  FIND --> UPDATE[Update completion state]
  UPDATE --> A
```

**Scope:** Two definitions, 11 total nodes, both marked on in the export snapshot. Parsing is implementation evidence, not proof that every possible submission is handled correctly. Customer names, emails, amounts, records, and private field identifiers are omitted.

## Automation failure and connection alerts

Provider notification emails are normalized and routed into Slack alerts, exposing disabled workflows and expired connections where operators can respond.

[Read the full case study](https://zulfkicar.github.io/case-studies/automation-alerts/)

### Convert provider notices into usable alerts

Historical exported configuration: a Gmail search trigger feeds HTML normalization and branching before Slack delivery. This definition is marked off in the supplied snapshot.

```mermaid
flowchart LR
  G[Provider email search] --> PARSE[HTML and error extraction]
  PARSE --> FORMAT[Date and message preparation]
  FORMAT --> B[Four conditional routing paths]
  B --> SL[Operator Slack alerts]
```

**Scope:** Historical configuration only, marked off in the export snapshot. Two other named definitions cover ticket-sync error and reaction checks, also marked off. No uptime, recovery-time improvement, or automated repair claim is made.

## Escalation routing and lifecycle updates

A 61-node reaction-driven handler resolves thread context, selects conditional paths, looks up records, updates status, and responds in Slack.

[Read the full case study](https://zulfkicar.github.io/case-studies/escalation-routing/)

### Resolve context before changing state

A grouped view of the consolidated handler. Repeated lookup/update/response paths are grouped for readability. It does not show all 61 nodes or publish private emoji-to-status rules.

```mermaid
flowchart LR
  R[Support reaction event] --> F[Event filters]
  F --> T[Retrieve and extract thread context]
  T --> D[Text and date preparation]
  D --> B[Nested path selection]
  B --> L[Record lookups]
  L --> U[Status and lifecycle updates]
  U --> S[Slack thread responses]
  B --> ALT[Alternate Slack response paths]
```

**Scope:** Export-backed logical view. The 61-node handler is marked on in the snapshot. The ten related entries include retired definitions and must not be counted as ten currently deployed independent systems. No resolution-time or ticket-volume improvement is claimed.

## Rebuild

From the portfolio root, run `node scripts/build-case-studies.mjs` to regenerate HTML and this Markdown file from `case-studies/content.mjs`.

Flowcharts use hand-arranged component cards from `scripts/architecture-maps.mjs`, with every edge parsed and validated against its `.mmd` source. Sequence SVGs are static builds of the `.mmd` files using [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli). With Mermaid CLI 11.12.0 installed, run `mmdc -i case-studies/diagrams/NAME.mmd -o case-studies/diagrams/NAME.svg -c case-studies/mermaid-config.json -b transparent`. The explorer uses local inline SVG, pointer and keyboard navigation, and curated component explanations. No diagram runtime, external model calls, or export data is required by visitors.
