const root = document.querySelector('#demo');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = v => JSON.stringify(v, null, 2);
const chapters = ['Import', 'Review', 'Connect', 'Test', 'Take the code'];
const sourceFiles = ['src/migration.js','src/importer.js','src/import-adapters.js','src/graph-compiler.js','src/runtime.js','src/connectors.js','src/runner.js','src/store.js','src/oauth.js','src/oauth-store.js','src/agent-api.js','test/branch-adapters.test.js','test/restart-adapters.test.js','test/oauth.test.js','test/browser-demo.test.js'];
let sourceCode = '', sourceOpen = '', messageTimer;
let canvasView=null, canvasObserver, canvasCommand;
let worker, sequence = 0, epoch = 0, busy = false, chapter = 0, definitions = [], definition, plan, code, selected, sourceName, isSample = false, accounts = new Set(), result, runTab = 'trace', scenario = 'new', actions = {}, catalog = {}, eventText = '{}';
const pending = new Map();
function bootWorker() {
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({data}) => {
    const task = pending.get(data.id);
    if (!task) return;
    pending.delete(data.id); clearTimeout(task.timer);
    data.error ? task.reject(Error(data.error)) : task.resolve(data.result);
  };
  worker.onerror = () => {
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('The local compiler could not start. Reload the demo and try again.')); }
    pending.clear();
  };
}
bootWorker();
function request(operation, data = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      worker.terminate();
      for (const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('This export took too long to process. Try a smaller export.')); }
      pending.clear(); bootWorker();
    }, 15000);
    pending.set(id, {resolve, reject, timer}); worker.postMessage({id, operation, ...data});
  });
}
function message(text, error = false) {
  const el = document.querySelector('#message'); el.textContent = text; el.className = 'visible' + (error ? ' error' : '');
  clearTimeout(messageTimer);messageTimer=setTimeout(()=>el.className='',9000);
}
function clearMessage() { document.querySelector('#message').className = ''; }
async function assess() {
  const assessment = await request('assess', {definition});
  plan = assessment.plan; code = assessment.code;
  return assessment;
}
function accountProviders() {
  return Object.entries(catalog).filter(([,p]) => definition.steps.some(s => p.kinds.includes(s.kind)));
}
const connected = () => accountProviders().every(([id]) => accounts.has(id));
function navigate(step) { chapter = step; location.hash = 'walkthrough'; render(); window.scrollTo(0,0); }
function banner() { return '<div class="demo-banner"><span class="demo-dot"></span><strong>Browser demo</strong><span>Real import & compilation. Simulated accounts and API responses. No exports leave your device.</span></div>'; }
function intro() {
  return `<section class="intro"><div class="intro-text"><p class="kicker">Workflow compiler</p><h1>Your workflow.<br>Your code.</h1><p class="lead">Import, review and test a workflow export.</p><p>Unzap reads a Zapier export, reconstructs the branches, and turns supported steps into inspectable JavaScript. Review the mappings, test the behavior, then take the code with you.</p><div class="intro-actions"><button class="primary" data-action="sample">Walk through a migration <span>→</span></button><button data-action="upload">Try your own export ↗</button></div><p class="caption">About 3 minutes · No signup · Runs on your device</p></div><div class="intro-specimen"><div class="specimen-title"><span>THE EXAMPLE</span><span>01 / SERVICE REQUESTS</span></div><h2>Example: create or update a ticket</h2><div class="mini-route"><span>Webhook</span><i>↓</i><span>Find ticket</span><i>↓</i><div><span>Exists → update</span><span>Missing → create</span></div></div><p>A small workflow with a real migration challenge: preserve the data mappings and keep the branches from crossing.</p><div class="specimen-foot">ZAP EXPORT <span>→</span> OWNED JAVASCRIPT</div></div></section><section class="promise"><div><span>01</span><h3>Inspect the conversion</h3><p>Follow each source step into its adapter and field mappings. Unsupported actions stay visible.</p></div><div><span>02</span><h3>Test what changes</h3><p>Try both branches and a destination failure. Inspect the requests and the skipped steps.</p></div><div><span>03</span><h3>Inspect the implementation</h3><p>Download the generated workflow, or explore the model and runtime behind the full application.</p></div></section>${engineeringTeaser()}`;
}
function engineeringTeaser() { return '<a class="engineering-teaser" href="#engineering"><span>FOR THE TECHNICAL READER</span><strong>Compiler, model and runtime</strong><span>Explore the engineering →</span></a>'; }
function importStage() {
  return `<div class="workspace-title"><div><p class="kicker">01 / BRING THE WORKFLOW</p><h1>Import a workflow export</h1><p>Upload Zap JSON or use the original synthetic sample. Processing stays in this browser tab. JSON exports up to 4 MB and 200 workflows are supported here. ZIP backups belong in the self-hosted application.</p></div></div><div class="intro-actions"><button class="primary" data-action="upload">Choose a JSON export ↗</button><button data-action="sample">Load the sample</button></div><div class="success-note">Loaded: ${esc(sourceName)} · ${definitions.length} workflow${definitions.length===1?'':'s'}. Files are held in memory and cleared when you reload.</div><div class="stage-actions"><button data-action="restart">Start over</button><button class="primary" data-chapter="1">Review the conversion →</button></div>`;
}
function stepsNav() {
  return `<nav class="chapters" aria-label="Migration stages">${chapters.map((name,i) => `<button data-chapter="${i}" ${i>chapter && !(i===2&&plan?.ready) ? 'disabled' : ''} ${i===chapter?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${name}${i<chapter?'<b aria-label="visited">✓</b>':''}</button>`).join('')}</nav>`;
}
function graph() {
  // A parent-linked forest is laid out without changing source order or semantics.
  // Iterative traversal also keeps malformed/cyclic imports safe to inspect.
  const steps=definition.steps, byId=new Map(steps.map(s=>[s.id,s]));
  const children=new Map(steps.map(s=>[s.id,[]]));
  for(const step of steps) if(byId.has(step.parent_id)) children.get(step.parent_id).push(step);
  const visited=new Set(), positions=new Map();
  let lane=0;
  const roots=[...steps.filter(s=>!byId.has(s.parent_id)),...steps];
  for(const step of roots){
    if(visited.has(step.id))continue;
    const stack=[{step,depth:0,done:false}];
    while(stack.length){
      const item=stack.pop(), id=item.step.id;
      if(item.done){
        const placed=children.get(id).filter(s=>positions.has(s.id)).map(s=>positions.get(s.id).y);
        positions.set(id,{x:44+item.depth*226,y:placed.length?(placed[0]+placed.at(-1))/2:44+lane++*158});
      }else if(!visited.has(id)){
        visited.add(id);stack.push({...item,done:true});
        for(const child of [...children.get(id)].reverse()) if(!visited.has(child.id)) stack.push({step:child,depth:item.depth+1,done:false});
      }
    }
  }
  const width=Math.max(440,...[...positions.values()].map(p=>p.x+222));
  const height=Math.max(320,...[...positions.values()].map(p=>p.y+146));
  const trace = new Map((result?.trace||[]).map(t => [t.step_id,t.status]));
  const edges=steps.filter(s=>positions.has(s.parent_id)).map(s=>{
    const from=positions.get(s.parent_id),to=positions.get(s.id),x=from.x+178,y=from.y+43,tx=to.x,ty=to.y+43;
    const active=selected===s.id||selected===s.parent_id;
    return `<path class="workflow-edge ${active?'selected':''}" data-from="${esc(s.parent_id)}" data-to="${esc(s.id)}" d="M${x},${y} C${x+28},${y} ${tx-28},${ty} ${tx},${ty}" marker-end="url(#workflow-arrow)"/>`;
  }).join('');
  const nodes=steps.map(s=>{
    const p=positions.get(s.id),status=trace.get(s.id),label=status||(s.kind==='unsupported'?'Needs adapter':s.review_required?'Review mapping':'Mapped');
    const family=s.kind.startsWith('airtable')?'airtable':s.kind==='paths'||s.kind==='path'?'branch':s.kind==='formatter'?'formatter':s.kind==='webhook'?'trigger':'action';
    const glyph={airtable:'▦',branch:'⑂',formatter:'ƒx',trigger:'↯',action:'↗'}[family];
    return `<button class="workflow-node ${family} ${selected===s.id?'selected':''} ${status||''}" data-step="${esc(s.id)}" style="left:${p.x}px;top:${p.y}px" aria-pressed="${selected===s.id}" aria-label="Step ${esc(s.id)}: ${esc(s.name)}. ${esc(label)}"><span class="workflow-port in" aria-hidden="true"></span><span class="workflow-app" aria-hidden="true">${glyph}</span><span class="workflow-node-copy"><small>${esc(s.kind==='path'?s.params.mode==='fallback'?'FALLBACK PATH':s.params.mode==='always'?'ALWAYS-RUN PATH':'CONDITIONAL PATH':actions[s.kind]?.label||s.source_action)}</small><strong>${esc(s.name)}</strong></span><span class="workflow-node-status ${s.review_required?'review':''}">${esc(label)}</span><span class="workflow-port out" aria-hidden="true"></span></button>`;
  }).join('');
  return `<div class="graph-title"><div><span class="graph-live-dot"></span><h3>Workflow canvas</h3><span>${steps.length} steps · ${steps.filter(s=>s.kind==='path').length} paths</span></div><div class="canvas-tools" role="group" aria-label="Workflow canvas controls"><button data-canvas="out" aria-label="Zoom out">−</button><output id="canvas-zoom" aria-live="polite">100%</output><button data-canvas="in" aria-label="Zoom in">+</button><button data-canvas="fit">Fit</button><button data-canvas="selected" aria-label="Centre selected step">⌖</button></div></div><div class="workflow-viewport" tabindex="0" role="region" aria-label="Workflow canvas. Drag the background or use arrow keys to pan; use plus, minus or zero to zoom and fit."><div class="workflow-world" style="width:${width}px;height:${height}px" data-width="${width}" data-height="${height}"><svg class="workflow-edges" width="${width}" height="${height}" aria-hidden="true"><defs><marker id="workflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs>${edges}</svg>${nodes}</div></div><div class="canvas-legend"><span>Drag to pan · Ctrl + scroll to zoom</span><span><i></i> Mapping needs review</span></div>`;
}
function setupCanvas(){
  const viewport=root.querySelector('.workflow-viewport'),world=root.querySelector('.workflow-world');
  if(!viewport||!world)return;
  const width=Number(world.dataset.width),height=Number(world.dataset.height);
  function paint(){world.style.transform=`translate(${canvasView.x}px,${canvasView.y}px) scale(${canvasView.zoom})`;root.querySelector('#canvas-zoom').textContent=Math.round(canvasView.zoom*100)+'%';}
  function fit(){const zoom=Math.min(1,(viewport.clientWidth-36)/width,(viewport.clientHeight-36)/height);canvasView={zoom:Math.max(.08,zoom),x:(viewport.clientWidth-width*zoom)/2,y:(viewport.clientHeight-height*zoom)/2,fitted:true};paint();}
  function zoomTo(value,px=viewport.clientWidth/2,py=viewport.clientHeight/2){const zoom=Math.max(.08,Math.min(2,value)),ratio=zoom/canvasView.zoom;canvasView={zoom,x:px-(px-canvasView.x)*ratio,y:py-(py-canvasView.y)*ratio,fitted:false};paint();}
  function command(action){
    if(action==='fit')fit();
    else if(action==='selected'){const node=world.querySelector('.workflow-node.selected');if(node){canvasView={zoom:1,x:viewport.clientWidth/2-node.offsetLeft-node.offsetWidth/2,y:viewport.clientHeight/2-node.offsetTop-node.offsetHeight/2,fitted:false};paint();}}
    else zoomTo(canvasView.zoom*(action==='in'?1.2:1/1.2));
  }
  canvasCommand=command;
  root.querySelectorAll('[data-canvas]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.canvas)));
  if(canvasView)paint();else {fit();if(canvasView.zoom<.7)command('selected');}
  canvasObserver=new ResizeObserver(()=>{if(canvasView.fitted)fit();});canvasObserver.observe(viewport);
  let drag;
  viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button')||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:canvasView.x,top:canvasView.y};viewport.setPointerCapture(event.pointerId);viewport.classList.add('panning');});
  viewport.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;canvasView.x=drag.left+event.clientX-drag.x;canvasView.y=drag.top+event.clientY-drag.y;canvasView.fitted=false;paint();});
  const endDrag=()=>{drag=null;viewport.classList.remove('panning');};
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('wheel',event=>{if(!event.ctrlKey)return;event.preventDefault();const box=viewport.getBoundingClientRect();zoomTo(canvasView.zoom*Math.exp(-event.deltaY*.003),event.clientX-box.left,event.clientY-box.top);},{passive:false});
  viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;const action={'+':'in','=':'in','-':'out','0':'fit'}[event.key];if(action){event.preventDefault();command(action);}else if(event.key.startsWith('Arrow')){event.preventDefault();canvasView.x+=({ArrowLeft:40,ArrowRight:-40}[event.key]||0);canvasView.y+=({ArrowUp:40,ArrowDown:-40}[event.key]||0);canvasView.fitted=false;paint();}});
  viewport.addEventListener('focusin',event=>{const node=event.target.closest('.workflow-node');if(!node)return;const rect=node.getBoundingClientRect(),frame=viewport.getBoundingClientRect();if(rect.left<frame.left||rect.right>frame.right||rect.top<frame.top||rect.bottom>frame.bottom){viewport.scrollLeft=0;viewport.scrollTop=0;canvasView.x=viewport.clientWidth/2-(node.offsetLeft+node.offsetWidth/2)*canvasView.zoom;canvasView.y=viewport.clientHeight/2-(node.offsetTop+node.offsetHeight/2)*canvasView.zoom;canvasView.fitted=false;paint();}});
}
function inspector() {
  const s=definition.steps.find(s=>s.id===selected)||definition.steps[0];
  if(!s)return '<p>No source steps were found. Try another export.</p>';
  const related=plan.issues.filter(i=>String(i.step_id)===s.id);
  return `<div class="inspector-head"><p class="kicker">STEP INSPECTOR</p><label for="inspect-step">Choose a step</label><select id="inspect-step">${definition.steps.map(n=>`<option value="${esc(n.id)}" ${s.id===n.id?'selected':''}>${esc(n.id+' · '+n.name)}</option>`).join('')}</select><h2>${esc(s.name)}</h2></div><dl class="step-meta"><div><dt>Source</dt><dd>${esc(s.source_app)}<br>${esc(s.source_action)}</dd></div><div><dt>Adapter</dt><dd>${esc(actions[s.kind]?.label||'Unsupported')}</dd></div></dl>${mappingSummary(s)}<details class="mapping-json"><summary>Inspect mapped JSON</summary><pre class="parameters">${esc(json(s.params))}</pre></details><details class="mapping-json"><summary>Compare source parameters</summary><pre class="parameters">${esc(json(s.source_params||s.params))}</pre></details>${related.length?`<div class="issues">${related.map(i=>`<p>${esc(i.message)}</p>`).join('')}</div>`:''}${s.review_required?`<button class="primary" data-action="approve-step">Approve this mapping ✓</button>`:''}${s.kind==='unsupported'?'<p class="caption">This action has no supported adapter. The demo will not invent an implementation or produce executable code for it.</p>':''}`;
}
function mappingSummary(s) {
  const p=s.params, rows=[];
  if(p.table)rows.push(['Destination table',p.table]);
  if(s.kind==='airtable_find')rows.push(['Search field',p.field||p.formula],['Match value',p.value],['When missing',p.on_missing],['Multiple matches',p.multiple]);
  if(p.record)rows.push(['Record to update',p.record]);
  if(p.fields)for(const [name,value] of Object.entries(p.fields))rows.push([name,value]);
  if(p.channel)rows.push(['Channel',p.channel]);
  if(p.text)rows.push(['Message',p.text]);
  if(p.url)rows.push(['Request URL',p.url],['Method',p.method||s.source_action]);
  if(s.kind==='formatter')rows.push(['Operation',p.transform],['Input',p.inputs]);
  if(s.kind==='path')rows.push(['Branch behavior',p.mode],['Order',p.order]);
  if(s.kind==='webhook')return '<p class="mapping-explanation">The incoming JSON becomes step 1’s output. Later steps reference its fields directly.</p>';
  if(s.kind==='paths')return '<p class="mapping-explanation">Evaluate child paths in source order. A fallback runs only when no other path matched.</p>';
  return rows.length?`<h3 class="mapping-title">What this step will do</h3><dl class="mapping-rows">${rows.map(([name,value])=>{const m=typeof value==='string'&&value.match(/^\{\{(\d+)__(.+)\}\}$/);const text=m?'Step '+m[1]+' → '+m[2]:typeof value==='object'?json(value):String(value??'—');return `<div><dt>${esc(name)}</dt><dd>${esc(text)}</dd></div>`;}).join('')}</dl>`:'';
}
function review() {
  const reviews=definition.steps.filter(s=>s.review_required).length;
  const blockers=plan.issues.filter(i=>i.code!=='mapping_review');
  return `<div class="workspace-title"><div><p class="kicker">02 / REVIEW THE TRANSLATION</p><h1>Review the generated workflow</h1><p>Read the parameters before approving a mapping. Each branch and field reference comes from the source export.</p></div><div class="review-count"><strong>${reviews}</strong><span>mappings to review</span></div></div><div class="workflow-switch"><label for="workflow-choice">Imported workflow</label><select id="workflow-choice">${definitions.map((d,i)=>`<option value="${i}" ${d===definition?'selected':''}>${esc(d.name)}</option>`).join('')}</select><span>${esc(sourceName)} · ${definitions.length} workflow${definitions.length===1?'':'s'}</span></div><div class="review-layout"><section class="graph-panel">${graph()}</section><aside class="inspector">${inspector()}</aside></div>${plan.issues.length?`<details class="all-issues"><summary>Conversion checks · ${plan.issues.length} outstanding</summary>${plan.issues.map(i=>`<p><strong>${esc(i.step_id?'Step '+i.step_id:'Workflow')}</strong> ${esc(i.message)}</p>`).join('')}</details>`:'<div class="success-note">✓ Structural checks passed. This means the supported definition compiles. It does not establish parity with your live Zap.</div>'}<div class="stage-actions"><button data-action="upload">Import another export</button><div><span class="caption">${blockers.length?'Resolve the listed issues before continuing.':reviews?'Approve mappings individually in the inspector.':'Ready to choose accounts.'}</span><button class="primary" data-action="connect" ${!plan.ready?'disabled':''}>Choose accounts →</button></div></div>`;
}
function connections() {
  const required=accountProviders();
  return `<div class="workspace-title"><div><p class="kicker">03 / CONNECT ONCE</p><h1>Connect accounts</h1><p>Choose which account the workflow uses. Multiple credentials for the same app stay separate in the full installation.</p></div></div><div class="connection-layout"><section class="demo-accounts">${required.map(([id,p])=>{const used=definition.steps.filter(s=>p.kinds.includes(s.kind));return `<article class="demo-account"><span class="app-mark">${esc(p.mark)}</span><div><h2>${esc(p.label)}</h2><p>${accounts.has(id)?'Demo Operations account assigned':'Account required'} · ${used.length} steps</p><small>Steps ${used.map(s=>esc(s.id)).join(', ')}</small></div><button data-demo-connect="${id}" ${accounts.has(id)?'disabled':''}>${accounts.has(id)?'Demo account connected ✓':'Connect demo account'}</button></article>`;}).join('')||'<div class="success-note">This workflow has no app-account adapters. HTTP credentials, if any, are represented by demo placeholders.</div>'}<div class="stage-actions"><button data-chapter="1">← Review mappings</button><button class="primary" data-action="test" ${!connected()?'disabled':''}>Test the branches →</button></div></section><aside class="margin-note"><p class="kicker">WHAT HAPPENS IN THE REAL APP?</p><h3>Provider sign-in</h3><p>Google, Airtable and Slack accounts use their provider’s authorization screen. The server stores tokens encrypted and renews them before live actions.</p><p>OAuth application registration belongs in administrator settings. A user only connects their own account.</p><div class="honesty-note">This button assigns a simulated account. It does not open an OAuth flow or access your account.</div></aside></div>`;
}
function runEvidence() {
  if(!result)return '<div class="run-empty"><span>↳</span><h3>Configure the test event</h3><p>Run the selected case to see the actual compiled workflow take a branch.</p></div>';
  const panels={
    trace:`<ol class="run-trace">${result.trace.map(t=>`<li class="${esc(t.status)}"><span class="trace-state">${t.status==='succeeded'?'✓':t.status==='skipped'?'–':'!'}</span><span><strong>Step ${esc(t.step_id)} · ${esc(definition.steps.find(s=>s.id===t.step_id)?.name||t.kind)}</strong>${t.error?`<small>${esc(t.error)}</small>`:''}</span><span class="trace-label">${esc(t.status)}</span></li>`).join('')}</ol>`,
    requests:result.requests.map(r=>`<article class="request"><div><strong>${esc(r.method)}</strong><span>${esc(r.url)}</span></div><pre>${esc(json({headers:r.headers,...(r.body?{body:tryJson(r.body)}:{})}))}</pre></article>`).join('')||'<p class="caption">No outbound requests were constructed for this case.</p>',
    outputs:`<pre class="output-json">${esc(json(result.outputs))}</pre>`,
  };
  return `<div class="run-summary ${result.status}"><strong>${result.status==='succeeded'?'Completed':result.status==='held'?'Held for review':'Filtered'}</strong><span>${result.trace.filter(t=>t.status==='succeeded').length} completed · ${result.trace.filter(t=>t.status==='skipped').length} skipped · ${result.requests.length} simulated requests</span></div>${result.error?`<p class="run-error">${esc(result.error)}</p>`:''}<div class="run-tabs" role="tablist" aria-label="Run evidence">${['trace','requests','outputs'].map(t=>`<button role="tab" aria-selected="${runTab===t}" data-run-tab="${t}">${t==='requests'?'API requests':t==='outputs'?'Step outputs':'Step trace'}</button>`).join('')}</div><section class="run-evidence" role="tabpanel" aria-label="${esc(runTab)}">${panels[runTab]}</section>`;
}
function tryJson(value){try{return JSON.parse(value);}catch{return value;}}
function testStage() {
  return `<div class="workspace-title"><div><p class="kicker">04 / VERIFY BEFORE YOU MOVE</p><h1>Inspect the execution trace</h1><p>${isSample?'Try an existing ticket, a missing ticket, and a write failure. The branch decisions execute in your browser.':'Supply a representative webhook payload. API responses use synthetic adapter fixtures and may need fields specific to your workflow.'}</p></div></div><div class="test-layout"><section class="event-editor"><label for="scenario">Response scenario · simulated</label><select id="scenario"><option value="new" ${scenario==='new'?'selected':''}>Lookup returns no record</option><option value="existing" ${scenario==='existing'?'selected':''}>Lookup returns an existing record</option><option value="failure" ${scenario==='failure'?'selected':''}>Destination write fails</option></select><label for="event-input">Incoming webhook JSON</label><textarea id="event-input" spellcheck="false">${esc(eventText)}</textarea><button class="primary" data-action="run" ${busy?'disabled':''}>${busy?'Running local code…':'Run this case →'}</button><div class="honesty-note">Requests are constructed by the real adapters, then answered with synthetic responses. No destination is contacted. A browser trace does not exercise the server’s durable journal.</div></section><section class="result-panel" aria-live="polite">${runEvidence()}</section></div><div class="stage-actions"><button data-chapter="2">← Accounts</button><button class="primary" data-action="export" ${!result?'disabled':''}>Inspect & download code →</button></div>`;
}
function exportStage() {
  return `<div class="workspace-title"><div><p class="kicker">05 / THE WORKFLOW IS YOURS</p><h1>Download the generated code</h1><p>This is the JavaScript produced from your reviewed definition. The self-hosted application also exports a Node.js runtime with Docker configuration.</p></div><button class="primary" data-action="download-code">Download workflow.mjs ↓</button></div><div class="code-layout"><section class="code-panel"><div class="code-heading"><span>workflow.mjs</span><span>GENERATED FROM ${esc(sourceName)}</span></div><pre><code>${esc(code)}</code></pre></section><aside class="margin-note"><p class="kicker">BEFORE PRODUCTION</p><h3>Implementation details</h3><p>The downloaded file needs the Unzap runtime context. It is not a complete standalone deployment.</p><ul><li>Configure fresh accounts on your own installation.</li><li>Compare real request and response fixtures against the original workflow.</li><li>Test permissions, duplicates and uncertain writes in a sandbox.</li></ul><button data-action="download-definition">Download reviewed definition ↓</button><a class="text-link" href="#engineering">Explore the runtime & model →</a><p class="caption">No platform task meter in the exported runtime. Hosting and third-party API costs still apply.</p></aside></div><div class="stage-actions"><button data-chapter="3">← Test another case</button><button data-action="restart">Start a new migration ↻</button></div>`;
}
function engineering() {
  return `<section class="technical-intro"><p class="kicker">ENGINEERING NOTES / UNZAP</p><h1>Migration model and compiler</h1><p class="lead">The model proposes. Structural checks and behavior tests decide what can proceed.</p><a class="text-link" href="${definition?'#walkthrough':'#'}">← Back to ${definition?'your migration':'the walkthrough'}</a></section><div class="architecture"><span>Zap export</span><i>→</i><span>Source graph</span><i>→</i><span>Adapter proposal</span><i>→</i><span>Review & checks</span><i>→</i><span>JavaScript</span><i>→</i><span>Journaled runtime</span></div><section class="technical-sections"><article><span class="technical-num">01</span><div><h2>Export parsing and workflow structure</h2><p>The importer reconstructs parent-linked graphs, resolves supported field references, replaces recognized secrets with environment bindings, and proposes adapters. Branch order, always-run paths and fallback paths remain explicit. Missing adapters and unsafe structures block compilation.</p><p class="technical-boundary">This demo runs the same importer, validator, graph compiler and request adapters as the server. A Web Worker keeps processing away from the interface.</p><div class="file-list"><code>src/importer.js</code><code>src/migration.js</code><code>src/graph-compiler.js</code><code>src/import-adapters.js</code></div></div></article><article><span class="technical-num">02</span><div><h2>Model proposals and validation</h2><p>The local application can use a Qwen2.5-Coder 7B adapter trained on sanitized export structures. Its migration loop proposes a supported definition and runs deterministic validation. Review remains explicit and unsupported behavior cannot be waved through by confident prose.</p><p class="technical-boundary">The public walkthrough does not run that model. It uses deterministic adapter mappings. Prior model checks used examples from the training source corpus, so they are not evidence of independent generalization.</p><div class="file-list"><code>src/agent-api.js</code><code>finetune/</code><code>test/trained-agent.test.js</code></div></div></article><article><span class="technical-num">03</span><div><h2>Recovery has to respect the write that may have happened.</h2><p>The server runtime journals steps in SQLite, pins workflow versions and claims idempotency keys. Completed steps can be reused. An interrupted external write becomes an uncertain hold that needs reconciliation, rather than a blind retry.</p><p class="technical-boundary">This is not an exactly-once guarantee for third-party APIs. The browser replay has no durable journal and does not demonstrate server restart recovery.</p><div class="file-list"><code>src/runner.js</code><code>src/store.js</code><code>test/restart-adapters.test.js</code></div></div></article><article><span class="technical-num">04</span><div><h2>Accounts belong to the installation, not each step.</h2><p>Named accounts are reused across workflows. OAuth app registration lives in administrator settings. The server handles browser-bound authorization state, PKCE, sealed credentials, refresh leases and action-specific scope checks.</p><p class="technical-boundary">Provider registration and real consent need separate verification. A successful mocked refresh test is not a successful Google login.</p><div class="file-list"><code>src/oauth.js</code><code>src/oauth-store.js</code><code>test/oauth.test.js</code></div></div></article></section><section class="technical-close"><h2>What to look for in a deeper review</h2><p>Read the branch tests, exact request fixtures and interrupted-write cases. They explain more about the migration contract than a chat transcript does.</p><p>The full repository includes setup instructions, the migration agent, compiler, runtime, and tests. You can also read source snapshots below or download the generated workflow in this demo.</p><a class="text-link" href="#walkthrough">Try the conversion →</a></section>`;
}
function render() {
  canvasObserver?.disconnect();canvasCommand=null;
  const technical=location.hash==='#engineering';
  const sourceMode=location.hash.startsWith('#source/');
  root.innerHTML=banner()+(sourceMode?sourceView():technical?engineering():!definition?intro():`<section class="walkthrough">${stepsNav()}${chapter===0?importStage():chapter===1?review():chapter===2?connections():chapter===3?testStage():exportStage()}</section>`)+ '<input id="export-file" type="file" accept=".json,application/json" hidden>';
  setupCanvas();
  if(technical){const close=root.querySelector('.technical-close');close.insertAdjacentHTML('beforeend',`<a class="text-link" href="https://github.com/zulfkicar/unzap" target="_blank" rel="noopener noreferrer">Open the full repository ↗</a><div class="source-browser-links"><h3>Read the implementation</h3>${sourceFiles.map(f=>`<a href="#source/${f}">${esc(f)} ↗</a>`).join('')}</div>`);}
}
function sourceView() {
  const name=location.hash.slice('#source/'.length), known=sourceFiles.includes(name);
  if(!known)return '<section class="technical-close"><h1>Source file not found</h1><a class="text-link" href="#engineering">← Engineering notes</a></section>';
  if(sourceOpen!==name){sourceOpen=name;sourceCode='Loading source…';fetch('./source/'+name.replaceAll('/','-')+'.txt').then(async response=>{if(!response.ok)throw Error('Source snapshot is unavailable');return response.text();}).then(text=>{if(sourceOpen===name){sourceCode=text;render();}}).catch(error=>{if(sourceOpen===name){sourceCode=error.message;render();}});}
  return `<section class="technical-intro"><p class="kicker">SOURCE DEEP DIVE</p><h1>${esc(name)}</h1><p class="caption">Source snapshot from the demo build. Imported exports are never included in these files.</p><a class="text-link" href="#engineering">← Engineering notes</a></section><div class="source-layout"><nav aria-label="Source files">${sourceFiles.map(f=>`<a href="#source/${f}" ${name===f?'aria-current="page"':''}>${esc(f)}</a>`).join('')}</nav><pre class="source-code"><code>${esc(sourceCode)}</code></pre></div>`;
}
async function loadSource(source, name, sample) {
  const generation=++epoch;
  const parsed=await request('import',{source});
  if(generation!==epoch)return;
  if(!parsed.definitions.length)throw Error('The export contains no workflows.');
  definitions=parsed.definitions; definition=definitions[0]; plan=parsed.plans[0];canvasView=null;
  actions=parsed.actions; catalog=parsed.providers; sourceName=name; isSample=sample;
  selected=definition.steps.find(s=>s.review_required)?.id||definition.steps[0]?.id; accounts=new Set(); result=null; code=null; chapter=1; eventText=json(sample?{request_id:'  REQ-1042  ',summary:'Replace the meeting-room projector'}:{});
  await assess(); location.hash='walkthrough'; render();
  message(sample?'Sample loaded. Select a step to review its mapped parameters.':'Export processed on your device. Nothing was uploaded or saved.');
}
function download(name, contents) {
  const url=URL.createObjectURL(new Blob([contents],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
root.addEventListener('click', async e => {
  const button=e.target.closest('button');if(!button||button.disabled)return;
  clearMessage();
  try {
    if(button.dataset.chapter)navigate(Number(button.dataset.chapter));
    if(button.dataset.step){selected=button.dataset.step;render();root.querySelector('.workflow-node.selected')?.focus({preventScroll:true});}
    if(button.dataset.demoConnect){const provider=button.dataset.demoConnect;for(const s of definition.steps)if(catalog[provider].kinds.includes(s.kind))s.params.connection='DEMO_'+provider.toUpperCase()+'_OPERATIONS';accounts.add(provider);await assess();render();message('Simulated account assigned across matching steps. No credentials were requested.');}
    if(button.dataset.runTab){const input=document.querySelector('#event-input')?.value;runTab=button.dataset.runTab;render();if(input)document.querySelector('#event-input').value=input;}
    switch(button.dataset.action){
      case 'sample': button.disabled=true;await loadSource(await (await fetch('./sample.json')).json(),'service-request.zap.json',true);break;
      case 'upload': document.querySelector('#export-file').click();break;
      case 'approve-step':definition.steps.find(s=>s.id===selected).review_required=false;result=null;await assess();selected=definition.steps.find(s=>s.review_required)?.id||selected;render();if(!canvasView?.fitted)canvasCommand?.('selected');message(plan.ready?'All required mappings reviewed. Choose accounts to continue.':'Mapping approved. The next mapping is selected for review.');break;
      case 'connect':navigate(2);break;
      case 'test':navigate(3);break;
      case 'run': {
        const input=JSON.parse(document.querySelector('#event-input').value);
        if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Use a JSON object as the webhook payload.');
        scenario=document.querySelector('#scenario').value;busy=true;render();document.querySelector('#event-input').value=json(input);
        try {result=await request('replay',{definition,input,options:{found:scenario==='existing',fail:scenario==='failure'}});}finally{busy=false;render();}
        break;
      }
      case 'export':navigate(4);break;
      case 'download-code':download('workflow.mjs',code);message('Downloaded the generated workflow. It requires the runtime context described beside the code.');break;
      case 'download-definition':download('workflow-definition.json',json(definition));break;
      case 'restart':definition=null;definitions=[];result=null;accounts.clear();location.hash='';render();break;
    }
  }catch(error){const wasBusy=busy;busy=false;button.disabled=false;if(wasBusy)render();message(error.message,true);}
});
root.addEventListener('change',async e=>{
  try {
    if(e.target.id==='export-file'){
      const file=e.target.files[0];if(!file)return;
      if(file.size>4*1024*1024)throw Error('The browser demo accepts JSON exports up to 4 MB. Use the self-hosted app for larger JSON or ZIP archives.');
      await loadSource(await file.text(),file.name,false);
    }else if(e.target.id==='workflow-choice'){
      definition=definitions[Number(e.target.value)];selected=definition.steps[0]?.id;result=null;canvasView=null;accounts.clear();await assess();render();
    }else if(e.target.id==='inspect-step'){selected=e.target.value;render();canvasCommand?.('selected');}
    else if(e.target.id==='scenario'){scenario=e.target.value;result=null;render();}
  }catch(error){message(error.message,true);}
});
root.addEventListener('input',e=>{if(e.target.id==='event-input')eventText=e.target.value;});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
render();
