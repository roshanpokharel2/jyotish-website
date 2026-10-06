/* ============================================================
   AUTH / ACCOUNT MODULE
   Supabase email/password authentication and customer profiles
============================================================ */

let mainSupabase = null;
let mainAuthUser = null;
let mainCustomer = null;
let mainAuthMessage = '';
let mainAuthRecovery = false;

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

function passwordEyeIcon(visible=false){
  return visible
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 9 7a10 10 0 0 1-3.1 4.1M6.2 6.2C3.7 7.8 2 10.4 2 12c0 2 4 7 10 7 1.1 0 2.1-.2 3-.5"/></svg>';
}

function passwordFieldMarkup(id, autocomplete){
  return `<div class="password-input-wrap"><input type="password" id="${escapeHtml(id)}" autocomplete="${escapeHtml(autocomplete)}"><button class="password-toggle" type="button" aria-label="Show password" title="Show password" aria-pressed="false" onclick="togglePasswordVisibility('${escapeHtml(id)}',this)">${passwordEyeIcon()}</button></div>`;
}

function togglePasswordVisibility(inputId, button){
  const input = document.getElementById(inputId);
  if(!input || !button) return;
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  button.title = visible ? 'Hide password' : 'Show password';
  button.innerHTML = passwordEyeIcon(visible);
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
  if(mainAuthRecovery){
    panel.innerHTML = `
      <div class="field"><label>${t.authPasswordLabel}</label>${passwordFieldMarkup('authResetPw','new-password')}</div>
      <div class="field" style="margin-top:12px;"><label>${t.authConfirmLabel}</label>${passwordFieldMarkup('authResetPw2','new-password')}</div>
      <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="saveRecoveredPassword()">Update Password</button>
      ${message}
      <p style="text-align:center;margin-top:14px;font-size:.85rem;"><a href="#" onclick="cancelPasswordRecovery();return false;">${t.authSwitchToLogin}</a></p>`;
    return;
  }
  if(authTab==='login'){
    panel.innerHTML = `
      <div class="field"><label>${t.authEmailLabel}</label><input type="email" id="authLoginEmail" autocomplete="email"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPasswordLabel}</label>${passwordFieldMarkup('authLoginPw','current-password')}</div>
      <div style="text-align:right;margin-top:6px;"><a href="#" style="font-size:.8rem;color:var(--gold);" onclick="resetAuthPassword();return false;">${t.authForgotLink}</a></div>
      <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="signInMain()">${t.authLoginSubmit}</button>
      ${message}
      <p style="text-align:center;margin-top:14px;font-size:.85rem;"><a href="#" onclick="setAuthTab('register');return false;">${t.authSwitchToRegister}</a></p>`;
  } else {
    panel.innerHTML = `
      <div class="field"><label>${t.authFullName}</label><input type="text" id="authRegName" autocomplete="name"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPhoneLabel}</label><input type="tel" id="authRegPhone" autocomplete="tel"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authEmailLabel}</label><input type="email" id="authRegEmail" autocomplete="email"></div>
      <div class="field" style="margin-top:12px;"><label>${t.authPasswordLabel}</label>${passwordFieldMarkup('authRegPw','new-password')}</div>
      <div class="field" style="margin-top:12px;"><label>${t.authConfirmLabel}</label>${passwordFieldMarkup('authRegPw2','new-password')}</div>
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
  // Administrators use the dedicated admin route; other staff use the in-page dashboard.
  if(mainAuthUser && typeof goView === 'function'){
    await loadAccountContext();
    if(['admin','super_admin','superadmin'].includes(accRole)){
      window.location.assign('/admin');
    } else if(accIsStaff()){
      goView('admin');
    }
  }
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
  const { error } = await client.auth.resetPasswordForEmail(email, {redirectTo:`${window.location.origin}${window.location.pathname}`});
  setAuthMessage(error ? error.message : 'Password reset email sent.', error ? 'error' : 'success');
  renderAuthForm();
}

async function saveRecoveredPassword(){
  const client = getMainSupabase();
  const password = document.getElementById('authResetPw')?.value;
  const confirm = document.getElementById('authResetPw2')?.value;
  if(!password || !confirm){ setAuthMessage(T[LANG].validationRequired, 'error'); renderAuthForm(); return; }
  if(password !== confirm){ setAuthMessage('Passwords do not match.', 'error'); renderAuthForm(); return; }
  if(password.length < 8){ setAuthMessage('Password must contain at least 8 characters.', 'error'); renderAuthForm(); return; }
  const { data:{session} } = await client.auth.getSession();
  if(!session){
    mainAuthRecovery = false;
    setAuthMessage('This password reset link is invalid, expired, or already used. Request a new link.', 'error');
    clearAuthCallbackParams();
    renderAuthForm();
    return;
  }
  const { error } = await client.auth.updateUser({password});
  if(error){ setAuthMessage(error.message, 'error'); renderAuthForm(); return; }
  try{ sessionStorage.setItem('authPasswordUpdated','1'); } catch {}
  mainAuthRecovery = false;
  clearAuthCallbackParams();
  const { error:signOutError } = await client.auth.signOut();
  if(signOutError){
    setAuthMessage('Password updated successfully. Sign out before logging in with the new password.', 'success');
    if(typeof showToast === 'function') showToast('Password updated successfully.');
    return;
  }
  window.location.reload();
}

function clearAuthCallbackParams(){
  const url = new URL(window.location.href);
  ['code','type','error','error_code','error_description','token_hash'].forEach(key => url.searchParams.delete(key));
  if(url.hash.includes('access_token=') || url.hash.includes('refresh_token=') || url.hash.includes('type=recovery') || url.hash.includes('error=')) url.hash = '';
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function cancelPasswordRecovery(){
  mainAuthRecovery = false;
  clearAuthCallbackParams();
  setAuthMessage('', 'info');
  authTab = 'login';
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
  if(mainAuthRecovery){
    const authBlock = document.getElementById('accAuthBlock');
    const accountBlock = document.getElementById('accMyAccountBlock');
    if(authBlock) authBlock.style.display = 'block';
    if(accountBlock) accountBlock.style.display = 'none';
    renderAuthForm();
  }
}

async function initMainAuth(){
  const client = getMainSupabase();
  if(!client) return;
  client.auth.onAuthStateChange((event, nextSession)=>{
    if(event === 'PASSWORD_RECOVERY'){
      mainAuthRecovery = true;
      setAuthMessage('', 'info');
    }
    applyMainSession(nextSession);
  });
  const {data:{session}} = await client.auth.getSession();
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const authError = url.searchParams.get('error_description') || hashParams.get('error_description') || url.searchParams.get('error');
  const recoveryRequested = url.searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
  let callbackMessage = '';
  if(authError){
    callbackMessage = 'This password reset link is invalid or expired. Request a new link.';
    authTab = 'login';
    clearAuthCallbackParams();
  } else if(recoveryRequested && (!session || !mainAuthRecovery)){
    callbackMessage = 'This password reset link is invalid, expired, or already used. Request a new link.';
    clearAuthCallbackParams();
  } else if(recoveryRequested){
    clearAuthCallbackParams();
  }
  let passwordUpdated = false;
  try{
    if(sessionStorage.getItem('authPasswordUpdated')){
      sessionStorage.removeItem('authPasswordUpdated');
      passwordUpdated = true;
    }
  } catch {}
  await applyMainSession(session);
  if(passwordUpdated){
    mainAuthRecovery = false;
    authTab = 'login';
    setAuthMessage('Password updated successfully. Sign in with your new password.', 'success');
    renderAuthForm();
  } else if(callbackMessage){
    setAuthMessage(callbackMessage, 'error');
    if(mainAuthUser && typeof showToast === 'function') showToast(callbackMessage);
    else renderAuthForm();
  } else if(recoveryRequested && session){
    mainAuthRecovery = true;
    renderAuthForm();
  }
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

async function accToken(){
  const session = (await getMainSupabase().auth.getSession()).data.session;
  return session?.access_token || null;
}

// After a staff action: re-render whichever screen the action came from.
function accRefresh(){
  if(typeof currentView !== 'undefined' && currentView === 'admin' && typeof renderAdmin === 'function') return renderAdmin();
  renderMyAccount();
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
  if(['jyotish','moderator','admin','super_admin'].includes(accRole)) tabs.push(['knowledge', t.kn.title]);
  if(!tabs.some(tab => tab[0] === accTab)) accTab = 'profile';

  grid.innerHTML = `
    ${accIsStaff() ? `<button class="btn btn-gold btn-block" style="margin-bottom:14px;" onclick="goView('admin')">${escapeHtml(t.adm.open)}</button>` : ''}
    <div class="faq-tabs" style="flex-wrap:wrap;">
      ${tabs.map(tab => `<button class="faq-tab${tab[0]===accTab?' active':''}" onclick="setAccTab('${tab[0]}')">${escapeHtml(tab[1])}</button>`).join('')}
    </div>
    <div class="booking-panel" style="margin-top:18px;" id="accPanelBody"></div>`;

  const body = document.getElementById('accPanelBody');
  if(accTab === 'profile') return renderAccountProfile(body);
  if(accTab === 'requests') return renderAccountRequests(body);
  if(accTab === 'jyotish') return renderJyotishPanel(body);
  if(accTab === 'knowledge') return renderKnowledgeTab(body);
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
      .select('id,scheduled_at,ends_at,status,price_snapshot,currency,astrologer_id,services(name),payments(status),reviews(rating)')
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
      if(jyotishRecord) names[jyotishRecord.id] = jyotishRecord.name;
    } catch(err){ console.warn('Practitioner names could not be loaded:', err); }
    html += bookings.data.map(row => {
      const pay = row.payments?.[0]?.status;
      const when = new Date(row.scheduled_at).toLocaleString();
      const join = row.status === 'confirmed'
        ? `<br><a class="btn btn-gold" style="margin-top:6px;padding:4px 12px;font-size:.8rem;" href="/site-assets/consult.html?booking=${escapeHtml(row.id)}">${escapeHtml(t.cm.join)}</a>` : '';
      // The practitioner's own booking: mark the outcome once it has ended; no review.
      const own = jyotishRecord && row.astrologer_id === jyotishRecord.id;
      const finished = t.bc[row.status] ? `<br><small>${escapeHtml(t.bc[row.status])}</small>` : '';
      const extra = !own ? renderBookingReview(t, row)
        : finished || (bookingCanComplete(row.status, pay, row.ends_at) ? '<br>' + bookingOutcomeButtons(row.id) : '');
      return `
      <div class="review-row" data-booking="${escapeHtml(row.id)}">
        <span><b>${escapeHtml(row.services?.name || '')}</b><br><small>${escapeHtml(when)} · ${escapeHtml(names[row.astrologer_id] || '')} · ${escapeHtml(row.currency)} ${escapeHtml(row.price_snapshot)}</small><br><small>${escapeHtml(t.pay.st[pay] || pay || '—')}</small>${extra}${join}</span>
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
   BOOKING OUTCOME
   After a paid consultation has ended, its practitioner (or support / admin) marks it
   completed or no-show. complete_booking() (0040) decides who may; the buttons only
   show where it would agree.
============================================================ */

function bookingCanComplete(status, paymentStatus, endsAt){
  return ['confirmed','in_progress'].includes(status) && paymentStatus === 'paid' && new Date(endsAt) <= new Date();
}

// Buttons for each outcome other than the current one (staff corrections pass it).
function bookingOutcomeButtons(id, current){
  const t = T[LANG].bc;
  return ['completed','no_show'].filter(o => o !== current).map(o =>
    `<button class="btn btn-ghost" style="margin:6px 6px 0 0;padding:4px 12px;font-size:.8rem;" data-outcome="${o}" onclick="completeBooking('${escapeHtml(id)}','${o}')">${escapeHtml(t[o])}</button>`).join('');
}

async function completeBooking(id, outcome){
  const token = await accToken();
  if(!token) return;
  const response = await fetch(`/api/bookings/${encodeURIComponent(id)}/complete`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ outcome })
  });
  const result = await response.json().catch(()=>({}));
  if(typeof showToast === 'function') showToast(response.ok ? T[LANG].bc.saved : (result.error?.message || T[LANG].loadFailed));
  accRefresh();
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

