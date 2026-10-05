import {apply,notation,evaluationBreakdown} from './engine.js';
import {loadRatingPanel} from './rating-panel.js';
const score=n=>n===null?'unscored':Math.abs(n)>99000?(n>0?'mate advantage':'mate threat'):(n>0?'+':'')+(n/100).toFixed(2);
const key=m=>`${m.from}-${m.to}-${m.promotion||''}`;
const windowValue=n=>n===Infinity?'∞':n===-Infinity?'−∞':score(n);
export function createExplorer(inspect){
  const section=document.createElement('section');section.className='search-lab panel';section.id='search-explorer';
  section.setAttribute('aria-label','Search explorer');
  section.innerHTML=`<div class="panel-top"><span>Search explorer</span><small>Actual recorded visits</small><button id="jump-board" class="mobile-link">View board ↑</button></div><div class="panel-scroll">
  <div class="lab-empty" id="lab-empty"><span class="empty-symbol" aria-hidden="true">♞</span><h2>No tree yet.</h2><p>Analyze the board to see the branches the engine explores. Every selection updates the board.</p><button class="primary" id="start-exploring">Analyze this board</button></div>
  <div id="lab-content" hidden><div class="lab-toolbar"><label>First move<select id="branch-select"></select></label><label>Search iteration<select id="depth-select"></select></label><span id="trace-caption"></span></div>
  <div id="decision-source" class="decision-source" hidden></div><div id="tree-workspace"><nav id="tree-path" aria-label="Search path"></nav>
  <div class="node-detail"><span class="eyebrow" id="node-kind"></span><h3 id="node-title"></h3><p id="node-summary"></p><dl id="node-facts"></dl><div class="node-line"><span class="eyebrow">RETURNED LINE</span><p id="node-line"></p></div></div>
  <div class="children-panel"><div class="section-label"><h3 id="children-heading">Visited replies</h3><span id="children-count"></span></div><div id="tree-children"></div><p class="trace-note" id="trace-note"></p></div></div>
  <details id="bounds-details"><summary>Score bounds & search window</summary><p class="trace-note" id="node-window"></p></details>
  <details><summary>Search counters</summary><div class="trace-stats" id="trace-stats"></div></details>
  <details><summary>Position evaluation</summary><p id="position-label"></p><div id="evaluation-bars"></div><p class="trace-note">Static evaluation describes this board. The search score looks ahead.</p></details>
  <details class="search-explanation"><summary>How the search works</summary><ol><li><strong>Complete one depth at a time.</strong> Search every root move at depth 1, then 2, then deeper. Keep the last completed iteration.</li><li><strong>Assume the strongest reply.</strong> Negamax reverses scores each turn. Alpha-beta skips branches that cannot improve the choice.</li><li><strong>Resolve forcing exchanges.</strong> Captures, promotions and check evasions continue beyond the regular depth limit.</li><li><strong>Reuse safe results.</strong> Cached scores include the fifty-move clock and repetition context. Cache hits appear as leaves.</li><li><strong>Record a bounded sample.</strong> Show actual visits, up to six children per node, eight plies and 2,400 descendants per iteration.</li></ol></details></div>
  <details class="rating-panel"><summary>Strength & benchmarks<span id="rating-badge">Unrated</span></summary><div id="rating-details"><p>Loading local benchmark evidence…</p></div></details></div>`;
  document.querySelector('.workspace').append(section);
  const $=id=>section.querySelector('#'+id);
  let analysis=null,root=null,selectedKey=null,viewDepth='latest',path=[],selectedState=null,selectedAncestors=[],active=false,atRoot=false;const iterations=new Map();
  function breakdown(s,label){const b=evaluationBreakdown(s);$('position-label').textContent=`${label} · White’s perspective · ${score(b.total)} pawns.`;const labels={material:'Material',activity:'Piece activity',pawns:'Pawn structure',kingSafety:'King safety'};$('evaluation-bars').innerHTML=Object.entries(labels).map(([k,label])=>`<div class="eval-row"><span>${label}</span><div class="term-track"><i class="${b[k]<0?'negative':''}" style="width:${Math.min(50,Math.abs(b[k])/12)}%;${b[k]<0?'right:50%':'left:50%'}"></i></div><strong>${score(b[k])}</strong></div>`).join('');}
  function chosen(){return analysis?.tree.find(b=>key(b.move)===selectedKey)||analysis?.tree.find(b=>key(b.move)===key(analysis.move))||analysis?.tree[0];}
  function pinIteration(){if(viewDepth==='latest'){viewDepth=String(analysis.depth);$('depth-select').value=viewDepth;}}
  function renderNode(){
    if(atRoot){renderRoot();return;}
    const branch=chosen();if(!branch)return;
    let s=root,node=branch;const crumbs=[{label:'Start',length:-1,state:s}];s=apply(s,node.move);crumbs.push({label:notation(root,node.move),length:0,state:s});const validPath=[];
    for(const id of path){const child=node.children.find(c=>c.id===id);if(!child)break;const label=notation(s,child.move);s=apply(s,child.move);node=child;validPath.push(id);crumbs.push({label,length:validPath.length,state:s});}path=validPath;selectedState=s;selectedAncestors=crumbs.slice(1).map(c=>c.state);
    $('tree-path').innerHTML=crumbs.map((c,i)=>`<button data-crumb="${i}" ${i===crumbs.length-1?'aria-current="step"':''}><small>${i===0?'ROOT':`PLY ${i}`}</small>${c.label}</button>${i<crumbs.length-1?'<span aria-hidden="true">→</span>':''}`).join('');
    $('tree-path').onclick=e=>{const b=e.target.closest('[data-crumb]');if(!b)return;pinIteration();const c=crumbs[Number(b.dataset.crumb)];if(c.length===-1){atRoot=true;path=[];}else path=path.slice(0,c.length);active=true;renderNode();};
    const positionScore=node.ply===1?node.positionScore:node.score,side=s.turn==='w'?'White':'Black';
    $('node-kind').textContent=`PLY ${node.ply} / ${node.source.toUpperCase()}`;
    $('node-title').textContent=`${side} to move.`;
    $('node-summary').hidden=node.source==='search';
    const messages={transposition:`A cached result at depth ${node.cachedDepth} replaced another search of this position.`,terminal:'This line ended in mate or an automatic draw.',tablebase:'A local endgame table supplied an exact outcome.',quiescence:node.inCheck?'In check: search all evasions before evaluating.':'The regular depth ended. Continue forcing exchanges.', 'stand-pat cutoff':'The static score already exceeded this branch’s window.', 'safety-cap':'The 12-ply tactical extension limit was reached. Use the static score.'};
    $('node-summary').textContent=node.tablebase?`The ${node.tablebase.type} table proves ${node.tablebase.wdl===0?'a draw':`${node.tablebase.strong==='w'?'White':'Black'} can force mate in ${node.tablebase.dtm} plies`}.`:messages[node.source]||'Search legal replies and keep the best result for the side to move.';
    $('node-facts').innerHTML=`<div><dt>Score for ${side}</dt><dd>${node.bound==='lower'?'≥ ':node.bound==='upper'?'≤ ':''}${score(positionScore)}</dd></div><div><dt>Depth left</dt><dd>${Math.max(0,node.depth)}</dd></div><div><dt>Positions visited</dt><dd>${node.nodes.toLocaleString()}</dd></div>`;
    let lineState=s;$('node-line').textContent=node.pv?.length?node.pv.map(m=>{const label=notation(lineState,m);lineState=apply(lineState,m);return label;}).join('  '):'No further line returned.';
    $('node-window').textContent=`Depth left: ${Math.max(0,node.depth)}. Static score: ${node.staticScore===undefined?'not evaluated':score(node.staticScore)}. Incoming window: α ${windowValue(node.alpha)} / β ${windowValue(node.beta)}. A lower bound means at least this score, an upper bound at most. All scores in this card use ${side}’s perspective.`;
    $('children-heading').textContent=`${side}’s visited replies`;
    $('children-count').textContent=`${node.children.length} RECORDED`;
    $('tree-children').innerHTML=node.children.length?node.children.map(c=>`<button class="trace-child" data-child="${c.id}"><strong>${notation(s,c.move)}</strong><span>${c.bound==='lower'?'≤ ':c.bound==='upper'?'≥ ':''}${score(-c.score)}</span><small>PLY ${c.ply} · ${c.source} · ${c.nodes.toLocaleString()} positions</small><i aria-hidden="true">↗</i></button>`).join(''):`<p class="trace-leaf">${node.source==='transposition'?'Result reused. This visit did not expand the cached line.':node.source==='terminal'||node.source==='tablebase'?'The result is known. No further search was needed.':node.omitted?'Descendants were visited but are outside the recorded trace.':'No further moves were searched from this node.'}</p>`;
    $('trace-note').textContent=`${node.visitedMoves} moves searched · ${node.prunedMoves} skipped by alpha-beta · ${node.omitted} visited moves not drawn. The tree shows a bounded sample of actual visits.`;
    breakdown(s,`Ply ${node.ply}`);
    if(active)inspect(s,selectedAncestors,`Search position · ply ${node.ply}`,node.move);
  }
  function renderRoot(){
    if(!root||!analysis)return;
    selectedState=root;selectedAncestors=[];
    $('tree-path').innerHTML='<button aria-current="step"><small>ROOT</small>Start</button>';
    $('node-kind').textContent='STARTING POSITION';
    const side=root.turn==='w'?'White':'Black';
    $('node-title').textContent=side+' to move.';
    $('node-summary').hidden=false;
    $('node-summary').textContent='Compare the searched first moves below. Select one to follow its replies.';
    $('node-facts').innerHTML=`<div><dt>Best score</dt><dd>${score(analysis.score)}</dd></div><div><dt>Perspective</dt><dd>${side}</dd></div><div><dt>Completed depth</dt><dd>${analysis.depth}</dd></div>`;
    $('node-line').textContent='Select a first move to see its continuation.';
    $('node-window').textContent='Root moves are searched with full windows. Scores use the side-to-move perspective.';
    $('children-heading').textContent='Searched first moves';
    $('children-count').textContent=analysis.tree.length+' MOVES';
    $('tree-children').innerHTML=analysis.tree.map(b=>`<button class="trace-child" data-root="${key(b.move)}"><strong>${notation(root,b.move)}</strong><span>${score(b.score)}</span><small>${b.nodes.toLocaleString()} positions${key(b.move)===key(analysis.move)?' · chosen':''}</small><i aria-hidden="true">→</i></button>`).join('');
    $('trace-note').textContent='All first moves from the completed iteration. Descendants are a bounded sample.';
    breakdown(root,'Starting board');
    if(active)inspect(root,[],'Search position · root');
  }
  function render(){
    if(!analysis)return;$('lab-empty').hidden=false;$('lab-content').hidden=true;
    if(!analysis.tree?.length&&analysis.source==='search'){$('lab-empty').querySelector('p').textContent='No iteration completed. Increase think time and analyze again to record a tree.';return;}
    $('lab-empty').hidden=true;$('lab-content').hidden=false;
    const searched=analysis.source==='search';$('tree-workspace').hidden=!searched;$('decision-source').hidden=searched;$('bounds-details').hidden=!searched;$('lab-content').querySelector('.lab-toolbar').hidden=!searched;
    if(!searched){$('decision-source').replaceChildren();const title=document.createElement('h3');title.textContent=analysis.source==='book'?`From the opening repertoire · ${analysis.opening}`:`From the ${analysis.tablebase.type} endgame table`;const p=document.createElement('p');p.textContent=analysis.reason;const note=document.createElement('p');note.textContent='This decision did not expand a search tree. Analyze the position to run the search and inspect its visits.';$('decision-source').append(title,p,note);breakdown(root,'Decision starting board');if(active)inspect(root,[],'Decision starting position');}
    else {const branch=chosen(),select=$('branch-select');select.innerHTML=analysis.tree.map(b=>`<option value="${key(b.move)}">${notation(root,b.move)} · ${score(b.score)}${key(b.move)===key(analysis.move)?' · chosen':''}</option>`).join('');select.value=key(branch.move);$('depth-select').innerHTML='<option value="latest">Latest completed</option>'+[...iterations.keys()].filter(d=>d>0).map(d=>`<option value="${d}">Depth ${d}</option>`).join('');$('depth-select').value=viewDepth;$('trace-caption').textContent=`${analysis.depth} / ${analysis.targetDepth} plies finished · ${analysis.stopped||'completed iteration'}`;renderNode();}
    const fields=[['Positions',analysis.nodes||0],['Tactical visits',analysis.qnodes||0],['Cutoffs',analysis.cutoffs||0],['Cache hits',analysis.ttHits||0],['Table hits',analysis.tablebaseHits||0],['Recorded nodes',analysis.traceRecorded||0]];
    $('trace-stats').innerHTML=fields.map(([label,n])=>`<div><strong>${n.toLocaleString()}</strong><span>${label}</span></div>`).join('')+'<p class="trace-accounting">Counters include earlier iterations and, for the final result, any interrupted work. Drawn nodes belong only to the selected completed iteration.</p>';
  }
  const reveal=()=>{section.querySelector('.panel-scroll').scrollTo({top:0});if(matchMedia('(max-width:760px)').matches)section.scrollIntoView({block:'start',behavior:'instant'});};
  $('jump-board').onclick=()=>document.getElementById('board').scrollIntoView({block:'center',behavior:'instant'});
  $('start-exploring').onclick=()=>document.getElementById('analyze').click();
  $('tree-children').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    active=true;pinIteration();
    if(b.dataset.root){atRoot=false;path=[];selectedKey=b.dataset.root;render();}
    else if(b.dataset.child){path.push(Number(b.dataset.child));renderNode();}
    reveal();
  };
  $('depth-select').onchange=e=>{active=true;viewDepth=e.target.value;analysis=viewDepth==='latest'?[...iterations.values()].at(-1):iterations.get(Number(viewDepth));path=[];render();};
  $('branch-select').onchange=e=>{active=true;pinIteration();atRoot=false;selectedKey=e.target.value;path=[];render();};
  loadRatingPanel(section);
  return {setSearching(value){$('start-exploring').disabled=value;$('start-exploring').textContent=value?'Searching…':'Analyze this board';$('lab-empty').querySelector('h2').textContent=value?'Searching the board…':'No tree yet.';section.querySelector('.panel-top small').textContent=value?'Searching…':'Actual recorded visits';},setActive(value){active=value;if(active&&analysis)render();},update(a,s){if(root!==s){iterations.clear();viewDepth='latest';selectedKey=null;path=[];atRoot=false;}if(viewDepth==='latest'&&analysis?.depth!==a.depth)path=[];root=s;iterations.set(a.depth,a);analysis=viewDepth==='latest'?a:iterations.get(Number(viewDepth))||a;render();},reset(){analysis=null;root=null;selectedKey=null;path=[];atRoot=false;iterations.clear();viewDepth='latest';$('lab-empty').querySelector('p').textContent='Analyze the board to see the branches the engine explores. Every selection updates the board.';$('lab-empty').hidden=false;$('lab-content').hidden=true;}};
}
