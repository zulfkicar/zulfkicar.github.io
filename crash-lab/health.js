import { SIGNALS, monthIndex } from './analysis.js';
import { healthSnapshot, episodeComparison, comparisonPaths, healthCSV } from './health-analysis.js';
import { lineChart } from './charts.js?v=20261005-health';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => value ? new Date(value + '-01T12:00:00Z').toLocaleDateString('en-US', {month:'short',year:'numeric',timeZone:'UTC'}) : 'No observation';
const number = (value, digits = 1) => value === null ? '—' : value.toFixed(digits);
const signed = value => value === null ? '—' : (value > 0 ? '+' : '') + value.toFixed(1);
const valueLabel = (key, value) => number(value, ['curve','stress'].includes(key) ? 2 : 1) + (value === null ? '' : key === 'cape' ? '×' : key === 'curve' ? ' pp' : '');
const state = value => value === null ? 'No observation' : value ? 'Threshold crossed' : 'Below warning rule';
const badge = alert => '<span class="signal-badge ' + (alert === null ? 'missing' : alert ? 'warning' : 'quiet') + '">' + (alert === false ? 'Rule not crossed' : state(alert)) + '</span>';
const descriptions = {
  cape: 'Crossing this rule marks elevated valuation. It gives no date for a correction.',
  curve: 'A negative 10-year minus 3-month spread crosses the default inversion rule. This is not an equity-specific forecast.',
  vix: 'Expected volatility from S&P 500 options. Monthly means can smooth short spikes.',
  stress: 'A composite of financial conditions. Zero is average stress in the index construction. This rule uses a higher threshold.',
};
const sourceURLs = {cape:'https://shillerdata.com/',curve:'https://fred.stlouisfed.org/series/T10Y3M',vix:'https://www.cboe.com/tradable_products/vix/vix_historical_data',stress:'https://fred.stlouisfed.org/series/STLFSI4'};
const axisDate = value => { const i = Math.round(value); return Math.floor(i / 12) + '-' + String(i % 12 + 1).padStart(2,'0'); };

