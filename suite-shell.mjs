import {openArchitecture} from './architecture-ui.mjs?v=20261101-r9';

document.addEventListener('click',event=>{const trigger=event.target.closest('[data-open-architecture]');if(trigger){event.preventDefault();openArchitecture(trigger.dataset.openArchitecture);}});
