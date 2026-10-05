import {parse,legal,apply,positionKey,square} from './engine.js';
export const uci=m=>square(m.from)+square(m.to)+(m.promotion||'');
// Original small curated repertoire. Legal sequences compiled to positions at load.
const lines=[
 ['Italian Game','e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 d2d3 g8f6 b1c3 d7d6'],
 ['Ruy Lopez','e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7'],
 ['Scotch Game','e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6'],
 ['Sicilian Defense','e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3'],
 ['French Defense','e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 e4e5 f6d7'],
 ['Caro-Kann Defense','e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5'],
 ['Queen’s Gambit Declined','d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 f8e7'],
 ['Queen’s Gambit Accepted','d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6'],
 ['Slav Defense','d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3'],
 ['King’s Indian Defense','d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6'],
 ['London System','d2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 f8d6'],
 ['English Opening','c2c4 e7e5 b1c3 g8f6 g1f3 b8c6'],
 ['Réti Opening','g1f3 d7d5 g2g3 g8f6 f1g2 e7e6']
];
let positions=null;
function compile(){if(positions)return;positions=new Map();for(const [name,text] of lines){let state=parse();for(const code of text.split(' ')){const moves=legal(state),move=moves.find(m=>uci(m)===code);if(!move)throw Error(`Illegal book move ${name}: ${code}`);const k=positionKey(state),entries=positions.get(k)||[];let entry=entries.find(e=>uci(e.move)===code);if(entry)entry.names.push(name);else entries.push({move,names:[name]});positions.set(k,entries);state=apply(state,move);}}}
export function bookDecision(state,{random=Math.random,history=[]}={}){
  compile();
  if(history.length>17||state.half>=100||history.filter(k=>k===positionKey(state)).length>1)return null;
  const entries=positions.get(positionKey(state));if(!entries?.length)return null;
  const selected=entries[Math.min(entries.length-1,Math.floor(Math.max(0,random())*entries.length))];
  return {move:selected.move,score:null,pv:[selected.move],candidates:entries.map(e=>({move:e.move,score:null,pv:[e.move],opening:e.names[0]})),depth:0,nodes:0,qnodes:0,cutoffs:0,ms:0,tree:[],source:'book',opening:selected.names[0],reason:`Curated opening repertoire: ${selected.names.join(' / ')}. No search score is assigned to a book move.`,traceDepth:0};
}
export const bookSize=()=>{compile();return positions.size;};
