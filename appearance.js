// One theme preference across the homepage and project pages, including other tabs.
(()=>{
 if(window.__portfolioAppearance)return;window.__portfolioAppearance=true;
 const key='za-appearance',modes=['auto','light','dark'],media=matchMedia('(prefers-color-scheme:dark)');
 const valid=value=>modes.includes(value)?value:'auto',title=value=>value[0].toUpperCase()+value.slice(1);
 let preference='auto';try{preference=valid(localStorage.getItem(key));}catch{}
 function apply(){
  const theme=preference==='auto'?(media.matches?'dark':'light'):preference;
  document.documentElement.dataset.theme=theme;document.documentElement.dataset.appearance=preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#17181a':'#eeece7');
  for(const button of document.querySelectorAll('[data-theme-cycle],[data-suite-theme]')){
   const next=modes[(modes.indexOf(preference)+1)%modes.length],label=`Appearance: ${title(preference)}. Switch to ${title(next)}.`;
   button.setAttribute('aria-label',label);button.title=label;button.dataset.mode=preference;
   const icon=preference==='auto'?'◐':preference==='light'?'☼':'☾';
   if(button.matches('[data-suite-theme]'))button.textContent=icon;
   const caption=button.querySelector('.theme-mode');if(caption)caption.textContent=title(preference);
   const glyph=button.querySelector('.theme-toggle>[aria-hidden="true"],.theme-toggle>span:first-child');if(glyph)glyph.textContent=icon;
  }
  window.dispatchEvent(new CustomEvent('appearancechange',{detail:{theme}}));
 }
 apply();media.addEventListener('change',()=>{if(preference==='auto')apply();});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){preference=valid(event.newValue);apply();}});
 document.addEventListener('DOMContentLoaded',()=>{
  apply();for(const button of document.querySelectorAll('[data-theme-cycle],[data-suite-theme]'))button.addEventListener('click',()=>{
   preference=modes[(modes.indexOf(preference)+1)%modes.length];try{localStorage.setItem(key,preference);}catch{}apply();
  });
 });
})();
