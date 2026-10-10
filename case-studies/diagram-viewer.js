// Local SVG exploration. No network calls, diagram runtime, or model dependency.
for (const figure of document.querySelectorAll('[data-explorer]')) {
  const find=selector=>figure.querySelector(selector);
  const canvas=find('.diagram-canvas'),stage=find('.diagram-stage'),svg=find('svg');
  const notes=JSON.parse(find('[data-component-notes]').textContent);
  const keys=Object.keys(notes),select=find('[data-part-select]');
  const parts=[...svg.querySelectorAll('[data-part]')];
  const view=svg.viewBox.baseVal;
  let x=0,y=0,zoom=1,selected='',mode='fit',dragged=false;
  const overview=find('[data-part-does]').textContent;
  const pointers=new Map();
  let gesture=null;
  svg.style.width=view.width+'px';svg.style.height=view.height+'px';
  figure.dataset.ready='true';find('.diagram-toolbar').hidden=false;
  function paint(){
    stage.style.transform=`translate(${x}px, ${y}px) scale(${zoom})`;
    find('[data-zoom]').value=Math.round(zoom*100)+'%';
    canvas.dataset.scale=String(zoom);
  }
  function fit(){
    mode='fit';
    zoom=Math.max(.035,Math.min((canvas.clientWidth-56)/view.width,(canvas.clientHeight-56)/view.height,1));
    x=(canvas.clientWidth-view.width*zoom)/2;y=(canvas.clientHeight-view.height*zoom)/2;paint();
  }
  function scaleAt(next,cx=canvas.clientWidth/2,cy=canvas.clientHeight/2){
    mode='manual';next=Math.max(.035,Math.min(3,next));
    x=cx-(cx-x)*next/zoom;y=cy-(cy-y)*next/zoom;zoom=next;paint();
  }
  function locate(){
    const node=parts.find(el=>el.dataset.part===selected);
    if(!node)return;
    const box=node.getBoundingClientRect(),frame=canvas.getBoundingClientRect();
    const nx=(box.left+box.width/2-frame.left-x)/zoom,ny=(box.top+box.height/2-frame.top-y)/zoom;
    zoom=Math.min(1.15,(canvas.clientWidth-64)/(box.width/zoom),(canvas.clientHeight-64)/(box.height/zoom));
    x=canvas.clientWidth/2-nx*zoom;y=canvas.clientHeight/2-ny*zoom;mode='manual';paint();
    if(frame.top<0||frame.bottom>innerHeight)canvas.scrollIntoView({block:'center',behavior:'instant'});
  }
  function inspect(key){
    if(key&&!notes[key])return;
    selected=key;select.value=key;
    const n=notes[key];
    for(const part of parts){const active=part.dataset.part===key;part.classList.toggle('is-selected',active);part.setAttribute('aria-pressed',String(active));}
    find('[data-part-type]').textContent=n?n.kind:'OVERVIEW';find('[data-part-type]').dataset.kind=n?.kind||'';
    find('[data-part-title]').textContent=n?.title||'Explore the flow.';
    find('[data-part-does]').textContent=n?.does||overview;
    find('[data-part-why]').textContent=n?.why||'';find('[data-why-section]').hidden=!n;
    find('[data-part-caveat]').textContent=n?.caveat||'';find('.part-caveat').hidden=!n?.caveat;
    find('[data-action="focus"]').disabled=!n;
    find('[data-part-index]').textContent=n?`${keys.indexOf(key)+1} / ${keys.length}`:'Select a part to begin';
  }
  for(const part of parts){
    part.setAttribute('role','button');part.setAttribute('aria-label','Inspect '+notes[part.dataset.part].title);
    part.setAttribute('tabindex',part.classList.contains('actor-bottom')?'-1':'0');part.setAttribute('aria-pressed','false');
    part.addEventListener('click',()=>{if(!dragged)inspect(part.dataset.part);});
    part.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();inspect(part.dataset.part);}});
    part.addEventListener('focus',()=>{if(part.matches(':focus-visible')){inspect(part.dataset.part);locate();}});
  }
  select.addEventListener('change',()=>inspect(select.value));
  figure.addEventListener('click',async event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    if(action==='in')scaleAt(zoom*1.3);if(action==='out')scaleAt(zoom/1.3);if(action==='actual')scaleAt(1);if(action==='fit')fit();if(action==='focus')locate();
    if(action==='next'||action==='previous'){
      const current=keys.indexOf(selected),index=current<0?(action==='next'?0:keys.length-1):(current+(action==='next'?1:-1)+keys.length)%keys.length;
      inspect(keys[index]);locate();
    }
    if(action==='fullscreen'){
      try{if(document.fullscreenElement===figure)await document.exitFullscreen();else await figure.requestFullscreen();}
      catch{find('[data-action="fullscreen"]').textContent='Expansion unavailable';}
    }
  });
  if(!figure.requestFullscreen)find('[data-action="fullscreen"]').hidden=true;
  document.addEventListener('fullscreenchange',()=>{
    const full=document.fullscreenElement===figure;
    find('[data-action="fullscreen"]').textContent=full?'Close expanded view ↙':'Expand ↗';
    find('[data-action="fullscreen"]').setAttribute('aria-label',full?'Close expanded diagram':'Expand diagram');
    if(full){mode='fit';requestAnimationFrame(fit);}
  });
  canvas.addEventListener('wheel',event=>{
    if(!event.ctrlKey&&!event.metaKey&&document.activeElement!==canvas)return;
    event.preventDefault();const rect=canvas.getBoundingClientRect();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
    scaleAt(zoom*Math.exp(-Math.max(-200,Math.min(200,delta))*.006),event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});
  function snapshotGesture(){
    const points=[...pointers.values()];
    if(points.length===1)gesture={type:'pan',point:points[0],x,y};
    else if(points.length>=2){const [a,b]=points,rect=canvas.getBoundingClientRect();gesture={type:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),cx:(a.x+b.x)/2-rect.left,cy:(a.y+b.y)/2-rect.top,x,y,zoom};}
    else gesture=null;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    dragged=false;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);snapshotGesture();canvas.classList.add('is-panning');
    if(!event.target.closest('[data-part]'))canvas.focus({preventScroll:true});
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const points=[...pointers.values()];
    if(gesture.type==='pan'&&points.length===1){
      const dx=points[0].x-gesture.point.x,dy=points[0].y-gesture.point.y;
      if(Math.hypot(dx,dy)>4)dragged=true;
      if(dragged){x=gesture.x+dx;y=gesture.y+dy;mode='manual';paint();}
    }else if(gesture.type==='pinch'&&points.length>=2){
      dragged=true;mode='manual';const [a,b]=points,rect=canvas.getBoundingClientRect();
      zoom=Math.max(.035,Math.min(3,gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance));
      x=(a.x+b.x)/2-rect.left-(gesture.cx-gesture.x)*zoom/gesture.zoom;y=(a.y+b.y)/2-rect.top-(gesture.cy-gesture.y)*zoom/gesture.zoom;paint();
    }
  });
  function endPointer(event){pointers.delete(event.pointerId);snapshotGesture();if(!pointers.size)canvas.classList.remove('is-panning');}
  canvas.addEventListener('pointerup',event=>{
    // Pointer capture retargets a click. Resolve the SVG part before releasing.
    if(!dragged&&pointers.size===1){const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-part]');if(target&&svg.contains(target))inspect(target.dataset.part);}
    endPointer(event);
  });
  canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
  canvas.addEventListener('keydown',event=>{
    if(event.target!==canvas)return;
    if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))event.preventDefault();
    if(event.key==='+'||event.key==='=')scaleAt(zoom*1.3);if(event.key==='-')scaleAt(zoom/1.3);if(event.key==='0')fit();
    const pan={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[event.key];
    if(pan){mode='manual';x+=pan[0];y+=pan[1];paint();}if(event.key==='Escape')inspect('');
  });
  new ResizeObserver(()=>{if(mode==='fit')fit();}).observe(canvas);fit();
}
