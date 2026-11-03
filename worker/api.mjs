import {createSupabaseStore} from './supabase-store.mjs';
const allowedOrigin='https://cloudbbh-hub.github.io';
const legacySiteOrigin='https://team-week-board-1102.skp-k-2881.chatgpt.site';
const fail=(message,status=400)=>Response.json({error:message},{status});
export function validState(s){
 if(!s||!Array.isArray(s.tasks)||s.tasks.length>1000||!s.roles||typeof s.roles!=='object'||Array.isArray(s.roles))return false;
 const ids=new Set();
 for(const t of s.tasks){if(!t||typeof t.id!=='string'||t.id.length>100||ids.has(t.id)||typeof t.title!=='string'||!t.title.trim()||t.title.length>100||typeof t.owner!=='string'||!t.owner.trim()||t.owner.length>40||typeof t.note!=='string'||t.note.length>500||!['todo','doing','done'].includes(t.status)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time))return false;const d=new Date(t.date+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==t.date)return false;ids.add(t.id)}
 return Object.keys(s.roles).length<=100&&Object.entries(s.roles).every(([k,v])=>k.length<=40&&typeof v==='string'&&v.length<=80);
}
async function matches(a,b){const digest=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}
export async function handleApi(request,env){
 const origin=request.headers.get('Origin'),own=new URL(request.url).origin;
 if(origin&&origin!==allowedOrigin&&origin!==legacySiteOrigin&&origin!==own)return fail('허용되지 않은 요청입니다.',403);
 const headers={'Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','X-Content-Type-Options':'nosniff'};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 const send=async()=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204});
  if(new URL(request.url).pathname!=='/api/state')return fail('찾을 수 없습니다.',404);
  if(!env.TEAM_EDIT_CODE)return fail('편집코드 설정이 필요합니다.',503);
  const code=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  if(!code||code.length>128||!await matches(code,env.TEAM_EDIT_CODE))return fail('편집코드를 확인해 주세요.',401);
  if(env.STORAGE_BACKEND==='vercel'){
   const upstream=await fetch(new Request('https://fnancier-dashboard.vercel.app/api/state',request));
   return new Response(upstream.body,{status:upstream.status,headers:upstream.headers});
  }
  const supabase=env.STORAGE_BACKEND==='supabase'?createSupabaseStore(env):null;
  if(!supabase&&!env.DB)return fail('공용 저장소를 연결하고 있습니다.',503);
  if(request.method==='GET'){
   if(supabase)return Response.json(await supabase.read());
   const row=await env.DB.prepare('SELECT version, payload, updated_at FROM team_state WHERE id = 1').first();
   if(!row)return fail('공용 저장소 초기화가 필요합니다.',503);
   return Response.json({version:row.version,state:JSON.parse(row.payload),updatedAt:row.updated_at});
  }
  if(request.method!=='PUT')return fail('허용되지 않은 요청입니다.',405);
  if(env.STORAGE_BACKEND==='maintenance')return fail('Supabase로 저장소를 이전하고 있습니다. 입력 내용을 유지한 채 잠시 뒤 다시 저장해 주세요.',503);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return fail('JSON 형식이 필요합니다.',415);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>250000)return fail('일정 데이터가 너무 큽니다.',413);
  let body;try{body=JSON.parse(raw)}catch{return fail('잘못된 데이터 형식입니다.')}
  if(!Number.isSafeInteger(body.version)||body.version<0||!validState(body.state))return fail('일정 입력값을 확인해 주세요.');
  if(supabase){try{return Response.json(await supabase.write(body.version,body.state))}catch(error){if(error.status===409)return fail('다른 팀원이 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 저장해 주세요.',409);throw error}}
  const updatedAt=new Date().toISOString(),payload=JSON.stringify(body.state);
  const result=await env.DB.prepare('UPDATE team_state SET payload = ?, version = version + 1, updated_at = ? WHERE id = 1 AND version = ?').bind(payload,updatedAt,body.version).run();
  if(result.meta.changes!==1)return fail('다른 팀원이 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 저장해 주세요.',409);
  return Response.json({version:body.version+1,state:body.state,updatedAt});
 };
 try{const response=await send();for(const [k,v] of Object.entries(headers))response.headers.set(k,v);return response}catch{return Response.json({error:'공용 저장소에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'},{status:503,headers})}
}
