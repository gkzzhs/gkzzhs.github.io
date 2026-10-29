import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {copyIdentity,withIdentity} from './identity.mjs';

const destination=path.resolve(process.argv[2]||'work/performance-release');
const pages=['index.html','en/index.html','renaissance-preview.html',...['lark-retro','xmind','lark-dispatch','life'].map(name=>'assets/renaissance-perf/projects/'+name+'.html')];
await copyIdentity(destination);
for(const name of pages){
 const file=path.join(destination,name);
 const relative='../'.repeat(name.split('/').length-1);
 const html=await readFile(file,'utf8');
 await writeFile(file,withIdentity(html,relative));
}
console.log(`Updated icons on ${pages.length} published pages.`);
