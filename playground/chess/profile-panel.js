import {buildProfile} from './opponent.js';
import {positionKey,apply,notation,legal} from './engine.js';
import {uci} from './book.js';

// Legal, completed example games. The preview never enters persisted memory.
export function sampleProfileGames(){
  const scholar=['e2e4','e7e5','d1h5','b8c6','f1c4','g8f6','h5f7'];
  const fool=['f2f3','e7e5','g2g4','d8h4'];
  return [
    ...Array.from({length:3},(_,i)=>({id:'example-white-'+i,human:'w',finished:true,moves:scholar})),
    ...Array.from({length:2},(_,i)=>({id:'example-other-'+i,human:'w',finished:true,moves:fool})),
    ...Array.from({length:3},(_,i)=>({id:'example-black-'+i,human:'b',finished:true,moves:fool}))
  ];
}

export function decisionSummary(result,root,{enabled=true}={}){
  if(result.source==='book')return {title:'Opening repertoire',text:'The engine used a curated opening move. No memory tie-break was applied.'};
  if(result.source==='tablebase')return {title:'Exact endgame table',text:'The engine used the local table. No memory tie-break was applied.'};
  if(!enabled)return {title:'Memory was off',text:'This move was selected without opponent memory.'};
  const a=result.adaptation;
  if(!a)return {title:'No final tie-break',text:'No final memory tie-break was applied. Recorded replies can still affect search order.'};
  const next=apply(root,result.move),reply=legal(next).find(m=>uci(m)===uci(a.predictedReply));
  const replyName=reply?notation(next,reply):'the recorded reply';
  return {
    title:a.used?'Memory changed the choice':'Memory kept the best move',
    text:`After ${notation(root,result.move)}, the most recorded reply was ${replyName}. ${a.observations} observations informed the tie-break.`,
    comparison:a.used?`Searched best: ${notation(root,a.objectiveBest)}. Played: ${notation(root,result.move)}. Score difference: ${(a.scoreGap/100).toFixed(2)} pawns, within the 0.25-pawn limit.`:'The history-based choice matched the best searched move.',
    used:a.used
  };
}

const sideName=side=>side==='w'?'White':'Black';
const percentage=(n,total)=>Math.round(n/total*100);
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
function textElement(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}

