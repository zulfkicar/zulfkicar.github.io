import {
  DEFAULTS,
  SIGNALS,
  monthIndex,
  monthDistance,
  validateRows,
  prepareEpisodes,
  priorSignals,
  drawdowns,
  automaticEpisodes,
  evaluateSignals,
  alignedPath,
  formatCSV,
} from "./analysis.js";
import { lineChart } from "./charts.js?v=20261005-health";
import { createPakistan } from "./pakistan.js";
import { createHealth } from "./health.js";
const root = document.querySelector("#app");
let data,
  pakistanData,
  pakistan,
  health,
  episodes,
  view = "episodes",
  selected = "2008",
  compare = ["2000", "2008", "2020", "2022"],
  settings = { ...DEFAULTS },
  results,
  autoMinimum = 10;
const colors = ["#8dc5ed", "#d8bc84", "#98cbb7", "#b7a9e2"];
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const pct = (value) => (value === null ? "—" : (100 * value).toFixed(1) + "%");
const months = (n) => (n === null ? "Not recovered" : n + " months");
const dateLabel = (value) =>
  value
    ? new Date(value + "-01T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not recovered";
const indexLabel = (value) => {
  const index = Math.round(value);
  return (
    Math.floor(index / 12) + "-" + String((index % 12) + 1).padStart(2, "0")
  );
};
const fmt = (key, value) =>
  value === null
    ? "Unavailable"
    : value.toFixed(key === "stress" || key === "curve" ? 2 : 1) +
      (key === "cape" ? "×" : key === "curve" ? " pp" : "");
function sectionHead(kicker, title, description) {
  return (
    '<div class="page-head"><p class="eyebrow">' +
    kicker +
    "</p><h1>" +
    title +
    "</h1><p>" +
    description +
    "</p></div>"
  );
}
function chart(id, title, subtitle) {
  return (
    '<section class="chart-panel"><div class="panel-head"><div><h2>' +
    title +
    "</h2><p>" +
    subtitle +
    '</p></div></div><div id="' +
    id +
    '" class="chart"></div></section>'
  );
}
function freshnessBanner() {
  const today = new Date(),
    target = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  target.setUTCDate(0);
  const expected = target.toISOString().slice(0, 7),
    current = data.coverage.price.last >= expected;
  return (
    '<div class="freshness-strip"><span class="freshness-status ' +
    (current ? "current" : "stale") +
    '">' +
    (current ? "US price data current" : "US price refresh needed") +
    "</span><span>US prices through <strong>" +
    dateLabel(data.coverage.price.last) +
    "</strong></span><span>CAPE through <strong>" +
    dateLabel(data.coverage.cape.last) +
    "</strong></span>" +
    (!current
      ? "<span>Latest complete month: " + dateLabel(expected) + "</span>"
      : "") +
    "</div>"
  );
}

function render() {
  if (!data || !episodes || !pakistan) return;
  view = location.hash.slice(1) || "health";
  if (!["health", "episodes", "compare", "signals", "data", "pakistan"].includes(view))
    view = "episodes";
  document
    .querySelectorAll(".navigation a")
    .forEach((a) =>
      a.setAttribute("aria-current", a.hash === "#" + view ? "page" : "false"),
    );
  root.innerHTML =
    (view === "pakistan" ? pakistan.coverageBanner() : freshnessBanner()) +
    {
      episodes: episodeView,
      compare: compareView,
      signals: signalView,
      data: dataView,
      pakistan: pakistan.render,
      health: health.render,
    }[view]();
  if (view === "health") {
    health.bind(render);
    health.draw();
  } else if (view === "pakistan") {
    pakistan.bind(render);
    pakistan.draw();
  } else {
    bind();
    draw();
  }
  const catalogue = document.querySelector(".catalogue"),
    active = document.querySelector(".episode-button.active");
  if (catalogue && active)
    catalogue.scrollTop = Math.max(0, active.offsetTop - 60);
}
function episodeView() {
  const episode = episodes.find((item) => item.id === selected),
    evidence = priorSignals(data.rows, episode, settings);
  const auto = automaticEpisodes(data.rows, autoMinimum);
  return (
    sectionHead(
      "THE HISTORICAL RECORD",
      "Study the decline. Question the warning.",
      "Seventeen market episodes, a shared price record, and room for signals that failed.",
    ) +
    '<div class="coverage-strip"><span class="live-dot"></span>Monthly observations · ' +
    data.coverage.price.first +
    " to " +
    data.coverage.price.last +
    '<span>Nominal prices · no dividend reinvestment</span></div><div class="research-grid"><aside class="catalogue"><div class="catalogue-head"><h2>Episode catalogue</h2><span>' +
    episodes.length +
    " WINDOWS</span></div>" +
    episodes
      .map(
        (item) =>
          '<button class="episode-button ' +
          (item.id === selected ? "active" : "") +
          '" data-episode="' +
          item.id +
          '" aria-pressed="' +
          (item.id === selected) +
          '"><span>' +
          e(item.period) +
          "</span><strong>" +
          e(item.name) +
          "</strong><small>−" +
          item.depth.toFixed(1) +
          "% <span>" +
          item.fall_months +
          " mo to trough</span></small></button>",
      )
      .join("") +
    '</aside><div class="episode-workspace"><div class="episode-heading"><div><p class="eyebrow">SELECTED EPISODE / ' +
    e(episode.period) +
    "</p><h2>" +
    e(episode.name) +
    '</h2></div><a class="text-link" href="#compare">Compare episodes ↗</a></div><div class="metrics"><div><span>Peak-to-trough fall</span><strong>−' +
    episode.depth.toFixed(1) +
    "%</strong><small>" +
    dateLabel(episode.peak_date) +
    " → " +
    dateLabel(episode.trough_date) +
    "</small></div><div><span>Peak to trough</span><strong>" +
    episode.fall_months +
    "<small> months</small></strong><small>Monthly extremes in the declared window</small></div><div><span>Recovery from trough</span><strong>" +
    (episode.recovery_months === null
      ? "Not recovered"
      : episode.recovery_months + "<small> months</small>") +
    "</strong><small>" +
    (episode.recovery_date
      ? "Prior local peak regained " + dateLabel(episode.recovery_date)
      : "Within the price snapshot through " + data.coverage.price.last) +
    "</small></div></div>" +
    chart(
      "episode-price",
      "The path into and out of the decline",
      "Selected local peak = 100. Monthly averaging smooths fast daily shocks.",
    ) +
    '<p class="episode-note">' +
    e(episode.note) +
    (episode.source
      ? ' <a href="' +
        e(episode.source) +
        '" target="_blank" rel="noreferrer">Historical context ↗</a>'
      : "") +
    "</p>" +
    '<div class="section-heading"><div><p class="eyebrow">BEFORE THE PEAK</p><h2>What was already flashing?</h2></div><span>Previous 12 months · peak month excluded</span></div><div class="evidence-grid">' +
    evidence
      .map(
        (signal) =>
          '<article class="evidence-card"><div><h3>' +
          signal.short +
          '</h3><span class="signal-badge ' +
          (!signal.observations
            ? "missing"
            : signal.alerts
              ? "warning"
              : "quiet") +
          '">' +
          (!signal.observations
            ? "No coverage"
            : signal.alerts
              ? "Threshold crossed"
              : "No crossing") +
          "</span></div><strong>" +
          (!signal.observations
            ? "—"
            : signal.alerts + " / " + signal.observations) +
          "</strong><p>" +
          (!signal.observations
            ? "This indicator was not available in this window."
            : "Covered pre-peak months above/below the current rule.") +
          "</p><small>" +
          (signal.last
            ? "Last pre-peak value: " + fmt(signal.key, signal.last[signal.key])
            : "Missing history is not counted as a quiet signal.") +
          "</small></article>",
      )
      .join("") +
    '</div><p class="method-note">Current rules: CAPE ≥ ' +
    settings.cape +
    "× · curve &lt; " +
    settings.curve +
    " pp · VIX ≥ " +
    settings.vix +
    " · stress ≥ " +
    settings.stress +
    '. Change them in <a href="#signals">Signal bench</a>. This panel describes pre-peak history. It does not count successful forecasts.</p>' +
    chart(
      "episode-indicator",
      "Signals around this episode",
      "Choose an indicator. Dashed line = its current threshold.",
    ) +
    '<div class="indicator-controls"><label>Indicator<select id="indicator">' +
    SIGNALS.map(
      (s) => '<option value="' + s.key + '">' + s.short + "</option>",
    ).join("") +
    '</select></label><span id="indicator-note"></span></div><details class="window-method"><summary>How this episode was selected</summary><p>Peak = highest monthly price from ' +
    episode.peak_start +
    " through " +
    episode.peak_end +
    ". Trough = lowest monthly price after that peak through " +
    episode.trough_end +
    '. Recovery = first later month at or above the selected peak. Windows are declared historical examples, can overlap, and are separate from the all-month signal evaluation.</p><p>Including older episodes extends price history, not modern indicator coverage. The 1937 local decline lies inside the longer 1929 all-time-high drawdown.</p></details></div></div><section class="automatic panel"><div class="panel-head"><div><p class="eyebrow">A CHECK ON THE CATALOGUE</p><h2>Drawdowns found from the full price record</h2><p>Algorithmic all-time-high episodes. Nested local corrections stay inside the larger underwater period.</p></div><label>Minimum fall<select id="auto-minimum"><option value="10" ' +
    (autoMinimum === 10 ? "selected" : "") +
    '>10%</option><option value="20" ' +
    (autoMinimum === 20 ? "selected" : "") +
    '>20%</option><option value="30" ' +
    (autoMinimum === 30 ? "selected" : "") +
    '>30%</option></select></label></div><div class="table-wrap"><table><thead><tr><th>Peak</th><th>Trough</th><th>Fall</th><th>Prior peak regained</th></tr></thead><tbody>' +
    auto
      .map(
        (item) =>
          "<tr><td>" +
          data.rows[item.peak].date +
          "</td><td>" +
          data.rows[item.trough].date +
          "</td><td>−" +
          item.depth.toFixed(1) +
          "%</td><td>" +
          (item.recovery === null
            ? "Not within snapshot"
            : data.rows[item.recovery].date) +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table></div></section>"
  );
}
function compareView() {
  const chosen = episodes.filter((item) => compare.includes(item.id));
  return (
    sectionHead(
      "SIDE BY SIDE",
      "Same starting point. Different recoveries.",
      "Normalize each selected local peak to 100 and compare the path through the following 60 months.",
    ) +
    '<div class="compare-layout"><aside class="panel compare-picker"><h2>Choose up to four</h2>' +
    episodes
      .map(
        (item) =>
          '<label><input type="checkbox" name="compare" value="' +
          item.id +
          '" ' +
          (compare.includes(item.id) ? "checked" : "") +
          ">" +
          e(item.period) +
          "<span>" +
          e(item.name) +
          "</span></label>",
      )
      .join("") +
    "</aside><div>" +
    chart(
      "comparison",
      "Price paths from the local peak",
      "Month zero is each selected peak. Missing later history stays blank.",
    ) +
    '<div class="legend">' +
    chosen
      .map(
        (item, i) =>
          '<span><i style="background:' +
          colors[i] +
          '"></i>' +
          e(item.period) +
          "</span>",
      )
      .join("") +
    '</div><div class="table-wrap panel"><table><thead><tr><th>Episode</th><th>Fall</th><th>To trough</th><th>To recovery from peak</th></tr></thead><tbody>' +
    chosen
      .map(
        (item) =>
          "<tr><td>" +
          e(item.name) +
          "</td><td>−" +
          item.depth.toFixed(1) +
          "%</td><td>" +
          months(item.fall_months) +
          "</td><td>" +
          (item.recovery === null
            ? "Not within snapshot"
            : months(item.underwater_months)) +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div><p class="method-note">A recovered price is not a recovered total-return or inflation-adjusted portfolio. The 60-month plot can end before the full recovery shown in the table.</p></div></div>'
  );
}
function eraComparison() {
  const periods = [
    {
      name: "Through 2009",
      start: settings.start,
      end: settings.end < "2009-12" ? settings.end : "2009-12",
    },
    {
      name: "2010 onward",
      start: settings.start > "2010-01" ? settings.start : "2010-01",
      end: settings.end,
    },
  ];
  return (
    '<section class="panel era-comparison"><div class="panel-head"><div><h2>Compare results across eras</h2><p>The same current rules, grouped by decision month. This split is descriptive, not a holdout validation.</p></div></div><div class="table-wrap"><table><thead><tr><th>Era</th><th>Rule</th><th>Eligible months</th><th>Base rate</th><th>Precision</th><th>Recall</th><th>False alarms</th></tr></thead><tbody>' +
    periods
      .flatMap((period) =>
        evaluateSignals(data.rows, {
          ...settings,
          start: period.start,
          end: period.end,
        }).map(
          (r) =>
            "<tr><td>" +
            period.name +
            "</td><td>" +
            r.short +
            "</td><td>" +
            r.total +
            "</td><td>" +
            pct(r.base_rate) +
            "</td><td>" +
            pct(r.precision) +
            "</td><td>" +
            pct(r.recall) +
            "</td><td>" +
            r.fp +
            "</td></tr>",
        ),
      )
      .join("") +
    '</tbody></table></div><p class="method-note era-note">Only the decision months define the era. A complete future outcome window can extend across the 2009/2010 boundary. No model is fitted by this comparison.</p></section>'
  );
}

function signalView() {
  results = evaluateSignals(data.rows, settings);
  return (
    sectionHead(
      "THE SIGNAL BENCH",
      "Count the misses, too.",
      "Test simple rules against every eligible month. The target and data timing are explicit, and the full result is downloadable.",
    ) +
    '<section class="bench-settings panel"><div class="panel-head"><div><h2>Define the question</h2><p>Changing thresholds here is an exploratory choice, not an untouched holdout test.</p></div><button class="secondary" id="reset-rules">Reset defaults</button></div><form id="evaluation"><div class="form-grid"><label>Future fall from decision-month price<select name="decline">' +
    [10, 15, 20, 30]
      .map(
        (n) =>
          '<option value="' +
          n +
          '" ' +
          (settings.decline === n ? "selected" : "") +
          ">" +
          n +
          "% or more</option>",
      )
      .join("") +
    '</select></label><label>Look-ahead window<select name="horizon">' +
    [6, 12, 24]
      .map(
        (n) =>
          '<option value="' +
          n +
          '" ' +
          (settings.horizon === n ? "selected" : "") +
          ">" +
          n +
          " months</option>",
      )
      .join("") +
    '</select></label><label>Indicator observation lag<select name="lag">' +
    [0, 1, 3, 6]
      .map(
        (n) =>
          '<option value="' +
          n +
          '" ' +
          (settings.lag === n ? "selected" : "") +
          ">" +
          n +
          " month" +
          (n === 1 ? "" : "s") +
          "</option>",
      )
      .join("") +
    '</select></label><label>Start month<input name="start" type="month" min="1871-01" max="' +
    data.coverage.price.last +
    '" value="' +
    settings.start +
    '" required></label><label>End month<input name="end" type="month" min="1871-01" max="' +
    data.coverage.price.last +
    '" value="' +
    settings.end +
    '" required></label></div><div class="rule-grid">' +
    SIGNALS.map(
      (signal) =>
        "<label>" +
        signal.short +
        " " +
        (signal.key === "curve" ? "&lt;" : "≥") +
        '<input name="' +
        signal.key +
        '" type="number" value="' +
        settings[signal.key] +
        '" step="' +
        (signal.key === "curve" || signal.key === "stress" ? ".1" : "1") +
        '" min="' +
        (signal.key === "curve" ? "-5" : signal.key === "stress" ? "-2" : "5") +
        '" max="' +
        (signal.key === "curve" ? "5" : signal.key === "stress" ? "5" : "80") +
        '" required><small>' +
        e(signal.description) +
        "</small></label>",
    ).join("") +
    '</div><div class="form-actions"><label class="check-label"><input name="common" type="checkbox" ' +
    (settings.common ? "checked" : "") +
    '>Use the same covered months for all four indicators</label><button class="primary" type="submit">Evaluate rules →</button></div></form></section><div class="bench-definition"><span>DECISION MONTH t</span><p>Read the indicator from <strong>t − ' +
    settings.lag +
    "</strong>. Count a target if a monthly-average price in <strong>t+1 through t+" +
    settings.horizon +
    "</strong> is at least <strong>" +
    settings.decline +
    '%</strong> below the price at t. Future months label the outcome only.</p></div><section class="panel"><div class="panel-head"><div><h2>All eligible months</h2><p>' +
    (settings.common
      ? "Common indicator coverage."
      : "Each indicator uses its own coverage; denominators differ.") +
    ' Future windows must be complete.</p></div><button class="secondary" id="export-results">Export monthly CSV ↓</button></div><div class="table-wrap"><table class="results"><thead><tr><th>Rule</th><th>Eligible months</th><th>Target base rate</th><th>Alert months</th><th>Precision</th><th>Recall</th><th>False alarm months</th><th>Missed target months</th></tr></thead><tbody>' +
    results
      .map(
        (r) =>
          "<tr><td><strong>" +
          r.short +
          "</strong><small>" +
          (r.first || "No coverage") +
          " → " +
          (r.last || "No mature window") +
          "</small></td><td>" +
          r.total +
          "</td><td>" +
          pct(r.base_rate) +
          "</td><td>" +
          r.alerts +
          "</td><td>" +
          pct(r.precision) +
          "</td><td>" +
          pct(r.recall) +
          "</td><td>" +
          r.fp +
          "</td><td>" +
          r.fn +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div><div class="definitions"><p><strong>Precision</strong> = target months among alert months. <strong>Recall</strong> = alerted months among target months. These count overlapping monthly labels, not independent crises.</p><p>Base rate is the target frequency within that rule’s eligible sample. No confidence interval, trading returns, or claim of predictive edge is assigned to these descriptive counts.</p></div></section>' +
    eraComparison() +
    '<div class="signal-detail-grid">' +
    results
      .map(
        (r) =>
          '<article class="panel signal-detail"><h2>' +
          r.name +
          "</h2><p>" +
          r.description +
          '</p><div class="confusion"><span><strong>' +
          r.tp +
          "</strong>Alert + target</span><span><strong>" +
          r.fp +
          "</strong>Alert + no target</span><span><strong>" +
          r.fn +
          "</strong>No alert + target</span><span><strong>" +
          r.tn +
          "</strong>No alert + no target</span></div><h3>False-alarm stretches</h3>" +
          (r.falsePeriods.length
            ? "<ul>" +
              r.falsePeriods
                .sort((a, b) => b.months - a.months)
                .slice(0, 3)
                .map(
                  (p) =>
                    "<li>" +
                    p.start +
                    " → " +
                    p.end +
                    " <span>" +
                    p.months +
                    " month" +
                    (p.months === 1 ? "" : "s") +
                    "</span></li>",
                )
                .join("") +
              "</ul>"
            : "<p>No qualifying false-alarm months in this selection.</p>") +
          "<small>" +
          r.censored +
          " incomplete future windows excluded · " +
          r.unavailable +
          " months excluded for lag or missing coverage</small></article>",
      )
      .join("") +
    '</div><section class="research-note"><h2>What this test can tell you</h2><p>It reveals how a stated rule behaves against a stated price target. It does not reconstruct the information an investor actually had. The indicators use current-vintage data, and the stress index itself has full-sample normalization. A one-month lag is a transparent timing convention, not a verified publication-lag model.</p><p>Overlapping outcomes, threshold exploration, and a small number of crises make these counts unsuitable as evidence of a calibrated probability or reliable forecast. The next research step is a frozen specification, historical vintages, and event-aware out-of-sample evaluation.</p></section>'
  );
}
function dataView() {
  return (
    sectionHead(
      "DATA & METHOD",
      "A record you can inspect.",
      "Primary-source files, a deterministic monthly builder, and coverage displayed alongside the results.",
    ) +
    '<div class="data-summary panel"><div><span>PRICE WINDOW</span><strong>' +
    data.coverage.price.first +
    " → " +
    data.coverage.price.last +
    "</strong></div><div><span>MONTHLY RECORDS</span><strong>" +
    data.rows.length.toLocaleString() +
    "</strong></div><div><span>SOURCE RETRIEVAL</span><strong>" +
    data.snapshot_date +
    '</strong></div></div><p class="method-note">The current publisher workbook supplies completed monthly averages through ' +
    e(data.freshness.shiller_complete_month) +
    ". Its provisional " +
    e(data.freshness.shiller_provisional_month) +
    " row is excluded. Complete daily closes extend prices through " +
    e(data.coverage.price.last) +
    ". CAPE ends at " +
    e(data.coverage.cape.last) +
    '; the missing month is not filled.</p><div class="source-grid">' +
    data.sources
      .map(
        (source) =>
          '<article class="panel source-card"><h2>' +
          e(source.name) +
          "</h2><p>" +
          e(source.definition) +
          "</p><p>" +
          e(source.note) +
          '</p><div class="source-links"><a href="' +
          e(source.url) +
          '" target="_blank" rel="noreferrer">Source documentation ↗</a><a href="./data/raw/' +
          e(source.file) +
          '" download>Snapshot file ↓</a></div><details><summary>Snapshot fingerprint</summary><code>' +
          source.sha256 +
          "</code><small>" +
          source.bytes.toLocaleString() +
          " bytes · retrieved " +
          source.retrieved_at +
          "</small></details></article>",
      )
      .join("") +
    '</div><section class="panel coverage-panel"><div class="panel-head"><h2>Aligned analysis coverage</h2><a class="text-link" href="./data/snapshot.json" download>Download aligned JSON ↓</a></div><div class="table-wrap"><table><thead><tr><th>Series</th><th>First month</th><th>Last month</th><th>Observed months</th></tr></thead><tbody>' +
    Object.entries(data.coverage)
      .map(
        ([key, c]) =>
          "<tr><td>" +
          e(key) +
          "</td><td>" +
          c.first +
          "</td><td>" +
          c.last +
          "</td><td>" +
          c.count.toLocaleString() +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div></section><div class="method-grid"><section class="panel"><h2>Measurement choices</h2><ul><li>Nominal monthly-average prices. No dividend reinvestment or inflation adjustment.</li><li>Decline windows are declared in episodes.json. Figures are computed from the source records.</li><li>Recovery means regaining the selected local peak, not the market’s highest earlier peak.</li><li>Automatic drawdowns separately use the running all-time high over the available price record.</li><li>No interpolation or filling of missing indicators.</li><li>Daily VIX and spread observations need at least 10 records per month. Weekly stress needs at least 3.</li></ul></section><section class="panel"><h2>How to reproduce it</h2><p>The primary-source files and SHA-256 hashes are checked in. The builder makes no network requests.</p><pre>python -m pip install -r scripts/requirements.txt&#10;python scripts/build_data.py --as-of 2026-10-05&#10;npm test</pre><p>Download <a href="./data/episodes.json" download>episode definitions</a> or read <a href="./README.md">the full method</a>. The test suite checks arithmetic, calendar continuity, lagging, censoring, missing coverage, and threshold boundaries.</p></section></div>' +
    chart(
      "full-drawdowns",
      "The longer underwater record",
      "Drawdown from the running nominal high. This differs from the local episode windows.",
    ) +
    '<section class="research-note"><h2>Questions still open</h2><p>Which warnings remain useful across different eras? Does a model improve on the target’s base rate? How much of a result survives event-aware splits, purged overlapping horizons, vintage-correct data, and a specification fixed before evaluation?</p><p>This version makes those questions inspectable. The results remain descriptive until those research controls are added.</p></section>'
  );
}
function drawEpisodeIndicator(key) {
  const episode = episodes.find((item) => item.id === selected),
    signal = SIGNALS.find((s) => s.key === key);
  const start = Math.max(0, episode.peak - 24),
    end = Math.min(data.rows.length, episode.trough + 25);
  const points = data.rows
    .slice(start, end)
    .map((r, i) => ({ x: monthIndex(r.date), y: r[key] }));
  lineChart(document.querySelector("#episode-indicator"), {
    series: [{ name: signal.short, color: "#8dc5ed", points }],
    title: signal.short + " around " + episode.name,
    xFormat: indexLabel,
    yFormat: (v) => v.toFixed(key === "stress" || key === "curve" ? 1 : 0),
    reference: settings[key],
    markers: [{ x: monthIndex(episode.peak_date), label: "PEAK" }],
  });
  document.querySelector("#indicator-note").textContent = signal.description;
}
function draw() {
  if (view === "health") {
    health.draw();
    return;
  }
  if (view === "pakistan") {
    pakistan.draw();
    return;
  }
  if (view === "episodes") {
    const episode = episodes.find((item) => item.id === selected),
      start = Math.max(0, episode.peak - 18),
      end = Math.min(
        data.rows.length,
        Math.max(episode.peak + 61, episode.trough + 13),
      );
    lineChart(document.querySelector("#episode-price"), {
      series: [
        {
          name: "Price / peak",
          color: "#8dc5ed",
          points: data.rows.slice(start, end).map((r) => ({
            x: monthIndex(r.date),
            y: (100 * r.price) / data.rows[episode.peak].price,
          })),
        },
      ],
      title: "Price path for " + episode.name,
      xFormat: indexLabel,
      yFormat: (v) => v.toFixed(0),
      reference: 100,
      markers: [
        { x: monthIndex(episode.peak_date), label: "PEAK" },
        { x: monthIndex(episode.trough_date), label: "TROUGH" },
      ],
    });
    drawEpisodeIndicator(document.querySelector("#indicator")?.value || "cape");
  } else if (view === "compare") {
    lineChart(document.querySelector("#comparison"), {
      series: episodes
        .filter((item) => compare.includes(item.id))
        .map((episode, i) => ({
          name: episode.period,
          color: colors[i],
          points: alignedPath(data.rows, episode).map((p) => ({
            x: p.month,
            y: p.value,
          })),
        })),
      title: "Monthly price paths aligned to each selected peak",
      xFormat: (value) => Math.round(value) + " mo",
      yFormat: (value) => value.toFixed(0),
      reference: 100,
      markers: [{ x: 0, label: "PEAK" }],
    });
  } else if (view === "data") {
    lineChart(document.querySelector("#full-drawdowns"), {
      series: [
        {
          name: "Drawdown",
          color: "#d8bc84",
          points: drawdowns(data.rows).map((r) => ({
            x: monthIndex(r.date),
            y: r.value,
          })),
        },
      ],
      title: "Nominal drawdown from running high since 1871",
      xFormat: (value) => String(Math.floor(value / 12)),
      yFormat: (value) => value.toFixed(0) + "%",
      reference: 0,
    });
  }
}
function bind() {
  document.querySelectorAll("[data-episode]").forEach(
    (button) =>
      (button.onclick = () => {
        selected = button.dataset.episode;
        render();
      }),
  );
  document
    .querySelector("#indicator")
    ?.addEventListener("change", (event) =>
      drawEpisodeIndicator(event.target.value),
    );
  document
    .querySelector("#auto-minimum")
    ?.addEventListener("change", (event) => {
      autoMinimum = Number(event.target.value);
      render();
    });
  document.querySelectorAll('input[name="compare"]').forEach(
    (input) =>
      (input.onchange = () => {
        const chosen = [
          ...document.querySelectorAll('input[name="compare"]:checked'),
        ].map((i) => i.value);
        if (chosen.length > 4 || !chosen.length) {
          input.checked = !input.checked;
          notify("Choose between one and four episodes.");
          return;
        }
        compare = chosen;
        render();
      }),
  );
  document.querySelector("#evaluation")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target),
      next = { ...settings };
    for (const key of [
      "decline",
      "horizon",
      "lag",
      "cape",
      "curve",
      "vix",
      "stress",
    ])
      next[key] = Number(form.get(key));
    next.start = form.get("start");
    next.end = form.get("end");
    next.common = form.has("common");
    if (next.start > next.end) {
      notify("The start month must come before the end month.");
      return;
    }
    settings = next;
    render();
    notify("Rules evaluated across eligible months.");
  });
  document.querySelector("#reset-rules")?.addEventListener("click", () => {
    settings = { ...DEFAULTS, end: data.coverage.price.last };
    render();
  });
  document.querySelector("#export-results")?.addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([formatCSV(results, settings, data.snapshot_date)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "crash-lab-monthly-signal-results.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
function notify(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 3000);
}
window.addEventListener("hashchange", () => {
  if (location.hash === "#workspace") {
    document.querySelector("#workspace").focus();
    return;
  }
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
try {
  [data, episodes, pakistanData] = await Promise.all(
    [
      "./data/snapshot.json",
      "./data/episodes.json",
      "./data/pakistan.json",
    ].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw Error("Historical dataset could not load");
      return response.json();
    }),
  );
  pakistan = createPakistan(pakistanData);
  settings.end = data.coverage.price.last;
  validateRows(data.rows);
  episodes = prepareEpisodes(data.rows, episodes);
  health = createHealth(data, episodes, () => settings, (id) => {
    selected = id;
    location.hash = "episodes";
  });
  render();
} catch (error) {
  root.innerHTML =
    '<section class="loading"><h1>Dataset unavailable</h1><p>' +
    e(error.message) +
    '</p><button class="primary" id="retry">Try again</button></section>';
  document.querySelector("#retry").onclick = () => location.reload();
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(draw, 150);
});
