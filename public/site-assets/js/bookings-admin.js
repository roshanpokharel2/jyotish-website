/* ============================================================
   BOOKED SERVICES / ADMIN RECORDS
   Submitted service requests from the database, grouped by person, with export.
   RLS decides what is listed: staff see every request, anyone else only their own
   (0002). Nothing is read from this browser's storage (Checkpoint K).
============================================================ */

let bookingAdminRecords = [];
let bookingAdminLoad = 0;

const BOOKING_RECORD_TYPES = {
  booking:'Consultation booking',
  chat:'Chat consultation',
  kundali:'Kundali request',
  question:'Question',
  order:'Shop order',
  enrollment:'Class enrollment',
  contact:'Contact request'
};

async function getBookingAdminRecords(){
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client || !mainAuthUser) return null;
  const { data, error } = await client.from('service_requests')
    .select('id, request_type, status, payload, created_at')
    .order('created_at', { ascending:false })
    .limit(500);
  if(error){ console.warn('Booking records unavailable:', error); return []; }
  return data.map(row=>{
    const payload = row.payload || {};
    return {
      key:`${new Date(row.created_at).toLocaleString()} · ${row.status}`,
      type:BOOKING_RECORD_TYPES[row.request_type] || row.request_type,
      name:String(payload.name || payload.fullName || payload.profile?.name || 'Unnamed visitor'),
      data:payload
    };
  });
}

function recordText(record){
  return JSON.stringify(record.data, null, 2);
}

function downloadJson(filename, value){
  const blob = new Blob([JSON.stringify(value, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBookingPerson(personIndex){
  const grouped = groupBookingAdminRecords();
  const group = grouped[personIndex];
  if(!group) return;
  downloadJson(`${group.safeName || 'visitor'}-bookings.json`, group.records.map(record=>({type:record.type, key:record.key, data:record.data})));
}

function downloadAllBookings(){
  downloadJson('jyotish-booked-services.json', bookingAdminRecords.map(record=>({type:record.type, key:record.key, data:record.data})));
}

function groupBookingAdminRecords(){
  const groups = new Map();
  bookingAdminRecords.forEach(record=>{
    const groupKey = record.name.trim().toLowerCase();
    if(!groups.has(groupKey)) groups.set(groupKey, {name:record.name, safeName:record.name.trim().replace(/[^a-z0-9 नेपाली_-]+/gi,'-'), records:[]});
    groups.get(groupKey).records.push(record);
  });
  return [...groups.values()];
}

async function renderBookingsAdmin(){
  const panel = document.getElementById('bookingsAdminGrid');
  if(!panel) return;
  const load = ++bookingAdminLoad;
  const records = await getBookingAdminRecords();
  if(load !== bookingAdminLoad) return; // a newer render (language, sign-in) won
  const t = T[LANG];
  if(records === null){
    bookingAdminRecords = [];
    setText('bookingsCountEl', '');
    panel.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.signInToContinue)}</p><button class="btn btn-gold" onclick="goView('account')">${t.authLoginTab}</button></div>`;
    return;
  }
  bookingAdminRecords = records;
  const groups = groupBookingAdminRecords();
  setText('bookingsCountEl', `${groups.length} ${t.bookingsPeopleLabel} · ${bookingAdminRecords.length} ${t.bookingsRecordsLabel}`);
  if(!groups.length){
    panel.innerHTML = `<div class="empty-box"><p>${t.bookingsEmpty}</p></div>`;
    return;
  }
  panel.innerHTML = groups.map((group,index)=>`
    <details class="booking-record-folder" ${index===0?'open':''}>
      <summary><span><strong>${escapeHtml(group.name)}</strong><small>${group.records.length} ${t.bookingsRecordsLabel}</small></span><button type="button" class="btn btn-ghost record-download" onclick="event.preventDefault();downloadBookingPerson(${index})">${t.bookingsDownloadPerson}</button></summary>
      <div class="booking-record-list">${group.records.map(record=>`<details class="booking-record-item"><summary><span>${escapeHtml(record.type)}</span><small>${escapeHtml(record.key)}</small></summary><pre>${recordText(record).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></details>`).join('')}</div>
    </details>`).join('');
}

async function renderQuestionConsultationsAdmin(){
  const panel = document.getElementById('questionConsultationsAdminGrid');
  if(!panel) return;
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client || !mainAuthUser){ panel.closest('.booking-panel')?.style.setProperty('display','none'); return; }
  const {data:astrologer} = await client.from('astrologers').select('id').eq('user_id',mainAuthUser.id).maybeSingle();
  if(!astrologer){ panel.closest('.booking-panel')?.style.setProperty('display','none'); return; }
  panel.closest('.booking-panel')?.style.removeProperty('display');
  panel.innerHTML = '<div class="empty-box"><p>Loading question consultations...</p></div>';
  const {data, error} = await client.from('question_consultations').select('*').neq('payment_status','UNPAID').order('created_at',{ascending:false});
  if(error){ panel.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  if(!data?.length){ panel.innerHTML = '<div class="empty-box"><p>No assigned question consultations.</p></div>'; return; }
  panel.innerHTML = data.map(item=>{
    const birth = item.birth_snapshot || {};
    const qid = item.question_id ? `Q-${String(item.question_id).padStart(6,'0')}` : item.id;
    const answer = String(item.answer || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<details class="booking-record-folder" style="margin-top:12px;"><summary><span><strong>${escapeHtml(qid)}</strong><small>${escapeHtml(item.status)} · ${escapeHtml(item.customer_name)}</small></span><small>${escapeHtml(item.token || 'Token after payment verification')}</small></summary>
      <div class="booking-record-list"><div class="disclaimer-box" style="text-align:left;"><b>Customer:</b> ${escapeHtml(item.customer_name)}<br><b>Birth:</b> BS ${escapeHtml((birth.dob_bs||[]).join('/'))} · AD ${escapeHtml(birth.dob_ad||'—')} · ${escapeHtml(birth.birth_time||'—')} · ${escapeHtml(birth.birth_place||'—')}, ${escapeHtml(birth.birth_country||'—')}<br><b>Payment:</b> ${escapeHtml(item.payment_status)} · NPR 100<br><b>Question:</b> ${escapeHtml(item.question_text)}</div>
      <div class="field"><label>Astrological Analysis</label><textarea rows="7" id="answer-${item.id}">${answer}</textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-ghost" onclick="saveQuestionAnswer('${item.id}','${qid}','IN REVIEW')">Save Draft</button><button class="btn btn-gold" onclick="saveQuestionAnswer('${item.id}','${qid}','ANSWERED')">Submit Answer</button></div></div></details>`;
  }).join('');
}

async function saveQuestionAnswer(recordId, questionId, status){
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  const answer = document.getElementById(`answer-${recordId}`)?.value.trim();
  if(!client || !answer){ showToast('Answer text is required.'); return; }
  const update = {answer,status};
  if(status==='ANSWERED') update.answered_at = new Date().toISOString();
  const {error} = await client.from('question_consultations').update(update).eq('id',recordId);
  if(error){ showToast(error.message); return; }
  showToast(status==='ANSWERED' ? 'Answer submitted.' : 'Draft saved.');
  renderQuestionConsultationsAdmin();
}
