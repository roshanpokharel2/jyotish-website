const APP = {
  supabase: null,
  conversationId: null,
  userRole: 'customer',
  currentUserId: null,
  currentAstrologerId: null,
};

const els = {
  authMode: document.getElementById('authMode'),
  authForm: document.getElementById('authForm'),
  authTitle: document.getElementById('authTitle'),
  submitText: document.getElementById('submitText'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  fullName: document.getElementById('fullName'),
  role: document.getElementById('role'),
  statusText: document.getElementById('statusText'),
  appShell: document.getElementById('appShell'),
  authShell: document.getElementById('authShell'),
  astrologerList: document.getElementById('astrologerList'),
  conversationTitle: document.getElementById('conversationTitle'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
  closeChatButton: document.getElementById('closeChatButton'),
  uploadInput: document.getElementById('uploadInput'),
  userBadge: document.getElementById('userBadge'),
  toast: document.getElementById('toast'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function setStatus(message, type = 'info') {
  els.statusText.textContent = message;
  els.statusText.dataset.type = type;
}

function initConfig() {
  if (!window.APP_CONFIG || !window.APP_CONFIG.supabaseUrl || !window.APP_CONFIG.supabaseAnonKey) {
    setStatus('Add your Supabase project URL and anon key in config.js before running the app.', 'error');
    return false;
  }
  return true;
}

function initSupabase() {
  APP.supabase = window.supabase.createClient(
    window.APP_CONFIG.supabaseUrl,
    window.APP_CONFIG.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

function toggleAuthMode() {
  const mode = els.authMode.value;
  const isCustomer = mode === 'customer';
  els.authTitle.textContent = isCustomer ? 'Customer access' : 'Astrologer access';
  els.submitText.textContent = isCustomer ? 'Sign in as customer' : 'Sign in as astrologer';
  els.role.value = mode;
  els.fullName.closest('.field').style.display = isCustomer ? 'none' : 'block';
}

async function signInOrUp(event) {
  event.preventDefault();
  const mode = els.authMode.value;
  const email = els.email.value.trim();
  const password = els.password.value.trim();

  if (!email || !password) {
    setStatus('Please enter an email and password.', 'error');
    return;
  }

  setStatus('Authenticating...', 'info');

  try {
    const { data, error } = await APP.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const signUpResult = await APP.supabase.auth.signUp({ email, password });
      if (signUpResult.error) {
        throw signUpResult.error;
      }
      setStatus('Account created. Please check your email to confirm sign-up if required.', 'success');
      return;
    }

    const user = data.user;
    APP.currentUserId = user.id;
    APP.userRole = mode;
    setStatus('Login successful. Loading your chat workspace...', 'success');
    await prepareAfterAuth();
  } catch (error) {
    setStatus(error.message || 'Authentication failed.', 'error');
  }
}

async function prepareAfterAuth() {
  const { data: { user } } = await APP.supabase.auth.getUser();
  if (!user) return;

  APP.currentUserId = user.id;
  els.authShell.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  els.userBadge.textContent = `${APP.userRole.toUpperCase()} • ${user.email}`;

  await loadAstrologers();
  await syncUserRoleRecord();
  await loadExistingConversation();
}

async function syncUserRoleRecord() {
  if (APP.userRole === 'customer') {
    const { data: customer } = await APP.supabase
      .from('customers')
      .select('*')
      .eq('user_id', APP.currentUserId)
      .maybeSingle();

    if (!customer) {
      const { error } = await APP.supabase.from('customers').insert({
        user_id: APP.currentUserId,
        full_name: 'Customer User',
        phone: '0000000000',
        status: 'active',
      });

      if (error) {
        console.error(error);
      }
    }
  }
}

async function loadAstrologers() {
  const { data, error } = await APP.supabase
    .from('astrologers')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error(error);
    return;
  }

  els.astrologerList.innerHTML = '';

  data.forEach((astrologer) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'astrologer-card';
    button.innerHTML = `
      <div class="card-top">
        <div class="avatar">${escapeHtml((astrologer.name || 'A').split(' ').map((p) => p[0]).slice(0, 2).join(''))}</div>
        <div>
          <h4>${escapeHtml(astrologer.name || 'Astrologer')}</h4>
          <p>${escapeHtml(astrologer.specialization || 'General Astrology')}</p>
        </div>
      </div>
      <div class="card-meta">
        <span>${escapeHtml(astrologer.languages ? astrologer.languages.join(', ') : 'Nepali / English')}</span>
        <strong>NPR ${Number.isFinite(Number(astrologer.consultation_fee)) ? Number(astrologer.consultation_fee) : 600}</strong>
      </div>
    `;

    button.addEventListener('click', async () => {
      APP.currentAstrologerId = astrologer.user_id;
      await openConversation(astrologer);
    });

    els.astrologerList.appendChild(button);
  });
}

async function openConversation(astrologer) {
  const conversationName = `${astrologer.name}`;
  els.conversationTitle.textContent = conversationName;

  const { data: existing, error } = await APP.supabase
    .from('chat_conversations')
    .select('*')
    .eq('consultation_id', null)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  let conversation;

  const { data: currentConversations, error: convError } = await APP.supabase
    .from('chat_conversations')
    .select('*')
    .in('status', ['active', 'open'])
    .order('updated_at', { ascending: false });

  if (convError) {
    console.error(convError);
  }

  const sameConversation = (currentConversations || []).find((c) => {
    const participants = c.participants || [];
    return participants.includes(APP.currentUserId) && participants.includes(astrologer.user_id);
  });

  if (sameConversation) {
    conversation = sameConversation;
  } else {
    const conversationData = {
      title: conversationName,
      status: 'active',
      is_active: true,
      last_message_at: new Date().toISOString(),
      customer_id: APP.currentUserId,
      astrologer_id: astrologer.user_id,
    };

    const { data: inserted, error: insertError } = await APP.supabase
      .from('chat_conversations')
      .insert(conversationData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    conversation = inserted;

    await APP.supabase.from('chat_participants').insert([
      { conversation_id: conversation.id, user_id: APP.currentUserId, role: 'customer', is_active: true },
      { conversation_id: conversation.id, user_id: astrologer.user_id, role: 'astrologer', is_active: true },
    ]);
  }

  APP.conversationId = conversation.id;
  await fetchMessages();
  subscribeToConversation();
  showToast(`Chat opened with ${conversationName}`);
}

async function loadExistingConversation() {
  const { data } = await APP.supabase
    .from('chat_conversations')
    .select('*')
    .eq('customer_id', APP.currentUserId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (data && data[0]) {
    APP.conversationId = data[0].id;
    els.conversationTitle.textContent = data[0].title || 'Conversation';
    await fetchMessages();
    subscribeToConversation();
  }
}

async function fetchMessages() {
  if (!APP.conversationId) return;

  const { data, error } = await APP.supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', APP.conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  els.messages.innerHTML = '';

  data.forEach((message) => {
    const item = document.createElement('div');
    item.className = `message ${message.sender_id === APP.currentUserId ? 'mine' : 'theirs'}`;
    item.innerHTML = `
      <div class="bubble">
        <p>${escapeHtml(message.body || '')}</p>
        <time>${formatTime(message.created_at)}</time>
      </div>
    `;
    els.messages.appendChild(item);
  });

  els.messages.scrollTop = els.messages.scrollHeight;
}

function subscribeToConversation() {
  if (!APP.conversationId) return;

  if (APP.subscription) {
    APP.supabase.removeChannel(APP.subscription);
  }

  APP.subscription = APP.supabase.channel(`conversation-${APP.conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${APP.conversationId}` },
      async (payload) => {
        await fetchMessages();
      }
    )
    .subscribe();
}

async function sendMessage() {
  const body = els.messageInput.value.trim();
  if (!body || !APP.conversationId) {
    return;
  }

  const payload = {
    conversation_id: APP.conversationId,
    sender_id: APP.currentUserId,
    body,
    message_type: 'text',
    status: 'sent',
  };

  const { error } = await APP.supabase.from('chat_messages').insert(payload);
  if (error) {
    setStatus(error.message, 'error');
    return;
  }

  els.messageInput.value = '';
  await APP.supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
    .eq('id', APP.conversationId);
}

async function closeChat() {
  if (!APP.conversationId) return;

  const { error } = await APP.supabase
    .from('chat_conversations')
    .update({
      status: 'closed',
      is_active: false,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', APP.conversationId);

  if (!error) {
    showToast('Chat closed. History remains available.');
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file || !APP.conversationId) return;
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    setStatus('Only JPG, PNG, or PDF files up to 10 MB are accepted.', 'error');
    event.target.value = '';
    return;
  }

  const fileName = `${APP.conversationId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { data, error } = await APP.supabase.storage
    .from('chat-attachments')
    .upload(fileName, file, { upsert: false });

  if (error) {
    setStatus(error.message, 'error');
    return;
  }

  const { error: messageError } = await APP.supabase.from('chat_messages').insert({
    conversation_id: APP.conversationId,
    sender_id: APP.currentUserId,
    body: `Attachment: ${file.name}`,
    message_type: 'file',
    status: 'sent',
  });

  if (messageError) {
    setStatus(messageError.message, 'error');
    return;
  }

  showToast('File uploaded and attached to chat.');
  event.target.value = '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function initAuthListener() {
  APP.supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      APP.currentUserId = session.user.id;
      await prepareAfterAuth();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!initConfig()) return;
  initSupabase();
  toggleAuthMode();
  els.authMode.addEventListener('change', toggleAuthMode);
  els.authForm.addEventListener('submit', signInOrUp);
  els.sendButton.addEventListener('click', sendMessage);
  els.closeChatButton.addEventListener('click', closeChat);
  els.uploadInput.addEventListener('change', handleFileUpload);
  els.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  await initAuthListener();
});
