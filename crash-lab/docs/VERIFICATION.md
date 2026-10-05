# Pakistan view verification · 2026-10-05

- Read three explicit hash-bound tables from the local 2026-10-05 PakMarkets candidate. No upstream files or source code were modified. Exported only bounded aggregate research records and recorded policy events.
- Export produced 141 monthly breadth records, October 2014 through June 2026. Retained source equity histories cover 101 reviewed codes; 94 contribute a supported twelve-month rolling window. Per-month denominators vary and are shown.
- Browser controls recomputed the selected-month share when changing the trailing-peak threshold from 20% to 10%. Study-window selection and December 2022 inspection changed the displayed cohort and macro context.
- A 375-pixel document width matched its scroll width. Country navigation scrolls within its own bar. Browser console showed no errors or warnings during these checks.
- 18 JavaScript and 17 Python tests pass, including segment and missing-month guards, turnover/eligibility filtering, macro unit conversion, and separation of KSE100PR from classic-index worksheets.
- Continuous KSE100 index levels remain unavailable in the imported tables. Two requests to the official chart endpoint advertised by PSX returned 404. No index curve or index-outcome test is fabricated.

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
