// Controls only the experiment's own loop. Architecture viewers retain their own RAFs.
(()=>{
 const media=matchMedia('(prefers-reduced-motion:reduce)');
 let paused=media.matches,first=true,callback=null,frame=0,draws=0,button;
 function paintControl(){
  document.documentElement.dataset.simulationPaused=String(paused);
  if(button){button.textContent=paused?'▶ Resume':'Ⅱ Pause';button.setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');button.setAttribute('aria-pressed',String(paused));}
 }
 function request(next){
  callback=next;if(frame||document.hidden||(paused&&!first))return;
  frame=requestAnimationFrame(timestamp=>{frame=0;first=false;draws++;document.documentElement.dataset.simulationFrames=String(draws);next(timestamp);});
 }
 function setPaused(value){paused=value;if(paused){cancelAnimationFrame(frame);frame=0;}else if(callback)request(callback);paintControl();}
 window.portfolioMotion={request};paintControl();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(callback)request(callback);});
 media.addEventListener('change',event=>setPaused(event.matches));
 document.addEventListener('DOMContentLoaded',()=>{button=document.createElement('button');button.className='simulation-motion';button.type='button';button.addEventListener('click',()=>setPaused(!paused));document.body.append(button);paintControl();});
})();