export function createHealth(data, episodes, getSettings, openEpisode) {
  let maxAge = 1, selected = '2000', anchor = 'before', indicator = 'cape';
  const calculate = () => {
    const settings = getSettings(), current = healthSnapshot(data.rows, settings, maxAge);
    const comparisons = episodes.map(ep => episodeComparison(data.rows, ep, current, settings, anchor));
    return {settings, current, comparisons, comparison: comparisons.find(c => c.episode.id === selected) ?? comparisons[0]};
  };
  const rule = (key, settings) => (key === 'curve' ? '< ' : '≥ ') + valueLabel(key, settings[key]);
  const anchorName = () => anchor === 'before' ? 'Month before local peak' : anchor === 'peak' ? 'Local peak month' : 'Local trough month';
  function render() {
    const {settings, current, comparisons, comparison} = calculate();
    return `<div class="page-head health-head"><p class="eyebrow">US / CURRENT HEALTH</p><h1>What is flashing now?</h1><p>The latest completed monthly record, with the date behind every reading. Compare the pattern with earlier declines.</p></div>
      <section class="health-summary panel" aria-label="Current monthly summary">
        <div class="health-summary-main"><span class="eyebrow">${dateLabel(current.date)} / PRICE MONTH</span><strong>${current.alerts}<span> / ${current.available}</span></strong><p>available readings cross their warning rules</p><small>${current.older ? current.older + ' reading is from an earlier month.' : 'All available readings are from the price month.'} ${4 - current.available ? (4 - current.available) + ' missing reading excluded.' : ''} This count is not a risk score.</small></div>
        <div class="health-price"><span>Drawdown from running monthly high</span><strong>${number(current.drawdown)}%</strong><small>Nominal monthly-average price, since ${data.coverage.price.first}</small><span>Six-month price change</span><strong>${signed(current.change6)}%</strong><small>No dividends or inflation adjustment</small></div>
        <div class="health-basis"><label>Observation basis<select id="health-basis"><option value="1" ${maxAge === 1 ? 'selected' : ''}>Latest available · at most 1 month older</option><option value="0" ${maxAge === 0 ? 'selected' : ''}>Price month only · no older readings</option></select></label><p>${maxAge ? 'Older readings keep their own dates. They are not substituted into the monthly dataset.' : 'An indicator missing in ' + current.date + ' stays unavailable.'}</p><a class="text-link" href="#signals">Adjust warning thresholds ↗</a></div>
      </section>
      <div class="health-cards">${current.readings.map(reading => {
        const source = data.sources.find(s => s.id === reading.source);
        return `<article class="panel health-card"><div class="health-card-head"><h2>${escape(reading.short)}</h2>${badge(reading.alert)}</div><p class="health-card-name">${escape(reading.name)}</p><strong class="health-reading">${valueLabel(reading.key, reading.value)}</strong><div class="health-observation"><span>${dateLabel(reading.date)}</span>${reading.age ? '<span class="health-age">' + reading.age + ' month older</span>' : ''}</div><p class="health-rule">Warning rule: ${escape(rule(reading.key, settings))}</p><small>${reading.change === null ? 'Prior-month change unavailable' : 'Change from prior observed month: ' + (reading.change > 0 ? '+' : '') + number(reading.change, 2) + (reading.key === 'curve' ? ' pp' : reading.key === 'cape' ? '×' : '')}${reading.observations ? ' · ' + reading.observations + ' source observations' : ''}</small><p class="health-meaning">${descriptions[reading.key]}</p><a class="text-link" href="${sourceURLs[reading.key]}" target="_blank" rel="noreferrer">${escape(source?.name.split(' · ')[0] ?? 'Source')} ↗</a></article>`;
      }).join('')}</div>
      <section class="chart-panel"><div class="panel-head"><div><h2>The last twelve months</h2><p>Observed values only. Dashed line is the selected warning threshold.</p></div><label>Indicator<select id="health-indicator">${SIGNALS.map(s => `<option value="${s.key}" ${s.key === indicator ? 'selected' : ''}>${escape(s.short)}</option>`).join('')}</select></label></div><div id="health-trend" class="chart"></div></section>
      <section class="health-comparison panel"><div class="panel-head"><div><p class="eyebrow">HISTORICAL CONTEXT</p><h2>Put this pattern beside an episode.</h2><p>Compare dated readings, then inspect the price path.</p></div><button class="secondary" id="health-export">Export comparisons ↓</button></div><div class="health-compare-controls"><label>Episode<select id="health-episode">${episodes.map(ep => `<option value="${ep.id}" ${ep.id === comparison.episode.id ? 'selected' : ''}>${escape(ep.period + ' · ' + ep.name)}</option>`).join('')}</select></label><label>Historical reference<select id="health-anchor"><option value="before" ${anchor === 'before' ? 'selected' : ''}>Month before local peak</option><option value="peak" ${anchor === 'peak' ? 'selected' : ''}>Local peak month</option><option value="trough" ${anchor === 'trough' ? 'selected' : ''}>Local trough month</option></select></label></div>
        <div class="health-match"><strong>${comparison.agreements} / ${comparison.comparable}</strong><p>comparable warning rules agree.<br><span>${anchorName()}: ${dateLabel(comparison.date)}. Current observation offsets are applied to the historical reference.</span></p><button class="secondary" id="health-open-episode">Study this episode ↗</button></div>
        <div class="table-wrap"><table><caption class="visually-hidden">Current readings compared with ${escape(comparison.episode.name)}</caption><thead><tr><th>Indicator / rule</th><th>Current snapshot</th><th>Historical reference</th><th>Agreement</th></tr></thead><tbody>${comparison.readings.map(r => `<tr><th scope="row">${escape(r.short)}<small class="health-cell-note">${escape(rule(r.key, settings))}</small></th><td>${valueLabel(r.key, r.value)}<small class="health-cell-note">${dateLabel(r.date)}</small>${badge(r.alert)}</td><td>${valueLabel(r.key, r.historicalValue)}<small class="health-cell-note">${dateLabel(r.historicalDate)}</small>${badge(r.historicalAlert)}</td><td>${r.comparable ? r.agrees ? 'Same rule state' : 'Different state' : 'Insufficient coverage'}</td></tr>`).join('')}</tbody></table></div>
        <p class="method-note health-panel-note">Agreement counts crossed and uncrossed rules equally. It does not compare magnitudes or estimate an outcome. These episodes were selected because they declined, so they cannot provide a crash base rate.</p></section>
      <section class="chart-panel"><div class="panel-head"><div><h2>The price paths around the reference</h2><p>Reference month = 100. Current history stops at month zero. The historical line includes its observed next 24 months.</p></div></div><div id="health-paths" class="chart"></div><div class="legend health-legend"><span><i style="background:#8dc5ed"></i>Current: ${dateLabel(current.date)}</span><span><i style="background:#d8bc84"></i>${escape(comparison.episode.period)}: ${dateLabel(comparison.date)}</span></div><p class="method-note health-panel-note">The historical future is shown for context. Nothing after the reference month is used in the rule comparison. No current future is extrapolated.</p></section>
      <section class="panel"><div class="panel-head"><div><h2>Across the episode catalogue</h2><p>Same rules and offsets, ${anchorName().toLowerCase()}. Choose an episode to inspect it above.</p></div></div><div class="table-wrap"><table class="health-catalogue"><thead><tr><th>Episode</th><th>Reference</th>${SIGNALS.map(s => '<th>' + escape(s.short) + '</th>').join('')}<th>Rule agreement</th></tr></thead><tbody>${comparisons.map(c => `<tr ${c.episode.id === comparison.episode.id ? 'class="health-selected"' : ''}><th scope="row"><button class="health-episode-link" data-health-episode="${c.episode.id}" aria-pressed="${c.episode.id === comparison.episode.id}">${escape(c.episode.period)}<span>${escape(c.episode.name)}</span></button></th><td>${c.date ?? 'Unavailable'}</td>${c.readings.map(r => `<td><span class="health-state ${r.historicalAlert === null ? 'missing' : r.historicalAlert ? 'active' : 'inactive'}" title="${escape(dateLabel(r.historicalDate) + ' · ' + valueLabel(r.key, r.historicalValue))}">${r.historicalAlert === null ? '— No data' : r.historicalAlert ? '● Crossed' : '○ Not crossed'}</span></td>`).join('')}<td>${c.agreements} / ${c.comparable}<small class="health-cell-note">comparable rules</small></td></tr>`).join('')}</tbody></table></div></section>
      <section class="research-note"><h2>What “current” means here</h2><p>This is the latest completed month in the frozen source snapshot, retrieved ${data.snapshot_date}. It is not a live market feed or a full assessment of the US economy. Monthly averages smooth daily spikes. Indicators retain current-vintage revisions, and the stress index uses full-sample normalization.</p><p>The health page reads observed months directly. The Signal bench’s ${settings.lag}-month decision lag and future-outcome target apply only to its evaluation. Warning thresholds are shared between the two pages. No calibrated probability or predictive edge is claimed. <a class="text-link" href="#signals">Inspect false alarms and missed declines ↗</a></p></section>`;
  }
  function draw() {
    const {settings, current, comparison} = calculate();
    const signal = SIGNALS.find(s => s.key === indicator);
    lineChart(document.querySelector('#health-trend'), {series:[{name:signal.short,color:'#8dc5ed',points:data.rows.slice(Math.max(0,current.index - 11),current.index + 1).map(r => ({x:monthIndex(r.date),y:r[indicator]}))}],title:signal.short + ' in the last twelve completed months',xFormat:axisDate,yFormat:v => number(v, ['curve','stress'].includes(indicator) ? 2 : 1),reference:settings[indicator]});
    const paths = comparisonPaths(data.rows, current, comparison);
    lineChart(document.querySelector('#health-paths'), {series:[{name:'Current history',color:'#8dc5ed',points:paths.current},{name:comparison.episode.period,color:'#d8bc84',points:paths.historical}],title:'Current and historical prices aligned to their reference month',xFormat:v => Math.round(v) + ' mo',yFormat:v => v.toFixed(0),reference:100,markers:[{x:0,label:'REFERENCE'}]});
  }
  function bind(refresh) {
    const change = (id, setter) => document.querySelector(id).addEventListener('change', event => { setter(event.target.value); refresh(); });
    change('#health-basis', value => maxAge = Number(value));
    change('#health-episode', value => selected = value);
    change('#health-anchor', value => anchor = value);
    change('#health-indicator', value => indicator = value);
    document.querySelectorAll('[data-health-episode]').forEach(button => button.addEventListener('click', () => { selected = button.dataset.healthEpisode; refresh(); document.querySelector('.health-comparison').scrollIntoView({block:'start',behavior:'instant'}); }));
    document.querySelector('#health-open-episode').addEventListener('click', () => openEpisode(calculate().comparison.episode.id));
    document.querySelector('#health-export').addEventListener('click', () => {
      const {settings,current,comparisons} = calculate();
      const url = URL.createObjectURL(new Blob([healthCSV(current,comparisons,settings,data.snapshot_date)], {type:'text/csv;charset=utf-8'}));
      const a = document.createElement('a'); a.href = url; a.download = 'crash-lab-us-health-comparisons.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    });
  }
  return {render,draw,bind};
}
