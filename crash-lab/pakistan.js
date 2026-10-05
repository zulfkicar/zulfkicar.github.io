import { monthIndex } from "./analysis.js";
import { lineChart } from "./charts.js";
import {
  breadth,
  rangeRows,
  summaryCSV,
  validatePakistan,
} from "./pakistan-analysis.js";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const number = (value) =>
  value === null || value === undefined
    ? "Unavailable"
    : Number(value).toFixed(1);
const monthLabel = (index) => {
  const n = Math.round(index);
  return Math.floor(n / 12) + "-" + String((n % 12) + 1).padStart(2, "0");
};
export function createPakistan(data) {
  validatePakistan(data);
  let range = "all",
    threshold = 20,
    selected = (
      data.rows.filter((r) => r.fx != null && r.reserves != null).at(-1) ||
      data.rows.at(-1)
    ).date;
  function scoped() {
    return rangeRows(data.rows, range);
  }
  function coverageBanner() {
    return (
      '<div class="freshness-strip"><span class="freshness-status stale">Frozen PakMarkets coverage</span><span>Stock breadth through <strong>' +
      data.coverage.breadth_last +
      "</strong></span><span>FX / reserves through <strong>" +
      data.coverage.macro.fx.monthly_last +
      " / " +
      data.coverage.macro.reserves.monthly_last +
      "</strong></span><span>US data has a separate cutoff</span></div>"
    );
  }
  function render() {
    const rows = scoped();
    if (!rows.some((r) => r.date === selected)) selected = rows.at(-1).date;
    const row = rows.find((r) => r.date === selected),
      b = breadth(row, threshold);
    return (
      '<div class="page-head"><p class="eyebrow">PAKISTAN / PSX</p><h1>See the pressure beneath the market.</h1><p>Reviewed stock histories, reported index concentration, and SBP macro records from PakMarkets. This view measures a supported sample rather than constructing a KSE-100 substitute.</p></div><section class="pakistan-scope"><span>REVIEWED SAMPLE</span><p><strong>' +
      data.coverage.equities.retained_reviewed_codes +
      " reviewed codes</strong> in the source history. <strong>" +
      data.coverage.equities.rolling_codes +
      ' codes</strong> have a supported rolling window. Each month has its own denominator.</p></section><div class="pk-controls panel"><label>Study window<select id="pk-range"><option value="all" ' +
      (range === "all" ? "selected" : "") +
      '>All covered months</option><option value="2017-2020" ' +
      (range === "2017-2020" ? "selected" : "") +
      '>2017–2020</option><option value="2021-2023" ' +
      (range === "2021-2023" ? "selected" : "") +
      '>2021–2023</option><option value="recent" ' +
      (range === "recent" ? "selected" : "") +
      '>Last 36 covered months</option></select></label><label>Below trailing 12-month peak<select id="pk-threshold">' +
      [10, 20, 30, 40]
        .map(
          (c) =>
            '<option value="' +
            c +
            '" ' +
            (threshold === c ? "selected" : "") +
            ">" +
            c +
            "% or more</option>",
        )
        .join("") +
      '</select></label><label>Inspect month<select id="pk-month">' +
      rows
        .map(
          (r) =>
            '<option value="' +
            r.date +
            '" ' +
            (selected === r.date ? "selected" : "") +
            ">" +
            r.date +
            "</option>",
        )
        .join("") +
      '</select></label><button class="secondary" id="pk-export">Export summaries ↓</button></div><div class="pk-metrics"><article><span>Supported codes · ' +
      row.date +
      "</span><strong>" +
      row.eligible_codes +
      "</strong><small>" +
      row.supported_quote_rows.toLocaleString() +
      " supported positive-turnover quote rows this month</small></article><article><span>At least " +
      threshold +
      "% below 12-month peak</span><strong>" +
      b.stress_pct.toFixed(1) +
      "%</strong><small>" +
      b.count +
      " of " +
      b.denominator +
      " eligible codes</small></article><article><span>Below 10-month mean</span><strong>" +
      b.trend_pct.toFixed(1) +
      "%</strong><small>" +
      row.below_trend_count +
      " of " +
      b.denominator +
      " eligible codes</small></article><article><span>Median 6-month quote change</span><strong>" +
      number(row.median_change6_pct) +
      '%</strong><small>Distribution-adjusted quote means. Not portfolio returns.</small></article></div><section class="chart-panel"><div class="panel-head"><div><h2>How widespread is the decline?</h2><p>Share of the eligible sample below the selected trailing-peak threshold and trailing mean.</p></div></div><div id="pk-breadth" class="chart"></div><div class="legend pk-legend"><span><i style="background:#d8bc84"></i>At least ' +
      threshold +
      '% below 12-month peak</span><span><i style="background:#8dc5ed"></i>Below 10-month mean</span></div></section><section class="chart-panel"><div class="panel-head"><div><h2>The denominator behind the percentages</h2><p>Changing supported coverage can change a breadth result. This is the reviewed sample, not all listed companies.</p></div></div><div id="pk-denominator" class="chart"></div></section><div class="pk-context-grid"><section class="panel pk-context"><p class="eyebrow">CURRENCY / ' +
      row.date +
      "</p><h2>Rupees per US dollar</h2><strong>" +
      number(row.fx) +
      "</strong><p>6-month change: " +
      number(row.fx_change6_pct) +
      (row.fx_change6_pct === null || row.fx_change6_pct === undefined
        ? ""
        : "%") +
      ". An increase means more rupees per dollar.</p><small>Monthly mean of retained daily SBP observations, at least ten records. Source stops " +
      data.coverage.macro.fx.reference_last +
      '.</small></section><section class="panel pk-context"><p class="eyebrow">EXTERNAL LIQUIDITY / ' +
      row.date +
      "</p><h2>SBP foreign-exchange reserves</h2><strong>" +
      number(row.reserves) +
      (row.reserves === null || row.reserves === undefined
        ? ""
        : " <small>USD bn</small>") +
      "</strong><p>6-month change: " +
      number(row.reserves_change6_pct) +
      (row.reserves_change6_pct === null ||
      row.reserves_change6_pct === undefined
        ? ""
        : "%") +
      ". Monthly mean of retained weekly stocks.</p><small>Incomplete June is excluded. Last retained weekly stock: " +
      data.coverage.macro.reserves.reference_last +
      '.</small></section><section class="panel pk-context"><p class="eyebrow">POLICY EVENT HISTORY</p><h2>Last recorded target rate</h2><strong>' +
      number(row.last_recorded_policy_rate) +
      (row.last_recorded_policy_rate === null ? "" : "%") +
      "</strong><p>Last event at or before this month: " +
      e(row.policy_event_date || "No event in the retained history") +
      ".</p><small>This is a carried last-recorded event, not a verified monthly-average rate or real-time publication record. Retained event history ends " +
      data.coverage.macro.policy.reference_last +
      '.</small></section><section class="panel pk-context"><p class="eyebrow">REPORTED KSE-100 SHEETS / ' +
      row.date +
      "</p><h2>Top-five reported weight</h2><strong>" +
      number(row.top5_weight_pct) +
      (row.top5_weight_pct === null || row.top5_weight_pct === undefined
        ? ""
        : "%") +
      "</strong><p>" +
      (row.snapshot_count || 0) +
      ' valid retained snapshots for this month.</p><small>Exactly 100 reported rows and weight sum 98–102%. Observed worksheet concentration, not effective membership or an index-level series.</small></section></div><div class="pk-chart-grid"><section class="chart-panel"><div class="panel-head"><div><h2>Currency pressure</h2><p>Six-month change in monthly USD/PKR means. Gaps stay blank.</p></div></div><div id="pk-fx" class="chart"></div></section><section class="chart-panel"><div class="panel-head"><div><h2>Reserve pressure</h2><p>Six-month change in monthly SBP reserve means. Current-history data.</p></div></div><div id="pk-reserves" class="chart"></div></section></div><section class="chart-panel"><div class="panel-head"><div><h2>Reported index concentration</h2><p>Classic KSE-100 sheet labels. Monthly mean top-five weight, at least ten retained valid snapshots.</p></div></div><div id="pk-concentration" class="chart"></div></section><details class="window-method pk-method"><summary>Methods, source coverage, and reproducibility</summary><p>' +
      e(data.methods.price_basis) +
      ". " +
      e(data.methods.monthly_basis) +
      "</p><p>" +
      e(data.methods.scope) +
      " " +
      e(data.methods.availability) +
      '</p><div class="table-wrap"><table><thead><tr><th>Surface</th><th>Last raw observation</th><th>Last retained month</th></tr></thead><tbody><tr><td>Adjusted equity quotes</td><td>' +
      data.coverage.equities.raw_last_date +
      "</td><td>" +
      data.coverage.breadth_last +
      "</td></tr><tr><td>USD/PKR</td><td>" +
      data.coverage.macro.fx.reference_last +
      "</td><td>" +
      data.coverage.macro.fx.monthly_last +
      "</td></tr><tr><td>SBP reserves</td><td>" +
      data.coverage.macro.reserves.reference_last +
      "</td><td>" +
      data.coverage.macro.reserves.monthly_last +
      "</td></tr><tr><td>Constituent concentration</td><td>" +
      data.coverage.concentration.reference_last +
      "</td><td>" +
      data.coverage.concentration.monthly_last +
      '</td></tr></tbody></table></div><p>Credit: Muhammad Zulfiqar Ali, PakMarkets, unpublished local V1 candidate. Table fingerprints and formulas are in <a href="./data/pakistan.json" download>the aggregate snapshot</a>. <a href="./docs/PAKISTAN.md">Read the Pakistan method</a>.</p><p>The upstream PakMarkets V1 is unpublished. This page shares derived research summaries rather than its raw stock panel or full dataset.</p></details><section class="research-note"><h2>What is still missing for index crash tests?</h2><p>The imported PakMarkets index history contains constituent sheets, not continuous KSE-100 levels. The exchange’s advertised history endpoint returned 404 during this check. No index is approximated by summing prices or capitalizations.</p><p>PSX documents KSE-100 as a total-return benchmark and KSE100PR as a separate price-return variant. A verified level history is needed before adding comparable market-wide crash episodes and future-index outcome tests. <a href="https://www.psx.com.pk/psx/product-and-services/indices" target="_blank" rel="noreferrer">PSX methodology ↗</a></p></section>'
    );
  }
  function draw() {
    const rows = scoped(),
      points = (field) =>
        rows.map((r) => ({ x: monthIndex(r.date), y: r[field] ?? null }));
    lineChart(document.querySelector("#pk-breadth"), {
      series: [
        {
          name: "Below peak",
          color: "#d8bc84",
          points: rows.map((r) => ({
            x: monthIndex(r.date),
            y: breadth(r, threshold).stress_pct,
          })),
        },
        {
          name: "Below trend",
          color: "#8dc5ed",
          points: rows.map((r) => ({
            x: monthIndex(r.date),
            y: breadth(r, threshold).trend_pct,
          })),
        },
      ],
      title: "Stress shares within the supported Pakistan stock cohort",
      xFormat: monthLabel,
      yFormat: (v) => v.toFixed(0) + "%",
      reference: 0,
      markers: [{ x: monthIndex(selected), label: "SELECTED" }],
    });
    lineChart(document.querySelector("#pk-denominator"), {
      series: [
        {
          name: "Eligible codes",
          color: "#98cbb7",
          points: points("eligible_codes"),
        },
      ],
      title: "Monthly supported observed-code count",
      xFormat: monthLabel,
      yFormat: (v) => v.toFixed(0),
    });
    for (const [id, field, title, color] of [
      ["pk-fx", "fx_change6_pct", "USD/PKR six-month change", "#8dc5ed"],
      [
        "pk-reserves",
        "reserves_change6_pct",
        "SBP reserves six-month change",
        "#98cbb7",
      ],
    ])
      lineChart(document.querySelector("#" + id), {
        series: [{ name: title, color, points: points(field) }],
        title,
        xFormat: monthLabel,
        yFormat: (v) => v.toFixed(0) + "%",
        reference: 0,
      });
    const first = rows[0].date,
      last = rows.at(-1).date;
    const context = data.concentration_rows.filter(
      (r) => r.date >= first && (range === "all" || r.date <= last),
    );
    lineChart(document.querySelector("#pk-concentration"), {
      series: [
        {
          name: "Top-five weight",
          color: "#b7a9e2",
          points: context.map((r) => ({
            x: monthIndex(r.date),
            y: r.top5_weight_pct,
          })),
        },
      ],
      title: "Reported top-five KSE100 worksheet weights",
      xFormat: monthLabel,
      yFormat: (v) => v.toFixed(0) + "%",
    });
    document
      .querySelectorAll("#app .chart-readout")
      .forEach(
        (node) =>
          (node.textContent =
            "Inspect a month with the pointer or slider. Aggregate records are available via Export summaries and the Pakistan method below."),
      );
  }
  function bind(refresh) {
    document.querySelector("#pk-range").onchange = (event) => {
      range = event.target.value;
      refresh();
    };
    document.querySelector("#pk-threshold").onchange = (event) => {
      threshold = Number(event.target.value);
      refresh();
    };
    document.querySelector("#pk-month").onchange = (event) => {
      selected = event.target.value;
      refresh();
    };
    document.querySelector("#pk-export").onclick = () => {
      const url = URL.createObjectURL(
        new Blob([summaryCSV(scoped(), threshold)], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "pakmarkets-monthly-stress-summary.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }
  return { render, draw, bind, coverageBanner };
}
