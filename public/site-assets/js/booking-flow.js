/* ============================================================
   BOOKING WIZARD MODULE
   Online: kind -> method -> astrologer -> time -> terms -> details -> POST /api/bookings.
   The browser only proposes who, which service and when. The server and the database
   decide the customer, price, duration, availability and status (Step 7), so nothing
   here is trusted: the practitioners, prices and free times shown are read from the
   database, and the booking is whatever the server returns.
   In-person consultations are arranged by phone; there is no bookable one yet.
============================================================ */

const BOOKING_TZ = 'Asia/Kathmandu';
const BOOKING_DAYS = 14;
const BOOKING_SLUGS = { call:'live-call', chart:'live-chart', qa:'live-qa' };
const BOOKING_LOCALES = { ne:'ne-NP', en:'en-GB', hi:'hi-IN', sa:'sa-IN' };
const BOOKING_BLANK = { stepIndex:0, kind:null, subOption:null, astrologerId:null, service:null, slot:null, termsAccepted:false, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'',message:'', booking:null, busy:false, _error:null };

const bookingState = { ...BOOKING_BLANK };
// What the database offered. `slotsKey` is the astrologer|method the slots are for;
// `pending` is the load in flight, so a render does not start it twice.
const bookingData = { astrologers:null, slots:null, slotsKey:null, pending:null, failed:false };
let bookingProfileFor = null;

function bookingClient(){ return typeof getMainSupabase === 'function' ? getMainSupabase() : null; }
function bookingSignedIn(){ return typeof mainAuthUser !== 'undefined' && Boolean(mainAuthUser); }
function bookingSlotsKey(){ return `${bookingState.astrologerId}|${bookingState.subOption}`; }

