import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {architectureMap,sourceEdges} from './architecture-maps.mjs';
import {componentNotes} from '../case-studies/component-notes.mjs';
const theme=await readFile(new URL('../theme.js',import.meta.url),'utf8');
function browser({dark=false,stored=null,blocked=false}={}){
 const listeners={},documentListeners={},buttonListeners={};
 const media={matches:dark,addEventListener:(name,handler)=>{listeners['media:'+name]=handler;}};
 const control={dataset:{},attributes:{},setAttribute(name,value){this.attributes[name]=value;},addEventListener:(name,handler)=>{buttonListeners[name]=handler;}};
 const document={documentElement:{dataset:{}},querySelectorAll:()=>[control],querySelector:()=>null,addEventListener:(name,handler)=>{documentListeners[name]=handler;}};
 const localStorage={getItem:()=>{if(blocked)throw Error('Denied');return stored;},setItem:(_,value)=>{if(blocked)throw Error('Denied');stored=value;}};
 runInNewContext(theme,{window:{matchMedia:()=>media,addEventListener:(name,handler)=>{listeners[name]=handler;}},document,localStorage});
 const initial={...document.documentElement.dataset};
 documentListeners.DOMContentLoaded();
 return {document,control,initial,get stored(){return stored;},device(value){media.matches=value;listeners['media:change']();},click(){buttonListeners.click();},choose(value){for(let i=0;i<3&&control.dataset.mode!==value;i++)buttonListeners.click();},storage(value){listeners.storage({key:'za-appearance',newValue:value});}};
}
const auto=browser();
assert.equal(auto.initial.theme,'light');
assert.equal(auto.initial.appearance,'auto');
assert.match(auto.control.attributes['aria-label'],/Auto \(device\).*Switch to Light/);
auto.click();assert.equal(auto.control.dataset.mode,'light');
auto.click();assert.equal(auto.control.dataset.mode,'dark');
auto.click();assert.equal(auto.control.dataset.mode,'auto');
auto.device(true);assert.equal(auto.document.documentElement.dataset.theme,'dark');
auto.choose('light');auto.device(false);auto.device(true);assert.equal(auto.document.documentElement.dataset.theme,'light');
assert.equal(auto.stored,'light');
auto.choose('auto');assert.equal(auto.document.documentElement.dataset.theme,'dark');
auto.storage('light');assert.equal(auto.control.dataset.mode,'light');assert.equal(auto.document.documentElement.dataset.theme,'light');
auto.storage(null);assert.equal(auto.control.dataset.mode,'auto');assert.equal(auto.document.documentElement.dataset.theme,'dark');
assert.equal(browser({stored:'dark'}).initial.theme,'dark');
assert.equal(browser({stored:'unknown',dark:true}).initial.appearance,'auto');
const restricted=browser({dark:true,blocked:true});restricted.choose('light');assert.equal(restricted.document.documentElement.dataset.theme,'light');
let maps=0,parts=0,edges=0;
for(const [file,notes] of Object.entries(componentNotes)){
 const source=await readFile(new URL('../case-studies/diagrams/'+file+'.mmd',import.meta.url),'utf8');
 const svg=architectureMap(file,source);if(!svg)continue;
 const sourcePairs=sourceEdges(source).map(edge=>edge.from+'>'+edge.to).sort();
 const renderedPairs=[...svg.matchAll(/data-from="(\w+)" data-to="(\w+)"/g)].map(m=>m[1]+'>'+m[2]).sort();
 assert.deepEqual(renderedPairs,sourcePairs);
 assert.equal([...svg.matchAll(/data-card="true"/g)].length,Object.keys(notes).length);
 maps++;parts+=Object.keys(notes).length;edges+=sourcePairs.length;
}
// Mixed semantics must survive the renderer, including bidirectional and dotted paths.
assert.deepEqual(sourceEdges('  A[(Database)] <--> B[Read service]\n B -. Supporting path .-> C[View]'),[
 {from:'A',to:'B',dashed:false,both:true},{from:'B',to:'C',dashed:true,both:false}
]);
console.log(JSON.stringify({theme:'device changes, overrides, persistence, cross-tab, blocked storage passed',maps,parts,edges,graphIntegrity:'passed'}));
