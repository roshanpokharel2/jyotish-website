/* ============================================================
   IN-SITE CHAT WIDGET MODULE
   Handles in-site chat interface and message handling
============================================================ */

let chatWidgetOpen = false;
let chatWidgetMessages = []; // {from:'bot'|'user', text}
let chatWidgetWelcomed = false;

function toggleChatWidget(show){
  chatWidgetOpen = show;
  const el = document.getElementById('chatWidget');
  if(el) el.style.display = show ? 'flex' : 'none';
  if(show && !chatWidgetWelcomed){
    chatWidgetMessages.push({from:'bot', text: T[LANG].chatWelcomeMsg});
    chatWidgetWelcomed = true;
  }
  renderChatWidgetStatic();
  renderChatWidgetBody();
  if(show){ document.getElementById('chatWidgetInput')?.focus(); }
}

function renderChatWidgetStatic(){
  const t = T[LANG];
  setText('chatWidgetTitleEl', t.brand);
  setText('chatWidgetSubtitleEl', t.chatWidgetSubtitle);
  setText('chatBotBadgeEl', t.chatBotBadge);
  setText('chatTalkHumanBtnEl', t.chatTalkHumanBtn);
  const input = document.getElementById('chatWidgetInput');
  if(input) input.placeholder = t.chatInputPlaceholder;
}

function renderChatWidgetBody(){
  const body = document.getElementById('chatWidgetBody');
  if(!body) return;
  body.innerHTML = chatWidgetMessages.map(m=>`<div class="chat-bubble ${m.from}">${m.text.replace(/</g,'&lt;')}</div>`).join('');
  body.scrollTop = body.scrollHeight;
}

async function sendChatWidgetMessage(){
  const input = document.getElementById('chatWidgetInput');
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  chatWidgetMessages.push({from:'user', text});
  input.value = '';
  renderChatWidgetBody();
  const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
  if (storageOk) {
    const chatKey = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.chat) || 'site_chat_';
    await window.JYOTISH_HELPERS.safeStorageSet(chatKey + Date.now(), JSON.stringify({text, lang:LANG}));
  }

  // typing indicator
  chatWidgetMessages.push({from:'bot', text:'…', _typing:true});
  renderChatWidgetBody();

  const history = chatWidgetMessages
    .filter(m => !m._typing)
    .map(m => ({ role: m.from==='user' ? 'user' : 'assistant', content: m.text }));

  const aiReply = await getAiChatReply(history);

  // remove typing indicator
  chatWidgetMessages = chatWidgetMessages.filter(m => !m._typing);

  if(aiReply){
    chatWidgetMessages.push({from:'bot', text: aiReply});
  } else {
    const matched = matchChatbotIntent(text, LANG);
    chatWidgetMessages.push({from:'bot', text: matched || CHATBOT_FALLBACK[LANG] || CHATBOT_FALLBACK.en});
  }
  renderChatWidgetBody();
}

function connectChatToWhatsApp(){
  const waText = chatWidgetMessages.filter(m=>m.from==='user').map(m=>m.text).join('\n');
  const waNumber = (SITE_CONFIG.whatsappNumber || '9779851001890');
  const waUrl = 'https://wa.me/' + waNumber + (waText ? ('?text=' + encodeURIComponent(waText)) : '');
  window.open(waUrl, '_blank');
}
