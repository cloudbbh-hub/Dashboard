const API_BASE='https://fnancier-dashboard.vercel.app';
let sharedCode='',sharedVersion=0,sharedReady=false,sharedSaving=false,sharedLoading=false,sharedConflict=false;
try{sharedCode=sessionStorage.getItem('fnancier-edit-code')||''}catch{}
const sharedOriginalTasks=structuredClone(tasks),sharedOriginalRoles=structuredClone(roles);
function sharedStatus(message,bad=false){$('#syncStatus').textContent=message;$('#syncStatus').classList.toggle('sync-error',bad)}
function setSharedControls(){const locked=!sharedReady||sharedSaving;for(const id of ['addTask','importLocal'])$('#'+id).disabled=locked;document.querySelectorAll('#taskForm button[type="submit"],#roleForm button[type="submit"],#deleteTask').forEach(b=>b.disabled=locked)}
async function sharedRequest(method,body){
 const response=await fetch(API_BASE+'/api/state',{method,headers:{'Authorization':'Bearer '+sharedCode,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let result;try{result=await response.json()}catch{throw Error('공용 서버 응답을 확인할 수 없어요.')}
 if(!response.ok){const e=Error(result.error||'공용 저장에 실패했어요.');e.status=response.status;throw e}
 if(!Number.isSafeInteger(result.version)||!result.state||!Array.isArray(result.state.tasks)||!result.state.tasks.every(valid)||!result.state.roles)throw Error('공용 데이터 형식이 올바르지 않아요.');return result;
}
function applyShared(data){sharedVersion=data.version;tasks=data.state.tasks;roles=data.state.roles;demo=false;render()}
async function refreshShared(silent=false){if(sharedLoading||sharedSaving||!sharedCode)return;sharedLoading=true;try{const data=await sharedRequest('GET');if(!silent||data.version!==sharedVersion){applyShared(data)}sharedReady=true;sharedStatus('팀 공용 저장 · 연결됨');$('#connectShared').textContent='연결 변경';$('#shareDialog').close();return true}catch(e){if(e.status===401){sharedReady=false;sharedStatus('편집코드 확인 필요',true)}else sharedStatus('연결 끊김 · 마지막 확인 내용',true);if(!silent)$('#shareError').textContent=e.message;return false}finally{sharedLoading=false;setSharedControls()}}
async function saveShared(nextTasks,nextRoles){
 if(!sharedReady){toast('먼저 팀 편집코드로 연결해 주세요.');return false}if(sharedSaving)return false;
 if(sharedConflict){toast('최신 내용을 불러온 뒤 다시 수정해 주세요.');return false}
 sharedSaving=true;setSharedControls();sharedStatus('팀 공용 저장 중…');
 try{const result=await sharedRequest('PUT',{version:sharedVersion,state:{tasks:nextTasks,roles:nextRoles}});applyShared(result);sharedStatus('팀 공용 저장 · 저장 완료');return true}
 catch(e){if(e.status===409){sharedConflict=true;$('#reloadShared').hidden=false;}if(e.status===401)sharedReady=false;$('#formError').textContent=e.message;$('#roleError').textContent=e.message;toast(e.message);sharedStatus(e.status===409?'다른 팀원의 변경 있음':'저장 실패 · 입력 내용 유지',true);return false}
 finally{sharedSaving=false;setSharedControls()}
}
function showSharedConnection(){if($('#editor').open||$('#roleEditor').open)return;$('#shareError').textContent='';$('#shareCode').value='';$('#shareDialog').showModal()}
$('#connectShared').onclick=showSharedConnection;
$('#shareForm').onsubmit=async e=>{e.preventDefault();const code=$('#shareCode').value.trim();if(!code)return;const button=e.target.querySelector('button[type="submit"]');button.disabled=true;sharedCode=code;const ok=await refreshShared();if(ok){try{sessionStorage.setItem('fnancier-edit-code',code)}catch{}}button.disabled=false};
$('#cancelConnect').onclick=()=>$('#shareDialog').close();
$('#reloadShared').onclick=async()=>{if(!confirm('저장하지 않은 입력을 닫고 최신 팀 일정을 불러올까요?'))return;$('#editor').close();$('#roleEditor').close();sharedConflict=false;if(await refreshShared())$('#reloadShared').hidden=true;else sharedConflict=true};
$('#importLocal').hidden=!(sharedOriginalTasks.length||Object.keys(sharedOriginalRoles).length);
$('#importLocal').onclick=async()=>{if(!confirm('이 브라우저의 기존 일정과 포지션을 팀 공용 공간에 가져올까요? 같은 ID의 공용 일정은 보존합니다.'))return;const byId=new Map(sharedOriginalTasks.map(t=>[t.id,t]));for(const t of tasks)byId.set(t.id,t);if(await saveShared([...byId.values()],{...sharedOriginalRoles,...roles})){$('#importLocal').hidden=true;toast('기존 내용을 팀 공용 공간에 가져왔어요.')}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#editor').open&&!$('#roleEditor').open&&!sharedConflict)refreshShared(true)});
setInterval(()=>{if(!document.hidden&&!$('#editor').open&&!$('#roleEditor').open&&!$('#shareDialog').open&&!sharedConflict)refreshShared(true)},3000);
tasks=[];roles={};render();setSharedControls();sharedStatus('팀 편집코드로 연결해 주세요.');
if(sharedCode)refreshShared().then(ok=>{if(!ok)showSharedConnection()});else showSharedConnection();
