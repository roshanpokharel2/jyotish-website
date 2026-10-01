/* ============================================================
   ASK ONE QUESTION MODULE
   details -> astrologer -> question -> preview -> POST /api/questions -> payment proof.
   The browser only proposes who is asked and what. The server and the database
   decide the customer, price and status (0034): the practitioners and the price
   shown are read from the database, and the question is whatever the server
   returns. Staff verify the payment proof; only then does the practitioner see it.
============================================================ */

const ASK_BLANK = { step:1, astrologerId:null, question:'', termsAccepted:false, created:null, busy:false, editProfile:false, _error:null };
const askState = { ...ASK_BLANK, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'', history:[] };
// What the database offered: practitioners, and the question service per practitioner.
const askData = { astrologers:null, services:{}, pending:null, failed:false };

PAY_FLOWS.ask = { render:()=>renderAsk(), target:()=>askState.created };

function askClient(){ return typeof getMainSupabase === 'function' ? getMainSupabase() : null; }
function askQuestionNumber(n){ return n ? `Q-${String(n).padStart(6,'0')}` : '—'; }
function askPrice(service){ return service ? `${service.currency} ${Number(service.price).toLocaleString('en-IN')}` : T[LANG].feeAsk; }

// The birth profile and question history live in the database (customers,
// question_consultations), not in the browser. Asking needs an account.
let askProfileLoadedFor = null;
function askLoadProfile(){
  const c = typeof mainCustomer !== 'undefined' ? mainCustomer : null;
  if(!c || askProfileLoadedFor === c.id) return;
  askProfileLoadedFor = c.id;
  Object.assign(askState, {
    name:c.full_name || '', phone:c.phone || '', email:c.email || '',
    dobAd:c.dob_ad || '', dobBsYear:c.dob_bs_year ? String(c.dob_bs_year) : '',
    dobBsMonth:c.dob_bs_month ? String(c.dob_bs_month) : '', dobBsDay:c.dob_bs_day ? String(c.dob_bs_day) : '',
    tob:c.birth_time ? String(c.birth_time).slice(0,5) : '', pob:c.birth_place || '', birthCountry:c.birth_country || ''
  });
}
async function askSaveProfile(){
  const client = askClient();
  if(!client || !mainCustomer?.id) return;
  const {data, error} = await client.from('customers').update({full_name:askState.name,phone:askState.phone||null,email:askState.email||null,dob_ad:askState.dobAd||null,dob_bs_year:Number(askState.dobBsYear)||null,dob_bs_month:Number(askState.dobBsMonth)||null,dob_bs_day:Number(askState.dobBsDay)||null,birth_time:askState.tob||null,birth_place:askState.pob||null,birth_country:askState.birthCountry||null}).eq('id',mainCustomer.id).select('*').single();
  if(error){ console.warn('Ask birth profile sync failed:',error); return; }
  mainCustomer = data;
}

let askHistoryLoading = false;
let askHistoryFor = null;   // the customer the history was loaded for
let askHistoryGen = 0;      // bumped by a reload: an older read still in flight is dropped
async function askRefreshRemoteHistory(){
  const client = askClient();
  if(!client || !mainCustomer?.id || askHistoryLoading || askHistoryFor === mainCustomer.id) return;
  askHistoryLoading = true;
  const forId = mainCustomer.id, gen = askHistoryGen;
  // payments <-> question_consultations link both ways; name the link to follow.
  const {data,error} = await client.from('question_consultations')
    .select('id,question_id,question_text,status,payment_status,answer,created_at,price_snapshot,currency,payment_id,payments!question_consultations_payment_id_fkey(status)')
    .eq('customer_id',forId).order('created_at',{ascending:false});
  if(gen !== askHistoryGen) return;
  askHistoryLoading = false;
  if(error || !data || mainCustomer?.id !== forId) return;
  askHistoryFor = forId;
  askState.history = data.map(item=>({ id:item.id, number:item.question_id, question:item.question_text, status:item.status,
    answer:item.status==='ANSWERED' ? item.answer : null, paymentId:item.payment_id, paymentStatus:item.payments?.status || null,
    price:item.price_snapshot, currency:item.currency }));
  renderAsk();
}
function askHistoryReload(){ askHistoryFor = null; askHistoryGen++; askHistoryLoading = false; askRefreshRemoteHistory(); }

