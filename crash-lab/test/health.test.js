import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, prepareEpisodes } from '../analysis.js';
import { healthSnapshot, episodeComparison, comparisonPaths, healthCSV } from '../health-analysis.js';
const rows = [
  {date:'2000-01',price:100,cape:29,curve:0,vix:25,stress:1},
  {date:'2000-02',price:120,cape:31,curve:-.2,vix:24,stress:.5},
  {date:'2000-03',price:90,cape:null,curve:.1,vix:26,stress:null},
  {date:'2000-04',price:110,cape:99,curve:-1,vix:80,stress:3},
];
test('health observations are bounded, dated, and never look past the snapshot month', () => {
  const current = healthSnapshot(rows, DEFAULTS, 1, '2000-03');
  assert.equal(current.alerts, 2);
  assert.equal(current.available, 4);
  assert.equal(current.older, 2);
  assert.deepEqual(current.readings.map(r => r.value), [31,.1,26,.5]);
  assert.equal(current.readings[0].date, '2000-02');
  assert.equal(current.readings[0].age, 1);
  assert.equal(current.readings[0].change, 2);
  assert.equal(current.drawdown, -25);
  assert.equal(current.change6, null);
  assert.equal(rows[2].cape, null);
});
test('missing data is excluded rather than counted quiet, and old data is not carried indefinitely', () => {
  const current = healthSnapshot(rows, DEFAULTS, 0, '2000-03');
  assert.equal(current.available, 2);
  assert.equal(current.alerts, 1);
  assert.equal(current.readings[0].alert, null);
  const missing = rows.map(r => ({...r,cape:r.date === '2000-01' ? 40 : null}));
  assert.equal(healthSnapshot(missing,DEFAULTS,1,'2000-03').readings[0].value,null);
  assert.throws(() => healthSnapshot(rows,DEFAULTS,2), /basis/);
});
test('historical comparisons apply matched offsets and exclude incomplete pairs', () => {
  const current = healthSnapshot(rows,DEFAULTS,1,'2000-03');
  const episode = {id:'fixture',peak:2,trough:3};
  const compared = episodeComparison(rows,episode,current,DEFAULTS);
  assert.equal(compared.date,'2000-02');
  assert.equal(compared.readings[0].historicalDate,'2000-01');
  assert.equal(compared.readings[0].historicalValue,29);
  assert.equal(compared.comparable,4);
  assert.equal(compared.agreements,0);
  const early = episodeComparison(rows,{...episode,peak:1},current);
  assert.equal(early.comparable,2);
  assert.equal(early.readings[0].historicalValue,null);
  assert.equal(early.readings[0].comparable,false);
  assert.equal(episodeComparison(rows,episode,current,DEFAULTS,'trough').date,'2000-04');
  assert.throws(() => episodeComparison(rows,episode,current,DEFAULTS,'other'), /anchor/);
});
test('aligned current price path stops at zero, only historical context includes later prices', () => {
  const current = healthSnapshot(rows,DEFAULTS,1,'2000-03');
  const comparison = episodeComparison(rows,{id:'fixture',peak:2,trough:3},current);
  const paths = comparisonPaths(rows,current,comparison);
  assert.equal(paths.current.at(-1).x,0);
  assert.equal(paths.current.at(-1).y,100);
  assert.equal(paths.current.length,3);
  assert.equal(paths.historical.find(p => p.x === 0).y,100);
  assert.equal(paths.historical.at(-1).x,2);
  assert.ok(!paths.current.some(p => p.x > 0));
});
test('comparison exports preserve dates, missing states, thresholds, and pair evidence', () => {
  const current = healthSnapshot(rows,DEFAULTS,0,'2000-03');
  const comparison = episodeComparison(rows,{id:'fixture',peak:2,trough:3},current);
  const csv = healthCSV(current,[comparison],DEFAULTS,'2000-05-01');
  assert.match(csv,/current_observation_month/);
  assert.match(csv,/2000-05-01,2000-03,fixture,2000-02,cape,,,,2000-02,31,true,false,30/);
  assert.equal(csv.split('\n').length,5);
});
test('shipped health snapshot distinguishes September coverage from August CAPE', () => {
  const data = JSON.parse(readFileSync(new URL('../data/snapshot.json', import.meta.url)));
  const definitions = JSON.parse(readFileSync(new URL('../data/episodes.json', import.meta.url)));
  const current = healthSnapshot(data.rows);
  assert.equal(current.date, '2026-09');
  assert.equal(current.readings[0].date, '2026-08');
  assert.equal(current.readings[0].value, 41.119844);
  assert.equal(current.readings[0].age, 1);
  assert.equal(current.alerts, 1);
  assert.equal(current.available, 4);
  assert.equal(healthSnapshot(data.rows, DEFAULTS, 0).available,3);
  const comparisons = prepareEpisodes(data.rows,definitions).map(ep => episodeComparison(data.rows,ep,current));
  assert.ok(comparisons.some(c => c.comparable === 4));
  assert.ok(comparisons.some(c => c.comparable < 4));
});
