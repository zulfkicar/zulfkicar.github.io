# Data refresh verification · 2026-10-05

- Replaced the stale Yale workbook with the current file linked from shillerdata.com. Completed workbook price and CAPE observations run through August 2026.
- September prices use a mean of all 21 expected NYSE trading-session closes from the public Yahoo tables. Every date/value pair matched the independent local FRED SP500 reference to 0.02 index points. The restricted reference download is not redistributed.
- The resulting monthly price average is 7669.414286. Price, VIX, curve, and stress coverage end September 2026. September CAPE and the workbook long rate remain null.
- Thirteen JavaScript tests and nine Python tests pass. A mocked October provisional row verifies that filtering by as-of cannot accidentally remove a valid September row. Missing or duplicate daily sessions and stale data fail validation.
- The full refresh command successfully discovered the current publisher file, downloaded the live FRED/Cboe sources, used the verified September CSV, and rebuilt a fresh snapshot. Automatic Yahoo chart retrieval was rate-limited, so that fallback path is not claimed as live-verified.

# Release verification · 2026-10-05

- Thirteen Node tests pass across arithmetic, future-window censoring, lagging, missing coverage, source byte fingerprints, independent VIX aggregation, CSV specifications, and era partitioning.
- Changing the browser target to a 15% fall over 6 months with a 3-month observation lag recomputed all four rule results and their denominators.
- Episode, comparison, signal, and source views were inspected at a 375-pixel document width. Each document width matched its scroll width after correcting comparison-table containment. Wide result tables scroll inside their panels. No real touch-device or full accessibility audit was performed.
- The four-episode comparison rendered actual peak-normalized paths, with the incomplete 2022 recovery left unresolved at the snapshot end.
- Browser console contained no errors or warnings during these checks.
- Data analysis remains current-vintage, descriptive, and monthly. Neither forecasting validity nor predictive edge was tested.
