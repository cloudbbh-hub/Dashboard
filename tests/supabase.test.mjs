import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseStore} from '../worker/supabase-store.mjs';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_server_test_only'};
test('Supabase reads return the same versioned state contract',async()=>{
 let request;
 const store=createSupabaseStore(env,async(url,options)=>{request={url,options};return Response.json([{version:7,state:{tasks:[],roles:{}},updated_at:'2026-11-02T00:00:00Z'}])});
 const state=await store.read();assert.equal(state.version,7);assert.deepEqual(state.state,{tasks:[],roles:{}});
 assert.match(request.url,/fnancier_state/);assert.equal(request.options.headers.apikey,env.SUPABASE_SECRET_KEY);assert.equal(request.options.headers.Authorization,undefined);
});
test('version conflicts remain conflicts instead of overwriting',async()=>{
 const store=createSupabaseStore(env,async()=>Response.json({code:'P0001',message:'dashboard_version_conflict'},{status:400}));
 await assert.rejects(store.write(1,{tasks:[],roles:{}}),error=>error.status===409);
});
test('secret and detailed provider errors do not escape to clients',async()=>{
 const store=createSupabaseStore(env,async()=>Response.json({message:'internal secret diagnostic'},{status:500}));
 await assert.rejects(store.read(),error=>error.status===503&&!error.message.includes('secret diagnostic'));
 assert.throws(()=>createSupabaseStore({...env,SUPABASE_URL:'http://example.supabase.co'}),/Invalid Supabase URL/);
});
