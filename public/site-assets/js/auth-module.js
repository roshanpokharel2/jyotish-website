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
  if(accIsReviewer()) tabs.push(['refunds', t.rf.title]);
  if(accIsReviewer()) tabs.push(['payouts', t.po.title]);
  if(['jyotish','moderator','admin','super_admin'].includes(accRole)) tabs.push(['knowledge', t.kn.title]);
  if(['finance','admin','super_admin'].includes(accRole)) tabs.push(['audit', t.au.title]);
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
  if(accTab === 'refunds') return renderRefundsQueue(body);
  if(accTab === 'payouts') return renderPayoutsQueue(body);
  if(accTab === 'knowledge') return renderKnowledgeTab(body);
  if(accTab === 'audit') return renderAuditTab(body);
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
      .select('id,scheduled_at,status,price_snapshot,currency,astrologer_id,services(name),payments(status),reviews(rating)')
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
      const join = row.status === 'confirmed'
        ? `<br><a class="btn btn-gold" style="margin-top:6px;padding:4px 12px;font-size:.8rem;" href="/site-assets/consult.html?booking=${escapeHtml(row.id)}">${escapeHtml(t.cm.join)}</a>` : '';
      return `
      <div class="review-row">
        <span><b>${escapeHtml(row.services?.name || '')}</b><br><small>${escapeHtml(when)} · ${escapeHtml(names[row.astrologer_id] || '')} · ${escapeHtml(row.currency)} ${escapeHtml(row.price_snapshot)}</small><br><small>${escapeHtml(t.pay.st[pay] || pay || '—')}</small>${renderBookingReview(t, row)}${join}</span>
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
   REVIEWS
   Completed bookings grow a small inline form: five stars and an optional
   private note for staff. The insert goes straight to the table -- the policy
   and trigger (0030) admit only the booking's own customer, once, and the
   authorship comes from the booking, not the form.
============================================================ */

let rvOpen = null;
let rvRating = 5;
let rvNote = '';

function reviewStars(n){
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function renderBookingReview(t, booking){
  if(booking.status !== 'completed') return '';
  const given = booking.reviews?.[0]?.rating;
  if(given) return `<br><small style="color:var(--gold);font-size:1rem;letter-spacing:2px;">${escapeHtml(reviewStars(given))}</small>`;
  if(rvOpen !== booking.id){
    return `<br><button class="btn btn-ghost" style="margin-top:6px;padding:4px 12px;font-size:.8rem;" onclick="rvOpen='${escapeHtml(booking.id)}';rvRating=5;rvNote='';renderMyAccount()">${escapeHtml(t.rv.rate)}</button>`;
  }
  return `<br><span style="display:block;margin-top:6px;">
    <span style="color:var(--gold);font-size:1.2rem;letter-spacing:2px;cursor:pointer;">${[1,2,3,4,5].map(i =>
      `<span onclick="rvRating=${i};renderMyAccount()">${i <= rvRating ? '★' : '☆'}</span>`).join('')}</span><br>
    <small>${escapeHtml(t.rv.rating)}</small>
    <div class="field" style="margin-top:6px;"><label>${escapeHtml(t.rv.note)}</label><input value="${escapeHtml(rvNote)}" maxlength="2000" oninput="rvNote=this.value"></div>
    <button class="btn btn-gold" style="margin-top:8px;padding:4px 12px;font-size:.8rem;" onclick="submitBookingReview('${escapeHtml(booking.id)}')">${escapeHtml(t.rv.submit)}</button>
  </span>`;
}

async function submitBookingReview(bookingId){
  const t = T[LANG];
  const note = rvNote.trim() || null;
  const { error } = await getMainSupabase().from('reviews').insert({
    booking_id: bookingId, rating: rvRating, private_feedback: note
  });
  if(typeof showToast === 'function') showToast(error ? error.message : t.rv.submitted);
  if(!error){ rvOpen = null; rvRating = 5; rvNote = ''; }
  renderMyAccount();
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
      ${jyotishRecord.rejection_reason ? `<div class="review-row"><span>${escapeHtml(t.reason)}</span><b>${escapeHtml(jyotishRecord.rejection_reason)}</b></div>` : ''}
      <div id="jyHoursBox"></div>
      <div id="jyDaysOffBox"></div>
      <div id="jyPayoutBox"></div>`;
    renderWeeklyHours(document.getElementById('jyHoursBox'));
    renderDaysOff(document.getElementById('jyDaysOffBox'));
    renderPractitionerPayouts(document.getElementById('jyPayoutBox'));
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
  renderMyAccount();
}

/* ============================================================
   PRACTITIONER PAYOUTS
   The practitioner's own payable balance (my_payout_balance), a request form,
   and their request history. Requesting posts to /api/payouts, which checks
   ownership, floor and balance against the database.
============================================================ */

