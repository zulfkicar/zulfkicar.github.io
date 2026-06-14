# zulfkicar.github.io

> Everything's a puzzle. I take it apart.

My portfolio site. I open things up — models, markets, engines — to see how they
actually work, then build something better. The board lists everything I've taken
apart, and the status on each is honest: `live`, `building`, or `planned`.

**Live:** https://zulfkicar.github.io

## Structure

```
.
├── index.html                     # the board (landing page)
├── style.css
├── playground/                    # small, self-contained, client-side demos
│   └── paint-with-code/           # generative flow field, zero dependencies
└── ROADMAP.md                     # the build plan, phase by phase
```

Small client-side toys live here under `playground/`. The bigger flagships
(Pitlane, the crash lab, an LLM from scratch, a chess engine) get their own repos
so they're individually pinnable.

## Local

It's static — open `index.html`, or serve the folder:

```bash
python -m http.server 8000
```
