import { DEFAULTS, SIGNALS, finite, triggered, monthDistance } from './analysis.js';

// A bounded last observation is displayed as dated evidence, never filled into rows.
export function healthSnapshot(rows, settings = DEFAULTS, maxAge = 1, date = rows.at(-1)?.date) {
  if (![0, 1].includes(maxAge)) throw Error('Invalid observation basis');
  const index = rows.findIndex(row => row.date === date);
  if (index < 0) throw Error('Snapshot month not covered');
  const readings = SIGNALS.map(signal => {
    let source = null;
    for (let i = index; i >= 0; i--) {
      const age = monthDistance(rows[i].date, date);
      if (age > maxAge) break;
      if (finite(rows[i][signal.key])) { source = rows[i]; break; }
    }
    const previous = source && rows.find(row => monthDistance(row.date, source.date) === 1);
    const value = source?.[signal.key] ?? null;
    return {
      ...signal, value, date: source?.date ?? null,
      age: source ? monthDistance(source.date, date) : null,
      alert: triggered(signal.key, value, settings),
      change: source && finite(previous?.[signal.key]) ? value - previous[signal.key] : null,
      observations: source?.[signal.key + '_observations'] ?? null,
    };
  });
  const high = Math.max(...rows.slice(0, index + 1).map(row => row.price));
  const earlier = rows.find(row => monthDistance(row.date, date) === 6);
  return {
    date, index, readings, price: rows[index].price,
    drawdown: 100 * (rows[index].price / high - 1),
    change6: earlier ? 100 * (rows[index].price / earlier.price - 1) : null,
    available: readings.filter(r => r.alert !== null).length,
    alerts: readings.filter(r => r.alert === true).length,
    older: readings.filter(r => r.age > 0).length,
  };
}

export function episodeComparison(rows, episode, current, settings = DEFAULTS, anchor = 'before') {
  if (!['before', 'peak', 'trough'].includes(anchor)) throw Error('Invalid comparison anchor');
  const index = anchor === 'trough' ? episode.trough : episode.peak - (anchor === 'before' ? 1 : 0);
  const readings = current.readings.map(reading => {
    // Apply the current observation offset to the historical reference month.
    // No backward search for a different historical offset or later observation.
    const historical = rows[index - (reading.age ?? 0)];
    const value = historical?.[reading.key] ?? null;
    const alert = triggered(reading.key, value, settings);
    return { ...reading, historicalValue: value, historicalDate: historical?.date ?? null,
      historicalAlert: alert, comparable: reading.alert !== null && alert !== null,
      agrees: reading.alert !== null && alert !== null && reading.alert === alert };
  });
  return { episode, index, date: rows[index]?.date ?? null, readings,
    comparable: readings.filter(r => r.comparable).length,
    agreements: readings.filter(r => r.agrees).length };
}

export function comparisonPaths(rows, current, comparison) {
  const path = (index, after) => index < 0 || !rows[index] ? [] : rows
    .slice(Math.max(0, index - 12), Math.min(rows.length, index + after + 1))
    .map(row => ({ x: monthDistance(rows[index].date, row.date), y: 100 * row.price / rows[index].price }));
  return { current: path(current.index, 0), historical: path(comparison.index, 24) };
}

export function healthCSV(current, comparisons, settings, snapshotDate) {
  const columns = ['snapshot_date','current_month','episode_id','reference_month','indicator','current_observation_month','current_value','current_alert','historical_observation_month','historical_value','historical_alert','comparable','threshold'];
  return [columns.join(','), ...comparisons.flatMap(c => c.readings.map(r => [
    snapshotDate, current.date, c.episode.id, c.date, r.key, r.date, r.value, r.alert,
    r.historicalDate, r.historicalValue, r.historicalAlert, r.comparable, settings[r.key],
  ].map(v => v ?? '').join(',')))].join('\n');
}