// Saved means in the database, not typed into the form: otherwise the dashboard
// would replace the details form the moment its last field is filled.
function askHasSavedProfile(){
  const c = typeof mainCustomer !== 'undefined' ? mainCustomer : null;
  return Boolean(c?.full_name && c.dob_ad && c.birth_time && c.birth_place && c.birth_country);
}
function askStatusLabel(item){
  const st = T[LANG].aq.st;
  if(item.status === 'UNPAID' && item.paymentStatus === 'proof_submitted') return st.PROOF;
  return st[item.status] || item.status;
}

function renderAskDashboard(){
  const t = T[LANG];
  const answered = askState.history.filter(item=>item.status==='ANSWERED').length;
  const pending = askState.history.length - answered;
  const bs = [askState.dobBsYear,askState.dobBsMonth,askState.dobBsDay].filter(Boolean).join('/');
  const history = askState.history.length ? askState.history.map(item=>{
    const payable = item.status==='UNPAID' && item.paymentStatus==='awaiting_payment';
    return `<div class="review-row"><span><b>${escapeHtml(askQuestionNumber(item.number))}</b><br><small>${escapeHtml(item.question)}</small>${item.answer?`<br><span style="display:block;margin-top:6px;color:var(--ink-soft);">${escapeHtml(item.answer)}</span>`:''}${payable?`<br><button class="btn btn-gold" style="margin-top:6px;padding:4px 12px;font-size:.8rem;" onclick="askPayFor('${escapeHtml(item.id)}')">${escapeHtml(t.aq.payNow)}</button>`:''}</span><b>${escapeHtml(askStatusLabel(item))}</b></div>`;
  }).join('') : `<div class="empty-box"><p>${t.askNoQuestions}</p></div>`;
  return `<div class="ask-dashboard"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div><span class="eyebrow">${t.askDashboardEyebrow}</span><h3>${t.ctAsk}</h3></div><button class="btn btn-ghost" onclick="askEditProfile()">${t.askEditProfile}</button></div>
    <div class="disclaimer-box" style="text-align:left;margin:14px 0;"><b>${escapeHtml(askState.name)}</b><br>${t.askBirthDetails}: BS: ${escapeHtml(bs || '—')} · AD: ${escapeHtml(askState.dobAd || '—')} · ${escapeHtml(askState.tob)}<br>${escapeHtml(askState.pob)}, ${escapeHtml(askState.birthCountry)}</div>
    <div class="card-grid cols-3"><div class="stat-card"><b>${askState.history.length}</b><small>${t.askTotalQuestions}</small></div><div class="stat-card"><b>${answered}</b><small>${t.askAnswered}</small></div><div class="stat-card"><b>${pending}</b><small>${t.askPending}</small></div></div>
    <button class="btn btn-gold btn-block" style="margin:18px 0;" onclick="askAnother()">${t.askAnotherBtn}</button><p style="text-align:center;font-weight:700;">${t.askFeeNote}</p><h4>${t.askHistoryTitle}</h4>${history}</div>`;
}

async function askLoad(key, loader){
  if(askData.pending === key) return;
  askData.pending = key;
  try{ await loader(); }
  catch(err){ console.warn('Question data could not be loaded:', err); if(askData.pending === key) askData.failed = true; }
  if(askData.pending === key) askData.pending = null;
  renderAsk();
}

function askLoadAstrologers(){
  return askLoad('astrologers', async ()=>{
    const {data, error} = await askClient().rpc('active_practitioners');
    if(error) throw error;
    askData.astrologers = data;
  });
}

// The practitioner's own question service wins over the platform-wide one, as
// create_question() decides; this only shows the price it will charge.
function askLoadService(astrologerId){
  return askLoad(`service|${astrologerId}`, async ()=>{
    const {data, error} = await askClient().from('services').select('astrologer_id,price,currency')
      .eq('slug','question').eq('status','active').or(`astrologer_id.is.null,astrologer_id.eq.${astrologerId}`);
    if(error) throw error;
    askData.services[astrologerId] = data.find(s=>s.astrologer_id) || data[0] || null;
  });
}

function askLoadingHtml(t){
  if(askData.failed) return `<div class="disclaimer-box">${t.loadFailed}</div><button class="btn btn-ghost" style="margin-top:10px;" onclick="askData.failed=false;renderAsk()">${t.next}</button>`;
  return `<p style="color:var(--ink-soft);">${t.loadingText}</p>`;
}

