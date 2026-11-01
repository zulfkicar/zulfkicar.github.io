/** Shared SVG navigation. Inspecting a node never discards a visitor's viewport. */
export function createDiagramNavigation({svg,width,height,onChange=()=>{}}){
 let box={x:0,y:0,width,height},drag=null,pinch=null,suppressUntil=0;
 const pointers=new Map();
 svg.setAttribute('tabindex','0');svg.style.touchAction='none';
 function write(next){
  const scale=Math.max(.35,Math.min(4,next.width/width));
  box={x:next.x,y:next.y,width:width*scale,height:height*scale};
  svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.width} ${box.height}`);
  svg.dataset.diagramZoom=(width/box.width).toFixed(2);onChange(width/box.width);
 }
 function local(x,y,inverse=svg.getScreenCTM()?.inverse()){return inverse?new DOMPoint(x,y).matrixTransform(inverse):{x,y};}
 function zoomBy(factor,point){
  const anchor=point||{x:box.x+box.width/2,y:box.y+box.height/2};
  const scale=Math.max(.35*width/box.width,Math.min(4*width/box.width,1/factor));
  write({x:anchor.x-(anchor.x-box.x)*scale,y:anchor.y-(anchor.y-box.y)*scale,width:box.width*scale,height:box.height*scale});
 }
 const down=event=>{
  if(event.button!==0)return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){
   const [a,b]=[...pointers.values()],inverse=svg.getScreenCTM()?.inverse();
   pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),box:{...box},inverse,anchor:local((a.x+b.x)/2,(a.y+b.y)/2,inverse)};drag=null;
  }else{const inverse=svg.getScreenCTM()?.inverse();drag={id:event.pointerId,start:local(event.clientX,event.clientY,inverse),box:{...box},inverse,x:event.clientX,y:event.clientY,moved:false};}
  if(pinch)for(const id of pointers.keys())svg.setPointerCapture(id);
 };
 const move=event=>{
  if(!pointers.has(event.pointerId))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pinch&&pointers.size===2){
   const [a,b]=[...pointers.values()],distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
   const scale=Math.max(.35*width/pinch.box.width,Math.min(4*width/pinch.box.width,pinch.distance/distance));
   const center=local((a.x+b.x)/2,(a.y+b.y)/2,pinch.inverse);
   write({x:pinch.anchor.x-(pinch.anchor.x-pinch.box.x)*scale-(center.x-pinch.anchor.x),y:pinch.anchor.y-(pinch.anchor.y-pinch.box.y)*scale-(center.y-pinch.anchor.y),width:pinch.box.width*scale,height:pinch.box.height*scale});
   suppressUntil=performance.now()+250;svg.dataset.panning='true';return;
  }
  if(!drag||event.pointerId!==drag.id)return;
  if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)drag.moved=true;
  if(!drag.moved)return;
  if(!svg.hasPointerCapture(event.pointerId))svg.setPointerCapture(event.pointerId);
  const point=local(event.clientX,event.clientY,drag.inverse);
  write({...drag.box,x:drag.box.x-(point.x-drag.start.x),y:drag.box.y-(point.y-drag.start.y)});svg.dataset.panning='true';
 };
 const end=event=>{
  if(drag?.moved||pinch)suppressUntil=performance.now()+250;
  pointers.delete(event.pointerId);if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
  drag=null;pinch=null;svg.dataset.panning='false';
 };
 const click=event=>{if(event.detail&&performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}};
 const wheel=event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();zoomBy(Math.exp(-event.deltaY*.008),local(event.clientX,event.clientY));};
 const key=event=>{
  if(event.target.closest('input,select,textarea'))return;
  const delta=event.shiftKey ? .2 : .08;
  if(event.key==='ArrowLeft')write({...box,x:box.x-box.width*delta});
  else if(event.key==='ArrowRight')write({...box,x:box.x+box.width*delta});
  else if(event.key==='ArrowUp')write({...box,y:box.y-box.height*delta});
  else if(event.key==='ArrowDown')write({...box,y:box.y+box.height*delta});
  else if(event.key==='+'||event.key==='=')zoomBy(1.2);
  else if(event.key==='-')zoomBy(1/1.2);
  else if(event.key==='0'||event.key==='f')write({x:0,y:0,width,height});
  else return;
  event.preventDefault();
 };
 svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('click',click,true);svg.addEventListener('wheel',wheel,{passive:false});svg.addEventListener('keydown',key);
 write(box);
 return{
  fit(){write({x:0,y:0,width,height});},zoomBy,
  setZoom(value){zoomBy(value/(width/box.width));},
  reveal(rect){const margin=25;if(rect.x>=box.x+margin&&rect.y>=box.y+margin&&rect.x+rect.width<=box.x+box.width-margin&&rect.y+rect.height<=box.y+box.height-margin)return;write({...box,x:rect.x+rect.width/2-box.width/2,y:rect.y+rect.height/2-box.height/2});},
  dispose(){svg.removeEventListener('pointerdown',down);svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',end);svg.removeEventListener('pointercancel',end);svg.removeEventListener('click',click,true);svg.removeEventListener('wheel',wheel);svg.removeEventListener('keydown',key);}
 };
}
