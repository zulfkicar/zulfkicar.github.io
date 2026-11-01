import {openArchitecture} from './architecture-ui.mjs?v=20261101-r9';
import './collection.mjs?v=20261101-r9';
const previousSections={work:'projects',baam:'automation',research:'finance',playground:'algorithms'};
if(previousSections[location.hash.slice(1)])history.replaceState(null,'','#'+previousSections[location.hash.slice(1)]);
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-open-project]');if(trigger){event.preventDefault();openArchitecture(trigger.dataset.openProject);}});
const categories={automation:'Automation & systems',ai:'AI & agents',finance:'Finance & forecasting',algorithms:'Algorithms & simulations'};
const labels={projects:'All categories',automation:categories.automation,ai:categories.ai,finance:categories.finance,algorithms:categories.algorithms};
function applyCategory(scroll=false){const key=location.hash.slice(1),category=Object.hasOwn(categories,key)?key:'all';document.querySelectorAll('[data-category]').forEach(item=>{item.hidden=category!=='all'&&item.dataset.category!==category;});document.querySelectorAll('[data-filter]').forEach(link=>{if(link.dataset.filter===category)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});document.querySelector('#category-status').textContent=labels[key]||'All categories';if(scroll)document.querySelector('#projects').scrollIntoView({block:'start'});}
document.querySelectorAll('[data-filter]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',link.getAttribute('href'));applyCategory(true);}));
window.addEventListener('hashchange',()=>applyCategory(Object.hasOwn(categories,location.hash.slice(1))));window.addEventListener('popstate',()=>applyCategory(Object.hasOwn(categories,location.hash.slice(1))));applyCategory(Object.hasOwn(categories,location.hash.slice(1)));
