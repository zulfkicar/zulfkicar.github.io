import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {studies} from '../case-studies/content.mjs';
import {componentNotes} from '../case-studies/component-notes.mjs';
import {exportInventory} from '../case-studies/export-studies.mjs';
import {categories} from '../case-studies/categories.mjs';
import {diagramHtml} from './diagram-html.mjs';
import {themeControl} from './theme-control.mjs';
import {casePreview} from './case-study-previews.mjs';
import {architectureMap} from './architecture-maps.mjs';
const root = fileURLToPath(new URL('../case-studies/',import.meta.url));
const cssVersion=createHash('sha256').update(await readFile(root+'case-studies.css')).digest('hex').slice(0,12);
const viewerVersion=createHash('sha256').update(await readFile(root+'diagram-viewer.js')).digest('hex').slice(0,12);
const themeVersion=createHash('sha256').update(await readFile(root+'../theme.css')).update(await readFile(root+'../theme.js')).digest('hex').slice(0,12);
const portfolioVersion=createHash('sha256').update(await readFile(root+'../portfolio.css')).digest('hex').slice(0,12);
const categoriesInUse=categories.filter(c=>studies.some(s=>s.group===c.name));
let landing=(await readFile(root+'../index.html','utf8'))
  .replace(/<label class="theme-control">.*?<\/label>|<button type="button" class="theme-control"[\s\S]*?<\/button>/,themeControl)
  .replace(/(?<=portfolio\.css\?v=)[^"]+/,portfolioVersion)
  .replace(/(?<=theme\.(?:js|css)\?v=)[^"]+/g,themeVersion);
landing=landing.replace(/<div class="production-preview">[\s\S]*?<\/svg><\/div>/g,'');
for(const id of ['workforce-platform','ticket-sync']){
  const link=landing.indexOf('href="./case-studies/'+id+'/"');
  const headingEnd=landing.lastIndexOf('</div>',link);
  const headingStart=landing.lastIndexOf('<div class="baam-system-heading">',link);
  if(headingStart<0||headingEnd<headingStart)throw Error('Missing production card: '+id);
  const existing=landing.slice(headingStart,headingEnd);
  if(!existing.includes('production-preview'))landing=landing.slice(0,headingEnd)+'<div class="production-preview">'+casePreview(id)+'</div>'+landing.slice(headingEnd);
}
await writeFile(root+'../index.html',landing);
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Zulfiqar Ali</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)} | Zulfiqar Ali"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><link rel="icon" href="${home}assets/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#f6f5f0"><script src="${home}theme.js?v=${themeVersion}"></script><link rel="stylesheet" href="${css}?v=${cssVersion}"><link rel="stylesheet" href="${home}theme.css?v=${themeVersion}">${level==='detail'?`<script src="../diagram-viewer.js?v=${viewerVersion}" defer></script>`:''}</head><body><a class="skip" href="#main">Skip to content</a><div class="page"><header><a class="wordmark" href="${home}" aria-label="Zulfiqar Ali portfolio">ZA<span>/</span></a><div class="header-actions"><nav aria-label="Case study navigation"><a href="${home}#work">Work</a><a href="${index}">All case studies</a><a href="https://github.com/zulfkicar/zulfkicar.github.io/tree/main/case-studies">Diagram sources ↗</a></nav>${themeControl}</div></header><main id="main">${body}</main><footer><span>Zulfiqar Ali · Engineering case studies</span><a href="${home}#work">Back to portfolio ↗</a></footer></div></body></html>`;
};
for (const study of studies) {
  const dir=root+study.id+'/'; await mkdir(dir,{recursive:true});
  const diagrams=[];
  for (const diagram of study.diagrams) {
    const source=await readFile(root+'diagrams/'+diagram.file+'.mmd','utf8');
    const custom=architectureMap(diagram.file,source);
    if(custom)await writeFile(root+'diagrams/'+diagram.file+'.svg',custom);
    const svg=custom||await readFile(root+'diagrams/'+diagram.file+'.svg','utf8');
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
  const privacy=study.overviewOnly?'Company and customer records are excluded.':'Diagrams use simplified system roles. Company and customer records are excluded.';
  const body=`<div class="case-hero"><p class="eyebrow">${study.overviewOnly?'SYSTEM OVERVIEW':'CASE STUDY'} ${study.number} / ${escape(study.category)}</p><h1>${escape(study.title)}</h1><p class="lead">${escape(study.summary)}</p><ul class="stack" aria-label="Technology stack">${study.stack.map(s=>`<li>${escape(s)}</li>`).join('')}</ul></div><div class="reading-layout"><aside><nav aria-label="On this page"><a href="#problem">The problem</a><a href="#ownership">My contribution</a>${technicalNav}<a href="#impact">Outcome &amp; scope</a></nav></aside><article class="case-body"><section id="problem"><p class="eyebrow">01 / THE PROBLEM</p><h2>${escape(study.name)}</h2>${paragraphs(study.problem)}</section><section id="ownership"><p class="eyebrow">02 / MY CONTRIBUTION</p><p>${escape(study.ownership)}</p></section>${technicalBody}<section id="impact"><p class="eyebrow">${scopeNumber} / OUTCOME &amp; SCOPE</p><ul class="outcomes">${study.outcomes.map(s=>`<li>${escape(s)}</li>`).join('')}</ul><div class="scope"><h3>Implementation limits</h3><p>${escape(study.scope)}</p></div>${study.related?`<a class="related" href="${study.related.href}">${escape(study.related.label)} ↗</a>`:''}<p class="privacy-note">${privacy}</p></section><a class="next-study" href="../${next.id}/"><span>NEXT CASE STUDY / ${next.number}</span><strong>${escape(next.name)} ↗</strong></a></article></div>`;
  await writeFile(dir+'index.html',shell(study.title,study.summary,body));
}
const card=s=>`<a class="case-card" href="./${s.id}/"><div class="case-card-copy"><p class="eyebrow">${escape(s.category)}</p><h2>${escape(s.name)} <span aria-hidden="true">↗</span></h2><p>${escape(s.summary)}</p><small>${s.diagrams.length} interactive ${s.diagrams.length===1?'map':'maps'} · Architecture & design decisions</small></div><div class="case-preview">${casePreview(s.id)}</div></a>`;
for(const study of studies)if(!categories.some(category=>category.name===study.group))throw Error('Uncategorized case study: '+study.id);
const hub=`<div class="case-hero"><p class="eyebrow">WORK / ENGINEERING CASE STUDIES</p><h1>Systems, from problem<br>to implementation.</h1><p class="lead">Workforce software, cross-platform automation, and operational analytics. Explore the workflows, architecture, and decisions behind the work.</p><p class="case-context">Production systems and operational workflows at Baam.</p></div><nav class="category-nav" aria-label="Work categories">${categoriesInUse.map(c=>`<a href="#${c.id}">${escape(c.name)}<span>${studies.filter(s=>s.group===c.name).length}</span></a>`).join('')}</nav><section class="program-impact" aria-labelledby="impact-heading"><h2 id="impact-heading">Operational impact</h2><dl><div><dt>Lower Zapier task consumption</dt><dd>50%</dd></div><div><dt>Saved in task costs</dt><dd>$25,000+</dd></div><div><dt>Annual operational savings</dt><dd>$15,000+</dd></div></dl><p>The task reduction and task-cost savings come from moving automations to Cloudflare Workers. The annual figure covers separate AI-assisted tools and operational improvements. These results span multiple systems and are not individual case-study benchmarks.</p></section>${categoriesInUse.map(c=>`<section class="category-section" id="${c.id}" aria-labelledby="${c.id}-heading"><div class="category-heading"><h2 id="${c.id}-heading">${escape(c.name)}</h2><p>${escape(c.description)}</p></div><div class="case-list">${studies.filter(s=>s.group===c.name).map(card).join('')}</div></section>`).join('')}<p class="hub-note">Explore the related open-source projects for runnable demos and implementation code.</p>`;
await writeFile(root+'index.html',shell('Engineering case studies','Business software, automation, integrations, reliability, and analytics: system designs and engineering decisions by Zulfiqar Ali.',hub,'hub'));
let md='# Engineering case studies\n\n[Read the case studies](https://zulfkicar.github.io/case-studies/)\n\nBusiness software, automation and integrations, reliability, and analytics from operational work at Baam. These case studies describe problems, system designs, and implementation limits. They do not release workplace code or data.\n\n';
for (const s of studies) {
  md+=`## ${s.name}\n\n${s.summary}\n\n[Read the full case study](https://zulfkicar.github.io/case-studies/${s.id}/)\n\n`;
  for(const d of s.diagrams)md+=`### ${d.title}\n\n${d.caption}\n\n\`\`\`mermaid\n${await readFile(root+'diagrams/'+d.file+'.mmd','utf8')}\`\`\`\n\n`;
  md+=`**Scope:** ${s.scope}\n\n`;
}
md+='## Documentation coverage\n\nThe reviewed configuration archive contains 48 name-tagged entries across the families below. Counts include shared work, copies, and retired or disabled definitions. They are documentation coverage, not a claim of 48 independently authored or currently deployed systems.\n\n| Workflow family | Entries | Coverage |\n| --- | ---: | --- |\n'+exportInventory.map(([family,count,summary])=>`| ${family} | ${count} | ${summary} |`).join('\n')+'\n\n';
md+='## Rebuild\n\nFrom the portfolio root, run `node scripts/build-case-studies.mjs` to regenerate HTML and this Markdown file from `case-studies/content.mjs`.\n\nFlowcharts use hand-arranged component cards from `scripts/architecture-maps.mjs`, with every edge parsed and validated against its `.mmd` source. Sequence SVGs are static builds of the `.mmd` files using [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli). With Mermaid CLI 11.12.0 installed, run `mmdc -i case-studies/diagrams/NAME.mmd -o case-studies/diagrams/NAME.svg -c case-studies/mermaid-config.json -b transparent`. The explorer uses local inline SVG, pointer and keyboard navigation, and curated component explanations. No diagram runtime, external model calls, or export data is required by visitors.\n';
await writeFile(root+'README.md',md);
console.log(`Generated ${studies.length} case studies, hub, and Markdown diagrams.`);

if(exportInventory.reduce((n,row)=>n+row[1],0)!==48)throw Error('Export inventory count mismatch');