/* ============================================================
   WEEKLY HOURS
   The practitioner's own weekly windows (availability, 0014), Kathmandu time.
   Written straight under RLS; the database refuses end <= start (0014) and two
   active windows overlapping on one weekday (0036). available_slots() turns them
   into bookable times.
============================================================ */

// 2026-01-04 is a Sunday: day_of_week 0..6 -> that week's dates, named in LANG.
const whDayName = (dow) => bookingFormat(`2026-01-${String(4 + dow).padStart(2, '0')}T12:00:00+05:45`, { weekday:'long' });

async function renderWeeklyHours(box){
  if(!box || !jyotishRecord) return;
  const t = T[LANG].wh;
  const { data } = await getMainSupabase().from('availability').select('id,day_of_week,start_time,end_time')
    .eq('astrologer_id', jyotishRecord.id).eq('is_active', true).order('day_of_week').order('start_time');
  const rows = data ?? [];
  const hm = (v) => String(v).slice(0, 5);
  box.innerHTML = `
    <h4 style="margin:18px 0 6px;">${escapeHtml(t.title)}</h4>
    ${rows.length ? [0,1,2,3,4,5,6].filter(d => rows.some(r => r.day_of_week === d)).map(d => `
      <div class="review-row" style="align-items:flex-start;gap:12px;">
        <span><b>${escapeHtml(whDayName(d))}</b></span>
        <span style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">${rows.filter(r => r.day_of_week === d).map(r => `
          <span class="wh-window">${escapeHtml(`${hm(r.start_time)}–${hm(r.end_time)}`)} <button class="btn btn-ghost" style="padding:2px 10px;font-size:.8rem;" onclick="removeWeeklyHours('${escapeHtml(r.id)}')">${escapeHtml(t.remove)}</button></span>`).join('')}
        </span>
      </div>`).join('') : `<p style="color:var(--ink-soft);font-size:.88rem;">${escapeHtml(t.none)}</p>`}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      <div class="field"><label>${escapeHtml(t.day)}</label><select id="whDay">${[0,1,2,3,4,5,6].map(d => `<option value="${d}">${escapeHtml(whDayName(d))}</option>`).join('')}</select></div>
      <div class="field"><label>${escapeHtml(t.from)}</label><input id="whFrom" type="time" step="900"></div>
      <div class="field"><label>${escapeHtml(t.to)}</label><input id="whTo" type="time" step="900"></div>
    </div>
    <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="addWeeklyHours()">${escapeHtml(t.add)}</button>
    <div id="whMsg"></div>
    <p style="color:var(--ink-soft);font-size:.8rem;margin:6px 0 0;">${escapeHtml(t.note)}</p>`;
}

async function addWeeklyHours(){
  const t = T[LANG].wh;
  const day = Number(document.getElementById('whDay')?.value);
  const from = document.getElementById('whFrom')?.value, to = document.getElementById('whTo')?.value;
  const msg = document.getElementById('whMsg');
  const show = (text) => { if(msg) msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(text)}</div>`; };
  if(!from || !to) return show(T[LANG].validationRequired);
  if(to <= from) return show(t.invalid);
  const { error } = await getMainSupabase().from('availability').insert({
    astrologer_id: jyotishRecord.id, day_of_week: day, start_time: from, end_time: to
  });
  if(error) return show(error.code === '23P01' ? t.overlap : error.code === '23514' ? t.invalid : error.message);
  renderWeeklyHours(document.getElementById('jyHoursBox'));
}

async function removeWeeklyHours(id){
  const { error } = await getMainSupabase().from('availability').delete().eq('id', id);
  if(error && typeof showToast === 'function') showToast(error.message);
  renderWeeklyHours(document.getElementById('jyHoursBox'));
}

/* ============================================================
   DAYS OFF
   Whole days the practitioner does not work (availability_exceptions, 0035).
   Written straight under RLS, like weekly hours: the practitioner's own rows only.
   available_slots() skips these days, so the booking form and the server stop
   offering them. Bookings already on those days stay; the note says so.
============================================================ */

const nptDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone:'Asia/Kathmandu' });

