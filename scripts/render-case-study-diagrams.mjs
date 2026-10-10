import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {studies} from '../case-studies/content.mjs';
const cli=process.argv[2];
if(!cli)throw Error('Usage: node scripts/render-case-study-diagrams.mjs PATH_TO_MERMAID_CLI [PUPPETEER_CONFIG]');
const root=fileURLToPath(new URL('../case-studies/',import.meta.url));
const run=promisify(execFile);
const diagrams=studies.flatMap(s=>s.diagrams);
for(let i=0;i<diagrams.length;i+=2){
  await Promise.all(diagrams.slice(i,i+2).map(async d=>{
    const args=[cli,'-i',root+'diagrams/'+d.file+'.mmd','-o',root+'diagrams/'+d.file+'.svg','-c',root+'mermaid-config.json','-b','transparent','-w','1600'];
    if(process.argv[3])args.push('-p',process.argv[3]);
    await run(process.execPath,args,{timeout:90000,maxBuffer:1024*1024});
    console.log('Rendered '+d.file);
  }));
}
