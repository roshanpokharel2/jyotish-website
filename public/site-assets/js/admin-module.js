/* ============================================================
   STAFF DASHBOARD (Step 20)
   One view for staff: an overview of what is waiting, then the queues. Sections
   follow the role -- presentation only; every endpoint and RLS policy enforces
   the same lists. The queue renderers below moved here from My Account
   unchanged; after an action they refresh through accRefresh().
============================================================ */

let adminTab = 'overview';
let adminLoad = 0;
const ADMIN_MONEY = ['finance','admin','super_admin'];
const ADMIN_MODERATION = ['moderator','admin','super_admin'];
const ADMIN_SUPPORT = ['support','admin','super_admin'];
const ADMIN_SETUP = ['admin','super_admin'];
const ADMIN_BOOKINGS = ['support','finance','admin','super_admin'];

function setAdminTab(tab){ adminTab = tab; renderAdmin(); }

function adminTabs(){
  const t = T[LANG];
  const tabs = [['overview', t.adm.overview]];
  if(accIsStaff()) tabs.push(['applications', t.jyotishAdmin.title]);
  if(ADMIN_SUPPORT.includes(accRole)) tabs.push(['customers', t.adm.customers]);
  if(ADMIN_BOOKINGS.includes(accRole)) tabs.push(['bookings', t.adm.bookings]);
  if(ADMIN_MODERATION.includes(accRole)) tabs.push(['practitioners', t.adm.practitioners]);
  if(ADMIN_MODERATION.includes(accRole)) tabs.push(['reviews', t.adm.reviews]);
  if(ADMIN_MONEY.includes(accRole)) tabs.push(['payments', t.payReview.title], ['refunds', t.rf.title], ['payouts', t.po.title]);
  if(ADMIN_MODERATION.includes(accRole)) tabs.push(['knowledge', t.kn.queue]);
  if(ADMIN_SETUP.includes(accRole)) tabs.push(['services', t.adm.services], ['settings', t.adm.settings]);
  if(ADMIN_MONEY.includes(accRole)) tabs.push(['audit', t.au.title]);
  return tabs;
}

async function renderAdmin(){
  const t = T[LANG];
  const root = document.getElementById('adminRoot');
  setText('adminHeading', t.adm.title);
  if(!root) return;
  if(!getMainSupabase() || !mainAuthUser){
    root.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.signInToContinue)}</p><button class="btn btn-gold" onclick="goView('account')">${escapeHtml(t.authLoginTab)}</button></div>`;
    return;
  }
  const load = ++adminLoad;
  await loadAccountContext();
  if(load !== adminLoad) return; // a newer render (language, tab, sign-in) won
  if(!accIsStaff()){ root.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.adm.notStaff)}</p></div>`; return; }

  const tabs = adminTabs();
  if(!tabs.some(tab => tab[0] === adminTab)) adminTab = 'overview';
  root.innerHTML = `
    <div class="faq-tabs" style="flex-wrap:wrap;">
      ${tabs.map(tab => `<button class="faq-tab${tab[0]===adminTab?' active':''}" onclick="setAdminTab('${tab[0]}')">${escapeHtml(tab[1])}</button>`).join('')}
    </div>
    <div class="booking-panel" style="margin-top:18px;" id="adminPanelBody"></div>`;

  const body = document.getElementById('adminPanelBody');
  if(adminTab === 'overview') return renderAdminOverview(body);
  if(adminTab === 'applications') return renderJyotishApplicationsQueue(body);
  if(adminTab === 'customers') return renderCustomersTab(body);
  if(adminTab === 'practitioners') return renderPractitionersTab(body);
  if(adminTab === 'bookings') return renderBookingsTab(body);
  if(adminTab === 'reviews') return renderReviewsTab(body);
  if(adminTab === 'services') return renderServicesTab(body);
  if(adminTab === 'settings') return renderSettingsTab(body);
  if(adminTab === 'payments') return renderPaymentsQueue(body);
  if(adminTab === 'refunds') return renderRefundsQueue(body);
  if(adminTab === 'payouts') return renderPayoutsQueue(body);
  if(adminTab === 'knowledge') return renderKnowledgeQueue(body);
  if(adminTab === 'audit') return renderAuditTab(body);
}