function renderAskAstrologers(t){
  if(askData.astrologers === null){
    if(!askData.failed) askLoadAstrologers();
    return askLoadingHtml(t);
  }
  let html = `<h3>${t.chooseAstrologerHeading}</h3>`;
  if(!askData.astrologers.length) return html + `<div class="disclaimer-box">${t.noAstrologers}</div>`;
  return html + askData.astrologers.map(a=>{
    const selected = askState.astrologerId===a.id;
    return `<div class="service-card" style="cursor:pointer;display:flex;gap:14px;align-items:center;${selected?'border-color:var(--gold);box-shadow:0 0 0 2px var(--gold) inset;':''}" onclick="askSetAstrologer('${escapeHtml(a.id)}')">
      <div class="service-icon" style="border-radius:50%;flex-shrink:0;">${ICONS.book}</div>
      <div><h4 style="margin:0;">${escapeHtml(a.name)}</h4>${a.specialization?`<p style="margin:2px 0 0;font-size:.82rem;color:var(--ink-soft);">${escapeHtml(a.specialization)}</p>`:''}</div>
    </div>`;
  }).join('');
}

function renderAskCreated(t){
  const q = askState.created;
  return `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><h3>${escapeHtml(t.aq.saved)}</h3>
    <div class="booking-id">${t.questionIdLabel}: ${escapeHtml(askQuestionNumber(q.number))}</div>
    <div class="review-row" style="text-align:left;"><span>${t.askYourQuestion}</span><b>${escapeHtml(q.question)}</b></div>
    <div class="review-row" style="text-align:left;"><span>${t.consultationFee}</span><b>${escapeHtml(askPrice(q))}</b></div>
    ${renderPayPanelHtml('ask', t, q, t.aq.waiting)}
    <div style="margin-top:20px;display:flex;justify-content:center;"><button class="btn btn-ghost" onclick="askDone()">${t.askHistoryTitle}</button></div></div>`;
}

function askTopStep(){ return askState.created ? 4 : askState.step; }