async function renderDaysOff(box){
  if(!box || !jyotishRecord) return;
  const t = T[LANG].dayoff;
  const client = getMainSupabase();
  const today = nptDate(Date.now());
  const [off, live] = await Promise.all([
    client.from('availability_exceptions').select('id,starts_on,ends_on,reason')
      .eq('astrologer_id', jyotishRecord.id).gte('ends_on', today).order('starts_on'),
    client.from('bookings').select('scheduled_at')
      .eq('astrologer_id', jyotishRecord.id).in('status', ['payment_pending','confirmed','in_progress'])
      .gte('scheduled_at', new Date().toISOString())
  ]);
  const liveDays = (live.data ?? []).map(b => nptDate(b.scheduled_at));
  box.innerHTML = `
    <h4 style="margin:18px 0 6px;">${escapeHtml(t.title)}</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <div class="field"><label>${escapeHtml(t.from)}</label><input id="doFrom" type="date" min="${today}"></div>
      <div class="field"><label>${escapeHtml(t.to)}</label><input id="doTo" type="date" min="${today}"></div>
    </div>
    <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.reason)}</label><input id="doReason" maxlength="200"></div>
    <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="addDaysOff()">${escapeHtml(t.add)}</button>
    <div id="doMsg"></div>
    ${(off.data ?? []).map(row => {
      const booked = liveDays.filter(d => d >= row.starts_on && d <= row.ends_on).length;
      return `<div class="review-row" style="align-items:flex-start;gap:12px;">
        <span><b>${escapeHtml(row.starts_on === row.ends_on ? row.starts_on : `${row.starts_on} → ${row.ends_on}`)}</b>${row.reason ? `<br><small>${escapeHtml(row.reason)}</small>` : ''}${booked ? `<br><small style="color:var(--danger,#b3261e);">${escapeHtml(t.booked.replace('{n}', booked))}</small>` : ''}</span>
        <button class="btn btn-ghost" style="flex-shrink:0;" onclick="removeDaysOff('${escapeHtml(row.id)}')">${escapeHtml(t.remove)}</button>
      </div>`;
    }).join('') || `<p style="color:var(--ink-soft);font-size:.88rem;">${escapeHtml(t.none)}</p>`}`;
}

async function addDaysOff(){
  const t = T[LANG].dayoff;
  const from = document.getElementById('doFrom')?.value;
  const to = document.getElementById('doTo')?.value || from;
  const msg = document.getElementById('doMsg');
  const show = (text) => { if(msg) msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(text)}</div>`; };
  if(!from) return show(T[LANG].validationRequired);
  if(to < from) return show(t.invalid);
  const { error } = await getMainSupabase().from('availability_exceptions').insert({
    astrologer_id: jyotishRecord.id, starts_on: from, ends_on: to,
    reason: document.getElementById('doReason')?.value.trim() || null
  });
  if(error) return show(error.message);
  renderDaysOff(document.getElementById('jyDaysOffBox'));
}

async function removeDaysOff(id){
  const { error } = await getMainSupabase().from('availability_exceptions').delete().eq('id', id);
  if(error && typeof showToast === 'function') showToast(error.message);
  renderDaysOff(document.getElementById('jyDaysOffBox'));
}

async function renderPractitionerPayouts(box){
  if(!box) return;
  const t = T[LANG].po;
  const client = getMainSupabase();
  const [bal, mine] = await Promise.all([
    client.rpc('my_payout_balance').maybeSingle(),
    client.from('payouts').select('id,amount,currency,status,created_at').order('created_at', { ascending:false }).limit(10)
  ]);
  const payable = bal.data?.payable ?? null;
  box.innerHTML = `
    <h4 style="margin:18px 0 6px;">${escapeHtml(t.title)}</h4>
    <div class="review-row"><span>${escapeHtml(t.balance)}</span><b>${payable == null ? '—' : escapeHtml(`${bal.data.currency} ${payable}`)}</b></div>
    <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.amount)}</label><input id="poAmount" type="number" min="1" step="0.01"></div>
    <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="submitPayoutRequest()">${escapeHtml(t.request)}</button>
    <div id="poMsg"></div>
    ${(mine.data ?? []).map(row => `
      <div class="review-row"><span><b>${escapeHtml(row.currency)} ${escapeHtml(row.amount)}</b><br><small>${escapeHtml(new Date(row.created_at).toLocaleDateString())}</small></span><b>${escapeHtml(t.st[row.status] || row.status)}</b></div>`).join('')}`;
}

async function submitPayoutRequest(){
  const t = T[LANG].po;
  const session = (await getMainSupabase().auth.getSession()).data.session;
  const msg = document.getElementById('poMsg');
  if(!session) return;
  const response = await fetch('/api/payouts', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
    body: JSON.stringify({ astrologerId: jyotishRecord?.id, amount: Number(document.getElementById('poAmount')?.value) })
  });
  const result = await response.json().catch(()=>({}));
  if(!response.ok && msg){
    msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(result.error?.message || t.done)}</div>`;
    return;
  }
  if(typeof showToast === 'function') showToast(t.done);
  renderMyAccount();
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
  renderMyAccount();
}

/* ============================================================
   KNOWLEDGE (authors draft, moderators decide)
   Drafts are written straight to the table (RLS admits authors only, as
   drafts); submitting and moderating go through the server endpoints.
============================================================ */

