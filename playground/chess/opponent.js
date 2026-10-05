import {START,parse,legal,apply,positionKey,evaluate,outcome,notation} from './engine.js';
import {uci} from './book.js';
export function buildProfile(games=[],{details=false}={}){
  const replies={},openings=new Map(),completed=[];let captures=0,captureChoices=0,legalGames=0;
  const samples=new Map(),sequences=new Map(),bySide={w:0,b:0};
  for(const game of games.slice(-30)){
    if(!game||!Array.isArray(game.moves)||game.moves.length>1000||!game.finished||(game.startFen&&game.startFen!==START)||!['w','b'].includes(game.human))continue;
    try{
      let s=parse(),first=[],history=[positionKey(s)],previous=null;
      const observations=[],firstSAN=[];let offered=0,taken=0;
      for(const code of game.moves){
        if(outcome(s,history).over)throw Error('Moves after game ended');
        const moves=legal(s),m=moves.find(m=>uci(m)===code);if(!m)throw Error('Illegal profile game');
        const san=details?notation(s,m):null;
        if(s.turn===game.human){
          if(first.length<3){first.push(code);if(details)firstSAN.push(san);}
          observations.push([positionKey(s),code,details?{state:s,history:history.slice(),previous}:null]);
          if(moves.some(m=>s.board[m.to]||m.ep)){offered++;if(s.board[m.to]||m.ep)taken++;}
        }
        if(details)previous={move:m,label:`${s.full}${s.turn==='w'?'.':'…'} ${san}`};
        s=apply(s,m);history.push(positionKey(s));
      }
      if(!outcome(s,history).over)continue;
      legalGames++;bySide[game.human]++;
      completed.push({id:game.id,human:game.human,plies:game.moves.length});
      captures+=taken;captureChoices+=offered;
      const opening=first.join(' ');openings.set(opening,(openings.get(opening)||0)+1);
      if(details){
        const sequenceKey=game.human+'|'+opening;
        if(!sequences.has(sequenceKey))sequences.set(sequenceKey,{side:game.human,moves:firstSAN,count:0});
        sequences.get(sequenceKey).count++;
      }
      for(const [k,code,sample] of observations){
        replies[k]??={};replies[k][code]=(replies[k][code]||0)+1;
        if(details&&!samples.has(k))samples.set(k,sample);
      }
    }catch{}
  }
  const result={games:legalGames,completed,replies,openings:[...openings].map(([moves,count])=>({moves,count})).sort((a,b)=>b.count-a.count),captures,captureChoices};
  if(details){
    result.patterns=[...samples].map(([key,sample])=>{
      const moves=legal(sample.state);
      const responses=Object.entries(replies[key]).map(([code,count])=>{
        const move=moves.find(m=>uci(m)===code);
        return {code,count,san:notation(sample.state,move)};
      }).sort((a,b)=>b.count-a.count||a.san.localeCompare(b.san));
      const observations=responses.reduce((n,r)=>n+r.count,0);
      return {key,...sample,responses,observations,ready:observations>=3};
    }).sort((a,b)=>b.observations-a.observations||a.key.localeCompare(b.key));
    result.openingPatterns=[...sequences.values()].map(s=>({...s,total:bySide[s.side]})).sort((a,b)=>b.count-a.count);
    result.bySide=bySide;
  }
  return result;
}
export function learnedPreference(state,move,profile){
  const next=apply(state,move),record=profile?.replies?.[positionKey(next)];if(!record)return null;
  let count=0,total=0,most=null;for(const reply of legal(next)){const n=record[uci(reply)]||0;if(!n)continue;count+=n;total+=n*evaluate(apply(next,reply))*(state.turn==='w'?1:-1);if(!most||n>most.count)most={move:reply,count:n};}
  return count>=3?{score:total/count,observations:count,reply:most.move}:null;
}
export function personalize(state,candidates,profile){
  const best=candidates[0];if(!best||!Number.isFinite(best.score)||Math.abs(best.score)>99000)return {chosen:best,adaptation:null};
  const eligible=candidates.filter(c=>c.score>=best.score-25).map(c=>({candidate:c,preference:learnedPreference(state,c.move,profile)})).filter(c=>c.preference);
  if(!eligible.length)return {chosen:best,adaptation:null};eligible.sort((a,b)=>b.preference.score-a.preference.score||b.candidate.score-a.candidate.score);
  const selected=eligible[0];return {chosen:selected.candidate,adaptation:{used:uci(selected.candidate.move)!==uci(best.move),observations:selected.preference.observations,predictedReply:selected.preference.reply,objectiveBest:best.move,scoreGap:best.score-selected.candidate.score,reason:'Past replies break a tie between moves within 0.25 pawns of the best searched score. Future opponent mistakes are not assumed.'}};
}
