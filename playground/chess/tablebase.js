import {apply,legal,color,positionKey} from './engine.js';
import {encode,SIZE} from './endgame-geometry.js';
const hashes={q:'e616d5403079f4265df1351b34d3688a817ef53423359330bc16d5bab887408b',r:'2fb8c98cb3569b4b53be82801f05a15dfac142aa50594aa8b578b613939963a1'};
export function material(s){
  const pieces=s.board.map((p,i)=>({p,i})).filter(v=>v.p);if(pieces.length!==3||s.rights.replaceAll('-','')||s.ep>=0)return null;
  const extra=pieces.find(v=>v.p.toLowerCase()!=='k');if(!extra||!['q','r'].includes(extra.p.toLowerCase()))return null;
  const strong=color(extra.p),a=s.board.indexOf(strong==='w'?'K':'k'),b=s.board.indexOf(strong==='w'?'k':'K');
  if(a<0||b<0)return null;return {type:extra.p.toLowerCase(),strong,id:encode(a,b,extra.i,s.turn===strong?0:1)};
}
export function probe(s,tables,history=[]){
  const m=material(s);if(!m||!tables?.[m.type])return null;
  const counts=new Map();for(const k of history){counts.set(k,(counts.get(k)||0)+1);if(counts.get(k)>1)return null;}
  const d=tables[m.type][m.id];if(d===255||d===undefined)return null;
  const drawn=d===254||d>100-s.half;
  return {type:`K${m.type.toUpperCase()}K`,strong:m.strong,dtm:drawn?null:d,wdl:drawn?0:s.turn===m.strong?1:-1,fiftyMoveDraw:d!==254&&d>100-s.half};
}
export function tablebaseDecision(s,tables,history=[]){
  const root=probe(s,tables,history);if(!root)return null;
  const candidates=[];
  for(const move of legal(s)){const next=apply(s,move);let child=probe(next,tables,[...history,positionKey(next)]);
    if(!child&&next.board.filter(Boolean).length===2)child={wdl:0,dtm:null};if(!child)continue;
    const score=-child.wdl,dtm=child.dtm===null?null:child.dtm+1;candidates.push({move,wdl:score,dtm});
  }
  candidates.sort((a,b)=>b.wdl-a.wdl||(a.wdl>0?(a.dtm??Infinity)-(b.dtm??Infinity):a.wdl<0?(b.dtm??0)-(a.dtm??0):0));
  if(!candidates.length)return null;const chosen=candidates[0];
  return {move:chosen.move,score:chosen.wdl===0?0:chosen.wdl*(100000-chosen.dtm),pv:[chosen.move],candidates:candidates.slice(0,4).map(c=>({...c,score:c.wdl===0?0:c.wdl*(100000-c.dtm),pv:[c.move]})),depth:0,nodes:0,qnodes:0,cutoffs:0,ms:0,tree:[],source:'tablebase',tablebase:{...root,dtm:chosen.dtm,wdl:chosen.wdl},reason:chosen.wdl===0?'Exact drawn outcome under the automatic fifty-move rule.':`Exact ${chosen.wdl>0?'win':'loss'} with optimal play, ${chosen.dtm} plies to mate.`,traceDepth:0};
}
export async function loadTablebase(s){
  const m=material(s);if(!m)return null;const compressed=typeof DecompressionStream!=='undefined',url=new URL(`./tablebases/k${m.type}k.bin${compressed?'.gz':''}`,import.meta.url);
  let cache=null,response;try{if(typeof caches!=='undefined'){cache=await caches.open('between-moves-dtm-v1');response=await cache.match(url);}}catch{}
  if(!response){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Tablebase unavailable');if(cache)try{await cache.put(url,response.clone());}catch{} }finally{clearTimeout(timer);}}
  const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
  if(buffer.byteLength!==SIZE)throw Error('Invalid tablebase size');
  if(globalThis.crypto?.subtle){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');if(digest!==hashes[m.type])throw Error('Invalid tablebase checksum');}
  return {[m.type]:new Uint8Array(buffer)};
}
