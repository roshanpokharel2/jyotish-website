/* ============================================================
   AUTH / ACCOUNT MODULE
   Supabase email/password authentication and customer profiles
============================================================ */

let mainSupabase = null;
let mainAuthUser = null;
let mainCustomer = null;
let mainAuthMessage = '';

function supabaseConfigReady(){
  const config = window.APP_CONFIG || {};
  return Boolean(window.supabase && config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes('YOUR_PROJECT_ID') && !config.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY'));
}

function getMainSupabase(){
  if(mainSupabase) return mainSupabase;
  if(!supabaseConfigReady()) return null;
  mainSupabase = window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
  });
  return mainSupabase;
}

function setAuthMessage(message, type='info'){
  mainAuthMessage = message ? `<div class="disclaimer-box" data-auth-type="${escapeHtml(type)}" style="margin-top:14px;">${escapeHtml(message)}</div>` : '';
}

function setAuthTab(tab){
  authTab = tab;
  renderAuthForm();
  document.getElementById('authTabLoginBtn')?.classList.toggle('active', authTab==='login');
  document.getElementById('authTabRegisterBtn')?.classList.toggle('active', authTab==='register');
  setText('accHeading', authTab==='login' ? T[LANG].authLoginTab : T[LANG].authRegisterTab);
}

function renderAuthForm(){
  const t = T[LANG];
  const panel = document.getElementById('authPanel');
  if(!panel) return;
  if(!supabaseConfigReady()){
    panel.innerHTML = `<div class="empty-box"><p>Supabase setup is required. Add your project URL and anon key to config.js.</p></div>`;
    return;
  }
  const message = mainAuthMessage;
  if(authTab==='login'){
    panel.innerHTML = `
      <div class="field"><label>${t.authEmailLabel}</label><input type="email" id="authLoginEmail" autocomplete="email"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPasswordLabel}</label><input type="password" id="authLoginPw" autocomplete="current-password"></div>
      <div style="text-align:right;margin-top:6px;"><a href="#" style="font-size:.8rem;color:var(--gold);" onclick="resetAuthPassword();return false;">${t.authForgotLink}</a></div>
      <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="signInMain()">${t.authLoginSubmit}</button>
      ${message}
      <p style="text-align:center;margin-top:14px;font-size:.85rem;"><a href="#" onclick="setAuthTab('register');return false;">${t.authSwitchToRegister}</a></p>`;
  } else {
    panel.innerHTML = `
      <div class="field"><label>${t.authFullName}</label><input type="text" id="authRegName" autocomplete="name"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPhoneLabel}</label><input type="tel" id="authRegPhone" autocomplete="tel"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authEmailLabel}</label><input type="email" id="authRegEmail" autocomplete="email"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPasswordLabel}</label><input type="password" id="authRegPw" autocomplete="new-password"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authConfirmLabel}</label><input type="password" id="authRegPw2" autocomplete="new-password"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPrefLangLabel}</label><select id="authRegLang"><option value="ne">नेपाली</option><option value="en">English</option><option value="hi">हिन्दी</option><option value="sa">संस्कृतम्</option></select></div>
      <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="registerMain()">${t.authRegisterSubmit}</button>
      ${message}
      <p style="text-align:center;margin-top:14px;font-size:.85rem;"><a href="#" onclick="setAuthTab('login');return false;">${t.authSwitchToLogin}</a></p>`;
  }
}

// Creates the customer profile once, from the sign-up details. After that the profile
// is the customer's (name, phone, birth details edited in the site): signing in again
// must not reset it to what was typed at sign-up, which the old upsert did every time.
async function syncMainCustomer(user){
  const client = getMainSupabase();
  if(!client || !user) return;
  const own = () => client.from('customers').select('*').eq('user_id', user.id).maybeSingle();
  let { data, error } = await own();
  if(!error && !data){
    ({ error } = await client.from('customers').upsert({
      user_id:user.id,
      full_name:user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
      // No status: the database owns it (0008).
      phone:user.user_metadata?.phone || null,
      email:user.email || null
    }, {onConflict:'user_id', ignoreDuplicates:true}));
    if(!error) ({ data, error } = await own());
  }
  if(error) { console.warn('Customer profile sync failed:', error); return; }
  mainCustomer = data;
}

async function saveAuthenticatedSubmission(requestType, payload){
  const client = getMainSupabase();
  if(!client || !mainAuthUser) return false;
  const { error } = await client.from('service_requests').insert({
    user_id:mainAuthUser.id,
    request_type:requestType,
    payload
  });
  if(error){ console.warn('Service request save failed:', error); return false; }
  return true;
}

