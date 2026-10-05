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

function setAdminTab(tab){ adminTab = tab; closeAdminSidebarOnMobile(); renderAdmin(); }
function toggleAdminSidebar(){
  document.querySelector('.admin-shell')?.classList.toggle('side-open');
}
function closeAdminSidebarOnMobile(){
  if(window.innerWidth < 1024) document.querySelector('.admin-shell')?.classList.remove('side-open');
}
// ponytail: one shared modal replaces every window.prompt so reasons are auditable + accessible.
let adminPromptResolve = null;
function openAdminPrompt({ title, body, label, placeholder = '', confirmLabel, requireValue = true }){
  closeAdminPrompt(null);
  const t = T[LANG];
  const overlay = document.createElement('div');
  overlay.className = 'adm-modal-overlay';
  overlay.id = 'admModalOverlay';
  overlay.innerHTML = `
    <div class="adm-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <h4>${escapeHtml(title)}</h4>
      ${body ? `<p>${escapeHtml(body)}</p>` : ''}
      <label style="font-size:.8rem;font-weight:600;color:var(--navy);">${escapeHtml(label)}
        <textarea id="admModalInput" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
      </label>
      <div class="adm-modal-row">
        <button class="btn btn-ghost" id="admModalCancel">${escapeHtml(t.cancel || 'Cancel')}</button>
        <button class="btn btn-gold" id="admModalOk">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeAdminPrompt(null); });
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#admModalInput');
  input.focus();
  overlay.querySelector('#admModalCancel').onclick = () => closeAdminPrompt(null);
  overlay.querySelector('#admModalOk').onclick = () => {
    const v = input.value.trim();
    if(requireValue && !v){ input.focus(); input.style.borderColor = 'var(--error)'; return; }
    closeAdminPrompt(v);
  };
  input.onkeydown = (e) => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) overlay.querySelector('#admModalOk').click(); };
  return new Promise((resolve) => { adminPromptResolve = resolve; });
}
function closeAdminPrompt(value){
  document.getElementById('admModalOverlay')?.remove();
  if(adminPromptResolve){ const r = adminPromptResolve; adminPromptResolve = null; r(value); }
}
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && document.getElementById('admModalOverlay')) closeAdminPrompt(null); });
// ponytail: shared states — skeleton while loading, guided empty, actionable error.
function admSkeleton(n = 5){ return `<div class="adm-skel" aria-busy="true" aria-label="Loading">${'<span></span>'.repeat(n)}</div>`; }
function admEmpty(title, hint, action = ''){
  const t = T[LANG];
  return `<div class="adm-empty"><h4>${escapeHtml(title || t.adm.none)}</h4>${hint ? `<p>${escapeHtml(hint)}</p>` : ''}${action}</div>`;
}
function admError(message, retryFn){
  return `<div class="adm-errorbox"><b>Something went wrong.</b> ${escapeHtml(message)}<br><br><button class="btn btn-ghost" onclick="${retryFn}()">${escapeHtml(T[LANG].loadFailed || 'Try again')}</button></div>`;
}
function admBadge(status, label){
  return `<span class="badge" data-s="${escapeHtml(String(status || '').toLowerCase())}">${escapeHtml(label || status || '—')}</span>`;
}
function admPageHead(title, desc, extra = ''){
  return `<div class="adm-page-head"><div><h3>${escapeHtml(title)}</h3>${desc ? `<p>${escapeHtml(desc)}</p>` : ''}</div>${extra}</div>`;
}
// ponytail: one page size for every queue; Show more bumps it and re-renders.
const ADM_PAGE = 25;
let admBkLimit = ADM_PAGE, admCustLimit = ADM_PAGE;
let admPayLimit = ADM_PAGE, admPoLimit = ADM_PAGE, admRfLimit = ADM_PAGE;
let admKnLimit = ADM_PAGE, admAuLimit = ADM_PAGE, admRvLimit = ADM_PAGE;
function admShowMore(shown, hasMore, fn){
  if(!hasMore) return '';
  return `<div style="text-align:center;margin-top:12px;"><button class="btn btn-ghost" onclick="${fn}()">Show more (${escapeHtml(shown)} shown)</button></div>`;
}
function moreBk(){ admBkLimit += ADM_PAGE; renderAdmin(); }
function moreCust(){ admCustLimit += ADM_PAGE; renderAdmin(); }
function morePay(){ admPayLimit += ADM_PAGE; renderAdmin(); }
function morePo(){ admPoLimit += ADM_PAGE; renderAdmin(); }
function moreRf(){ admRfLimit += ADM_PAGE; renderAdmin(); }
function moreKn(){ admKnLimit += ADM_PAGE; renderAdmin(); }
function moreAu(){ admAuLimit += ADM_PAGE; renderAdmin(); }
function moreRv(){ admRvLimit += ADM_PAGE; renderAdmin(); }
function admTabMeta(){
  const t = T[LANG];
  return {
    overview: [t.adm.overview, 'What is waiting right now.'],
    applications: [t.jyotishAdmin?.title || 'Applications', 'Pending practitioner verifications.'],
    customers: [t.adm.customers, 'Search, block / unblock with audit reason.'],
    bookings: [t.adm.bookings, 'Filter by status and date. Read-only + outcome.'],
    practitioners: [t.adm.practitioners, 'Suspend / reactivate. Audited.'],
    reviews: [t.adm.reviews, 'Hide / publish.'],
    payments: [t.payReview?.title || 'Payments', 'Oldest proof first.'],
    refunds: [t.rf?.title || 'Refunds', 'Oldest open first.'],
    payouts: [t.po?.title || 'Payouts', 'Approve → process → pay.'],
    knowledge: [t.kn?.queue || 'Knowledge', 'Publish / reject drafts.'],
    services: [t.adm.services, 'Price, minutes, status. Audited.'],
    settings: [t.adm.settings, 'Typed platform settings. Audited.'],
    audit: [t.au?.title || 'Audit', 'Newest first. Immutable.'],
  };
}

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
  setText('adminBread', `${t.nav?.home || 'Home'} / ${t.adm.title}`);
  setText('adminSub', 'Calm enterprise control center. Same permissions, same APIs — clearer presentation.');
  if(!root) return;
  if(!getMainSupabase() || !mainAuthUser){
    root.innerHTML = admEmpty(t.signInToContinue, '', `<button class="btn btn-gold" onclick="goView('account')">${escapeHtml(t.authLoginTab)}</button>`);
    return;
  }
  const load = ++adminLoad;
  await loadAccountContext();
  if(load !== adminLoad) return; // a newer render (language, tab, sign-in) won
  if(!accIsStaff()){ root.innerHTML = admEmpty(t.adm.notStaff, 'This area is limited to moderator / support / finance / admin / super_admin. Backend routes enforce the same.'); return; }

  const tabs = adminTabs();
  if(!tabs.some(tab => tab[0] === adminTab)) adminTab = 'overview';
  const labelOf = (id) => tabs.find(x => x[0] === id)?.[1] || id;
  const groups = [
    ['Overview', ['overview']],
    ['Queues', ['applications', 'payments', 'refunds', 'payouts', 'knowledge']],
    ['Operations', ['bookings', 'customers', 'practitioners', 'reviews']],
    ['System', ['services', 'settings', 'audit']],
  ];
  const meta = admTabMeta();
  const [pageTitle, pageDesc] = meta[adminTab] || [labelOf(adminTab), ''];
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-side" aria-label="Admin navigation">
        <div class="adm-brand">${escapeHtml(t.adm.title)}<small>${escapeHtml(accRole || '')}</small></div>
        ${groups.map(([g, ids]) => {
          const visible = ids.filter(id => tabs.some(x => x[0] === id));
          if(!visible.length) return '';
          return `<div class="adm-group">${escapeHtml(g)}</div>` + visible.map(id =>
            `<button class="adm-nav-btn${id === adminTab ? ' active' : ''}" ${id === adminTab ? 'aria-current="page"' : ''} onclick="setAdminTab('${id}')">${escapeHtml(labelOf(id))}</button>`
          ).join('');
        }).join('')}
      </aside>
      <div class="adm-scrim" onclick="closeAdminSidebarOnMobile()" aria-hidden="true"></div>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="adm-link-btn adm-collapse-btn" onclick="toggleAdminSidebar()" aria-label="Menu">☰</button>
          <strong class="adm-title">${escapeHtml(pageTitle)}</strong>
          <span class="adm-role">${escapeHtml(accRole || '')}</span>
          <span class="adm-top-actions">
            <button class="adm-link-btn" onclick="goView('account')">← ${escapeHtml(t.nav?.account || 'My Account')}</button>
          </span>
        </div>
        <div class="adm-content">
          ${pageDesc ? `<p class="adm-desc">${escapeHtml(pageDesc)}</p>` : ''}
          <div id="adminPanelBody" aria-live="polite">${admSkeleton()}</div>
        </div>
      </div>
    </div>`;

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
    body.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  const cards = [
    ['applications', 'applications'], ['proofs', 'payments'], ['refunds', 'refunds'], ['payouts', 'payouts'],
    ['knowledge', 'knowledge'], ['bookingsToday', null], ['questionsWaiting', null]
  ].filter(([key]) => key in result.counts);
  if(!cards.length){ body.innerHTML = admEmpty(t.none, 'No queues are visible to this role.'); return; }
  body.innerHTML = `<div class="adm-kpis">${cards.map(([key, tab]) => {
    const inner = `<b>${escapeHtml(result.counts[key])}</b><small>${escapeHtml(t.counts[key])}</small>`;
    return tab
      ? `<button class="adm-kpi" onclick="setAdminTab('${tab}')" aria-label="${escapeHtml(t.counts[key])}">${inner}</button>`
      : `<div class="adm-kpi">${inner}</div>`;
  }).join('')}</div>
  <p style="font-size:.76rem;color:var(--ink-soft);margin:12px 2px 0;">Counts only — each opens its queue. Same permission lists as the queue endpoints.</p>`;
}

