import { architectures } from './architecture-data.mjs?v=20261101-r9';
import './architecture-more.mjs?v=20261101-r9';
import './architecture-runtime.mjs?v=20261101-r9';
import {createDiagramNavigation} from './diagram-navigation.mjs?v=20261101-r9';
import {caseArchitectures} from './architecture-cases.mjs?v=20261101-r9';
Object.assign(architectures,caseArchitectures);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dialog, current=null, spatial=null, navigation=null, runToken=0, timer=null, spatialGeneration=0;

export async function openArchitecture(id) {
 const graph=architectures[id];if(!graph)return;
 if(!dialog){dialog=document.createElement('dialog');dialog.className='architecture-dialog';dialog.id='architecture-dialog';document.body.append(dialog);dialog.addEventListener('close',()=>{runToken++;clearTimeout(timer);spatial?.pause(true);});}
 runToken++;clearTimeout(timer);spatialGeneration++;spatial?.dispose();spatial=null;navigation?.dispose();navigation=null;
 current={graph,id,scenario:0,step:-1,selected:graph.nodes[0].id,zoom:1,view:'flow',activeLayer:0,moveLayers:false};
 dialog.style.setProperty('--arch-accent',graph.color);dialog.setAttribute('aria-label',`${graph.title} architecture`);
 dialog.innerHTML=`<header class="arch-heading"><div><p>INSIDE / ${escape(graph.eyebrow)}</p><h2>${escape(graph.title)}</h2></div><div class="arch-heading-actions">${(graph.related||[]).map(item=>`<button data-arch-related="${item.id}">${escape(item.label)}</button>`).join('')}<button data-arch-action="close" aria-label="Close architecture">Close ×</button></div></header>
 <div class="arch-controls"><label>Follow the data<select id="arch-scenario" aria-label="Architecture scenario">${graph.scenarios.map((scenario,i)=>`<option value="${i}">${escape(scenario.name)}</option>`).join('')}</select></label><div class="arch-playback"><button data-arch-action="previous" aria-label="Previous data step">←</button><button data-arch-action="next">Next step →</button><button data-arch-action="play">Play trace</button><button data-arch-action="reset">Reset</button></div><div class="arch-views" role="group" aria-label="Architecture view"><button data-arch-view="flow" aria-pressed="true">Data flow</button><button data-arch-view="spatial" aria-pressed="false">3D stack</button><button data-arch-view="screens" aria-pressed="false">Screen view</button></div></div>
 <div class="arch-workspace"><div class="arch-map-column"><div class="arch-map" id="arch-map"><svg id="arch-svg" viewBox="0 0 ${graph.width} ${graph.height}" role="group" aria-label="${escape(graph.title)} data flow"><defs><marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z"/></marker></defs>${renderGraph(graph)}</svg><canvas id="arch-spatial" hidden aria-label="Spatial architecture layers"></canvas></div><div class="arch-map-tools"><span id="arch-map-hint">Choose a component · arrows show actual handoffs</span><label id="arch-zoom-label">Zoom <input id="arch-zoom" type="range" min="1" max="1.8" step="0.1" value="1" aria-label="Architecture zoom"></label><button data-arch-action="layout">Reset view</button></div><div class="arch-progress"><span id="arch-step-label">READY / ${graph.scenarios[0].steps.length} STEPS</span><p id="arch-caption" role="status">Choose a scenario and follow a concrete example through the system.</p></div><pre id="arch-payload" aria-label="Example data at this step">${escape(JSON.stringify(graph.nodes[0].input,null,2))}</pre></div>
 <aside class="arch-inspector"><p class="arch-kicker" id="arch-node-type"></p><h3 id="arch-node-name"></h3><p id="arch-node-does"></p><div class="arch-port"><h4>INPUT</h4><pre id="arch-node-input"></pre></div><div class="arch-port"><h4>OUTPUT / STATE</h4><pre id="arch-node-output"></pre></div><div class="arch-source"><h4>IMPLEMENTATION EVIDENCE</h4><p id="arch-evidence"></p></div><ol class="arch-layer-key">${graph.layers.map((name,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${escape(name)}</li>`).join('')}</ol></aside></div>
 <footer class="arch-foot"><span>Sample payloads · source-backed paths · no external calls</span><p>${escape(graph.boundary)}</p></footer>`;
 const screenControls=document.createElement('div');screenControls.className='arch-screen-controls';screenControls.hidden=true;screenControls.innerHTML='<button data-arch-action="previous-layer" aria-label="Previous layer">←</button><span id="arch-layer-name" role="status"></span><button data-arch-action="next-layer" aria-label="Next layer">→</button><button data-arch-action="move-layers" aria-pressed="false">Move layers</button>';dialog.querySelector('.arch-controls').after(screenControls);
 if(!dialog.open)dialog.showModal();
 dialog.onclick=event=>{
  const related=event.target.closest('[data-arch-related]');if(related){openArchitecture(related.dataset.archRelated);return;}
  const node=event.target.closest('[data-arch-node]');if(node){selectNode(node.dataset.archNode);return;}
  const view=event.target.closest('[data-arch-view]');if(view){setView(view.dataset.archView);return;}
  const action=event.target.closest('[data-arch-action]')?.dataset.archAction;
  if(action==='close')dialog.close();
  if(action==='next'){stop();advance();}
  if(action==='previous'){stop();current.step=Math.max(-1,current.step-1);renderTrace();}
  if(action==='reset'){stop();current.step=-1;renderTrace();}
  if(action==='play')play();
  if(action==='layout'){current.zoom=1;dialog.querySelector('#arch-zoom').value='1';navigation?.fit();spatial?.reset();}
  if(action==='previous-layer'||action==='next-layer')spatial?.setLayer(current.activeLayer+(action==='next-layer'?1:-1));
  if(action==='move-layers'){current.moveLayers=!current.moveLayers;spatial?.setDragMode(current.moveLayers?'move':'rotate');event.target.closest('button').setAttribute('aria-pressed',String(current.moveLayers));}
 };
 dialog.onkeydown=event=>{const node=event.target.closest('[data-arch-node]');if(node&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectNode(node.dataset.archNode);}};
 dialog.querySelector('#arch-scenario').onchange=event=>{stop();current.scenario=Number(event.target.value);current.step=-1;renderTrace();};
 const svg=dialog.querySelector('#arch-svg');navigation=createDiagramNavigation({svg,width:graph.width,height:graph.height});
 dialog.querySelector('#arch-zoom').oninput=event=>{current.zoom=Number(event.target.value);if(current.view!=='flow'){spatial?.zoom(current.zoom);return;}navigation?.setZoom(current.zoom);};
 selectNode(graph.nodes[0].id);renderTrace();
}

function renderGraph(graph) {
 const byId=Object.fromEntries(graph.nodes.map(node=>[node.id,node]));
 const edges=graph.edges.map((edge,index)=>{
  const a=byId[edge.from],b=byId[edge.to];let x1=a.x+180,y1=a.y+40,x2=b.x,y2=b.y+40;
  if(Math.abs(a.y-b.y)>Math.abs(a.x-b.x)){x1=a.x+90;y1=a.y+(a.y<b.y?80:0);x2=b.x+90;y2=b.y+(a.y<b.y?0:80);}
  else if(a.x>b.x){x1=a.x;y1=a.y+40;x2=b.x+180;y2=b.y+40;}
  const vertical=Math.abs(a.y-b.y)>Math.abs(a.x-b.x);
  const d=vertical?`M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`:`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
  return `<g class="arch-edge-group"><path id="arch-edge-${index}" class="arch-edge ${escape(edge.kind)}" data-edge-from="${edge.from}" data-edge-to="${edge.to}" d="${d}" marker-end="url(#arch-arrow)"/><text class="arch-edge-label" x="${(x1+x2)/2}" y="${(y1+y2)/2-9}">${escape(edge.label)}</text></g>`;
 }).join('');
 const nodes=graph.nodes.map(node=>{
  const words=node.label.split(' '),lines=[''];for(const word of words){const last=lines.length-1;if(lines[last].length+word.length>22&&lines[last])lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;}
  const label=lines.slice(0,2).map((line,i)=>`<tspan x="14" y="${lines.length>1?46+i*17:50}">${escape(line)}</tspan>`).join('');
  return `<g class="arch-node" data-arch-node="${node.id}" transform="translate(${node.x} ${node.y})" role="button" tabindex="0" aria-label="Inspect ${escape(node.label)}"><rect class="arch-node-surface" width="180" height="80" rx="${node.type==='store'?18:4}"/><text class="arch-node-kind" x="14" y="24">${escape(node.type.toUpperCase())}</text><text class="arch-node-label">${label}</text><circle class="arch-node-status" cx="164" cy="16" r="4"/></g>`;
 }).join('');
 return edges+nodes;
}
function selectNode(id) {
 const node=current.graph.nodes.find(n=>n.id===id);if(!node)return;current.selected=id;
 for(const element of dialog.querySelectorAll('[data-arch-node]'))element.dataset.selected=String(element.dataset.archNode===id);
 for(const edge of dialog.querySelectorAll('[data-edge-from]'))edge.dataset.focused=String(edge.dataset.edgeFrom===id||edge.dataset.edgeTo===id);
 dialog.querySelector('#arch-node-type').textContent=`${node.type.toUpperCase()} / ${current.graph.layers[node.layer]}`;
 dialog.querySelector('#arch-node-name').textContent=node.label;dialog.querySelector('#arch-node-does').textContent=node.does;
 dialog.querySelector('#arch-node-input').textContent=JSON.stringify(node.input,null,2);dialog.querySelector('#arch-node-output').textContent=JSON.stringify(node.output,null,2);
 dialog.querySelector('#arch-evidence').textContent=node.evidence;spatial?.select(id);
}
function stop(){runToken++;clearTimeout(timer);if(dialog?.open)dialog.querySelector('[data-arch-action="play"]').textContent='Play trace';}
function advance(){const steps=current.graph.scenarios[current.scenario].steps;if(current.step<steps.length-1)current.step++;renderTrace();}
function renderTrace(){
 const steps=current.graph.scenarios[current.scenario].steps,step=steps[current.step],past=new Set(steps.slice(0,Math.max(0,current.step)).map(s=>s.node));
 for(const node of dialog.querySelectorAll('[data-arch-node]'))node.dataset.trace=step?.node===node.dataset.archNode?step.state:past.has(node.dataset.archNode)?'visited':'';
 const previousNode=current.step>0?steps[current.step-1].node:null;
 // Parallel inputs are not invented serial handoffs. Follow an existing incoming
 // edge from a previously visited producer when the preceding observation is a sibling.
 const visitedOrder=steps.slice(0,Math.max(0,current.step)).map(s=>s.node).reverse();
 const edgeFrom=step?(current.graph.edges.some(e=>e.from===previousNode&&e.to===step.node)?previousNode:visitedOrder.find(id=>current.graph.edges.some(e=>e.from===id&&e.to===step.node))):null;
 for(const edge of dialog.querySelectorAll('[data-edge-from]'))edge.dataset.active=String(Boolean(step)&&edge.dataset.edgeFrom===edgeFrom&&edge.dataset.edgeTo===step.node);
 dialog.querySelector('.arch-flow-token')?.remove();
 const activeEdge=dialog.querySelector('.arch-edge[data-active=true]');
 if(activeEdge){const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('class','arch-flow-token');circle.setAttribute('r','5');circle.setAttribute('fill',current.graph.color);if(matchMedia('(prefers-reduced-motion:reduce)').matches){const point=activeEdge.getPointAtLength(activeEdge.getTotalLength());circle.setAttribute('cx',String(point.x));circle.setAttribute('cy',String(point.y));}else{const motion=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');motion.setAttribute('begin','indefinite');motion.setAttribute('dur','.8s');motion.setAttribute('fill','freeze');motion.setAttribute('path',activeEdge.getAttribute('d'));circle.append(motion);}dialog.querySelector('#arch-svg').append(circle);circle.querySelector('animateMotion')?.beginElement();}
 dialog.querySelector('#arch-step-label').textContent=step?`${String(current.step+1).padStart(2,'0')} / ${steps.length} · ${step.state==='held'?'HELD':'DATA STEP'}`:`READY / ${steps.length} STEPS`;
 dialog.querySelector('#arch-caption').textContent=step?.caption||'Choose a scenario and follow a concrete example through the system.';
 dialog.querySelector('#arch-payload').textContent=JSON.stringify(step?.payload||{scenario:current.graph.scenarios[current.scenario].name},null,2);
 dialog.querySelector('[data-arch-action="previous"]').disabled=current.step<0;dialog.querySelector('[data-arch-action="next"]').disabled=current.step>=steps.length-1;
 if(step){selectNode(step.node);if(current.view==='flow'){const node=current.graph.nodes.find(n=>n.id===step.node);navigation?.reveal({x:node.x,y:node.y,width:180,height:80});}}spatial?.trace(step?.node||null,edgeFrom);
}
function play(){
 stop();const token=runToken;if(current.step>=current.graph.scenarios[current.scenario].steps.length-1)current.step=-1;
 const tick=()=>{if(token!==runToken||!dialog.open)return;advance();const step=current.graph.scenarios[current.scenario].steps[current.step];if(step?.state==='held'||current.step>=current.graph.scenarios[current.scenario].steps.length-1){stop();return;}dialog.querySelector('[data-arch-action="play"]').textContent='Playing…';timer=setTimeout(tick,matchMedia('(prefers-reduced-motion:reduce)').matches?1400:1000);};tick();
}
async function setView(view){
 current.view=view;dialog.querySelectorAll('[data-arch-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.archView===view)));
 dialog.querySelector('#arch-svg').toggleAttribute('hidden',view!=='flow');dialog.querySelector('#arch-spatial').hidden=view==='flow';
 dialog.querySelector('.arch-screen-controls').hidden=view==='flow';
 dialog.querySelectorAll('[data-arch-action="previous-layer"],[data-arch-action="next-layer"],#arch-layer-name').forEach(element=>element.hidden=view!=='screens');
 dialog.querySelector('[data-arch-action="move-layers"]').hidden=view!=='spatial';
 dialog.querySelector('#arch-map-hint').textContent=view==='flow'?'Drag to pan · +/− to zoom · 0 to fit · select a component':view==='screens'?'Upright layer · step through layers or follow a data trace':'Drag in both directions to rotate · choose Move layers to reposition';
 if(view==='flow'){spatial?.pause(true);return;}
 const generation=spatialGeneration;
 try{if(!spatial){const {createSpatialArchitecture}=await import('./architecture-spatial.mjs?v=20261101-r9');if(generation!==spatialGeneration||!dialog.open||current.view==='flow')return;spatial=createSpatialArchitecture({canvas:dialog.querySelector('#arch-spatial'),wrap:dialog.querySelector('#arch-map'),graph:current.graph,onSelect:selectNode,onLayerChange(index,name){current.activeLayer=index;dialog.querySelector('#arch-layer-name').textContent=`${index+1} / ${current.graph.layers.length} · ${name}`;dialog.querySelector('[data-arch-action="previous-layer"]').disabled=index===0;dialog.querySelector('[data-arch-action="next-layer"]').disabled=index===current.graph.layers.length-1;}});}spatial.pause(false);spatial.setView(view==='screens'?'screen':'stack');spatial.setDragMode(current.moveLayers?'move':'rotate');spatial.zoom(current.zoom);spatial.select(current.selected);}
 catch(error){if(generation!==spatialGeneration)return;setView('flow');dialog.querySelector('#arch-map-hint').textContent='Spatial rendering unavailable. The data-flow view remains usable.';}
}
