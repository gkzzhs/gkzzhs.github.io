import {copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const source=path.join(path.dirname(fileURLToPath(import.meta.url)),'assets');
export const identityPath='assets/identity/lamp-v2/';
export const identityFiles=['favicon.svg','favicon.ico','lamp-light-32.png','lamp-dark-32.png','apple-touch-icon.png'];

export function withIdentity(html,relative=''){
 const prefix=relative+identityPath;
 const links=`<link rel="icon" href="${prefix}favicon.ico" sizes="16x16 24x24 32x32 48x48" type="image/x-icon"><link rel="icon" href="${prefix}lamp-light-32.png" sizes="32x32" type="image/png" media="(prefers-color-scheme: light)"><link rel="icon" href="${prefix}lamp-dark-32.png" sizes="32x32" type="image/png" media="(prefers-color-scheme: dark)"><link rel="icon" href="${prefix}favicon.svg" sizes="any" type="image/svg+xml"><link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png" sizes="180x180">`;
 const close=html.search(/<\/head\s*>/i);
 if(close<0)throw new Error('Cannot add site identity without a head element');
 const head=html.slice(0,close).replace(/<link\b[^>]*>/gi,tag=>{
  const rel=tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1].toLowerCase().split(/\s+/)||[];
  return rel.some(value=>['icon','apple-touch-icon','apple-touch-icon-precomposed'].includes(value))?'':tag;
 });
 return head+links+html.slice(close);
}

export async function copyIdentity(destination){
 const target=path.join(destination,identityPath);
 await mkdir(target,{recursive:true});
 for(const name of identityFiles)await copyFile(path.join(source,name),path.join(target,name));
 // Fallbacks for old pages, saved bookmarks and clients requesting root icons.
 for(const name of ['favicon.svg','favicon.ico','apple-touch-icon.png'])await copyFile(path.join(source,name),path.join(destination,name));
}
