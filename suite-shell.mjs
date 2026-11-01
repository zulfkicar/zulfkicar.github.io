import {openArchitecture} from './architecture-ui.mjs';

document.addEventListener('click',event=>{const trigger=event.target.closest('[data-open-architecture]');if(trigger){event.preventDefault();openArchitecture(trigger.dataset.openArchitecture);}});
