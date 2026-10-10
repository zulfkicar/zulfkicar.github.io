// Explanations are curated against the case-study evidence, not generated at runtime.
const p=(title,kind,does,why,caveat)=>({title,kind,does,why,caveat});
export const componentNotes={
 'workforce-architecture':{
  U:p('People using the platform','entry','Team members act on tasks while management reads activity and reporting.','One operational interface connects individual work to management visibility.'),
  UI:p('Workforce application','interface','React screens expose tasks, timers, team activity, and KPI views.','A central interface joins records that otherwise live across separate tools.'),
  API:p('Application API','compute','Express and tRPC route reads and task mutations to backend services.','Business logic and provider access stay behind the application boundary.'),
  AUTH:p('Permissions and data scope','decision','Resolves the caller, checks capabilities, and limits the accessible data.','A valid session should not grant access to every organizational record.'),
  READ:p('Reporting and reads','compute','Serves operational and management views through reporting services.','Reporting queries and task writes have different responsibilities.','Reporting uses a mix of data sources, including SQL mirrors.'),
  DB:p('SQL mirrors and read models','store','Stores synchronized records and derived structures in MySQL / TiDB.','SQL supports joins and management reporting across operational sources.','Mirror freshness depends on write refresh and scheduled synchronization.'),
  ACT:p('Task and timer actions','compute','Processes start, pause, resume, and completion through a shared action path.','A stateful timer needs consistent transition rules across requests.'),
  LOCK:p('Row lock and action queue','decision','Serializes actions for a user through shared database state.','Session locks can be acquired and released on different pooled connections. Row-based lock state avoids that mismatch.'),
  WRITE:p('Baseline Airtable writer','integration','Writes the operational task/time changes to Airtable.','Existing Airtable workflows remain part of the baseline write contract.','Database-first and outbox writer modes exist behind rollout gates. This diagram shows the baseline.'),
  AT:p('Airtable operational records','store','Holds records also edited by existing operational workflows.','The application must coexist with another active writer.'),
  ECHO:p('Inline mirror refresh','compute','Uses the provider’s updated response records to refresh the SQL mirror.','Avoids another read just to fetch the record returned by the write.','A provider acknowledgment and a complete downstream mirror are separate boundaries.'),
  SYNC:p('Scheduled table synchronization','integration','Imports external Airtable changes through per-table jobs.','Inline refresh cannot see edits made outside the app. Separate jobs also isolate slow tables.'),
  KPI:p('KPI ingestion and calculations','compute','Maps reporting sources and calculates KPI data.','Management measures need stable definitions while storage paths change.'),
  HS:p('Hubstaff integration','integration','Connects an external time/activity source to the backend.','Workforce context can include activity recorded outside the application.')
 },
 'workforce-action':{
  User:p('Team member','entry','Requests a task or timer transition.','The user receives the action result through the same application.'),
  API:p('Application API','compute','Authorizes the request, acquires the lock, writes, refreshes, and returns.','Orchestration establishes an explicit order for a multi-system mutation.'),
  Lock:p('SQL lock / queue','decision','Coordinates concurrent actions before they reach the writer.','Row-based state works across pooled connections rather than relying on a single database session.'),
  AT:p('Airtable','integration','Accepts the baseline mutation and returns updated records.','Retains compatibility with the existing operational record system.'),
  DB:p('SQL mirror','store','Receives the affected provider response records.','Management reads can follow the write without waiting solely for the next scheduled import.','The sequence does not promise a distributed transaction across providers.')
 },
 'ticket-architecture':{
  S:p('Slack conversation','entry','Carries support messages and linked thread responses.','People can keep working in their existing conversation.'),
  H:p('Synchronization handlers','compute','Route events, map fields, resolve context, and call destinations.','Bidirectional integration needs conditional behavior and identity mapping as well as API calls.','The map shows the main integration handoffs rather than a replay of a live ticket.'),
  T:p('Ticketing platform','integration','Receives ticket operations and emits replies or updates.','Ticket state must stay connected to the originating Slack conversation.'),
  A:p('Airtable records','store','Keeps downstream ticket information for operational records.','Conversation synchronization and reporting records are distinct handoffs.'),
  Z:p('Legacy Zapier orchestration','compute','Runs the original filters, lookups, routing rules, formatting, and API actions.','Existing routing rules and field mappings define the behavior a migration must preserve.','Legacy workflows can remain active during a gradual migration.'),
  W:p('Migrated Worker automations','compute','Runs migrated integrations as owned code on Cloudflare Workers.','The broader migration reduced billable task consumption and gave more control over implementation.','Migration is gradual. Some workflows still use the legacy execution path.'),
  M:p('Monitoring and audit','decision','Compares receipt signals and record evidence around the support pipeline.','One acknowledgment cannot prove every downstream handoff completed.')
 },
 'ticket-exchange':{
  S:p('Slack thread','entry','Starts a support exchange and receives mirrored responses.','The discussion stays associated with its operational ticket.'),
  W:p('Sync workflow','compute','Resolves context and coordinates ticket, conversation, and record writes.','Provider-specific actions need a common association between thread and ticket.','This illustrates the exchange rather than replaying a live ticket.'),
  T:p('Ticketing platform','integration','Creates/updates the linked ticket and returns ticket identity or replies.','Support teams retain their ticketing workflow.'),
  A:p('Airtable','store','Receives ticket record creation and updates.','Maintains a reporting copy independently of the chat exchange.')
 },
 'support-architecture':{
  S:p('Slack event','entry','Enters through the message handler.','Event-driven checks start from the support conversation.'),
  F:p('Eligibility filters','decision','Rejects bot messages, irrelevant types, and unmonitored channels.','Alerting on every event would create noise before any useful check happens.'),
  DO:p('Per-message Durable Object','compute','Names an object for the candidate message and stores its delayed check.','A durable message-specific unit can wait beyond the original webhook request.'),
  AL:p('Scheduled alarm','entry','Wakes the message checker after the configured window.','A delayed check gives the pipeline time to acknowledge a message.'),
  R:p('Root message and receipt','integration','Fetches the root message and expected reaction evidence.','The root conversation gives a consistent place to check acknowledgment.','Receipt checks are heuristic. Stale checks and failed user lookups can be skipped.'),
  OK:p('Receipt classification','decision','Classifies a candidate whose expected receipt is present.','Distinguishes observed acknowledgment from the missing-receipt case.','A receipt does not prove every downstream record exists.'),
  ALERT:p('Operator alert','interface','Surfaces a candidate with a missing receipt.','Makes a potential handoff failure visible for review.'),
  CRON:p('Audit schedules','entry','Starts weekly and monthly checks.','Periodic audits can find gaps missed by individual event checks.'),
  AUDIT:p('Checkpointed audit','compute','Sweeps evidence, expands threads, and reconciles records.','Coverage and record consistency need broader checks than a live reaction detector.'),
  SL:p('Slack evidence','integration','Supplies channels, history, threads, authors, and receipt signals.','Provides the conversation side of the reconciliation.'),
  AT:p('Airtable tickets','store','Supplies the operational records for matching.','Provides the record side of the reconciliation.'),
  DB:p('SQLite checkpoint','store','Stores phase and cursor state inside the Durable Object.','A long audit can continue across bounded invocations.'),
  KV:p('Evidence archive','store','Stores final audit evidence.','A scorecard can link back to an inspectable record of the run.'),
  SCORE:p('Slack scorecard','interface','Reports classified findings to operators.','The audit needs a usable handoff, not just an internal log.')
 },
 'support-audit':{
  I:p('Initialize coverage','entry','Starts a run and establishes the channels to inspect.','The audit must know its coverage before interpreting absence.'),
  S:p('Sweep history','integration','Reads the relevant message history.','Builds the candidate set for deeper thread inspection.'),
  T:p('Expand threads','integration','Fetches active conversation threads.','Replies can reveal activity that the root-message scan alone misses.'),
  U:p('Classify evidence','decision','Classifies authors and receipt signals.','Human conversation and bot acknowledgment play different roles in matching.'),
  A:p('Read alerts and tickets','integration','Collects alert and Airtable record evidence.','The reconciliation needs observations from both sides of the workflow.'),
  R:p('Reconcile records','compute','Identifies unmatched or inconsistent observations.','A receipt and a stored ticket are different facts.'),
  E:p('Publish and archive','interface','Writes evidence and posts the scorecard.','Operators need findings that remain inspectable after the run.'),
  DB:p('Durable Object SQLite','store','Persists progress including phase and cursors.','Avoids forcing the entire audit into one request lifetime.'),
  RESUME:p('Resume on an alarm','entry','Continues the saved phase on a bounded alarm tick.','Large scans can progress incrementally without discarding completed work.')
 },
 'usage-architecture':{
  DB:p('Logs and employee mappings','store','Stores request observations and organizational lookup data.','Activity needs context about the person and team.','This map describes the reporting pipeline without exposing employee data.'),
  SQL:p('SQL aggregation','compute','Groups activity by action, person, and day.','Sends useful summaries rather than raw request logs to the browser.'),
  REG:p('Action classification','decision','Separates deliberate actions from automatic background requests.','A polling screen should not look like extra completed work.'),
  PAY:p('Reporting payload','integration','Carries compact, categorized aggregates to the UI.','Keeps collection and rendering independent.'),
  UI:p('Browser dashboard','interface','Displays live or static reporting data.','Managers can explore recognizable operational actions.'),
  W:p('Reporting Worker','compute','Reads the database using the TiDB HTTP SQL driver.','Credentials stay server-side and the driver fits the Worker runtime.'),
  F:p('Client-side filters','decision','Filters the already loaded aggregates by date, team, and category.','Users can explore the same payload without starting workflow mutations.'),
  V:p('Views and exports','interface','Offers detailed reporting, activity maps, and export controls.','Different questions need different views of the same evidence.','Recorded app use does not measure offline productivity or task quality.'),
  SNAP:p('Static snapshot producer','compute','Creates a payload for the same browser interface.','The interface can work with an offline report as well as a live refresh.')
 },
 'employee-updates':{
  A:p('Update record','entry','Starts publication from an Airtable record.','The announcement has a structured source before delivery.'),
  WAIT:p('Publication time','decision','Waits for the scheduled time and passes publication filters.','Creating a draft and publishing it are distinct events.'),
  PUB:p('Shared delivery workflow','compute','Calls reusable channel and employee notification definitions.','Publishing paths share delivery steps through Sub-Zaps.','The map summarizes the configured process. End-to-end delivery has not been verified for every path.'),
  DEDUP:p('Recipient deduplication','compute','Python merges department, team, position, and direct lists, strips blanks, and removes repeats.','Overlapping memberships should not create duplicate recipients.'),
  LOOP:p('Per-person delivery','integration','Loops through employee lookup, delays, and Slack delivery paths.','Individual delivery requires person-specific context.','One shared notification path has an early return. Its downstream execution needs an end-to-end check.'),
  LOG:p('Delivery and acknowledgment records','store','Creates and updates associated Airtable records.','Follow-up checks need a record distinct from the original announcement.'),
  D1:p('First deadline check','decision','Waits until the first deadline and reads acknowledgment state over HTTP.','Sending a message does not establish that it was acknowledged.'),
  REM:p('Reminder paths','interface','Branches to record updates and Slack reminders.','Unacknowledged delivery needs an explicit follow-up outcome.'),
  D2:p('Second deadline check','decision','Waits again and repeats the acknowledgment-state lookup.','A later check can distinguish delayed acknowledgment from continued absence.'),
  FOLLOW:p('Further follow-up','interface','Updates records and posts the appropriate Slack follow-up.','Makes the deadline outcome visible without treating delivery as acknowledgment.')
 },
 'billing-requests':{
  S:p('Slack request message','entry','Starts intake from the operational conversation.','People can submit requests where the team already works.'),
  F:p('Intake filters','decision','Selects eligible messages before parsing.','Prevents arbitrary channel chatter from becoming a request.'),
  P:p('Python normalization','compute','Extracts labeled fields, strips Slack markup, and formats dates and timestamps.','Structured records need consistent fields despite variations in message formatting.','No comprehensive parser-accuracy result is available.'),
  L:p('Context lookup','integration','Finds related Airtable context before creating the request.','Intake should retain an association with the existing operational records.'),
  A:p('Request record','store','Stores the request details and source-conversation references.','Makes status and follow-up available outside an unstructured chat thread.'),
  R:p('Completion reaction','entry','Starts a separate event chain when a reaction is added.','Completion happens after intake and has its own event context.'),
  RF:p('Completion filters','decision','Checks the reaction event before the record lookup.','The completion path should not run for every reaction.'),
  FIND:p('Find the matching request','integration','Looks up the Airtable record referenced by the conversation.','A later event must resolve the existing request, not create a second one.'),
  UPDATE:p('Update completion state','compute','Updates the matching record’s completion field.','Keeps the request lifecycle available for follow-up.','This is record tracking. It does not authorize or execute a financial refund.')
 },
 'automation-alerts':{
  G:p('Provider email search','entry','Selects the provider notification emails.','A failure notice can be the available entry point when the workflow itself has stopped.'),
  PARSE:p('HTML extraction','compute','JavaScript decodes entities, strips HTML, extracts errors, and gathers links.','Operators need the failure context rather than a raw email template.'),
  FORMAT:p('Date and message preparation','compute','Formats the timestamp and Slack-safe message content.','Provider formatting and destination formatting use different conventions.'),
  B:p('Four routing paths','decision','Evaluates separate paths before Slack notification actions.','Different notice contexts can require distinct handling.','Private routing values and destinations are omitted.'),
  SL:p('Operator Slack alerts','interface','Posts the configured notification for the selected path.','Moves the issue into the team’s operational channel.','This is a historical workflow. It illustrates alert routing rather than an active monitoring service.')
 },
 'escalation-routing':{
  R:p('Reaction event','entry','Starts the handler from a support reaction.','The conversation carries a compact operator signal.'),
  F:p('Event filters','decision','Tests eligibility before extracting thread references.','Not every reaction should mutate an operational record.'),
  T:p('Thread context','integration','Retrieves the source conversation and extracts needed references.','A reaction alone is not enough to identify the correct record.'),
  D:p('Text and date preparation','compute','Normalizes references and prepares update metadata.','Lookups and lifecycle updates need data in the destination’s format.'),
  B:p('Nested path selection','decision','Groups six branch points and 17 filters that select the appropriate support outcome.','Different event and record conditions have different outcomes.','Repeated routing and record operations are grouped for readability.'),
  L:p('Record lookups','integration','Finds records by extracted context or record identity.','Updates need the existing operational entity.'),
  U:p('Status and lifecycle updates','compute','Writes fields for the matching route.','The support signal becomes structured state for subsequent work.'),
  S:p('Thread response','interface','Communicates the result back in Slack.','The people handling the conversation need the operational handoff outcome.'),
  ALT:p('Alternate responses','interface','Groups routes that respond differently instead of following the same mutation path.','Fallback and alternate record conditions must survive workflow migration.')
 }
};
