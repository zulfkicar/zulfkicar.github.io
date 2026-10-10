// Case studies use abstract system roles and exclude workplace records.
export const exportStudies = [
  {
    "id": "employee-updates",
    "number": "06",
    "category": "AUTOMATION / EMPLOYEE COMMUNICATIONS",
    "title": "Publishing an update is only the first step.",
    "name": "Employee updates and acknowledgment tracking",
    "summary": "Scheduled announcements, reusable recipient delivery, and two acknowledgment deadlines connect communication to a follow-up process.",
    "stack": [
      "Airtable",
      "Slack",
      "Sub-Zaps",
      "Python",
      "Loops",
      "Deadline scheduling"
    ],
    "problem": [
      "An announcement is not complete when someone presses send. It needs to reach the right people, avoid duplicate recipients, and distinguish delivery from acknowledgment.",
      "Department, team, position, and direct recipient lists can overlap. Deadline checks also need a different lifecycle from the initial publication."
    ],
    "ownership": "My contribution covered publication scheduling, reusable notification workflows, Python-based recipient processing, and acknowledgment follow-up. The process connects announcement records to targeted Slack delivery and deadline checks.",
    "diagrams": [
      {
        "file": "employee-updates",
        "title": "Publish, deliver, then check acknowledgment",
        "caption": "Publication and acknowledgment monitoring run as separate workflows. Recipient lists are deduplicated before delivery, while Airtable records support reminders and deadline checks."
      }
    ],
    "steps": [
      [
        "Wait for the publication time",
        "A new Airtable update enters a delay-until step, passes a filter, updates its record, and calls a reusable delivery workflow."
      ],
      [
        "Resolve recipients without duplication",
        "The custom Python step combines department, team, position, and direct employee lists, strips empty entries, and removes duplicates while preserving order."
      ],
      [
        "Deliver and record the result",
        "Employee lookups, loops, and Slack actions handle individual delivery. Airtable stores delivery and acknowledgment records for later checks. Delays and alternate paths handle different delivery outcomes."
      ],
      [
        "Check both deadlines",
        "The monitoring workflow waits for the first deadline, reads acknowledgment state through an HTTP action, and branches into record updates and reminders. A second deadline repeats the check and supports further follow-up."
      ]
    ],
    "decisions": [
      [
        "Separate publication from follow-up",
        "A deadline monitor needs to continue long after publication. Distinct definitions keep the send path separate from later acknowledgment checks."
      ],
      [
        "Deduplicate before the loop",
        "A person can be selected through more than one organizational grouping. Removing duplicate inputs prevents the delivery loop from treating each membership as a new recipient."
      ],
      [
        "Reuse delivery behavior",
        "Shared notification workflows let different publishing paths use the same delivery steps, reducing duplicated routing and recipient logic."
      ]
    ],
    "outcomes": [
      "Connected scheduled publication, targeted delivery, and acknowledgment follow-up.",
      "Removed repeated recipients before delivery and linked deadline checks to acknowledgment records."
    ],
    "scope": "The map summarizes the configured process. One delivery path needs an end-to-end execution check because it contains an early return. Delivery and acknowledgment rates have not been measured here.",
    "basis": "Reviewed parent relationships, Sub-Zap input mappings, recipient-deduplication code, loops, deadline steps, provider actions, and branch structure.",
    "group": "Automation & integrations"
  },
  {
    "id": "billing-requests",
    "number": "07",
    "category": "AUTOMATION / REQUEST PROCESSING",
    "title": "Turn a message into a request you can track.",
    "name": "Billing-request intake and completion",
    "summary": "A structured Slack submission becomes an Airtable request. A separate reaction-driven path updates the matching record when the request is completed.",
    "stack": [
      "Slack",
      "Python",
      "Airtable",
      "Event filters",
      "Record lookup"
    ],
    "problem": [
      "Requests made in chat are easy to lose in the surrounding conversation. Useful follow-up needs structured fields, a link back to the discussion, and a way to record completion.",
      "Human-written fields also arrive with varying capitalization, Slack link markup, and missing or ambiguous dates."
    ],
    "ownership": "My work on request processing covered Python message parsing, Airtable context lookups, structured record creation, and reaction-driven completion updates.",
    "diagrams": [
      {
        "file": "billing-requests",
        "title": "Two events, one operational record",
        "caption": "The message path filters, parses, looks up context, and creates a request. The reaction path filters a completion signal and updates a matching record. It records the request lifecycle; it does not execute a refund."
      }
    ],
    "steps": [
      [
        "Select request messages",
        "The Slack message trigger passes two filters before parsing, rather than turning every message into a billing record."
      ],
      [
        "Normalize the submission",
        "Python extracts labeled fields, handles Slack email/link markup, tolerates capitalization differences, and prepares date and timestamp fields for Airtable."
      ],
      [
        "Create a structured record",
        "An Airtable lookup supplies related context before the request record is created. The record mappings include request details and source-conversation references."
      ],
      [
        "Update on a completion signal",
        "A separate Slack reaction trigger passes filters, finds the relevant Airtable record, and updates its completion field."
      ]
    ],
    "decisions": [
      [
        "Keep intake and completion independent",
        "The request message and the later completion reaction are distinct events. Each path resolves its own record context."
      ],
      [
        "Normalize at the boundary",
        "Handling Slack markup and date formatting before the record write makes the reporting fields easier to use than raw chat text."
      ],
      [
        "Separate request tracking from payment execution",
        "This workflow records intake and completion. Payment authorization, refunds, and transfers remain outside its responsibilities."
      ]
    ],
    "outcomes": [
      "Made billing requests available as structured records with conversation context.",
      "Connected an in-chat completion signal to the existing request record."
    ],
    "scope": "This is a request-tracking workflow, not a payment system. The parser handles the documented message format, but accuracy across arbitrary submissions has not been benchmarked.",
    "basis": "Reviewed both event chains, the custom Python parser, Airtable lookup/write mappings, and the completion reaction path.",
    "group": "Automation & integrations"
  },
  {
    "id": "automation-alerts",
    "number": "08",
    "category": "AUTOMATION / FAILURE ALERTING",
    "title": "Make a broken automation visible to its operators.",
    "name": "Automation failure and connection alerts",
    "summary": "A historical alerting workflow turned provider notices into Slack messages, preserving error context and links so operators could respond.",
    "stack": [
      "Gmail",
      "JavaScript",
      "HTML normalization",
      "Conditional paths",
      "Slack"
    ],
    "problem": [
      "A workflow can stop because its connection expires or the provider disables it. An email in an inbox is a weak operational handoff when the team coordinates in Slack.",
      "Provider emails mix HTML, entity encoding, error details, and links. The useful context must survive the conversion into an alert."
    ],
    "ownership": "My contribution included JavaScript extraction of error details and links from provider emails, Slack-safe formatting, timestamp preparation, and conditional alert routing.",
    "diagrams": [
      {
        "file": "automation-alerts",
        "title": "Convert provider notices into usable alerts",
        "caption": "An email trigger feeds error extraction and conditional routing before Slack notification. This is a historical workflow, not an active monitoring service."
      }
    ],
    "steps": [
      [
        "Find the provider notice",
        "A Gmail search trigger selects the incoming notice stream."
      ],
      [
        "Extract useful context",
        "JavaScript decodes HTML entities, strips markup, extracts workflow/app and error context, collects links, and prepares Slack-safe link formatting."
      ],
      [
        "Format and route",
        "A date-formatting step precedes four conditional paths, each with a Slack message action."
      ],
      [
        "Hand the issue to operators",
        "The output makes the notice available in team chat. It is an alerting path, not an automatic reconnection or repair system."
      ]
    ],
    "decisions": [
      [
        "Parse before sending",
        "Forwarding the raw HTML would obscure the actual failure. The code extracts the context needed for a useful operational message."
      ],
      [
        "Route by notice context",
        "Separate conditional paths select the appropriate notification. The map groups the routing rules to make the handoff easier to follow."
      ],
      [
        "Distinguish alerts from recovery",
        "The workflow surfaces failures for operators. It does not renew credentials, reconnect accounts, or repair broken automations."
      ]
    ],
    "outcomes": [
      "Converted provider failure notices into structured team alerts.",
      "Preserved error context and relevant links during the email-to-Slack transformation."
    ],
    "scope": "This workflow is a historical implementation and is no longer enabled in the documented configuration. It demonstrates alert transformation and routing, not current monitoring coverage or automated recovery.",
    "basis": "Reviewed the complete 12-node parent graph, HTML extraction code, formatting step, four paths, and Slack actions.",
    "group": "Automation & integrations"
  },
  {
    "id": "escalation-routing",
    "number": "09",
    "category": "AUTOMATION / SUPPORT ESCALATIONS",
    "title": "A reaction can carry a whole operational handoff.",
    "name": "Escalation routing and lifecycle updates",
    "summary": "Support reactions resolve thread context, select the appropriate route, update linked records, and return a response to the conversation.",
    "stack": [
      "Slack reactions",
      "Thread lookups",
      "Airtable",
      "Text / date formatting",
      "Nested paths"
    ],
    "problem": [
      "Escalations change state inside support conversations. An operator’s reaction needs to connect back to the right thread and operational record, including cases where expected context is missing.",
      "A multi-outcome handoff cannot be represented accurately as one trigger and one API call. The lookups, filters, and alternate paths are part of its behavior."
    ],
    "ownership": "My work covered reaction-driven support routing, thread-context retrieval, record lookups, status updates, and Slack responses. The consolidated handler includes six branch points and 17 path filters for different event and record conditions.",
    "diagrams": [
      {
        "file": "escalation-routing",
        "title": "Resolve context before changing state",
        "caption": "The map groups repeated lookup, update, and response steps. Conditional paths preserve different outcomes when record context is missing or a different response is needed."
      }
    ],
    "steps": [
      [
        "Filter the reaction event",
        "The initial reaction trigger passes filtering and formatting steps before thread-context retrieval."
      ],
      [
        "Resolve source context",
        "Thread retrieval and text extraction recover the references used by subsequent Airtable lookups. Date formatting prepares update metadata."
      ],
      [
        "Select a supported route",
        "Six branch points and 17 path filters distinguish event and record conditions. Several fallback or alternate paths respond in Slack instead of following the same update chain."
      ],
      [
        "Update and communicate",
        "Matched routes find records, write operational fields, and post responses. Related definitions separately store thread references and completion times."
      ]
    ],
    "decisions": [
      [
        "Context comes before mutation",
        "The handler extracts and looks up the relevant context before applying record changes. A reaction alone is not sufficient to identify the operational record."
      ],
      [
        "Keep alternate outcomes visible",
        "Missing or different record conditions take distinct paths. Flattening the workflow during migration would lose these cases."
      ],
      [
        "Consolidate shared routing",
        "The combined handler brings common context retrieval and branching into one flow. Related single-purpose workflows have separate retirement and rollout states."
      ]
    ],
    "outcomes": [
      "Connected support reactions to record updates and conversation responses.",
      "Expressed conditional routing and alternate outcomes explicitly in a consolidated handler."
    ],
    "scope": "This map groups a larger handler for readability. It does not imply that every older workflow has been retired or replaced. Resolution-time and ticket-volume improvements have not been measured separately.",
    "basis": "Reviewed all named escalation definitions, parent relationships, six branch points, 17 path filters, thread retrieval, formatting, and record mutations.",
    "group": "Automation & integrations"
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
