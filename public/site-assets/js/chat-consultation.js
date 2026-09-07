/* ============================================================
   CHAT CONSULTATION MODULE
   Handles chat booking flow with details + payment steps
============================================================ */

const chatState = { step:1, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'', paymentAttested:false, paymentRef:'', confirmed:false, chatId:null, _error:null };

function chatTopStep(){
  if(chatState.confirmed) return 3;
  if(chatState.step>=2) return 2;
  return 1;
}

function renderChat(){
  const t = T[LANG];
  renderTopStepBar('chatStepsBar', chatTopStep());
  const panel = document.getElementById('chatPanel');
  if(!panel) return;

  if(chatState.confirmed){
    panel.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-check">${ICONS.check}</div>
        <h3>${t.chatBookedMsg}</h3>
        <div class="disclaimer-box" style="text-align:left;margin:14px 0;"><b>${t.payPendingBadge}</b><br>${t.payPendingNote}<br><br>${t.chatActivateNote}</div>
        <div class="booking-id">${t.bookingIdLabel}: ${chatState.chatId}</div>
        <div style="margin-top:20px;"><button class="btn btn-ghost" onclick="resetChat()">${t.newBooking}</button></div>
      </div>`;
    return;
  }

  let html = '';
  let errorHtml = chatState._error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:10px;">${chatState._error}</p>` : '';

  if(chatState.step===1){
    html += renderDetailsFieldsHtml('chat', chatState, t, false);
  } else if(chatState.step===2){
    html += renderPaymentStepHtmlFor('chat', t, t.feeChat, chatState);
  }

  panel.innerHTML = html + errorHtml + `<div class="booking-nav">
    <button class="btn btn-ghost" onclick="chatBack()" ${chatState.step===1?'style="visibility:hidden;"':''}>${t.back}</button>
    <button class="btn btn-gold" onclick="chatNext()">${chatState.step===2?t.confirmBooking:t.next}</button>
  </div>`;
}

function chat_setAttested(checked){ chatState.paymentAttested = checked; chatState._error=null; }
function chat_setPaymentRef(val){ chatState.paymentRef = val; }

function chatBack(){ if(chatState.step>1){ chatState.step--; chatState._error=null; renderChat(); } }

async function chatNext(){
  if(chatState.step===1){
    if(!detailsValid(chatState)){
      chatState._error = T[LANG].validationRequired;
      renderChat();
      return;
    }
    chatState.step = 2; chatState._error = null; renderChat();
    return;
  }
  if(chatState.step===2){
    if(!chatState.paymentAttested){
      chatState._error = T[LANG].payAttestRequired;
      renderChat();
      return;
    }
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random()*9000+1000));
    chatState.chatId = `JVS-CHAT-${year}-${seq}`;
    chatState.confirmed = true;
    const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
    if (storageOk) {
      const key = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.chatConsult) || 'chat_';
      await window.JYOTISH_HELPERS.safeStorageSet(key + chatState.chatId, JSON.stringify(chatState));
    }
    renderChat();
  }
}

function resetChat(){
  Object.assign(chatState, { step:1, name:'',phone:'',email:'',dobBsYear:'',dobBsMonth:'',dobBsDay:'',dobAd:'',tob:'',pob:'',birthCountry:'', paymentAttested:false, paymentRef:'', confirmed:false, chatId:null, _error:null });
  renderChat();
}
