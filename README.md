# Zulfiqar Ali — portfolio

Live: https://zulfkicar.github.io/

A static portfolio organised around automation and systems, AI and agents, finance and forecasting, and algorithms and simulations. Each project has its own interface and an architecture explorer that follows the implementation's components and data paths.

## Explore the systems

The architecture explorer includes 25 graphs, component inputs and outputs, source references, and illustrative scenarios. Data-flow view offers node selection, pan, zoom and step playback. Spatial view uses the same components and connections on independently movable responsibility layers.

Unzap has separate views for the browser compiler and self-hosted runtime. Threadbridge separates its browser journal from its Cloudflare service. Case-study graphs preserve the documented Mermaid handoffs. Scenario playback explains the implementation using illustrative payloads and does not call real company systems.

## Browser demos

Unzap uses its importer and compiler with simulated integrations. Threadbridge uses its planner and browser SQLite journal with simulated providers. Their independent repositories document the backend services. Workledger and First Mile are earlier local prototypes.

The chess engine, visual experiments and Crash Lab retain their existing routes. The redesign preserves their runtime controls and analysis modules. Camera use remains opt-in. Appearance cycles through Auto, Light and Dark, with Auto following the device preference.

## Local development

Serve this directory with a static HTTP server. No build step or API credentials are required for the portfolio demos. Page-specific treatments live in `design/`, shared navigation in `suite-shell.mjs`, and architecture data in the `architecture-*.mjs` modules. Three.js and fonts are locally hosted with their licenses.

Run these checks before publishing:

```text
node scripts/check-site.mjs
node scripts/test-portfolio.mjs
npm --prefix crash-lab test
```

`check-site.mjs` checks the 25-page release inventory, architecture references, internal project links and static dependencies. The portfolio checks cover theme behaviour and source-derived map integrity. Crash Lab has separate calculation and timing tests.

GitHub Pages publishes the repository root from `main`. Keep preview directories, credentials, database records and private workplace material out of commits. Existing workplace case studies contain only the previously approved, sanitised architecture and aggregate information.

The older `scripts/build-case-studies.mjs` generator predates this page design. It remains for historical source maintenance and will overwrite page presentation if run directly. The current HTML pages and architecture modules are the deployed source.
