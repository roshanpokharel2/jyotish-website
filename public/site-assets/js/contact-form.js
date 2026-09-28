/* ============================================================
   CONTACT FORM MODULE
   Handles contact form submission and state management
============================================================ */

const contactState = { name:'',phone:'',email:'',subject:'',service:'',message:'', submitted:false, error:'' };

function renderContactForm(){
  const t = T[LANG]; const l = t.labels;
  const panel = document.getElementById('contactFormPanel');
  if(contactState.submitted){
    panel.innerHTML = `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><p>${t.contactSuccess}</p>
      <button class="btn btn-ghost" onclick="resetContact()">${t.newBooking}</button></div>`;
    return;
  }
  const errorHtml = contactState.error ? `<p style="color:var(--maroon);font-weight:600;font-size:.85rem;margin-top:12px;">${escapeHtml(contactState.error)}</p>` : '';
  panel.innerHTML = `
    <div class="field"><label>${l.name} *</label><input id="cName" value="${escapeHtml(contactState.name)}" oninput="contactState.name=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.phone}</label><input id="cPhone" value="${escapeHtml(contactState.phone)}" oninput="contactState.phone=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.email} *</label><input type="email" id="cEmail" value="${escapeHtml(contactState.email)}" oninput="contactState.email=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.subject} *</label><input id="cSubject" value="${escapeHtml(contactState.subject)}" oninput="contactState.subject=this.value"></div>
    <div class="field" style="margin-top:12px;"><label>${l.message} *</label><textarea rows="4" id="cMessage" oninput="contactState.message=this.value">${escapeHtml(contactState.message)}</textarea></div>
    ${errorHtml}
    <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="submitContact()">${t.contactSubmit}</button>
  `;
}

async function submitContact(){
  const t = T[LANG];
  if(!contactState.name.trim() || !contactState.email.trim() || !contactState.subject.trim() || !contactState.message.trim()){
    contactState.error = T[LANG].validationRequired; renderContactForm(); return;
  }
  if(!isValidEmail(contactState.email)){ contactState.error = LANG==='ne' ? 'कृपया मान्य इमेल लेख्नुहोस्।' : 'Please enter a valid email address.'; renderContactForm(); return; }
  if(!isValidPhone(contactState.phone)){ contactState.error = LANG==='ne' ? 'कृपया मान्य फोन नम्बर लेख्नुहोस्।' : 'Please enter a valid phone number.'; renderContactForm(); return; }
  contactState.error = '';
  contactState.submitted = true;
  if (typeof saveAuthenticatedSubmission === 'function') await saveAuthenticatedSubmission('contact', contactState);
  showToast(t.toastContact);
  renderContactForm();
}

function resetContact(){
  Object.assign(contactState, { name:'',phone:'',email:'',subject:'',service:'',message:'', submitted:false, error:'' });
  renderContactForm();
}
