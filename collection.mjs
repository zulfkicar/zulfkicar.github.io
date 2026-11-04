import {projects} from './projects.mjs?v=20261101-r9';
import {renderCollection} from './collection-render.mjs?v=20261101-r9';
import {collectionDetails as details} from './collection-data.mjs?v=20261101-r9';
import {openArchitecture} from './architecture-ui.mjs?v=20261101-r9';

const root=document.querySelector('.architecture-section'),ids=Object.keys(projects);
let selected=0,pointer=null,ignoredClick=null;
if(!root.querySelector('[data-album]'))root.innerHTML=renderCollection(projects,details);

function sideOf(yaw){const angle=((yaw%360)+360)%360;return angle>90&&angle<270?'back':'front';}
function updateAccess(card){
 const active=card.dataset.album===ids[selected],back=card.dataset.side==='back';
 const hit=card.querySelector('.album-hit-target'),summary=card.querySelector('.album-back');
 hit.hidden=active&&back;hit.tabIndex=active&&!back?0:-1;hit.setAttribute('aria-expanded',String(back));
 hit.setAttribute('aria-label',`${active?'Read about':'Select'} ${details[card.dataset.album].name}`);
 summary.inert=!active||!back;summary.setAttribute('aria-hidden',String(!active||!back));
 if(active){const flip=root.querySelector('[data-cover-flip]');flip.textContent=back?'Show front':'Flip cover';flip.setAttribute('aria-expanded',String(back));}
}
function turn(card,yaw=0,pitch=0){
 card.style.setProperty('--turn-y',`${yaw}deg`);card.style.setProperty('--turn-x',`${pitch}deg`);
 card.dataset.yaw=String(yaw);card.dataset.pitch=String(pitch);card.dataset.side=sideOf(yaw);updateAccess(card);
}
function currentCard(){return root.querySelector(`[data-album="${ids[selected]}"]`);}
function flip(card=currentCard(),front=false,focus=false){
 const back=!front&&card.dataset.side!=='back';turn(card,back?180:0,0);
 if(focus)(back?card.querySelector('[data-cover-open]'):card.querySelector('[data-cover-front]')).focus({preventScroll:true});
}
function select(index,focus=false){
 const previous=selected;selected=(index+ids.length)%ids.length;
 const id=ids[selected],d=details[id];
 if(previous!==selected)root.querySelectorAll('[data-album]').forEach(card=>turn(card));
 root.querySelector('#architecture-heading').textContent=d.name;root.querySelector('.collection-discipline').textContent=d.discipline;
 root.querySelector('.collection-count').textContent=`${String(selected+1).padStart(2,'0')} / 08`;
 root.querySelector('.collection-summary').textContent=projects[id].summary;root.querySelector('.collection-open').href=projects[id].href;
 root.querySelectorAll('[data-album]').forEach((card,i)=>{const offset=i-selected;card.dataset.position=String(offset);card.style.setProperty('--offset',String(offset));card.style.zIndex=String(10-Math.abs(offset));card.inert=Math.abs(offset)>2;updateAccess(card);});
 root.querySelectorAll('[data-collection-select]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
 if(focus)currentCard().querySelector('.album-hit-target').focus({preventScroll:true});
}
function openProject(){
 const id=ids[selected],d=details[id];
 if(window.portfolioNavigation)window.portfolioNavigation.open({href:projects[id].href,title:d.name,subtitle:d.note,cover:`/assets/collection/${id}.svg`,source:currentCard()});
 else location.href=projects[id].href;
}
function exploreLayers(){ openArchitecture(ids[selected]); }
root.addEventListener('click',event=>{
 const album=event.target.closest('[data-album]');
 if(album&&ignoredClick?.id===album.dataset.album&&performance.now()<ignoredClick.until&&event.detail!==0){ignoredClick=null;return;}ignoredClick=null;
 if(event.target.closest('[data-cover-flip]')){flip();return;}
 if(event.target.closest('[data-cover-reset]')){flip(currentCard(),true);return;}
 const arrow=event.target.closest('[data-collection-step]');if(arrow){select(selected+Number(arrow.dataset.collectionStep));return;}
 const item=event.target.closest('[data-collection-select]');if(item){select(Number(item.dataset.collectionSelect));return;}
 if(event.target.closest('[data-cover-close]')){flip(album,true,true);return;}
 if(event.target.closest('.collection-layers,[data-cover-layers]')){exploreLayers();return;}
 if(event.target.closest('.collection-open,[data-cover-open]')){if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openProject();}return;}
 if(event.target.closest('a'))return;
 if(album){const index=ids.indexOf(album.dataset.album);if(index!==selected)select(index);else if(event.target.closest('[data-cover-front]'))flip(album,false,event.detail===0);}
});
root.addEventListener('keydown',event=>{
 if(!event.target.closest('.collection-stage,.collection-ruler'))return;
 if(event.key==='Escape'){event.preventDefault();flip(currentCard(),true,true);return;}
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();select(selected+(event.key==='ArrowRight'?1:-1),true);}
 if(event.key==='Home'){event.preventDefault();select(0,true);}
 if(event.key==='End'){event.preventDefault();select(ids.length-1,true);}
});
const stage=root.querySelector('.collection-stage');
stage.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.target.closest('a,[data-cover-close],[data-cover-layers],.album-back-summary,.album-back-stack,.album-back-status'))return;
 const card=event.target.closest('[data-album]');if(!card)return;
 pointer={id:event.pointerId,x:event.clientX,y:event.clientY,card,moved:false,touch:event.pointerType==='touch',yaw:Number(card.dataset.yaw)||0,pitch:Number(card.dataset.pitch)||0};
});
stage.addEventListener('pointermove',event=>{
 if(!pointer||event.pointerId!==pointer.id)return;
 const x=event.clientX-pointer.x,y=event.clientY-pointer.y;if(pointer.touch&&!pointer.moved&&Math.abs(y)>Math.abs(x))return;
 if(Math.hypot(x,y)>6&&!pointer.moved){pointer.moved=true;if(pointer.card.dataset.album!==ids[selected]){select(ids.indexOf(pointer.card.dataset.album));pointer.yaw=0;pointer.pitch=0;}pointer.card.setPointerCapture(event.pointerId);}
 if(!pointer.moved)return;if(event.cancelable)event.preventDefault();pointer.card.dataset.turning='true';turn(pointer.card,pointer.yaw+x*.65,Math.max(-40,Math.min(40,pointer.pitch-y*.3)));
});
function release(event){
 if(!pointer||event.pointerId!==pointer.id)return;
 const card=pointer.card;card.dataset.turning='false';
 if(pointer.moved&&event.type==='pointerup'){ignoredClick={id:card.dataset.album,until:performance.now()+250};const yaw=Number(card.dataset.yaw),face=Math.round(yaw/180)*180;if(Math.abs(yaw-face)<28)turn(card,face,0);}
 if(card.hasPointerCapture(event.pointerId))card.releasePointerCapture(event.pointerId);pointer=null;
}
stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);select(selected);
