import * as THREE from './vendor/three.module.js';

function labelTexture(title,detail){
 const canvas=document.createElement('canvas');canvas.width=700;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f1e9';ctx.fillRect(0,0,700,180);ctx.fillStyle='#496457';ctx.font='17px monospace';ctx.fillText(detail.toUpperCase(),26,47);ctx.fillStyle='#25332e';ctx.font='29px Manrope, Arial';ctx.fillText(title,26,112);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createSpatialArchitecture({canvas,wrap,graph,onSelect}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const camera=new THREE.OrthographicCamera(-11,11,9,-9,.1,100);camera.position.set(13,11,17);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x5a7169,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-4,12,8);scene.add(light);
 const groups=[],nodes=new Map(),edgeObjects=[],initial=[];const accent=new THREE.Color(graph.color),mat=new THREE.MeshStandardMaterial({color:'#c8d2c5',roughness:.8});
 graph.layers.forEach((name,index)=>{
  const group=new THREE.Group();group.position.y=(graph.layers.length-1)/2*2-index*2;group.userData.layer=index;root.add(group);groups.push(group);initial.push(group.position.clone());
  const plate=new THREE.Mesh(new THREE.BoxGeometry(8.4,.06,4.5),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.1}));plate.userData.layer=index;group.add(plate);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry),new THREE.LineBasicMaterial({color:accent,transparent:true,opacity:.45}));group.add(edge);
  const heading=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.23),new THREE.MeshBasicMaterial({map:labelTexture(`${String(index+1).padStart(2,'0')} / ${name}`,'architecture layer'),side:THREE.DoubleSide}));heading.rotation.x=-Math.PI/2;heading.position.set(-1.55,.065,-1.55);heading.scale.setScalar(.6);heading.userData.layer=index;group.add(heading);
  const members=graph.nodes.filter(node=>node.layer===index);
  members.forEach((node,i)=>{
   const tile=new THREE.Group();tile.position.set(members.length===1?0:(i%2?2:-2),.2,-.25+Math.floor(i/2)*1.15);tile.userData.node=node.id;tile.userData.layer=index;
   const body=new THREE.Mesh(new THREE.BoxGeometry(3.6,.2,.92),mat.clone());body.material.color.set(node.type==='store'?'#adbdad':'#c8d2c5');body.userData={node:node.id,layer:index};tile.add(body);
   const surface=new THREE.Mesh(new THREE.PlaneGeometry(3.55,.9),new THREE.MeshBasicMaterial({map:labelTexture(node.label,node.type),side:THREE.DoubleSide}));surface.rotation.x=-Math.PI/2;surface.position.y=.106;surface.userData={node:node.id,layer:index};tile.add(surface);group.add(tile);nodes.set(node.id,tile);
  });
 });
 graph.edges.forEach(edge=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(17*3),3));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:edge.kind==='failure'?'#b77a63':graph.color,transparent:true,opacity:.35}));root.add(line);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,6),new THREE.MeshBasicMaterial({color:graph.color}));root.add(arrow);edgeObjects.push({edge,line,arrow});});
 const token=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),new THREE.MeshBasicMaterial({color:graph.color}));token.visible=false;root.add(token);
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let frame=0,paused=false,rotation=-.3,target=-.3,drag=null,selected=null,previous=null,traceNode=null;
 function request(){if(!frame&&!paused&&!document.hidden)frame=requestAnimationFrame(draw);}
 function draw(){frame=0;if(paused||document.hidden)return;const delta=target-rotation;rotation=matchMedia('(prefers-reduced-motion:reduce)').matches?target:rotation+(Math.abs(delta)>.001?delta*.18:delta);root.rotation.y=rotation;root.updateMatrixWorld(true);
  edgeObjects.forEach(({edge,line,arrow})=>{const a=nodes.get(edge.from).position.clone().add(groups[graph.nodes.find(node=>node.id===edge.from).layer].position),b=nodes.get(edge.to).position.clone().add(groups[graph.nodes.find(node=>node.id===edge.to).layer].position);a.y+=.35;b.y+=.35;const curve=new THREE.CubicBezierCurve3(a,a.clone().add(new THREE.Vector3(0,.9,0)),b.clone().add(new THREE.Vector3(0,.9,0)),b);const points=curve.getPoints(16),array=line.geometry.attributes.position.array;points.forEach((point,i)=>point.toArray(array,i*3));line.geometry.attributes.position.needsUpdate=true;arrow.position.copy(curve.getPoint(.93));arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(.93).normalize());const active=edge.from===previous&&edge.to===traceNode;line.material.opacity=active?.95:.3;arrow.visible=active||edge.kind==='data';});
  nodes.forEach((tile,id)=>tile.children[0].material.emissive.set(id===selected?graph.color:'#000000'));
  token.visible=Boolean(traceNode);if(traceNode){const node=graph.nodes.find(node=>node.id===traceNode);token.position.copy(nodes.get(traceNode).position).add(groups[node.layer].position);token.position.y+=.45;}
  renderer.render(scene,camera);if(Math.abs(target-rotation)>.001)request();
 }
 function resize(){const w=wrap.clientWidth,h=canvas.clientHeight||490;if(!w)return;renderer.setSize(w,h,false);const aspect=w/h,view=Math.max(6,(graph.layers.length-1)*1.25+2);camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();request();}
 function hit(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects(groups,true).find(h=>Number.isInteger(h.object.userData.layer));}
 const down=event=>{if(event.button!==0)return;const found=hit(event);drag={x:event.clientX,y:event.clientY,target,layer:found?.object.userData.layer,node:found?.object.userData.node,moved:false,start:found?groups[found.object.userData.layer].position.clone():null};canvas.setPointerCapture(event.pointerId);};
 const move=event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;if(Number.isInteger(drag.layer)){const group=groups[drag.layer];group.position.x=THREE.MathUtils.clamp(drag.start.x+dx*.015,-3,3);group.position.y=THREE.MathUtils.clamp(drag.start.y-dy*.02,-8,8);canvas.dataset.movedLayer=graph.layers[drag.layer];}else target=drag.target+dx*.006;request();};
 const up=event=>{if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(drag&&!drag.moved&&drag.node)onSelect(drag.node);drag=null;request();};
 const cancel=()=>{drag=null;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
 const observer=new ResizeObserver(resize);observer.observe(wrap);resize();
 return{select(id){selected=id;request();},zoom(value){camera.zoom=value;camera.updateProjectionMatrix();request();},trace(id,from){traceNode=id;previous=from;request();},reset(){groups.forEach((group,i)=>group.position.copy(initial[i]));target=-.3;camera.zoom=1;camera.updateProjectionMatrix();delete canvas.dataset.movedLayer;request();},pause(value){paused=value;if(!value){resize();request();}else{cancelAnimationFrame(frame);frame=0;}},dispose(){paused=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);scene.traverse(object=>{object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach(material=>{material.map?.dispose();material.dispose();});});mat.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
