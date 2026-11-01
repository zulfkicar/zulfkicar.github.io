/* Local, same-origin page transitions. Navigation remains a real document load. */
(()=>{
 const key='za-preview-project-entry',reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let busy=false,portal=null;
 const safeRead=()=>{try{const item=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);return item;}catch{return null;}};
 const safeWrite=item=>{try{sessionStorage.setItem(key,JSON.stringify(item));}catch{}};
 function create(item){
  const overlay=document.createElement('div');overlay.className='project-portal';overlay.setAttribute('aria-hidden','true');
  overlay.style.setProperty('--portal-bg',item.background);overlay.style.setProperty('--portal-ink',item.ink);
  const curtain=document.createElement('div');curtain.className='portal-curtain';
  const cover=document.createElement('div');cover.className='portal-cover';
  const image=document.createElement('img');image.src=item.cover;image.alt='';
  const label=document.createElement('div');label.className='portal-label';
  const title=document.createElement('strong');title.textContent=item.title;
  const subtitle=document.createElement('small');subtitle.textContent=item.subtitle;
  const signature=document.createElement('span');signature.textContent='ZULFIQAR ALI / PROJECT';
  label.append(title,subtitle,signature);cover.append(image,label);
  const status=document.createElement('div');status.className='portal-status';status.textContent=item.title;
  overlay.append(curtain,cover,status);document.documentElement.append(overlay);
  return{overlay,curtain,cover,status};
 }
 function center(item){
  const scale=Math.min(1.18,(innerWidth-60)/item.width,(innerHeight-145)/item.height);
  return{left:(innerWidth-item.width)/2,top:(innerHeight-item.height)/2-12,scale};
 }
 function position(cover,item){cover.style.width=`${item.width}px`;cover.style.height=`${item.height}px`;const c=center(item);cover.style.left=`${c.left}px`;cover.style.top=`${c.top}px`;cover.style.transform=`scale(${c.scale})`;return c;}
 function cleanup(){portal?.overlay.remove();portal=null;busy=false;document.documentElement.removeAttribute('data-project-opening');}
 async function open({href,title,subtitle,cover,source}){
  const url=new URL(href,location.href);if(url.origin!==location.origin)return;
  if(busy)return;
  if(reduced.matches||!source?.animate){location.assign(url.href);return;}
  busy=true;document.documentElement.dataset.projectOpening=title;
  const rect=source.getBoundingClientRect(),style=getComputedStyle(document.body);
  const item={path:url.pathname,title,subtitle,cover,width:source.offsetWidth,height:source.offsetHeight,background:style.backgroundColor,ink:style.color,time:Date.now()};
  portal=create(item);const c=position(portal.cover,item);
  // Warm the same-origin document without evaluating or replacing any of its scripts.
  const preload=document.createElement('link');preload.rel='prefetch';preload.href=url.href;document.head.append(preload);
  portal.curtain.animate([{opacity:0},{opacity:1}],{duration:440,fill:'forwards'});
  portal.status.animate([{opacity:0},{opacity:1}],{duration:440,fill:'forwards'});
  const from=`translate(${rect.left-c.left}px,${rect.top-c.top}px) scale(${rect.width/item.width},${rect.height/item.height}) rotateY(-7deg)`;
  try{await portal.cover.animate([{transform:from},{transform:`scale(${c.scale})`}],{duration:540,easing:'cubic-bezier(.22,.8,.2,1)',fill:'forwards'}).finished;}
  catch{cleanup();return;}
  if(!busy)return;safeWrite(item);location.assign(url.href);
 }
 window.portfolioNavigation={open};
 const arriving=safeRead();
 if(arriving?.path===location.pathname&&Date.now()-arriving.time<15000&&!reduced.matches){
  portal=create(arriving);position(portal.cover,arriving);document.documentElement.dataset.projectArrival=arriving.title;
  // A fail-open timer prevents an unreadable page even if a project script fails.
  const failsafe=setTimeout(cleanup,2600);
  const reveal=async()=>{
   await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,350))]);
   const active=portal;if(!active)return;
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const animation=active.overlay.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-26px)'}],{duration:500,easing:'cubic-bezier(.2,.65,.2,1)',fill:'forwards'});
   await animation.finished.catch(()=>{});clearTimeout(failsafe);cleanup();
   document.documentElement.dataset.projectArrival='complete';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal,{once:true});else reveal();
 }
 window.addEventListener('pageshow',event=>{if(event.persisted)cleanup();});
})();
