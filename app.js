const VERSION='1.0';
const DBKEY='evaluationPlan.v1';
let state=load(), currentId=null, session=null;
function load(){try{return JSON.parse(localStorage.getItem(DBKEY))||{plans:[]}}catch{return{plans:[]}}}
function persist(){localStorage.setItem(DBKEY,JSON.stringify(state))}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function view(id){$$('.view').forEach(v=>v.classList.add('hidden'));$('#'+id).classList.remove('hidden');$('#topbar').classList.toggle('hidden',id==='results'||(id==='run'&&session));renderAll()}
$$('[data-view]').forEach(b=>b.onclick=()=>{session=null;view(b.dataset.view)})
function blank(){return{id:uid(),name:'Nueva evaluación',subsetSize:10,feedback:'end',shuffleQuestions:true,shuffleOptions:true,questions:[]}}
$('#newPlan').onclick=()=>{let p=blank();state.plans.push(p);currentId=p.id;persist();openBuilder(p.id)};
function plan(){return state.plans.find(p=>p.id===currentId)}
function openBuilder(id){currentId=id;let p=plan();$('#planName').value=p.name;$('#subsetSize').value=p.subsetSize;$('#feedbackMode').value=p.feedback;$('#shuffleQuestions').checked=p.shuffleQuestions;$('#shuffleOptions').checked=p.shuffleOptions;$('#importText').value='';$('#importStatus').textContent='';view('builder')}
function saveForm(){let p=plan();if(!p)return;p.name=$('#planName').value.trim()||'Sin nombre';p.subsetSize=Math.max(1,+$('#subsetSize').value||1);p.feedback=$('#feedbackMode').value;p.shuffleQuestions=$('#shuffleQuestions').checked;p.shuffleOptions=$('#shuffleOptions').checked;persist();renderAll()}
$('#savePlan').onclick=()=>{saveForm();$('#savePlan').textContent='Guardado ✓';setTimeout(()=>$('#savePlan').textContent='Guardar evaluación',900)};
$('#deletePlan').onclick=()=>{if(!plan()||!confirm('¿Eliminar esta evaluación?'))return;state.plans=state.plans.filter(p=>p.id!==currentId);persist();currentId=null;view('plans')};
$('#clearQuestions').onclick=()=>{if(plan()&&confirm('¿Vaciar todo el banco de preguntas?')){plan().questions=[];persist();renderQuestions()}};
function parseQuestions(text){
 const blocks=text.trim().split(/\n\s*\n(?=\s*[^\n]+\n\s*[A-Za-z][\)\.])/).map(x=>x.trim()).filter(Boolean), out=[], errors=[];
 blocks.forEach((block,bi)=>{let lines=block.split(/\n/).map(x=>x.trim()).filter(Boolean), q=[], opts=[], correct=null, explanation='',topic='';
  for(let line of lines){let om=line.match(/^([A-Za-z])[\)\.]\s*(.+)$/);let cm=line.match(/^(?:CORRECTA|CORRECT|ANSWER)\s*:\s*([A-Za-z]|.+)$/i);let em=line.match(/^(?:EXPLICACI[ÓO]N|EXPLANATION)\s*:\s*(.+)$/i);let tm=line.match(/^(?:TEMA|TOPIC|CATEGOR[IÍ]A|CATEGORY)\s*:\s*(.+)$/i);
   if(om)opts.push({letter:om[1].toUpperCase(),text:om[2]}); else if(cm)correct=cm[1].trim(); else if(em)explanation=em[1]; else if(tm)topic=tm[1]; else q.push(line)}
  let ci=opts.findIndex(o=>o.letter===String(correct).toUpperCase());if(ci<0&&correct)ci=opts.findIndex(o=>o.text.toLowerCase()===String(correct).toLowerCase());
  if(q.length&&opts.length>=2&&ci>=0)out.push({id:uid(),text:q.join(' '),options:opts.map(o=>o.text),correct:ci,explanation,topic}); else errors.push(bi+1)
 });return{out,errors}
}
$('#parseImport').onclick=()=>{let p=plan(),r=parseQuestions($('#importText').value);p.questions.push(...r.out);persist();$('#importStatus').textContent=`${r.out.length} importadas${r.errors.length?` · ${r.errors.length} bloque(s) con error`:''}`;renderQuestions()};
function renderQuestions(){let p=plan();if(!p)return;$('#qCount').textContent=`(${p.questions.length})`;$('#questionList').innerHTML=p.questions.map((q,i)=>`<div class="question"><div class="row between"><b>${i+1}. ${esc(q.text)}</b><button onclick="removeQ('${q.id}')">Eliminar</button></div>${q.topic?`<span class="tag">${esc(q.topic)}</span>`:''}<p class="muted">✓ ${esc(q.options[q.correct])}${q.explanation?' · '+esc(q.explanation):''}</p></div>`).join('')||'<p class="muted">Todavía no hay preguntas.</p>'}
window.removeQ=id=>{plan().questions=plan().questions.filter(q=>q.id!==id);persist();renderQuestions()};
function renderAll(){let cards=state.plans.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><p class="muted">${p.questions.length} preguntas · usa ${Math.min(p.subsetSize,p.questions.length)||0}</p><div class="row"><button class="primary" onclick="start('${p.id}')" ${p.questions.length?'':'disabled'}>Ejecutar</button><button onclick="edit('${p.id}')">Editar</button></div></div>`).join('');$('#planList').innerHTML=cards||'<div class="card muted">Creá tu primera evaluación.</div>';$('#runPlanList').innerHTML=cards||'<p class="muted">No hay evaluaciones.</p>';if(currentId)renderQuestions()}
window.edit=openBuilder;window.start=start;
function shuffled(a){return [...a].sort(()=>Math.random()-.5)}
function start(id){let p=state.plans.find(x=>x.id===id);if(!p||!p.questions.length)return;let qs=p.shuffleQuestions?shuffled(p.questions):[...p.questions];qs=qs.slice(0,Math.min(p.subsetSize,qs.length)).map(q=>{let pairs=q.options.map((text,i)=>({text,correct:i===q.correct}));if(p.shuffleOptions)pairs=shuffled(pairs);return{...q,pairs,answer:null}});session={plan:p,qs,index:0};view('run');renderPlayer()}
$('#testPlan').onclick=()=>{saveForm();start(currentId)};
function renderPlayer(){let s=session,q=s.qs[s.index],pct=s.index/s.qs.length*100;$('#runPicker').classList.add('hidden');$('#player').classList.remove('hidden');$('#player').innerHTML=`<div class="progress"><div style="width:${pct}%"></div></div><p class="muted">Pregunta ${s.index+1} de ${s.qs.length}${q.topic?' · '+esc(q.topic):''}</p><h2>${esc(q.text)}</h2><div>${q.pairs.map((o,i)=>`<button class="option ${q.answer===i?'selected':''}" onclick="choose(${i})">${esc(o.text)}</button>`).join('')}</div><div id="feedback"></div><div class="row between" style="margin-top:18px"><button onclick="quitRun()">Salir</button><button class="primary" id="nextBtn" onclick="nextQ()" ${q.answer===null?'disabled':''}>${s.index===s.qs.length-1?'Finalizar':'Siguiente'}</button></div>`}
window.choose=i=>{let q=session.qs[session.index];if(session.plan.feedback==='immediate'&&q.answer!==null)return;q.answer=i;renderPlayer();if(session.plan.feedback==='immediate'){let ok=q.pairs[i].correct;$('.option.selected').classList.add(ok?'correct':'wrong');$('#feedback').innerHTML=`<p><b>${ok?'Correcto':'Incorrecto'}</b>${q.explanation?' — '+esc(q.explanation):''}</p>`}}
window.nextQ=()=>{if(session.qs[session.index].answer===null)return;if(session.index<session.qs.length-1){session.index++;renderPlayer()}else finish()};
window.quitRun=()=>{session=null;$('#player').classList.add('hidden');$('#runPicker').classList.remove('hidden');view('run')};
function finish(){let correct=session.qs.filter(q=>q.pairs[q.answer]?.correct).length,total=session.qs.length,pct=Math.round(correct/total*100);let topics={};session.qs.forEach(q=>{let t=q.topic||'Sin tema';topics[t]??={n:0,c:0};topics[t].n++;if(q.pairs[q.answer]?.correct)topics[t].c++});$('#resultBox').innerHTML=`<h1>${esc(session.plan.name)}</h1><div class="score">${pct}%</div><p style="text-align:center">${correct} / ${total} correctas</p><h2>Por tema</h2>${Object.entries(topics).map(([t,v])=>`<p><b>${esc(t)}</b>: ${Math.round(v.c/v.n*100)}% (${v.c}/${v.n})</p>`).join('')}<h2>Revisión</h2>${session.qs.map((q,i)=>{let ok=q.pairs[q.answer]?.correct,correctOpt=q.pairs.find(o=>o.correct);return`<div class="review"><b>${i+1}. ${esc(q.text)}</b><p>${ok?'✓':'✗'} Tu respuesta: ${esc(q.pairs[q.answer]?.text||'—')}</p>${!ok?`<p>Correcta: <b>${esc(correctOpt.text)}</b></p>`:''}${q.explanation?`<p class="muted">${esc(q.explanation)}</p>`:''}</div>`}).join('')}<div class="row"><button class="primary" onclick="start('${session.plan.id}')">Intentar nuevamente</button><button onclick="backHome()">Evaluaciones</button></div>`;view('results')}
window.backHome=()=>{session=null;view('plans')};
renderAll();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
