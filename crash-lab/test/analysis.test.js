import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  monthDistance,
  validateRows,
  drawdowns,
  automaticEpisodes,
  episodeMetrics,
  prepareEpisodes,
  priorSignals,
  futureOutcome,
  evaluateSignals,
  alignedPath,
  DEFAULTS,
  formatCSV,
} from "../analysis.js";
const row = (date, price, signal = 0) => ({
  date,
  price,
  cape: signal,
  curve: signal,
  vix: signal,
  stress: signal,
});
const settings = {
  ...DEFAULTS,
  start: "2000-01",
  end: "2000-12",
  horizon: 1,
  lag: 1,
  cape: 10,
  vix: 10,
  stress: 10,
  curve: 0,
};

test("drawdowns use a running high and recovery includes a return to the exact peak", () => {
  const rows = [
    row("2000-01", 100),
    row("2000-02", 120),
    row("2000-03", 90),
    row("2000-04", 119),
    row("2000-05", 120),
  ];
  assert.equal(drawdowns(rows)[2].value, -25);
  assert.equal(drawdowns(rows)[4].value, 0);
  assert.deepEqual(automaticEpisodes(rows, 20), [
    { peak: 1, trough: 2, depth: 25, recovery: 4 },
  ]);
  const e = episodeMetrics(rows, 1, 2);
  assert.equal(e.recovery_date, "2000-05");
  assert.equal(e.underwater_months, 3);
});
test("unrecovered drawdowns remain censored, not reported as recovered", () => {
  const rows = [row("2000-01", 100), row("2000-02", 80), row("2000-03", 85)];
  assert.equal(automaticEpisodes(rows, 10)[0].recovery, null);
  assert.equal(episodeMetrics(rows, 0, 1).recovery_months, null);
});
test("target uses the decision price and future observations, with a stable exact-threshold boundary", () => {
  const rows = [row("2000-01", 100), row("2000-02", 80), row("2000-03", 120)];
  assert.equal(futureOutcome(rows, 0, 1, 20).event, true);
  assert.equal(futureOutcome(rows, 1, 1, 20).event, false);
  assert.equal(futureOutcome(rows, 2, 1, 20), null);
});
test("future horizon cannot silently cross a missing calendar month", () => {
  const rows = [row("2000-01", 100), row("2000-03", 70)];
  assert.equal(futureOutcome(rows, 0, 1, 20), null);
  assert.throws(() => validateRows(rows), /continuous/);
});
test("features respect the configured lag and confusion counts match known outcomes", () => {
  const rows = [
    row("2000-01", 100, 20),
    row("2000-02", 100, 0),
    row("2000-03", 70, 20),
    row("2000-04", 100, 0),
    row("2000-05", 70, 0),
  ];
  const r = evaluateSignals(rows, settings)[0];
  assert.deepEqual([r.tp, r.fp, r.fn, r.tn], [2, 0, 0, 1]);
  assert.equal(r.total, 3);
  assert.equal(r.censored, 1);
  assert.equal(r.observations[0].feature_date, "2000-01");
  assert.equal(r.precision, 1);
  const copy = structuredClone(rows);
  copy[4].cape = 999;
  assert.deepEqual(
    evaluateSignals(copy, settings)[0].observations,
    r.observations,
  );
});
test("common coverage excludes missing indicators, while individual coverage retains valid observations", () => {
  const rows = [
    row("2000-01", 100, 20),
    row("2000-02", 100, 0),
    row("2000-03", 70, 0),
  ];
  rows[0].stress = null;
  assert.equal(evaluateSignals(rows, settings)[0].total, 0);
  assert.equal(
    evaluateSignals(rows, { ...settings, common: false })[0].total,
    1,
  );
});
test("no alerts produces undefined precision rather than a perfect success rate", () => {
  const rows = [
    row("2000-01", 100, 0),
    row("2000-02", 100, 0),
    row("2000-03", 70, 0),
  ];
  const r = evaluateSignals(rows, settings)[0];
  assert.equal(r.precision, null);
  assert.equal(r.recall, 0);
  assert.equal(r.fn, 1);
});
test("pre-peak evidence excludes peak month and distinguishes missing coverage from no warning", () => {
  const rows = [
    row("2000-01", 90, 0),
    row("2000-02", 100, 20),
    row("2000-03", 70, 0),
  ];
  rows[0].stress = null;
  const e = { peak: 1, peak_date: "2000-02" };
  const result = priorSignals(rows, e, settings);
  assert.equal(result[0].alerts, 0);
  assert.equal(result[0].observations, 1);
  assert.equal(result[3].observations, 0);
});
test("comparison normalizes each peak to 100 with calendar alignment", () => {
  const rows = [row("2000-01", 80), row("2000-02", 100), row("2000-03", 70)];
  assert.deepEqual(
    alignedPath(rows, { peak: 1 }, 1, 1).map((p) => [p.month, p.value]),
    [
      [-1, 80],
      [0, 100],
      [1, 70],
    ],
  );
  assert.equal(monthDistance("1999-12", "2000-02"), 2);
});
test("snapshot is continuous, finite, source-hashed and excludes the provisional final price month", () => {
  const data = JSON.parse(
    readFileSync(new URL("../data/snapshot.json", import.meta.url)),
  );
  assert.equal(validateRows(data.rows), true);
  assert.equal(data.rows.at(-1).date, "2023-08");
  assert.equal(data.provisional_price_month_excluded, "2023-09");
  for (const source of data.sources)
    assert.match(source.sha256, /^[0-9a-f]{64}$/);
  const definitions = JSON.parse(
    readFileSync(new URL("../data/episodes.json", import.meta.url)),
  );
  assert.equal(prepareEpisodes(data.rows, definitions).length, 17);
  assert.ok(
    prepareEpisodes(data.rows, definitions).every(
      (e) => e.depth >= 0 && e.trough >= e.peak,
    ),
  );
  const results = evaluateSignals(data.rows, DEFAULTS);
  assert.equal(new Set(results.map((r) => r.total)).size, 1);
  assert.ok(results.every((r) => r.tp + r.fp + r.fn + r.tn === r.total));
});

