export const monthIndex = (date) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
export const monthDistance = (a, b) => monthIndex(b) - monthIndex(a);
export const finite = (value) =>
  typeof value === "number" && Number.isFinite(value);
export const DEFAULTS = {
  horizon: 12,
  decline: 20,
  lag: 1,
  start: "1994-01",
  end: "9999-12",
  common: true,
  cape: 30,
  curve: 0,
  vix: 25,
  stress: 1,
};
export const SIGNALS = [
  {
    key: "cape",
    name: "Elevated valuation",
    short: "CAPE",
    unit: "×",
    source: "shiller",
    direction: "above",
    description:
      "CAPE at or above the selected multiple. Valuation is a slow-moving condition, not a crash clock.",
  },
  {
    key: "curve",
    name: "Yield-curve inversion",
    short: "10y − 3m",
    unit: "pp",
    source: "curve",
    direction: "below",
    description:
      "Treasury spread below the selected level. Recession evidence and equity-decline evidence are different targets.",
  },
  {
    key: "vix",
    name: "Market volatility",
    short: "VIX",
    unit: "",
    source: "vix",
    direction: "above",
    description:
      "Monthly mean VIX at or above the threshold. It can react to stress already under way.",
  },
  {
    key: "stress",
    name: "Financial conditions",
    short: "STLFSI4",
    unit: "index",
    source: "stress",
    direction: "above",
    description:
      "Monthly financial-stress average at or above the threshold. Revised full-sample index, not a historical real-time feed.",
  },
];
export function triggered(key, value, settings = DEFAULTS) {
  if (!finite(value)) return null;
  return key === "curve" ? value < settings[key] : value >= settings[key];
}
export function validateRows(rows) {
  if (!rows.length) throw Error("Empty dataset");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.date) ||
      !finite(row.price) ||
      row.price <= 0
    )
      throw Error("Invalid monthly price");
    if (i && monthDistance(rows[i - 1].date, row.date) !== 1)
      throw Error("Monthly prices must be continuous and ordered");
    for (const { key } of SIGNALS)
      if (row[key] !== null && !finite(row[key]))
        throw Error("Invalid signal value");
  }
  return true;
}
export function drawdowns(rows) {
  let high = 0;
  return rows.map((row) => {
    high = Math.max(high, row.price);
    return { date: row.date, value: 100 * (row.price / high - 1) };
  });
}
export function automaticEpisodes(rows, minimum = 10) {
  let peak = 0,
    current = null;
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].price >= rows[peak].price) {
      if (current && current.depth >= minimum)
        result.push({ ...current, recovery: i });
      current = null;
      peak = i;
    } else {
      if (!current)
        current = {
          peak,
          trough: i,
          depth: 100 * (1 - rows[i].price / rows[peak].price),
        };
      if (rows[i].price < rows[current.trough].price) {
        current.trough = i;
        current.depth = 100 * (1 - rows[i].price / rows[peak].price);
      }
    }
  }
  if (current && current.depth >= minimum)
    result.push({ ...current, recovery: null });
  return result;
}
export function episodeMetrics(rows, peak, trough) {
  const recovery = rows.findIndex(
    (row, i) => i > trough && row.price >= rows[peak].price,
  );
  return {
    peak,
    trough,
    recovery: recovery < 0 ? null : recovery,
    peak_date: rows[peak].date,
    trough_date: rows[trough].date,
    recovery_date: recovery < 0 ? null : rows[recovery].date,
    depth: 100 * (1 - rows[trough].price / rows[peak].price),
    fall_months: trough - peak,
    recovery_months: recovery < 0 ? null : recovery - trough,
    underwater_months: recovery < 0 ? rows.length - 1 - peak : recovery - peak,
  };
}
export function prepareEpisodes(rows, definitions) {
  return definitions.map((def) => {
    const candidates = rows
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.date >= def.peak_start && r.date <= def.peak_end);
    if (!candidates.length) throw Error("Episode has no price coverage");
    const peak = candidates.reduce((a, b) => (b.price > a.price ? b : a)).i;
    const troughs = rows
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.i >= peak && r.date <= def.trough_end);
    const trough = troughs.reduce((a, b) => (b.price < a.price ? b : a)).i;
    return { ...def, ...episodeMetrics(rows, peak, trough) };
  });
}
export function priorSignals(rows, episode, settings = DEFAULTS, months = 12) {
  return SIGNALS.map((signal) => {
    const observations = rows
      .slice(Math.max(0, episode.peak - months), episode.peak)
      .filter((r) => finite(r[signal.key]));
    const alerts = observations.filter((r) =>
      triggered(signal.key, r[signal.key], settings),
    );
    return {
      ...signal,
      observations: observations.length,
      alerts: alerts.length,
      last: observations.at(-1) || null,
      first_alert: alerts[0]?.date || null,
      lead_months: alerts.length
        ? monthDistance(alerts[0].date, episode.peak_date)
        : null,
    };
  });
}
export function futureOutcome(rows, index, horizon, decline) {
  if (index + horizon >= rows.length) return null;
  const future = rows.slice(index + 1, index + horizon + 1);
  if (
    future.length !== horizon ||
    monthDistance(rows[index].date, future.at(-1).date) !== horizon
  )
    return null;
  const worst =
    100 * (Math.min(...future.map((r) => r.price)) / rows[index].price - 1);
  return { event: worst <= -decline + 1e-9, worst };
}
export function evaluateSignals(rows, settings = DEFAULTS) {
  if (
    !Number.isInteger(settings.horizon) ||
    settings.horizon < 1 ||
    settings.horizon > 36 ||
    !Number.isInteger(settings.lag) ||
    settings.lag < 0 ||
    settings.lag > 12 ||
    settings.decline <= 0 ||
    settings.decline >= 100
  )
    throw Error("Invalid evaluation settings");
  const common = SIGNALS.map((s) => s.key),
    results = [];
  for (const signal of SIGNALS) {
    let tp = 0,
      fp = 0,
      fn = 0,
      tn = 0,
      censored = 0,
      unavailable = 0;
    const observations = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.date < settings.start || row.date > settings.end) continue;
      const outcome = futureOutcome(
        rows,
        i,
        settings.horizon,
        settings.decline,
      );
      if (outcome === null) {
        censored++;
        continue;
      }
      const feature = rows[i - settings.lag];
      if (
        !feature ||
        !finite(feature[signal.key]) ||
        (settings.common && !common.every((k) => finite(feature[k])))
      ) {
        unavailable++;
        continue;
      }
      const alert = triggered(signal.key, feature[signal.key], settings),
        target = outcome.event;
      if (alert && target) tp++;
      else if (alert) fp++;
      else if (target) fn++;
      else tn++;
      observations.push({
        date: row.date,
        feature_date: feature.date,
        value: feature[signal.key],
        alert,
        target,
        worst: outcome.worst,
      });
    }
    const total = tp + fp + fn + tn,
      alerts = tp + fp,
      targets = tp + fn,
      rate = (a, b) => (b ? a / b : null);
    const precision = rate(tp, alerts),
      base_rate = rate(targets, total);
    const falsePeriods = [];
    for (const row of observations.filter((r) => r.alert && !r.target)) {
      const last = falsePeriods.at(-1);
      if (last && monthDistance(last.end, row.date) === 1) {
        last.end = row.date;
        last.months++;
      } else falsePeriods.push({ start: row.date, end: row.date, months: 1 });
    }
    results.push({
      ...signal,
      tp,
      fp,
      fn,
      tn,
      total,
      censored,
      unavailable,
      alerts,
      targets,
      precision,
      recall: rate(tp, targets),
      false_positive_rate: rate(fp, fp + tn),
      base_rate,
      alert_rate: rate(alerts, total),
      lift: precision !== null && base_rate ? precision / base_rate : null,
      first: observations[0]?.date || null,
      last: observations.at(-1)?.date || null,
      falsePeriods,
      observations,
    });
  }
  return results;
}
export function alignedPath(rows, episode, before = 12, after = 60) {
  return rows
    .map((row, i) => ({
      month: i - episode.peak,
      date: row.date,
      value: (100 * row.price) / rows[episode.peak].price,
    }))
    .filter((p) => p.month >= -before && p.month <= after);
}
export function formatCSV(
  results,
  settings = DEFAULTS,
  snapshotId = "2026-10-05",
) {
  const columns = [
    "signal",
    "decision_month",
    "feature_month",
    "feature_value",
    "alert",
    "target_decline",
    "worst_future_return_percent",
    "threshold",
    "horizon_months",
    "decline_percent",
    "lag_months",
    "snapshot_date",
  ];
  return [
    columns.join(","),
    ...results.flatMap((result) =>
      result.observations.map((row) =>
        [
          result.key,
          row.date,
          row.feature_date,
          row.value,
          row.alert,
          row.target,
          row.worst.toFixed(6),
          settings[result.key],
          settings.horizon,
          settings.decline,
          settings.lag,
          snapshotId,
        ].join(","),
      ),
    ),
  ].join("\n");
}
