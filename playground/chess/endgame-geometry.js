// Original KQK/KRK geometry, a8=0. All states normalize the stronger side to White.
export const SIZE=64*64*64*2;
export const encode=(a,b,p,turn)=>(((a*64+b)*64+p)*2+turn);
export const decode=id=>{const turn=id%2;id>>=1;const p=id%64;id>>=6;const b=id%64;return [id>>6,b,p,turn];};
export const adjacent=(a,b)=>Math.max(Math.abs((a>>3)-(b>>3)),Math.abs(a%8-b%8))<=1;
export const neighbors=Array.from({length:64},(_,i)=>Array.from({length:64},(_,j)=>j).filter(j=>j!==i&&adjacent(i,j)));
export const rays=Object.fromEntries(['q','r'].map(type=>[type,Array.from({length:64},(_,i)=>{const list=[];for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1],...(type==='q'?[[-1,-1],[-1,1],[1,-1],[1,1]]:[])]){const ray=[];for(let r=(i>>3)+dr,c=i%8+dc;r>=0&&r<8&&c>=0&&c<8;r+=dr,c+=dc)ray.push(r*8+c);list.push(ray);}return list;})]));
export function checks(type,a,b,p){const dr=(b>>3)-(p>>3),dc=b%8-p%8;if(!(dr===0||dc===0||(type==='q'&&Math.abs(dr)===Math.abs(dc))))return false;const stepR=Math.sign(dr),stepC=Math.sign(dc);for(let r=(p>>3)+stepR,c=p%8+stepC;r*8+c!==b;r+=stepR,c+=stepC)if(r*8+c===a)return false;return true;}
export const valid=(type,a,b,p,turn)=>a!==b&&a!==p&&b!==p&&!adjacent(a,b)&&(turn===1||!checks(type,a,b,p));
export function successors(type,a,b,p,turn){
  const result=[];
  if(turn===0){for(const next of neighbors[a])if(next!==p&&next!==b&&!adjacent(next,b))result.push(encode(next,b,p,1));for(const ray of rays[type][p])for(const next of ray){if(next===a||next===b)break;result.push(encode(a,b,next,1));}}
  else for(const next of neighbors[b])if(next!==a&&!adjacent(next,a)){if(next===p)result.push(-1);else if(!checks(type,a,next,p))result.push(encode(a,next,p,0));}
  return result;
}
export function predecessors(type,a,b,p,turn){
  const result=[];
  if(turn===1){for(const prev of neighbors[a])if(valid(type,prev,b,p,0))result.push(encode(prev,b,p,0));for(const ray of rays[type][p])for(const prev of ray){if(prev===a||prev===b)break;if(valid(type,a,b,prev,0))result.push(encode(a,b,prev,0));}}
  else for(const prev of neighbors[b])if(valid(type,a,prev,p,1))result.push(encode(a,prev,p,1));
  return result;
}