async function signInMain(){
  const client = getMainSupabase();
  const email = document.getElementById('authLoginEmail')?.value.trim();
  const password = document.getElementById('authLoginPw')?.value;
  if(!client){ setAuthMessage('Supabase setup is required.', 'error'); renderAuthForm(); return; }
  if(!email || !password || !isValidEmail(email)){ setAuthMessage(!email || !password ? T[LANG].validationRequired : 'Please enter a valid email address.', 'error'); renderAuthForm(); return; }
  const { data, error } = await client.auth.signInWithPassword({email,password});
  if(error){ setAuthMessage(error.message, 'error'); renderAuthForm(); return; }
  await applyMainSession(data.session);
}

async function registerMain(){
  const client = getMainSupabase();
  const name = document.getElementById('authRegName')?.value.trim();
  const phone = document.getElementById('authRegPhone')?.value.trim();
  const email = document.getElementById('authRegEmail')?.value.trim();
  const password = document.getElementById('authRegPw')?.value;
  const confirm = document.getElementById('authRegPw2')?.value;
  const preferredLanguage = document.getElementById('authRegLang')?.value || LANG;
  if(!client){ setAuthMessage('Supabase setup is required.', 'error'); renderAuthForm(); return; }
  if(!name || !email || !password || password !== confirm){ setAuthMessage(T[LANG].validationRequired, 'error'); renderAuthForm(); return; }
  if(!isValidEmail(email)){ setAuthMessage('Please enter a valid email address.', 'error'); renderAuthForm(); return; }
  if(password.length < 8){ setAuthMessage('Password must contain at least 8 characters.', 'error'); renderAuthForm(); return; }
  const { data, error } = await client.auth.signUp({email,password,options:{data:{full_name:name,phone,preferred_language:preferredLanguage}}});
  if(error){ setAuthMessage(error.message, 'error'); renderAuthForm(); return; }
  if(data.session){ await applyMainSession(data.session); return; }
  setAuthMessage('Account created. Check your email to confirm, then sign in.', 'success');
  authTab = 'login';
  renderAuthForm();
}

async function resetAuthPassword(){
  const client = getMainSupabase();
  const email = document.getElementById('authLoginEmail')?.value.trim();
  if(!client || !email){ setAuthMessage('Enter your email first.', 'error'); renderAuthForm(); return; }
  const { error } = await client.auth.resetPasswordForEmail(email, {redirectTo:window.location.href});
  setAuthMessage(error ? error.message : 'Password reset email sent.', error ? 'error' : 'success');
  renderAuthForm();
}

async function applyMainSession(session){
  // Signed out (here or in another tab): start from a fresh page, so nothing of the
  // previous account (profile, birth details, history) stays on a shared device.
  if(!session?.user && mainAuthUser){ window.location.reload(); return; }
  mainAuthUser = session?.user || null;
  demoLoggedIn = Boolean(mainAuthUser);
  if(mainAuthUser) await syncMainCustomer(mainAuthUser);
  mainAuthMessage = '';
  renderStatic();
}

async function initMainAuth(){
  const client = getMainSupabase();
  if(!client) return;
  const {data:{session}} = await client.auth.getSession();
  await applyMainSession(session);
  client.auth.onAuthStateChange((_event, nextSession)=>{ applyMainSession(nextSession); });
}

async function demoLogout(){
  const client = getMainSupabase();
  if(client) await client.auth.signOut();
  await applyMainSession(null);
  authTab = 'login';
}

/* ============================================================
   MY ACCOUNT
   One tabbed view instead of a stack of panels: a customer sees two tabs, an
   applicant three, staff four. Tab visibility is presentation only — every panel
   below is protected by RLS, and the queue's approve/reject writes are accepted
   only from moderator/admin/super_admin.
============================================================ */

let accTab = 'profile';
let accRole = null;
let jyotishRecord = null;

function setAccTab(tab){
  accTab = tab;
  renderMyAccount();
}

async function loadAccountContext(){
  const client = getMainSupabase();
  const [me, jyotish] = await Promise.all([
    client.from('users').select('role').eq('id', mainAuthUser.id).maybeSingle(),
    client.from('astrologers')
      .select('id,name,status,rejection_reason,consultation_fee')
      .eq('user_id', mainAuthUser.id).maybeSingle()
  ]);
  accRole = me.data?.role || null;
  jyotishRecord = jyotish.data || null;
}

function accIsStaff(){
  return ['moderator','support','finance','admin','super_admin'].includes(accRole);
}

// Payment review is narrower than staff: finance, admin and super_admin decide;
// moderators and support never see the queue. Presentation only -- the endpoints
// enforce the same list, plus the no-self-approval rule.
function accIsReviewer(){
  return ['finance','admin','super_admin'].includes(accRole);
}

