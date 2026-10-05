# Pakistan / PSX evidence view

[Open the view](https://zulfkicar.github.io/crash-lab/#pakistan)

This is a bounded research derivative of Muhammad Zulfiqar Ali's PakMarkets local V1 candidate. The upstream dataset, manuscript, release metadata and source tables were read only. The upstream catalogue reports publicly_released=false. This page does not deposit or release PakMarkets V1.

## Imported evidence

The importer reads exactly three hash-verified tables from an explicitly supplied dataset directory:

- prices.adjusted_history
- strict.psx_index_snapshot_aggregate_feature_v1
- core.sbp_macro_observation_snapshot

Only aggregate monthly summaries, recorded policy events, metadata, formulas and input-table fingerprints are included here. The underlying 563,764-row adjusted-history table, full equity panel, action evidence and full macro table are not redistributed.

Public users can inspect and export the derived summaries and reproduce the displayed percentages. Rebuilding from the source tables requires authorized access to the local PakMarkets candidate, which is not bundled or publicly released.

## Stock-breadth construction

1. Keep retrospective_price_eligible and gross_return_eligible rows with positive distribution-adjusted closes and positive reported turnover.
2. Group by observed code and calendar month. Require at least ten supported quotes and exactly one declared adjustment segment.
3. Require twelve consecutive supported months under the same adjustment segment. An observed code is not assumed to be a permanent issuer identity.
4. Compute the percentage below the trailing ten-month monthly-mean quote average.
5. Compute the percentage at least 10, 20, 30 or 40 percent below the maximum monthly mean within the trailing twelve-month window, including the current month.
6. Report the median six-month adjusted-quote change and the exact eligible-code denominator. No market weights or portfolio returns are inferred.

The source table covers 101 reviewed observed codes. Ninety-four contribute at least one supported rolling window. Monthly breadth covers October 2014 through June 2026, with changing denominators. The source's last equity date is July 24, 2026, so the incomplete July tail is excluded. Supported monthly means are means of eligible source quotes, not a claim that every exchange session is covered.

The reviewed sample is selected by adjustment-evidence coverage. It is not all listed companies, current KSE100 constituents, a random market sample or an untouched forecasting test. Historical action and identity completeness remains limited. These are retrospective descriptive summaries.

## Macro context

- USD/PKR: monthly means of retained daily SBP observations, at least ten per month. Six-month changes require all seven endpoint/intermediate months. Coverage ends May 2026.
- SBP reserves: monthly means of retained weekly stock observations, at least three per month. Unit USD with scale_power10=6 is converted from millions to USD billions. The final June 19 observation does not complete June, so monthly summaries end May 2026.
- Policy rate: latest recorded target-rate change event at or before the selected month-end. This explicit event carry is not a monthly-average rate or proof of historical publication-time availability. Retained event history ends April 28, 2026.

Current-history SBP snapshots do not reconstruct historical release vintages. The app does not assign these data a Pakistani VIX, CAPE, or US-style yield-curve interpretation.

## Reported concentration

Only exact classic KSE100 labels KSE 100 Index and KSE-100 are used. KSE100PR is excluded. A snapshot must have exactly 100 reported constituents, total reported weight between 98 and 102 percent, and an eligible top-five-weight field. Monthly means require ten valid retained snapshots.

Reported concentration runs from January 2018 through July 2026. The raw snapshot archive extends to August 13, 2026; the incomplete August tail is excluded. These are observed worksheet summaries, not certified effective membership intervals or index levels.

## Why there is no fabricated KSE100 crash curve

PakMarkets' imported index tables contain constituent observations and reported weights, not a verified continuous index-level history. The official portal's chart script advertised /timeseries/eod/KSE100, but that endpoint returned 404 on October 5, 2026, including with ordinary AJAX headers.

[PSX methodology](https://www.psx.com.pk/psx/product-and-services/indices) identifies ordinary KSE100 as a total-return benchmark. [Its price-return launch notice](https://www.psx.com.pk/psx/files/?file=255824-1.pdf) describes KSE100PR as a separate price-only variant, launched in 2025 with a backdated estimate from 2009. The two must not be spliced, and neither can be reconstructed by summing stock prices or market capitalizations without divisor maintenance.

A genuine continuous level source is the remaining requirement for market-wide peak/trough episodes and future-index outcome tests. The current view provides real cohort, concentration and macro evidence without pretending that missing series exists.

## Rebuild from a local candidate

```sh
python -m pip install -r scripts/pakistan-requirements.txt
python scripts/build_pakistan.py --dataset /absolute/path/to/pakmarkets/dataset --as-of 2026-10-05
npm test
python -m unittest discover -s test -p 'test_*.py'
```

The exporter makes no network requests and does not import or write inside PakMarkets. Source file hashes must match the supplied catalogue. The output records the candidate and input fingerprints without embedding absolute private paths.

Credit: Muhammad Zulfiqar Ali, PakMarkets (unpublished local V1 research data), with original KHistocks, Pakistan Stock Exchange and State Bank of Pakistan attribution retained through the source catalogue. Formal upstream redistribution terms remain unresolved; this is an attributed non-commercial research summary rather than a full dataset release.
