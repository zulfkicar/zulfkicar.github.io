import {projects,topics,byId,topicById,escape,installCommandPalette,groupedOptions} from './shared.mjs?v=20261105-curated';
import {projectFromHash} from './content.mjs';
import {initialState,reduce} from './state.mjs';
import {catalogueMarkup,catalogueTitle} from './catalogue.mjs?v=20261105-curated';
import {projectPage} from './project-page.mjs?v=curated-preview';
import {architectures} from '/architecture-data.mjs?v=20261101-r9';
import '/architecture-more.mjs?v=20261101-r9';
import '/architecture-runtime.mjs?v=20261101-r9';

const tree=document.querySelector('#project-tree'),tabList=document.querySelector('#project-tabs'),panel=document.querySelector('#project-panel'),path=document.querySelector('#editor-path'),mobile=document.querySelector('#mobile-project');
let state=initialState(projectFromHash(location.hash).id),expanded=null;
let collectionOptions={topic:'all',query:'',sort:'collection'};
if(window.self!==window.top)document.documentElement.dataset.embedded='true';
tree.innerHTML=topics.map(topic=>`<details open><summary><button type="button" class="collection-title" data-collection="${topic.id}">${escape(topic.name)}</button><span>${projects.filter(p=>p.category===topic.id).length}</span></summary>${projects.filter(p=>p.category===topic.id).map(project=>`<button type="button" data-project="${project.id}">${escape(project.title)}</button>`).join('')}</details>`).join('');
mobile.innerHTML='<option value="all">All projects</option><optgroup label="Collections">'+topics.map(t=>`<option value="topic:${t.id}">${escape(t.name)}</option>`).join('')+'</optgroup><option value="about">About me</option>'+groupedOptions(state.selected);
function select(id,{history=true}={}){if(!Object.hasOwn(byId,id)||panel.dataset.view==='project'&&state.selected===id)return;state=reduce(state,{type:'select',id});if(history)window.history.pushState(null,'',`#${state.selected}`);render();}
function showCatalogue({history:record=true}={}){
 expanded?.close();if(record){const url=new URL(location.href);url.hash='';if(collectionOptions.topic==='all')url.searchParams.delete('topic');else url.searchParams.set('topic',collectionOptions.topic);history.pushState(null,'',url.pathname+url.search);}
 document.title='Projects · Zulfiqar Ali';path.innerHTML='<span>Workspace</span><span aria-hidden="true">/</span><span>Projects</span>';
 document.querySelector('.workspace-project-bar').hidden=true;mobile.value=collectionOptions.topic==='all'?'all':`topic:${collectionOptions.topic}`;panel.setAttribute('role','region');panel.setAttribute('aria-label','Project collection');panel.dataset.view='catalogue';
 panel.innerHTML=`<div class="catalogue-intro"><div><h1>${escape(catalogueTitle(collectionOptions.topic))}</h1><p>${collectionOptions.topic==='publications'?'Published work will appear here as it becomes available.':'Working software. The thinking behind it. A few experiments along the way.'}</p></div></div><div class="catalogue-tools"><label class="catalogue-search"><span aria-hidden="true">⌕</span><input id="catalogue-query" type="search" aria-label="Filter project collection" placeholder="Filter projects…" value="${escape(collectionOptions.query)}"></label><label class="catalogue-sort">Order<select id="catalogue-sort"><option value="collection">Collection</option><option value="name" ${collectionOptions.sort==='name'?'selected':''}>Name</option></select></label></div><div id="catalogue-results"></div>`;
 refreshCatalogue();panel.scrollTop=0;document.querySelectorAll('[data-project]').forEach(button=>button.removeAttribute('aria-current'));setActivity('projects');
}
function refreshCatalogue(){const result=catalogueMarkup(collectionOptions);document.querySelector('#catalogue-results').innerHTML=result.html;document.querySelector('#status-project').textContent=`${result.count} ${collectionOptions.topic==='publications'?'publication':'project'}${result.count===1?'':'s'}`;}
function setActivity(value){document.querySelectorAll('[data-activity]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.activity===value)));}
function inspect(id){const graph=architectures[state.selected],node=graph?.nodes.find(node=>node.id===id);if(!node)return;const root=expanded?.open?expanded:panel;root.querySelector('#component-name').textContent=node.label;root.querySelector('#component-description').textContent=node.does;root.querySelector('#component-select').value=id;root.querySelectorAll('[data-node]').forEach(item=>{const selected=item.dataset.node===id;item.dataset.selected=String(selected);item.setAttribute('aria-pressed',String(selected));});}
function expandDiagram(){
 const layout=panel.querySelector('.flow-layout'),button=panel.querySelector('[data-full-architecture]');if(!layout||expanded)return;
 const anchor=document.createComment('diagram position');layout.before(anchor);
 const dialog=document.createElement('dialog');expanded=dialog;dialog.className='flow-fullscreen';dialog.setAttribute('aria-label',`${byId[state.selected].title} architecture diagram`);
 const heading=document.createElement('div');heading.className='flow-fullscreen-heading';
 const title=document.createElement('strong');title.textContent=`${byId[state.selected].title} / Architecture`;
 const close=document.createElement('button');close.type='button';close.className='concept-button';close.textContent='Close diagram ×';close.addEventListener('click',()=>dialog.close());
 heading.append(title,close);dialog.append(heading,layout);document.body.append(dialog);
 dialog.addEventListener('close',()=>{if(anchor.isConnected)anchor.replaceWith(layout);expanded=null;dialog.remove();if(button.isConnected)button.focus();},{once:true});dialog.showModal();
}
function renderTabs(){
 tabList.innerHTML=state.open.map(id=>`<div class="file-tab" data-selected="${id===state.selected}"><button type="button" role="tab" aria-selected="${id===state.selected}" tabindex="${id===state.selected?'0':'-1'}" aria-controls="project-panel" data-tab-project="${id}">${escape(byId[id].title)}</button>${state.open.length>1?`<button type="button" data-close-project="${id}" aria-label="Close ${escape(byId[id].title)} tab">×</button>`:''}</div>`).join('');
 tabList.querySelector('.file-tab[data-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function render(){
 expanded?.close();
 document.querySelector('.workspace-project-bar').hidden=false;panel.dataset.view='project';panel.setAttribute('role','tabpanel');
 const project=byId[state.selected];
 document.title=`${project.title} — Developer workbench · Zulfiqar Ali`;
 document.querySelectorAll('[data-project]').forEach(button=>{if(button.dataset.project===project.id)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
 mobile.value=project.id;
 renderTabs();
 path.innerHTML=`<span>portfolio</span><span aria-hidden="true">/</span><span>${topicById[project.category].short.toLowerCase()}</span><span aria-hidden="true">/</span><span>${escape(project.title)}</span>`;
 panel.innerHTML=projectPage(project,architectures[project.id]);
 panel.setAttribute('aria-label',`${project.title} project`);
 panel.scrollTop=0;
 if(architectures[project.id])inspect(architectures[project.id].nodes[0].id);
 document.querySelector('#status-project').textContent=project.title;
 document.querySelector('[data-activity=projects]').setAttribute('aria-pressed','true');document.querySelector('[data-activity=about]').setAttribute('aria-pressed','false');
}
tabList.addEventListener('click',event=>{const close=event.target.closest('[data-close-project]')?.dataset.closeProject;if(close){const previous=state.selected;state=reduce(state,{type:'close',id:close});history.replaceState(null,'',`#${state.selected}`);if(state.selected===previous)renderTabs();else render();return;}const id=event.target.closest('[data-tab-project]')?.dataset.tabProject;if(id)select(id);});
tabList.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.target.getAttribute('role')!=='tab')return;event.preventDefault();const index=state.open.indexOf(state.selected),id=state.open[(index+(event.key==='ArrowRight'?1:-1)+state.open.length)%state.open.length];select(id);tabList.querySelector(`[data-tab-project="${id}"]`).focus();});
document.addEventListener('click',event=>{const collection=event.target.closest('[data-collection]')?.dataset.collection;if(topics.some(topic=>topic.id===collection)){collectionOptions.topic=collection;collectionOptions.query='';showCatalogue();}const project=event.target.closest('[data-project]')?.dataset.project;if(project)select(project);if(event.target.closest('[data-full-architecture]'))expandDiagram();const id=event.target.closest('[data-node]')?.dataset.node;if(id)inspect(id);});
document.addEventListener('keydown',event=>{const id=event.target.closest('[data-node]')?.dataset.node;if(id&&['Enter',' '].includes(event.key)){event.preventDefault();inspect(id);}});
document.addEventListener('change',event=>{if(event.target.id==='component-select')inspect(event.target.value);});
mobile.addEventListener('change',()=>{if(mobile.value==='all'){collectionOptions.topic='all';showCatalogue();}else if(mobile.value==='about'){history.pushState(null,'','#about');showAbout();}else if(mobile.value.startsWith('topic:')){collectionOptions.topic=mobile.value.slice(6);collectionOptions.query='';showCatalogue();}else select(mobile.value);});
document.addEventListener('input',event=>{if(event.target.id==='catalogue-query'){collectionOptions.query=event.target.value;refreshCatalogue();}});
document.addEventListener('change',event=>{if(event.target.id==='catalogue-sort'){collectionOptions.sort=event.target.value;refreshCatalogue();}});
document.querySelector('#mobile-find').addEventListener('click',()=>document.querySelector('#search-projects').click());
function syncLocation(){const id=location.hash.slice(1),topic=new URLSearchParams(location.search).get('topic');collectionOptions.topic=topic==='finance'?'ai':topics.some(t=>t.id===topic)?topic:'all';if(id==='about')showAbout();else if(Object.hasOwn(byId,id))select(id,{history:false});else showCatalogue({history:false});}
window.addEventListener('hashchange',syncLocation);
window.addEventListener('popstate',syncLocation);
document.querySelector('[data-activity=projects]').addEventListener('click',()=>{collectionOptions.topic='all';showCatalogue();});
function showAbout(){
 expanded?.close();document.querySelector('.workspace-project-bar').hidden=true;panel.dataset.view='about';panel.setAttribute('role','region');mobile.value='about';document.title='About · Zulfiqar Ali';
 document.querySelector('[data-activity=projects]').setAttribute('aria-pressed','false');document.querySelector('[data-activity=about]').setAttribute('aria-pressed','true');
 path.textContent='portfolio / about';document.querySelector('#status-project').textContent='About';panel.setAttribute('aria-label','About Zulfiqar Ali');
 panel.innerHTML=`<div class="about-workbench"><p class="concept-kicker">About / Zulfiqar Ali</p><h1>Software, systems<br>and the details between.</h1><div class="about-row"><h2>Baam</h2><p>Built internal applications and integrations, then helped teams adopt and maintain them.</p></div><div class="about-row"><h2>Micro1</h2><p>Author TerminalBench, CyberSWE and CompCode tasks, including reference solutions, environments and automated graders.</p></div><div class="about-row"><h2>GIK Institute</h2><p>BS Artificial Intelligence · 2025. Graduated with Distinction. ICPC Asia Topi Regional Champion (2021), World Finals Honorable Mention (2024).</p></div><a class="concept-button primary" href="mailto:mzulfiqarali261@gmail.com">Get in touch ↗</a></div>`;
}
document.querySelector('[data-activity=about]').addEventListener('click',()=>{history.pushState(null,'','#about');showAbout();});
installCommandPalette({button:document.querySelector('#search-projects'),select});
syncLocation();
import '../site-polish.mjs';
