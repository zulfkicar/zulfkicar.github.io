# Support handoff - n8n workflow

An interactive, sanitized view of one n8n workflow built from the original Zapier support estate:

- Slack Trigger subscribed to bot `message` events, with signing-secret verification
- Slack support message to Modal ticket delivery
- Slack receipt and Airtable reporting record
- Modal reply back into the original Slack thread
- EchoBot independent ticket/receipt/reporting checks
- EchoBot AI remediation: recreate a missing ticket, re-add a missing emoji receipt, or rebuild a missing report; escalate only what it cannot repair
- The ported Zapier AI quality branch: negative routing, urgent keyword SOS and SMS, and the verbatim quality prompt

## View it

Open `index.html` through GitHub Pages:

`https://zulfkicar.github.io/apps/n8n-support-handoff/`

This is an unlisted, direct-link-only page. It is not linked from the portfolio. The page is the n8n canvas itself, full viewport: no surrounding case-study chrome, sidebar or index. Pan, zoom, and click nodes directly on the canvas. `workflow.json` is the importable export and sits alongside the page.

The canvas uses `@n8n_io/n8n-demo-component`, the same web component n8n uses on its Academy pages. It loads `workflow.json` and sends it to the preview-mode renderer at `https://n8n-preview-service.internal.n8n.cloud/workflows/demo`. The page carries `noindex,nofollow` so it stays out of search results.

## Import into n8n

1. Download `workflow.json`.
2. In n8n: **Workflows -> Import from File**.
3. Create the credentials:
   - Slack API credential with the bot token and the app's signing secret (`chat:write`, `reactions:write`, `channels:history`, `groups:history`)
   - Airtable personal access token
   - OpenAI API key (`gpt-4o-mini`)
   - Twilio account SID/auth token
   - Header auth for the operations API (`ops.example.com`)
4. Replace the `$env.*` placeholders and the `ops.example.com` / `hooks.example.com` adapter hosts.
5. In the Slack app, set **Event Subscriptions** to the production URL shown on the `Slack event` trigger and subscribe to `message` events. The trigger answers Slack's URL verification challenge and rejects requests without a valid `X-Slack-Signature`.

This is a public reference export. It contains no credentials, private data, localhost URLs or demo hosts.

## Slack Trigger

`Slack event` is an n8n **Slack Trigger**, not a raw Webhook node. It is configured for `message` events across the workspace and uses the Slack API credential's signing secret to verify every request. The node handles Slack's `url_verification` handshake before the workflow runs, so the Slack app's Event Subscriptions URL can be pointed straight at the trigger.

For production, restrict the trigger to the support channel (or the specific workspace channels) rather than watching the whole workspace, and keep the signing secret in the credential rather than in exported JSON.

## EchoBot AI remediation

The scheduled EchoBot branch reads the ticket, Slack receipt and reporting evidence independently. If evidence is missing, it builds a constrained prompt and an AI agent chooses exactly one repair:

- `recreate_ticket` when the Modal ticket is absent
- `readd_receipt` when the `:modal-48:` Slack emoji is missing
- `rebuild_record` when the Airtable reporting record is absent
- `escalate` for Slack Connect, unsafe evidence, or a repair that failed

The workflow then applies the selected direct API call and re-reads the evidence. A fixed check becomes healthy; partial progress is retried without alerting; a failed or unavailable repair raises a detailed EchoBot alert. The production export uses OpenAI `gpt-4o-mini`; the local walkthrough uses Qwen3 4B.

The agent has conversation memory keyed by the source event and native tools for the Slack receipt, Airtable record and Modal ticket paths. The quality agent also keeps thread-scoped memory. The public export adds native tools and keeps the deterministic route as a fallback; the local demo keeps only the deterministic route because the local Qwen model does not call tools reliably.

The evidence endpoint (`ops.example.com/checks/evidence`) should return `event_id`, `channel`, `thread_ts`, `source_ts`, `text`, `ticket_id`, `ticket_exists`, `receipt_exists`, `record_exists`, and `is_slack_connect`. The optional `ops.example.com/checks/agent` endpoint records the agent's decision for audit.

## Native nodes and tools

The public export uses native n8n nodes where the provider exposes one:

- Slack Trigger for bot `message` events
- Slack reaction and message nodes for the receipt, Modal reply and quality alerts
- Airtable record/search nodes for the reporting record, quality records and agency lookup
- Native Slack and Airtable tools on the EchoBot agent

The Modal ticket handoff and the operations state/QA service stay as direct HTTP calls because n8n has no native Modal or operations node. Twilio SMS stays a direct API call because the walkthrough sends to multiple leaders in one request; use a Split Out/Loop plus the native Twilio node if you need one delivery per recipient.

The local walkthrough uses simulator HTTP adapters because it has no live Slack, Airtable or Twilio credentials. The public export is the production-shaped version. In the demo n8n instance, `AmpiCombined01` stays active against the simulators, while the native export is imported as the inactive `AmpiSupportHandoff` reference workflow.

## Adapter boundary

| Call | Production reference |
|---|---|
| Slack reactions and messages | `https://slack.com/api/*` |
| Airtable agencies, Slack tickets, quality alerts | `https://api.airtable.com/v0/{{ $env.AIRTABLE_BASE_ID }}/...` |
| Twilio SMS | `https://api.twilio.com/2010-04-01/Accounts/{{ $env.TWILIO_ACCOUNT_SID }}/Messages.json` |
| Modal ticket handoff | `https://hooks.example.com/modal/ticket` |
| Operations state and QA | `https://ops.example.com/*` |

The direct Modal API credentials were unavailable in the original estate. The workflow therefore uses the Modal Automations handoff URL as the adapter; swap it for the direct Modal API when credentials exist.

## Publishing on GitHub Pages

This folder is already inside the `zulfkicar.github.io` repository. Commit and push it; GitHub Pages serves it at the path above. If you move it to another repo, enable Pages for the branch/folder that contains `index.html`.

## Rebuilding

The sanitized export is generated from the working walkthrough by:

```
python build_portfolio_export.py
```

in `E:\Applications\Job Search\ampifire_technical_operations\walkthrough\runtime`.
