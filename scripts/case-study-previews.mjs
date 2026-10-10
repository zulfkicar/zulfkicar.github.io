// Illustrations of the published system roles, not screenshots or production data.
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rect=(x,y,w,h,cls='panel',rx=12)=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
const text=(x,y,label,cls='label')=>`<text class="${cls}" x="${x}" y="${y}">${e(label)}</text>`;
const path=(d,cls='wire')=>`<path class="${cls}" d="${d}"/>`;
const line=(x,y,w,cls='skeleton')=>rect(x,y,w,5,cls,2.5);
const badge=(x,y,label,width=90)=>rect(x,y,width,23,'badge',6)+text(x+10,y+15,label,'tiny');
const check=(x,y)=>`<circle class="check-bg" cx="${x}" cy="${y}" r="9"/>`+path(`M${x-4} ${y}l3 3 5-6`,'check');
const arrow=(d,x,y,dir='right')=>path(d)+path(dir==='right'?`M${x-4} ${y-4}l4 4-4 4`:dir==='left'?`M${x+4} ${y-4}l-4 4 4 4`:`M${x-4} ${y-4}l4 4 4-4`);
function app(x,y,w,h,title,body){return rect(x,y,w,h)+text(x+16,y+25,title)+path(`M${x} ${y+40}h${w}`,'divider')+body;}
const item=(x,y,title,width=125)=>rect(x,y,width,30,'item',7)+check(x+15,y+15)+text(x+31,y+19,title,'small');
const store=(x,y,label)=>rect(x,y,116,52)+`<ellipse class="db" cx="${x+22}" cy="${y+18}" rx="8" ry="3"/>`+path(`M${x+14} ${y+18}v14c0 4 16 4 16 0V${y+18}`,'db')+text(x+40,y+30,label,'small');
const scenes={
 'workforce-platform':{
  title:'Tasks, time, and reporting connected to synchronized records',
  body:()=>app(30,37,316,208,'Workforce',badge(46,92,'Tasks',65)+badge(119,92,'Time',60)+badge(187,92,'Reports',76)+item(46,132,'Task activity',139)+item(46,172,'Time logs',139)+text(207,146,'Team overview','small')+[28,47,37,62].map((h,i)=>rect(208+i*25,218-h,15,h,'chart',4)).join(''))+
   store(390,68,'Airtable')+store(390,166,'SQL mirror')+arrow('M346 94h44',390,94)+arrow('M390 112h-44',346,112,'left')+arrow('M448 120v46',448,166,'down')+text(389,151,'sync + refresh','tiny')
 },
 'ticket-sync':{
  title:'Slack conversations and ticket replies synchronize, with Airtable records',
  body:()=>app(25,42,160,157,'Slack thread',rect(41,99,124,35,'bubble',9)+line(52,111,80)+line(52,121,56)+rect(63,145,102,28,'reply',9)+line(74,157,67))+
   app(374,42,160,157,'Ticket',badge(390,98,'Linked',79)+line(390,139,112)+line(390,155,81))+
   rect(222,83,115,70,'bridge')+text(243,111,'Sync')+text(237,132,'messages','small')+arrow('M185 105h37',222,105)+arrow('M337 105h37',374,105)+arrow('M374 132h-37',337,132,'left')+arrow('M222 132h-37',185,132,'left')+store(222,220,'Airtable')+arrow('M279 153v67',279,220,'down')
 },
 'support-monitoring':{
  title:'Delayed receipt checks and checkpointed audits surface missing handoffs',
  body:()=>app(28,40,148,135,'Message',line(44,103,104)+line(44,119,78)+badge(44,142,'Waiting',89))+
   rect(223,79,111,63,'bridge')+text(242,106,'Receipt')+text(240,124,'check','small')+arrow('M176 111h47',223,111)+arrow('M334 111h46',380,111)+
   app(380,40,150,135,'Operator',badge(396,97,'Missing receipt',119)+text(396,145,'Review alert','small'))+
   app(111,206,338,60,'Scheduled audit',check(315,231)+text(331,235,'Checkpoint','small'))+arrow('M279 142v64',279,206,'down')
 },
 'usage-observability':{
  title:'Application activity becomes reporting, filters, and an activity map',
  body:()=>store(25,48,'App logs')+rect(25,162,116,60,'bridge')+text(42,187,'Aggregate')+text(42,205,'SQL + Worker','small')+arrow('M83 100v62',83,162,'down')+arrow('M141 192h42',183,192)+
   app(183,39,351,219,'Activity dashboard',badge(199,93,'Team',67)+badge(276,93,'Date',62)+text(199,143,'Actions','small')+[31,53,42,68,49].map((h,i)=>rect(199+i*25,227-h,15,h,'chart',4)).join('')+text(361,143,'Activity map','small')+Array.from({length:20},(_,i)=>rect(361+i%5*26,159+Math.floor(i/5)*18,19,11,i%3===0?'chart':'cell',3)).join(''))
 },
 'employee-updates':{
  title:'An announcement reaches deduplicated recipients and tracks acknowledgment',
  body:()=>app(25,40,169,132,'Announcement',line(41,100,125)+line(41,116,92)+badge(41,136,'Scheduled',91))+
   rect(237,76,94,66,'bridge')+text(250,104,'Recipients')+text(254,122,'deduped','small')+arrow('M194 109h43',237,109)+arrow('M331 109h38',369,109)+
   app(369,40,166,132,'Slack delivery',check(394,108)+text(410,112,'Delivered','small')+line(385,145,130))+
   app(84,208,391,64,'Acknowledgment',badge(253,226,'Deadline 1',91)+badge(357,226,'Deadline 2',100))+arrow('M452 172v23H279v13',279,208,'down')
 },
 'billing-requests':{
  title:'A chat request becomes a structured record with completion tracking',
  body:()=>app(26,44,173,190,'Request in Slack',rect(42,100,141,81,'bubble',9)+line(55,116,105)+line(55,134,81)+line(55,152,96)+badge(42,197,'Source thread',110))+
   rect(232,103,96,69,'bridge')+text(245,131,'Normalize')+text(245,151,'Python','small')+arrow('M199 137h33',232,137)+arrow('M328 137h34',362,137)+
   app(362,44,173,190,'Request record',line(378,105,120)+line(378,124,92)+line(378,143,108)+item(378,175,'Completed',140))
 },
 'automation-alerts':{
  title:'Provider error emails are extracted, routed, and sent to Slack',
  body:()=>app(27,44,159,153,'Provider email',rect(43,101,127,61,'bubble',9)+text(55,122,'Connection notice','small')+line(55,136,96)+line(55,149,68))+
   rect(229,97,99,70,'bridge')+text(247,125,'Extract')+text(246,146,'+ route','small')+arrow('M186 132h43',229,132)+arrow('M328 132h45',373,132)+
   app(373,44,159,153,'Slack alert',badge(389,100,'Action needed',127)+line(389,145,115)+line(389,161,80))+badge(212,232,'Historical workflow',144)
 },
 'escalation-routing':{
  title:'A support reaction resolves context and branches into record updates or replies',
  body:()=>app(24,57,147,143,'Slack thread',line(40,116,115)+line(40,133,88)+badge(40,157,'Reaction',82))+
   rect(209,82,123,64,'bridge')+text(226,109,'Resolve context')+text(226,129,'choose path','small')+arrow('M171 113h38',209,113)+
   app(387,40,148,93,'Record update',item(399,92,'Status',124))+app(387,191,148,74,'Thread reply',line(403,244,107))+
   arrow('M332 109h25V86h30',387,86)+arrow('M332 121h25v107h30',387,228)
 }
};
export function casePreview(id){
 const scene=scenes[id];if(!scene)throw Error('Missing case preview: '+id);
 return `<svg xmlns="http://www.w3.org/2000/svg" class="case-art" viewBox="0 0 560 310" role="img" aria-label="${e(scene.title)}"><style>
 .case-art .panel{fill:var(--surface,#fffefa);stroke:var(--line,#dce2d8);stroke-width:1}
 .case-art .bridge,.case-art .badge,.case-art .reply,.case-art .item{fill:var(--soft,#edf1e7);stroke:var(--line,#dce2d8);stroke-width:1}
 .case-art .bubble{fill:var(--canvas,#f3f5ee)}
 .case-art .wire,.case-art .divider{fill:none;stroke:var(--edge,#94a698);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
 .case-art .divider{stroke:var(--line,#dce2d8)}
 .case-art .label{fill:var(--ink,#263e37);font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
 .case-art .small{fill:var(--muted,#5c7067);font:11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
 .case-art .tiny{fill:var(--muted,#5c7067);font:9px ui-monospace,Consolas,monospace}
 .case-art .skeleton,.case-art .cell{fill:var(--line,#dce2d8)}
 .case-art .chart{fill:var(--accent,#24634c);opacity:.65}
 .case-art .check-bg{fill:var(--soft,#edf1e7)}
 .case-art .check,.case-art .db{fill:none;stroke:var(--accent,#24634c);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
 </style>${scene.body()}<text class="tiny" x="28" y="293">ARCHITECTURE PREVIEW</text></svg>`;
}