async function renderKnowledgeTab(body){
  const t = T[LANG].kn;
  const token = await accToken();
  const client = getMainSupabase();
  if(!token){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(T[LANG].signInToContinue)}</p></div>`; return; }
  const isMod = ['moderator','admin','super_admin'].includes(accRole);

  const { data: mine } = await client.from('knowledge_items')
    .select('id,content_type,title,status,language,created_at')
    .order('created_at', { ascending:false }).limit(20);

  let queue = [];
  if(isMod){
    try{
      const response = await fetch('/api/knowledge/queue', { headers:{ Authorization:`Bearer ${token}` } });
      const result = await response.json();
      if(response.ok) queue = result.items ?? [];
    } catch(err){ console.warn('Knowledge queue failed:', err); }
  }

  const row = (k, actions) => `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span><b>${escapeHtml(k.title)}</b><br><small>${escapeHtml(k.content_type)} · ${escapeHtml(k.language)} · ${escapeHtml(t.st[k.status] || k.status)}</small></span>
      <span style="display:flex;gap:8px;flex-shrink:0;">${actions}</span>
    </div>`;
  const btn = (id, action, label, gold) =>
    `<button class="btn ${gold ? 'btn-gold' : 'btn-ghost'}" onclick="knowledgeAction('${escapeHtml(id)}','${action}')">${escapeHtml(label)}</button>`;

  body.innerHTML = `
    <div style="padding:14px;border:1px solid var(--gold);border-radius:10px;margin-bottom:14px;">
      <h4 style="margin:0 0 8px;">${escapeHtml(t.newDraft)}</h4>
      <div class="field"><label>${escapeHtml(t.titleL)}</label><input id="knTitle" maxlength="200"></div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <div class="field" style="flex:1;"><label>${escapeHtml(t.typeL)}</label><select id="knType"><option value="article">article</option><option value="faq">faq</option></select></div>
        <div class="field" style="flex:1;"><label>${escapeHtml(t.languageL)}</label><select id="knLang"><option value="ne">ne</option><option value="en">en</option><option value="hi">hi</option><option value="sa">sa</option></select></div>
      </div>
      <div class="field" style="margin-top:8px;"><label>${escapeHtml(t.bodyL)}</label><textarea rows="4" id="knBody"></textarea></div>
      <button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="submitKnowledgeDraft()">${escapeHtml(t.save)}</button>
      <div id="knMsg"></div>
    </div>
    <h4 style="margin:14px 0 6px;">${escapeHtml(t.mine)}</h4>
    ${(mine ?? []).map(k => row(k,
      (k.status === 'draft' || k.status === 'rejected') ? btn(k.id, 'submit', t.submit, true) : ''
    )).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`}
    ${isMod ? `<h4 style="margin:14px 0 6px;">${escapeHtml(t.queue)}</h4>` +
      queue.map(k => `
      <div class="review-row" style="align-items:flex-start;gap:12px;">
        <span><b>${escapeHtml(k.title)}</b><br><small>${escapeHtml(k.author?.email || '')} · ${escapeHtml(k.content_type)} · ${escapeHtml(k.language)}</small><br><small>${escapeHtml((k.body || '').slice(0, 300))}</small></span>
        <span style="display:flex;gap:8px;flex-shrink:0;">${btn(k.id, 'publish', t.publish, true)}${btn(k.id, 'reject', t.reject, false)}</span>
      </div>`).join('') || '' : ''}`;
}

async function submitKnowledgeDraft(){
  const t = T[LANG].kn;
  const msg = document.getElementById('knMsg');
  const title = document.getElementById('knTitle')?.value.trim();
  const body = document.getElementById('knBody')?.value.trim();
  if(!title || !body){
    if(msg) msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(T[LANG].validationRequired)}</div>`;
    return;
  }
  const { error } = await getMainSupabase().from('knowledge_items').insert({
    content_type: document.getElementById('knType')?.value || 'article',
    title, body, language: document.getElementById('knLang')?.value || 'ne'
  });
  if(error){
    if(msg) msg.innerHTML = `<div class="disclaimer-box" style="margin-top:10px;">${escapeHtml(error.message)}</div>`;
    return;
  }
  if(typeof showToast === 'function') showToast(t.done);
  renderMyAccount();
}

async function knowledgeAction(id, action){
  const t = T[LANG].kn;
  const token = await accToken();
  if(!token) return;
  const path = action === 'submit' ? 'submit' : 'moderate';
  const response = await fetch(`/api/knowledge/${encodeURIComponent(id)}/${path}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(action === 'submit' ? {} : { decision: action })
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? t.done : (result.error?.message || t.done));
  renderMyAccount();
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
  renderMyAccount();
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
  renderMyAccount();
}
