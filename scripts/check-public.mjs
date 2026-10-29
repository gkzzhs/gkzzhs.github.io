import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../public/',import.meta.url));
async function check(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name==='.mimosa')throw new Error('Private .mimosa state must not be placed in public/');
  if(entry.isDirectory())await check(path.join(dir,entry.name));
 }
}
await check(root);
