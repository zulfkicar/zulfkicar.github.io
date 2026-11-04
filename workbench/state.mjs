import {byId} from './content.mjs';
export function initialState(id='workforce'){const selected=Object.hasOwn(byId,id)?id:'workforce';return {selected,open:[selected]};}
export function reduce(state,action){
 if(action.type==='select'&&Object.hasOwn(byId,action.id))return {...state,selected:action.id,open:state.open.includes(action.id)?state.open:[...state.open,action.id]};
 if(action.type==='close'){
  if(state.open.length===1||!state.open.includes(action.id))return state;
  const index=state.open.indexOf(action.id),open=state.open.filter(id=>id!==action.id);
  return {...state,open,selected:state.selected===action.id?open[Math.min(index,open.length-1)]:state.selected};
 }
 return state;
}