// Items waiting for moderation; deciding goes through /api/knowledge/:id/moderate.
async function renderKnowledgeQueue(body){
  const t = T[LANG].kn;
  const token = await accToken();
  let queue = [], knHasMore = false;
  try{
    const response = await fetch(`/api/knowledge/queue?limit=${admKnLimit}`, { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    queue = result.items ?? [];
    knHasMore = !!result.hasMore;
  } catch(err){
    body.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  if(!queue.length){ body.innerHTML = admEmpty(t.none, 'New drafts submitted by authors will appear here.'); return; }
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Title</th><th>Meta</th><th>Excerpt</th><th style="text-align:right;">Actions</th></tr></thead><tbody>` +
    queue.map(k => `<tr>
      <td><b>${escapeHtml(k.title)}</b><br><small>${escapeHtml(k.author?.email || '')}</small></td>
      <td class="adm-num">${escapeHtml(k.contentType)} · ${escapeHtml(k.language)}</td>
      <td><small>${escapeHtml((k.body || '').slice(0, 220))}</small></td>
      <td><span class="adm-actions">${knowledgeButton(k.id, 'published', T[LANG].kn.publish, true)}${knowledgeButton(k.id, 'rejected', T[LANG].kn.reject, false)}</span></td>
    </tr>`).join('') + `</tbody></table></div>` + admShowMore(queue.length, knHasMore, 'moreKn');
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
    <div class="adm-filterbar" role="search">
      <div class="field" style="flex:1;min-width:220px;"><label for="admCustQ">${escapeHtml(t.search)}</label>
      <input id="admCustQ" placeholder="${escapeHtml(t.search)}" value="${escapeHtml(adminCustomerQuery)}" onkeydown="if(event.key==='Enter') searchCustomers()"></div>
      <button class="btn btn-gold" onclick="searchCustomers()">${escapeHtml(t.searchBtn)}</button>
      ${adminCustomerQuery ? `<button class="btn btn-ghost" onclick="clearCustomerSearch()">✕</button>` : ''}
    </div>
    <div id="admCustList">${admSkeleton(4)}</div>`;
  const list = document.getElementById('admCustList');
  const token = await accToken();
  let customers = [], custHasMore = false;
  try{
    const response = await fetch(`/api/admin/customers?q=${encodeURIComponent(adminCustomerQuery)}&limit=${admCustLimit}`, { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    customers = result.customers ?? [];
    custHasMore = !!result.hasMore;
  } catch(err){
    list.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  if(!customers.length){
    list.innerHTML = admEmpty(t.none, adminCustomerQuery ? 'No customers match these filters.' : 'No customers yet.',
      adminCustomerQuery ? `<button class="btn btn-ghost" onclick="clearCustomerSearch()">Clear search</button>` : '');
    return;
  }
  const canRole = ['admin','super_admin'].includes(accRole);
  list.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Customer</th><th>Contact</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>` +
    customers.map(c => {
      const self = c.userId === mainAuthUser?.id;
      const blockable = !self && ['customer','jyotish'].includes(c.role);
      return `<tr data-customer="${escapeHtml(c.id)}">
        <td><b>${escapeHtml(c.fullName)}</b>${self ? ` <small>(${escapeHtml(t.you)})</small>` : ''}<br><small>${escapeHtml(c.role || '—')}</small></td>
        <td><small>${escapeHtml(c.email || '—')}${c.phone ? '<br>' + escapeHtml(c.phone) : ''}</small></td>
        <td>${admBadge(c.status, t.cst[c.status] || c.status)}</td>
        <td><span class="adm-actions">
          ${blockable ? (c.status === 'blocked'
            ? `<button class="btn btn-gold" onclick="setCustomerStatus('${escapeHtml(c.id)}','active')">${escapeHtml(t.unblock)}</button>`
            : `<button class="btn btn-ghost" onclick="setCustomerStatus('${escapeHtml(c.id)}','blocked')">${escapeHtml(t.block)}</button>`) : ''}
          ${canRole && !self && c.role ? `<select class="adm-role" aria-label="${escapeHtml(t.role)}" style="min-height:0;padding:6px 8px;font-size:.76rem;">${ADMIN_ROLES.map(r => `<option value="${r}"${r === c.role ? ' selected' : ''}>${r}</option>`).join('')}</select>
            <button class="btn btn-ghost" onclick="setUserRole('${escapeHtml(c.userId)}', this.previousElementSibling.value)">${escapeHtml(t.saveRole)}</button>` : ''}
        </span></td>
      </tr>`;
    }).join('') + `</tbody></table></div>` + admShowMore(customers.length, custHasMore, 'moreCust');
}

function searchCustomers(){
  adminCustomerQuery = document.getElementById('admCustQ')?.value.trim() || '';
  admCustLimit = ADM_PAGE;
  renderAdmin();
}
function clearCustomerSearch(){ adminCustomerQuery = ''; admCustLimit = ADM_PAGE; renderAdmin(); }

async function setCustomerStatus(id, status){
  const t = T[LANG].adm;
  const reason = await openAdminPrompt({
    title: status === 'blocked' ? t.block : t.unblock,
    body: status === 'blocked' ? 'Blocking signs the customer out of privileged actions and is written to the audit log with your id.' : 'Re-activating restores access. Audited.',
    label: t.reasonPrompt, placeholder: 'e.g. spam / chargeback / verified appeal', confirmLabel: status === 'blocked' ? t.block : t.unblock,
  });
  if(!reason) return;
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
  body.innerHTML = admSkeleton(4);
  const { data, error } = await getMainSupabase()
    .from('astrologers')
    .select('id,name,status,reviewed_at')
    .in('status', ['active','suspended','inactive'])
    .order('name');
  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!(data ?? []).length){ body.innerHTML = admEmpty(t.none, 'No practitioners past review yet.'); return; }
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Practitioner</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>` +
    (data ?? []).map(p => `<tr data-practitioner="${escapeHtml(p.id)}">
      <td><b>${escapeHtml(p.name)}</b></td>
      <td>${admBadge(p.status, st[p.status] || p.status)}</td>
      <td><span class="adm-actions">${p.status === 'active'
        ? `<button class="btn btn-ghost" onclick="setPractitionerStatus('${escapeHtml(p.id)}','suspended')">${escapeHtml(t.suspend)}</button>`
        : `<button class="btn btn-gold" onclick="setPractitionerStatus('${escapeHtml(p.id)}','active')">${escapeHtml(t.reactivate)}</button>`}</span></td>
    </tr>`).join('') + `</tbody></table></div>`;
}

async function setPractitionerStatus(id, status){
  const t = T[LANG].adm;
  const patch = { status, rejection_reason: null };
  if(status === 'suspended'){
    const reason = await openAdminPrompt({ title: t.suspend, body: 'Suspended practitioners leave the directory and offer no slots. Existing bookings stay. Audited.', label: t.reasonPrompt, placeholder: 'Reason shown in audit log', confirmLabel: t.suspend });
    if(!reason) return;
    patch.rejection_reason = reason;
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
  body.innerHTML = admSkeleton(4);
  const { data, error } = await getMainSupabase()
    .from('services')
    .select('id,name,slug,astrologer_id,consultation_mode,duration_minutes,price,currency,status')
    .order('astrologer_id', { nullsFirst:true }).order('name');
  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!(data ?? []).length){ body.innerHTML = admEmpty(t.none, 'Services are added by migration with a consultation type.'); return; }
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Service</th><th>Price</th><th>Minutes</th><th>Status</th><th style="text-align:right;">Save</th></tr></thead><tbody>` +
    (data ?? []).map(s => `<tr data-service="${escapeHtml(s.id)}">
      <td><b>${escapeHtml(s.name)}</b><br><small>${escapeHtml(s.slug || '—')} · ${escapeHtml(s.consultation_mode || '—')}${s.astrologer_id ? '' : ' · ' + escapeHtml(t.platformWide)}</small></td>
      <td><input type="number" min="0" step="1" class="svc-price" style="width:100px;min-height:0;" value="${escapeHtml(s.price)}" aria-label="${escapeHtml(t.price)}"></td>
      <td><input type="number" min="5" max="480" step="5" class="svc-duration" style="width:80px;min-height:0;" value="${escapeHtml(s.duration_minutes ?? '')}" aria-label="${escapeHtml(t.duration)}"></td>
      <td><select class="svc-status" style="min-height:0;font-size:.78rem;">${SERVICE_STATUSES.map(v => `<option value="${v}"${v === s.status ? ' selected' : ''}>${escapeHtml(t.svcSt[v])}</option>`).join('')}</select><br>${admBadge(s.status, t.svcSt[s.status] || s.status)}</td>
      <td><span class="adm-actions"><button class="btn btn-gold" onclick="saveService('${escapeHtml(s.id)}')">${escapeHtml(t.save)}</button></span></td>
    </tr>`).join('') + `</tbody></table></div>
    <p style="font-size:.76rem;color:var(--ink-soft);">Bookings keep the price they were made at. An active service must be complete (DB constraint).</p>`;
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
  body.innerHTML = admSkeleton(4);
  const { data, error } = await getMainSupabase()
    .from('platform_settings')
    .select('key,value,description,updated_at')
    .order('key');
  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!(data ?? []).length){ body.innerHTML = admEmpty(t.none, ''); return; }
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Key</th><th>Value</th><th style="text-align:right;">Save</th></tr></thead><tbody>` +
    (data ?? []).map(s => `<tr data-setting="${escapeHtml(s.key)}" data-kind="${typeof s.value}">
      <td><b>${escapeHtml(s.key)}</b><br><small>${escapeHtml(s.description || '')}</small></td>
      <td><input class="set-value" style="width:200px;min-height:0;" aria-label="${escapeHtml(s.key)}" value="${escapeHtml(typeof s.value === 'string' ? s.value : JSON.stringify(s.value))}"></td>
      <td><span class="adm-actions"><button class="btn btn-gold" onclick="saveSetting('${escapeHtml(s.key)}')">${escapeHtml(t.save)}</button></span></td>
    </tr>`).join('') + `</tbody></table></div>`;
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
  const activeChips = Object.entries(f).filter(([, v]) => v).map(([k, v]) =>
    `<button class="badge" style="cursor:pointer;border:1px solid var(--line);" onclick="clearBookingFilter('${k}')" title="Remove">${escapeHtml(k)}: ${escapeHtml(k === 'status' ? (t.bst[v] || v) : v)} ✕</button>`).join('');
  body.innerHTML = `
    <div class="adm-filterbar">
      <div class="field"><label for="admBkStatus">${escapeHtml(t.status)}</label><select id="admBkStatus"><option value="">${escapeHtml(t.all)}</option>${BOOKING_STATUSES.map(s => `<option value="${s}"${s === f.status ? ' selected' : ''}>${escapeHtml(t.bst[s])}</option>`).join('')}</select></div>
      <div class="field"><label for="admBkFrom">${escapeHtml(t.from)}</label><input type="date" id="admBkFrom" value="${escapeHtml(f.from)}"></div>
      <div class="field"><label for="admBkTo">${escapeHtml(t.to)}</label><input type="date" id="admBkTo" value="${escapeHtml(f.to)}"></div>
      <button class="btn btn-gold" onclick="filterBookings()">${escapeHtml(t.apply)}</button>
      ${(f.status || f.from || f.to) ? `<button class="btn btn-ghost" onclick="resetBookingFilter()">Reset</button>` : ''}
    </div>
    ${activeChips ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${activeChips}</div>` : ''}
    <div id="admBkList">${admSkeleton(5)}</div>`;
  const list = document.getElementById('admBkList');
  const token = await accToken();
  let bookings = [], bkHasMore = false;
  try{
    const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), limit: admBkLimit });
    const response = await fetch(`/api/admin/bookings?${query}`, { headers:{ Authorization:`Bearer ${token}` } });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error?.message || T[LANG].loadFailed);
    bookings = result.bookings ?? [];
    bkHasMore = !!result.hasMore;
  } catch(err){
    list.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  if(!bookings.length){
    list.innerHTML = admEmpty(t.none, 'No bookings match the current filters.',
      (f.status || f.from || f.to) ? `<button class="btn btn-ghost" onclick="resetBookingFilter()">Reset filters</button>` : '');
    return;
  }
  const pst = T[LANG].pay.st;
  const canMark = ADMIN_SUPPORT.includes(accRole);
  const outcome = b => !canMark ? ''
    : ['completed','no_show'].includes(b.status) ? bookingOutcomeButtons(b.id, b.status)
    : bookingCanComplete(b.status, b.paymentStatus, b.endsAt) ? bookingOutcomeButtons(b.id) : '';
  list.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Booking</th><th>Customer</th><th>Price</th><th>Status</th><th style="text-align:right;">Outcome</th></tr></thead><tbody>` +
    bookings.map(b => `<tr data-booking="${escapeHtml(b.id)}">
      <td><b>${escapeHtml(b.practitioner || '—')}</b><br><small class="adm-num">${escapeHtml(b.startsAt ? new Date(b.startsAt).toLocaleString() : '—')}</small><br><small>${escapeHtml(b.mode || '')}</small></td>
      <td><small>${escapeHtml(b.customer?.name || '—')}${b.customer?.email ? '<br>' + escapeHtml(b.customer.email) : ''}</small></td>
      <td class="adm-num">${escapeHtml(b.currency || '')} ${escapeHtml(b.price ?? '')}<br><small>${escapeHtml(b.paymentStatus ? (pst[b.paymentStatus] || b.paymentStatus) : '—')}</small></td>
      <td>${admBadge(b.status, t.bst[b.status] || b.status)}</td>
      <td><span class="adm-actions">${outcome(b) || '—'}</span></td>
    </tr>`).join('') + `</tbody></table></div>` + admShowMore(bookings.length, bkHasMore, 'moreBk');
}

function filterBookings(){
  adminBookingFilter = {
    status: document.getElementById('admBkStatus')?.value || '',
    from: document.getElementById('admBkFrom')?.value || '',
    to: document.getElementById('admBkTo')?.value || ''
  };
  admBkLimit = ADM_PAGE;
  renderAdmin();
}
function resetBookingFilter(){ adminBookingFilter = { status:'', from:'', to:'' }; admBkLimit = ADM_PAGE; renderAdmin(); }
function clearBookingFilter(k){ adminBookingFilter[k] = ''; admBkLimit = ADM_PAGE; renderAdmin(); }

/* ============================================================
   REVIEWS (moderator, admin, super_admin)
   Staff read all reviews with the private feedback (0030). Hide / publish is the RLS
   update; 0039 lets only `status` change and audits it. Hidden reviews leave
   public_reviews and practitioner_ratings.
============================================================ */

async function renderReviewsTab(body){
  const t = T[LANG].adm;
  body.innerHTML = admSkeleton(4);
  const { data, error } = await getMainSupabase()
    .from('reviews')
    .select('id,rating,private_feedback,status,created_at,practitioner:astrologers(name)')
    .order('created_at', { ascending:false })
    .range(0, admRvLimit); // one extra probes more
  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!(data ?? []).length){ body.innerHTML = admEmpty(t.none, 'Completed bookings have no reviews yet.'); return; }
  const hasMore = data.length > admRvLimit;
  const page = data.slice(0, admRvLimit);
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Rating</th><th>Feedback</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>` +
    page.map(r => `<tr data-review="${escapeHtml(r.id)}">
      <td><b style="color:var(--gold);letter-spacing:2px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</b><br><small>${escapeHtml(r.practitioner?.name || '—')} · ${escapeHtml(new Date(r.created_at).toLocaleDateString())}</small></td>
      <td><small>${escapeHtml(r.private_feedback || '—')}</small></td>
      <td>${admBadge(r.status, t.rst[r.status] || r.status)}</td>
      <td><span class="adm-actions">${r.status === 'published'
        ? `<button class="btn btn-ghost" onclick="setReviewStatus('${escapeHtml(r.id)}','hidden')">${escapeHtml(t.hide)}</button>`
        : `<button class="btn btn-gold" onclick="setReviewStatus('${escapeHtml(r.id)}','published')">${escapeHtml(t.publish)}</button>`}</span></td>
    </tr>`).join('') + `</tbody></table></div>` + admShowMore(page.length, hasMore, 'moreRv');
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
  body.innerHTML = admSkeleton(4);
  const { data, error } = await getMainSupabase()
    .from('astrologers')
    .select('id,name,qualification,experience_years,consultation_fee,applied_at')
    .eq('status', 'pending_review')
    .order('applied_at');

  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!data || !data.length){ body.innerHTML = admEmpty(t.none, 'New practitioner applications will appear here, oldest first.'); return; }

  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Applicant</th><th>Details</th><th style="text-align:right;">Decision</th></tr></thead><tbody>` +
    data.map(row => `<tr>
      <td><b>${escapeHtml(row.name)}</b><br><small>${escapeHtml(row.qualification || '—')}</small><br><small class="adm-num">${escapeHtml(new Date(row.applied_at).toLocaleDateString())}</small></td>
      <td><small>${escapeHtml(t.experience)}: ${escapeHtml(row.experience_years ?? 0)} · ${escapeHtml(t.fee)}: ${escapeHtml(row.consultation_fee)}</small></td>
      <td><span class="adm-actions">
        ${ADMIN_MODERATION.includes(accRole) ? `<button class="btn btn-gold" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','active')">${escapeHtml(t.approve)}</button>
        <button class="btn btn-ghost" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','rejected')">${escapeHtml(t.reject)}</button>` : admBadge('pending_review', 'Read-only')}
      </span></td>
    </tr>`).join('') + `</tbody></table></div>`;
}

async function reviewJyotishApplication(id, status){
  const t = T[LANG].jyotishAdmin;
  const patch = { status };
  if(status === 'rejected'){
    // The database refuses a rejection with no reason, so ask rather than surface a
    // constraint violation.
    const reason = await openAdminPrompt({ title: t.reject, body: 'Rejection requires a reason (DB constraint). Shown to the applicant record and audit log.', label: t.reasonPrompt, placeholder: 'Reason', confirmLabel: t.reject });
    if(!reason) return;
    patch.rejection_reason = reason;
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
  if(!token){ body.innerHTML = admEmpty(T[LANG].signInToContinue, ''); return; }

  let queue;
  try{
    const response = await fetch(`/api/payments/review-queue?limit=${admPayLimit}`, { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  if(!queue.payments?.length){ body.innerHTML = admEmpty(t.none, 'Oldest proof first. New eSewa proofs will appear here.'); return; }

  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Customer → Practitioner</th><th>Amount</th><th>Context / Proof</th><th style="text-align:right;">Decision</th></tr></thead><tbody>` +
    queue.payments.map(row => `<tr>
      <td><b>${escapeHtml(row.customer?.name || '—')}</b> → ${escapeHtml(row.astrologer?.name || '—')}<br><small>${escapeHtml(row.service?.name || (row.question ? T[LANG].ctAsk : ''))}</small></td>
      <td class="adm-num"><b>${escapeHtml(row.amount)} ${escapeHtml(row.currency)}</b>${row.customerReference ? `<br><small>Ref: ${escapeHtml(row.customerReference)}</small>` : ''}</td>
      <td><small>${escapeHtml(payQueueWhat(row))}</small><br><a href="${escapeHtml(row.proofUrl)}" target="_blank" rel="noopener">${escapeHtml(t.proof)} ↗</a></td>
      <td><span class="adm-actions">
        <button class="btn btn-gold" onclick="reviewPayment('${escapeHtml(row.id)}','approve')">${escapeHtml(t.approve)}</button>
        <button class="btn btn-ghost" onclick="reviewPayment('${escapeHtml(row.id)}','reject')">${escapeHtml(t.reject)}</button>
      </span></td>
    </tr>`).join('') + `</tbody></table></div>` + admShowMore(queue.payments.length, queue.hasMore, 'morePay');
}

async function reviewPayment(id, action){
  const t = T[LANG].payReview;
  const token = await accToken();
  if(!token) return;
  let reason = null;
  if(action === 'reject'){
    reason = await openAdminPrompt({ title: t.reject, body: 'Rejecting releases the hold. The reason is audited and shown to staff.', label: t.reasonPrompt, placeholder: 'Reason', confirmLabel: t.reject });
    if(!reason) return;
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
  if(!token){ body.innerHTML = admEmpty(T[LANG].signInToContinue, ''); return; }

  let queue = { payouts: [] };
  try{
    const response = await fetch(`/api/payouts/queue?limit=${admPoLimit}`, { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }
  if(!queue.payouts?.length){ body.innerHTML = admEmpty(t.none, 'Practitioner payout requests will appear here.'); return; }

  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Payout</th><th>Status</th><th>Requested</th><th style="text-align:right;">Actions</th></tr></thead><tbody>` +
    queue.payouts.map(row => {
      const actions = [];
      if(row.status === 'pending') actions.push(['approve', t.approve], ['cancel', t.cancel]);
      if(row.status === 'approved') actions.push(['process', t.process], ['cancel', t.cancel]);
      if(row.status === 'processing') actions.push(['pay', t.pay], ['fail', t.fail], ['cancel', t.cancel]);
      if(row.status === 'failed') actions.push(['process', t.process], ['cancel', t.cancel]);
      return `<tr>
        <td><b class="adm-num">${escapeHtml(row.currency)} ${escapeHtml(row.amount)}</b> · ${escapeHtml(row.astrologer?.name || '—')}<br><small>${escapeHtml(t.balance)}: ${escapeHtml(row.payable ?? '—')}</small></td>
        <td>${admBadge(row.status, t.st[row.status] || row.status)}</td>
        <td><small class="adm-num">${escapeHtml(new Date(row.createdAt).toLocaleString())}</small></td>
        <td><span class="adm-actions">
          ${actions.map(([action, label]) => `<button class="btn ${action === 'approve' || action === 'pay' ? 'btn-gold' : 'btn-ghost'}" onclick="payoutAction('${escapeHtml(row.id)}','${action}')">${escapeHtml(label)}</button>`).join('')}
        </span></td>
      </tr>`;
    }).join('') + `</tbody></table></div>` + admShowMore(queue.payouts.length, queue.hasMore, 'morePo');
}

async function payoutAction(id, action){
  const t = T[LANG].po;
  const token = await accToken();
  if(!token) return;
  let extra = {};
  if(action === 'pay'){
    const reference = await openAdminPrompt({ title: t.pay, body: 'Enter the eSewa transfer reference that already happened. Written to the ledger with this payout.', label: t.reference, placeholder: 'eSewa reference', confirmLabel: t.pay });
    if(!reference) return;
    extra = { externalReference: reference };
  }
  if(action === 'fail' || action === 'cancel'){
    const note = await openAdminPrompt({ title: action === 'fail' ? t.fail : t.cancel, body: 'A note is required for the audit trail.', label: t.note, placeholder: 'Note', confirmLabel: action === 'fail' ? t.fail : t.cancel });
    if(!note) return;
    extra = { note };
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
  body.innerHTML = admSkeleton(5);
  const { data, error } = await getMainSupabase().from('audit_log')
    .select('created_at,actor_role,action,entity_type,reason')
    .order('created_at', { ascending:false }).range(0, admAuLimit); // one extra probes more
  if(error){ body.innerHTML = admError(error.message, 'renderAdmin'); return; }
  if(!data?.length){ body.innerHTML = admEmpty(t.none, 'Staff actions with a reason will appear here, newest first.'); return; }
  const hasMore = data.length > admAuLimit;
  const page = data.slice(0, admAuLimit);
  body.innerHTML = `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Action</th><th>Resource</th><th>Reason</th><th>When</th></tr></thead><tbody>` +
    page.map(row => `<tr>
      <td><b>${escapeHtml(row.action)}</b><br><small>${escapeHtml(row.actor_role || '—')}</small></td>
      <td><small>${escapeHtml(row.entity_type)}</small></td>
      <td><small>${escapeHtml(row.reason || '—')}</small></td>
      <td><small class="adm-num">${escapeHtml(new Date(row.created_at).toLocaleString())}</small></td>
    </tr>`).join('') + `</tbody></table></div>` + admShowMore(page.length, hasMore, 'moreAu');
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
  if(!token){ body.innerHTML = admEmpty(T[LANG].signInToContinue, ''); return; }

  let queue = { refunds: [] };
  try{
    const response = await fetch(`/api/refunds/queue?limit=${admRfLimit}`, { headers:{ Authorization:`Bearer ${token}` } });
    queue = await response.json();
    if(!response.ok) throw new Error(queue.error?.message || t.none);
  } catch(err){
    body.innerHTML = admError(err.message, 'renderAdmin');
    return;
  }

  const rows = (queue.refunds ?? []).map(row => {
    const actions = [];
    if(row.status === 'requested') actions.push(['approve', t.approve], ['reject', t.reject]);
    if(row.status === 'approved') actions.push(['process', t.process], ['reject', t.reject]);
    if(row.status === 'processing') actions.push(['complete', t.complete]);
    return `<tr>
      <td><b class="adm-num">${escapeHtml(row.currency)} ${escapeHtml(row.amount)}</b> · ${escapeHtml(row.customer?.name || '—')}<br><small>${escapeHtml(payQueueWhat(row))}</small></td>
      <td>${admBadge(row.status, row.status)}<br><small>${escapeHtml(row.reason || '')}</small></td>
      <td><span class="adm-actions">
        ${actions.map(([action, label]) => `<button class="btn ${action === 'approve' || action === 'complete' ? 'btn-gold' : 'btn-ghost'}" onclick="refundAction('${escapeHtml(row.id)}','${action}')">${escapeHtml(label)}</button>`).join('') || '—'}
      </span></td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="adm-card" style="margin-bottom:12px;">
      <h4 style="margin:0 0 8px;">${escapeHtml(t.requestTitle)}</h4>
      <div class="form-grid cols-2">
        <div class="field"><label>${escapeHtml(t.payment)}</label><input id="rfPayment" placeholder="payment uuid" autocomplete="off"></div>
        <div class="field"><label>${escapeHtml(t.amount)}</label><input id="rfAmount" type="number" min="1" step="0.01"></div>
      </div>
      <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.reason)}</label><input id="rfReason" maxlength="1000"></div>
      <button class="btn btn-gold" style="margin-top:10px;" onclick="submitRefundRequest()">${escapeHtml(t.request)}</button>
      <div id="rfMsg"></div>
    </div>
    ${rows ? `<div class="table-scroll"><table class="adm-table"><thead><tr><th>Refund</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` + admShowMore(queue.refunds.length, queue.hasMore, 'moreRf') : admEmpty(t.none, 'Open refunds oldest first. Record a new one above against a payment id.')}`;
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
    const note = await openAdminPrompt({ title: t.reject, body: 'A note is required for the audit trail.', label: t.reason, placeholder: 'Reason', confirmLabel: t.reject });
    if(!note) return;
    extra = { note };
  }
  if(action === 'complete'){
    const reference = await openAdminPrompt({ title: t.complete, body: 'Enter the eSewa reference of the transfer that already happened. The server writes reversals with it.', label: t.reference, placeholder: 'eSewa reference', confirmLabel: t.complete });
    if(!reference) return;
    extra = { externalReference: reference };
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
