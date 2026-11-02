'use strict';
const $=s=>document.querySelector(s),KEY='moa-team-week-v1',labels={todo:'예정',doing:'진행 중',done:'완료'};
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const localDate=s=>new Date(s+'T12:00:00'),now=new Date(),today=dateKey(now);
const monday=d=>{const n=new Date(d);n.setHours(12,0,0,0);n.setDate(n.getDate()-(n.getDay()+6)%7);return n};
const plus=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&typeof t.owner==='string'&&typeof t.note==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&!Number.isNaN(localDate(t.date).getTime())&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)&&Object.hasOwn(labels,t.status);
let week=monday(now),view='week',scope='week',editing=null,demo=true,storageError=false;
function samples(){const seed=[['브랜드 방향성 회의',0,'10:00','김서연','done','핵심 메시지와 비주얼 방향을 함께 정해요.'],['레퍼런스 리서치',0,'14:00','이도윤','doing','팀에 공유할 레퍼런스 5개 모으기'],['와이어프레임 정리',1,'11:00','박지우','doing','주요 화면의 흐름을 정리합니다.'],['콘텐츠 초안 작성',1,'15:00','최민준','todo','소개 문구와 주요 콘텐츠 구성'],['중간 진행 상황 공유',2,'10:30','김서연','todo','각자 진행 상황과 도움이 필요한 내용을 공유해요.'],['디자인 시안 리뷰',3,'14:00','박지우','todo','1차 시안을 검토하고 의견을 모읍니다.'],['프로토타입 제작',3,'16:00','이도윤','doing','핵심 동작을 프로토타입에 연결해요.'],['주간 회고 & 다음 주 계획',4,'16:00','최민준','todo','좋았던 점과 개선할 점, 다음 주 우선순위 정하기']];return seed.map(([title,day,time,owner,status,note],i)=>({id:'sample-'+i,title,date:dateKey(plus(week,day)),time,owner,status,note}))}
let tasks;
try{const stored=localStorage.getItem(KEY);if(stored){const parsed=JSON.parse(stored);if(!Array.isArray(parsed.tasks)||!parsed.tasks.every(valid))throw Error('data');tasks=parsed.tasks;demo=parsed.demo===true}else tasks=samples()}catch{tasks=[];demo=false;storageError=true}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3200)}
function persist(next,nextDemo=demo){try{localStorage.setItem(KEY,JSON.stringify({tasks:next,demo:nextDemo}));tasks=next;demo=nextDemo;return true}catch{$('#formError').textContent='저장할 수 없어요. 브라우저의 저장 공간과 사이트 데이터 설정을 확인해 주세요.';toast('브라우저에 저장하지 못했어요.');return false}}
function inWeek(t){return t.date>=dateKey(week)&&t.date<=dateKey(plus(week,6))}
function filtered(){const owner=$('#ownerFilter').value,status=$('#statusFilter').value,q=$('#search').value.trim().toLocaleLowerCase();return tasks.filter(t=>(scope==='all'||inWeek(t))&&(!owner||t.owner===owner)&&(!status||t.status===status)&&(!q||[t.title,t.owner,t.note].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.title.localeCompare(b.title))}
function avatar(owner){return `<span class="avatar">${esc(owner.slice(-2))}</span>`}
function card(t){return `<button class="task ${t.status}" data-edit="${esc(t.id)}"><time>${esc(t.time)}</time><h3>${esc(t.title)}</h3><div class="task-bottom"><span class="owner-mini">${avatar(t.owner)}${esc(t.owner)}</span><span class="status">${labels[t.status]}</span></div></button>`}
function render(){
 const owners=[...new Set(tasks.map(t=>t.owner))].sort(),old=$('#ownerFilter').value;
 $('#ownerFilter').innerHTML='<option value="">모든 담당자</option>'+owners.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('#ownerFilter').value=owners.includes(old)?old:'';
 $('#ownerNames').innerHTML=owners.map(x=>`<option value="${esc(x)}"></option>`).join('');
 const wt=tasks.filter(inWeek),done=wt.filter(t=>t.status==='done').length;
 $('#statAll').textContent=wt.length;$('#statDoing').textContent=wt.filter(t=>t.status==='doing').length;$('#statDone').textContent=done;$('#doneHint').textContent=`이번 주 완료율 ${wt.length?Math.round(done/wt.length*100):0}%`;
 $('#statSoon').textContent=tasks.filter(t=>t.status!=='done'&&t.date>=today&&t.date<=dateKey(plus(now,2))).length;
 $('#rangeLabel').textContent=`${week.getFullYear()}. ${week.getMonth()+1}. ${week.getDate()} — ${plus(week,6).getMonth()+1}. ${plus(week,6).getDate()}`;
 $('.demo-banner').hidden=!demo;
 const ts=filtered();
 $('#calendar').innerHTML='<div class="calendar">'+Array.from({length:7},(_,i)=>{const d=plus(week,i),key=dateKey(d),dayTasks=ts.filter(t=>t.date===key);return `<div class="day ${key===today?'today':''} ${i>4?'weekend':''}"><div class="day-heading"><span>${['월요일','화요일','수요일','목요일','금요일','토요일','일요일'][i]}${key===today?' · 오늘':''}</span><b>${d.getDate()}</b></div>${dayTasks.map(card).join('')||'<span class="day-empty">등록된 일정 없음</span>'}<button class="day-add" data-add="${key}" aria-label="${key} 일정 추가">＋</button></div>`}).join('')+'</div>';
 $('#list').innerHTML=ts.length?`<table class="task-table"><thead><tr><th>일정</th><th>날짜 · 시간</th><th>담당자</th><th>상태</th></tr></thead><tbody>${ts.map(t=>`<tr class="${t.status}"><td><button data-edit="${esc(t.id)}">${esc(t.title)}</button></td><td>${esc(t.date.slice(5).replace('-','/'))} ${esc(t.time)}</td><td>${esc(t.owner)}</td><td><span class="status">${labels[t.status]}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">조건에 맞는 일정이 없어요. 새 일정을 추가해 보세요.</div>';
 $('#calendar').hidden=view!=='week';$('#list').hidden=view!=='list';document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view))});
 $('#members').innerHTML=owners.length?owners.map(o=>{const mine=wt.filter(t=>t.owner===o),count=mine.filter(t=>t.status==='done').length;return `<div class="member-row">${avatar(o)}<div class="member-name">${esc(o)}<small>${mine.length}개 일정</small></div><div class="progress" role="progressbar" aria-label="${esc(o)} 완료율" aria-valuenow="${mine.length?Math.round(count/mine.length*100):0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${mine.length?count/mine.length*100:0}%"></span></div><span class="member-count">${count} / ${mine.length} 완료</span></div>`}).join(''):'<div class="empty">담당자가 있는 일정을 등록해 주세요.</div>';
 const due=tasks.filter(t=>t.status!=='done'&&t.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,3);
 $('#deadlines').innerHTML=due.length?due.map(t=>{const gap=Math.round((Date.UTC(...t.date.split('-').map((v,i)=>Number(v)-(i===1?1:0)))-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);return `<button class="deadline-row" data-edit="${esc(t.id)}"><span class="deadline-date">${Number(t.date.slice(5,7))}/${Number(t.date.slice(8))}</span><span class="deadline-info"><strong>${esc(t.title)}</strong><small>${esc(t.owner)} · ${esc(t.time)}</small></span><span class="due-badge">${gap===0?'오늘':'D−'+gap}</span></button>`}).join(''):'<div class="empty">다가오는 일정이 없어요. 잠깐 여유를 즐겨요.</div>';
}
function openEditor(id=null,date=today){editing=id;const t=tasks.find(t=>t.id===id)||{title:'',date,time:'10:00',owner:'',status:'todo',note:''};$('#editorTitle').textContent=id?'일정 수정':'새 일정 추가';$('#formError').textContent='';for(const k of ['title','date','time','owner','status','note'])$('#taskForm').elements.namedItem(k).value=t[k];$('#deleteTask').hidden=!id;$('#editor').showModal();$('#taskForm').elements.title.focus()}
$('#taskForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));for(const k in data)data[k]=data[k].trim();const t={...data,id:editing&&!editing.startsWith('sample-')?editing:crypto.randomUUID()};if(!t.title||!t.owner||!valid(t)){$('#formError').textContent='일정명, 담당자, 날짜와 시간을 확인해 주세요.';return}const next=editing?tasks.map(x=>x.id===editing?t:x):[...tasks,t];if(persist(next)){render();$('#editor').close();toast('일정을 저장했어요.')}});
$('#deleteTask').onclick=()=>{if(!confirm('이 일정을 삭제할까요?'))return;if(persist(tasks.filter(t=>t.id!==editing))){render();$('#editor').close();toast('일정을 삭제했어요.')}};
for(const id of ['closeEditor','cancelEditor'])$('#'+id).onclick=()=>$('#editor').close();
$('#editor').addEventListener('click',e=>{if(e.target===$('#editor')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),add=e.target.closest('[data-add]'),v=e.target.closest('[data-view]');if(edit)openEditor(edit.dataset.edit);if(add)openEditor(null,add.dataset.add);if(v){view=v.dataset.view;if(view==='week'){scope='week';activate('navWeek','주간 대시보드')}render()}});
function activate(id,label){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.id===id));$('#breadcrumb').textContent=label;$('#sectionTitle').textContent=scope==='all'?'전체 일정':'이번 주 일정'}
$('#addTask').onclick=()=>openEditor();$('#prevWeek').onclick=()=>{week=plus(week,-7);render()};$('#nextWeek').onclick=()=>{week=plus(week,7);render()};$('#thisWeek').onclick=()=>{week=monday(now);render()};
for(const id of ['ownerFilter','statusFilter'])$('#'+id).onchange=render;$('#search').oninput=render;
$('#navWeek').onclick=()=>{scope='week';view='week';activate('navWeek','주간 대시보드');render()};
$('#navTasks').onclick=()=>{scope='all';view='list';activate('navTasks','전체 일정');render()};
$('#navMembers').onclick=()=>{scope='week';view='week';activate('navMembers','팀원별 일정');render();$('#members').scrollIntoView({behavior:'smooth',block:'center'})};
$('#clearDemo').onclick=()=>{if(!confirm('예시 일정을 비울까요? 직접 추가하거나 수정한 일정은 유지됩니다.'))return;if(persist(tasks.filter(t=>!t.id.startsWith('sample-')),false)){render();toast('예시 일정을 비웠어요.')}};
$('#todayLabel').textContent=now.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
window.addEventListener('storage',e=>{if(e.key!==KEY||$('#editor').open)return;try{const s=JSON.parse(e.newValue);if(Array.isArray(s.tasks)&&s.tasks.every(valid)){tasks=s.tasks;demo=s.demo===true;render()}}catch{}});
render();if(storageError)toast('저장된 데이터를 읽지 못했어요. 브라우저 설정을 확인해 주세요.');
