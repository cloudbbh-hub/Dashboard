import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {handleApi} from '../worker/api.mjs';
function setup(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(fs.readFileSync(new URL('../drizzle/0000_team_state.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){
  let params=[];
  return {
   bind(...p){params=p;return this},
   first(){return sqlite.prepare(sql).get(...params)},
   run(){const r=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}}
  };
 }};
 return {sqlite,env:{DB,TEAM_EDIT_CODE:'test-code-only'}};
}
const task={id:'test-task',title:'테스트 회의',date:'2026-11-02',time:'10:00',owner:'전체',status:'todo',note:''};
function req(method='GET',body,code='test-code-only',origin='https://cloudbbh-hub.github.io'){return new Request('https://test.invalid/api/state',{method,headers:{Origin:origin,Authorization:'Bearer '+code,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})}
test('shared data requires the team code, including cross-origin reads',async()=>{const {env,sqlite}=setup();assert.equal((await handleApi(req('GET',undefined,'wrong'),env)).status,401);const r=await handleApi(req(),env);assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://cloudbbh-hub.github.io');assert.equal((await handleApi(req('GET',undefined,'test-code-only','https://other.invalid'),env)).status,403);sqlite.close()});
test('two clients cannot overwrite each other from the same version',async()=>{const {env,sqlite}=setup();const a=await(await handleApi(req(),env)).json(),b=await(await handleApi(req(),env)).json();assert.equal(a.version,b.version);const saved=await handleApi(req('PUT',{version:a.version,state:{tasks:[task],roles:{김준철:'기획'}}}),env);assert.equal(saved.status,200);const stale=await handleApi(req('PUT',{version:b.version,state:{tasks:[],roles:{}}}),env);assert.equal(stale.status,409);const latest=await(await handleApi(req(),env)).json();assert.equal(latest.version,1);assert.deepEqual(latest.state.tasks,[task]);assert.equal(latest.state.roles.김준철,'기획');sqlite.close()});
test('invalid and oversized input does not corrupt the shared snapshot',async()=>{const {env,sqlite}=setup();const invalid=await handleApi(req('PUT',{version:0,state:{tasks:[{...task,date:'2026-02-31'}],roles:{}}}),env);assert.equal(invalid.status,400);const r=await(await handleApi(req(),env)).json();assert.equal(r.version,0);assert.equal(r.state.tasks.length,0);sqlite.close()});
