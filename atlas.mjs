import * as THREE from './vendor/three.module.js';

// An explorable index: orbital tracks are layout guides, not system dependencies.
export function createAtlas({ canvas, wrap, projects, selected = 'chess', onSelect, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const camera = new THREE.OrthographicCamera(-9,9,7,-7,.1,100);camera.position.set(7,12,15);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x5c6960,3));
  const light = new THREE.DirectionalLight(0xffffff,4);light.position.set(-4,10,8);scene.add(light);
  const locations = [[-4.3,.2,1.1],[-2.3,.3,-3.7],[1.5,.3,-4.2],[4.3,.2,-1.5],[3.8,.2,2.6],[.6,.3,4.3],[-2.7,-1.1,4.1],[-4.3,.3,-2]];
  const objects = [], labels = [], ids = Object.keys(projects), ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const material = color => new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.12});
  const add = (group,geometry,mat,x=0,y=0,z=0) => { const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh; };
  ids.forEach((id,index)=>{
    const p=projects[id], group=new THREE.Group(), colored=material(p.color), cream=material('#e0e4d7');
    group.position.set(...locations[index]); group.userData.id=id;
    if(id==='workforce') for(let i=0;i<3;i++) add(group,new THREE.BoxGeometry(1.4,.14,.95),i===2?colored:cream,0,i*.3,0);
    if(id==='unzap') { for(let i=0;i<3;i++) add(group,new THREE.BoxGeometry(.52,.52,.52),i===0?colored:cream,(i-1)*.6,i===1?.65:0,0); }
    if(id==='chess') {add(group,new THREE.CylinderGeometry(.55,.7,.16,32),cream);add(group,new THREE.CylinderGeometry(.25,.45,1.1,8),colored,0,.6,0);add(group,new THREE.CylinderGeometry(.48,.3,.3,8),colored,0,1.3,0);for(let n=0;n<4;n++)add(group,new THREE.BoxGeometry(.2,.3,.2),cream,Math.cos(n*Math.PI/2)*.36,1.58,Math.sin(n*Math.PI/2)*.36);}
    if(id==='threadbridge') {const a=add(group,new THREE.TorusGeometry(.5,.13,12,40),colored,-.35,.6);a.rotation.y=.8;const b=add(group,new THREE.TorusGeometry(.5,.13,12,40),cream,.35,.6);b.rotation.y=-.2;}
    if(id==='crash') [.4,.65,1.05,.25,.5,.9].forEach((h,i)=>add(group,new THREE.BoxGeometry(.2,h,.3),i===3?cream:colored,(i-2.5)*.27,h/2,0));
    if(id==='fluids') {const m=add(group,new THREE.TorusKnotGeometry(.48,.14,64,8,2,3),colored,0,.7);m.rotation.x=.4;}
    if(id==='boids') for(let i=0;i<7;i++){const m=add(group,new THREE.ConeGeometry(.14,.5,3),i%2?cream:colored,(i%3-.8)*.4,.4+Math.floor(i/3)*.2,(Math.floor(i/3)-1)*.4);m.rotation.z=-.7;}
    if(id==='regex') for(let i=0;i<3;i++){const m=add(group,new THREE.TorusGeometry(.28,.065,10,24),i===2?colored:cream,(i-1)*.7,.5);m.rotation.x=-.3;}
    const halo=new THREE.Mesh(new THREE.RingGeometry(.93,.95,64),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.7,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=-.05;group.add(halo);
    group.traverse(child=>child.userData.id=id);root.add(group);objects.push(group);
    const label=document.createElement('button');label.className='atlas-label';label.textContent=p.name;label.dataset.atlasProject=id;label.setAttribute('aria-pressed',String(id===selected));label.addEventListener('click',()=>onSelect(id));wrap.querySelector('.atlas-labels').append(label);labels.push(label);
  });
  const trackMaterial=new THREE.LineBasicMaterial({color:'#7b8a80',transparent:true,opacity:.25});
  [2.5,5.2].forEach(radius=>{const points=Array.from({length:97},(_,i)=>new THREE.Vector3(Math.cos(i/96*Math.PI*2)*radius,-.1,Math.sin(i/96*Math.PI*2)*radius));root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),trackMaterial));});
  const cross=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.4,0,0),new THREE.Vector3(.4,0,0),new THREE.Vector3(0,0,-.4),new THREE.Vector3(0,0,.4)]);root.add(new THREE.LineSegments(cross,trackMaterial));
  let target=-.18, frame=0, active=true, dragging=null, width=1, height=1, labelSizes=[];
  function request(){if(!frame&&active&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(){
    frame=0;if(!active||document.hidden)return;
    let moving=false;const delta=target-root.rotation.y;
    if(Math.abs(delta)>.001){root.rotation.y+=delta*(reducedMotion?1:.18);moving=true;}
    objects.forEach((object,i)=>{const scale=ids[i]===selected?1.17:1;const d=scale-object.scale.x;if(Math.abs(d)>.001){object.scale.setScalar(object.scale.x+d*(reducedMotion?1:.2));moving=true;}});
    scene.updateMatrixWorld(true);renderer.render(scene,camera);
    const positions=objects.map((object,i)=>{const p=object.getWorldPosition(new THREE.Vector3());p.y-=.4;p.project(camera);const size=labelSizes[i]||{w:100,h:40};return{i,w:size.w,h:size.h,x:THREE.MathUtils.clamp((p.x*.5+.5)*width,size.w/2+3,width-size.w/2-3),y:(-p.y*.5+.5)*height+20};}).sort((a,b)=>a.y-b.y);
    const placed=[];
    positions.forEach(item=>{
      for(const other of placed)if(Math.abs(item.x-other.x)<(item.w+other.w)/2+5&&item.y<other.y+other.h+5&&item.y+item.h>other.y-5)item.y=other.y+other.h+5;
      item.y=Math.min(item.y,height-item.h-3);placed.push(item);
      const label=labels[item.i];label.style.left=`${item.x}px`;label.style.top=`${item.y}px`;label.dataset.selected=String(ids[item.i]===selected);label.setAttribute('aria-pressed',String(ids[item.i]===selected));
    });
    if(moving)request();
  }
  function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;width=w;height=h;labelSizes=labels.map(label=>({w:label.offsetWidth,h:label.offsetHeight}));renderer.setSize(w,h,false);const view=w<420?7.9:5.5,aspect=w/h;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();request();}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={x:e.clientX,y:e.clientY,target,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-dragging.x;if(Math.hypot(dx,e.clientY-dragging.y)>5)dragging.moved=true;if(dragging.moved){target=dragging.target+dx*.006;request();}});
  canvas.addEventListener('pointerup',e=>{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(dragging&&!dragging.moved){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(objects,true)[0];if(hit)onSelect(hit.object.userData.id);}dragging=null;});
  canvas.addEventListener('pointercancel',()=>{dragging=null;});
  const observer=new ResizeObserver(resize);observer.observe(wrap);
  const visibility=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(active)request();});visibility.observe(wrap);
  const wake=()=>request();document.addEventListener('visibilitychange',wake);window.addEventListener('appearancechange',wake);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();wrap.dataset.renderer='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{wrap.dataset.renderer='three';request();});
  wrap.dataset.renderer='three';resize();
  return {select(id){selected=id;request();},reset(){target=-.18;request();},setReducedMotion(value){reducedMotion=value;request();}};
}
