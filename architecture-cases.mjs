// Derived from the published Mermaid definitions and component notes.
export const caseArchitectures = {
  "case-workforce-platform": {
    "title": "Workforce application",
    "eyebrow": "Documented operational data flow",
    "color": "#7d9977",
    "width": 926.1200000000001,
    "height": 700,
    "layers": [
      "entry",
      "interface",
      "compute",
      "decision",
      "store",
      "integration"
    ],
    "nodes": [
      {
        "id": "U",
        "label": "People",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Team members act on tasks while management reads activity and reporting. One operational interface connects individual work to management visibility.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "UI"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · U"
      },
      {
        "id": "UI",
        "label": "Workforce app",
        "type": "interface",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "React screens expose tasks, timers, team activity, and KPI views. A central interface joins records that otherwise live across separate tools.",
        "input": {
          "from": [
            "U",
            "READ"
          ]
        },
        "output": {
          "to": [
            "API"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · UI"
      },
      {
        "id": "API",
        "label": "API",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Express and tRPC route reads and task mutations to backend services. Business logic and provider access stay behind the application boundary.",
        "input": {
          "from": [
            "UI",
            "HS"
          ]
        },
        "output": {
          "to": [
            "AUTH"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · API"
      },
      {
        "id": "AUTH",
        "label": "Permissions",
        "type": "decision",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 3,
        "does": "Resolves the caller, checks capabilities, and limits the accessible data. A valid session should not grant access to every organizational record.",
        "input": {
          "from": [
            "API"
          ]
        },
        "output": {
          "to": [
            "READ",
            "ACT"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · AUTH"
      },
      {
        "id": "HS",
        "label": "Hubstaff",
        "type": "integration",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 5,
        "does": "Connects an external time/activity source to the backend. Workforce context can include activity recorded outside the application.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "API"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · HS"
      },
      {
        "id": "READ",
        "label": "Reporting",
        "type": "process",
        "x": 35.84,
        "y": 235,
        "layer": 2,
        "does": "Serves operational and management views through reporting services. Reporting queries and task writes have different responsibilities. Reporting uses a mix of data sources, including SQL mirrors.",
        "input": {
          "from": [
            "AUTH",
            "DB"
          ]
        },
        "output": {
          "to": [
            "DB",
            "UI"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · READ"
      },
      {
        "id": "DB",
        "label": "SQL mirror",
        "type": "store",
        "x": 35.84,
        "y": 397.5,
        "layer": 4,
        "does": "Stores synchronized records and derived structures in MySQL / TiDB. SQL supports joins and management reporting across operational sources. Mirror freshness depends on write refresh and scheduled synchronization.",
        "input": {
          "from": [
            "READ",
            "ECHO",
            "SYNC",
            "KPI"
          ]
        },
        "output": {
          "to": [
            "READ"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · DB"
      },
      {
        "id": "KPI",
        "label": "KPI metrics",
        "type": "process",
        "x": 35.84,
        "y": 560,
        "layer": 2,
        "does": "Maps reporting sources and calculates KPI data. Management measures need stable definitions while storage paths change.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "DB"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · KPI"
      },
      {
        "id": "ACT",
        "label": "Task actions",
        "type": "process",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 2,
        "does": "Processes start, pause, resume, and completion through a shared action path. A stateful timer needs consistent transition rules across requests.",
        "input": {
          "from": [
            "AUTH"
          ]
        },
        "output": {
          "to": [
            "LOCK"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · ACT"
      },
      {
        "id": "LOCK",
        "label": "Action lock",
        "type": "decision",
        "x": 701.1200000000001,
        "y": 397.5,
        "layer": 3,
        "does": "Serializes actions for a user through shared database state. Session locks can be acquired and released on different pooled connections. Row-based lock state avoids that mismatch.",
        "input": {
          "from": [
            "ACT"
          ]
        },
        "output": {
          "to": [
            "WRITE"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · LOCK"
      },
      {
        "id": "WRITE",
        "label": "Writer",
        "type": "integration",
        "x": 701.1200000000001,
        "y": 560,
        "layer": 5,
        "does": "Writes the operational task/time changes to Airtable. Existing Airtable workflows remain part of the baseline write contract. Database-first and outbox writer modes exist behind rollout gates. This diagram shows the baseline.",
        "input": {
          "from": [
            "LOCK"
          ]
        },
        "output": {
          "to": [
            "AT"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · WRITE"
      },
      {
        "id": "AT",
        "label": "Airtable",
        "type": "store",
        "x": 479.36000000000007,
        "y": 560,
        "layer": 4,
        "does": "Holds records also edited by existing operational workflows. The application must coexist with another active writer.",
        "input": {
          "from": [
            "WRITE"
          ]
        },
        "output": {
          "to": [
            "ECHO",
            "SYNC"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · AT"
      },
      {
        "id": "ECHO",
        "label": "Refresh",
        "type": "process",
        "x": 257.6,
        "y": 397.5,
        "layer": 2,
        "does": "Uses the provider’s updated response records to refresh the SQL mirror. Avoids another read just to fetch the record returned by the write. A provider acknowledgment and a complete downstream mirror are separate boundaries.",
        "input": {
          "from": [
            "AT"
          ]
        },
        "output": {
          "to": [
            "DB"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · ECHO"
      },
      {
        "id": "SYNC",
        "label": "Table sync",
        "type": "integration",
        "x": 257.6,
        "y": 560,
        "layer": 5,
        "does": "Imports external Airtable changes through per-table jobs. Inline refresh cannot see edits made outside the app. Separate jobs also isolate slow tables.",
        "input": {
          "from": [
            "AT"
          ]
        },
        "output": {
          "to": [
            "DB"
          ]
        },
        "evidence": "case-studies/diagrams/workforce-architecture.mmd · SYNC"
      }
    ],
    "edges": [
      {
        "from": "U",
        "to": "UI",
        "label": "",
        "kind": "data"
      },
      {
        "from": "UI",
        "to": "API",
        "label": "",
        "kind": "data"
      },
      {
        "from": "API",
        "to": "AUTH",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AUTH",
        "to": "READ",
        "label": "",
        "kind": "data"
      },
      {
        "from": "READ",
        "to": "DB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "DB",
        "to": "READ",
        "label": "",
        "kind": "data"
      },
      {
        "from": "READ",
        "to": "UI",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AUTH",
        "to": "ACT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "ACT",
        "to": "LOCK",
        "label": "",
        "kind": "data"
      },
      {
        "from": "LOCK",
        "to": "WRITE",
        "label": "",
        "kind": "data"
      },
      {
        "from": "WRITE",
        "to": "AT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AT",
        "to": "ECHO",
        "label": "",
        "kind": "data"
      },
      {
        "from": "ECHO",
        "to": "DB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AT",
        "to": "SYNC",
        "label": "",
        "kind": "data"
      },
      {
        "from": "SYNC",
        "to": "DB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "KPI",
        "to": "DB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "HS",
        "to": "API",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "App write",
        "steps": [
          {
            "node": "U",
            "caption": "Team members act on tasks while management reads activity and reporting. One operational interface connects individual work to management visibility.",
            "payload": {
              "component": "People",
              "to": [
                "UI"
              ]
            },
            "state": "complete"
          },
          {
            "node": "UI",
            "caption": "React screens expose tasks, timers, team activity, and KPI views. A central interface joins records that otherwise live across separate tools.",
            "payload": {
              "component": "Workforce app",
              "to": [
                "API"
              ]
            },
            "state": "complete"
          },
          {
            "node": "API",
            "caption": "Express and tRPC route reads and task mutations to backend services. Business logic and provider access stay behind the application boundary.",
            "payload": {
              "component": "API",
              "to": [
                "AUTH"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AUTH",
            "caption": "Resolves the caller, checks capabilities, and limits the accessible data. A valid session should not grant access to every organizational record.",
            "payload": {
              "component": "Permissions",
              "to": [
                "READ",
                "ACT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "ACT",
            "caption": "Processes start, pause, resume, and completion through a shared action path. A stateful timer needs consistent transition rules across requests.",
            "payload": {
              "component": "Task actions",
              "to": [
                "LOCK"
              ]
            },
            "state": "complete"
          },
          {
            "node": "LOCK",
            "caption": "Serializes actions for a user through shared database state. Session locks can be acquired and released on different pooled connections. Row-based lock state avoids that mismatch.",
            "payload": {
              "component": "Action lock",
              "to": [
                "WRITE"
              ]
            },
            "state": "complete"
          },
          {
            "node": "WRITE",
            "caption": "Writes the operational task/time changes to Airtable. Existing Airtable workflows remain part of the baseline write contract. Database-first and outbox writer modes exist behind rollout gates. This diagram shows the baseline.",
            "payload": {
              "component": "Writer",
              "to": [
                "AT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AT",
            "caption": "Holds records also edited by existing operational workflows. The application must coexist with another active writer.",
            "payload": {
              "component": "Airtable",
              "to": [
                "ECHO",
                "SYNC"
              ]
            },
            "state": "complete"
          },
          {
            "node": "ECHO",
            "caption": "Uses the provider’s updated response records to refresh the SQL mirror. Avoids another read just to fetch the record returned by the write. A provider acknowledgment and a complete downstream mirror are separate boundaries.",
            "payload": {
              "component": "Refresh",
              "to": [
                "DB"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DB",
            "caption": "Stores synchronized records and derived structures in MySQL / TiDB. SQL supports joins and management reporting across operational sources. Mirror freshness depends on write refresh and scheduled synchronization.",
            "payload": {
              "component": "SQL mirror",
              "to": [
                "READ"
              ]
            },
            "state": "complete"
          },
          {
            "node": "READ",
            "caption": "Serves operational and management views through reporting services. Reporting queries and task writes have different responsibilities. Reporting uses a mix of data sources, including SQL mirrors.",
            "payload": {
              "component": "Reporting",
              "to": [
                "DB",
                "UI"
              ]
            },
            "state": "complete"
          },
          {
            "node": "UI",
            "caption": "React screens expose tasks, timers, team activity, and KPI views. A central interface joins records that otherwise live across separate tools.",
            "payload": {
              "component": "Workforce app",
              "to": [
                "API"
              ]
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "External edit",
        "steps": [
          {
            "node": "AT",
            "caption": "Holds records also edited by existing operational workflows. The application must coexist with another active writer.",
            "payload": {
              "component": "Airtable",
              "to": [
                "ECHO",
                "SYNC"
              ]
            },
            "state": "complete"
          },
          {
            "node": "SYNC",
            "caption": "Imports external Airtable changes through per-table jobs. Inline refresh cannot see edits made outside the app. Separate jobs also isolate slow tables.",
            "payload": {
              "component": "Table sync",
              "to": [
                "DB"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DB",
            "caption": "Stores synchronized records and derived structures in MySQL / TiDB. SQL supports joins and management reporting across operational sources. Mirror freshness depends on write refresh and scheduled synchronization.",
            "payload": {
              "component": "SQL mirror",
              "to": [
                "READ"
              ]
            },
            "state": "complete"
          },
          {
            "node": "READ",
            "caption": "Serves operational and management views through reporting services. Reporting queries and task writes have different responsibilities. Reporting uses a mix of data sources, including SQL mirrors.",
            "payload": {
              "component": "Reporting",
              "to": [
                "DB",
                "UI"
              ]
            },
            "state": "complete"
          },
          {
            "node": "UI",
            "caption": "React screens expose tasks, timers, team activity, and KPI views. A central interface joins records that otherwise live across separate tools.",
            "payload": {
              "component": "Workforce app",
              "to": [
                "API"
              ]
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-ticket-sync": {
    "title": "Support ticket synchronization",
    "eyebrow": "Documented operational data flow",
    "color": "#71a7a4",
    "width": 704.3600000000001,
    "height": 537.5,
    "layers": [
      "entry",
      "compute",
      "integration",
      "store",
      "decision"
    ],
    "nodes": [
      {
        "id": "S",
        "label": "Slack",
        "type": "input",
        "x": 35.84,
        "y": 235,
        "layer": 0,
        "does": "Carries support messages and linked thread responses. People can keep working in their existing conversation.",
        "input": {
          "from": [
            "H"
          ]
        },
        "output": {
          "to": [
            "H",
            "M"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · S"
      },
      {
        "id": "H",
        "label": "Sync handlers",
        "type": "process",
        "x": 257.6,
        "y": 235,
        "layer": 1,
        "does": "Route events, map fields, resolve context, and call destinations. Bidirectional integration needs conditional behavior and identity mapping as well as API calls. The map shows the main integration handoffs rather than a replay of a live ticket.",
        "input": {
          "from": [
            "S",
            "T",
            "Z",
            "W"
          ]
        },
        "output": {
          "to": [
            "T",
            "S",
            "A"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · H"
      },
      {
        "id": "T",
        "label": "Ticket system",
        "type": "integration",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 2,
        "does": "Receives ticket operations and emits replies or updates. Ticket state must stay connected to the originating Slack conversation.",
        "input": {
          "from": [
            "H"
          ]
        },
        "output": {
          "to": [
            "H"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · T"
      },
      {
        "id": "A",
        "label": "Airtable",
        "type": "store",
        "x": 257.6,
        "y": 397.5,
        "layer": 3,
        "does": "Keeps downstream ticket information for operational records. Conversation synchronization and reporting records are distinct handoffs.",
        "input": {
          "from": [
            "H"
          ]
        },
        "output": {
          "to": [
            "M"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · A"
      },
      {
        "id": "Z",
        "label": "Zapier",
        "type": "process",
        "x": 35.84,
        "y": 72.5,
        "layer": 1,
        "does": "Runs the original filters, lookups, routing rules, formatting, and API actions. Existing routing rules and field mappings define the behavior a migration must preserve. Legacy workflows can remain active during a gradual migration.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "H"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · Z"
      },
      {
        "id": "W",
        "label": "Workers",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 1,
        "does": "Runs migrated integrations as owned code on Cloudflare Workers. The broader migration reduced billable task consumption and gave more control over implementation. Migration is gradual. Some workflows still use the legacy execution path.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "H"
          ]
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · W"
      },
      {
        "id": "M",
        "label": "Monitor",
        "type": "decision",
        "x": 35.84,
        "y": 397.5,
        "layer": 4,
        "does": "Compares receipt signals and record evidence around the support pipeline. One acknowledgment cannot prove every downstream handoff completed.",
        "input": {
          "from": [
            "S",
            "A"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/ticket-architecture.mmd · M"
      }
    ],
    "edges": [
      {
        "from": "S",
        "to": "H",
        "label": "",
        "kind": "data"
      },
      {
        "from": "H",
        "to": "T",
        "label": "",
        "kind": "data"
      },
      {
        "from": "T",
        "to": "H",
        "label": "",
        "kind": "data"
      },
      {
        "from": "H",
        "to": "S",
        "label": "",
        "kind": "data"
      },
      {
        "from": "H",
        "to": "A",
        "label": "",
        "kind": "data"
      },
      {
        "from": "Z",
        "to": "H",
        "label": "",
        "kind": "optional"
      },
      {
        "from": "W",
        "to": "H",
        "label": "",
        "kind": "optional"
      },
      {
        "from": "S",
        "to": "M",
        "label": "",
        "kind": "optional"
      },
      {
        "from": "A",
        "to": "M",
        "label": "",
        "kind": "optional"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Slack to ticket",
        "steps": [
          {
            "node": "S",
            "caption": "Carries support messages and linked thread responses. People can keep working in their existing conversation.",
            "payload": {
              "component": "Slack",
              "to": [
                "H",
                "M"
              ]
            },
            "state": "complete"
          },
          {
            "node": "H",
            "caption": "Route events, map fields, resolve context, and call destinations. Bidirectional integration needs conditional behavior and identity mapping as well as API calls. The map shows the main integration handoffs rather than a replay of a live ticket.",
            "payload": {
              "component": "Sync handlers",
              "to": [
                "T",
                "S",
                "A"
              ]
            },
            "state": "complete"
          },
          {
            "node": "T",
            "caption": "Receives ticket operations and emits replies or updates. Ticket state must stay connected to the originating Slack conversation.",
            "payload": {
              "component": "Ticket system",
              "to": [
                "H"
              ]
            },
            "state": "complete"
          },
          {
            "node": "H",
            "caption": "Route events, map fields, resolve context, and call destinations. Bidirectional integration needs conditional behavior and identity mapping as well as API calls. The map shows the main integration handoffs rather than a replay of a live ticket.",
            "payload": {
              "component": "Sync handlers",
              "to": [
                "T",
                "S",
                "A"
              ]
            },
            "state": "complete"
          },
          {
            "node": "S",
            "caption": "Carries support messages and linked thread responses. People can keep working in their existing conversation.",
            "payload": {
              "component": "Slack",
              "to": [
                "H",
                "M"
              ]
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Record handoff",
        "steps": [
          {
            "node": "S",
            "caption": "Carries support messages and linked thread responses. People can keep working in their existing conversation.",
            "payload": {
              "component": "Slack",
              "to": [
                "H",
                "M"
              ]
            },
            "state": "complete"
          },
          {
            "node": "H",
            "caption": "Route events, map fields, resolve context, and call destinations. Bidirectional integration needs conditional behavior and identity mapping as well as API calls. The map shows the main integration handoffs rather than a replay of a live ticket.",
            "payload": {
              "component": "Sync handlers",
              "to": [
                "T",
                "S",
                "A"
              ]
            },
            "state": "complete"
          },
          {
            "node": "A",
            "caption": "Keeps downstream ticket information for operational records. Conversation synchronization and reporting records are distinct handoffs.",
            "payload": {
              "component": "Airtable",
              "to": [
                "M"
              ]
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-support-monitoring": {
    "title": "Support monitoring and recovery",
    "eyebrow": "Documented operational data flow",
    "color": "#c69767",
    "width": 926.1200000000001,
    "height": 700,
    "layers": [
      "entry",
      "decision",
      "compute",
      "integration",
      "interface",
      "store"
    ],
    "nodes": [
      {
        "id": "S",
        "label": "Slack event",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Enters through the message handler. Event-driven checks start from the support conversation.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "F"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · S"
      },
      {
        "id": "F",
        "label": "Filter",
        "type": "decision",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "Rejects bot messages, irrelevant types, and unmonitored channels. Alerting on every event would create noise before any useful check happens.",
        "input": {
          "from": [
            "S"
          ]
        },
        "output": {
          "to": [
            "DO"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · F"
      },
      {
        "id": "DO",
        "label": "Message state",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Names an object for the candidate message and stores its delayed check. A durable message-specific unit can wait beyond the original webhook request.",
        "input": {
          "from": [
            "F"
          ]
        },
        "output": {
          "to": [
            "AL"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · DO"
      },
      {
        "id": "AL",
        "label": "Alarm",
        "type": "input",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 0,
        "does": "Wakes the message checker after the configured window. A delayed check gives the pipeline time to acknowledge a message.",
        "input": {
          "from": [
            "DO"
          ]
        },
        "output": {
          "to": [
            "R"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · AL"
      },
      {
        "id": "R",
        "label": "Read receipt",
        "type": "integration",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 3,
        "does": "Fetches the root message and expected reaction evidence. The root conversation gives a consistent place to check acknowledgment. Receipt checks are heuristic. Stale checks and failed user lookups can be skipped.",
        "input": {
          "from": [
            "AL"
          ]
        },
        "output": {
          "to": [
            "OK",
            "ALERT"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · R"
      },
      {
        "id": "OK",
        "label": "Received",
        "type": "decision",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 1,
        "does": "Classifies a candidate whose expected receipt is present. Distinguishes observed acknowledgment from the missing-receipt case. A receipt does not prove every downstream record exists.",
        "input": {
          "from": [
            "R"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · OK"
      },
      {
        "id": "ALERT",
        "label": "Alert",
        "type": "interface",
        "x": 701.1200000000001,
        "y": 397.5,
        "layer": 4,
        "does": "Surfaces a candidate with a missing receipt. Makes a potential handoff failure visible for review.",
        "input": {
          "from": [
            "R"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · ALERT"
      },
      {
        "id": "CRON",
        "label": "Schedules",
        "type": "input",
        "x": 35.84,
        "y": 397.5,
        "layer": 0,
        "does": "Starts weekly and monthly checks. Periodic audits can find gaps missed by individual event checks.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "AUDIT"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · CRON"
      },
      {
        "id": "SL",
        "label": "Slack evidence",
        "type": "integration",
        "x": 35.84,
        "y": 235,
        "layer": 3,
        "does": "Supplies channels, history, threads, authors, and receipt signals. Provides the conversation side of the reconciliation.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "AUDIT"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · SL"
      },
      {
        "id": "AT",
        "label": "Ticket records",
        "type": "store",
        "x": 257.6,
        "y": 235,
        "layer": 5,
        "does": "Supplies the operational records for matching. Provides the record side of the reconciliation.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "AUDIT"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · AT"
      },
      {
        "id": "AUDIT",
        "label": "Audit",
        "type": "process",
        "x": 257.6,
        "y": 397.5,
        "layer": 2,
        "does": "Sweeps evidence, expands threads, and reconciles records. Coverage and record consistency need broader checks than a live reaction detector.",
        "input": {
          "from": [
            "CRON",
            "SL",
            "AT",
            "DB"
          ]
        },
        "output": {
          "to": [
            "DB",
            "KV",
            "SCORE"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · AUDIT"
      },
      {
        "id": "DB",
        "label": "Checkpoint",
        "type": "store",
        "x": 35.84,
        "y": 560,
        "layer": 5,
        "does": "Stores phase and cursor state inside the Durable Object. A long audit can continue across bounded invocations.",
        "input": {
          "from": [
            "AUDIT"
          ]
        },
        "output": {
          "to": [
            "AUDIT"
          ]
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · DB"
      },
      {
        "id": "KV",
        "label": "Archive",
        "type": "store",
        "x": 257.6,
        "y": 560,
        "layer": 5,
        "does": "Stores final audit evidence. A scorecard can link back to an inspectable record of the run.",
        "input": {
          "from": [
            "AUDIT"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · KV"
      },
      {
        "id": "SCORE",
        "label": "Scorecard",
        "type": "interface",
        "x": 479.36000000000007,
        "y": 560,
        "layer": 4,
        "does": "Reports classified findings to operators. The audit needs a usable handoff, not just an internal log.",
        "input": {
          "from": [
            "AUDIT"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/support-architecture.mmd · SCORE"
      }
    ],
    "edges": [
      {
        "from": "S",
        "to": "F",
        "label": "",
        "kind": "data"
      },
      {
        "from": "F",
        "to": "DO",
        "label": "",
        "kind": "data"
      },
      {
        "from": "DO",
        "to": "AL",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AL",
        "to": "R",
        "label": "",
        "kind": "data"
      },
      {
        "from": "R",
        "to": "OK",
        "label": "",
        "kind": "data"
      },
      {
        "from": "R",
        "to": "ALERT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "CRON",
        "to": "AUDIT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "SL",
        "to": "AUDIT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AT",
        "to": "AUDIT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AUDIT",
        "to": "DB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "DB",
        "to": "AUDIT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AUDIT",
        "to": "KV",
        "label": "",
        "kind": "data"
      },
      {
        "from": "AUDIT",
        "to": "SCORE",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Receipt found",
        "steps": [
          {
            "node": "S",
            "caption": "Enters through the message handler. Event-driven checks start from the support conversation.",
            "payload": {
              "component": "Slack event",
              "to": [
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Rejects bot messages, irrelevant types, and unmonitored channels. Alerting on every event would create noise before any useful check happens.",
            "payload": {
              "component": "Filter",
              "to": [
                "DO"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DO",
            "caption": "Names an object for the candidate message and stores its delayed check. A durable message-specific unit can wait beyond the original webhook request.",
            "payload": {
              "component": "Message state",
              "to": [
                "AL"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AL",
            "caption": "Wakes the message checker after the configured window. A delayed check gives the pipeline time to acknowledge a message.",
            "payload": {
              "component": "Alarm",
              "to": [
                "R"
              ]
            },
            "state": "complete"
          },
          {
            "node": "R",
            "caption": "Fetches the root message and expected reaction evidence. The root conversation gives a consistent place to check acknowledgment. Receipt checks are heuristic. Stale checks and failed user lookups can be skipped.",
            "payload": {
              "component": "Read receipt",
              "to": [
                "OK",
                "ALERT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "OK",
            "caption": "Classifies a candidate whose expected receipt is present. Distinguishes observed acknowledgment from the missing-receipt case. A receipt does not prove every downstream record exists.",
            "payload": {
              "component": "Received",
              "to": []
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Missing receipt",
        "steps": [
          {
            "node": "S",
            "caption": "Enters through the message handler. Event-driven checks start from the support conversation.",
            "payload": {
              "component": "Slack event",
              "to": [
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Rejects bot messages, irrelevant types, and unmonitored channels. Alerting on every event would create noise before any useful check happens.",
            "payload": {
              "component": "Filter",
              "to": [
                "DO"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DO",
            "caption": "Names an object for the candidate message and stores its delayed check. A durable message-specific unit can wait beyond the original webhook request.",
            "payload": {
              "component": "Message state",
              "to": [
                "AL"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AL",
            "caption": "Wakes the message checker after the configured window. A delayed check gives the pipeline time to acknowledge a message.",
            "payload": {
              "component": "Alarm",
              "to": [
                "R"
              ]
            },
            "state": "complete"
          },
          {
            "node": "R",
            "caption": "Fetches the root message and expected reaction evidence. The root conversation gives a consistent place to check acknowledgment. Receipt checks are heuristic. Stale checks and failed user lookups can be skipped.",
            "payload": {
              "component": "Read receipt",
              "to": [
                "OK",
                "ALERT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "ALERT",
            "caption": "Surfaces a candidate with a missing receipt. Makes a potential handoff failure visible for review.",
            "payload": {
              "component": "Alert",
              "to": []
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Scheduled audit",
        "steps": [
          {
            "node": "CRON",
            "caption": "Starts weekly and monthly checks. Periodic audits can find gaps missed by individual event checks.",
            "payload": {
              "component": "Schedules",
              "to": [
                "AUDIT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AUDIT",
            "caption": "Sweeps evidence, expands threads, and reconciles records. Coverage and record consistency need broader checks than a live reaction detector.",
            "payload": {
              "component": "Audit",
              "to": [
                "DB",
                "KV",
                "SCORE"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DB",
            "caption": "Stores phase and cursor state inside the Durable Object. A long audit can continue across bounded invocations.",
            "payload": {
              "component": "Checkpoint",
              "to": [
                "AUDIT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "AUDIT",
            "caption": "Sweeps evidence, expands threads, and reconciles records. Coverage and record consistency need broader checks than a live reaction detector.",
            "payload": {
              "component": "Audit",
              "to": [
                "DB",
                "KV",
                "SCORE"
              ]
            },
            "state": "complete"
          },
          {
            "node": "SCORE",
            "caption": "Reports classified findings to operators. The audit needs a usable handoff, not just an internal log.",
            "payload": {
              "component": "Scorecard",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-usage-observability": {
    "title": "Application usage reporting",
    "eyebrow": "Documented operational data flow",
    "color": "#a590c2",
    "width": 926.1200000000001,
    "height": 537.5,
    "layers": [
      "store",
      "compute",
      "decision",
      "integration",
      "interface"
    ],
    "nodes": [
      {
        "id": "DB",
        "label": "Request logs",
        "type": "store",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Stores request observations and organizational lookup data. Activity needs context about the person and team. This map describes the reporting pipeline without exposing employee data.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "SQL"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · DB"
      },
      {
        "id": "SQL",
        "label": "Aggregate",
        "type": "process",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "Groups activity by action, person, and day. Sends useful summaries rather than raw request logs to the browser.",
        "input": {
          "from": [
            "DB",
            "W"
          ]
        },
        "output": {
          "to": [
            "REG"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · SQL"
      },
      {
        "id": "REG",
        "label": "Classify",
        "type": "decision",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Separates deliberate actions from automatic background requests. A polling screen should not look like extra completed work.",
        "input": {
          "from": [
            "SQL"
          ]
        },
        "output": {
          "to": [
            "PAY"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · REG"
      },
      {
        "id": "PAY",
        "label": "Payload",
        "type": "integration",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 3,
        "does": "Carries compact, categorized aggregates to the UI. Keeps collection and rendering independent.",
        "input": {
          "from": [
            "REG"
          ]
        },
        "output": {
          "to": [
            "UI"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · PAY"
      },
      {
        "id": "UI",
        "label": "Dashboard",
        "type": "interface",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 4,
        "does": "Displays live or static reporting data. Managers can explore recognizable operational actions.",
        "input": {
          "from": [
            "PAY",
            "SNAP"
          ]
        },
        "output": {
          "to": [
            "W",
            "F"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · UI"
      },
      {
        "id": "F",
        "label": "Filter views",
        "type": "decision",
        "x": 701.1200000000001,
        "y": 397.5,
        "layer": 2,
        "does": "Filters the already loaded aggregates by date, team, and category. Users can explore the same payload without starting workflow mutations.",
        "input": {
          "from": [
            "UI"
          ]
        },
        "output": {
          "to": [
            "V"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · F"
      },
      {
        "id": "V",
        "label": "Exports",
        "type": "interface",
        "x": 479.36000000000007,
        "y": 397.5,
        "layer": 4,
        "does": "Offers detailed reporting, activity maps, and export controls. Different questions need different views of the same evidence. Recorded app use does not measure offline productivity or task quality.",
        "input": {
          "from": [
            "F"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · V"
      },
      {
        "id": "W",
        "label": "Worker",
        "type": "process",
        "x": 257.6,
        "y": 235,
        "layer": 1,
        "does": "Reads the database using the TiDB HTTP SQL driver. Credentials stay server-side and the driver fits the Worker runtime.",
        "input": {
          "from": [
            "UI"
          ]
        },
        "output": {
          "to": [
            "SQL"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · W"
      },
      {
        "id": "SNAP",
        "label": "Snapshot",
        "type": "process",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 1,
        "does": "Creates a payload for the same browser interface. The interface can work with an offline report as well as a live refresh.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "UI"
          ]
        },
        "evidence": "case-studies/diagrams/usage-architecture.mmd · SNAP"
      }
    ],
    "edges": [
      {
        "from": "DB",
        "to": "SQL",
        "label": "",
        "kind": "data"
      },
      {
        "from": "SQL",
        "to": "REG",
        "label": "",
        "kind": "data"
      },
      {
        "from": "REG",
        "to": "PAY",
        "label": "",
        "kind": "data"
      },
      {
        "from": "PAY",
        "to": "UI",
        "label": "",
        "kind": "data"
      },
      {
        "from": "UI",
        "to": "W",
        "label": "",
        "kind": "data"
      },
      {
        "from": "W",
        "to": "SQL",
        "label": "",
        "kind": "data"
      },
      {
        "from": "UI",
        "to": "F",
        "label": "",
        "kind": "data"
      },
      {
        "from": "F",
        "to": "V",
        "label": "",
        "kind": "data"
      },
      {
        "from": "SNAP",
        "to": "UI",
        "label": "",
        "kind": "optional"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Request to report",
        "steps": [
          {
            "node": "DB",
            "caption": "Stores request observations and organizational lookup data. Activity needs context about the person and team. This map describes the reporting pipeline without exposing employee data.",
            "payload": {
              "component": "Request logs",
              "to": [
                "SQL"
              ]
            },
            "state": "complete"
          },
          {
            "node": "SQL",
            "caption": "Groups activity by action, person, and day. Sends useful summaries rather than raw request logs to the browser.",
            "payload": {
              "component": "Aggregate",
              "to": [
                "REG"
              ]
            },
            "state": "complete"
          },
          {
            "node": "REG",
            "caption": "Separates deliberate actions from automatic background requests. A polling screen should not look like extra completed work.",
            "payload": {
              "component": "Classify",
              "to": [
                "PAY"
              ]
            },
            "state": "complete"
          },
          {
            "node": "PAY",
            "caption": "Carries compact, categorized aggregates to the UI. Keeps collection and rendering independent.",
            "payload": {
              "component": "Payload",
              "to": [
                "UI"
              ]
            },
            "state": "complete"
          },
          {
            "node": "UI",
            "caption": "Displays live or static reporting data. Managers can explore recognizable operational actions.",
            "payload": {
              "component": "Dashboard",
              "to": [
                "W",
                "F"
              ]
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Filtered export",
        "steps": [
          {
            "node": "UI",
            "caption": "Displays live or static reporting data. Managers can explore recognizable operational actions.",
            "payload": {
              "component": "Dashboard",
              "to": [
                "W",
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Filters the already loaded aggregates by date, team, and category. Users can explore the same payload without starting workflow mutations.",
            "payload": {
              "component": "Filter views",
              "to": [
                "V"
              ]
            },
            "state": "complete"
          },
          {
            "node": "V",
            "caption": "Offers detailed reporting, activity maps, and export controls. Different questions need different views of the same evidence. Recorded app use does not measure offline productivity or task quality.",
            "payload": {
              "component": "Exports",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-employee-updates": {
    "title": "Employee update distribution",
    "eyebrow": "Documented operational data flow",
    "color": "#7f9e8f",
    "width": 926.1200000000001,
    "height": 537.5,
    "layers": [
      "entry",
      "decision",
      "compute",
      "integration",
      "store",
      "interface"
    ],
    "nodes": [
      {
        "id": "A",
        "label": "Update",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Starts publication from an Airtable record. The announcement has a structured source before delivery.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "WAIT"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · A"
      },
      {
        "id": "WAIT",
        "label": "Schedule",
        "type": "decision",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "Waits for the scheduled time and passes publication filters. Creating a draft and publishing it are distinct events.",
        "input": {
          "from": [
            "A"
          ]
        },
        "output": {
          "to": [
            "PUB"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · WAIT"
      },
      {
        "id": "PUB",
        "label": "Publish",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Calls reusable channel and employee notification definitions. Publishing paths share delivery steps through Sub-Zaps. The map summarizes the configured process. End-to-end delivery has not been verified for every path.",
        "input": {
          "from": [
            "WAIT"
          ]
        },
        "output": {
          "to": [
            "DEDUP"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · PUB"
      },
      {
        "id": "DEDUP",
        "label": "Recipients",
        "type": "process",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 2,
        "does": "Python merges department, team, position, and direct lists, strips blanks, and removes repeats. Overlapping memberships should not create duplicate recipients.",
        "input": {
          "from": [
            "PUB"
          ]
        },
        "output": {
          "to": [
            "LOOP"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · DEDUP"
      },
      {
        "id": "LOOP",
        "label": "Deliver",
        "type": "integration",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 3,
        "does": "Loops through employee lookup, delays, and Slack delivery paths. Individual delivery requires person-specific context. One shared notification path has an early return. Its downstream execution needs an end-to-end check.",
        "input": {
          "from": [
            "DEDUP"
          ]
        },
        "output": {
          "to": [
            "LOG"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · LOOP"
      },
      {
        "id": "LOG",
        "label": "Delivery log",
        "type": "store",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 4,
        "does": "Creates and updates associated Airtable records. Follow-up checks need a record distinct from the original announcement.",
        "input": {
          "from": [
            "LOOP"
          ]
        },
        "output": {
          "to": [
            "D1"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · LOG"
      },
      {
        "id": "D1",
        "label": "Deadline 1",
        "type": "decision",
        "x": 257.6,
        "y": 235,
        "layer": 1,
        "does": "Waits until the first deadline and reads acknowledgment state over HTTP. Sending a message does not establish that it was acknowledged.",
        "input": {
          "from": [
            "LOG"
          ]
        },
        "output": {
          "to": [
            "REM"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · D1"
      },
      {
        "id": "REM",
        "label": "Remind",
        "type": "interface",
        "x": 35.84,
        "y": 235,
        "layer": 5,
        "does": "Branches to record updates and Slack reminders. Unacknowledged delivery needs an explicit follow-up outcome.",
        "input": {
          "from": [
            "D1"
          ]
        },
        "output": {
          "to": [
            "D2"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · REM"
      },
      {
        "id": "D2",
        "label": "Deadline 2",
        "type": "decision",
        "x": 35.84,
        "y": 397.5,
        "layer": 1,
        "does": "Waits again and repeats the acknowledgment-state lookup. A later check can distinguish delayed acknowledgment from continued absence.",
        "input": {
          "from": [
            "REM"
          ]
        },
        "output": {
          "to": [
            "FOLLOW"
          ]
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · D2"
      },
      {
        "id": "FOLLOW",
        "label": "Follow up",
        "type": "interface",
        "x": 257.6,
        "y": 397.5,
        "layer": 5,
        "does": "Updates records and posts the appropriate Slack follow-up. Makes the deadline outcome visible without treating delivery as acknowledgment.",
        "input": {
          "from": [
            "D2"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/employee-updates.mmd · FOLLOW"
      }
    ],
    "edges": [
      {
        "from": "A",
        "to": "WAIT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "WAIT",
        "to": "PUB",
        "label": "",
        "kind": "data"
      },
      {
        "from": "PUB",
        "to": "DEDUP",
        "label": "",
        "kind": "data"
      },
      {
        "from": "DEDUP",
        "to": "LOOP",
        "label": "",
        "kind": "data"
      },
      {
        "from": "LOOP",
        "to": "LOG",
        "label": "",
        "kind": "data"
      },
      {
        "from": "LOG",
        "to": "D1",
        "label": "",
        "kind": "data"
      },
      {
        "from": "D1",
        "to": "REM",
        "label": "",
        "kind": "data"
      },
      {
        "from": "REM",
        "to": "D2",
        "label": "",
        "kind": "data"
      },
      {
        "from": "D2",
        "to": "FOLLOW",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Delivery and deadlines",
        "steps": [
          {
            "node": "A",
            "caption": "Starts publication from an Airtable record. The announcement has a structured source before delivery.",
            "payload": {
              "component": "Update",
              "to": [
                "WAIT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "WAIT",
            "caption": "Waits for the scheduled time and passes publication filters. Creating a draft and publishing it are distinct events.",
            "payload": {
              "component": "Schedule",
              "to": [
                "PUB"
              ]
            },
            "state": "complete"
          },
          {
            "node": "PUB",
            "caption": "Calls reusable channel and employee notification definitions. Publishing paths share delivery steps through Sub-Zaps. The map summarizes the configured process. End-to-end delivery has not been verified for every path.",
            "payload": {
              "component": "Publish",
              "to": [
                "DEDUP"
              ]
            },
            "state": "complete"
          },
          {
            "node": "DEDUP",
            "caption": "Python merges department, team, position, and direct lists, strips blanks, and removes repeats. Overlapping memberships should not create duplicate recipients.",
            "payload": {
              "component": "Recipients",
              "to": [
                "LOOP"
              ]
            },
            "state": "complete"
          },
          {
            "node": "LOOP",
            "caption": "Loops through employee lookup, delays, and Slack delivery paths. Individual delivery requires person-specific context. One shared notification path has an early return. Its downstream execution needs an end-to-end check.",
            "payload": {
              "component": "Deliver",
              "to": [
                "LOG"
              ]
            },
            "state": "complete"
          },
          {
            "node": "LOG",
            "caption": "Creates and updates associated Airtable records. Follow-up checks need a record distinct from the original announcement.",
            "payload": {
              "component": "Delivery log",
              "to": [
                "D1"
              ]
            },
            "state": "complete"
          },
          {
            "node": "D1",
            "caption": "Waits until the first deadline and reads acknowledgment state over HTTP. Sending a message does not establish that it was acknowledged.",
            "payload": {
              "component": "Deadline 1",
              "to": [
                "REM"
              ]
            },
            "state": "complete"
          },
          {
            "node": "REM",
            "caption": "Branches to record updates and Slack reminders. Unacknowledged delivery needs an explicit follow-up outcome.",
            "payload": {
              "component": "Remind",
              "to": [
                "D2"
              ]
            },
            "state": "complete"
          },
          {
            "node": "D2",
            "caption": "Waits again and repeats the acknowledgment-state lookup. A later check can distinguish delayed acknowledgment from continued absence.",
            "payload": {
              "component": "Deadline 2",
              "to": [
                "FOLLOW"
              ]
            },
            "state": "complete"
          },
          {
            "node": "FOLLOW",
            "caption": "Updates records and posts the appropriate Slack follow-up. Makes the deadline outcome visible without treating delivery as acknowledgment.",
            "payload": {
              "component": "Follow up",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-billing-requests": {
    "title": "Billing request tracking",
    "eyebrow": "Documented operational data flow",
    "color": "#a88760",
    "width": 926.1200000000001,
    "height": 537.5,
    "layers": [
      "entry",
      "decision",
      "compute",
      "integration",
      "store"
    ],
    "nodes": [
      {
        "id": "S",
        "label": "Request",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Starts intake from the operational conversation. People can submit requests where the team already works.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "F"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · S"
      },
      {
        "id": "F",
        "label": "Filter",
        "type": "decision",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "Selects eligible messages before parsing. Prevents arbitrary channel chatter from becoming a request.",
        "input": {
          "from": [
            "S"
          ]
        },
        "output": {
          "to": [
            "P"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · F"
      },
      {
        "id": "P",
        "label": "Normalize",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Extracts labeled fields, strips Slack markup, and formats dates and timestamps. Structured records need consistent fields despite variations in message formatting. No comprehensive parser-accuracy result is available.",
        "input": {
          "from": [
            "F"
          ]
        },
        "output": {
          "to": [
            "L"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · P"
      },
      {
        "id": "L",
        "label": "Find context",
        "type": "integration",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 3,
        "does": "Finds related Airtable context before creating the request. Intake should retain an association with the existing operational records.",
        "input": {
          "from": [
            "P"
          ]
        },
        "output": {
          "to": [
            "A"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · L"
      },
      {
        "id": "R",
        "label": "Reaction",
        "type": "input",
        "x": 35.84,
        "y": 397.5,
        "layer": 0,
        "does": "Starts a separate event chain when a reaction is added. Completion happens after intake and has its own event context.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "RF"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · R"
      },
      {
        "id": "RF",
        "label": "Filter",
        "type": "decision",
        "x": 257.6,
        "y": 397.5,
        "layer": 1,
        "does": "Checks the reaction event before the record lookup. The completion path should not run for every reaction.",
        "input": {
          "from": [
            "R"
          ]
        },
        "output": {
          "to": [
            "FIND"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · RF"
      },
      {
        "id": "FIND",
        "label": "Find request",
        "type": "integration",
        "x": 479.36000000000007,
        "y": 397.5,
        "layer": 3,
        "does": "Looks up the Airtable record referenced by the conversation. A later event must resolve the existing request, not create a second one.",
        "input": {
          "from": [
            "RF"
          ]
        },
        "output": {
          "to": [
            "UPDATE"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · FIND"
      },
      {
        "id": "UPDATE",
        "label": "Complete",
        "type": "process",
        "x": 701.1200000000001,
        "y": 397.5,
        "layer": 2,
        "does": "Updates the matching record’s completion field. Keeps the request lifecycle available for follow-up. This is record tracking. It does not authorize or execute a financial refund.",
        "input": {
          "from": [
            "FIND"
          ]
        },
        "output": {
          "to": [
            "A"
          ]
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · UPDATE"
      },
      {
        "id": "A",
        "label": "Request log",
        "type": "store",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 4,
        "does": "Stores the request details and source-conversation references. Makes status and follow-up available outside an unstructured chat thread.",
        "input": {
          "from": [
            "L",
            "UPDATE"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/billing-requests.mmd · A"
      }
    ],
    "edges": [
      {
        "from": "S",
        "to": "F",
        "label": "",
        "kind": "data"
      },
      {
        "from": "F",
        "to": "P",
        "label": "",
        "kind": "data"
      },
      {
        "from": "P",
        "to": "L",
        "label": "",
        "kind": "data"
      },
      {
        "from": "L",
        "to": "A",
        "label": "",
        "kind": "data"
      },
      {
        "from": "R",
        "to": "RF",
        "label": "",
        "kind": "data"
      },
      {
        "from": "RF",
        "to": "FIND",
        "label": "",
        "kind": "data"
      },
      {
        "from": "FIND",
        "to": "UPDATE",
        "label": "",
        "kind": "data"
      },
      {
        "from": "UPDATE",
        "to": "A",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Request intake",
        "steps": [
          {
            "node": "S",
            "caption": "Starts intake from the operational conversation. People can submit requests where the team already works.",
            "payload": {
              "component": "Request",
              "to": [
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Selects eligible messages before parsing. Prevents arbitrary channel chatter from becoming a request.",
            "payload": {
              "component": "Filter",
              "to": [
                "P"
              ]
            },
            "state": "complete"
          },
          {
            "node": "P",
            "caption": "Extracts labeled fields, strips Slack markup, and formats dates and timestamps. Structured records need consistent fields despite variations in message formatting. No comprehensive parser-accuracy result is available.",
            "payload": {
              "component": "Normalize",
              "to": [
                "L"
              ]
            },
            "state": "complete"
          },
          {
            "node": "L",
            "caption": "Finds related Airtable context before creating the request. Intake should retain an association with the existing operational records.",
            "payload": {
              "component": "Find context",
              "to": [
                "A"
              ]
            },
            "state": "complete"
          },
          {
            "node": "A",
            "caption": "Stores the request details and source-conversation references. Makes status and follow-up available outside an unstructured chat thread.",
            "payload": {
              "component": "Request log",
              "to": []
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Completion reaction",
        "steps": [
          {
            "node": "R",
            "caption": "Starts a separate event chain when a reaction is added. Completion happens after intake and has its own event context.",
            "payload": {
              "component": "Reaction",
              "to": [
                "RF"
              ]
            },
            "state": "complete"
          },
          {
            "node": "RF",
            "caption": "Checks the reaction event before the record lookup. The completion path should not run for every reaction.",
            "payload": {
              "component": "Filter",
              "to": [
                "FIND"
              ]
            },
            "state": "complete"
          },
          {
            "node": "FIND",
            "caption": "Looks up the Airtable record referenced by the conversation. A later event must resolve the existing request, not create a second one.",
            "payload": {
              "component": "Find request",
              "to": [
                "UPDATE"
              ]
            },
            "state": "complete"
          },
          {
            "node": "UPDATE",
            "caption": "Updates the matching record’s completion field. Keeps the request lifecycle available for follow-up. This is record tracking. It does not authorize or execute a financial refund.",
            "payload": {
              "component": "Complete",
              "to": [
                "A"
              ]
            },
            "state": "complete"
          },
          {
            "node": "A",
            "caption": "Stores the request details and source-conversation references. Makes status and follow-up available outside an unstructured chat thread.",
            "payload": {
              "component": "Request log",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-automation-alerts": {
    "title": "Automation error alerts",
    "eyebrow": "Documented operational data flow",
    "color": "#c7886e",
    "width": 704.3600000000001,
    "height": 375,
    "layers": [
      "entry",
      "compute",
      "decision",
      "interface"
    ],
    "nodes": [
      {
        "id": "G",
        "label": "Error email",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Selects the provider notification emails. A failure notice can be the available entry point when the workflow itself has stopped.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "PARSE"
          ]
        },
        "evidence": "case-studies/diagrams/automation-alerts.mmd · G"
      },
      {
        "id": "PARSE",
        "label": "Extract",
        "type": "process",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "JavaScript decodes entities, strips HTML, extracts errors, and gathers links. Operators need the failure context rather than a raw email template.",
        "input": {
          "from": [
            "G"
          ]
        },
        "output": {
          "to": [
            "FORMAT"
          ]
        },
        "evidence": "case-studies/diagrams/automation-alerts.mmd · PARSE"
      },
      {
        "id": "FORMAT",
        "label": "Format",
        "type": "process",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 1,
        "does": "Formats the timestamp and Slack-safe message content. Provider formatting and destination formatting use different conventions.",
        "input": {
          "from": [
            "PARSE"
          ]
        },
        "output": {
          "to": [
            "B"
          ]
        },
        "evidence": "case-studies/diagrams/automation-alerts.mmd · FORMAT"
      },
      {
        "id": "B",
        "label": "Route",
        "type": "decision",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 2,
        "does": "Evaluates separate paths before Slack notification actions. Different notice contexts can require distinct handling. Private routing values and destinations are omitted.",
        "input": {
          "from": [
            "FORMAT"
          ]
        },
        "output": {
          "to": [
            "SL"
          ]
        },
        "evidence": "case-studies/diagrams/automation-alerts.mmd · B"
      },
      {
        "id": "SL",
        "label": "Notify",
        "type": "interface",
        "x": 257.6,
        "y": 235,
        "layer": 3,
        "does": "Posts the configured notification for the selected path. Moves the issue into the team’s operational channel. This is a historical workflow. It illustrates alert routing rather than an active monitoring service.",
        "input": {
          "from": [
            "B"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/automation-alerts.mmd · SL"
      }
    ],
    "edges": [
      {
        "from": "G",
        "to": "PARSE",
        "label": "",
        "kind": "data"
      },
      {
        "from": "PARSE",
        "to": "FORMAT",
        "label": "",
        "kind": "data"
      },
      {
        "from": "FORMAT",
        "to": "B",
        "label": "",
        "kind": "data"
      },
      {
        "from": "B",
        "to": "SL",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "Historical disabled workflow. This is a source-derived path explorer, not a live repair system.",
    "scenarios": [
      {
        "name": "Historical alert route",
        "steps": [
          {
            "node": "G",
            "caption": "Selects the provider notification emails. A failure notice can be the available entry point when the workflow itself has stopped.",
            "payload": {
              "component": "Error email",
              "to": [
                "PARSE"
              ]
            },
            "state": "complete"
          },
          {
            "node": "PARSE",
            "caption": "JavaScript decodes entities, strips HTML, extracts errors, and gathers links. Operators need the failure context rather than a raw email template.",
            "payload": {
              "component": "Extract",
              "to": [
                "FORMAT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "FORMAT",
            "caption": "Formats the timestamp and Slack-safe message content. Provider formatting and destination formatting use different conventions.",
            "payload": {
              "component": "Format",
              "to": [
                "B"
              ]
            },
            "state": "complete"
          },
          {
            "node": "B",
            "caption": "Evaluates separate paths before Slack notification actions. Different notice contexts can require distinct handling. Private routing values and destinations are omitted.",
            "payload": {
              "component": "Route",
              "to": [
                "SL"
              ]
            },
            "state": "complete"
          },
          {
            "node": "SL",
            "caption": "Posts the configured notification for the selected path. Moves the issue into the team’s operational channel. This is a historical workflow. It illustrates alert routing rather than an active monitoring service.",
            "payload": {
              "component": "Notify",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  },
  "case-escalation-routing": {
    "title": "Support escalation routing",
    "eyebrow": "Documented operational data flow",
    "color": "#8d9ab7",
    "width": 926.1200000000001,
    "height": 537.5,
    "layers": [
      "entry",
      "decision",
      "integration",
      "compute",
      "interface"
    ],
    "nodes": [
      {
        "id": "R",
        "label": "Reaction",
        "type": "input",
        "x": 35.84,
        "y": 72.5,
        "layer": 0,
        "does": "Starts the handler from a support reaction. The conversation carries a compact operator signal.",
        "input": {
          "from": []
        },
        "output": {
          "to": [
            "F"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · R"
      },
      {
        "id": "F",
        "label": "Filter",
        "type": "decision",
        "x": 257.6,
        "y": 72.5,
        "layer": 1,
        "does": "Tests eligibility before extracting thread references. Not every reaction should mutate an operational record.",
        "input": {
          "from": [
            "R"
          ]
        },
        "output": {
          "to": [
            "T"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · F"
      },
      {
        "id": "T",
        "label": "Thread",
        "type": "integration",
        "x": 479.36000000000007,
        "y": 72.5,
        "layer": 2,
        "does": "Retrieves the source conversation and extracts needed references. A reaction alone is not enough to identify the correct record.",
        "input": {
          "from": [
            "F"
          ]
        },
        "output": {
          "to": [
            "D"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · T"
      },
      {
        "id": "D",
        "label": "Normalize",
        "type": "process",
        "x": 701.1200000000001,
        "y": 72.5,
        "layer": 3,
        "does": "Normalizes references and prepares update metadata. Lookups and lifecycle updates need data in the destination’s format.",
        "input": {
          "from": [
            "T"
          ]
        },
        "output": {
          "to": [
            "B"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · D"
      },
      {
        "id": "B",
        "label": "Choose path",
        "type": "decision",
        "x": 701.1200000000001,
        "y": 235,
        "layer": 1,
        "does": "Groups six branch points and 17 filters that select the appropriate support outcome. Different event and record conditions have different outcomes. Repeated routing and record operations are grouped for readability.",
        "input": {
          "from": [
            "D"
          ]
        },
        "output": {
          "to": [
            "L",
            "ALT"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · B"
      },
      {
        "id": "L",
        "label": "Find record",
        "type": "integration",
        "x": 479.36000000000007,
        "y": 235,
        "layer": 2,
        "does": "Finds records by extracted context or record identity. Updates need the existing operational entity.",
        "input": {
          "from": [
            "B"
          ]
        },
        "output": {
          "to": [
            "U"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · L"
      },
      {
        "id": "U",
        "label": "Update status",
        "type": "process",
        "x": 257.6,
        "y": 235,
        "layer": 3,
        "does": "Writes fields for the matching route. The support signal becomes structured state for subsequent work.",
        "input": {
          "from": [
            "L"
          ]
        },
        "output": {
          "to": [
            "S"
          ]
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · U"
      },
      {
        "id": "S",
        "label": "Respond",
        "type": "interface",
        "x": 35.84,
        "y": 235,
        "layer": 4,
        "does": "Communicates the result back in Slack. The people handling the conversation need the operational handoff outcome.",
        "input": {
          "from": [
            "U"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · S"
      },
      {
        "id": "ALT",
        "label": "Alternate reply",
        "type": "interface",
        "x": 701.1200000000001,
        "y": 397.5,
        "layer": 4,
        "does": "Groups routes that respond differently instead of following the same mutation path. Fallback and alternate record conditions must survive workflow migration.",
        "input": {
          "from": [
            "B"
          ]
        },
        "output": {
          "to": []
        },
        "evidence": "case-studies/diagrams/escalation-routing.mmd · ALT"
      }
    ],
    "edges": [
      {
        "from": "R",
        "to": "F",
        "label": "",
        "kind": "data"
      },
      {
        "from": "F",
        "to": "T",
        "label": "",
        "kind": "data"
      },
      {
        "from": "T",
        "to": "D",
        "label": "",
        "kind": "data"
      },
      {
        "from": "D",
        "to": "B",
        "label": "",
        "kind": "data"
      },
      {
        "from": "B",
        "to": "L",
        "label": "",
        "kind": "data"
      },
      {
        "from": "L",
        "to": "U",
        "label": "",
        "kind": "data"
      },
      {
        "from": "U",
        "to": "S",
        "label": "",
        "kind": "data"
      },
      {
        "from": "B",
        "to": "ALT",
        "label": "",
        "kind": "data"
      }
    ],
    "boundary": "This diagram preserves the documented Mermaid paths. It explores handoffs, not live company data.",
    "scenarios": [
      {
        "name": "Record update",
        "steps": [
          {
            "node": "R",
            "caption": "Starts the handler from a support reaction. The conversation carries a compact operator signal.",
            "payload": {
              "component": "Reaction",
              "to": [
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Tests eligibility before extracting thread references. Not every reaction should mutate an operational record.",
            "payload": {
              "component": "Filter",
              "to": [
                "T"
              ]
            },
            "state": "complete"
          },
          {
            "node": "T",
            "caption": "Retrieves the source conversation and extracts needed references. A reaction alone is not enough to identify the correct record.",
            "payload": {
              "component": "Thread",
              "to": [
                "D"
              ]
            },
            "state": "complete"
          },
          {
            "node": "D",
            "caption": "Normalizes references and prepares update metadata. Lookups and lifecycle updates need data in the destination’s format.",
            "payload": {
              "component": "Normalize",
              "to": [
                "B"
              ]
            },
            "state": "complete"
          },
          {
            "node": "B",
            "caption": "Groups six branch points and 17 filters that select the appropriate support outcome. Different event and record conditions have different outcomes. Repeated routing and record operations are grouped for readability.",
            "payload": {
              "component": "Choose path",
              "to": [
                "L",
                "ALT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "L",
            "caption": "Finds records by extracted context or record identity. Updates need the existing operational entity.",
            "payload": {
              "component": "Find record",
              "to": [
                "U"
              ]
            },
            "state": "complete"
          },
          {
            "node": "U",
            "caption": "Writes fields for the matching route. The support signal becomes structured state for subsequent work.",
            "payload": {
              "component": "Update status",
              "to": [
                "S"
              ]
            },
            "state": "complete"
          },
          {
            "node": "S",
            "caption": "Communicates the result back in Slack. The people handling the conversation need the operational handoff outcome.",
            "payload": {
              "component": "Respond",
              "to": []
            },
            "state": "complete"
          }
        ]
      },
      {
        "name": "Alternate response",
        "steps": [
          {
            "node": "R",
            "caption": "Starts the handler from a support reaction. The conversation carries a compact operator signal.",
            "payload": {
              "component": "Reaction",
              "to": [
                "F"
              ]
            },
            "state": "complete"
          },
          {
            "node": "F",
            "caption": "Tests eligibility before extracting thread references. Not every reaction should mutate an operational record.",
            "payload": {
              "component": "Filter",
              "to": [
                "T"
              ]
            },
            "state": "complete"
          },
          {
            "node": "T",
            "caption": "Retrieves the source conversation and extracts needed references. A reaction alone is not enough to identify the correct record.",
            "payload": {
              "component": "Thread",
              "to": [
                "D"
              ]
            },
            "state": "complete"
          },
          {
            "node": "D",
            "caption": "Normalizes references and prepares update metadata. Lookups and lifecycle updates need data in the destination’s format.",
            "payload": {
              "component": "Normalize",
              "to": [
                "B"
              ]
            },
            "state": "complete"
          },
          {
            "node": "B",
            "caption": "Groups six branch points and 17 filters that select the appropriate support outcome. Different event and record conditions have different outcomes. Repeated routing and record operations are grouped for readability.",
            "payload": {
              "component": "Choose path",
              "to": [
                "L",
                "ALT"
              ]
            },
            "state": "complete"
          },
          {
            "node": "ALT",
            "caption": "Groups routes that respond differently instead of following the same mutation path. Fallback and alternate record conditions must survive workflow migration.",
            "payload": {
              "component": "Alternate reply",
              "to": []
            },
            "state": "complete"
          }
        ]
      }
    ]
  }
};
