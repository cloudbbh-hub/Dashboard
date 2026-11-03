import fs from 'node:fs';
const names=['index.html','style.css','theme.css','app.js','shared.js'];
const assets=Object.fromEntries(names.map(n=>['/'+n,fs.readFileSync('dist/'+n,'utf8')]));
const adapter=fs.readFileSync('worker/supabase-store.mjs','utf8').replaceAll('export ','');
const api=adapter+'\n'+fs.readFileSync('worker/api.mjs','utf8').replace("import {createSupabaseStore} from './supabase-store.mjs';",'').replaceAll('export ','');
const content=`${api}\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return handleApi(request,env);let key=url.pathname.replace(/^\\/dist(?=\\/)/,'');if(key==='/'||key==='')key='/index.html';if(!Object.hasOwn(assets,key))return new Response('Not found',{status:404});return new Response(assets[key],{headers:{'Content-Type':key.endsWith('.css')?'text/css; charset=utf-8':key.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}};`;
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js',content);fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built shared dashboard Worker and GitHub Pages assets.');
