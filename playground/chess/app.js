import {createExplorer} from './explorer.js';
import {createProfilePanel,decisionSummary} from './profile-panel.js';
import {START,parse,legal,apply,color,square,inCheck,outcome,notation,positionKey} from './engine.js';
import {buildProfile} from './opponent.js';
import {uci} from './book.js';
const $=id=>document.getElementById(id),names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
// Original vector silhouettes, shared geometry for both sides.
const shapes={p:'M25 21a7 7 0 1 1 14 0c0 4-2 6-4 7l4 15H25l4-15c-2-1-4-3-4-7Z',r:'M19 14h7v7h5v-7h5v7h5v-7h6v15l-6 4-2 11H25l-2-11-4-4Z',b:'M32 10c3 6 12 12 10 20-1 4-5 6-7 7l5 8H24l5-8c-7-3-11-9-5-17Zm0 7-4 12',n:'M22 44c1-8 3-12 10-17l-8 2-7-6 9-10 1-6 6 5c12 0 17 14 14 23l-4 9Zm4-24h2',q:'M18 20l7 8 7-14 7 14 7-8-6 24H24Zm-2-4a3 3 0 1 0 .1 0M32 8a3 3 0 1 0 .1 0M48 16a3 3 0 1 0 .1 0',k:'M29 8h6v6h6v5h-6v6h-6v-6h-6v-5h6Zm-7 19c-10 0-5 13 3 17h14c8-4 13-17 3-17-4 0-7 3-10 6-3-3-6-6-10-6Z'};
function piece(p){const white=color(p)==='w';return `<svg class="piece" viewBox="0 0 64 64" aria-hidden="true"><g fill="${white?'#fffaf0':'#303832'}" stroke="${white?'#4a584a':'#141d17'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="${shapes[p.toLowerCase()]}"/><path d="M24 44h16l3 5H21Zm-4 6h24l3 6H17Z"/></g>${p.toLowerCase()==='n'?`<circle cx="33" cy="20" r="1.6" fill="${white?'#303832':'#d9e4ce'}"/>`:''}</svg>`;}
const studies={queen:'7k/8/8/8/8/8/4K3/3Q4 w - - 0 1',rook:'7k/8/8/8/8/8/4K3/3R4 w - - 0 1'};
let state=parse(),human='w',flipped=false,selected=null,history=[],positions=[state],worker=null,job=0,busy=false,analysisMode=false,analysis=null,analysisState=null,analysisHistory=[],preview=null,previewKeys=[],candidateIndex=0,pendingPromotion=null,startFen=START,gameId=crypto.randomUUID(),remembered=[],profile=buildProfile();
window.history.scrollRestoration='manual';
let workspaceView='play',previewLabel='Search position',reviewPly=null,previewMove=null;
const explorer=createExplorer((s,ancestors=[],label='Search position',move=null)=>{
  preview=s;previewLabel=label;reviewPly=null;previewMove=move;
  previewKeys=[...analysisHistory,...ancestors.map(positionKey)];
  selected=null;renderBoard();status();
});
const opponentPanel=createProfilePanel((pattern,demo)=>{
  preview=pattern.state;previewKeys=pattern.history.slice();previewMove=pattern.previous?.move||null;
  previewLabel=(demo?'Sample position':'Recorded position')+(pattern.previous?' · after '+pattern.previous.label:' · first move');
  reviewPly=null;selected=null;renderBoard();status();
  if(matchMedia('(max-width:760px)').matches)document.querySelector('.board-layout').scrollIntoView({block:'center',behavior:'instant'});
},()=>returnToGame());
function returnToGame(){preview=null;reviewPly=null;previewMove=null;selected=null;explorer.setActive(false);opponentPanel.clearSelection();renderBoard();historyView();status();}
function setView(){
  workspaceView=location.hash==='#search-lab'?'search':'play';
  document.body.dataset.view=workspaceView;
  for(const name of ['play','search']) {
    const link=$('view-'+name);
    if(name===workspaceView)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  $('workspace-title').textContent=workspaceView==='search'?'Inside the search.':'Your next move.';
  $('workspace-description').textContent=workspaceView==='search'?'Follow real branches. See each position on the board.':'Play, then inspect how the engine responds.';
  if(workspaceView==='play')returnToGame();
  explorer.setActive(workspaceView==='search');
  window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',setView);
window.addEventListener('popstate',setView);
window.addEventListener('load',()=>window.scrollTo({top:0,behavior:'instant'}),{once:true});
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href="#play"],a[href="#search-lab"]');
  if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();if(location.hash!==link.hash)window.history.pushState(null,'',link.hash);setView();
});
$('return-game').onclick=()=>{
  returnToGame();
  // Keep the inspector open, but do not preview again until the next selection.
};
const keys=()=>positions.map(positionKey),displayState=()=>preview||state;
function save(recordFinished=false){try{localStorage.setItem('between-moves-game',JSON.stringify({id:gameId,startFen,human,flipped,moves:history.map(h=>h.move)}));}catch{}syncMemory(recordFinished);}
try{const stored=JSON.parse(localStorage.getItem('between-moves-game'));if(stored&&Array.isArray(stored.moves)&&stored.moves.length<1000){human=stored.human==='b'?'b':'w';flipped=!!stored.flipped;gameId=typeof stored.id==='string'?stored.id:gameId;startFen=Object.values(studies).includes(stored.startFen)?stored.startFen:START;state=parse(startFen);positions=[state];for(const raw of stored.moves){const move=legal(state).find(m=>m.from===raw.from&&m.to===raw.to&&m.promotion===raw.promotion);if(!move)break;history.push({move,san:notation(state,move)});state=apply(state,move);positions.push(state);}}const storedGames=JSON.parse(localStorage.getItem('between-moves-memory'));if(Array.isArray(storedGames))remembered=storedGames.filter(g=>g&&typeof g.id==='string'&&Array.isArray(g.moves)).slice(-30);}catch{}
function memoryView(){profile=buildProfile(remembered,{details:true});opponentPanel.update(profile,{learning:$('use-learning').checked});$('memory-count').textContent=`${profile.games} completed game${profile.games===1?'':'s'}`;const repeated=Object.values(profile.replies).filter(r=>Object.values(r).reduce((a,b)=>a+b,0)>=3).length;$('memory-info').textContent=profile.games?`${repeated} positions have at least three recorded replies. ${profile.captureChoices} turns offered a capture, and you chose one ${profile.captures} times. Most repeated opening moves: ${profile.openings.slice(0,2).map(o=>`${o.moves} (${o.count} games)`).join(' · ')}.`:'No completed games remembered yet. Play a standard game to start. In-progress games and endgame studies are excluded.';$('clear-memory').disabled=!remembered.length;$('memory-games').replaceChildren();for(const game of profile.completed.slice(-5)){if(typeof game.id!=='string')continue;const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');label.textContent=`Played as ${game.human==='w'?'White':'Black'} · ${game.plies} plies`;button.textContent='Forget game';button.onclick=()=>{remembered=remembered.filter(g=>g.id!==game.id);try{localStorage.setItem('between-moves-memory',JSON.stringify(remembered));}catch{}memoryView();};row.append(label,button);$('memory-games').append(row);}}
function syncMemory(recordFinished=false){const before=remembered,ended=outcome(state,keys()).over;if((!ended||recordFinished)&&remembered.some(g=>g?.id===gameId))remembered=remembered.filter(g=>g?.id!==gameId);if(recordFinished&&$('use-learning').checked&&startFen===START&&ended&&history.length)remembered=[...remembered,{id:gameId,startFen,human,moves:history.map(h=>uci(h.move)),finished:true}];if(remembered.length>30)remembered=remembered.slice(-30);if(before!==remembered){try{localStorage.setItem('between-moves-memory',JSON.stringify(remembered));}catch{}memoryView();}}
try{const settings=JSON.parse(localStorage.getItem('between-moves-settings'));if(settings){if([350,1200,3000,10000].includes(settings.budget))$('budget').value=settings.budget;if(Number.isInteger(settings.depth)&&settings.depth>=1&&settings.depth<=12)$('max-depth').value=settings.depth;$('use-book').checked=settings.book!==false;$('use-learning').checked=settings.learning!==false;}}catch{}
for(const id of ['budget','max-depth','use-book','use-learning'])$(id).onchange=()=>{try{localStorage.setItem('between-moves-settings',JSON.stringify({budget:Number($('budget').value),depth:Number($('max-depth').value),book:$('use-book').checked,learning:$('use-learning').checked}));}catch{}if(id==='use-learning')opponentPanel.setEnabled($(id).checked);};
function visibleIndex(i){return flipped?63-i:i;}
function renderBoard(){const focused=document.activeElement?.dataset?.square;const s=displayState(),options=selected===null?[]:legal(s).filter(m=>m.from===selected),last=preview?previewMove:history.at(-1)?.move;const tabstop=selected??(focused!==undefined?Number(focused):(flipped?7:56));const checked=inCheck(s)?s.board.indexOf(s.turn==='w'?'K':'k'):-1;let html='';
 for(let j=0;j<64;j++){const i=visibleIndex(j),p=s.board[i],target=options.some(m=>m.to===i);html+=`<button class="square ${(Math.floor(i/8)+i%8)%2?'dark':''} ${p?'occupied':''} ${target?'legal':''} ${selected===i?'selected':''} ${last&&(last.from===i||last.to===i)?'last':''} ${checked===i?'check':''}" data-square="${i}" aria-label="${square(i)}${p?', '+(color(p)==='w'?'white ':'black ')+names[p.toLowerCase()]:', empty'}${target?', legal destination':''}" aria-pressed="${selected===i}" tabindex="${i===tabstop?0:-1}">${p?piece(p):''}${j>=56?`<span class="coord">${square(i)[0]}</span>`:''}${j%8===0?`<span class="coord rank">${square(i)[1]}</span>`:''}</button>`;}
 $('board').innerHTML=html;if(focused!==undefined){const target=$('board').querySelector(`[data-square="${selected??Number(focused)}"]`);target.tabIndex=0;target.focus({preventScroll:true});}drawArrow();}
function drawArrow(){const arrow=$('candidate-arrow'),move=preview===analysisState?analysis?.candidates[candidateIndex]?.move:null;if(!move){arrow.style.opacity=0;return;}const a=visibleIndex(move.from),b=visibleIndex(move.to);arrow.setAttribute('x1',a%8*100+50);arrow.setAttribute('y1',Math.floor(a/8)*100+50);arrow.setAttribute('x2',b%8*100+50);arrow.setAttribute('y2',Math.floor(b/8)*100+50);arrow.style.opacity=1;}
function status(){
  opponentPanel.context(state);
  const end=outcome(state,keys()),shownEnd=outcome(displayState(),preview?previewKeys:keys());
  $('opponent-sub').textContent=`${human==='w'?'Black':'White'} · original engine`;
  $('you-sub').textContent=human==='w'?'White':'Black';
  $('engine-status').textContent=busy?analysisMode?'Analyzing':'Thinking':end.over?'Finished':'Ready';
  $('turn-tag').textContent=preview?'Reviewing':end.over?'Game over':state.turn!==human?'Engine turn':'Your move';
  $('thinking-dot').classList.toggle('searching',busy);
  $('undo').disabled=!history.length;
  $('analyze').disabled=busy?!analysisMode:shownEnd.over;
  $('analyze').textContent=busy&&analysisMode?'Stop search':'Analyze board';
  $('analyze').setAttribute('aria-label',busy&&analysisMode?'Stop search':preview?'Analyze inspected position':'Analyze current game position');
  $('inspection').hidden=!preview;
  $('inspection-label').textContent=previewLabel;
  $('inspection').querySelector('small').textContent=busy?'Engine search continues':'Viewing only · game unchanged';
  $('hint').textContent=preview?'Return to your game to make a move.':end.over?end.text:busy?analysisMode?'Analyzing this position. No move will be played.':'The engine is searching for a reply.':state.turn!==human?'Engine turn. Retry the search if it was interrupted.':(end.text?'Your king is in check. ':'')+'Select a piece to see legal moves.';
}
function historyView(){
  $('move-count').textContent=history.length;
  $('move-list').innerHTML=history.length?Array.from({length:Math.ceil(history.length/2)},(_,i)=>
    `<div class="move-row"><span>${i+1}.</span>${[i*2,i*2+1].map(ply=>history[ply]?`<button data-ply="${ply+1}" class="${reviewPly===ply+1?'active':''}" aria-label="Review move ${i+1}, ${ply%2?'Black':'White'} ${history[ply].san}">${history[ply].san}</button>`:'<span>—</span>').join('')}</div>`
  ).join(''):'<div class="empty-analysis"><p>No moves yet.<small>Your game will appear here.</small></p></div>';
  $('export').disabled=!history.length;
}
$('move-list').onclick=e=>{
  const button=e.target.closest('[data-ply]');if(!button)return;
  reviewPly=Number(button.dataset.ply);preview=positions[reviewPly];previewKeys=keys().slice(0,reviewPly+1);previewMove=history[reviewPly-1].move;
  previewLabel=`Move ${Math.ceil(reviewPly/2)} · ${history[reviewPly-1].san}`;
  selected=null;renderBoard();historyView();status();
};
function commit(move){history.push({move,san:notation(state,move)});state=apply(state,move);positions.push(state);selected=null;preview=null;reviewPly=null;save(true);renderBoard();animateMove(move);historyView();status();}
function animateMove(move){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const element=$('board').querySelector(`[data-square="${move.to}"] .piece`);if(!element)return;const size=$('board').getBoundingClientRect().width/8,a=visibleIndex(move.from),b=visibleIndex(move.to);element.animate([{transform:`translate(${(a%8-b%8)*size}px, ${(Math.floor(a/8)-Math.floor(b/8))*size}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});}
function stop(){worker?.terminate();worker=null;job++;busy=false;explorer.setSearching(false);}
function scoreText(score){if(score===null)return 'unscored';return Math.abs(score)>99000?(score>0?'Winning':'Losing'):(score>0?'+':'')+(score/100).toFixed(2);}
function lineText(pv){let s=analysisState;return pv.map(m=>{const text=notation(s,m);s=apply(s,m);return text;}).join('  ');}
function renderAnalysis(){if(!analysis)return;
  const changed=!busy&&!analysisMode&&analysis.adaptation?.used;
  $('adaptation-note').hidden=!changed;
  if(changed)$('adaptation-explanation').textContent=decisionSummary(analysis,analysisState).text;
explorer.update(analysis,analysisState);const whiteScore=analysis.score===null?null:analysis.score*(analysisState.turn==='w'?1:-1),source=analysis.source||'search';$('depth').textContent=source==='search'?`${analysis.depth} / ${analysis.targetDepth}`:'—';$('nodes').textContent=analysis.nodes.toLocaleString();$('elapsed').textContent=(analysis.ms/1000).toFixed(2)+'s';$('analysis-kicker').textContent=source==='book'?'OPENING REPERTOIRE':source==='tablebase'?'EXACT ENDGAME TABLE':busy?'SEARCH IN PROGRESS':'LAST COMPLETED ANALYSIS';$('analysis-title').textContent=busy?'Searching deeper…':`${analysisMode?'Best move':'Engine played'}: ${notation(analysisState,analysis.move)}`;const adaptation=analysis.adaptation?.used?` Your past replies broke a close tie (${analysis.adaptation.observations} observations).`:'';$('analysis-note').textContent=analysis.reason||`${analysisState.turn==='w'?'White':'Black'}’s perspective. ${analysis.stopped?`Stopped at the ${analysis.stopped}. `:''}${analysis.ttHits||0} cached results reused.${adaptation}${analysis.notice?' '+analysis.notice:''}`;$('candidate-help').textContent='SELECT TO PREVIEW';$('candidates').innerHTML=analysis.candidates.map((c,i)=>`<button class="candidate ${i===candidateIndex?'active':''}" data-candidate="${i}" aria-label="Inspect ${notation(analysisState,c.move)}, score ${scoreText(c.score)}"><span class="number">0${i+1}</span><strong>${notation(analysisState,c.move)}${uci(c.move)===uci(analysis.move)?'<small class="chosen-mark">CHOSEN</small>':''}</strong><span class="score">${source==='book'?'book':scoreText(c.score)}</span></button>`).join('');$('pv').textContent=lineText(analysis.candidates[candidateIndex]?.pv||analysis.pv);$('eval-fill').style.height=whiteScore===null?'50%':Math.max(5,Math.min(95,50+whiteScore/18))+'%';$('eval-label').textContent=whiteScore===null?'—':Math.abs(whiteScore)>99000?'M':(whiteScore/100).toFixed(1);document.querySelector('.eval-track').setAttribute('aria-label',whiteScore===null?'Opening move, no search evaluation':`Last analyzed position: ${scoreText(whiteScore)} for White`);}
function runEngine(analyze=false,target=state,positionHistory=keys()){if(outcome(target,positionHistory).over)return;stop();$('engine-error').hidden=true;$('adaptation-note').hidden=true;busy=true;analysisMode=analyze;analysisState=target;analysisHistory=positionHistory.slice();analysis=null;explorer.reset();explorer.setActive(workspaceView==='search');explorer.setSearching(true);candidateIndex=0;for(const field of ['depth','nodes','elapsed'])$(field).textContent='—';const id=job,learningEnabled=$('use-learning').checked;try{worker=new Worker('./worker.js',{type:'module'});}catch{engineError('The engine could not start. Check that the app is served over HTTP and try again.');return;}$('analysis-kicker').textContent='SEARCH IN PROGRESS';$('analysis-title').textContent='Considering the position.';$('analysis-note').textContent='Searching one half-move deeper per completed iteration.';$('candidates').innerHTML='<div class="empty-analysis"><p>Searching this position…</p></div>';$('pv').textContent='Waiting for a complete search.';status();
 worker.onmessage=({data})=>{if(data.id!==job)return;if(data.type==='error'){engineError(data.error);return;}analysis=data.result;if(analysis)renderAnalysis();if(data.type==='done'){busy=false;explorer.setSearching(false);worker.terminate();worker=null;if(analysis){if(!analyze){commit(analysis.move);opponentPanel.decision(analysis,analysisState,{enabled:learningEnabled});}candidateIndex=Math.max(0,analysis.candidates.findIndex(c=>uci(c.move)===uci(analysis.move)));renderAnalysis();}status();}};
 worker.onerror=()=>engineError('The engine could not load. Check the local server and retry.');worker.postMessage({id,state:target,analyze,milliseconds:Number($('budget').value),maxDepth:Number($('max-depth').value),book:$('use-book').checked,profile:learningEnabled?{replies:profile.replies}:null,history:positionHistory});
}
function engineTurn(){if(state.turn!==human&&!outcome(state,keys()).over)runEngine();}
$('analyze').onclick=()=>{
  if(busy&&analysisMode){
    stop();
    if(analysis){analysis.stopped='user request';renderAnalysis();}
    else {
      $('analysis-kicker').textContent='SEARCH STOPPED';$('analysis-title').textContent='No iteration completed.';
      $('analysis-note').textContent='Analyze again with more time to record a complete result.';
      $('candidates').innerHTML='<div class="empty-analysis"><p>Search stopped.<small>Your game is unchanged.</small></p></div>';
      $('pv').textContent='No complete line returned.';
    }
    status();return;
  }
  runEngine(true,displayState(),preview?previewKeys:keys());
};
$('jump-tree').onclick=()=>document.getElementById('search-explorer').scrollIntoView({block:'start',behavior:'instant'});
$('view-profile-impact').onclick=()=>$('tab-profile').click();
$('settings-about').onclick=()=>$('about').click();
$('clear-memory').onclick=()=>show('<span class="eyebrow">LOCAL OPPONENT MEMORY</span><h2>Clear remembered games?</h2><p>This removes the completed games used for adaptation on this device. Your current game stays on the board.</p><button class="primary" data-clear-memory="true">Clear memory</button>');
function engineError(message){
  stop();status();$('engine-error').hidden=false;$('error-message').textContent=message;
  $('analysis-kicker').textContent='SEARCH INTERRUPTED';$('analysis-title').textContent='Search could not finish.';
  $('analysis-note').textContent='Your game is saved. Retry to continue from this position.';
}
$('retry').onclick=()=>{if(state.turn!==human&&!outcome(state,keys()).over)engineTurn();else runEngine(true,displayState(),preview?previewKeys:keys());};
function choose(i){if(preview)return;if(busy||state.turn!==human||outcome(state,keys()).over)return;const options=legal(state).filter(m=>m.from===selected&&m.to===i);if(options.length){if(options.length>1){pendingPromotion=options;show(`<span class="eyebrow">PROMOTION</span><h2>Choose your promotion.</h2><p>Your pawn reached the last rank.</p><div class="choice-row">${options.map(m=>`<button data-promote="${m.promotion}" aria-label="Promote to ${names[m.promotion]}">${piece(human==='w'?m.promotion.toUpperCase():m.promotion)}<span>${names[m.promotion]}</span></button>`).join('')}</div>`);return;}commit(options[0]);engineTurn();}else {selected=color(state.board[i])===human?(selected===i?null:i):null;renderBoard();if(selected!==null)$('hint').textContent=`${square(selected)} selected · choose a marked square. Escape clears the selection.`;}}
function show(html){$('dialog-content').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
$('board').addEventListener('click',e=>{const b=e.target.closest('[data-square]');if(b)choose(Number(b.dataset.square));});
$('board').addEventListener('keydown',e=>{const b=e.target.closest('[data-square]');if(!b)return;const i=Number(b.dataset.square),v=visibleIndex(i),d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(d!==undefined){e.preventDefault();const target=v+d;if(target>=0&&target<64&&(Math.abs(d)===8||Math.floor(target/8)===Math.floor(v/8))){$('board').querySelectorAll('button').forEach(x=>x.tabIndex=-1);const next=$('board').querySelector(`[data-square="${visibleIndex(target)}"]`);next.tabIndex=0;next.focus();}}if(e.key==='Escape'){selected=null;renderBoard();$('board').querySelector(`[data-square="${i}"]`).focus();status();}});
$('candidates').onclick=e=>{const b=e.target.closest('[data-candidate]');if(!b||!analysis)return;candidateIndex=Number(b.dataset.candidate);preview=analysisState;previewLabel='Candidate · '+notation(analysisState,analysis.candidates[candidateIndex].move);reviewPly=null;previewMove=null;previewKeys=analysisHistory.slice();selected=null;renderBoard();renderAnalysis();status();};
$('dialog-content').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.clearMemory){remembered=[];try{localStorage.removeItem('between-moves-memory');}catch{}memoryView();$('dialog').close();}if(b.dataset.promote){const m=pendingPromotion?.find(m=>m.promotion===b.dataset.promote);if(m){$('dialog').close();pendingPromotion=null;commit(m);engineTurn();}}if(b.dataset.side||b.dataset.study){stop();human=b.dataset.side||'w';flipped=human==='b';startFen=studies[b.dataset.study]||START;gameId=crypto.randomUUID();state=parse(startFen);history=[];positions=[state];selected=null;preview=null;analysis=null;analysisState=null;$('dialog').close();save();resetNotebook();renderBoard();historyView();status();if(b.dataset.study)runEngine(true);else engineTurn();}};
function resetNotebook(){opponentPanel.resetDecision();$('adaptation-note').hidden=true;$('engine-error').hidden=true;reviewPly=null;explorer.reset();$('analysis-kicker').textContent='READY TO PLAY';$('analysis-title').textContent='Start with a move.';$('analysis-note').textContent='Play a move or analyze the board to compare candidates and their continuations.';for(const id of ['depth','nodes','elapsed'])$(id).textContent='—';$('candidates').innerHTML='<div class="empty-analysis"><span class="empty-symbol" aria-hidden="true">♞</span><p>No analysis yet.<small>Analyze the board or play your first move.</small></p></div>';$('pv').textContent='No line calculated yet.';$('candidate-help').textContent='NO ANALYSIS YET';$('eval-fill').style.height='50%';$('eval-label').textContent='0.0';}
$('new-game').onclick=()=>show(`<span class="eyebrow">NEW GAME</span><h2>Choose your side.</h2><p>${history.length?'This replaces your current game. Download the PGN from Moves first to keep a copy.':'White moves first. The engine plays the other side.'}</p><div class="choice-row"><button data-side="w"><span class="side-piece" aria-hidden="true">♔</span> Play White</button><button data-side="b"><span class="side-piece" aria-hidden="true">♚</span> Play Black</button></div><h3>Practice an endgame</h3><p>Play the stronger side against an exact local endgame table.</p><div class="choice-row"><button data-study="queen">King + queen</button><button data-study="rook">King + rook</button></div>`);
$('undo').onclick=()=>{stop();preview=null;selected=null;if(history.length){history.pop();positions.pop();state=positions.at(-1);if(state.turn!==human&&history.length){history.pop();positions.pop();state=positions.at(-1);}}analysis=null;resetNotebook();save();renderBoard();historyView();status();engineTurn();};
$('flip').onclick=()=>{flipped=!flipped;save();renderBoard();};
const tabNames=['thought','history','profile','settings'];
for(const name of tabNames)$('tab-'+name).onclick=()=>{for(const n of tabNames){
  $(n).hidden=n!==name;$('tab-'+n).setAttribute('aria-selected',String(n===name));$('tab-'+n).tabIndex=n===name?0:-1;
}document.querySelector('.notebook .panel-scroll').scrollTo({top:0,behavior:'instant'});};
document.querySelector('.tabs').addEventListener('keydown',e=>{
  const i=tabNames.indexOf(e.target.id.replace('tab-',''));
  if(i<0)return;
  const next=e.key==='Home'?0:e.key==='End'?tabNames.length-1:e.key==='ArrowRight'?(i+1)%tabNames.length:e.key==='ArrowLeft'?(i+tabNames.length-1)%tabNames.length:-1;
  if(next>=0){e.preventDefault();const button=$('tab-'+tabNames[next]);button.click();button.focus();}
});
$('close').onclick=()=>$('dialog').close();$('dialog').addEventListener('close',()=>{pendingPromotion=null;});
$('about').onclick=()=>show(`<span class="eyebrow">ABOUT THE ENGINE</span><h2>Built from the rules.</h2><p>Original JavaScript move generation, iterative-deepening alpha-beta, tactical extensions and a bounded transposition table. No Stockfish, model API, or remote game service in play.</p><p>A small curated opening repertoire gives it variety. Original, independently checked queen-versus-king and rook-versus-king tables supply exact mate distances. These files are loaded locally and cached on your device.</p><p>Completed games build a local record of your replies. After three observations at a position, those replies can break a close tie within 0.25 pawns of its best searched move. This is a small statistical model, not neural-network training.</p><p>Choose a depth ceiling up to 12 plies. The time budget limits what finishes. The explorer records up to eight plies and six children per node, including tactical visits and cache hits. It never fabricates an expanded subtree.</p><p>Threefold repetition and the fifty-move rule end games automatically here. Your game, settings and memory stay in this browser. The upgraded build is currently unrated.</p>`);
$('how').onclick=()=>show(`<span class="eyebrow">KEYBOARD & HELP</span><h2>Playing & exploring</h2><p>Select one of your pieces, then a marked square. Dots show empty destinations; rings show captures. A red square means the king is in check.</p><p>Use arrow keys to move focus and Enter to select. Escape clears a selection. Take back undoes your last turn. Flip board changes your view, not your side.</p><p>In Analysis, select a candidate to preview its starting position and move arrow. In Explore, select a branch to see the board after each move. Use the path above the node to step back. Moves lets you review your game. Return to game exits any preview. Scores are estimates, not probabilities.</p>`);
$('export').onclick=()=>{const end=outcome(state,keys()),result=!end.over?'*':end.text.includes('White wins')?'1-0':end.text.includes('Black wins')?'0-1':'1/2-1/2';const text=`[Event "Between Moves local game"]\n[White "${human==='w'?'Human':'Between Moves'}"]\n[Black "${human==='b'?'Human':'Between Moves'}"]\n[Result "${result}"]\n${startFen!==START?`[SetUp "1"]\n[FEN "${startFen}"]\n`:''}\n`+history.map((h,i)=>(i%2===0?`${i/2+1}. `:'')+h.san).join(' ')+' '+result;const url=URL.createObjectURL(new Blob([text],{type:'application/x-chess-pgn'}));const a=document.createElement('a');a.href=url;a.download='between-moves.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{const theme=localStorage.getItem('between-moves-theme');if(['light','dark'].includes(theme))document.documentElement.dataset.theme=theme;}catch{}
$('theme').onclick=()=>{const current=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');const next=current==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('between-moves-theme',next);}catch{}};
memoryView();renderBoard();historyView();status();setView();if(history.length){$('analysis-kicker').textContent='GAME RESTORED';$('analysis-title').textContent='Back at the board.';$('analysis-note').textContent='Your game was restored. Search details appear after the next engine turn.';$('candidate-help').textContent='AFTER THE NEXT REPLY';}engineTurn();