function renderAsk(){
  const t = T[LANG];
  renderAskStepBar(askTopStep());
  const panel = document.getElementById('askPanel');
  if(!panel) return;
  askLoadProfile();
  askRefreshRemoteHistory();
  if(askState.created){ panel.innerHTML = renderAskCreated(t); return; }
  if(askHasSavedProfile() && askState.step===1 && !askState.editProfile){ panel.innerHTML = renderAskDashboard(); return; }

  let html = '';
  if(askState.step===1){
    html += renderDetailsFieldsHtml('ask', askState, t, false);
  } else if(askState.step===2){
    html += renderAskAstrologers(t);
  } else if(askState.step===3){
    html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <h3 style="margin:0;">${t.ctAsk}</h3><span class="price-pill">${escapeHtml(askPrice(askData.services[askState.astrologerId]))}</span></div>
      <p style="margin-top:12px;">${t.askInstruction}</p>
      <div class="field" style="margin-top:14px;"><label>${t.askQuestionLabel} *</label><textarea rows="6" id="askQuestionInput" maxlength="2000" placeholder="${escapeHtml(t.askPlaceholder)}" oninput="askState.question=this.value">${escapeHtml(askState.question)}</textarea></div>
      <div class="disclaimer-box" style="margin-top:12px;">${t.askOneNotice}</div>`;
  } else if(askState.step===4){
    const service = askData.services[askState.astrologerId];
    const astro = (askData.astrologers || []).find(a=>a.id===askState.astrologerId);
    html += `<h3>${t.askPreviewTitle}</h3>
      <div class="review-row"><span>${t.stepAstro}</span><b>${escapeHtml(astro?.name || '—')}</b></div>
      <div class="review-row"><span>${t.askYourQuestion}</span><b>${escapeHtml(askState.question)}</b></div>
      <div class="review-row"><span>${t.consultationFee}</span><b>${escapeHtml(askPrice(service))}</b></div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:18px;cursor:pointer;"><input type="checkbox" ${askState.termsAccepted?'checked':''} onchange="askState.termsAccepted=this.checked;askState._error=null" style="width:auto;"><span>${t.termsCheckboxLabel}</span></label>
      <p class="disclaimer-box" style="margin-top:14px;">${t.askFollowupRule}</p>`;
  }

  const errorHtml = askState._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:10px;">${escapeHtml(askState._error)}</p>` : '';
  const label = askState.busy ? t.loadingText : (askState.step===4 ? t.askPaymentPreviewBtn : t.next);
  panel.innerHTML = html + errorHtml + `<div class="booking-nav">
    <button class="btn btn-ghost" onclick="askBack()" ${askState.step===1?'style="visibility:hidden;"':''}>${t.back}</button>
    <button class="btn btn-gold" onclick="askNext()" ${askState.busy?'disabled':''}>${label}</button>
  </div>`;
}

function renderAskStepBar(topStep){
  const t = T[LANG];
  const bar = document.getElementById('askStepsBar');
  if(!bar) return;
  bar.innerHTML = t.askSteps.map((s,i)=>{
    const n=i+1; let cls = n<topStep?'done':(n===topStep?'current':'');
    return `<div class="b-step ${cls}">${s}</div>`;
  }).join('');
}

function askSetAstrologer(id){
  askState.astrologerId = id; askState._error = null;
  if(!(id in askData.services)) askLoadService(id);
  renderAsk();
}

function askBack(){ if(askState.step>1 && !askState.busy){ askState.step--; askState._error=null; renderAsk(); } }

async function askNext(){
  const t = T[LANG];
  const refuse = (message)=>{ askState._error = message; renderAsk(); };
  if(askState.busy) return;
  if(askState.step===1){
    if(typeof mainAuthUser === 'undefined' || !mainAuthUser) return refuse(t.signInToContinue);
    const validationError = detailsValidationError(askState);
    if(validationError) return refuse(validationError);
    await askSaveProfile();
  } else if(askState.step===2){
    if(!askState.astrologerId) return refuse(t.chooseAstroRequired);
  } else if(askState.step===3){
    const question = askState.question.trim();
    if(!question) return refuse(t.questionRequired);
    if(question.split(/[?؟]/).length > 2 || /\b(and|also| तथा | अनि | र )\b/i.test(question)) return refuse(t.oneQuestionWarning);
  } else if(askState.step===4){
    if(!askState.termsAccepted) return refuse(t.termsRequired);
    askState.busy = true; askState._error = null; renderAsk();
    try{ await submitAsk(); }
    catch(err){ console.warn('Question failed:', err); askState._error = t.aq.failed; }
    askState.busy = false;
    renderAsk();
    return;
  }
  askState.step++; askState._error = null; renderAsk();
}

async function submitAsk(){
  const t = T[LANG];
  const s = askState;
  const session = (await askClient().auth.getSession()).data.session;
  if(!session){ s._error = t.signInToContinue; return; }
  const subject = { name:s.name, dobAd:s.dobAd, tob:s.tob, pob:s.pob, country:s.birthCountry, phone:s.phone || null, email:s.email || null };
  if(s.dobBsYear && s.dobBsMonth && s.dobBsDay) subject.dobBs = { year:Number(s.dobBsYear), month:Number(s.dobBsMonth), day:Number(s.dobBsDay) };
  const response = await fetch('/api/questions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
    body:JSON.stringify({ astrologerId:s.astrologerId, question:s.question, subject })
  });
  const body = await response.json().catch(()=>({}));
  if(response.ok){
    s.created = { ...body.question, paymentStatus:'awaiting_payment' };
    payReset('ask');
    askHistoryReload();
    return;
  }
  const code = body.error && body.error.code;
  if(code==='too_many_unpaid') s._error = t.aq.tooManyUnpaid;
  else if((code==='invalid_body' || code==='self') && body.error.message) s._error = `${t.aq.failed} ${body.error.message}`;
  else s._error = t.aq.failed;
}

// Resume paying for a question saved earlier.
function askPayFor(id){
  const item = askState.history.find(h=>h.id===id);
  if(!item?.paymentId) return;
  askState.created = { id:item.id, number:item.number, question:item.question, price:item.price, currency:item.currency,
    paymentId:item.paymentId, paymentStatus:item.paymentStatus };
  payReset('ask');
  renderAsk();
}

function askDone(){
  Object.assign(askState, { ...ASK_BLANK, astrologerId:askState.astrologerId });
  payReset('ask');
  askHistoryReload();
  renderAsk();
}

function askAnother(){
  Object.assign(askState, { ...ASK_BLANK, step:2, astrologerId:askState.astrologerId });
  renderAsk();
}

function askEditProfile(){ askState.editProfile=true; askState.step=1; askState._error=null; renderAsk(); }
