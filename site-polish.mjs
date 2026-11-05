// Keep a bounded selected label inside the browser's native customizable select.
// selectedcontent is maintained by the browser, including keyboard/form behavior.
if (CSS.supports('appearance', 'base-select')) {
 const selector='select:not([multiple]):not([size]),select[size="1"]';
 function prepareSelect(select) {
  if (!select.matches(selector) || select.querySelector(':scope > button')) return;
  const button=document.createElement('button');
  button.type='button';
  button.append(document.createElement('selectedcontent'));
  select.prepend(button);
 }
 document.querySelectorAll(selector).forEach(prepareSelect);
 new MutationObserver(records=>{
  for(const record of records){
   if(record.target instanceof HTMLSelectElement) prepareSelect(record.target);
   for(const node of record.addedNodes){
    if(!(node instanceof Element)) continue;
    if(node.matches(selector)) prepareSelect(node);
    node.querySelectorAll(selector).forEach(prepareSelect);
   }
  }
 }).observe(document.documentElement,{childList:true,subtree:true});
}
// Reading position is reflected in the case-study index without hijacking navigation.
const links=[...document.querySelectorAll('.reading-layout aside nav a[href^="#"]')];
if(links.length){
 const sections=links.map(link=>document.getElementById(link.hash.slice(1))).filter(Boolean);
 function mark(id){for(const link of links){if(link.hash==='#'+id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}
 mark(sections[0]?.id);
 const visible=new Set();
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);
  const nearest=[...visible].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-100)-Math.abs(b.getBoundingClientRect().top-100))[0];if(nearest)mark(nearest.id);
 },{rootMargin:'-95px 0px -55% 0px',threshold:0});
 sections.forEach(section=>observer.observe(section));
}
// A deterministic readiness signal for visual checks, after fonts and local content settle.
async function markReady(){
 await document.fonts.ready;
 if(document.body.dataset.experience==='crash'&&document.querySelector('main .loading')&&!document.querySelector('#retry')){
  await new Promise(resolve=>{const observer=new MutationObserver(()=>{if(!document.querySelector('main .loading')||document.querySelector('#retry')){observer.disconnect();resolve();}});observer.observe(document.querySelector('main'),{childList:true,subtree:true});});
 }
 await Promise.all([...document.images].filter(image=>!image.complete&&image.loading!=='lazy').map(image=>new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 document.documentElement.dataset.siteReady='true';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markReady,{once:true});else markReady();
