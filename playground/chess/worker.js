import {search} from './engine.js';
import {bookDecision} from './book.js';
import {loadTablebase,tablebaseDecision} from './tablebase.js';
self.onmessage=async({data})=>{try{
  const start=performance.now();let tables=null,notice=null;
  try{tables=await loadTablebase(data.state);}catch{notice='The local endgame table could not load. Using normal search.';}
  let result=data.analyze?null:tablebaseDecision(data.state,tables,data.history||[]);
  if(!result&&!data.analyze&&data.book!==false)result=bookDecision(data.state,{history:data.history||[]});
  if(!result)result=search(data.state,{milliseconds:data.milliseconds,maxDepth:data.maxDepth||7,history:data.history||[],tables,profile:data.analyze?null:data.profile,traceDepth:8,onIteration:result=>self.postMessage({id:data.id,type:'progress',result})});
  if(result){result.wallMs=Math.round(performance.now()-start);result.notice=notice;}
  self.postMessage({id:data.id,type:'done',result});
}catch(error){self.postMessage({id:data.id,type:'error',error:error.message});}};
