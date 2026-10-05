import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validatePakistan,
  breadth,
  rangeRows,
  summaryCSV,
} from "../pakistan-analysis.js";
const data = JSON.parse(
  readFileSync(new URL("../data/pakistan.json", import.meta.url)),
);
test("Pakistan snapshot identifies the reviewed sample and explicit source cutoffs", () => {
  assert.equal(validatePakistan(data), true);
  assert.equal(data.coverage.equities.raw_last_date, "2026-07-24");
  assert.equal(data.coverage.breadth_last, "2026-06");
  assert.equal(data.upstream.publicly_released, false);
  assert.equal(data.rows.length, 141);
  assert.ok(data.rows.every((r) => r.eligible_codes <= 101));
  assert.ok(!data.rows.at(-1).fx && !data.rows.at(-1).reserves);
});
test("stress and trend shares use the selected month denominator", () => {
  const row = {
    eligible_codes: 80,
    below_trend_count: 20,
    peak_drop_counts: { 10: 32, 20: 16, 30: 8, 40: 0 },
  };
  assert.deepEqual(breadth(row, 20), {
    stress_pct: 20,
    trend_pct: 25,
    count: 16,
    denominator: 80,
  });
  assert.equal(breadth(row, 10).stress_pct, 40);
  assert.throws(() => breadth(row, 25), /Unsupported/);
});
test("invalid counts cannot masquerade as valid market percentages", () => {
  const bad = structuredClone(data);
  bad.rows[0].peak_drop_counts["20"] = bad.rows[0].eligible_codes + 1;
  assert.throws(() => validatePakistan(bad), /denominator/);
});
test("named study windows and latest range retain actual dates", () => {
  const recent = rangeRows(data.rows, "recent");
  assert.equal(recent.length, 36);
  assert.equal(recent.at(-1).date, "2026-06");
  const covid = rangeRows(data.rows, "2017-2020");
  assert.ok(covid.every((r) => r.date >= "2017-01" && r.date <= "2020-12"));
});
test("summary exports disclose the stress threshold and retain missing macro fields as blanks", () => {
  const csv = summaryCSV([data.rows.at(-1)], 30);
  const [header, line] = csv.split("\n");
  assert.match(header, /stress_threshold_pct/);
  assert.ok(line.includes(",30,"));
  assert.ok(!csv.includes("undefined") && !csv.includes("NaN"));
});
