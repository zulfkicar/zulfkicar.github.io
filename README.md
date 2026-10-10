# Zulfiqar Ali — portfolio

Live: https://zulfkicar.github.io/

The landing page introduces the Baam workplace systems and their reported impact, followed by Unzap and Threadbridge's guided browser demonstrations. The workplace section describes the fine-tuned AI memory layer, workforce application with bidirectional Airtable sync, and Slack/internal-ticketing/Airtable synchronization. Task-cost savings and annual operational savings are kept separate. No workplace source code or data is bundled.

Unzap runs its actual importer and compiler with simulated integrations. Threadbridge runs its production planner and journal using browser SQLite with simulated providers. Workledger and First Mile remain under the earlier operational tools section. The independent repositories contain backend setup instructions and tests.

The existing playground and crash-lab routes remain available. The former launchpad gate is no longer loaded by the homepage.

## Engineering case studies

Four architecture case studies and a written memory-layer overview live under `case-studies/`: the central workforce platform, Slack/internal-ticketing/Airtable synchronization, EchoBot monitoring and audit, and workforce usage observability. Seven static SVG diagrams have downloadable Mermaid definitions, with readable-size and fitted overview controls. The memory-layer entry contains confirmed capabilities without a reconstructed workflow. The case studies distinguish the baseline implementation from gated migration work and keep program-level savings separate from system-specific outcomes. They contain abstract architecture descriptions, not workplace code, credentials, employee records, or customer payloads.

Run `node scripts/build-case-studies.mjs` to rebuild the pages and Markdown from `case-studies/content.mjs`. See `case-studies/README.md` for diagram rendering instructions.

## Local preview

Run a static HTTP server in this directory. Browser demos do not require backend credentials. Their changes stay in browser storage. Backend features such as durable scheduling and external handoffs require the corresponding self-hosted repository.

## Updating demos

Copy only the explicit web/ assets from each reviewed application. Do not copy .env, .data, node_modules, server files, or database records. Synthetic Workledger fixtures are generated from a fresh in-memory database by its scripts/export-demo.js.

Screenshots in assets/ show the actual synthetic application screens.

## Playground

All eight original browser experiments remain linked from the homepage. Between Moves adds the original chess engine under playground/chess/. Chore killers and the historical crash lab also retain direct homepage links. Planned work is not presented as a working demo.

## Crash Lab

The standalone browser workspace in crash-lab/ contains 17 historical episode windows, aligned price comparisons, configurable warning-signal experiments, and primary-source snapshots. Its shared price analysis runs from 1871 through September 2026, with current-vintage and monthly-average limitations disclosed. Run npm test in crash-lab/ for its 13 calculation, timing, source, and export checks. Nine Python checks cover the refresh pipeline, completed trading months, and freshness guards. CAPE coverage currently ends one month earlier, in August 2026.

The Pakistan tab adds a read-only PakMarkets derivative with 141 monthly cohort summaries, reported index concentration, and separate macro cutoffs. It does not bundle or publicly release the upstream V1 dataset. See crash-lab/docs/PAKISTAN.md for supported methods and the missing continuous index-level requirement.