// Kathmandu calendar day of an instant, as YYYY-MM-DD.
function bookingDay(date){ return new Intl.DateTimeFormat('en-CA',{timeZone:BOOKING_TZ}).format(date); }
function bookingAddDays(day, n){ const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function bookingFormat(iso, options){ return new Intl.DateTimeFormat(BOOKING_LOCALES[LANG] || 'en-GB',{timeZone:BOOKING_TZ, ...options}).format(new Date(iso)); }
function bookingPrice(price, currency){ return `${currency} ${Number(price).toLocaleString('en-IN')}`; }
function bookingMethodLabel(t){ return {call:t.optLiveCall, chart:t.optLiveChart, qa:t.optLiveQA}[bookingState.subOption] || ''; }

function bookingSteps(){
  if(bookingState.kind==='online') return ['kind','subopt','astrologer','time','terms','details'];
  if(bookingState.kind==='direct') return ['kind','directinfo'];
  return ['kind'];
}

function bookingStepLabels(){
  const t = T[LANG];
  if(bookingState.kind==='online') return [t.stepType, t.stepMethod, t.stepAstro, t.stepTime, t.stepTerms, t.stepDetails];
  if(bookingState.kind==='direct') return [t.stepType, t.stepMethod];
  return [t.stepType];
}

async function bookingLoad(key, loader){
  if(bookingData.pending === key) return;
  bookingData.pending = key;
  try{ await loader(); }
  catch(err){ console.warn('Booking data could not be loaded:', err); if(bookingData.pending === key) bookingData.failed = true; }
  if(bookingData.pending === key) bookingData.pending = null;
  renderBooking();
}

function bookingLoadAstrologers(){
  return bookingLoad('astrologers', async ()=>{
    const {data, error} = await bookingClient().rpc('active_practitioners');
    if(error) throw error;
    bookingData.astrologers = data;
  });
}

function bookingLoadSlots(){
  const key = bookingSlotsKey();
  const {astrologerId, subOption} = bookingState;
  return bookingLoad(key, async ()=>{
    const client = bookingClient();
    const {data:services, error} = await client.from('services').select('id,astrologer_id,price,currency,duration_minutes')
      .eq('slug', BOOKING_SLUGS[subOption]).eq('status','active').or(`astrologer_id.is.null,astrologer_id.eq.${astrologerId}`);
    if(error) throw error;
    // The practitioner's own offer of this service wins over the platform-wide one.
    const service = services.find(s=>s.astrologer_id) || services[0] || null;
    let slots = [];
    if(service){
      const from = bookingDay(new Date());
      const {data, error:slotError} = await client.rpc('available_slots', {p_astrologer:astrologerId, p_service:service.id, p_from:from, p_to:bookingAddDays(from, BOOKING_DAYS-1)});
      if(slotError) throw slotError;
      slots = data;
    }
    if(bookingSlotsKey() !== key) return;
    bookingState.service = service;
    bookingData.slots = slots;
    bookingData.slotsKey = key;
  });
}

// Fill blank fields from the signed-in customer's profile, once per customer.
function bookingPrefill(){
  const c = typeof mainCustomer !== 'undefined' ? mainCustomer : null;
  if(!c || bookingProfileFor === c.id) return;
  bookingProfileFor = c.id;
  const profile = {
    name:c.full_name, phone:c.phone, email:c.email, dobAd:c.dob_ad,
    dobBsYear:c.dob_bs_year, dobBsMonth:c.dob_bs_month, dobBsDay:c.dob_bs_day,
    tob:c.birth_time ? String(c.birth_time).slice(0,5) : '', pob:c.birth_place, birthCountry:c.birth_country
  };
  Object.entries(profile).forEach(([field, value])=>{ if(!bookingState[field] && value) bookingState[field] = String(value); });
}

function bookingLoadingHtml(t){
  if(bookingData.failed) return `<div class="disclaimer-box">${t.loadFailed}</div><button class="btn btn-ghost" style="margin-top:10px;" onclick="bookingRetry()">${t.next}</button>`;
  return `<p style="color:var(--ink-soft);">${t.loadingText}</p>`;
}

function renderBookingTime(t){
  if(bookingData.slotsKey !== bookingSlotsKey()){
    if(!bookingData.failed) bookingLoadSlots();
    return bookingLoadingHtml(t);
  }
  const service = bookingState.service;
  let html = `<h3>${t.chooseTimeHeading}</h3>`;
  if(service) html += `<p style="font-weight:600;color:var(--navy);">${escapeHtml(bookingMethodLabel(t))} • ${service.duration_minutes} ${t.minutesShort} • ${escapeHtml(bookingPrice(service.price, service.currency))}</p>`;
  if(!bookingData.slots.length) return html + `<div class="disclaimer-box">${t.noSlots}</div>`;
  const days = new Map();
  bookingData.slots.forEach(slot=>{
    const day = bookingDay(new Date(slot.starts_at));
    if(!days.has(day)) days.set(day, []);
    days.get(day).push(slot.starts_at);
  });
  days.forEach((starts, day)=>{
    html += `<h4 style="margin:14px 0 6px;font-size:.92rem;">${escapeHtml(bookingFormat(`${day}T12:00:00+05:45`, {weekday:'long', day:'numeric', month:'long'}))}</h4><div class="chip-group">`;
    html += starts.map(start=>`<button type="button" class="chip ${bookingState.slot===start?'selected':''}" onclick="bookingSetSlot('${escapeHtml(start)}')">${escapeHtml(bookingFormat(start, {hour:'2-digit', minute:'2-digit'}))}</button>`).join('');
    html += `</div>`;
  });
  return html + `<p style="font-size:.8rem;color:var(--ink-soft);margin-top:10px;">${t.timesInNepal}</p>`;
}

function renderBookingAstrologers(t){
  if(bookingData.astrologers === null){
    if(!bookingData.failed) bookingLoadAstrologers();
    return bookingLoadingHtml(t);
  }
  let html = `<h3>${t.chooseAstrologerHeading}</h3>`;
  if(!bookingData.astrologers.length) return html + `<div class="disclaimer-box">${t.noAstrologers}</div>`;
  html += bookingData.astrologers.map(a=>{
    const selected = bookingState.astrologerId===a.id;
    const about = a.specialization || '';
    return `<div class="service-card" style="cursor:pointer;display:flex;gap:14px;align-items:center;${selected?'border-color:var(--gold);box-shadow:0 0 0 2px var(--gold) inset;':''}" onclick="bookingSetAstrologer('${escapeHtml(a.id)}')">
      <div class="service-icon" style="border-radius:50%;flex-shrink:0;">${ICONS.book}</div>
      <div><h4 style="margin:0;">${escapeHtml(a.name)}</h4>${about?`<p style="margin:2px 0 0;font-size:.82rem;color:var(--ink-soft);">${escapeHtml(about)}</p>`:''}</div>
    </div>`;
  }).join('');
  return html;
}

function renderBookingConfirmed(t){
  const b = bookingState.booking;
  const when = bookingFormat(b.startsAt, {weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
  const holdUntil = bookingFormat(b.holdExpiresAt, {hour:'2-digit', minute:'2-digit'});
  return `<div class="confirm-box">
    <div class="confirm-check">${ICONS.check}</div>
    <h3>${t.heldMsg}</h3>
    <div class="booking-id">${t.referenceLabel}: ${escapeHtml(b.id.slice(0,8).toUpperCase())}</div>
    <p style="margin-top:12px;font-weight:600;">${escapeHtml(bookingMethodLabel(t))} • ${escapeHtml(when)} • ${escapeHtml(bookingPrice(b.price, b.currency))}</p>
    <div class="disclaimer-box" style="text-align:left;margin:14px 0;">${escapeHtml(t.holdNote.replace('{time}', holdUntil))}</div>
    ${renderBookingPay(t, b)}
    <div style="margin-top:20px;display:flex;justify-content:center;"><button class="btn btn-ghost" onclick="resetBooking()">${t.newBooking}</button></div>
  </div>`;
}

/* ============================================================
   PAYMENT STEP
   The booking only holds the slot; this collects the eSewa screenshot and
   posts it to /api/payments/:id/proof, which freezes the hold until staff
   review it. The account details are public platform settings, read straight
   from the database like prices and free times.
============================================================ */

const payData = { settings:null, pending:false, uploading:false, file:null, fileName:null, reference:'', _error:null };

function bookingLoadPaySettings(){
  if(payData.settings || payData.pending) return;
  payData.pending = true;
  bookingClient().from('platform_settings').select('key,value').in('key', ['esewa_account_label','esewa_account_id','esewa_qr_path'])
    .then(({data, error})=>{
      if(!error && data) payData.settings = Object.fromEntries(data.map(row=>[row.key, row.value]));
      payData.pending = false;
      renderBooking();
    })
    .catch(()=>{ payData.pending = false; renderBooking(); });
}

function renderBookingPay(t, booking){
  // Proof already in: the slot stays held while staff verify it.
  if(booking.paymentStatus === 'proof_submitted'){
    return `<div class="disclaimer-box" style="text-align:left;margin:14px 0;">${escapeHtml(t.pay.waiting)}</div>`;
  }
  if(!payData.settings){
    bookingLoadPaySettings();
    if(payData.pending) return `<p style="color:var(--ink-soft);">${t.loadingText}</p>`;
    return '';
  }
  const s = payData.settings;
  // The QR setting is empty until the platform uploads one; when set, it is a
  // hosted image URL (managed uploads arrive with the admin dashboard).
  const qr = typeof s.esewa_qr_path === 'string' && /^https?:\/\//i.test(s.esewa_qr_path)
    ? `<div style="margin:10px 0;"><img src="${escapeHtml(s.esewa_qr_path)}" alt="eSewa QR" style="max-width:220px;border-radius:8px;"></div>` : '';
  return `<div style="text-align:left;margin:14px 0;padding:14px;border:1px solid var(--gold);border-radius:10px;">
    <h4 style="margin:0 0 6px;">${escapeHtml(t.pay.title)}</h4>
    <p style="font-size:.85rem;color:var(--ink-soft);margin:0 0 8px;">${escapeHtml(t.pay.note)}</p>
    <div class="review-row"><span>${escapeHtml(s.esewa_account_label || t.pay.account)}</span><b>${escapeHtml(s.esewa_account_id || '')}</b></div>
    ${qr}
    <div class="field" style="margin-top:10px;"><label>${escapeHtml(t.pay.upload)}</label><input type="file" id="payProofFile" accept="image/jpeg,image/png,application/pdf" onchange="bookingPayFile(this)"></div>
    ${payData.fileName ? `<p style="font-size:.82rem;margin:6px 0 0;">${escapeHtml(payData.fileName)}</p>` : ''}
    <div class="field" style="margin-top:10px;"><label>${escapeHtml(t.pay.reference)}</label><input id="payReference" value="${escapeHtml(payData.reference)}" maxlength="120" oninput="payData.reference=this.value"></div>
    ${payData._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;">${escapeHtml(payData._error)}</p>` : ''}
    <button class="btn btn-gold btn-block" style="margin-top:12px;" onclick="bookingPaySubmit()" ${payData.uploading?'disabled':''}>${payData.uploading?t.loadingText:escapeHtml(t.pay.submit)}</button>
  </div>`;
}

function bookingPayFile(input){
  payData.file = input.files?.[0] || null;
  payData.fileName = payData.file?.name || null;
  payData._error = null;
  renderBooking();
}

async function bookingPaySubmit(){
  const t = T[LANG];
  const booking = bookingState.booking;
  if(!booking?.paymentId || payData.uploading) return;
  if(!payData.file){ payData._error = t.validationRequired; renderBooking(); return; }
  const session = (await bookingClient().auth.getSession()).data.session;
  if(!session){ payData._error = t.signInToContinue; renderBooking(); return; }
  payData.uploading = true; payData._error = null; renderBooking();
  try{
    const form = new FormData();
    form.append('file', payData.file);
    if(payData.reference.trim()) form.append('reference', payData.reference.trim());
    const response = await fetch(`/api/payments/${encodeURIComponent(booking.paymentId)}/proof`, {
      method:'POST',
      headers:{ Authorization:`Bearer ${session.access_token}` },
      body: form
    });
    const body = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error?.message || t.bookingFailed);
    booking.paymentStatus = body.payment?.status || 'proof_submitted';
    payData.file = payData.fileName = null; payData.reference = '';
  } catch(err){
    payData._error = err.message;
  }
  payData.uploading = false;
  renderBooking();
}

function renderBooking(){
  const t = T[LANG];
  const steps = bookingSteps();
  const currentName = steps[bookingState.stepIndex] || 'kind';
  renderTopStepBar('bookingStepsBar', bookingState.stepIndex+1, bookingStepLabels());

  const panel = document.getElementById('bookingPanel');
  if(!panel) return;
  if(bookingState.booking){ panel.innerHTML = renderBookingConfirmed(t); return; }

  const back = `<button class="btn btn-ghost" onclick="bookingBack()" ${bookingState.stepIndex===0?'style="visibility:hidden;"':''}>${t.back}</button>`;
  if(bookingState.kind==='online' && currentName!=='kind' && !bookingSignedIn()){
    panel.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.signInToContinue)}</p><button class="btn btn-gold" onclick="goView('account')">${t.authLoginTab}</button></div><div class="booking-nav">${back}</div>`;
    return;
  }

  let html = '';
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
    html += renderBookingAstrologers(t);
  } else if(currentName==='time'){
    html += renderBookingTime(t);
  } else if(currentName==='directinfo'){
    html += `<h3>${t.directMeetingHeading}</h3><div class="disclaimer-box">${t.directContactNote}</div>
      <div style="margin-top:14px;"><a class="btn btn-gold" href="${JYOTISH_HELPERS.website.whatsappLink}" target="_blank" rel="noopener">${t.qlWa}</a></div>`;
  } else if(currentName==='terms'){
    html += `<h3>${t.termsHeading}</h3><h4 style="margin-top:14px;font-size:.95rem;">${t.termsInfoHeading}</h4>
      <ol style="padding-left:20px;font-size:.88rem;color:var(--ink-soft);">${t.termsPoints.map(p=>`<li style="margin-bottom:6px;">${p}</li>`).join('')}</ol>
      <p style="font-size:.85rem;">${t.termsFooterNote}</p>
      <label style="display:flex;align-items:flex-start;gap:10px;margin-top:14px;cursor:pointer;">
        <input type="checkbox" ${bookingState.termsAccepted?'checked':''} onchange="bookingSetTerms(this.checked)" style="width:auto;margin-top:3px;">
        <span style="font-weight:600;">${t.termsCheckboxLabel}</span>
      </label>`;
  } else if(currentName==='details'){
    bookingPrefill();
    html += renderDetailsFieldsHtml('booking', bookingState, t, true);
  }

  const errorHtml = bookingState._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:10px;">${escapeHtml(bookingState._error)}</p>` : '';
  const isLast = bookingState.stepIndex === steps.length-1;
  const next = currentName==='directinfo' ? '' :
    `<button class="btn btn-gold" onclick="bookingNext()" ${bookingState.busy?'disabled':''}>${bookingState.busy?t.loadingText:(isLast?t.confirmBooking:t.next)}</button>`;
  panel.innerHTML = html + errorHtml + `<div class="booking-nav">${back}${next}</div>`;
}

