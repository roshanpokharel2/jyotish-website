/* ============================================================
   BOOKING WIZARD MODULE
   Handles booking flow: kind -> method -> astrologer -> terms -> payment -> details
============================================================ */

const bookingState = { stepIndex:0, kind:null, subOption:null, astrologer:'kp', termsAccepted:false, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'',message:'', paymentAttested:false, paymentRef:'', confirmed:false, bookingId:null, _error:null };

const ASTROLOGERS = [ { id:'kp' } ]; // extend this array to add more astrologers later

function bookingSteps(){
  if(bookingState.kind==='online') return ['kind','subopt','astrologer','terms','payment','details'];
  if(bookingState.kind==='direct') return ['kind','astrologer','directinfo','terms','payment','details'];
  return ['kind'];
}

function bookingStepLabels(){
  const t = T[LANG];
  if(bookingState.kind==='online') return [t.stepType, t.stepMethod, t.stepAstro, t.stepTerms, t.stepPayment, t.stepDetails];
  if(bookingState.kind==='direct') return [t.stepType, t.stepAstro, t.stepMethod, t.stepTerms, t.stepPayment, t.stepDetails];
  return [t.stepType];
}

function renderBooking(){
  const t = T[LANG];
  const steps = bookingSteps();
  const currentName = steps[bookingState.stepIndex] || 'kind';
  renderTopStepBar('bookingStepsBar', bookingState.stepIndex+1, bookingStepLabels());

  const panel = document.getElementById('bookingPanel');
  if(bookingState.confirmed){
    panel.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-check">${ICONS.check}</div>
        <h3>${t.onlineBookedMsg}</h3>
        <div class="disclaimer-box" style="text-align:left;margin:14px 0;"><b>${t.payPendingBadge}</b><br>${t.payPendingNote}</div>
        <div class="booking-id">${t.tokenLabel}: ${bookingState.bookingId}</div>
        <p style="font-size:.82rem;color:var(--ink-soft);margin-top:10px;">${t.tokenIssuedNote}</p>
        <div style="margin-top:20px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;"><button class="btn btn-gold" onclick="JYOTISH_HELPERS.openWhatsAppNotification('booking', bookingState)">${t.qlWa}</button><button class="btn btn-ghost" onclick="resetBooking()">${t.newBooking}</button></div>
      </div>`;
    return;
  }

  let html = '';
  let errorHtml = bookingState._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:10px;">${bookingState._error}</p>` : '';

  if(currentName==='kind'){
    html += `<h3>${t.chooseKindHeading}</h3><div class="chip-group">
      <button type="button" class="chip ${bookingState.kind==='online'?'selected':''}" onclick="bookingSetKind('online')" style="text-align:left;">${t.kindOnline}<br><small style="font-weight:400;">${t.kindOnlineD}</small></button>
      <button type="button" class="chip ${bookingState.kind==='direct'?'selected':''}" onclick="bookingSetKind('direct')" style="text-align:left;">${t.kindDirect}<br><small style="font-weight:400;">${t.kindDirectD}</small></button>
    </div>`;
  } else if(currentName==='subopt'){
    html += `<h3>${t.chooseOnlineOptionHeading}</h3><div class="chip-group">
      <button type="button" class="chip ${bookingState.subOption==='call'?'selected':''}" onclick="bookingSetSubOption('call')" style="text-align:left;">${t.optLiveCall}<br><small style="font-weight:400;">${t.optLiveCallD}</small></button>
      <button type="button" class="chip ${bookingState.subOption==='chart'?'selected':''}" onclick="bookingSetSubOption('chart')" style="text-align:left;">${t.optLiveChart}<br><small style="font-weight:400;">${t.optLiveChartD}</small></button>
      <button type="button" class="chip ${bookingState.subOption==='qa'?'selected':''}" onclick="bookingSetSubOption('qa')" style="text-align:left;">${t.optLiveQA}<br><small style="font-weight:400;">${t.optLiveQAD}</small></button>
    </div>`;
  } else if(currentName==='astrologer'){
    html += `<h3>${t.chooseAstrologerHeading}</h3>`;
    html += ASTROLOGERS.map(a=>{
      const selected = bookingState.astrologer===a.id;
      return `<div class="service-card" style="cursor:pointer;display:flex;gap:14px;align-items:center;${selected?'border-color:var(--gold);box-shadow:0 0 0 2px var(--gold) inset;':''}" onclick="bookingSetAstrologer('${a.id}')">
        <div class="service-icon" style="border-radius:50%;flex-shrink:0;">${ICONS.book}</div>
        <div><h4 style="margin:0;">${t.profName}</h4><p style="margin:2px 0 0;font-size:.82rem;color:var(--ink-soft);">${t.profFields[1][1]} • ${t.profFields[0][1]}</p></div>
      </div>`;
    }).join('');
    html += `<p style="font-size:.8rem;color:var(--ink-soft);margin-top:10px;">${t.astrologerMoreNote}</p>`;
  } else if(currentName==='directinfo'){
    html += `<h3>${t.directMeetingHeading}</h3><div class="disclaimer-box">${t.directMeetingNote}</div>`;
  } else if(currentName==='terms'){
    html += `<h3>${t.termsHeading}</h3><h4 style="margin-top:14px;font-size:.95rem;">${t.termsInfoHeading}</h4>
      <ol style="padding-left:20px;font-size:.88rem;color:var(--ink-soft);">${t.termsPoints.map(p=>`<li style="margin-bottom:6px;">${p}</li>`).join('')}</ol>
      <p style="font-size:.85rem;">${t.termsFooterNote}</p>
      <label style="display:flex;align-items:flex-start;gap:10px;margin-top:14px;cursor:pointer;">
        <input type="checkbox" ${bookingState.termsAccepted?'checked':''} onchange="bookingSetTerms(this.checked)" style="width:auto;margin-top:3px;">
        <span style="font-weight:600;">${t.termsCheckboxLabel}</span>
      </label>`;
  } else if(currentName==='payment'){
    const fee = bookingState.kind==='direct' ? t.pricePlaceholder : t.feeOnline;
    html += renderPaymentStepHtmlFor('booking', t, fee, bookingState);
  } else if(currentName==='details'){
    html += renderDetailsFieldsHtml('booking', bookingState, t, true);
  }

  const isLast = bookingState.stepIndex === steps.length-1;
  panel.innerHTML = html + errorHtml + `<div class="booking-nav">
    <button class="btn btn-ghost" onclick="bookingBack()" ${bookingState.stepIndex===0?'style="visibility:hidden;"':''}>${t.back}</button>
    <button class="btn btn-gold" onclick="bookingNext()">${isLast?t.confirmBooking:t.next}</button>
  </div>`;
}

function bookingSetKind(k){ bookingState.kind=k; bookingState.subOption=null; bookingState._error=null; renderBooking(); }
function bookingSetSubOption(o){ bookingState.subOption=o; bookingState._error=null; renderBooking(); }
function bookingSetAstrologer(id){ bookingState.astrologer=id; bookingState._error=null; renderBooking(); }
function bookingSetTerms(checked){ bookingState.termsAccepted=checked; bookingState._error=null; }

function booking_setAttested(checked){ bookingState.paymentAttested = checked; bookingState._error=null; }
function booking_setPaymentRef(val){ bookingState.paymentRef = val; }

function bookingBack(){ if(bookingState.stepIndex>0){ bookingState.stepIndex--; bookingState._error=null; renderBooking(); } }

async function bookingNext(){
  const steps = bookingSteps();
  const current = steps[bookingState.stepIndex];

  if(current==='kind' && !bookingState.kind){
    bookingState._error = T[LANG].modeRequired; renderBooking(); return;
  }
  if(current==='subopt' && !bookingState.subOption){
    bookingState._error = T[LANG].modeRequired; renderBooking(); return;
  }
  if(current==='terms' && !bookingState.termsAccepted){
    bookingState._error = T[LANG].termsRequired; renderBooking(); return;
  }
  if(current==='payment' && !bookingState.paymentAttested){
    bookingState._error = T[LANG].payAttestRequired; renderBooking(); return;
  }
  if(current==='details'){
    if(!detailsValid(bookingState)){
      bookingState._error = T[LANG].validationRequired; renderBooking(); return;
    }
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random()*90000+10000));
    bookingState.bookingId = bookingState.kind==='direct' ? `A-${seq.slice(0,3)}` : `KP-ON-${seq}`;
    bookingState.confirmed = true;
    const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
    if (storageOk) {
      const key = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.booking) || 'booking_';
      await window.JYOTISH_HELPERS.safeStorageSet(key + bookingState.bookingId, JSON.stringify(bookingState));
    }
    if (typeof saveAuthenticatedSubmission === 'function') {
      await saveAuthenticatedSubmission('booking', bookingState);
    }
    if (window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.sendBookingNotification) {
      await window.JYOTISH_HELPERS.sendBookingNotification(bookingState);
    }
    renderBooking();
    const completedBookingId = bookingState.bookingId;
    window.setTimeout(() => {
      if (bookingState.confirmed && bookingState.bookingId === completedBookingId) resetBooking();
    }, 4000);
    return;
  }

  bookingState._error = null;
  bookingState.stepIndex = Math.min(bookingState.stepIndex+1, bookingSteps().length-1);
  renderBooking();
}

function resetBooking(){
  Object.assign(bookingState, { stepIndex:0, kind:null, subOption:null, astrologer:'kp', termsAccepted:false, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'',message:'', paymentAttested:false, paymentRef:'', confirmed:false, bookingId:null, _error:null });
  renderBooking();
}
