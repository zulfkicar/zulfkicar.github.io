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
├── launchpad.js                   # one small door per visit; always skippable
├── 404.html                       # nothing pinned here
├── assets/                        # og image, favicons
├── playground/                    # small, self-contained, client-side toys
│   ├── paint-with-code/           # v2: actual stable fluids — v1 didn't truly paint
│   ├── boids/                     # three rules, one emergent swarm
│   ├── reaction-diffusion/        # gray-scott; draw and coral grows
│   ├── algorithms/                # a*, quicksort, hulls, tsp untangling itself
│   ├── regex-engine/              # thompson nfa, machine drawn live
│   ├── compression/               # huffman vs shannon's floor
│   ├── guess-the-candle/          # real candles, hidden future
│   └── air-draw/                  # webcam hand tracking, draws in the air
└── ROADMAP.md                     # the build plan, phase by phase
```

Every toy is one self-contained html file, no frameworks, no build step. The bigger
flagships (Pitlane, the crash lab, an LLM from scratch, a chess engine) get their own
repos so they're individually pinnable.

Still broken, honestly: the fluid pools a little at the screen edges, the waves
preset in reaction-diffusion needs a reseed nanny, and nobody has beaten the coin
in guess-the-candle yet — including me.

## Local

It's static — open `index.html`, or serve the folder:

```bash
python -m http.server 8000
```