function bookingSetKind(k){ bookingState.kind=k; bookingState.subOption=null; bookingState._error=null; renderBooking(); }
function bookingSetSubOption(o){ bookingState.subOption=o; bookingState.slot=null; bookingState._error=null; renderBooking(); }
function bookingSetAstrologer(id){ bookingState.astrologerId=id; bookingState.slot=null; bookingState._error=null; renderBooking(); }
function bookingSetSlot(start){ bookingState.slot=start; bookingState._error=null; renderBooking(); }
function bookingSetTerms(checked){ bookingState.termsAccepted=checked; bookingState._error=null; }
function bookingRetry(){ bookingData.failed=false; renderBooking(); }

function bookingBack(){
  if(bookingState.stepIndex>0 && !bookingState.busy){ bookingState.stepIndex--; bookingState._error=null; bookingData.failed=false; renderBooking(); }
}

async function bookingNext(){
  const t = T[LANG];
  const current = bookingSteps()[bookingState.stepIndex];
  const refuse = (message)=>{ bookingState._error = message; renderBooking(); };

  if(current==='kind' && !bookingState.kind) return refuse(t.modeRequired);
  if(current==='subopt' && !bookingState.subOption) return refuse(t.modeRequired);
  if(current==='astrologer' && !bookingState.astrologerId) return refuse(t.chooseAstroRequired);
  if(current==='time' && !bookingState.slot) return refuse(t.chooseTimeRequired);
  if(current==='terms' && !bookingState.termsAccepted) return refuse(t.termsRequired);
  if(current==='details'){
    const validationError = detailsValidationError(bookingState);
    if(validationError) return refuse(validationError);
    if(bookingState.busy) return;
    bookingState.busy = true; bookingState._error = null; renderBooking();
    try{ await bookingSubmit(); }
    catch(err){ console.warn('Booking failed:', err); bookingState._error = t.bookingFailed; }
    bookingState.busy = false;
    renderBooking();
    return;
  }

  bookingState._error = null;
  bookingData.failed = false;
  bookingState.stepIndex = Math.min(bookingState.stepIndex+1, bookingSteps().length-1);
  renderBooking();
}

