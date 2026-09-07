/* ============================================================
   ASK ONE QUESTION MODULE
   Handles question submission flow: details -> question -> payment
============================================================ */

const askState = { step:1, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'', question:'', paymentAttested:false, termsAccepted:false, paymentRef:'', submitted:false, questionId:null, token:null, history:[], _error:null };

function askProfileKey(){ return 'jyotish_ask_birth_profile'; }
function askLoadProfile(){
  const raw = window.JYOTISH_HELPERS?.safeStorageGet(askProfileKey());
  if(!raw) return false;
  try { const profile = JSON.parse(raw); Object.assign(askState, profile); return Boolean(profile.name && profile.dobAd && profile.tob && profile.pob && profile.birthCountry); } catch(e){ return false; }
}
function askSaveProfile(){
  const profile = {name:askState.name,phone:askState.phone,email:askState.email,dobBsYear:askState.dobBsYear,dobBsMonth:askState.dobBsMonth,dobBsDay:askState.dobBsDay,dobAd:askState.dobAd,tob:askState.tob,pob:askState.pob,birthCountry:askState.birthCountry};
  const localSave = window.JYOTISH_HELPERS?.safeStorageSet(askProfileKey(), JSON.stringify(profile));
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(client && mainCustomer?.id){
    return Promise.all([localSave, client.from('customers').update({full_name:profile.name,phone:profile.phone||null,email:profile.email||null,dob_ad:profile.dobAd,dob_bs_year:Number(profile.dobBsYear)||null,dob_bs_month:Number(profile.dobBsMonth)||null,dob_bs_day:Number(profile.dobBsDay)||null,birth_time:profile.tob,birth_place:profile.pob,birth_country:profile.birthCountry}).eq('id',mainCustomer.id)]).then(([,result])=>{ if(result.error) console.warn('Ask birth profile sync failed:',result.error); });
  }
  return localSave;
}
function askLoadHistory(){
  const raw = window.JYOTISH_HELPERS?.safeStorageGet('jyotish_ask_history');
  try { askState.history = raw ? JSON.parse(raw) : []; } catch(e){ askState.history=[]; }
}
let askRemoteHistoryLoading = false;
let askRemoteHistoryLoaded = false;
async function askRefreshRemoteHistory(){
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client || !mainCustomer?.id || askRemoteHistoryLoading || askRemoteHistoryLoaded) return;
  askRemoteHistoryLoading = true;
  const {data,error} = await client.from('question_consultations').select('question_id,question_text,status,answer,created_at').eq('customer_id',mainCustomer.id).order('created_at',{ascending:false});
  askRemoteHistoryLoading = false;
  if(error || !data) return;
  askRemoteHistoryLoaded = true;
  askState.history = data.map(item=>({questionId:item.status==='UNPAID' ? null : (item.question_id ? `Q-${String(item.question_id).padStart(6,'0')}` : item.id),requestId:item.status==='UNPAID' ? 'Payment pending' : null,question:item.question_text,status:item.status,answer:item.answer,createdAt:item.created_at}));
  renderAsk();
}
function askSaveHistory(){ return window.JYOTISH_HELPERS?.safeStorageSet('jyotish_ask_history', JSON.stringify(askState.history)); }
function askHasSavedProfile(){ return Boolean(askState.name && askState.dobAd && askState.tob && askState.pob && askState.birthCountry); }
function askStatusLabel(status){ return status === 'ANSWERED' ? '✓ Answered' : status === 'PAID' ? '✓ Paid' : '⏳ Pending'; }
function renderAskDashboard(){
  const t = T[LANG];
  const answered = askState.history.filter(item=>item.status==='ANSWERED').length;
  const pending = askState.history.length - answered;
  const bs = [askState.dobBsYear,askState.dobBsMonth,askState.dobBsDay].filter(Boolean).join('/');
  const history = askState.history.length ? askState.history.map(item=>`<div class="review-row"><span><b>${escapeHtml(item.requestId || item.questionId)}</b><br><small>${escapeHtml(item.question)}</small>${item.answer?`<br><span style="display:block;margin-top:6px;color:var(--ink-soft);">${escapeHtml(item.answer)}</span>`:''}</span><b>${escapeHtml(askStatusLabel(item.status))}</b></div>`).join('') : `<div class="empty-box"><p>${t.askNoQuestions}</p></div>`;
  return `<div class="ask-dashboard"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div><span class="eyebrow">${t.askDashboardEyebrow}</span><h3>${t.ctAsk}</h3></div><button class="btn btn-ghost" onclick="askEditProfile()">${t.askEditProfile}</button></div>
    <div class="disclaimer-box" style="text-align:left;margin:14px 0;"><b>${escapeHtml(askState.name)}</b><br>${t.askBirthDetails}: BS: ${escapeHtml(bs || '—')} · AD: ${escapeHtml(askState.dobAd || '—')} · ${escapeHtml(askState.tob)}<br>${escapeHtml(askState.pob)}, ${escapeHtml(askState.birthCountry)}</div>
    <div class="card-grid cols-3"><div class="stat-card"><b>${askState.history.length}</b><small>${t.askTotalQuestions}</small></div><div class="stat-card"><b>${answered}</b><small>${t.askAnswered}</small></div><div class="stat-card"><b>${pending}</b><small>${t.askPending}</small></div></div>
    <button class="btn btn-gold btn-block" style="margin:18px 0;" onclick="askAnother()">${t.askAnotherBtn}</button><p style="text-align:center;font-weight:700;">${t.askFeeNote}</p><h4>${t.askHistoryTitle}</h4>${history}</div>`;
}

