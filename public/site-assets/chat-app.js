// Consultation chat (mounted by app/chat/page.js).
//
// Who may do what is decided by the database (RLS, 0010/0011) and the server
// (app/api/chat/*), never here:
//   * reading conversations and messages, posting text -> Supabase directly, under RLS
//   * opening / closing a conversation, read state, file uploads -> /api/chat/*
//   * the caller's role and account status -> /api/me (from the database)
// New messages arrive over Supabase Realtime, which applies the same RLS.

const APP = {
  supabase: null,
  me: null,            // { id, email, role, customerId } from /api/me
  conversation: null,  // the open conversation row
  channel: null,
  shownIds: new Set(), // message ids already on screen (realtime + own echo)
  started: false,
};

const MAX_FILE = 10 * 1024 * 1024;
const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const $ = (id) => document.getElementById(id);
const els = {
  authShell: $('authShell'),
  authForm: $('authForm'),
  email: $('email'),
  password: $('password'),
  statusText: $('statusText'),
  appShell: $('appShell'),
  userBadge: $('userBadge'),
  signOutButton: $('signOutButton'),
  appStatus: $('appStatus'),
  conversationList: $('conversationList'),
  astrologerSection: $('astrologerSection'),
  astrologerList: $('astrologerList'),
  conversationTitle: $('conversationTitle'),
  closeChatButton: $('closeChatButton'),
  messages: $('messages'),
  uploadInput: $('uploadInput'),
  messageInput: $('messageInput'),
  sendButton: $('sendButton'),
  toast: $('toast'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function setStatus(message, type = 'info', target = els.statusText) {
  target.textContent = message;
  target.dataset.type = type;
  target.classList.toggle('hidden', !message);
}
const appError = (error) => setStatus(error?.message || String(error), 'error', els.appStatus);

// Calls a server endpoint with the current access token (lib/server/auth.js).
async function api(path, { method = 'GET', json, form } = {}) {
  const { data: { session } } = await APP.supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const headers = { Authorization: `Bearer ${session.access_token}` };
  let body = form;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const response = await fetch(path, { method, headers, body });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Request failed (${response.status}).`);
  return data;
}

// ---- sign in / out --------------------------------------------------------------

async function signIn(event) {
  event.preventDefault();
  const email = els.email.value.trim();
  const password = els.password.value;
  if (!email || !password) return setStatus('Please enter your email and password.', 'error');

  setStatus('Signing in...');
  const { error } = await APP.supabase.auth.signInWithPassword({ email, password });
  if (error) setStatus(error.message || 'Sign-in failed.', 'error');
  // On success the auth listener starts the workspace.
}

async function signOut() {
  await APP.supabase.auth.signOut();
  window.location.reload();
}

async function start() {
  if (APP.started) return;
  APP.started = true;
  try {
    let me = await api('/api/me');
    if (!me.customerId && me.role === 'customer') {
      // First visit: the customer profile row (status is set by the database, 0008).
      const { data: { user } } = await APP.supabase.auth.getUser();
      const name = user?.user_metadata?.full_name || me.email.split('@')[0];
      const { error } = await APP.supabase.from('customers').insert({ user_id: me.id, full_name: name, email: me.email });
      if (error && error.code !== '23505') throw error;
      me = await api('/api/me');
    }
    APP.me = me;
  } catch (error) {
    APP.started = false;
    setStatus(error.message, 'error');
    return;
  }

  els.authShell.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  els.userBadge.textContent = `${APP.me.role.toUpperCase()} • ${APP.me.email}`;
  els.astrologerSection.classList.toggle('hidden', !APP.me.customerId);
  renderComposer();

  await Promise.all([loadConversations(true), APP.me.customerId ? loadAstrologers() : null]);
}

// ---- sidebar ----------------------------------------------------------------------

async function loadAstrologers() {
  // Public profile columns of active practitioners, the caller left out (0017).
  const { data, error } = await APP.supabase.rpc('active_practitioners');
  if (error) return appError(error);

  const cards = (data || [])
    .map((astrologer) => {
      const card = el('button', 'astrologer-card');
      card.type = 'button';
      const top = el('div', 'card-top');
      const initials = (astrologer.name || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('');
      const who = el('div');
      who.append(el('h4', '', astrologer.name || 'Astrologer'), el('p', '', astrologer.specialization || 'General Astrology'));
      top.append(el('div', 'avatar', initials), who);
      const meta = el('div', 'card-meta');
      meta.append(
        el('span', '', astrologer.languages?.length ? astrologer.languages.join(', ') : 'Nepali'),
        el('strong', '', `NPR ${Number(astrologer.consultation_fee) || 0}`),
      );
      card.append(top, meta);
      card.addEventListener('click', () => startConversation(astrologer));
      return card;
    });
  els.astrologerList.replaceChildren(...(cards.length ? cards : [el('p', 'empty', 'No astrologers are available right now.')]));
}

async function loadConversations(openLatest = false) {
  const { data, error } = await APP.supabase
    .from('chat_conversations')
    .select('id, customer_id, astrologer_id, title, status, last_message_at, closed_at, created_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return appError(error);

  const items = (data || []).map((conversation) => {
    const item = el('button', 'conversation-item');
    item.type = 'button';
    item.dataset.id = conversation.id;
    item.classList.toggle('active', conversation.id === APP.conversation?.id);
    const when = conversation.last_message_at || conversation.created_at;
    item.append(
      el('strong', '', conversationLabel(conversation)),
      el('span', '', `${conversation.status === 'active' ? 'Open' : 'Closed'} · ${formatDate(when)}`),
    );
    item.addEventListener('click', () => selectConversation(conversation));
    return item;
  });
  els.conversationList.replaceChildren(...(items.length ? items : [el('p', 'empty', 'No conversations yet.')]));

  if (openLatest && data?.length && !APP.conversation) {
    await selectConversation(data.find((c) => c.status === 'active') || data[0]);
  }
}

// The customer sees the practitioner's name (the title); the practitioner cannot read
// customer profiles, so they see a neutral label.
const conversationLabel = (conversation) =>
  conversation.customer_id === APP.me.customerId ? conversation.title || 'Astrologer' : 'Customer consultation';

async function startConversation(astrologer) {
  try {
    const { conversation } = await api('/api/chat/conversations', { method: 'POST', json: { astrologerId: astrologer.id } });
    await selectConversation(conversation);
    await loadConversations();
    showToast(`Chat opened with ${astrologer.name}`);
  } catch (error) {
    appError(error);
  }
}

// ---- conversation -----------------------------------------------------------------

async function selectConversation(conversation) {
  APP.conversation = conversation;
  setStatus('', 'info', els.appStatus);
  els.conversationTitle.textContent = conversationLabel(conversation);
  document.querySelectorAll('.conversation-item').forEach((item) => item.classList.toggle('active', item.dataset.id === conversation.id));
  renderComposer();
  subscribe(conversation.id);
  await fetchMessages();
  markRead();
}

async function fetchMessages() {
  const id = APP.conversation?.id;
  if (!id) return;
  const { data, error } = await APP.supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, body, message_type, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });
  if (error) return appError(error);
  if (APP.conversation?.id !== id) return; // switched while loading

  APP.shownIds.clear();
  els.messages.replaceChildren();
  (data || []).forEach(appendMessage);
}

function appendMessage(message) {
  if (message.conversation_id !== APP.conversation?.id || APP.shownIds.has(message.id)) return;
  APP.shownIds.add(message.id);

  const row = el('div', `message ${message.sender_id === APP.me.id ? 'mine' : 'theirs'}`);
  const bubble = el('div', 'bubble');
  if (message.message_type === 'file' || message.message_type === 'image') {
    const link = el('button', 'attachment', `📎 ${message.body || 'Attachment'}`);
    link.type = 'button';
    link.addEventListener('click', () => openAttachment(message.id));
    bubble.append(link);
  } else {
    bubble.append(el('p', '', message.body || ''));
  }
  const time = el('time', '', formatTime(message.created_at));
  time.dateTime = message.created_at;
  bubble.append(time);
  row.append(bubble);
  els.messages.append(row);
  els.messages.scrollTop = els.messages.scrollHeight;
}

// Realtime delivers only rows this user may read (RLS applies to subscriptions).
function subscribe(conversationId) {
  if (APP.channel) APP.supabase.removeChannel(APP.channel);
  APP.channel = APP.supabase
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      ({ new: message }) => {
        appendMessage(message);
        if (message.sender_id !== APP.me.id && document.visibilityState === 'visible') markRead();
      })
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_conversations', filter: `id=eq.${conversationId}` },
      ({ new: conversation }) => {
        if (conversation.id !== APP.conversation?.id) return;
        const wasOpen = isOpen(APP.conversation);
        APP.conversation = { ...APP.conversation, ...conversation };
        renderComposer();
        if (wasOpen && !isOpen(APP.conversation)) {
          showToast('This conversation was closed.');
          loadConversations();
        }
      })
    .on('system', {}, (event) => {
      // Live delivery starts here (also after a reconnect): catch up on anything sent
      // before it, e.g. while the connection was down.
      if (event.extension === 'postgres_changes' && event.status === 'ok') fetchMessages();
      else if (event.extension === 'postgres_changes') console.warn('Realtime:', event.message);
    })
    .subscribe();
}

const isOpen = (conversation) => conversation?.status === 'active';

function renderComposer() {
  const open = isOpen(APP.conversation);
  for (const control of [els.messageInput, els.sendButton, els.uploadInput, els.closeChatButton]) {
    control.disabled = !open;
  }
  els.messageInput.placeholder = !APP.conversation
    ? 'Choose a conversation to start.'
    : open ? 'Type a message...' : 'This conversation is closed.';
}

async function sendMessage() {
  const body = els.messageInput.value.trim();
  if (!body || !isOpen(APP.conversation)) return;
  if (body.length > 4000) return appError('Messages can be at most 4000 characters.');

  els.sendButton.disabled = true;
  const { data, error } = await APP.supabase
    .from('chat_messages')
    .insert({ conversation_id: APP.conversation.id, sender_id: APP.me.id, body })
    .select('id, conversation_id, sender_id, body, message_type, created_at')
    .single();
  els.sendButton.disabled = !isOpen(APP.conversation);
  if (error) return appError(error.code === '42501' ? 'This conversation is closed.' : error);

  els.messageInput.value = '';
  appendMessage(data);
}

async function closeChat() {
  if (!isOpen(APP.conversation) || !window.confirm('Close this conversation? The history stays available.')) return;
  try {
    const { conversation } = await api(`/api/chat/conversations/${APP.conversation.id}/close`, { method: 'POST' });
    APP.conversation = { ...APP.conversation, ...conversation };
    renderComposer();
    await loadConversations();
    showToast('Chat closed. History remains available.');
  } catch (error) {
    appError(error);
  }
}

async function markRead() {
  const id = APP.conversation?.id;
  if (!id) return;
  try {
    await api(`/api/chat/conversations/${id}/read`, { method: 'POST' });
  } catch (error) {
    console.warn('Could not mark the conversation as read:', error.message);
  }
}

// The server checks the real file type and size; this only saves a pointless upload.
async function uploadFile(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || !isOpen(APP.conversation)) return;
  if (!FILE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_FILE) {
    return appError('Only JPG, PNG or PDF files up to 10 MB are accepted.');
  }

  const form = new FormData();
  form.append('file', file);
  els.uploadInput.disabled = true;
  try {
    const { message } = await api(`/api/chat/conversations/${APP.conversation.id}/attachments`, { method: 'POST', form });
    appendMessage(message);
    showToast('File sent.');
  } catch (error) {
    appError(error);
  } finally {
    els.uploadInput.disabled = !isOpen(APP.conversation);
  }
}

// Files are private: fetch a short-lived link only when asked (storage RLS, 0011).
async function openAttachment(messageId) {
  const tab = window.open('', '_blank'); // opened now, so popup blockers allow it
  try {
    const { data, error } = await APP.supabase
      .from('message_attachments').select('storage_path').eq('message_id', messageId).single();
    if (error) throw error;
    const signed = await APP.supabase.storage.from('chat-attachments').createSignedUrl(data.storage_path, 60);
    if (signed.error) throw signed.error;
    if (tab) {
      tab.opener = null;
      tab.location.href = signed.data.signedUrl;
    } else {
      window.location.assign(signed.data.signedUrl);
    }
  } catch (error) {
    tab?.close();
    appError(error.message ? error : 'The file could not be opened.');
  }
}

// ---- helpers ------------------------------------------------------------------------

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
}

// ---- boot -----------------------------------------------------------------------------

(function boot() {
  const config = window.APP_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || config.supabaseUrl.includes('YOUR_PROJECT_ID')) {
    setStatus('Chat is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).', 'error');
    return;
  }
  APP.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  els.authForm.addEventListener('submit', signIn);
  els.signOutButton.addEventListener('click', signOut);
  els.sendButton.addEventListener('click', sendMessage);
  els.closeChatButton.addEventListener('click', closeChat);
  els.uploadInput.addEventListener('change', uploadFile);
  els.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) sendMessage();
  });

  // Supabase advises against awaiting its own calls inside this callback; defer them.
  APP.supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) setTimeout(start, 0);
  });
})();
