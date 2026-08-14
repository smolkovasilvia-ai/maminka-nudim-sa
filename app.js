
(()=>{
'use strict';
const G=window.MNS_GAMES||[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={age:Number(localStorage.getItem('mns_reset_age'))||0, need:null, current:null, deck:new Map(), phase:0, phases:[], wake:null};
const needNames={peace:'Chvíľa pokoja',energy:'Vybiť energiu',together:'Poďme spolu',surprise:'Prekvapenie'};

async function purgeOldCaches(){
  try{ if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations(); for(const r of regs) await r.unregister();}
    if('caches' in window){for(const k of await caches.keys()) if(/nudi|mami|nudim|mns/i.test(k)) await caches.delete(k);}
  }catch(e){}
}
purgeOldCaches();

function setAge(age){state.age=age;localStorage.setItem('mns_reset_age',String(age));$('#agePillText').textContent=`${age} ${age===2||age===3||age===4?'roky':'rokov'}`;closeAge();state.deck.clear();state.current=null;$('#recommendation').classList.add('hidden');}
function openAge(){const grid=$('#ageGrid');grid.innerHTML='';for(let a=2;a<=8;a++){const b=document.createElement('button');b.className='age-option'+(state.age===a?' selected':'');b.textContent=a;b.onclick=()=>setAge(a);grid.appendChild(b)}$('#ageSheet').classList.remove('hidden');$('#ageSheet').setAttribute('aria-hidden','false')}
function closeAge(){if(!state.age)return;$('#ageSheet').classList.add('hidden');$('#ageSheet').setAttribute('aria-hidden','true')}

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function poolFor(need){let pool=G.filter(g=>g.ageMin===state.age);if(need!=='surprise')pool=pool.filter(g=>(g.situations||[]).includes(need));return pool}
function deckKey(need){return `${state.age}:${need}`}
function nextGame(need){
  const pool=poolFor(need); if(!pool.length)return null;
  const key=deckKey(need); let deck=state.deck.get(key)||[];
  const valid=new Set(pool.map(g=>g.id)); deck=deck.filter(id=>valid.has(id)&&id!==state.current?.id);
  if(!deck.length){
    let ids=shuffle(pool.map(g=>g.id).filter(id=>id!==state.current?.id));
    if(!ids.length)ids=pool.map(g=>g.id);
    deck=ids;
  }
  let id=deck.shift();
  if(id===state.current?.id&&deck.length)id=deck.shift();
  state.deck.set(key,deck);
  return pool.find(g=>g.id===id)||pool.find(g=>g.id!==state.current?.id)||pool[0];
}
function messLabel(n){return n<=0?'bez bordelu':n===1?'takmer bez bordelu':'trochu bordelu'}
function prepLabel(g){return g.prepText||({0:'bez prípravy',1:'do 1 min',2:'2–3 min',3:'cca 5 min',4:'5+ min'}[g.prep]||'krátka príprava')}
function materialsText(g){return (!g.materials||!g.materials.length)?'nič navyše':g.materials.join(' · ')}
function showRecommendation(){const g=state.current;if(!g)return;$('#recommendLabel').textContent=`Nudi vybral · ${needNames[state.need]}`;$('#gameEmoji').textContent=g.emoji||'🎲';$('#gameTitle').textContent=g.title;$('#gameMeta').textContent=`~${g.time} min · ${prepLabel(g)} · ${messLabel(g.mess)}`;$('#gameMaterials').textContent=materialsText(g);$('#recommendation').classList.remove('hidden');setTimeout(()=>$('#recommendation').scrollIntoView({behavior:'smooth',block:'nearest'}),50)}
function chooseNeed(need){if(!state.age){openAge();return}state.need=need;state.current=nextGame(need);showRecommendation();}
function another(){if(!state.need)return;const old=state.current?.id;state.current=nextGame(state.need);if(state.current?.id===old){state.deck.delete(deckKey(state.need));state.current=nextGame(state.need)}showRecommendation();}

function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function buildPhases(g){
 const materialList=(g.materials||[]).length?`<ul>${g.materials.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p>Nič navyše.</p>';
 return [
   {k:'1 · PRIPRAV',t:'Najprv toto',body:`${materialList}<p>${escapeHtml(g.setup)}</p>`,speak:`Potrebuješ: ${(g.materials||[]).join(', ')||'nič navyše'}. ${g.setup}`},
   {k:'2 · ZAČNI',t:'Povedz presne toto',body:`<div class="quote">${escapeHtml(g.say)}</div>`,speak:g.say},
   ...g.steps.map((s,i)=>({k:`${i+3} · HRAJTE`,t:`Krok ${i+1}`,body:`<p>${escapeHtml(s)}</p>`,speak:s,help:g.ifStuck})),
   {k:'🏆 FINÁLE',t:'Hotovo!',body:`<p>${escapeHtml(g.finale)}</p>`,speak:g.finale,final:true}
 ];
}
async function requestWake(){try{if('wakeLock' in navigator)state.wake=await navigator.wakeLock.request('screen')}catch(e){}}
function releaseWake(){try{state.wake?.release()}catch(e){}state.wake=null}
function startGame(){if(!state.current)return;state.phases=buildPhases(state.current);state.phase=0;$('#gameModeTitle').textContent=state.current.title;$('#gameMode').classList.remove('hidden');$('#gameMode').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderPhase();requestWake()}
function renderPhase(){const p=state.phases[state.phase];$('#phaseKicker').textContent=p.k;$('#phaseTitle').textContent=p.t;$('#phaseBody').innerHTML=p.body;const help=$('#helpBtn');if(p.help){help.classList.remove('hidden');help.onclick=()=>toast(p.help,4200)}else help.classList.add('hidden');$('#nextPhase').textContent=p.final?'✓ Hotovo':'Ďalej';$('#progressFill').style.width=`${((state.phase+1)/state.phases.length)*100}%`;$('#phaseCard').style.animation='none';void $('#phaseCard').offsetWidth;$('#phaseCard').style.animation='phaseIn .22s ease'}
function nextPhase(){const p=state.phases[state.phase];if(p.final){celebrate();closeGame();toast('Nuda porazená ✨');return}state.phase++;renderPhase()}
function closeGame(){releaseWake();window.speechSynthesis?.cancel?.();$('#gameMode').classList.add('hidden');$('#gameMode').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function speakCurrent(){const p=state.phases[state.phase];if(!p||!('speechSynthesis'in window))return toast('Čítanie nahlas tu nie je dostupné.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(p.speak||$('#phaseBody').textContent);u.lang='sk-SK';u.rate=.93;speechSynthesis.speak(u)}
function toast(msg,ms=2300){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),ms)}
function celebrate(){const colors=['#48BDA4','#FFD66B','#FF9E86','#8CC7FF','#BCA6FF'];for(let i=0;i<24;i++){const c=document.createElement('i');c.className='confetti';c.style.left=(20+Math.random()*60)+'vw';c.style.top=(15+Math.random()*15)+'vh';c.style.background=colors[i%colors.length];c.style.animationDelay=(Math.random()*.15)+'s';document.body.appendChild(c);setTimeout(()=>c.remove(),1300)}}

$$('.need-card').forEach(b=>b.onclick=()=>chooseNeed(b.dataset.need));$('#ageBtn').onclick=openAge;$('#brandBtn').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});$('#ageSheet').onclick=e=>{if(e.target===$('#ageSheet'))closeAge()};$('#startBtn').onclick=startGame;$('#anotherBtn').onclick=another;$('#exitGame').onclick=closeGame;$('#nextPhase').onclick=nextPhase;$('#speakBtn').onclick=speakCurrent;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!$('#gameMode').classList.contains('hidden'))requestWake()});
if(state.age)setAge(state.age);else setTimeout(openAge,250);
})();
