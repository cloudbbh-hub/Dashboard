export function createSupabaseStore(env, requestFetch=fetch){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error('Supabase server configuration is missing');
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error('Invalid Supabase URL');
 const base=parsed.origin+'/rest/v1/';
 const headers={apikey:key,'Content-Type':'application/json'};
 // New secret keys use apikey; legacy JWT service-role keys also need Bearer.
 if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 async function call(path,method='GET',body){
  const response=await requestFetch(base+path,{method,headers,cache:'no-store',signal:AbortSignal.timeout(12000),...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok){const error=Error('Supabase request failed');error.status=data?.code==='P0001'&&data?.message==='dashboard_version_conflict'?409:503;throw error}
  return data;
 }
 return {
  async read(){const rows=await call('fnancier_state?id=eq.1&select=version,state,updated_at');if(!Array.isArray(rows)||rows.length!==1)throw Error('Supabase state not initialized');const row=rows[0];return {version:Number(row.version),state:row.state,updatedAt:row.updated_at}},
  async write(version,state){return call('rpc/fnancier_write_state','POST',{p_expected_version:version,p_state:state})}
 };
}
