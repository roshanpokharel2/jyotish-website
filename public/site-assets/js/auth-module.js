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

async function syncMainCustomer(user, metadata={}){
  const client = getMainSupabase();
  if(!client || !user) return;
  const { data, error } = await client.from('customers').upsert({
    user_id:user.id,
    full_name:metadata.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
    phone:metadata.phone || user.user_metadata?.phone || null,
    status:'active'
  }, {onConflict:'user_id'}).select('*').single();
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

function renderMyAccount(){
  const t = T[LANG];
  const grid = document.getElementById('myAccGrid');
  if(!grid) return;
  const icons = ['book','chart','clock','clock','briefcase','star','chart','walletIcon','shield'];
  grid.innerHTML = t.myAccSections.map((s,i)=>`
    <div class="service-card"><div class="service-icon">${ICONS[icons[i%icons.length]] || ICONS.book}</div><h4 style="font-size:.95rem;">${s}</h4></div>
  `).join('');
}