async function renderMyAccount(){
  const t = T[LANG];
  const grid = document.getElementById('myAccGrid');
  const client = getMainSupabase();
  if(!grid) return;
  if(!client || !mainAuthUser){ grid.innerHTML = ''; return; }

  // The container is a 3-up card grid in the markup; the tabbed view owns its own layout.
  grid.className = '';

  await loadAccountContext();

  const tabs = [
    ['profile', t.myAccSections[0]],
    ['requests', t.bookingsTitle],
    ['jyotish', jyotishRecord ? t.jyotish.statusLabel : t.jyotish.title]
  ];
  if(accIsStaff()) tabs.push(['applications', t.jyotishAdmin.title]);
  if(accIsReviewer()) tabs.push(['payments', t.payReview.title]);
  if(!tabs.some(tab => tab[0] === accTab)) accTab = 'profile';

  grid.innerHTML = `
    <div class="faq-tabs" style="flex-wrap:wrap;">
      ${tabs.map(tab => `<button class="faq-tab${tab[0]===accTab?' active':''}" onclick="setAccTab('${tab[0]}')">${escapeHtml(tab[1])}</button>`).join('')}
    </div>
    <div class="booking-panel" style="margin-top:18px;" id="accPanelBody"></div>`;

  const body = document.getElementById('accPanelBody');
  if(accTab === 'profile') return renderAccountProfile(body);
  if(accTab === 'requests') return renderAccountRequests(body);
  if(accTab === 'jyotish') return renderJyotishPanel(body);
  if(accTab === 'applications') return renderJyotishApplicationsQueue(body);
  if(accTab === 'payments') return renderPaymentsQueue(body);
}

function renderAccountProfile(body){
  const t = T[LANG];
  const profile = mainCustomer || {};
  body.innerHTML = [
    [t.authFullName, profile.full_name],
    [t.authEmailLabel, mainAuthUser.email],
    [t.authPhoneLabel, profile.phone]
  ].map(row => `<div class="review-row"><span>${escapeHtml(row[0])}</span><b>${escapeHtml(row[1] || '—')}</b></div>`).join('');
}

async function renderAccountRequests(body){
  const t = T[LANG];
  const client = getMainSupabase();
  // Bookings with their payment status (both readable for one's own rows), plus
  // the older service requests below them.
  const [bookings, requests] = await Promise.all([
    client.from('bookings')
      .select('id,scheduled_at,status,price_snapshot,currency,astrologer_id,services(name),payments(status)')
      .order('scheduled_at', { ascending:false }).limit(20),
    client.from('service_requests')
      .select('id,request_type,status,created_at')
      .order('created_at', {ascending:false})
      .limit(10)
  ]);

  if(bookings.error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(bookings.error.message)}</p></div>`; return; }

  let html = '';
  if(bookings.data?.length){
    let names = {};
    try{
      const { data } = await client.rpc('active_practitioners');
      names = Object.fromEntries((data ?? []).map(p => [p.id, p.name]));
    } catch(err){ console.warn('Practitioner names could not be loaded:', err); }
    html += bookings.data.map(row => {
      const pay = row.payments?.[0]?.status;
      const when = new Date(row.scheduled_at).toLocaleString();
      return `
      <div class="review-row">
        <span><b>${escapeHtml(row.services?.name || '')}</b><br><small>${escapeHtml(when)} · ${escapeHtml(names[row.astrologer_id] || '')} · ${escapeHtml(row.currency)} ${escapeHtml(row.price_snapshot)}</small></span>
        <b>${escapeHtml(t.pay.st[pay] || pay || '—')}</b>
      </div>`;
    }).join('');
  }

  const { data, error } = requests;
  if(error){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(error.message)}</p></div>`; return; }
  if(data?.length){
    html += data.map(row => `
    <div class="review-row">
      <span><b>${escapeHtml(row.request_type)}</b><br><small>${escapeHtml(new Date(row.created_at).toLocaleDateString())}</small></span>
      <b>${escapeHtml(row.status)}</b>
    </div>`).join('');
  }

  body.innerHTML = html || `<div class="empty-box"><p>${escapeHtml(t.myAccEmpty)}</p></div>`;
}

/* ============================================================
   JYOTISH APPLICATION
   The application always lands in pending_review — guard_astrologer_status()
   forces it — so nothing here is a security control. This form only has to be
   honest about what happens next.
============================================================ */

