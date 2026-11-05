// A demo keeps its own identity in the portfolio iframe and on its own route.
if(window.self!==window.top){
 document.documentElement.dataset.embedded='true';
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}
function syncChrome(){const color=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();if(color)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);}
window.addEventListener('appearancechange',()=>requestAnimationFrame(syncChrome));
syncChrome();

/* Workspace pass: interaction before supporting detail. */

// The research chart can take the room while preserving its actual DOM and handlers.
if(document.body.dataset.experience==='crash'){
 function prepareCharts(){
  for(const panel of document.querySelectorAll('.chart-panel')){
   const chart=panel.querySelector('.chart'),head=panel.querySelector('.panel-head');
   if(!chart||!head||panel.dataset.expandable)continue;
   panel.dataset.expandable='true';
   const button=document.createElement('button');button.type='button';button.className='expand-chart';button.textContent='Expand chart ↗';
   button.addEventListener('click',()=>{
    const title=head.querySelector('h2')?.textContent||'Research chart',placeholder=document.createElement('div');placeholder.style.minHeight=chart.getBoundingClientRect().height+'px';chart.before(placeholder);
    const dialog=document.createElement('dialog');dialog.className='focused-chart';dialog.setAttribute('aria-label',title);
    const bar=document.createElement('div');bar.className='focused-chart-head';const heading=document.createElement('h2');heading.textContent=title;const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close expanded chart');bar.append(heading,close);dialog.append(bar,chart);document.body.append(dialog);
    close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{placeholder.replaceWith(chart);dialog.remove();window.dispatchEvent(new Event('resize'));button.focus({preventScroll:true});},{once:true});
    dialog.showModal();window.dispatchEvent(new Event('resize'));
   });head.append(button);
  }
 }
 const root=document.querySelector('#app');if(root){new MutationObserver(prepareCharts).observe(root,{childList:true,subtree:true});prepareCharts();}
}


document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||event.target.closest('select')?.matches(':open'))return;
 const dock=document.querySelector('.instrument-dock[open]');if(dock){dock.open=false;dock.querySelector('summary').focus({preventScroll:true});}
});
