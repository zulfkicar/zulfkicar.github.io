// Public narratives distilled from the private export. No raw definitions or identifiers.
export const exportStudies = [
  {
    id:'employee-updates', number:'06', category:'COMMUNICATIONS / WORKFLOW ORCHESTRATION',
    title:'Publishing an update is only the first step.', name:'Employee updates and acknowledgment tracking',
    summary:'Scheduled announcements, reusable recipient delivery, and two acknowledgment deadlines connect communication to a follow-up process.',
    stack:['Airtable','Slack','Sub-Zaps','Python','Loops','Deadline scheduling'],
    problem:['An announcement is not complete when someone presses send. It needs to reach the right people, avoid duplicate recipients, and distinguish delivery from acknowledgment.', 'Department, team, position, and direct recipient lists can overlap. Deadline checks also need a different lifecycle from the initial publication.'],
    ownership:'Four related workflows in the supplied export bear my name: publication, acknowledgment monitoring, a channel-delivery Sub-Zap, and an employee-notification Sub-Zap. These definitions show the orchestration and custom recipient-processing work.',
    diagrams:[{file:'employee-updates',title:'Publish, deliver, then check acknowledgment',caption:'A logical overview of four related exported definitions. The initial delivery and deadline-monitoring paths are separate. Provider calls check acknowledgment state, while Airtable holds the associated records.'}],
    steps:[['Wait for the publication time','A new Airtable update enters a delay-until step, passes a filter, updates its record, and calls a reusable delivery workflow.'],['Resolve recipients without duplication','The custom Python step combines department, team, position, and direct employee lists, strips empty entries, and removes duplicates while preserving order.'],['Deliver and record the result','Loops, employee lookups, Slack message actions, and Airtable create/update steps handle individual delivery. The exported paths also include delays and alternate delivery outcomes.'],['Check both deadlines','The monitoring workflow waits for the first deadline, reads acknowledgment state through an HTTP action, and branches into record updates and reminders. A second deadline repeats the check and supports further follow-up.']],
    decisions:[['Separate publication from follow-up','A deadline monitor needs to continue long after publication. Distinct definitions keep the send path separate from later acknowledgment checks.'],['Deduplicate before the loop','A person can be selected through more than one organizational grouping. Removing duplicate inputs prevents the delivery loop from treating each membership as a new recipient.'],['Reuse delivery behavior','Sub-Zaps let more than one publishing path call shared delivery steps. That is inspectable reuse in the export, rather than a claim about a newly invented runtime.']],
    outcomes:['Connected scheduled publication, targeted delivery, and acknowledgment follow-up in one workflow family.','The four definitions contain 84 exported nodes, including loop, delay, code, and conditional-path steps.'],
    scope:'This is an abstraction of exported configuration, not a live replay. All four definitions are marked on in the export snapshot. One notification Sub-Zap places a return step before later processing in its parent graph, so the export alone does not establish that every downstream step executes. No delivery rate or compliance improvement is claimed.',
    basis:'Reviewed parent relationships, Sub-Zap input mappings, recipient-deduplication code, loops, deadline steps, provider actions, and branch structure.'
  },
  {
    id:'billing-requests', number:'07', category:'OPERATIONS / STRUCTURED DATA',
    title:'Turn a message into a request you can track.', name:'Billing-request intake and completion',
    summary:'A structured Slack submission becomes an Airtable request. A separate reaction-driven path updates the matching record when the request is completed.',
    stack:['Slack','Python','Airtable','Event filters','Record lookup'],
    problem:['Requests made in chat are easy to lose in the surrounding conversation. Useful follow-up needs structured fields, a link back to the discussion, and a way to record completion.', 'Human-written fields also arrive with varying capitalization, Slack link markup, and missing or ambiguous dates.'],
    ownership:'The intake and completion workflows both bear my name in the export. The intake contains custom parsing code, and the completion definition looks up and updates the existing request.',
    diagrams:[{file:'billing-requests',title:'Two events, one operational record',caption:'The message path filters, parses, looks up context, and creates a request. The reaction path filters a completion signal and updates a matching record. It records the request lifecycle; it does not execute a refund.'}],
    steps:[['Select request messages','The Slack message trigger passes two filters before parsing, rather than turning every message into a billing record.'],['Normalize the submission','Python extracts labeled fields, handles Slack email/link markup, tolerates capitalization differences, and prepares date and timestamp fields for Airtable.'],['Create a structured record','An Airtable lookup supplies related context before the request record is created. The record mappings include request details and source-conversation references.'],['Update on a completion signal','A separate Slack reaction trigger passes filters, finds the relevant Airtable record, and updates its completion field.']],
    decisions:[['Keep intake and completion independent','The request message and the later completion reaction are distinct events. Each path resolves its own record context.'],['Normalize at the boundary','Handling Slack markup and date formatting before the record write makes the reporting fields easier to use than raw chat text.'],['Do not confuse tracking with payment execution','The definitions create and update operational records. They do not demonstrate a banking integration, refund authorization, or transfer of funds.']],
    outcomes:['Made billing requests available as structured records with conversation context.','Connected an in-chat completion signal to the existing request record.'],
    scope:'Two definitions, 11 total nodes, both marked on in the export snapshot. Parsing is implementation evidence, not proof that every possible submission is handled correctly. Customer names, emails, amounts, records, and private field identifiers are omitted.',
    basis:'Reviewed both event chains, the custom Python parser, Airtable lookup/write mappings, and the completion reaction path.'
  },
  {
    id:'automation-alerts', number:'08', category:'AUTOMATION / OPERATIONAL VISIBILITY',
    title:'Make a broken automation visible to its operators.', name:'Automation failure and connection alerts',
    summary:'Provider notification emails are normalized and routed into Slack alerts, exposing disabled workflows and expired connections where operators can respond.',
    stack:['Gmail','JavaScript','HTML normalization','Conditional paths','Slack'],
    problem:['A workflow can stop because its connection expires or the provider disables it. An email in an inbox is a weak operational handoff when the team coordinates in Slack.', 'Provider emails mix HTML, entity encoding, error details, and links. The useful context must survive the conversion into an alert.'],
    ownership:'The 12-node failure-notification workflow bears my name. It includes a custom JavaScript extraction step, date formatting, four conditional paths, and Slack notification actions.',
    diagrams:[{file:'automation-alerts',title:'Convert provider notices into usable alerts',caption:'Historical exported configuration: a Gmail search trigger feeds HTML normalization and branching before Slack delivery. This definition is marked off in the supplied snapshot.'}],
    steps:[['Find the provider notice','A Gmail search trigger selects the incoming notice stream.'],['Extract useful context','JavaScript decodes HTML entities, strips markup, extracts workflow/app and error context, collects links, and prepares Slack-safe link formatting.'],['Format and route','A date-formatting step precedes four conditional paths, each with a Slack message action.'],['Hand the issue to operators','The output makes the notice available in team chat. It is an alerting path, not an automatic reconnection or repair system.']],
    decisions:[['Parse before sending','Forwarding the raw HTML would obscure the actual failure. The code extracts the context needed for a useful operational message.'],['Branch by notice context','The export expresses routing as separate conditional paths. The diagram preserves that choice without exposing private routing conditions or destinations.'],['Label historical state honestly','The definition is off in this export. Its presence shows implemented configuration, not current deployment or current monitoring coverage.']],
    outcomes:['Provided a configured path from provider failure notices to team alerts.','Preserved error context and relevant links during the email-to-Slack transformation.'],
    scope:'Historical configuration only, marked off in the export snapshot. Two other named definitions cover ticket-sync error and reaction checks, also marked off. No uptime, recovery-time improvement, or automated repair claim is made.',
    basis:'Reviewed the complete 12-node parent graph, HTML extraction code, formatting step, four paths, and Slack actions.'
  },
  {
    id:'escalation-routing', number:'09', category:'SUPPORT / CONDITIONAL ORCHESTRATION',
    title:'A reaction can carry a whole operational handoff.', name:'Escalation routing and lifecycle updates',
    summary:'A 61-node reaction-driven handler resolves thread context, selects conditional paths, looks up records, updates status, and responds in Slack.',
    stack:['Slack reactions','Thread lookups','Airtable','Text / date formatting','Nested paths'],
    problem:['Escalations change state inside support conversations. An operator’s reaction needs to connect back to the right thread and operational record, including cases where expected context is missing.', 'A multi-outcome handoff cannot be represented accurately as one trigger and one API call. The lookups, filters, and alternate paths are part of its behavior.'],
    ownership:'Ten escalation or support-status definitions bear my name. The largest consolidated escalation handler has 61 nodes, six branch points, and 17 path filters. Several older single-purpose definitions are explicitly retired in their titles and marked off.',
    diagrams:[{file:'escalation-routing',title:'Resolve context before changing state',caption:'A grouped view of the consolidated handler. Repeated lookup/update/response paths are grouped for readability. It does not show all 61 nodes or publish private emoji-to-status rules.'}],
    steps:[['Filter the reaction event','The initial reaction trigger passes filtering and formatting steps before thread-context retrieval.'],['Resolve source context','Thread retrieval and text extraction recover the references used by subsequent Airtable lookups. Date formatting prepares update metadata.'],['Select a supported route','Six branch points and 17 path filters distinguish event and record conditions. Several fallback or alternate paths respond in Slack instead of following the same update chain.'],['Update and communicate','Matched routes find records, write operational fields, and post responses. Related definitions separately store thread references and completion times.']],
    decisions:[['Context comes before mutation','The handler extracts and looks up the relevant context before applying record changes. A reaction alone is not sufficient to identify the operational record.'],['Keep alternate outcomes visible','Missing or different record conditions take distinct paths. Flattening the workflow during migration would lose these cases.'],['Treat consolidation as a source observation','The export contains a large combined handler alongside retired single-purpose definitions. That supports a consolidation narrative, not a claim that every old workflow has been replaced everywhere.']],
    outcomes:['Connected support reactions to record updates and conversation responses.','Expressed conditional routing and alternate outcomes explicitly in a consolidated handler.'],
    scope:'Export-backed logical view. The 61-node handler is marked on in the snapshot. The ten related entries include retired definitions and must not be counted as ten currently deployed independent systems. No resolution-time or ticket-volume improvement is claimed.',
    basis:'Reviewed all named escalation definitions, parent relationships, six branch points, 17 path filters, thread retrieval, formatting, and record mutations.'
  }
];

export const exportInventory = [
  ['Time tracking and clock state',3,'Hubstaff clock events, Airtable updates, and a webhook email service.'],
  ['Support conversation integration',3,'Messages, context lookups, ticket operations, and record creation.'],
  ['Escalation and support-state handling',10,'Reaction triggers, nested paths, status updates, and timestamps.'],
  ['Operational communications',7,'Record- and webhook-driven messages, loops, and scheduled delays.'],
  ['Employee announcements and acknowledgments',4,'Reusable delivery, recipient deduplication, and two deadline checks.'],
  ['Billing-request lifecycle',2,'Structured intake parsing and reaction-driven completion.'],
  ['Automation health checks',3,'Provider notices, ticket-sync errors, and reaction checks.'],
  ['Onboarding and stakeholder notifications',5,'Welcome messages, request notifications, and thread participation.'],
  ['Intake, entitlement, and record synchronization',5,'Webhook intake, record matching/upserts, and code-based entitlement selection.'],
  ['Booking and call coordination',4,'Checklist updates, cancellation alerts, and spreadsheet records.'],
  ['Commission communications',1,'Conditional email communications.'],
  ['Account-support utility',1,'Historical account-support configuration, excluded from public detail.']
];
