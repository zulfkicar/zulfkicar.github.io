# Zulfiqar Ali — portfolio

Live: https://zulfkicar.github.io/

A static portfolio with a charcoal landing page and a project workbench. The landing includes direct shortcuts for Automation & systems, AI & agents, Finance & forecasting, and Algorithms & simulations.

## Explore the work

`/workbench/` lists thirteen projects under the original four collections. Search by project, technology or topic; order projects by name; or open a collection directly with `?topic=automation`, `ai`, `finance` or `algorithms`.

Each project has one continuous page: a concise introduction, its working demo or sanitized case study, then an inspectable two-dimensional component diagram. Component selection and diagram expansion do not replace the embedded project. Recent-project navigation and About are available in the workspace.

The fourteen demo routes have their own visual identity: a communications desk for Threadbridge, a compiler workshop for Unzap, a quiet playing room for Between Moves, a research terminal for Crash Lab, and distinct treatments for the smaller experiments. Per-app presentation lives in `demos/`. Light/dark variants belong to each document-style app; immersive fields and Crash Lab keep their native fixed palettes. Camera access remains opt-in.

Unzap runs its importer/compiler with simulated integrations. Threadbridge uses its real planner and browser SQLite journal with simulated providers. Workforce embeds a sanitized production case study. No company/customer system is exposed. Financial tools retain their dated sources, methodology and coverage limits. Illustrations are labelled and do not represent live or historical market observations.

## Local development

Serve this directory over HTTP. No build step, account or API credential is required to browse the portfolio. Fonts and Three.js are locally hosted with their licenses.

- `index.html`, `landing.css`: landing page and category navigation.
- `workbench/`: catalogue, project state, combined project page, source-backed diagrams and workspace styles.
- `demos/`: independent app styles plus a small embedding controller.
- `system.css`, `experiences.css`, `study.css`, `study.mjs`: retained case-study and shared presentation.
- `architecture-*.mjs`: public implementation graphs and existing explorers.

Run these checks before publishing:

```text
node scripts/check-site.mjs
node scripts/test-workbench.mjs
node scripts/test-portfolio.mjs
npm --prefix crash-lab test
```

The site checker covers all 26 entry points, dependencies, links and architecture references. Workbench checks cover collections, filtering, ordering, project state and the combined demo/diagram pages. Portfolio checks cover theme behavior and source-derived maps. Crash Lab has separate calculation and timing tests.

GitHub Pages publishes the repository root from `main`. Keep previews, private design notes, database records and credentials out of commits. The experimental 3D studio is not part of this source integration.

The older case-study generator and collection renderers remain as historical source; do not run them to rebuild the current landing/workbench. Current HTML, CSS and modules are the maintained implementation. Browser rendering, responsive layouts and interactive demos should be reviewed before publication; passing source checks is not a visual QA result.
