import {legal,apply,inCheck,insufficient,evaluate,positionKey,values,parse} from './engine.js';
import {probe} from './tablebase.js';
import {personalize} from './opponent.js';
import {uci} from './book.js';
const same=(a,b)=>a&&b&&a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;
const moveKey=m=>`${m.from}:${m.to}:${m.promotion||''}`;
const fingerprint=s=>s.board.filter(Boolean).sort().join('')+'|'+s.board.map((p,i)=>p?.toLowerCase()==='p'?`${p}${i}`:'').filter(Boolean).join(',')+'|'+s.rights;
const hash=text=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;};
const toStored=(score,ply)=>score>99000?score+ply:score<-99000?score-ply:score;
const fromStored=(score,ply)=>score>99000?score-ply:score<-99000?score+ply:score;

/** Bounded records of actual search visits, with explicit omissions and cache hits. */
export function search(state,{milliseconds=1200,maxDepth=7,onIteration=()=>{},history=[],trace=true,traceDepth=8,useTT=true,tables=null,profile=null}={}){
  maxDepth=Math.max(1,Math.min(12,Math.floor(maxDepth)));traceDepth=Math.max(1,Math.min(8,Math.floor(traceDepth)));
  const start=performance.now(),deadline=start+Math.max(1,milliseconds),timeout={};
  let nodes=0,qnodes=0,cutoffs=0,ttHits=0,ttStores=0,tablebaseHits=0,last=null,traceCount=0,traceOmitted=0,traceId=0;
  const killers=new Map(),quietHistory=new Map(),tt=new Map(),hints=new Map(),hashes=new Map();let contextChars=0,counts=new Map(),contextHash=0;
  // Positions before an irreversible change cannot recur. Keep only the suffix
  // with identical material, pawn squares and castling rights at the root.
  const rootFingerprint=fingerprint(state);let relevant=[];
  for(let i=history.length-1;i>=0;i--){if(fingerprint(parse(history[i]+' 0 1'))!==rootFingerprint)break;relevant.unshift(history[i]);}
  const rootKey=positionKey(state);if(!relevant.length||relevant.at(-1)!==rootKey)relevant.push(rootKey);
  const contextPart=(k,n)=>{const text=k+'#'+n;if(!hashes.has(text))hashes.set(text,hash(text));return hashes.get(text);};
  function setCount(k,n){const old=counts.get(k)||0;if(old)contextHash^=contextPart(k,old);if(n){counts.set(k,n);contextHash^=contextPart(k,n);}else counts.delete(k);}
  for(const k of relevant)setCount(k,(counts.get(k)||0)+1);
  const canonical=()=>[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([k,n])=>k+'#'+n).join(';');
  const cacheKey=(s,k)=>k+'|'+s.half+'|'+(contextHash>>>0);
  const visit=()=>{nodes++;if((nodes&63)===0&&performance.now()>deadline)throw timeout;};
  const capture=(s,m)=>Boolean(s.board[m.to]||m.ep||m.promotion);
  function ordered(s,moves,ply,hint,k){
    const learned=profile?.replies?.[k],observations=learned?Object.values(learned).reduce((a,b)=>a+b,0):0;
    const rank=m=>(same(m,hint)?1e7:0)+(capture(s,m)?100000+(m.promotion?values[m.promotion]*10:0)+(s.board[m.to]?values[s.board[m.to].toLowerCase()]*10:100)-values[s.board[m.from].toLowerCase()]:same(m,killers.get(ply))?90000:quietHistory.get(moveKey(m))||0)+(observations>=3?(learned[uci(m)]||0)*100:0);
    return moves.sort((a,b)=>rank(b)-rank(a));
  }
  function descend(s,m,fn){const next=apply(s,m),k=positionKey(next);if(next.half===0||next.rights!==s.rights){const savedCounts=counts,savedHash=contextHash;counts=new Map();contextHash=0;setCount(k,1);try{return fn(next,k);}finally{counts=savedCounts;contextHash=savedHash;}}setCount(k,(counts.get(k)||0)+1);try{return fn(next,k);}finally{setCount(k,counts.get(k)-1);}}
  function terminal(s,moves,ply,k){if(!moves.length)return inCheck(s)?-100000+ply:0;if(s.half>=100||insufficient(s)||(counts.get(k)||0)>=3)return 0;return null;}
  function knownEndgame(s,ply){if(!tables||[...counts.values()].some(n=>n>1))return null;const result=probe(s,tables);if(!result)return null;tablebaseHits++;return {score:result.wdl===0?0:result.wdl*(100000-ply-result.dtm),pv:[],source:'tablebase',tablebase:result};}
  function record(move,ply,depth){if(!trace||ply>traceDepth||traceCount>=2400){if(trace)traceOmitted++;return null;}traceCount++;return {id:++traceId,move,ply,depth,children:[],nodes:0,status:'visited',source:depth<=0?'quiescence':'search',bound:'exact',legalMoves:0,visitedMoves:0,prunedMoves:0,omitted:0};}
  function finish(node,result,alpha,beta,before){if(node){node.score=result.score;node.bound=result.score>=beta?'lower':result.score<=alpha?'upper':'exact';node.nodes=nodes-before;node.pv=result.pv;node.source=result.source||node.source;if(result.tablebase)node.tablebase=result.tablebase;}return result;}
  function quiet(s,alpha,beta,ply,qdepth,k,node){
    const before=nodes,initialAlpha=alpha;visit();qnodes++;const moves=legal(s),end=terminal(s,moves,ply,k);if(node){node.alpha=alpha;node.beta=beta;node.legalMoves=moves.length;node.source='quiescence';}
    if(end!==null)return finish(node,{score:end,pv:[],source:'terminal'},initialAlpha,beta,before);
    const exact=knownEndgame(s,ply);if(exact)return finish(node,exact,initialAlpha,beta,before);
    const check=inCheck(s),stand=(s.turn==='w'?1:-1)*evaluate(s);if(node){node.staticScore=stand;node.inCheck=check;}
    if(qdepth>=12)return finish(node,{score:stand,pv:[],source:'safety-cap'},initialAlpha,beta,before);
    if(!check){if(stand>=beta)return finish(node,{score:stand,pv:[],source:'stand-pat cutoff'},initialAlpha,beta,before);alpha=Math.max(alpha,stand);}
    let best=check?-Infinity:stand,pv=[];const eligible=ordered(s,check?moves:moves.filter(m=>capture(s,m)),ply,null,k);if(node)node.eligibleMoves=eligible.length;
    for(let i=0;i<eligible.length;i++){
      const move=eligible[i],childNode=node&&node.children.length<6?record(move,ply+1,0):null;if(node){node.visitedMoves++;if(childNode)node.children.push(childNode);else node.omitted++;}
      const child=descend(s,move,(next,key)=>quiet(next,-beta,-alpha,ply+1,qdepth+1,key,childNode)),score=-child.score;
      if(score>best){best=score;pv=[move,...child.pv];}alpha=Math.max(alpha,score);
      if(alpha>=beta){cutoffs++;if(node)node.prunedMoves=eligible.length-i-1;break;}
    }
    return finish(node,{score:best,pv},initialAlpha,beta,before);
  }
  function store(s,k,depth,score,pv,alpha,beta,ply){if(!useTT)return;const key=cacheKey(s,k),context=canonical(),previous=tt.get(key);if(previous)contextChars-=previous.context.length;tt.set(key,{context,depth,score:toStored(score,ply),bound:score<=alpha?'upper':score>=beta?'lower':'exact',pv});contextChars+=context.length;ttStores++;
    hints.set(k,pv[0]);while(tt.size>12000||contextChars>4000000){const first=tt.keys().next().value;contextChars-=tt.get(first).context.length;tt.delete(first);}if(hints.size>16000)hints.delete(hints.keys().next().value);
  }
  function negamax(s,depth,alpha,beta,ply,k,node){
    if(depth<=0)return quiet(s,alpha,beta,ply,0,k,node);
    const before=nodes,initialAlpha=alpha;visit();const moves=legal(s),end=terminal(s,moves,ply,k);if(node){node.alpha=alpha;node.beta=beta;node.legalMoves=moves.length;}
    if(end!==null)return finish(node,{score:end,pv:[],source:'terminal'},initialAlpha,beta,before);
    const exact=knownEndgame(s,ply);if(exact)return finish(node,exact,initialAlpha,beta,before);
    const cached=useTT?tt.get(cacheKey(s,k)):null;
    if(cached&&cached.depth>=depth&&cached.context===canonical()){
      const score=fromStored(cached.score,ply);if(cached.bound==='exact'||cached.bound==='lower'&&score>=beta||cached.bound==='upper'&&score<=alpha){ttHits++;if(node)node.cachedDepth=cached.depth;return finish(node,{score,pv:cached.pv,source:'transposition'},initialAlpha,beta,before);}
    }
    let best=-Infinity,pv=[];const sorted=ordered(s,moves,ply,useTT?hints.get(k):null,k);
    for(let i=0;i<sorted.length;i++){
      const move=sorted[i],childNode=node&&node.children.length<6?record(move,ply+1,depth-1):null;
      if(node){node.visitedMoves++;if(childNode)node.children.push(childNode);else node.omitted++;}
      const child=descend(s,move,(next,key)=>negamax(next,depth-1,-beta,-alpha,ply+1,key,childNode)),score=-child.score;
      if(score>best){best=score;pv=[move,...child.pv];}alpha=Math.max(alpha,score);
      if(alpha>=beta){cutoffs++;if(!capture(s,move)){killers.set(ply,move);quietHistory.set(moveKey(move),Math.min(80000,(quietHistory.get(moveKey(move))||0)+depth*depth));}if(node)node.prunedMoves=sorted.length-i-1;break;}
    }
    store(s,k,depth,best,pv,initialAlpha,beta,ply);return finish(node,{score:best,pv},initialAlpha,beta,before);
  }
  const rootMoves=legal(state);if(!rootMoves.length||state.half>=100||insufficient(state)||(counts.get(rootKey)||0)>=3)return null;
  for(let depth=1;depth<=maxDepth;depth++){
    const candidates=[],branches=[];traceCount=0;traceOmitted=0;traceId=0;
    try{
      for(const move of ordered(state,rootMoves.slice(),0,last?.move,rootKey)){
        if(performance.now()>deadline&&last)throw timeout;
        const before=nodes,node=trace?{id:++traceId,move,ply:1,depth:depth-1,children:[],nodes:0,status:'visited',source:'search',bound:'exact',legalMoves:0,visitedMoves:0,prunedMoves:0,omitted:0}:null;
        const result=descend(state,move,(next,k)=>negamax(next,depth-1,-Infinity,Infinity,1,k,node));
        const candidate={move,score:-result.score,pv:[move,...result.pv],nodes:nodes-before};candidates.push(candidate);
        if(node){node.positionScore=node.score;node.score=candidate.score;node.replies=node.children.map(c=>({move:c.move,score:c.score,nodes:c.nodes,bound:c.bound,pv:[c.move,...(c.pv||[])]}));node.replyCount=legal(apply(state,move)).length;node.skipped=node.prunedMoves;branches.push(node);}
      }
      candidates.sort((a,b)=>b.score-a.score);const {chosen,adaptation}=personalize(state,candidates,profile);
      const visible=candidates.slice(0,4);if(!visible.includes(chosen))visible.push(chosen);
      last={...chosen,candidates:visible,depth,targetDepth:maxDepth,nodes,qnodes,cutoffs,ttHits,ttStores,tablebaseHits,ttEntries:tt.size,ms:Math.round(performance.now()-start),tree:branches,traceDepth,traceRecorded:traceCount+branches.length,traceOmitted,source:'search',adaptation,objectiveBest:candidates[0].move};
      onIteration(last);if(Math.abs(last.score)>99000)break;
    }catch(error){if(error!==timeout)throw error;break;}
  }
  return last?{...last,nodes,qnodes,cutoffs,ttHits,ttStores,tablebaseHits,ms:Math.round(performance.now()-start),stopped:performance.now()>=deadline?'time budget':last.depth>=maxDepth?'depth ceiling':'forced mate'}:{move:rootMoves[0],score:null,pv:[rootMoves[0]],candidates:[],tree:[],depth:0,targetDepth:maxDepth,nodes,qnodes,cutoffs,ttHits,ttStores,tablebaseHits,ms:Math.round(performance.now()-start),source:'search',stopped:'time budget'};
}
