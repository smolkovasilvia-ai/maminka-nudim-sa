(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const G=window.MNS_GAMES||[];
const K={profile:'nudi_v6_profile',state:'nudi_v6_state',history:'nudi_v6_history',fav:'nudi_v6_fav',ratings:'nudi_v6_ratings',inventory:'nudi_v6_inventory'};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let profile=load(K.profile,{name:'Ema',age:4,avatar:'🦊'});
let state=load(K.state,{need:'peace',time:15,mess:'no',place:'home',cats:[],sound:false,motion:true});
let history=load(K.history,[]), fav=load(K.fav,[]), ratings=load(K.ratings,{}), inventory=load(K.inventory,['paper','crayons','pillow','plush','blocks','spoon','towel','socks']);
let current=null, gameSteps=[], stepIndex=0, wakeLock=null, deferredPrompt=null, currentTimer=null, timerLeft=0, currentMineTab='hits';
const inventoryItems=[['paper','papier'],['crayons','pastelky'],['pillow','vankúše'],['plush','plyšák'],['blocks','kocky/LEGO'],['ball','lopta'],['socks','ponožky'],['spoon','lyžica'],['towel','uterák'],['box','krabica'],['tape','páska'],['scissors','detské nožnice'],['paint','farby'],['water','voda'],['cards','kartičky']];
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2300)}
function beep(){ if(!state.sound) return; try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=720;g.gain.setValueAtTime(.001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.08,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);o.start();o.stop(ctx.currentTime+.14)}catch{}}
function confetti(){ if(!state.motion) return; const host=document.body; pulse(host,'pop'); const box=$('#confetti'), colors=['#ff765f','#ffd15c','#7ee5d3','#c9a6ff','#9bdcff']; for(let i=0;i<34;i++){const e=document.createElement('i'); e.style.left=Math.random()*100+'%'; e.style.background=colors[i%colors.length]; e.style.animationDelay=Math.random()*.25+'s'; box.appendChild(e); setTimeout(()=>e.remove(),1700)}}
function pulse(el,kind='pop'){if(!state.motion||!el)return;try{el.getAnimations().forEach(a=>a.cancel());el.animate(kind==='pop'?[{transform:'scale(.96)'},{transform:'scale(1.025)'},{transform:'scale(1)'}]:[{opacity:.2,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:kind==='pop'?260:340,easing:'cubic-bezier(.2,.8,.2,1)'});}catch{}}
function nav(id){$$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));$$('[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===id)); if(id==='mine') renderMine(); if(id==='profile') renderProfile(); window.scrollTo({top:0,behavior:state.motion?'smooth':'auto'});requestAnimationFrame(()=>pulse(document.querySelector('#'+id),'in'))}
function initUI(){ $('#childAvatar').textContent=profile.avatar; $('#childNameTop').textContent=profile.name; $('#dailyCopy').textContent=`jedna dobrá hra pre ${profile.name}`; $$('#timeSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.time===state.time)); $$('#messSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mess===state.mess)); document.body.classList.toggle('noMotion',!state.motion); }
function gameAge(g){return profile.age>=g.ageMin&&profile.age<=g.ageMax}
function needRules(need){
  const base={};
  if(need==='peace') Object.assign(base,{parent:'low',solo:2,noMess:true,prep:1,cats:['calm','brain','pretend']});
  if(need==='busy') Object.assign(base,{parent:'low',solo:3,prep:1,cats:['calm','creative','brain']});
  if(need==='cook') Object.assign(base,{place:'home',prep:1,noMess:true,cats:['pretend','brain','sensory']});
  if(need==='call') Object.assign(base,{solo:3,noMess:true,prep:1,cats:['calm','brain']});
  if(need==='energy') Object.assign(base,{cats:['movement'],child:'hyper'});
  if(need==='travel') Object.assign(base,{place:'travel',noMess:true,cats:['brain','calm','pretend']});
  return base;
}
function score(g,opt={}){
  const need=opt.need??state.need, rules=needRules(need); let s=0;
  if(gameAge(g)) s+=70; else s-=100;
  const place=opt.place||rules.place||state.place; if((g.locations||[]).includes(place)) s+=22; if(place==='home'&&(g.locations||[]).includes('home'))s+=5;
  const targetTime=opt.time??state.time; s+=Math.max(0,24-Math.abs((g.time||15)-targetTime));
  const cats=opt.cats?.length?opt.cats:(rules.cats||state.cats); if(cats?.length&&cats.includes(g.category)) s+=26;
  if((state.mess==='no'||rules.noMess)&&g.mess<=1) s+=24; if((state.mess==='no'||rules.noMess)&&g.mess>2) s-=28;
  if((rules.prep!==undefined||opt.panic)&&g.prep<=1)s+=20; if(opt.panic&&g.prep>1)s-=35;
  if(rules.solo&&g.soloScore>=rules.solo)s+=18; if(rules.solo&&g.soloScore<rules.solo)s-=10;
  if(ratings[g.id]==='hit')s+=18; if(ratings[g.id]==='no')s-=38; if(fav.includes(g.id))s+=8;
  const last=history.find(h=>h.id===g.id); if(last){ const days=(Date.now()-last.at)/86400000; if(days<7)s-=50; else if(days<30)s-=18; }
  // lightweight materials guess
  const mat=(g.materials||'').toLowerCase(); if(opt.atHome){ const wants={'papier':'paper','pastel':'crayons','vankúš':'pillow','plyš':'plush','kock':'blocks','lopta':'ball','ponož':'socks','lyž':'spoon','uter':'towel','krab':'box','pás':'tape','nož':'scissors','farb':'paint','voda':'water'}; for(const k in wants){if(mat.includes(k)&&!inventory.includes(wants[k]))s-=24}}
  return s+Math.random()*8;
}
function ranked(opt={}){return G.map(g=>[g,score(g,opt)]).sort((a,b)=>b[1]-a[1]).map(x=>x[0])}
function pick(opt={}){return ranked(opt)[0]||G[0]}
function showSuggestion(g){current=g; $('#suggestTitle').textContent=g.title; $('#suggestEmoji').textContent=g.emoji||'🎲'; $('#suggestIntro').textContent=g.intro||g.say||''; $('#suggestMaterials').textContent=g.materials||'nič špeciálne'; $('#suggestMeta').innerHTML=[`${g.ageMin} r.`,`${g.time<10?'krátka':g.time<25?'tak akurát':'dlhšia'}`,g.prep<=1?'rýchla príprava':`príprava ${g.prep}/5`,g.noMess?'bez bordelu':'trochu chaos'].map(x=>`<span>${esc(x)}</span>`).join(''); $('#suggestPlan').innerHTML=[`PRIPRAV: ${g.setup}`,`POVEDZ: ${g.say}`,...(g.steps||[]).slice(0,2),`CIEĽ: ${g.finale}`].filter(Boolean).map(x=>`<li>${esc(x).slice(0,160)}${String(x).length>160?'…':''}</li>`).join(''); nav('suggestion');}
function buildGameSteps(g){ const steps=[]; steps.push({t:'Priprav',x:g.setup||'Priprav pomôcky z karty.',hint:g.materials?`Pomôcky: ${g.materials}`:''}); steps.push({t:'Povedz dieťaťu',x:g.say||g.intro||'Ideme sa hrať!',hint:'Prečítaj pokojne a s nadšením. To je celý štart.'}); (g.steps||[]).forEach((x,i)=>steps.push({t:`Misia ${i+1}`,x,hint:i===0?'Ťukni Hotovo až keď dieťa spraví tento krok.':''})); steps.push({t:'Finále',x:g.finale||'Hotovo! Oslávte úspech.',hint:g.why?`Trénuje: ${g.why}`:''}); if(g.encore) steps.push({t:'Chce ešte?',x:g.encore,hint:'Toto je pripravené pokračovanie bez rozmýšľania.'}); return steps; }
async function requestWake(){try{ if('wakeLock' in navigator) wakeLock=await navigator.wakeLock.request('screen'); }catch{}}
function releaseWake(){try{wakeLock&&wakeLock.release()}catch{} wakeLock=null}
function startGame(){gameSteps=buildGameSteps(current); stepIndex=0; nav('game'); requestWake(); renderStep();}
function renderStep(){const s=gameSteps[stepIndex]; $('#gameStepNo').textContent=`${stepIndex+1}/${gameSteps.length}`; $('#gameTitle').textContent=s.t; $('#gameText').textContent=s.x; $('#gameHint').textContent=s.hint||''; $('#gameProgress').style.width=`${((stepIndex+1)/gameSteps.length)*100}%`; $('#prevStep').disabled=stepIndex===0; $('#nextStep').textContent=stepIndex===gameSteps.length-1?'Dokončiť 🏆':'Hotovo →'; $('#timerBox').hidden=true; if(/počítaj|30 sek|minút|sekúnd|čas/i.test(s.x)){ $('#timerBox').hidden=false; timerLeft=/30/.test(s.x)?30:/60|minút/.test(s.x)?60:20; $('#timerText').textContent=fmt(timerLeft); $('#timerBtn').textContent='Štart'; } }
function fmt(n){return `00:${String(n).padStart(2,'0')}`}
function speak(){ if(!('speechSynthesis' in window)){toast('Čítanie tento prehliadač nepodporuje.');return} speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(`${$('#gameTitle').textContent}. ${$('#gameText').textContent}`); u.lang='sk-SK'; u.rate=.95; speechSynthesis.speak(u); }
function finishGame(){releaseWake(); pulse(document.querySelector('.gameCard'),'pop'); history.unshift({id:current.id,at:Date.now(),age:profile.age}); history=history.slice(0,500); save(K.history,history); $('#doneText').textContent=`${current.title} je zapísaná v histórii.`; confetti(); beep(); nav('done');}
function renderResults(){const selectedCats=$$('#typeChips button.on').map(b=>b.dataset.cat); state.cats=selectedCats; const place=$('#placeChips button.on')?.dataset.place||'home'; state.place=place; const opt={place,cats:selectedCats,panic:false,atHome:true}; let list=ranked(opt).filter(g=>gameAge(g)); if($('#noPrep').checked)list=list.filter(g=>g.prep<=1); if($('#noMess').checked)list=list.filter(g=>g.mess<=1||g.noMess); if($('#soloOnly').checked)list=list.filter(g=>g.soloScore>=3); if($('#newOnly').checked){const seen=new Set(history.map(h=>h.id));list=list.filter(g=>!seen.has(g.id));} $('#results').innerHTML=list.slice(0,18).map(tile).join('')||'<p>Skús povoliť filtre. Nudi to prehnal s presnosťou 😅</p>'; $$('#results .gameTile').forEach(b=>b.onclick=()=>showSuggestion(G.find(g=>g.id===b.dataset.id))); save(K.state,state);}
function tile(g){return `<button class="gameTile" data-id="${g.id}"><span class="emoji">${g.emoji||'🎲'}</span><h3>${esc(g.title)}</h3><p>${esc(g.intro||g.say||'Hotová hra bez rozmýšľania.')}</p><div class="tileMeta"><span>${g.time<10?'krátka':g.time<25?'tak akurát':'dlhšia'}</span><span>${g.prep<=1?'bez prípravy':`príprava ${g.prep}/5`}</span><span>${g.mess<=1?'čistá':`bordel ${g.mess}/5`}</span></div></button>`}
function renderAgeChips(){let html=''; for(let i=2;i<=8;i++)html+=`<button data-age="${i}" class="${profile.age===i?'on':''}">${i} r.</button>`; $('#ageChips').innerHTML=html; $$('#ageChips button').forEach(b=>b.onclick=()=>{profile.age=+b.dataset.age;save(K.profile,profile);renderAgeChips();initUI();renderResults()})}
function renderKids(){const list=ranked({panic:true}).slice(0,3); $('#kidCards').innerHTML=list.map(g=>`<button class="kidCard" data-id="${g.id}"><span>${g.emoji||'🎲'}</span><b>${esc(g.title)}</b></button>`).join(''); $$('#kidCards button').forEach(b=>b.onclick=()=>showSuggestion(G.find(g=>g.id===b.dataset.id))); nav('childChoice')}
function renderMine(){let ids=[]; if(currentMineTab==='hits') ids=Object.entries(ratings).filter(([,v])=>v==='hit').map(([id])=>id); if(currentMineTab==='fav') ids=fav; if(currentMineTab==='history') ids=history.map(h=>h.id); const used=new Set(), games=[]; for(const id of ids){ if(used.has(id))continue; const g=G.find(x=>x.id===id); if(g){games.push(g);used.add(id)} } $('#mineList').innerHTML=games.length?games.slice(0,40).map(tile).join(''):'<div class="profileCard"><h2>Zatiaľ nič.</h2><p>Po hre klikni HIT alebo si ju ulož. Tu vznikne váš rodinný zoznam záchranných hier.</p></div>'; $$('#mineList .gameTile').forEach(b=>b.onclick=()=>showSuggestion(G.find(g=>g.id===b.dataset.id)));}
function renderProfile(){ $('#pName').value=profile.name; $('#pAge').value=profile.age; $('#pAvatar').value=profile.avatar; $('#soundToggle').checked=state.sound; $('#motionToggle').checked=state.motion; $('#inventory').innerHTML=inventoryItems.map(([v,l])=>`<label><input type="checkbox" value="${v}" ${inventory.includes(v)?'checked':''}> ${l}</label>`).join(''); $$('#inventory input').forEach(i=>i.onchange=()=>{inventory=$$('#inventory input:checked').map(x=>x.value);save(K.inventory,inventory)});}
function setRating(r){ratings[current.id]=r; save(K.ratings,ratings); toast(r==='hit'?'Toto budeme ponúkať častejšie 😍':r==='no'?'OK, podobné pôjdu nižšie.':'Zapísané 🙂');}
function makePlaylist(mins){const list=[]; const cats=mins===30?['movement','brain','calm']:['movement','creative','pretend','brain','calm']; const per=mins===30?3:5; for(const c of cats){const g=ranked({cats:[c],panic:false}).find(x=>gameAge(x)&&!list.includes(x)); if(g)list.push(g); if(list.length>=per)break} current=list[0]; localStorage.setItem('nudi_v5_playlist',JSON.stringify(list.map(g=>g.id))); showSuggestion(current); toast(`Playlist má ${list.length} hier. Začni prvou.`);}
function bind(){
 $$('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav)); $('#childPill').onclick=()=>nav('profile');
 $$('#timeSeg button').forEach(b=>b.onclick=()=>{state.time=+b.dataset.time;save(K.state,state);initUI()}); $$('#messSeg button').forEach(b=>b.onclick=()=>{state.mess=b.dataset.mess;save(K.state,state);initUI()});
 $$('#needGrid button').forEach(b=>b.onclick=()=>{state.need=b.dataset.need; save(K.state,state); showSuggestion(pick({need:state.need,time:state.time,panic:state.need==='peace'||state.need==='busy'}));});
 $('#panicBtn').onclick=()=>showSuggestion(pick({need:'peace',time:state.time,panic:true})); $('#quickPanic').onclick=()=>showSuggestion(pick({need:'peace',time:state.time,panic:true}));
 $('#dailyBtn').onclick=()=>showSuggestion(pick({need:'surprise',time:20,panic:false})); $('#kidPickBtn').onclick=renderKids; $('#playlist30').onclick=()=>makePlaylist(30); $('#playlist60').onclick=()=>makePlaylist(60);
 $('#findBtn').onclick=renderResults; $$('#placeChips button').forEach(b=>b.onclick=()=>{$$('#placeChips button').forEach(x=>x.classList.toggle('on',x===b));renderResults()}); $$('#typeChips button').forEach(b=>b.onclick=()=>{b.classList.toggle('on');renderResults()}); ['noPrep','noMess','soloOnly','newOnly'].forEach(id=>$('#'+id).onchange=renderResults);
 $('#anotherGame').onclick=()=>showSuggestion(pick({need:state.need,time:state.time,panic:false})); $('#missingStuff').onclick=()=>showSuggestion(pick({need:state.need,time:state.time,panic:true,atHome:true})); $('#startGame').onclick=startGame;
 $('#exitGame').onclick=()=>{releaseWake();nav('suggestion')}; $('#prevStep').onclick=()=>{if(stepIndex>0){stepIndex--;renderStep()}}; $('#nextStep').onclick=()=>{if(stepIndex<gameSteps.length-1){stepIndex++;renderStep()}else finishGame()}; $('#speakBtn').onclick=speak;
 $('#timerBtn').onclick=()=>{clearInterval(currentTimer); let n=timerLeft; $('#timerBtn').textContent='Beží'; currentTimer=setInterval(()=>{n--;$('#timerText').textContent=fmt(Math.max(0,n)); if(n<=0){clearInterval(currentTimer);$('#timerBtn').textContent='Hotovo';beep()}},1000)};
 $$('.rating button').forEach(b=>b.onclick=()=>setRating(b.dataset.rate)); $('#encoreBtn').onclick=()=>{ if(current?.encore){gameSteps=[{t:'Chce ešte?',x:current.encore,hint:'Pokračovanie pripravené bez rozmýšľania.'}];stepIndex=0;nav('game');renderStep()} }; $('#homeDone').onclick=()=>nav('home');
 $$('.tabs button').forEach(b=>b.onclick=()=>{$$('.tabs button').forEach(x=>x.classList.toggle('on',x===b));currentMineTab=b.dataset.tab;renderMine()});
 $('#saveProfile').onclick=()=>{profile.name=$('#pName').value.trim()||'Dieťa';profile.age=Math.max(2,Math.min(8,+$('#pAge').value||4));profile.avatar=$('#pAvatar').value.trim()||'🦊';save(K.profile,profile);initUI();renderAgeChips();toast('Profil uložený ✨')};
 $('#soundToggle').onchange=e=>{state.sound=e.target.checked;save(K.state,state)}; $('#motionToggle').onchange=e=>{state.motion=e.target.checked;save(K.state,state);document.body.classList.toggle('noMotion',!state.motion)}; $('#installBtn').onclick=()=>{ if(deferredPrompt){deferredPrompt.prompt();return} toast('Na iPhone: Safari → Zdieľať → Pridať na plochu')};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e}); document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&wakeLock)requestWake()});
}
function boot(){bind();renderAgeChips();initUI();renderResults();if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
boot();
})();
