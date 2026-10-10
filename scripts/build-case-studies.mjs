import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {studies} from '../case-studies/content.mjs';
import {componentNotes} from '../case-studies/component-notes.mjs';
import {exportInventory} from '../case-studies/export-studies.mjs';
import {diagramHtml} from './diagram-html.mjs';
const root = fileURLToPath(new URL('../case-studies/',import.meta.url));
const cssVersion=createHash('sha256').update(await readFile(root+'case-studies.css')).digest('hex').slice(0,12);
const viewerVersion=createHash('sha256').update(await readFile(root+'diagram-viewer.js')).digest('hex').slice(0,12);
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = list => list.map(s=>`<p>${escape(s)}</p>`).join('\n');
const entries = list => list.map(([title,body])=>`<li><h3>${escape(title)}</h3><p>${escape(body)}</p></li>`).join('\n');
function interactiveSvg(source,file,notes){
  let svg=source.replace(/<svg\b([^>]*)>/,(_,attrs)=>`<svg ${attrs.replace(/\s(?:width|height|style|role|aria-roledescription|aria-label)="[^"]*"/g,'')} role="group" aria-label="Interactive system diagram">`);
  const seen=new Set();
  svg=svg.replace(/<g\b[^>]*class="node\b[^\"]*"[^>]*>/g,tag=>{
    const key=tag.match(/flowchart-(.+)-\d+"/)?.[1];
    if(!notes[key])throw Error(`Missing component explanation: ${file}/${key}`);
    seen.add(key);return tag.slice(0,-1)+` data-part="${key}" data-kind="${notes[key].kind}">`;
  });
  svg=svg.replace(/<rect\b[^>]*class="actor[^\"]*"[^>]*>/g,tag=>{
    const key=tag.match(/name="([^"]+)"/)?.[1];
    if(!notes[key])throw Error(`Missing participant explanation: ${file}/${key}`);
    seen.add(key);return tag.replace(/\/>$/,` data-part="${key}" data-kind="${notes[key].kind}"/>`);
  });
  for(const key of Object.keys(notes))if(!seen.has(key))throw Error(`Unused explanation: ${file}/${key}`);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length);
  for(const id of ids){const safe=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');svg=svg.replace(new RegExp(`(?<=id=")${safe}(?=")|(?<=#)${safe}(?![\\w-])`,'g'),file+'-'+id);}
  return svg;
}
const shell = (title,description,body,level='detail') => {
  const home=level==='detail'?'../../':'../';
  const index=level==='detail'?'../':'./';
  const css=level==='detail'?'../case-studies.css':'./case-studies.css';
  const slug=level==='detail'?studies.find(s=>s.title===title).id+'/':'';
  const canonical=`https://zulfkicar.github.io/case-studies/${slug}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Zulfiqar Ali</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)} | Zulfiqar Ali"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><link rel="icon" href="${home}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${css}?v=${cssVersion}">${level==='detail'?`<script src="../diagram-viewer.js?v=${viewerVersion}" defer></script>`:''}</head><body><a class="skip" href="#main">Skip to content</a><div class="page"><header><a class="wordmark" href="${home}" aria-label="Zulfiqar Ali portfolio">ZA<span>/</span></a><nav aria-label="Case study navigation"><a href="${home}#baam">Baam work</a><a href="${index}">All case studies</a><a href="https://github.com/zulfkicar/zulfkicar.github.io/tree/main/case-studies">Diagram sources ↗</a></nav></header><main id="main">${body}</main><footer><span>Zulfiqar Ali · Engineering case studies</span><a href="${home}#baam">Back to portfolio ↗</a></footer></div></body></html>`;
};
for (const study of studies) {
  const dir=root+study.id+'/'; await mkdir(dir,{recursive:true});
  const diagrams=[];
  for (const diagram of study.diagrams) {
    const source=await readFile(root+'diagrams/'+diagram.file+'.mmd','utf8');
    const svg=await readFile(root+'diagrams/'+diagram.file+'.svg','utf8');
    const viewbox=svg.match(/viewBox="([^"]+)"/);
    if(!viewbox)throw Error('Missing diagram viewBox: '+diagram.file);
    const notes=componentNotes[diagram.file];
    if(!notes)throw Error('Missing diagram explanations: '+diagram.file);
    diagrams.push(diagramHtml(diagram,diagrams.length+1,interactiveSvg(svg,diagram.file,notes),notes,source));
  }
  const next=studies[(studies.indexOf(study)+1)%studies.length];
  const technicalNav=study.overviewOnly?'':'<a href="#architecture">Architecture</a><a href="#execution">How it works</a><a href="#decisions">Engineering decisions</a>';
  const technicalBody=study.overviewOnly?'':`<section id="architecture"><p class="eyebrow">03 / ARCHITECTURE</p>${diagrams.join('\n')}</section><section id="execution"><p class="eyebrow">04 / HOW IT WORKS</p><ol class="steps">${entries(study.steps)}</ol></section><section id="decisions"><p class="eyebrow">05 / ENGINEERING DECISIONS</p><ul class="decisions">${entries(study.decisions)}</ul></section>`;
  const scopeNumber=study.overviewOnly?'03':'06';
  const privacy=study.overviewOnly?'Customer records, credentials, internal endpoints, and proprietary source code are not included.':'Diagrams are abstracted from the workplace system. Customer records, credentials, internal endpoints, and proprietary source code are not included.';
  const body=`<div class="case-hero"><p class="eyebrow">BAAM ${study.overviewOnly?'OVERVIEW':'CASE STUDY'} ${study.number} / ${escape(study.category)}</p><h1>${escape(study.title)}</h1><p class="lead">${escape(study.summary)}</p><ul class="stack" aria-label="Technology stack">${study.stack.map(s=>`<li>${escape(s)}</li>`).join('')}</ul></div><div class="reading-layout"><aside><nav aria-label="On this page"><a href="#problem">The problem</a><a href="#ownership">My contribution</a>${technicalNav}<a href="#impact">Outcome &amp; scope</a></nav></aside><article class="case-body"><section id="problem"><p class="eyebrow">01 / THE PROBLEM</p><h2>${escape(study.name)}</h2>${paragraphs(study.problem)}</section><section id="ownership"><p class="eyebrow">02 / MY CONTRIBUTION</p><p>${escape(study.ownership)}</p></section>${technicalBody}<section id="impact"><p class="eyebrow">${scopeNumber} / OUTCOME &amp; SCOPE</p><ul class="outcomes">${study.outcomes.map(s=>`<li>${escape(s)}</li>`).join('')}</ul><div class="scope"><h3>Reading this case study</h3><p>${escape(study.scope)}</p><p>${escape(study.basis)}</p></div>${study.related?`<a class="related" href="${study.related.href}">${escape(study.related.label)} ↗</a>`:''}<p class="privacy-note">${privacy}</p></section><a class="next-study" href="../${next.id}/"><span>NEXT CASE STUDY / ${next.number}</span><strong>${escape(next.name)} ↗</strong></a></article></div>`;
  await writeFile(dir+'index.html',shell(study.title,study.summary,body));
}
const hub=`<div class="case-hero"><p class="eyebrow">BAAM / ENGINEERING CASE STUDIES</p><h1>What sits behind<br>the day-to-day work.</h1><p class="lead">Eight architecture case studies and a written overview of the AI memory layer. Explore the components, follow the data, and inspect the decisions behind each system.</p></div><section class="program-impact" aria-labelledby="impact-heading"><h2 id="impact-heading">Impact across the work</h2><dl><div><dt>Lower Zapier task consumption</dt><dd>50%</dd></div><div><dt>Saved in task costs</dt><dd>$25,000+</dd></div><div><dt>Annual operational savings</dt><dd>$15,000+</dd></div></dl><p>The task reduction and task-cost savings come from the broader Zapier-to-Cloudflare migration. The annual figure comes from AI-assisted tools, research, and operational improvements. These are separate reported figures, not amounts assigned to each case study or added into a combined total.</p></section><section class="case-list" aria-label="Case studies">${studies.map(s=>`<a href="./${s.id}/"><span class="case-number">${s.number}</span><div><p class="eyebrow">${escape(s.category)}</p><h2>${escape(s.name)} <span aria-hidden="true">↗</span></h2><p>${escape(s.summary)}</p><small>${s.overviewOnly?'Written overview · Confirmed capabilities':`${s.diagrams.length} interactive system maps · Component explanations · Engineering decisions`}</small></div></a>`).join('')}</section><section class="export-review" aria-labelledby="export-heading"><p class="eyebrow">SOURCE REVIEW / ZAPIER EXPORT</p><h2 id="export-heading">More than the ticket bridge.</h2><p>The supplied archive contains 4,083 workflow definitions. A full name-tag inventory found 48 entries bearing my name, spanning the families below: 29 marked on and 19 marked off in this snapshot, with 462 nodes across those definitions. This is a configuration snapshot, including shared work, copies, and retired or disabled definitions. A name tag is attribution evidence, not proof of sole authorship or current deployment.</p><table><thead><tr><th scope="col">Workflow family</th><th scope="col">Named entries</th><th scope="col">What the definitions show</th></tr></thead><tbody>${exportInventory.map(([family,count,summary])=>`<tr><td>${escape(family)}</td><td>${count}</td><td>${escape(summary)}</td></tr>`).join('')}</tbody></table></section><p class="hub-note">Workplace systems and public projects are described separately. The case studies use abstract diagrams and do not publish customer data, credentials, or proprietary implementation files.</p>`;
await writeFile(root+'index.html',shell('Baam engineering case studies','Architecture and engineering behind the Baam memory layer, workforce platform, ticket synchronization, support monitoring, and usage reporting.',hub,'hub'));
let md='# Baam engineering case studies\n\n[Read the case studies](https://zulfkicar.github.io/case-studies/)\n\nThese are public architecture narratives, not releases of workplace code or data. The source definitions below also generate the static portfolio pages.\n\n';
for (const s of studies) {
  md+=`## ${s.name}\n\n${s.summary}\n\n[Read the full case study](https://zulfkicar.github.io/case-studies/${s.id}/)\n\n`;
  for(const d of s.diagrams)md+=`### ${d.title}\n\n${d.caption}\n\n\`\`\`mermaid\n${await readFile(root+'diagrams/'+d.file+'.mmd','utf8')}\`\`\`\n\n`;
  md+=`**Scope:** ${s.scope}\n\n`;
}
md+='## Rebuild\n\nFrom the portfolio root, run `node scripts/build-case-studies.mjs` to regenerate HTML and this Markdown file from `case-studies/content.mjs`.\n\nSVGs are static builds of the `.mmd` files using [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli). With Mermaid CLI 11.12.0 installed, run `mmdc -i case-studies/diagrams/NAME.mmd -o case-studies/diagrams/NAME.svg -c case-studies/mermaid-config.json -b transparent`. The explorer uses local inline SVG, pointer and keyboard navigation, and curated component explanations. No diagram runtime, external model calls, or export data is required by visitors.\n';
await writeFile(root+'README.md',md);
console.log(`Generated ${studies.length} case studies, hub, and Markdown diagrams.`);

if(exportInventory.reduce((n,row)=>n+row[1],0)!==48)throw Error('Export inventory count mismatch');
