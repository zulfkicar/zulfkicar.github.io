import * as THREE from './vendor/three.module.js?v=20261101-r9';

function labelTexture(title,detail){
 const canvas=document.createElement('canvas');canvas.width=840;canvas.height=220;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f1e9';ctx.fillRect(0,0,840,220);
 ctx.fillStyle='#5b6a59';ctx.font='20px "IBM Plex Mono", monospace';ctx.fillText(detail.toUpperCase(),30,48);
 ctx.fillStyle='#25332e';ctx.font='48px "Space Grotesk", Arial';
 const lines=[''];for(const word of title.split(' ')){const last=lines.length-1;if(ctx.measureText(lines[last]+' '+word).width>770)lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;}
 lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,30,118+i*43));
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createSpatialArchitecture({canvas,wrap,graph,onSelect,onLayerChange=()=>{}}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const camera=new THREE.OrthographicCamera(-11,11,9,-9,.1,100);camera.position.set(13,11,17);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x5a7169,3));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-4,12,8);scene.add(light);
 const groups=[],nodes=new Map(),nodeInfo=new Map(graph.nodes.map(n=>[n.id,n])),edges=[],origins=[],positions=[];
 const accent=new THREE.Color(graph.color),baseMaterial=new THREE.MeshStandardMaterial({color:'#c8d2c5',roughness:.8});
 const upright=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));
 const flat=new THREE.Quaternion(),stackCamera=new THREE.Vector3(13,11,17),screenCamera=new THREE.Vector3(0,0,24);
 let frame=0,paused=false,mode='stack',activeLayer=0,moveLayers=false,yaw=-.3,pitch=0,drag=null,selected=null,previous=null,traceNode=null;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');

 graph.layers.forEach((name,index)=>{
  const group=new THREE.Group();group.position.y=((graph.layers.length-1)/2-index)*2;
  group.userData.layer=index;root.add(group);groups.push(group);origins.push(group.position.clone());positions.push(group.position.clone());
  const plate=new THREE.Mesh(new THREE.BoxGeometry(8.4,.06,4.5),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.12}));
  plate.userData.layer=index;group.add(plate);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry),new THREE.LineBasicMaterial({color:accent,transparent:true,opacity:.5})));
  const heading=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.23),new THREE.MeshBasicMaterial({map:labelTexture(`${String(index+1).padStart(2,'0')} / ${name}`,'architecture layer'),side:THREE.DoubleSide}));
  heading.rotation.x=-Math.PI/2;heading.position.set(-1.55,.065,-1.55);heading.scale.setScalar(.6);heading.userData.layer=index;group.add(heading);
  const members=graph.nodes.filter(node=>node.layer===index);
  members.forEach((node,i)=>{
   const tile=new THREE.Group();tile.position.set(members.length===1?0:(i%2?2:-2),.2,-.25+Math.floor(i/2)*1.15);
   tile.userData={node:node.id,layer:index};
   const body=new THREE.Mesh(new THREE.BoxGeometry(3.6,.2,.92),baseMaterial.clone());body.material.color.set(node.type==='store'?'#adbdad':'#c8d2c5');body.userData={node:node.id,layer:index};tile.add(body);
   const face=new THREE.Mesh(new THREE.PlaneGeometry(3.55,.9),new THREE.MeshBasicMaterial({map:labelTexture(node.label,node.type),side:THREE.DoubleSide}));
   face.rotation.x=-Math.PI/2;face.position.y=.106;face.userData={node:node.id,layer:index};tile.add(face);group.add(tile);nodes.set(node.id,tile);
  });
 });
 graph.edges.forEach(edge=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(51),3));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:edge.kind==='failure'?'#b77a63':graph.color,transparent:true,opacity:.35}));line.frustumCulled=false;root.add(line);
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,6),new THREE.MeshBasicMaterial({color:graph.color}));root.add(arrow);edges.push({edge,line,arrow});
 });
 const token=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),new THREE.MeshBasicMaterial({color:graph.color}));token.visible=false;root.add(token);
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();
 const request=()=>{canvas.dataset.renderState='moving';if(!frame&&!paused&&!document.hidden)frame=requestAnimationFrame(draw);};
 function noteLayer(){canvas.dataset.spatialView=mode;canvas.dataset.activeLayer=String(activeLayer);onLayerChange(activeLayer,graph.layers[activeLayer]);}
 function fitProjection(){
  const w=wrap.clientWidth,h=canvas.clientHeight||490;if(!w||!h)return;
  renderer.setSize(w,h,false);const aspect=w/h;
  const view=mode==='screen'?Math.max(2.85,4.95/aspect):Math.max(6,(graph.layers.length-1)*1.25+2);
  camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();request();
 }
 function anchor(id){return root.worldToLocal(nodes.get(id).localToWorld(new THREE.Vector3(0,.32,0)));}
 function draw(){
  frame=0;if(paused||document.hidden)return;
  const blend=reduced.matches?1:.2;let moving=false;
  const targetYaw=mode==='screen'?0:yaw,targetPitch=mode==='screen'?0:pitch;
  if(Math.abs(root.rotation.y-targetYaw)>.001||Math.abs(root.rotation.x-targetPitch)>.001)moving=true;
  root.rotation.y+=(targetYaw-root.rotation.y)*blend;root.rotation.x+=(targetPitch-root.rotation.x)*blend;
  canvas.dataset.yaw=root.rotation.y.toFixed(3);canvas.dataset.pitch=root.rotation.x.toFixed(3);
  const cameraTarget=mode==='screen'?screenCamera:stackCamera;
  if(camera.position.distanceToSquared(cameraTarget)>.00001)moving=true;
  camera.position.lerp(cameraTarget,blend);camera.lookAt(0,0,0);
  groups.forEach((group,index)=>{
   const destination=mode==='screen'?new THREE.Vector3((index-activeLayer)*10.4,0,index===activeLayer?0:-1.8):positions[index];
   const orientation=mode==='screen'?upright:flat;
   if(group.position.distanceToSquared(destination)>.00001||group.quaternion.angleTo(orientation)>.001)moving=true;
   group.position.lerp(destination,blend);group.quaternion.slerp(orientation,blend);
  });
  root.updateMatrixWorld(true);
  edges.forEach(({edge,line,arrow})=>{
   const sameLayer=nodeInfo.get(edge.from).layer===activeLayer&&nodeInfo.get(edge.to).layer===activeLayer;
   line.visible=mode==='stack'||sameLayer;
   if(!line.visible){arrow.visible=false;return;}
   const a=anchor(edge.from),b=anchor(edge.to),bow=mode==='screen'?new THREE.Vector3(0,0,.7):new THREE.Vector3(0,.9,0);
   if(mode==='screen'){const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>Math.abs(dy)){a.x+=Math.sign(dx)*1.82;b.x-=Math.sign(dx)*1.82;}else{a.y+=Math.sign(dy)*.47;b.y-=Math.sign(dy)*.47;}}
   const curve=new THREE.CubicBezierCurve3(a,a.clone().add(bow),b.clone().add(bow),b),array=line.geometry.attributes.position.array;
   curve.getPoints(16).forEach((point,i)=>point.toArray(array,i*3));line.geometry.attributes.position.needsUpdate=true;
   arrow.position.copy(curve.getPoint(.93));arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(.93).normalize());
   const active=edge.from===previous&&edge.to===traceNode;line.material.opacity=active?.95:.3;arrow.visible=active||edge.kind==='data';
  });
  nodes.forEach((tile,id)=>tile.children[0].material.emissive.set(id===selected?graph.color:'#000000'));
  token.visible=Boolean(traceNode);if(traceNode)token.position.copy(anchor(traceNode));
  renderer.render(scene,camera);canvas.dataset.renderState=moving?'moving':'ready';if(moving)request();
 }
 function setLayer(index,notify=false){
  activeLayer=THREE.MathUtils.clamp(index,0,graph.layers.length-1);noteLayer();request();
  if(notify){const first=graph.nodes.find(node=>node.layer===activeLayer);if(first)onSelect(first.id);}
 }
 function hit(event){
  const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
  scene.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects(mode==='screen'?[groups[activeLayer]]:groups,true).find(h=>Number.isInteger(h.object.userData.layer));
 }
 const down=event=>{
  if(event.button!==0)return;const found=hit(event);
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,layer:found?.object.userData.layer,node:found?.object.userData.node,moved:false,start:found?positions[found.object.userData.layer].clone():null};
  canvas.setPointerCapture(event.pointerId);
 };
 const move=event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;
  if(mode==='screen')return;
  if(moveLayers&&Number.isInteger(drag.layer)){
   positions[drag.layer].x=THREE.MathUtils.clamp(drag.start.x+dx*.015,-4,4);positions[drag.layer].y=THREE.MathUtils.clamp(drag.start.y-dy*.02,-9,9);canvas.dataset.movedLayer=graph.layers[drag.layer];
  }else{
   yaw=drag.yaw+dx*.008;pitch=THREE.MathUtils.clamp(drag.pitch+dy*.008,-Math.PI/2,Math.PI/2);
  }
  request();
 };
 const up=event=>{
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(drag&&!drag.moved&&drag.node)onSelect(drag.node);drag=null;request();
 };
 const cancel=()=>{drag=null;};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
 const observer=new ResizeObserver(fitProjection);observer.observe(wrap);fitProjection();noteLayer();
 return{
  select(id){if(!nodeInfo.has(id))return;selected=id;if(mode==='screen')setLayer(nodeInfo.get(id).layer);request();},
  setView(value){mode=value==='screen'?'screen':'stack';drag=null;noteLayer();fitProjection();request();},
  setLayer(index){setLayer(index,true);},
  setDragMode(value){moveLayers=value==='move';canvas.dataset.dragMode=moveLayers?'move':'rotate';},
  zoom(value){camera.zoom=value;camera.updateProjectionMatrix();request();},
  trace(id,from){traceNode=id;previous=from;if(id&&mode==='screen')setLayer(nodeInfo.get(id).layer);request();},
  reset(){positions.forEach((position,i)=>position.copy(origins[i]));yaw=-.3;pitch=0;camera.zoom=1;camera.updateProjectionMatrix();delete canvas.dataset.movedLayer;if(mode==='screen')setLayer(0,true);request();},
  pause(value){paused=value;if(!value){fitProjection();request();}else{cancelAnimationFrame(frame);frame=0;}},
  dispose(){paused=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);scene.traverse(object=>{object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach(material=>{material.map?.dispose();material.dispose();});});baseMaterial.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
}