/* ============================================================
   PRACTITIONER PAYOUTS
   The practitioner's own payable balance (my_payout_balance), a request form,
   and their request history. Requesting posts to /api/payouts, which checks
   ownership, floor and balance against the database.
============================================================ */
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
   KNOWLEDGE (authors draft, moderators decide)
   Drafts are written straight to the table (RLS admits authors only, as
   drafts); submitting and moderating go through the server endpoints.
============================================================ */

async function renderKnowledgeTab(body){
  const t = T[LANG].kn;
  const token = await accToken();
  const client = getMainSupabase();
  if(!token){ body.innerHTML = `<div class="empty-box"><p>${escapeHtml(T[LANG].signInToContinue)}</p></div>`; return; }

  const { data: mine } = await client.from('knowledge_items')
    .select('id,content_type,title,status,language,created_at')
    .order('created_at', { ascending:false }).limit(20);

  const row = (k, actions) => `
    <div class="review-row" style="align-items:flex-start;gap:12px;">
      <span><b>${escapeHtml(k.title)}</b><br><small>${escapeHtml(k.content_type)} · ${escapeHtml(k.language)} · ${escapeHtml(t.st[k.status] || k.status)}</small></span>
      <span style="display:flex;gap:8px;flex-shrink:0;">${actions}</span>
    </div>`;

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
      (k.status === 'draft' || k.status === 'rejected') ? knowledgeButton(k.id, 'submit', t.submit, true) : ''
    )).join('') || `<div class="empty-box"><p>${escapeHtml(t.none)}</p></div>`}`;
}

function knowledgeButton(id, action, label, gold){
  return `<button class="btn ${gold ? 'btn-gold' : 'btn-ghost'}" onclick="knowledgeAction('${escapeHtml(id)}','${action}')">${escapeHtml(label)}</button>`;
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
  accRefresh();
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
  accRefresh();
}