async function bookingSubmit(){
  const t = T[LANG];
  const s = bookingState;
  const session = (await bookingClient().auth.getSession()).data.session;
  if(!session){ s._error = t.signInToContinue; return; }
  const subject = { name:s.name, dobAd:s.dobAd, tob:s.tob, pob:s.pob, country:s.birthCountry, phone:s.phone || null, email:s.email || null };
  if(s.dobBsYear && s.dobBsMonth && s.dobBsDay) subject.dobBs = { year:Number(s.dobBsYear), month:Number(s.dobBsMonth), day:Number(s.dobBsDay) };
  const response = await fetch('/api/bookings', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
    body:JSON.stringify({ astrologerId:s.astrologerId, serviceId:s.service.id, startsAt:s.slot, notes:s.message || null, subject })
  });
  const body = await response.json().catch(()=>({}));
  if(response.ok){ s.booking = body.booking; return; }
  const code = body.error && body.error.code;
  if(code==='slot_unavailable'){
    // Taken meanwhile: back to a fresh list of times.
    s.slot = null; bookingData.slotsKey = null;
    s.stepIndex = bookingSteps().indexOf('time');
    s._error = t.slotTaken;
  } else if(code==='too_many_holds'){
    s._error = t.tooManyHolds;
  } else if(code==='invalid_body' && body.error.message){
    s._error = `${t.bookingFailed} ${body.error.message}`;
  } else {
    s._error = t.bookingFailed;
  }
}

function resetBooking(){
  Object.assign(bookingState, BOOKING_BLANK);
  // A fresh booking means a fresh payment step; the eSewa account itself rarely
  // changes, so it stays cached.
  const settings = payData.settings;
  Object.assign(payData, { settings, pending:false, uploading:false, file:null, fileName:null, reference:'', _error:null });
  bookingData.slots = null; bookingData.slotsKey = null; bookingData.failed = false;
  bookingProfileFor = null;
  renderBooking();
}