export function createProfilePanel(inspect,returnToGame){
  const section=document.createElement('section');section.id='profile';section.hidden=true;
  section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','tab-profile');
  section.innerHTML=`<div class="profile-heading"><div><span class="eyebrow">ON THIS DEVICE</span><h2>Opponent profile</h2></div><span id="profile-mode" class="profile-state">Enabled</span></div>
    <p class="profile-intro">Your recorded choices, with the observations behind them.</p>
    <div id="profile-demo" class="profile-notice" hidden><strong>Sample profile</strong><p>Example games only. Your saved memory and engine are unchanged.</p><button id="profile-own">Back to my profile</button></div>
    <div id="profile-disabled" class="profile-notice" hidden><strong>Memory is off</strong><p>Your records remain visible. New games won’t be collected or used until you enable memory in Settings.</p></div>
    <div id="profile-counts" class="profile-counts"></div>
    <div id="profile-empty" class="profile-empty"><h3>No finished games yet</h3><p>Finish a standard game to record your openings and replies. In-progress games and endgame studies don’t contribute.</p><button id="profile-sample">Preview a sample profile</button></div>
    <div id="profile-records" hidden>
      <section class="profile-section"><div class="section-label"><h3>Capture choices</h3><span>OBSERVED FREQUENCY</span></div><div id="profile-capture"></div><p class="trace-note">How often you captured when a legal capture was available. This describes your play and does not change the engine’s choice.</p></section>
      <section class="profile-section"><div class="section-label"><h3>Your first moves</h3><span>BY SIDE</span></div><div id="profile-openings"></div></section>
      <section class="profile-section"><div class="section-label"><h3>Recorded replies</h3><span>SELECT A POSITION</span></div><p class="profile-help">Three visits make a position eligible to inform play. Counts are observations, not a confidence rating.</p><div id="profile-patterns"></div></section>
    </div>
    <section class="profile-section" id="profile-current"><div class="section-label"><h3>In your current game</h3></div><p id="profile-context" class="profile-help"></p></section>
    <section class="profile-section" id="profile-decision"><div class="section-label"><h3>Last engine move</h3></div><div id="profile-decision-text"></div></section>
    <details class="profile-rules"><summary>How memory affects play</summary><p>Recorded replies can change search order. At least three replies at the same position are needed for a final tie-break. The engine can choose only among moves within 0.25 pawns of its best searched score, and it never changes a forced-mate choice.</p><p>This is a record of observed choices. It does not assign a playing style or assume you will make a mistake.</p><p>Only the last 30 completed standard games are included. Manage or forget games in Settings.</p></details>`;
  document.querySelector('.notebook .panel-scroll').append(section);
  const $=id=>section.querySelector('#'+id);
  let real=buildProfile([],{details:true}),shown=real,demo=false,enabled=true,current=null,lastDecision=null,selectedKey=null,visiblePatterns=6;
  function renderContext(){
    $('profile-current').hidden=demo;
    if(!current)return;
    const match=real.patterns.find(p=>p.key===positionKey(current));
    $('profile-context').textContent=!enabled?'Memory is off for the next search.':match
      ?`${plural(match.observations,'reply')} recorded here. ${match.ready?'This position meets the three-visit threshold.':`${3-match.observations} more visit${3-match.observations===1?'':'s'} needed before it can inform play.`}`
      :'No reply history matches this game position yet. Patterns may match positions later in the search.';
  }
  function renderDecision(){
    $('profile-decision').hidden=demo;
    $('profile-decision-text').replaceChildren();
    if(!lastDecision){$('profile-decision-text').append(textElement('p','A completed engine turn will show whether a memory tie-break changed its move. Board analysis does not use memory.','profile-help'));return;}
    const info=decisionSummary(lastDecision.result,lastDecision.root,lastDecision.options);
    $('profile-decision-text').append(textElement('strong',info.title,'decision-title'),textElement('p',info.text,'profile-help'));
    if(info.comparison)$('profile-decision-text').append(textElement('p',info.comparison,'trace-note'));
  }
  function render(){
    $('profile-mode').textContent=demo?'Sample':enabled?'Enabled':'Off';
    $('profile-demo').hidden=!demo;$('profile-disabled').hidden=demo||enabled;
    const ready=shown.patterns.filter(p=>p.ready).length;
    $('profile-counts').replaceChildren();
    for(const [count,label] of [[shown.games,demo?'Sample games':'Finished games'],[shown.patterns.length,'Positions recorded'],[ready,'Eligible positions']]){
      const box=document.createElement('div');box.append(textElement('strong',count),textElement('span',label));$('profile-counts').append(box);
    }
    $('profile-empty').hidden=shown.games>0;$('profile-records').hidden=!shown.games;
    $('profile-capture').replaceChildren();
    if(shown.captureChoices){
      const pct=percentage(shown.captures,shown.captureChoices),row=textElement('div','', 'profile-capture-row');
      row.append(textElement('strong',pct+'%'),textElement('span',`${shown.captures} of ${shown.captureChoices} opportunities`));
      const bar=document.createElement('progress');bar.max=100;bar.value=pct;bar.setAttribute('aria-label','Observed capture frequency');
      $('profile-capture').append(row,bar);
    }else $('profile-capture').append(textElement('p','No capture opportunities recorded yet.','profile-help'));
    $('profile-openings').replaceChildren();
    for(const opening of shown.openingPatterns.slice(0,4)){
      const row=textElement('div','','profile-opening');
      row.append(textElement('small',sideName(opening.side)),textElement('strong',opening.moves.join(' → ')),textElement('span',`${opening.count} / ${opening.total} games · ${percentage(opening.count,opening.total)}%`));
      $('profile-openings').append(row);
    }
    $('profile-patterns').replaceChildren();
    for(const pattern of shown.patterns.slice(0,visiblePatterns)){
      const card=textElement('div','', 'profile-pattern'),button=textElement('button','', 'pattern-position');
      if(pattern.key===selectedKey)card.classList.add('active');
      const label=pattern.previous?`${sideName(pattern.state.turn)} to move · after ${pattern.previous.label}`:`${sideName(pattern.state.turn)}’s first move`;
      button.append(textElement('strong',label),textElement('span','View position →'));
      button.setAttribute('aria-label','Inspect recorded position: '+label);
      button.setAttribute('aria-pressed',String(pattern.key===selectedKey));
      button.onclick=()=>{selectedKey=pattern.key;inspect(pattern,demo);render();section.querySelector('.pattern-position[aria-pressed="true"]').focus({preventScroll:true});};
      const status=textElement('div','', 'pattern-status');
      status.append(textElement('span',plural(pattern.observations,'visit')),textElement('span',pattern.ready?'Eligible for play':`${3-pattern.observations} more needed`,pattern.ready?'pattern-ready':''));
      const distribution=textElement('div','','profile-distribution');
      for(const reply of pattern.responses.slice(0,3)){
        const row=textElement('div','','profile-response');
        row.append(textElement('strong',reply.san),textElement('span',`${reply.count} / ${pattern.observations}`),textElement('small',percentage(reply.count,pattern.observations)+'%'));
        distribution.append(row);
      }
      if(pattern.responses.length>3)distribution.append(textElement('p',plural(pattern.responses.length-3,'other recorded move'),'trace-note'));
      card.append(button,status,distribution);$('profile-patterns').append(card);
    }
    if(shown.patterns.length>visiblePatterns){
      const more=textElement('button',`Show ${Math.min(6,shown.patterns.length-visiblePatterns)} more position${shown.patterns.length-visiblePatterns===1?'':'s'}`,'profile-more');
      more.onclick=()=>{const next=visiblePatterns;visiblePatterns+=6;render();section.querySelectorAll('.pattern-position')[next].focus({preventScroll:true});};
      $('profile-patterns').append(more);
    }
    renderContext();renderDecision();
  }
  const top=()=>section.closest('.panel-scroll').scrollTo({top:0,behavior:'instant'});
  $('profile-sample').onclick=()=>{demo=true;shown=buildProfile(sampleProfileGames(),{details:true});selectedKey=null;visiblePatterns=6;render();top();$('profile-own').focus({preventScroll:true});};
  $('profile-own').onclick=()=>{demo=false;shown=real;selectedKey=null;visiblePatterns=6;returnToGame();render();top();document.getElementById('tab-profile').focus({preventScroll:true});};
  return {
    update(profile,{learning=true}={}){real=profile;enabled=learning;if(!demo)shown=real;lastDecision=null;render();},
    setEnabled(value){enabled=value;render();},
    context(state){current=state;renderContext();},
    decision(result,root,options){lastDecision={result,root,options};renderDecision();},
    resetDecision(){lastDecision=null;renderDecision();},
    clearSelection(){selectedKey=null;render();}
  };
}
