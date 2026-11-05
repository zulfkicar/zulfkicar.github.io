import {projects,topics,topicById,escape,searchProjects} from './content.mjs?v=20261105-curated';
export function catalogueProjects({topic='all',query='',sort='collection'}={}){
 const found=searchProjects(query).filter(project=>topic==='all'||project.category===topic);
 return sort==='name'?found.toSorted((a,b)=>a.title.localeCompare(b.title)):found;
}
export function catalogueMarkup(options={}){
 const found=catalogueProjects(options),filter=options.topic||'all';
 const groups=topics.filter(topic=>filter==='all'||filter===topic.id).map(topic=>{
  const rows=found.filter(project=>project.category===topic.id);if(!rows.length)return '';
  return `<section class="catalogue-group" aria-label="${escape(topic.name)}"><div class="catalogue-group-heading"><span class="topic-dot" data-topic="${topic.id}"></span><h2>${escape(topic.name)}</h2><span>${rows.length}</span></div>${rows.map(project=>`<button type="button" class="catalogue-row" data-project="${project.id}"><span class="project-glyph" data-topic="${project.category}" aria-hidden="true">${project.id==='chess'?'♞':project.id==='compression'?'01':project.id==='regex'?'.*':project.id==='reaction'?'∂':project.id==='threadbridge'?'⇄':project.id==='unzap'?'⌘':'◇'}</span><span class="catalogue-name"><strong>${escape(project.title)}</strong><small>${escape(project.stack.slice(0,2).join(' · '))}</small></span><span class="catalogue-kind">${escape(project.kind)}</span><span class="catalogue-format">${project.demo?'Interactive':'Case study'}</span><span class="catalogue-arrow" aria-hidden="true">↗</span></button>`).join('')}</section>`;
 }).join('');
 return {count:found.length,html:groups||(filter==='publications'&&!options.query?'<div class="catalogue-empty"><h2>Nothing published here yet.</h2><p>Future publications will include their abstracts, links and supporting material.</p></div>':'<div class="catalogue-empty"><h2>No matching projects</h2><p>Try another technology, project name or collection.</p></div>')};
}
export function catalogueTitle(topic){return Object.hasOwn(topicById,topic)?topicById[topic].name:'All projects';}