function renderJyotishPanel(body){
  const t = T[LANG].jyotish;

  if(jyotishRecord){
    body.innerHTML = `
      <div class="review-row"><span>${escapeHtml(t.statusLabel)}</span><b>${escapeHtml(t.status[jyotishRecord.status] || jyotishRecord.status)}</b></div>
      <div class="review-row"><span>${escapeHtml(T[LANG].authFullName)}</span><b>${escapeHtml(jyotishRecord.name)}</b></div>
      <div class="review-row"><span>${escapeHtml(t.fee)}</span><b>${escapeHtml(jyotishRecord.consultation_fee)}</b></div>
      ${jyotishRecord.rejection_reason ? `<div class="review-row"><span>${escapeHtml(t.reason)}</span><b>${escapeHtml(jyotishRecord.rejection_reason)}</b></div>` : ''}`;
    return;
  }

  body.innerHTML = `
    <p style="font-size:.88rem;color:var(--ink-soft);margin-top:0;">${escapeHtml(t.intro)}</p>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(T[LANG].authFullName)} *</label><input id="jyName" value="${escapeHtml(mainCustomer?.full_name || '')}"></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.bio)} *</label><textarea rows="4" id="jyBio"></textarea></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.qualification)}</label><input id="jyQualification"></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.experience)}</label><input type="number" id="jyExperience" min="0" max="80" value="0"></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.specialization)}</label><input id="jySpecialization"></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.languages)}</label><input id="jyLanguages" value="नेपाली"></div>
    <div class="field" style="margin-top:12px;"><label>${escapeHtml(t.fee)} *</label><input type="number" id="jyFee" min="0" value="1000"></div>
    <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="submitJyotishApplication()">${escapeHtml(t.submit)}</button>
    <div id="jyApplyMsg"></div>`;
}

async function submitJyotishApplication(){
  const t = T[LANG].jyotish;
  const msg = document.getElementById('jyApplyMsg');
  const name = document.getElementById('jyName')?.value.trim();
  const biography = document.getElementById('jyBio')?.value.trim();
  const fee = Number(document.getElementById('jyFee')?.value);
  const experience = Number(document.getElementById('jyExperience')?.value);

  if(!name || !biography || !Number.isFinite(fee) || fee < 0){
    msg.innerHTML = `<div class="disclaimer-box" style="margin-top:14px;">${escapeHtml(T[LANG].validationRequired)}</div>`;
    return;
  }
  if(!Number.isInteger(experience) || experience < 0 || experience > 80){
    msg.innerHTML = `<div class="disclaimer-box" style="margin-top:14px;">${escapeHtml(t.experience)}: 0–80</div>`;
    return;
  }

  const languages = (document.getElementById('jyLanguages')?.value || '').split(',').map(value => value.trim()).filter(Boolean);

  const { error } = await getMainSupabase().from('astrologers').insert({
    user_id: mainAuthUser.id,
    name,
    biography,
    qualification: document.getElementById('jyQualification')?.value.trim() || null,
    experience_years: experience,
    specialization: document.getElementById('jySpecialization')?.value.trim() || null,
    languages: languages.length ? languages : ['नेपाली'],
    consultation_fee: fee
  });

  if(error){
    msg.innerHTML = `<div class="disclaimer-box" style="margin-top:14px;">${escapeHtml(error.message)}</div>`;
    return;
  }
  if(typeof showToast === 'function') showToast(t.sent);
  renderMyAccount();
}

/* ============================================================
   JYOTISH APPLICATIONS QUEUE (staff)
   A stand-in for the /admin dashboard in Step 20.
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
        <button class="btn btn-gold" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','active')">${escapeHtml(t.approve)}</button>
        <button class="btn btn-ghost" onclick="reviewJyotishApplication('${escapeHtml(row.id)}','rejected')">${escapeHtml(t.reject)}</button>
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

  const { error } = await getMainSupabase().from('astrologers').update(patch).eq('id', id);
  if(typeof showToast === 'function') showToast(error ? error.message : t.done);
  renderMyAccount();
}

/* ============================================================
   PAYMENT VERIFICATION QUEUE (finance, admin, super_admin)
   Oldest consultation first. Proof opens in a new tab through a short-lived
   signed URL; approve/reject go through the server endpoints, which write the
   audit row in the same transaction. The browser never writes payments.
============================================================ */

async function accToken(){
  const session = (await getMainSupabase().auth.getSession()).data.session;
  return session?.access_token || null;
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
        <small>${escapeHtml(row.service?.name || '')} · ${escapeHtml(row.amount)} ${escapeHtml(row.currency)}</small><br>
        <small>${escapeHtml(new Date(row.booking.startsAt).toLocaleString())}${row.customerReference ? ` · ${escapeHtml(row.customerReference)}` : ''}</small><br>
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
  renderMyAccount();
}
