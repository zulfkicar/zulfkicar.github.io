# Zulfiqar Ali — portfolio

Live: https://zulfkicar.github.io/

The landing page focuses on working AI automation and internal-tool projects. Workledger and First Mile each have an interactive, synthetic-data browser demonstration under apps/. Their independent repositories contain the runnable Node.js/SQLite backends, Docker setup, optional provider adapters, and behavioral tests.

The existing playground and crash-lab routes remain available. The former launchpad gate is no longer loaded by the homepage.

## Local preview

Run a static HTTP server in this directory. Browser demos do not require backend credentials. Their changes stay in browser storage. Backend features such as durable scheduling and external handoffs require the corresponding self-hosted repository.

## Updating demos

Copy only the explicit web/ assets from each reviewed application. Do not copy .env, .data, node_modules, server files, or database records. Synthetic Workledger fixtures are generated from a fresh in-memory database by its scripts/export-demo.js.

Screenshots in assets/ show the actual synthetic application screens.

## Playground

All eight original browser experiments remain linked from the homepage. Between Moves adds the original chess engine under playground/chess/. Chore killers and the historical crash lab also retain direct homepage links. Planned work is not presented as a working demo.