// Counts from the server; only the ones this role may open come back.
async function renderAdminOverview(body){
  const t = T[LANG].adm;
  const token = await accToken();
  let result;
  try{
    const response = await fetch('/api/admin/overview', { headers:{ Authorization:`Bearer ${token}` } });
    result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
  } catch(err){
    body.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  const cards = [
    ['applications', 'applications'], ['proofs', 'payments'], ['refunds', 'refunds'], ['payouts', 'payouts'],
    ['knowledge', 'knowledge'], ['bookingsToday', null], ['questionsWaiting', null]
  ].filter(([key]) => key in result.counts);
  body.innerHTML = `<div class="card-grid cols-3">${cards.map(([key, tab]) => `
    <div class="stat-card admin-stat" data-key="${key}" ${tab ? `style="cursor:pointer;" onclick="setAdminTab('${tab}')"` : ''}>
      <b>${escapeHtml(result.counts[key])}</b><small>${escapeHtml(t.counts[key])}</small>
    </div>`).join('')}</div>`;
}

// Items waiting for moderation; deciding goes through /api/knowledge/:id/moderate.
async function renderKnowledgeQueue(body){
  const t = T[LANG].kn;
  const token = await accToken();
  let queue = [];
  try{
    const response = await fetch('/api/knowledge/queue', { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    queue = result.items ?? [];
  } catch(err){
    body.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  body.innerHTML = queue.map(k => `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span><b>${escapeHtml(k.title)}</b><br><small>${escapeHtml(k.author?.email || '')} · ${escapeHtml(k.contentType)} · ${escapeHtml(k.language)}</small><br><small>${escapeHtml((k.body || '').slice(0, 300))}</small></span>
      <span style="display:flex;gap:8px;flex-shrink:0;">${knowledgeButton(k.id, 'published', T[LANG].kn.publish, true)}${knowledgeButton(k.id, 'rejected', T[LANG].kn.reject, false)}</span>
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

/* ============================================================
   CUSTOMERS (support, admin, super_admin)
   The list comes from the server (staff have no RLS read on customers). Blocking goes
   through /api/admin/customers/:id/status, which audits who and why (0037). A role
   change is an RLS update on users; the 0006 guard decides, so only a super_admin can
   grant or remove admin roles, and its refusal is shown as it is.
============================================================ */

let adminCustomerQuery = '';
const ADMIN_ROLES = ['customer','jyotish','moderator','support','finance','admin','super_admin'];

async function renderCustomersTab(body){
  const t = T[LANG].adm;
  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <input id="admCustQ" style="flex:1;" placeholder="${escapeHtml(t.search)}" value="${escapeHtml(adminCustomerQuery)}" onkeydown="if(event.key==='Enter') searchCustomers()">
      <button class="btn btn-gold" onclick="searchCustomers()">${escapeHtml(t.searchBtn)}</button>
    </div>
    <div id="admCustList"></div>`;
  const list = document.getElementById('admCustList');
  const token = await accToken();
  let customers = [];
  try{
    const response = await fetch(`/api/admin/customers?q=${encodeURIComponent(adminCustomerQuery)}`, { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    customers = result.customers ?? [];
  } catch(err){
    list.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  const canRole = ['admin','super_admin'].includes(accRole);
  list.innerHTML = customers.map(c => {
    const self = c.userId === mainAuthUser?.id;
    const blockable = !self && ['customer','jyotish'].includes(c.role);
    return `
    <div class="review-row" style="align-items:flex-start;gap:12px;" data-customer="${escapeHtml(c.id)}">
      <span><b>${escapeHtml(c.fullName)}</b>${self ? ` <small>(${escapeHtml(t.you)})</small>` : ''}<br>
        <small>${escapeHtml(c.email || '')}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</small><br>
        <small>${escapeHtml(t.role)}: ${escapeHtml(c.role || '—')} · ${escapeHtml(t.cst[c.status] || c.status)}</small></span>
      <span style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">
        ${blockable ? (c.status === 'blocked'
          ? `<button class="btn btn-gold" onclick="setCustomerStatus('${escapeHtml(c.id)}','active')">${escapeHtml(t.unblock)}</button>`
          : `<button class="btn btn-ghost" onclick="setCustomerStatus('${escapeHtml(c.id)}','blocked')">${escapeHtml(t.block)}</button>`) : ''}
        ${canRole && !self && c.role ? `<select class="adm-role" aria-label="${escapeHtml(t.role)}">${ADMIN_ROLES.map(r => `<option value="${r}"${r === c.role ? ' selected' : ''}>${r}</option>`).join('')}</select>
          <button class="btn btn-ghost" onclick="setUserRole('${escapeHtml(c.userId)}', this.previousElementSibling.value)">${escapeHtml(t.saveRole)}</button>` : ''}
      </span>
    </div>`;
  }).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

function searchCustomers(){
  adminCustomerQuery = document.getElementById('admCustQ')?.value.trim() || '';
  renderAdmin();
}

async function setCustomerStatus(id, status){
  const t = T[LANG].adm;
  const reason = window.prompt(t.reasonPrompt);
  if(!reason || !reason.trim()) return;
  const token = await accToken();
  const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}/status`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ status, reason: reason.trim() })
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? t.done : (result.error?.message || T[LANG].loadFailed));
  renderAdmin();
}

// RLS skips a row the caller may not change instead of raising, so an update that
// matched nothing is a refusal, not a success. Returns the message to show, or null.
async function staffUpdate(table, patch, column, value){
  const { data, error } = await getMainSupabase().from(table).update(patch).eq(column, value).select(column);
  if(error) return error.message;
  return data?.length ? null : T[LANG].adm.notAllowed;
}

async function setUserRole(userId, role){
  const t = T[LANG].adm;
  const error = await staffUpdate('users', { role }, 'id', userId);
  if(typeof showToast === 'function') showToast(error || t.done);
  renderAdmin();
}

/* ============================================================
   PRACTITIONERS (moderator, admin, super_admin)
   Every practitioner past review. Suspend / reactivate is the same RLS update the
   applications queue uses; the 0005/0006 guard lets only reviewers change status and
   audits it, taking the reason from rejection_reason. A suspended practitioner leaves
   the directory and offers no slots.
============================================================ */

async function renderPractitionersTab(body){
  const t = T[LANG].adm;
  const st = T[LANG].jyotish.status;
  const { data, error } = await getMainSupabase()
    .from('astrologers')
    .select('id,name,status,reviewed_at')
    .in('status', ['active','suspended','inactive'])
    .order('name');
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  body.innerHTML = (data ?? []).map(p => `
    <div class="review-row" style="gap:12px;" data-practitioner="${escapeHtml(p.id)}">
      <span><b>${escapeHtml(p.name)}</b><br><small>${escapeHtml(st[p.status] || p.status)}</small></span>
      ${p.status === 'active'
        ? `<button class="btn btn-ghost" onclick="setPractitionerStatus('${escapeHtml(p.id)}','suspended')">${escapeHtml(t.suspend)}</button>`
        : `<button class="btn btn-gold" onclick="setPractitionerStatus('${escapeHtml(p.id)}','active')">${escapeHtml(t.reactivate)}</button>`}
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

async function setPractitionerStatus(id, status){
  const t = T[LANG].adm;
  const patch = { status, rejection_reason: null };
  if(status === 'suspended'){
    const reason = window.prompt(t.reasonPrompt);
    if(!reason || !reason.trim()) return;
    patch.rejection_reason = reason.trim();
  }
  const error = await staffUpdate('astrologers', patch, 'id', id);
  if(typeof showToast === 'function') showToast(error || t.done);
  renderAdmin();
}

/* ============================================================
   SERVICES and SETTINGS (admin, super_admin)
   Both are RLS updates. The database decides: services_* checks (0013) refuse an
   incomplete active service, guard_platform_setting() (0038) refuses a wrong type or
   range, and both are audited. Their messages are shown as they are. Bookings keep
   the price they were made at. Adding a service needs a consultation type, which is a
   migration's job, so this edits the existing ones.
============================================================ */

const SERVICE_STATUSES = ['draft','active','inactive','archived'];

async function renderServicesTab(body){
  const t = T[LANG].adm;
  const { data, error } = await getMainSupabase()
    .from('services')
    .select('id,name,slug,astrologer_id,consultation_mode,duration_minutes,price,currency,status')
    .order('astrologer_id', { nullsFirst:true }).order('name');
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  body.innerHTML = (data ?? []).map(s => `
    <div class="review-row" style="align-items:flex-end;gap:10px;flex-wrap:wrap;" data-service="${escapeHtml(s.id)}">
      <span style="flex:1;min-width:180px;"><b>${escapeHtml(s.name)}</b><br><small>${escapeHtml(s.slug || '—')} · ${escapeHtml(s.consultation_mode || '—')}${s.astrologer_id ? '' : ' · ' + escapeHtml(t.platformWide)}</small></span>
      <label class="field" style="width:110px;margin:0;"><small>${escapeHtml(t.price)} (${escapeHtml(s.currency)})</small><input type="number" min="0" step="1" class="svc-price" value="${escapeHtml(s.price)}"></label>
      <label class="field" style="width:100px;margin:0;"><small>${escapeHtml(t.duration)}</small><input type="number" min="5" max="480" step="5" class="svc-duration" value="${escapeHtml(s.duration_minutes ?? '')}"></label>
      <label class="field" style="width:120px;margin:0;"><small>${escapeHtml(t.status)}</small><select class="svc-status">${SERVICE_STATUSES.map(v => `<option value="${v}"${v === s.status ? ' selected' : ''}>${escapeHtml(t.svcSt[v])}</option>`).join('')}</select></label>
      <button class="btn btn-gold" onclick="saveService('${escapeHtml(s.id)}')">${escapeHtml(t.save)}</button>
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

async function saveService(id){
  const t = T[LANG].adm;
  const row = document.querySelector(`#adminPanelBody [data-service="${CSS.escape(id)}"]`);
  if(!row) return;
  const duration = row.querySelector('.svc-duration').value.trim();
  const error = await staffUpdate('services', {
    price: Number(row.querySelector('.svc-price').value),
    duration_minutes: duration === '' ? null : Number(duration),
    status: row.querySelector('.svc-status').value
  }, 'id', id);
  if(typeof showToast === 'function') showToast(error || t.done);
  if(!error) renderAdmin();
}

async function renderSettingsTab(body){
  const t = T[LANG].adm;
  const { data, error } = await getMainSupabase()
    .from('platform_settings')
    .select('key,value,description,updated_at')
    .order('key');
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  body.innerHTML = (data ?? []).map(s => `
    <div class="review-row" style="align-items:flex-end;gap:10px;flex-wrap:wrap;" data-setting="${escapeHtml(s.key)}" data-kind="${typeof s.value}">
      <span style="flex:1;min-width:220px;"><b>${escapeHtml(s.key)}</b><br><small>${escapeHtml(s.description || '')}</small></span>
      <input class="set-value" style="width:220px;" aria-label="${escapeHtml(s.key)}" value="${escapeHtml(typeof s.value === 'string' ? s.value : JSON.stringify(s.value))}">
      <button class="btn btn-gold" onclick="saveSetting('${escapeHtml(s.key)}')">${escapeHtml(t.save)}</button>
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

// A number setting is sent as a number when it reads as one, otherwise as the text
// typed -- the database refuses it with the rule it broke.
async function saveSetting(key){
  const t = T[LANG].adm;
  const row = document.querySelector(`#adminPanelBody [data-setting="${CSS.escape(key)}"]`);
  if(!row) return;
  const raw = row.querySelector('.set-value').value;
  const value = row.dataset.kind === 'number' && raw.trim() !== '' && !isNaN(Number(raw)) ? Number(raw) : raw;
  const error = await staffUpdate('platform_settings', { value }, 'key', key);
  if(typeof showToast === 'function') showToast(error || t.done);
  if(!error) renderAdmin();
}

/* ============================================================
   BOOKINGS (support, finance, admin, super_admin) -- read only
   From /api/admin/bookings: support has no RLS read on customers or payments, so the
   server joins them. Cancelling or moving a booking is not here; refunds cover money.
============================================================ */

const BOOKING_STATUSES = ['payment_pending','confirmed','in_progress','completed','cancelled','no_show','expired'];
let adminBookingFilter = { status:'', from:'', to:'' };

async function renderBookingsTab(body){
  const t = T[LANG].adm;
  const f = adminBookingFilter;
  body.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
      <label class="field" style="margin:0;"><small>${escapeHtml(t.status)}</small><select id="admBkStatus"><option value="">${escapeHtml(t.all)}</option>${BOOKING_STATUSES.map(s => `<option value="${s}"${s === f.status ? ' selected' : ''}>${escapeHtml(t.bst[s])}</option>`).join('')}</select></label>
      <label class="field" style="margin:0;"><small>${escapeHtml(t.from)}</small><input type="date" id="admBkFrom" value="${escapeHtml(f.from)}"></label>
      <label class="field" style="margin:0;"><small>${escapeHtml(t.to)}</small><input type="date" id="admBkTo" value="${escapeHtml(f.to)}"></label>
      <button class="btn btn-gold" onclick="filterBookings()">${escapeHtml(t.apply)}</button>
    </div>
    <div id="admBkList"></div>`;
  const list = document.getElementById('admBkList');
  const token = await accToken();
  let bookings = [];
  try{
    const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const response = await fetch(`/api/admin/bookings?${query}`, { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    bookings = result.bookings ?? [];
  } catch(err){
    list.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  const pst = T[LANG].pay.st;
  // Support / admin mark an ended booking's outcome, or correct a finished one.
  const canMark = ADMIN_SUPPORT.includes(accRole);
  const outcome = b => !canMark ? ''
    : ['completed','no_show'].includes(b.status) ? bookingOutcomeButtons(b.id, b.status)
    : bookingCanComplete(b.status, b.paymentStatus, b.endsAt) ? bookingOutcomeButtons(b.id) : '';
  list.innerHTML = bookings.map(b => `
    <div class="review-row" style="align-items:flex-start;gap:12px;" data-booking="${escapeHtml(b.id)}">
      <span><b>${escapeHtml(b.practitioner || '—')}</b> · ${escapeHtml(b.startsAt ? new Date(b.startsAt).toLocaleString() : '—')}<br>
        <small>${escapeHtml(b.customer?.name || '—')}${b.customer?.email ? ' · ' + escapeHtml(b.customer.email) : ''}</small><br>
        <small>${escapeHtml(b.mode || '')} · ${escapeHtml(b.currency || '')} ${escapeHtml(b.price ?? '')}</small></span>
      <span style="text-align:right;flex-shrink:0;"><b>${escapeHtml(t.bst[b.status] || b.status)}</b><br><small>${escapeHtml(t.payment)}: ${escapeHtml(b.paymentStatus ? (pst[b.paymentStatus] || b.paymentStatus) : '—')}</small><br>${outcome(b)}</span>
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

function filterBookings(){
  adminBookingFilter = {
    status: document.getElementById('admBkStatus')?.value || '',
    from: document.getElementById('admBkFrom')?.value || '',
    to: document.getElementById('admBkTo')?.value || ''
  };
  renderAdmin();
}

/* ============================================================
   REVIEWS (moderator, admin, super_admin)
   Staff read all reviews with the private feedback (0030). Hide / publish is the RLS
   update; 0039 lets only `status` change and audits it. Hidden reviews leave
   public_reviews and practitioner_ratings.
============================================================ */

async function renderReviewsTab(body){
  const t = T[LANG].adm;
  const { data, error } = await getMainSupabase()
    .from('reviews')
    .select('id,rating,private_feedback,status,created_at,practitioner:astrologers(name)')
    .order('created_at', { ascending:false })
    .limit(100);
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  body.innerHTML = (data ?? []).map(r => `
    <div class="review-row" style="align-items:flex-start;gap:12px;" data-review="${escapeHtml(r.id)}">
      <span><b>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</b> · ${escapeHtml(r.practitioner?.name || '—')} · <small>${escapeHtml(new Date(r.created_at).toLocaleDateString())}</small><br>
        <small>${escapeHtml(r.private_feedback || '')}</small><br>
        <small>${escapeHtml(t.rst[r.status] || r.status)}</small></span>
      ${r.status === 'published'
        ? `<button class="btn btn-ghost" onclick="setReviewStatus('${escapeHtml(r.id)}','hidden')">${escapeHtml(t.hide)}</button>`
        : `<button class="btn btn-gold" onclick="setReviewStatus('${escapeHtml(r.id)}','published')">${escapeHtml(t.publish)}</button>`}
    </div>`).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`;
}

async function setReviewStatus(id, status){
  const t = T[LANG].adm;
  const error = await staffUpdate('reviews', { status }, 'id', id);
  if(typeof showToast === 'function') showToast(error || t.done);
  renderAdmin();
}

/* ============================================================
   JYOTISH APPLICATIONS QUEUE (staff)
============================================================ */

async function renderJyotishApplicationsQueue(body){
  const t = T[LANG].jyotishAdmin;
  const { data, error } = await getMainSupabase()
    .from('astrologers')
    .select('id,name,qualification,experience_years,consultation_fee,applied_at')
    .eq('status', 'pending_review')
    .order('applied_at');

  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  if(!data || !data.length){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`; return; }

  body.innerHTML = data.map(row => `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span>
        <b>${escapeHtml(row.name)}</b><br>
        <small>${escapeHtml(row.qualification || '—')}</small><br>
        <small>${escapeHtml(t.experience)}: ${escapeHtml(row.experience_years ?? 0)} · ${escapeHtml(t.fee)}: ${escapeHtml(row.consultation_fee)} · ${escapeHtml(t.applied)}: ${escapeHtml(new Date(row.applied_at).toLocaleDateString())}</small>
      </span>
      <span style="display:flex;gap:8px;flex-shrink:0;">
        ${ADMIN_MODERATION.includes(accRole) ? `<button class="btn btn-gold" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','active')">${escapeHtml(t.approve)}</button>
        <button class="btn btn-ghost" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','rejected')">${escapeHtml(t.reject)}</button>` : ''}
      </span>
    </div>`).join('');
}

async function reviewJyotishApplication(id, status){
  const t = T[LANG].jyotishAdmin;
  const patch = { status };
  if(status === 'rejected'){
    // The database refuses a rejection with no reason, so ask rather than surface a
    // constraint violation.
    const reason = window.prompt(t.reasonPrompt);
    if(!reason || !reason.trim()) return;
    patch.rejection_reason = reason.trim();
  }

  const error = await staffUpdate('astrologers', patch, 'id', id);
  if(typeof showToast === 'function') showToast(error || t.done);
  accRefresh();
}

/* ============================================================
   PAYMENT VERIFICATION QUEUE (finance, admin, super_admin)
   Oldest consultation first. Proof opens in a new tab through a short-lived
   signed URL; approve/reject go through the server endpoints, which write the
   audit row in the same transaction. The browser never writes payments.
============================================================ */


// A booking shows its consultation time; a question, its number and text.
function payQueueWhat(row){
  if(row.booking) return new Date(row.booking.startsAt).toLocaleString();
  if(row.question) return `Q-${String(row.question.number).padStart(6,'0')} · ${row.question.text}`;
  return '';
}

async function renderPaymentsQueue(body){
  const t = T[LANG].payReview;
  const token = await accToken();
  if(!token){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(T[LANG].signInToContinue)}</p></div>`; return; }

  let queue;
  try{
    const response = await fetch('/api/payments/review-queue', { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  if(!queue.payments?.length){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`; return; }

  body.innerHTML = queue.payments.map(row => `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span>
        <b>${escapeHtml(row.customer?.name || '—')} → ${escapeHtml(row.astrologer?.name || '—')}</b><br>
        <small>${escapeHtml(row.service?.name || (row.question ? T[LANG].ctAsk : ''))} · ${escapeHtml(row.amount)} ${escapeHtml(row.currency)}</small><br>
        <small>${escapeHtml(payQueueWhat(row))}${row.customerReference ? ` · ${escapeHtml(row.customerReference)}` : ''}</small><br>
        <small><a href="${escapeHtml(row.proofUrl)}" target="_blank" rel="noopener">${escapeHtml(t.proof)}</a></small>
      </span>
      <span style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn btn-gold" onclick="reviewPayment('${escapeHtml(row.id)}','approve')">${escapeHtml(t.approve)}</button>
        <button class="btn btn-ghost" onclick="reviewPayment('${escapeHtml(row.id)}','reject')">${escapeHtml(t.reject)}</button>
      </span>
    </div>`).join('');
}

async function reviewPayment(id, action){
  const t = T[LANG].payReview;
  const token = await accToken();
  if(!token) return;
  let reason = null;
  if(action === 'reject'){
    reason = window.prompt(t.reasonPrompt);
    if(!reason || !reason.trim()) return;
    reason = reason.trim();
  }
  const response = await fetch(`/api/payments/${encodeURIComponent(id)}/${action}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(action === 'reject' ? { reason } : {})
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? t.done : (result.error?.message || t.done));
  accRefresh();
}

/* ============================================================
   PAYOUT QUEUE (finance, admin, super_admin)
============================================================ */

async function renderPayoutsQueue(body){
  const t = T[LANG].po;
  const token = await accToken();
  if(!token){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(T[LANG].signInToContinue)}</p></div>`; return; }

  let queue = { payouts: [] };
  try{
    const response = await fetch('/api/payouts/queue', { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }
  if(!queue.payouts?.length){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`; return; }

  body.innerHTML = queue.payouts.map(row => {
    const actions = [];
    if(row.status === 'pending') actions.push(['approve', t.approve], ['cancel', t.cancel]);
    if(row.status === 'approved') actions.push(['process', t.process], ['cancel', t.cancel]);
    if(row.status === 'processing') actions.push(['pay', t.pay], ['fail', t.fail], ['cancel', t.cancel]);
    if(row.status === 'failed') actions.push(['process', t.process], ['cancel', t.cancel]);
    return `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span>
        <b>${escapeHtml(row.currency)} ${escapeHtml(row.amount)} · ${escapeHtml(row.astrologer?.name || '—')}</b><br>
        <small>${escapeHtml(t.st[row.status] || row.status)}${row.payable != null ? ` · ${escapeHtml(t.balance)}: ${escapeHtml(row.payable)}` : ''}</small><br>
        <small>${escapeHtml(new Date(row.createdAt).toLocaleString())}</small>
      </span>
      <span style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">
        ${actions.map(([action, label]) => `<button class="btn ${action === 'approve' || action === 'pay' ? 'btn-gold' : 'btn-ghost'}" onclick="payoutAction('${escapeHtml(row.id)}','${action}')">${escapeHtml(label)}</button>`).join('')}
      </span>
    </div>`;
  }).join('');
}

async function payoutAction(id, action){
  const t = T[LANG].po;
  const token = await accToken();
  if(!token) return;
  let extra = {};
  if(action === 'pay'){
    const reference = window.prompt(t.reference);
    if(!reference || !reference.trim()) return;
    extra = { externalReference: reference.trim() };
  }
  if(action === 'fail' || action === 'cancel'){
    const note = window.prompt(t.note);
    if(!note || !note.trim()) return;
    extra = { note: note.trim() };
  }
  const response = await fetch(`/api/payouts/${encodeURIComponent(id)}/${action}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(extra)
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? t.done : (result.error?.message || t.done));
  accRefresh();
}

/* ============================================================
   AUDIT LOG (finance, admin, super_admin)
   The immutable trail, newest first. Reads ride the existing policy.
============================================================ */

async function renderAuditTab(body){
  const t = T[LANG].au;
  const { data, error } = await getMainSupabase().from('audit_log')
    .select('created_at,actor_role,action,entity_type,reason')
    .order('created_at', { ascending:false }).limit(50);
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  if(!data?.length){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`; return; }
  body.innerHTML = data.map(row => `
    <div class="review-row">
      <span><b>${escapeHtml(row.action)}</b><br><small>${escapeHtml(row.entity_type)} · ${escapeHtml(row.actor_role || '—')}${row.reason ? ` · ${escapeHtml(row.reason)}` : ''}</small></span>
      <small>${escapeHtml(new Date(row.created_at).toLocaleString())}</small>
    </div>`).join('');
}

/* ============================================================
   REFUND QUEUE (finance, admin, super_admin)
   Open refunds oldest first, with a small form to record a new one against a
   payment id. Completing asks for the eSewa reference of the transfer that
   already happened; the server writes the reversals with it.
============================================================ */

async function renderRefundsQueue(body){
  const t = T[LANG].rf;
  const token = await accToken();
  if(!token){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(T[LANG].signInToContinue)}</p></div>`; return; }

  let queue = { refunds: [] };
  try{
    const response = await fetch('/api/refunds/queue', { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = `<div class="empty-box"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }

  const rows = (queue.refunds ?? []).map(row => {
    const actions = [];
    if(row.status === 'requested') actions.push(['approve', t.approve], ['reject', t.reject]);
    if(row.status === 'approved') actions.push(['process', t.process], ['reject', t.reject]);
    if(row.status === 'processing') actions.push(['complete', t.complete]);
    return `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span>
        <b>${escapeHtml(row.currency)} ${escapeHtml(row.amount)} · ${escapeHtml(row.customer?.name || '—')}</b><br>
        <small>${escapeHtml(row.status)} · ${escapeHtml(row.reason || '')}</small><br>
        <small>${escapeHtml(payQueueWhat(row))}</small>
      </span>
      <span style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">
        ${actions.map(([action, label]) => `<button class="btn ${action === 'approve' || action === 'complete' ? 'btn-gold' : 'btn-ghost'}" onclick="refundAction('${escapeHtml(row.id)}','${action}')">${escapeHtml(label)}</button>`).join('')}
      </span>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div style="padding:14px;border:1px solid var(--gold);border-radius:10px;margin-bottom:14px;">
      <h4 style="margin:0 0 8px;">${escapeHtml(t.requestTitle)}</h4>
      <div class="field"><label>${escapeHtml(t.payment)}</label><input id="rfPayment" placeholder="payment uuid"></div>
      <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.amount)}</label><input id="rfAmount" type="number" min="1" step="0.01"></div>
      <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.reason)}</label><input id="rfReason" maxlength="1000"></div>
      <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="submitRefundRequest()">${escapeHtml(t.request)}</button>
      <div id="rfMsg"></div>
    </div>
    ${rows || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`}`;
}

async function submitRefundRequest(){
  const t = T[LANG].rf;
  const token = await accToken();
  const msg = document.getElementById('rfMsg');
  if(!token) return;
  const response = await fetch('/api/refunds', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({
      paymentId: document.getElementById('rfPayment')?.value.trim(),
      amount: Number(document.getElementById('rfAmount')?.value),
      reason: document.getElementById('rfReason')?.value.trim()
    })
  });
  const result = await response.json().catch(()=>({}));
  if(!response.ok && msg){
    msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(result.error?.message || t.done)}</div>`;
    return;
  }
  if(typeof showToast === 'function') showToast(t.done);
  accRefresh();
}

async function refundAction(id, action){
  const t = T[LANG].rf;
  const token = await accToken();
  if(!token) return;
  let extra = {};
  if(action === 'reject'){
    const note = window.prompt(t.reason);
    if(!note || !note.trim()) return;
    extra = { note: note.trim() };
  }
  if(action === 'complete'){
    const reference = window.prompt(t.reference);
    if(!reference || !reference.trim()) return;
    extra = { externalReference: reference.trim() };
  }
  const response = await fetch(`/api/refunds/${encodeURIComponent(id)}/${action}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(extra)
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? t.done : (result.error?.message || t.done));
  accRefresh();
}