function askTopStep(){
  if(askState.submitted) return 5;
  if(askState.step>=4) return 4;
  if(askState.step>=3) return 3;
  if(askState.step>=2) return 2;
  return 1;
}

function renderAsk(){
  const t = T[LANG];
  renderAskStepBar(askTopStep());
  const panel = document.getElementById('askPanel');
  if(!panel) return;
  askRefreshRemoteHistory();
  if(askHasSavedProfile() && askState.step===1 && !askState.editProfile){ panel.innerHTML = renderAskDashboard(); return; }

  if(askState.submitted){
    panel.innerHTML = `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><h3>${t.askSuccessTitle}</h3>
      <div class="disclaimer-box" style="text-align:left;margin:14px 0;"><b>${t.payPendingBadge}</b><br>${t.payPendingNote}<br><br>${t.answerPendingNote}</div>
      <div class="booking-id">${t.questionRequestLabel}: ${askState.requestId}</div>
      <div class="review-row" style="text-align:left;"><span>${t.askQuestionLabel}</span><b>${escapeHtml(askState.question)}</b></div>
      <div style="margin-top:20px;"><button class="btn btn-gold" onclick="askAnother()">${t.askAnotherBtn}</button></div></div>`;
    return;
  }

  let html = '';
  let errorHtml = askState._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:10px;">${askState._error}</p>` : '';

  if(askState.step===1){
    html += renderDetailsFieldsHtml('ask', askState, t, false);
  } else if(askState.step===2){
    html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <h3 style="margin:0;">${t.ctAsk}</h3><span class="price-pill">${t.feeAsk}</span></div>
      <p style="margin-top:12px;">${t.askInstruction}</p>
      <div class="field" style="margin-top:14px;"><label>${t.askQuestionLabel} *</label><textarea rows="6" id="askQuestionInput" placeholder="${escapeHtml(t.askPlaceholder)}" oninput="askState.question=this.value">${escapeHtml(askState.question)}</textarea></div>
      <div class="disclaimer-box" style="margin-top:12px;">${t.askOneNotice}</div>`;
  } else if(askState.step===3){
    html += `<h3>${t.askPreviewTitle}</h3><div class="review-row"><span>${t.askYourQuestion}</span><b>${escapeHtml(askState.question)}</b></div><div class="review-row"><span>${t.consultationFee}</span><b>${t.feeAsk}</b></div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:18px;cursor:pointer;"><input type="checkbox" ${askState.termsAccepted?'checked':''} onchange="askState.termsAccepted=this.checked;askState._error=null" style="width:auto;"><span>${t.termsCheckboxLabel}</span></label>
      <p class="disclaimer-box" style="margin-top:14px;">${t.askFollowupRule}</p>`;
  } else if(askState.step===4){
    html += renderPaymentStepHtmlFor('ask', t, t.feeAsk, askState);
  }

  panel.innerHTML = html + errorHtml + `<div class="booking-nav">
    <button class="btn btn-ghost" onclick="askBack()" ${askState.step===1?'style="visibility:hidden;"':''}>${t.back}</button>
    <button class="btn btn-gold" onclick="askNext()">${askState.step===4?t.askSubmitBtn:(askState.step===3?t.askPaymentPreviewBtn:t.next)}</button>
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

function ask_setAttested(checked){ askState.paymentAttested = checked; askState._error=null; }
function ask_setPaymentRef(val){ askState.paymentRef = val; }

function askBack(){ if(askState.step>1){ askState.step--; askState._error=null; renderAsk(); } }

async function askNext(){
  if(askState.step===1){
    const validationError = detailsValidationError(askState);
    if(validationError){
      askState._error = validationError;
      renderAsk();
      return;
    }
    await askSaveProfile();
    askState.step = 2; askState._error = null; renderAsk();
    return;
  }
  if(askState.step===2){
    const question = askState.question.trim();
    if(!question){
      askState._error = T[LANG].questionRequired;
      renderAsk();
      return;
    }
    if(question.split(/[?؟]/).length > 2 || /\b(and|also| तथा | अनि | र )\b/i.test(question)){
      askState._error = T[LANG].oneQuestionWarning;
      renderAsk();
      return;
    }
    askState.step = 3; askState._error = null; renderAsk();
    return;
  }
  if(askState.step===3){
    if(!askState.termsAccepted){ askState._error=T[LANG].termsRequired; renderAsk(); return; }
    askState.step=4; askState._error=null; renderAsk(); return;
  }
  if(askState.step===4){
    if(!askState.paymentAttested){
      askState._error = T[LANG].payAttestRequired;
      renderAsk();
      return;
    }
    await submitAsk();
  }
}

async function submitAsk(){
  const t = T[LANG];
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  const requestId = `ASK-${Date.now()}`;
  askState.requestId = requestId;
  const payload = {request_id:requestId, question:askState.question, fee:100, currency:'NPR', payment_status:'unverified', question_status:'UNPAID', payment_ref:askState.paymentRef, profile:{name:askState.name,phone:askState.phone,email:askState.email,dob_bs:[askState.dobBsYear,askState.dobBsMonth,askState.dobBsDay].join('-'),dob_ad:askState.dobAd,tob:askState.tob,pob:askState.pob,birth_country:askState.birthCountry}};
  if(client && mainAuthUser){
    let error = null;
    if(mainCustomer?.id){
      const result = await client.from('question_consultations').insert({customer_id:mainCustomer.id,customer_name:askState.name,birth_snapshot:{dob_ad:askState.dobAd,dob_bs:[askState.dobBsYear,askState.dobBsMonth,askState.dobBsDay],birth_time:askState.tob,birth_place:askState.pob,birth_country:askState.birthCountry},question_text:askState.question}).select('id,question_id').single();
      error = result.error;
      if(!error) askState.pendingRecordId = result.data.id;
    } else {
      const result = await client.from('service_requests').insert({user_id:mainAuthUser.id,request_type:'question',payload,status:'new'});
      error = result.error;
    }
    if(error){ askState._error=error.message; renderAsk(); return; }
  } else {
    await window.JYOTISH_HELPERS?.safeStorageSet('ask_question_'+requestId, JSON.stringify(payload));
  }
  askState.history.unshift({requestId,question:askState.question,status:'UNPAID',createdAt:new Date().toISOString()});
  await askSaveHistory();
  askState.submitted = true;
  showToast(t.askSuccessTitle);
  renderAsk();
}

function askAnother(){
  Object.assign(askState, { step:2, question:'', paymentAttested:false, termsAccepted:false, paymentRef:'', submitted:false, questionId:null, token:null, requestId:null, _error:null });
  renderAsk();
}

function askEditProfile(){ askState.editProfile=true; askState.step=1; askState._error=null; renderAsk(); }

function resetAsk(){
  Object.assign(askState, { step:1, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'', question:'', paymentAttested:false, termsAccepted:false, paymentRef:'', submitted:false, questionId:null, token:null, requestId:null, _error:null });
  renderAsk();
}

askLoadHistory();
askLoadProfile();
