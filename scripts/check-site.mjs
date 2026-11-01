import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.argv[2]?path.resolve(process.argv[2]):fileURLToPath(new URL('../',import.meta.url));
const site='https://zulfkicar.github.io';
const inventory=JSON.parse(await readFile(path.join(root,'suite-inventory.json'),'utf8'));
const {architectures,validateArchitecture}=await import(pathToFileURL(path.join(root,'architecture-data.mjs')).href+'?v=20261101-r9');
await import(pathToFileURL(path.join(root,'architecture-more.mjs')).href+'?v=20261101-r9');
await import(pathToFileURL(path.join(root,'architecture-runtime.mjs')).href+'?v=20261101-r9');
const {caseArchitectures}=await import(pathToFileURL(path.join(root,'architecture-cases.mjs')).href+'?v=20261101-r9');
Object.assign(architectures,caseArchitectures);
for(const graph of Object.values(architectures))validateArchitecture(graph);
const broken=[],seen=new Set();let links=0,assets=0;
const text=async relative=>readFile(path.join(root,relative),'utf8');
async function resolve(raw,from,kind){
 if(!raw||/^(data:|blob:|mailto:|tel:|javascript:|#)/.test(raw)||raw.includes('${'))return;
 const url=new URL(raw.replaceAll('&amp;','&'),site+'/'+from);
 if(url.origin!==site)return;
 assert.ok(!url.pathname.startsWith('/preview/'),`Preview link: ${from} -> ${raw}`);
 const relative=decodeURIComponent(url.pathname.slice(1));
 try{const item=await stat(path.join(root,relative));if(item.isDirectory())await stat(path.join(root,relative,'index.html'));}
 catch{broken.push({from,kind,target:relative});return;}
 if(kind==='link')links++;else assets++;
 if(kind==='asset'&&/\.(?:mjs|js|css)$/.test(relative))await dependencies(relative);
}
async function dependencies(relative){
 if(seen.has(relative))return;seen.add(relative);
 const content=await text(relative);
 assert.ok(!content.includes('/preview/'),`Preview path in ${relative}`);
 const expressions=relative.endsWith('.css')?[/url\(\s*["']?([^\s)"']+)["']?\s*\)/g]:[/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?["']([^"']+)["']/g,/\bimport\(\s*["']([^"']+)["']\s*\)/g];
 for(const expression of expressions)for(const match of content.matchAll(expression))if(match[1].startsWith('.')||match[1].startsWith('/'))await resolve(match[1],relative,'asset');
}
for(const item of inventory.pages){
 const relative=item.route.endsWith('.html')?item.route:item.route+'index.html';
 const html=await text(relative);
 assert.ok(!/noindex|127\.0\.0\.1|localhost|\/preview\//.test(html),`Unpublished reference in ${relative}`);
 if(item.theme!=='404')assert.match(html,/<title>[^<]+<\/title>/);
 for(const match of html.matchAll(/<(a|script|link|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["'][^>]*>/g))await resolve(match[2],relative,match[1]==='a'?'link':'asset');
}
assert.deepEqual(broken,[],'Broken local project links or assets');
console.log(JSON.stringify({pages:inventory.pages.length,architectureGraphs:Object.keys(architectures).length,localLinks:links,assets,dependencyFiles:seen.size,broken:broken.length},null,2));
