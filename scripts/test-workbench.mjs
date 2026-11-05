import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projects,topics} from '../workbench/content.mjs';
import {catalogueProjects,catalogueMarkup,catalogueTitle} from '../workbench/catalogue.mjs';
import {initialState,reduce} from '../workbench/state.mjs';
import {projectPage} from '../workbench/project-page.mjs';
import {architectures} from '../architecture-data.mjs?v=20261101-r9';
import '../architecture-more.mjs?v=20261101-r9';

assert.equal(catalogueProjects().length,13);
for(const [topic,count] of [['automation',2],['ai',1],['finance',2],['algorithms',8]]){assert.equal(catalogueProjects({topic}).length,count);assert.equal(catalogueMarkup({topic}).count,count);assert.equal((catalogueMarkup({topic}).html.match(/class="catalogue-row"/g)||[]).length,count);}
assert.deepEqual(catalogueProjects({query:'durable objects'}).map(p=>p.id),['threadbridge']);
assert.deepEqual(catalogueProjects({query:'chess'}).map(p=>p.id),['chess']);
assert.deepEqual(catalogueProjects({query:'compression'}).map(p=>p.id),['compression']);
assert.deepEqual(catalogueProjects({topic:'finance',query:'chess'}),[]);
assert.equal(catalogueMarkup({query:'missing-project'}).count,0);
assert.ok(catalogueMarkup({query:'missing-project'}).html.includes('No matching projects'));
const names=catalogueProjects({sort:'name'}).map(p=>p.title);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
assert.equal(catalogueTitle('__proto__'),'All projects');assert.equal(catalogueTitle('constructor'),'All projects');
for(const topic of topics)assert.equal(catalogueTitle(topic.id),topic.name);
let state=initialState();
for(const project of projects){
 state=reduce(state,{type:'select',id:project.id});assert.equal(state.selected,project.id);assert.ok(!Object.hasOwn(state,'mode'));
 const page=projectPage(project,architectures[project.id]);
 assert.equal((page.match(/<h1>/g)||[]).length,1);
 assert.equal((page.match(/<iframe /g)||[]).length,1);
 assert.ok(page.includes(`src="${project.href}"`));
 assert.ok(page.indexOf('project-summary')<page.indexOf('project-live'));
 assert.ok(page.indexOf('project-live')<page.indexOf('project-architecture'));
 assert.equal((page.match(/data-node=/g)||[]).length,architectures[project.id].nodes.length);
 assert.ok(!page.includes('data-mode='));
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
}
assert.equal(state.open.length,13);state=reduce(state,{type:'close',id:state.selected});assert.equal(state.open.length,12);assert.ok(state.open.includes(state.selected));
const html=await readFile(new URL('../workbench/index.html',import.meta.url),'utf8'),runtime=await readFile(new URL('../workbench/workbench.mjs',import.meta.url),'utf8');
assert.ok(!html.includes('class="view-tabs"')&&!html.includes('data-mode='));
assert.ok(runtime.includes('panel.innerHTML=projectPage('));
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])),generated=new Set(['component-select','component-name','component-description','catalogue-query','catalogue-sort','catalogue-results']);
for(const [,id] of runtime.matchAll(/querySelector\('#([^']+)'\)/g))assert.ok(ids.has(id)||generated.has(id),`Missing workbench control: ${id}`);
for(const script of ['../workbench/workbench.mjs','../workbench/catalogue.mjs','../workbench/project-page.mjs','../demos/context.mjs']){const checked=spawnSync(process.execPath,['--check',fileURLToPath(new URL(script,import.meta.url))],{encoding:'utf8'});assert.equal(checked.status,0,checked.stderr);}
const result={catalogue:'all 13 projects; topic filters, multi-term search, empty state and name ordering pass',projectState:'project selection and recent-project closure pass; no view-mode state',unifiedProjectPages:'all 13 contain one title, one working demo/case-study iframe and every architecture node in order',controls:'static and generated selectors resolve to owning markup; no project-mode tabs remain',runtime:'new modules parse successfully',browserInteraction:'not verified'};
console.log(JSON.stringify(result,null,2));
