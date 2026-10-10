# Zulfiqar Ali — portfolio

Live: https://zulfkicar.github.io/

The portfolio separates production work, open-source automation projects, and engines and experiments. Production case studies are grouped into Applied AI, Business Software, Automation & Integrations, and Reliability & Analytics. Baam appears as employer context. Task-cost savings and annual operational savings are kept separate. Workplace source code and records are excluded.

Unzap runs its actual importer and compiler with simulated integrations. Threadbridge runs its production planner and journal using browser SQLite with simulated providers. Workledger and First Mile remain under the earlier operational tools section. The independent repositories contain backend setup instructions and tests.

The existing playground and crash-lab routes remain available. The former launchpad gate is no longer loaded by the homepage.

## Engineering case studies

Eight architecture case studies and a written memory-layer overview live under `case-studies/`. Eleven interactive SVG maps have zoom, pointer pan, touch pinch, fullscreen exploration, keyboard controls, and 95 curated component explanations. Each case study explains the problem, engineering contribution, system design, and implementation limits. Configuration-review counts are retained in the repository documentation rather than the public index. Historical alerting is labeled separately from active-system capabilities, and program-level savings remain separate from individual system outcomes.

Run `node scripts/build-case-studies.mjs` to rebuild the pages and Markdown from `case-studies/content.mjs`. See `case-studies/README.md` for diagram rendering instructions.

## Appearance and system maps

The homepage and case studies share an icon button that cycles through Auto, Light, and Dark. Monitor, sun, and moon icons identify the current mode, with accessible labels describing the next action. Auto is the default and follows live device theme changes. Manual choices persist locally and synchronize between tabs. The theme script runs before styles paint and handles unavailable browser storage.

Nine flowcharts use compact, hand-arranged SVG component cards. Their 91 edges are parsed from the Mermaid sources and verified during generation. Detailed responsibilities and design boundaries remain in the component inspector. The two sequence diagrams retain their execution order and use the same theme palette. No external diagram service is required.

Run `node scripts/test-portfolio.mjs` to check theme behavior and map/source consistency.

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
