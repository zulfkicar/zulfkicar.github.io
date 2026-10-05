export async function loadRatingPanel(section){
  const badge=section.querySelector('#rating-badge'),details=section.querySelector('#rating-details');
  const read=async file=>{const response=await fetch(`./reports/${file}`);if(!response.ok)throw Error('No report');return response.json();};
  const paragraph=text=>{const p=document.createElement('p');p.textContent=text;details.append(p);};
  const link=(file,text)=>{const a=document.createElement('a');a.href=`./reports/${file}`;a.textContent=text;details.append(a,document.createTextNode('  '));};
  const [external,development]=await Promise.allSettled([read('rating.json'),read('benchmark.json')]);
  details.replaceChildren();
  if(external.status==='fulfilled'&&external.value.status==='provisional'){
    const r=external.value,rounded=r.estimate===null?null:Math.round(r.estimate/50)*50;
    badge.textContent='Current build unrated';
    paragraph(rounded===null?'The previous v2 match cannot produce a finite point estimate.':`Previous v2: about ${rounded} on the Stockfish engine-rating scale, provisionally. The current engine adds opening play, endgame tables, caching and opponent memory. Its Elo has not yet been measured.`);
    const anchors=r.anchorElos||[r.anchorElo];
    paragraph(`${r.wins} win${r.wins===1?'':'s'}, ${r.draws} draw${r.draws===1?'':'s'} and ${r.losses} loss${r.losses===1?'':'es'} in ${r.games} games against Stockfish 19 at UCI_Elo ${anchors.join(', ')}. Paired openings with both colors, ${r.botBudgetMs/1000} seconds per bot move, ${r.timeControl} clocks. The bot remains our original engine.`);
    if(r.byAnchor)paragraph(r.byAnchor.map(a=>`At ${a.anchorElo}: ${a.wins}W / ${a.draws}D / ${a.losses}L`).join(' · '));
    const interval=r.eloInterval;
    if(interval){const low=interval.low===null?null:Math.floor(interval.low/50)*50,high=interval.high===null?null:Math.ceil(interval.high/50)*50;const bounds=low===null&&high===null?'This sample gives no finite nominal 95% sampling range.':low===null?`The nominal 95% sampling upper bound is ${high}, with no finite lower bound.`:high===null?`The nominal 95% sampling lower bound is ${low}, with no finite upper bound.`:`The nominal 95% sampling range is very wide: ${low}–${high}.`;paragraph(`${bounds} This assumes independent color pairs and excludes calibration uncertainty${r.studyDesign?' and adaptive selection of reference settings':''}. This is not a FIDE, Chess.com or Lichess rating.`);}
    link(r.report,'Inspect the match ↗');link(r.report.replace(/\.json$/,'.pgn'),'Read the games (.pgn) ↗');link('rating.json','Rating calculation ↗');
  }else{
    badge.textContent='External test in progress';paragraph('The external rating match has not produced a completed estimate yet.');
  }
  if(development.status==='fulfilled'){
    const r=development.value;paragraph(`Development check: ${r.wins}W / ${r.draws}D / ${r.losses}L against frozen v1 at ${r.budgetMs} ms per move. This comparison measures improvement against our previous engine, which is unrated.`);link('benchmark.json','Earlier development results ↗');
  }
}
