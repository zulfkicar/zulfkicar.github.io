# Roadmap

Identity: **I take things apart to understand them from the inside out. Everything's a puzzle.**
Honest to a fault, drawn to things that flow. Built bottom-up — the simplest things
ship first so the board fills with `live` cards fast, then we climb to the flagships.

Status legend: [x] done · [~] building · [ ] planned

---

## Phase 0 — Foundation
- [x] Personal `zulfkicar` git/gh auth (separate from work account)
- [x] `zulfkicar.github.io` site repo + the pinboard landing page
- [x] `playground/paint-with-code` (first live card)
- [x] Push + enable GitHub Pages, verify live (https://zulfkicar.github.io)
- [ ] `zulfkicar/zulfkicar` profile README

## Phase 1 — Wave 1: client-side toys (the live row)
- [x] paint with code (v2: real stable-fluids — v1 didn't truly paint, v2 does)
- [x] boids / flocking
- [x] reaction-diffusion (gray-scott; the waves preset needs a reseed nanny)
- [x] air-draw (webcam, MediaPipe) — playground only, no board card

## Phase 2 — Wave 2: substance + first job-relevant proof
- [x] Python chore-killers (dupes + tidy, zero deps, own repo: zulfkicar/chores)
- [x] algorithm visualiser (A*/dijkstra/bfs → sorting → hull → tsp with 2-opt)
- [x] guess-the-candle (real AAPL dailies 2015–17; one instrument so far)
- [x] regex engine from scratch (thompson nfa, drawn live; no anchors/backrefs)
- [x] compression tool from scratch (Huffman + entropy floor; no LZ stage yet)

## Phase 3 — Rotating launch pad
- [x] Framework: pick one gate per load, reveal page, "refresh for another door",
      skippable always, never for reduced-motion, once per session
- [x] Gates v1: honest-loader, two-truths-and-a-lie, boot-sequence,
      chaos→order, take-it-apart (unscrew) — more welcome
- [ ] Live-test, cull the weak ones

## Phase 3.5 — Site polish (done alongside)
- [x] OG/social meta + generated og image, favicon, custom 404
- [x] Manual light/dark toggle (system pref still the default)
- [x] Someday drawer on the board — planned cards capped at 2–3, rest fold away

## Phase 4 — Wave 3: flagships (own repos, most "hire-this" first)
- [ ] Pitlane — clean Node/TS rewrite of pr-dev + web UI, stack PRs (no work internals/secrets)
- [~] The crash lab — v1 autopsy LIVE on the site (/crash-lab/): tape + cape + vix
      + 10y, per-crash verdicts, honest gaps. v2: missing sirens (curve, margin
      debt, spreads), fresher cape, own repo + launch post
- [ ] LLM from scratch
- [ ] chess engine (+ how-it-thinks + mate puzzle, shared core)
- [ ] Game Boy emulator (WASM)
- [ ] quant: backtesting → pairs finder → monte-carlo
- [ ] automation engines: workflow gallery (self-hosted n8n on Oracle) + build-your-own-Zapier + problem-solver agent
- [ ] F1: race-strategy lab + telemetry overlay (FastF1)

## Phase 5 — Positioning & polish
- [ ] Profile README (the billboard)
- [ ] Pin the best 6
- [ ] GIFs + hard metrics on each; keep statuses current
- [ ] GitHub link on résumé + LinkedIn
- [ ] optional: a benchmark/leaderboard, daily-cron green squares

---

Rules: every repo clean (no NDA code or secrets), honest "what's broken" notes,
one consistent voice, deploy-as-you-go.
