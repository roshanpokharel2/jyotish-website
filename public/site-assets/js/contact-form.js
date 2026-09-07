/* ============================================================
   CONTACT FORM MODULE
   Handles contact form submission and state management
============================================================ */

const contactState = { name:'',phone:'',email:'',subject:'',service:'',message:'', submitted:false };

function renderContactForm(){
  const t = T[LANG]; const l = t.labels;
  const panel = document.getElementById('contactFormPanel');
  if(contactState.submitted){
    panel.innerHTML = `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><p>${t.contactSuccess}</p>
      <button class="btn btn-ghost" onclick="resetContact()">${t.newBooking}</button></div>`;
    return;
  }
  panel.innerHTML = `
    <div class="field"><label>${l.name}</label><input id="cName" value="${contactState.name}" oninput="contactState.name=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.phone}</label><input id="cPhone" value="${contactState.phone}" oninput="contactState.phone=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.email}</label><input type="email" id="cEmail" value="${contactState.email}" oninput="contactState.email=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.subject}</label><input id="cSubject" value="${contactState.subject}" oninput="contactState.subject=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.message}</label><textarea rows="4" id="cMessage" oninput="contactState.message=this.value">${contactState.message}</textarea></div>
    <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="submitContact()">${t.contactSubmit}</button>
  `;
}

async function submitContact(){
  const t = T[LANG];
  contactState.submitted = true;
  const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
  if (storageOk) {
    const key = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.contact) || 'contact_';
    await window.JYOTISH_HELPERS.safeStorageSet(key + Date.now(), JSON.stringify(contactState));
  }
  showToast(t.toastContact);
  renderContactForm();
}

function resetContact(){
  Object.assign(contactState, { name:'',phone:'',email:'',subject:'',service:'',message:'', submitted:false });
  renderContactForm();
}
