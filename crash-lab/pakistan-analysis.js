import { monthIndex } from "./analysis.js";
export function validatePakistan(data) {
  if (
    data.market !== "Pakistan" ||
    typeof data.upstream.publicly_released !== "boolean"
  )
    throw Error("Unexpected Pakistan snapshot scope");
  if (!data.rows.length) throw Error("No Pakistan monthly summaries");
  let last = "";
  for (const row of data.rows) {
    if (
      row.date <= last ||
      !Number.isInteger(row.eligible_codes) ||
      row.eligible_codes <= 0
    )
      throw Error("Invalid monthly cohort");
    last = row.date;
    for (const count of [
      row.below_trend_count,
      ...Object.values(row.peak_drop_counts),
    ])
      if (!Number.isInteger(count) || count < 0 || count > row.eligible_codes)
        throw Error("Count exceeds supported denominator");
    const cuts = [10, 20, 30, 40].map(
      (cut) => row.peak_drop_counts[String(cut)],
    );
    if (cuts.some((count, i) => i > 0 && count > cuts[i - 1]))
      throw Error("Nonmonotone stress thresholds");
  }
  return true;
}
export function breadth(row, threshold = 20) {
  const count = row.peak_drop_counts[String(threshold)];
  if (count === undefined) throw Error("Unsupported stress threshold");
  return {
    stress_pct: (100 * count) / row.eligible_codes,
    trend_pct: (100 * row.below_trend_count) / row.eligible_codes,
    count,
    denominator: row.eligible_codes,
  };
}
export function rangeRows(rows, range = "all") {
  if (range === "all") return rows;
  const latest = rows.at(-1).date;
  return rows.filter((row) =>
    range === "recent"
      ? monthIndex(row.date) >= monthIndex(latest) - 35
      : range === "2017-2020"
        ? row.date >= "2017-01" && row.date <= "2020-12"
        : row.date >= "2021-01" && row.date <= "2023-12",
  );
}
export function summaryCSV(rows, threshold) {
  const keys = [
    "date",
    "eligible_codes",
    "below_trend_count",
    "stress_count",
    "stress_threshold_pct",
    "stress_share_pct",
    "median_change6_pct",
    "fx",
    "fx_change6_pct",
    "reserves",
    "reserves_change6_pct",
    "last_recorded_policy_rate",
    "policy_event_date",
    "top5_weight_pct",
  ];
  return [
    keys.join(","),
    ...rows.map((row) => {
      const b = breadth(row, threshold);
      const values = {
        ...row,
        stress_count: b.count,
        stress_threshold_pct: threshold,
        stress_share_pct: b.stress_pct.toFixed(6),
      };
      return keys.map((key) => values[key] ?? "").join(",");
    }),
  ].join("\n");
}
