import {projects,topics,byId,topicById,escape,searchProjects} from './content.mjs';
export {projects,topics,byId,topicById,escape};
export function installCommandPalette({button,select}) {
  const dialog=document.querySelector('#command-dialog'),input=dialog.querySelector('input'),results=dialog.querySelector('.command-results');
  let trigger;
  function render(){
    const found=searchProjects(input.value);
    results.innerHTML=found.length?found.map(project=>`<button type="button" data-command-project="${project.id}"><span>${escape(project.title)}</span><small>${escape(topicById[project.category].name)}</small></button>`).join(''):'<p class="command-empty">No matching projects.</p>';
  }
  function open(){trigger=document.activeElement;input.value='';render();dialog.showModal();input.focus();}
  dialog.addEventListener('close',()=>trigger?.focus({preventScroll:true}));
  dialog.querySelector('[data-command-close]').addEventListener('click',()=>dialog.close());
  results.addEventListener('click',event=>{const id=event.target.closest('[data-command-project]')?.dataset.commandProject;if(id){dialog.close();select(id);}});
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}if(event.key==='Enter'){event.preventDefault();const first=results.querySelector('button');if(first){dialog.close();select(first.dataset.commandProject);}}});
  results.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();});
  button.addEventListener('click',open);
  document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(dialog.open)dialog.close();else open();}});
}
export function groupedOptions(selected='workforce') {return topics.map(topic=>`<optgroup label="${escape(topic.name)}">${projects.filter(p=>p.category===topic.id).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escape(p.title)}</option>`).join('')}</optgroup>`).join('');}
