// A demo keeps its own identity in the portfolio iframe and on its own route.
if(window.self!==window.top){
 document.documentElement.dataset.embedded='true';
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}
function syncChrome(){const color=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();if(color)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);}
window.addEventListener('appearancechange',()=>requestAnimationFrame(syncChrome));
syncChrome();
