// Explicit presentation layouts. Edges are read from the Mermaid source so the
// visual treatment cannot silently drop a data path or invent a connection.
import {componentNotes} from '../case-studies/component-notes.mjs';
const n=(key,label,x,y)=>({key,label,x:32+x*198,y:58+y*130});
const layouts={
 'employee-updates':[
  n('A','Update',0,0),n('WAIT','Schedule',1,0),n('PUB','Publish',2,0),n('DEDUP','Recipients',3,0),
  n('LOOP','Deliver',3,1),n('LOG','Delivery log',2,1),n('D1','Deadline 1',1,1),n('REM','Remind',0,1),
  n('D2','Deadline 2',0,2),n('FOLLOW','Follow up',1,2)
 ],
 'billing-requests':[
  n('S','Request',0,0),n('F','Filter',1,0),n('P','Normalize',2,0),n('L','Find context',3,0),
  n('R','Reaction',0,2),n('RF','Filter',1,2),n('FIND','Find request',2,2),n('UPDATE','Complete',3,2),n('A','Request log',3,1)
 ],
 'automation-alerts':[
  n('G','Error email',0,0),n('PARSE','Extract',1,0),n('FORMAT','Format',2,0),n('B','Route',2,1),n('SL','Notify',1,1)
 ],
 'escalation-routing':[
  n('R','Reaction',0,0),n('F','Filter',1,0),n('T','Thread',2,0),n('D','Normalize',3,0),
  n('B','Choose path',3,1),n('L','Find record',2,1),n('U','Update status',1,1),n('S','Respond',0,1),n('ALT','Alternate reply',3,2)
 ],
 'ticket-architecture':[
  n('S','Slack',0,1),n('H','Sync handlers',1,1),n('T','Ticket system',2,1),n('A','Airtable',1,2),
  n('Z','Zapier',0,0),n('W','Workers',2,0),n('M','Monitor',0,2)
 ],
 'usage-architecture':[
  n('DB','Request logs',0,0),n('SQL','Aggregate',1,0),n('REG','Classify',2,0),n('PAY','Payload',3,0),
  n('UI','Dashboard',3,1),n('F','Filter views',3,2),n('V','Exports',2,2),n('W','Worker',1,1),n('SNAP','Snapshot',2,1)
 ],
 'support-audit':[
  n('I','Coverage',0,0),n('S','History',1,0),n('T','Threads',2,0),n('U','Classify',3,0),
  n('A','Ticket evidence',3,1),n('R','Reconcile',3,2),n('E','Scorecard',2,2),n('DB','Checkpoint',1,1),n('RESUME','Resume',1,2)
 ],
 'support-architecture':[
  n('S','Slack event',0,0),n('F','Filter',1,0),n('DO','Message state',2,0),n('AL','Alarm',3,0),
  n('R','Read receipt',3,1),n('OK','Received',2,1),n('ALERT','Alert',3,2),
  n('CRON','Schedules',0,2),n('SL','Slack evidence',0,1),n('AT','Ticket records',1,1),
  n('AUDIT','Audit',1,2),n('DB','Checkpoint',0,3),n('KV','Archive',1,3),n('SCORE','Scorecard',2,3)
 ],
 'workforce-architecture':[
  n('U','People',0,0),n('UI','Workforce app',1,0),n('API','API',2,0),n('AUTH','Permissions',3,0),
  n('HS','Hubstaff',2,1),n('READ','Reporting',0,1),n('DB','SQL mirror',0,2),n('KPI','KPI metrics',0,3),
  n('ACT','Task actions',3,1),n('LOCK','Action lock',3,2),n('WRITE','Writer',3,3),n('AT','Airtable',2,3),
  n('ECHO','Refresh',1,2),n('SYNC','Table sync',1,3)
 ]
};
const icons={
 entry:'M13 2 5 12h6l-1 10 9-12h-6z',
 compute:'m8 5-6 7 6 7m8-14 6 7-6 7m-2-17-4 20',
 decision:'M12 2v6m0 0H5v8m7-8h7v8M2 17l3 4 3-4m8 0 3 4 3-4',
 store:'M3 5c0-4 18-4 18 0s-18 4-18 0v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0',
 integration:'M8 2v5m8-5v5M5 7h14v4a7 7 0 0 1-14 0zM12 18v4',
 interface:'M2 3h20v15H2zM8 22h8m-4-4v4'
};
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceEdges(source){
 const edges=[];
 for(const line of source.split('\n')){
  const bare=line.replace(/\[.*?\]/g,'').replace(/\|.*?\|/g,'');
  const match=bare.match(/^\s*(\w+)\s*(<-->|-->|-\..*?\.->)\s*(\w+)\s*$/);
  if(match){edges.push({from:match[1],to:match[3],dashed:match[2].startsWith('-.'),both:match[2]==='<-->'});}
 }
 return edges;
}
export function architectureMap(file,source){
 const nodes=layouts[file];if(!nodes)return null;
 const notes=componentNotes[file],keys=nodes.map(n=>n.key),edges=sourceEdges(source);
 if(keys.length!==Object.keys(notes).length||Object.keys(notes).some(key=>!keys.includes(key)))throw Error('Map component mismatch: '+file);
 if(edges.length!==source.split('\n').filter(line=>line.includes('-->')||line.includes('.->')).length)throw Error('Unparsed edge: '+file);
 const width=Math.max(...nodes.map(n=>n.x))+188,height=Math.max(...nodes.map(n=>n.y))+112;
 const byKey=Object.fromEntries(nodes.map(n=>[n.key,n]));
 const paths=edges.map(({from,to,dashed,both},i)=>{
  const a=byKey[from],b=byKey[to];if(!a||!b)throw Error('Unknown edge component');
  let ax=a.x+78,ay=a.y+36,bx=b.x+78,by=b.y+36;
  const horizontal=Math.abs(a.x-b.x)>Math.abs(a.y-b.y);
  if(horizontal){ax+=a.x<b.x?78:-78;bx+=a.x<b.x?-78:78;}
  else{ay+=a.y<b.y?36:-36;by+=a.y<b.y?-36:36;}
  // Paired directions use opposite offsets to keep each arrow visible.
  const paired=edges.some((edge,j)=>j!==i&&edge.from===to&&edge.to===from);
  if(paired){if(horizontal){ay+=8;by+=8;}else{ax+=8;bx+=8;}}
  let d=horizontal?`M${ax} ${ay} C${ax+(bx-ax)*.5} ${ay} ${ax+(bx-ax)*.5} ${by} ${bx} ${by}`:`M${ax} ${ay} C${ax} ${ay+(by-ay)*.5} ${bx} ${ay+(by-ay)*.5} ${bx} ${by}`;
  // Long workforce connections use the lane between rows, outside card bounds.
  if(file==='workforce-architecture'&&from==='AUTH'&&to==='READ')d=`M${a.x+38} ${a.y+72} V166 H${b.x+78} V${b.y}`;
  return `<path class="map-edge" data-from="${from}" data-to="${to}" d="${d}"${dashed?' stroke-dasharray="4 5"':''} marker-end="url(#${file}-arrow)"${both?` marker-start="url(#${file}-arrow-back)"`:''}/>`;
 }).join('');
 const cards=nodes.map((node,i)=>{
  const note=notes[node.key];
  return `<g class="node map-part" id="flowchart-${node.key}-${i}" transform="translate(${node.x} ${node.y})" data-card="true"><rect class="map-card" width="156" height="72" rx="12"/><rect class="map-icon-bg" x="12" y="20" width="32" height="32" rx="9"/><g class="map-icon" transform="translate(18 26) scale(.83)"><path d="${icons[note.kind]}"/></g><text class="map-label" x="54" y="34">${e(node.label)}</text><text class="map-role" x="54" y="51">${e(note.kind)}</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="research-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(file.replaceAll('-',' '))}"><style>
 .map-edge{fill:none;stroke:var(--edge,#94a698);stroke-width:1.5}
 .map-arrow{fill:var(--edge,#94a698)}
 .map-card{fill:var(--surface,#fffefa);stroke:var(--line,#dce2d8);stroke-width:1}
 .map-icon-bg{fill:var(--soft,#edf1e7);stroke:none}
 .map-icon path{fill:none;stroke:var(--accent,#24634c);stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}
 .map-label{fill:var(--ink,#263e37);font:600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
 .map-role{fill:var(--muted,#5c7067);font:9px ui-monospace,Consolas,monospace;letter-spacing:.5px;text-transform:uppercase}
 </style><defs><marker id="${file}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="map-arrow" d="M0 1 9 5 0 9z"/></marker><marker id="${file}-arrow-back" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="map-arrow" d="M9 1 0 5 9 9z"/></marker></defs><text class="map-role" x="32" y="25">${nodes.length} parts · solid: flow · dotted: supporting path</text>${paths}${cards}</svg>`;
}