test("source fingerprints match downloaded bytes and the VIX monthly mean independently recomputes", () => {
  const data = JSON.parse(
    readFileSync(new URL("../data/snapshot.json", import.meta.url)),
  );
  for (const source of data.sources) {
    const bytes = readFileSync(
      new URL("../data/raw/" + source.file, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.sha256,
    );
  }
  const daily = readFileSync(
    new URL("../data/raw/vix.csv", import.meta.url),
    "utf8",
  )
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(","))
    .filter((r) => r[0].startsWith("10/") && r[0].endsWith("/2007"));
  const mean = daily.reduce((sum, r) => sum + Number(r[4]), 0) / daily.length;
  const row = data.rows.find((r) => r.date === "2007-10");
  assert.equal(row.vix_observations, daily.length);
  assert.ok(Math.abs(row.vix - mean) < 1e-6);
});
test("CSV carries each experiment specification rather than only the outcome rows", () => {
  const rows = [
    row("2000-01", 100, 20),
    row("2000-02", 100, 0),
    row("2000-03", 70, 0),
  ];
  const csv = formatCSV(
    evaluateSignals(rows, settings),
    settings,
    "2026-10-05",
  );
  assert.match(
    csv.split("\n")[0],
    /threshold,horizon_months,decline_percent,lag_months,snapshot_date/,
  );
  assert.match(csv.split("\n")[1], /,10,1,20,1,2026-10-05$/);
});

test("era grouping partitions decision months without dropping or duplicating eligible outcomes", () => {
  const data = JSON.parse(
    readFileSync(new URL("../data/snapshot.json", import.meta.url)),
  );
  const all = evaluateSignals(data.rows, DEFAULTS);
  const early = evaluateSignals(data.rows, { ...DEFAULTS, end: "2009-12" });
  const late = evaluateSignals(data.rows, { ...DEFAULTS, start: "2010-01" });
  for (let i = 0; i < all.length; i++)
    for (const key of ["total", "tp", "fp", "fn", "tn"])
      assert.equal(early[i][key] + late[i][key], all[i][key]);
});
