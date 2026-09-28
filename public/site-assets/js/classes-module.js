/* ============================================================
   ONLINE CLASSES + ENROLL MODULE
   Handles online class listings and enrollment requests
============================================================ */

const enrollState = { courseIndex:-1, courseName:'', name:'', phone:'', email:'', submitted:false, enrollId:null };

function renderClasses(){
  const t = T[LANG];
  setText('classesEyebrowEl', t.classesEyebrow); setText('classesTitleEl', t.classesTitle); setText('classesSubEl', t.classesSub);
  const grid = document.getElementById('classesGrid');
  if(grid){
    grid.innerHTML = t.classesList.map((c,i)=>`
      <div class="service-card">
        <div class="service-icon">${ICONS[c[2]] || ICONS.book}</div>
        <h4>${c[0]}</h4><p>${c[1]}</p>
        <div style="font-size:.78rem;color:var(--ink-soft);margin:8px 0;">
          <div><b>${t.lblInstructor}:</b> ${t.profName}</div>
          <div><b>${t.lblDuration}:</b> ${t.durationTBD}</div>
          <div><b>${t.lblLevel}:</b> ${t.levelAllLabel}</div>
        </div>
        <div class="service-meta"><span class="price-pill">${t.pricePlaceholder}</span>
        <a href="#" class="btn btn-gold" style="padding:8px 16px;font-size:.8rem;" onclick="openEnroll(${i}); return false;">${t.enrollBtn}</a></div>
      </div>`).join('');
  }
  renderEnrollPanel();
}

function openEnroll(courseIndex){
  const t = T[LANG];
  enrollState.courseIndex = courseIndex;
  enrollState.courseName = t.classesList[courseIndex] ? t.classesList[courseIndex][0] : '';
  enrollState.submitted = false;
  renderEnrollPanel();
  document.getElementById('enrollPanelWrap')?.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderEnrollPanel(){
  const t = T[LANG];
  const panel = document.getElementById('enrollPanel');
  if(!panel) return;
  if(enrollState.submitted){
    panel.innerHTML = `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><h3>${t.enrollSuccessTitle}</h3><p>${t.enrollSuccessNote}</p>
      <div class="booking-id">${t.orderIdLabel}: ${enrollState.enrollId}</div>
      <div style="margin-top:16px;"><button class="btn btn-ghost" onclick="resetEnroll()">${t.newBooking}</button></div></div>`;
    return;
  }
  if(enrollState.courseIndex<0){
    panel.innerHTML = `<p style="text-align:center;color:var(--ink-soft);">${t.selectProductFirst}</p>`;
    return;
  }
  const l = t.labels;
  panel.innerHTML = `
    <h3>${t.enrollFormTitle}</h3>
    <div class="review-row"><span>${t.enrollCourseLabel}</span><b>${enrollState.courseName}</b></div>
    <div class="form-grid cols-2" style="margin-top:14px;">
      <div class="field"><label>${l.name} *</label><input type="text" value="${escapeHtml(enrollState.name)}" oninput="enrollState.name=this.value"></div>
      <div class="field"><label>${l.phone} *</label><input type="text" value="${escapeHtml(enrollState.phone)}" oninput="enrollState.phone=this.value"></div>
      <div class="field"><label>${l.email} *</label><input type="email" value="${escapeHtml(enrollState.email)}" oninput="enrollState.email=this.value"></div>
    </div>
    <button class="btn btn-gold btn-block" style="margin-top:16px;" onclick="submitEnroll()">${t.enrollSubmitBtn}</button>
  `;
}

async function submitEnroll(){
  const t = T[LANG];
  if(!enrollState.name.trim() || !enrollState.phone.trim() || !enrollState.email.trim()){ showToast(T[LANG].validationRequired); return; }
  if(!isValidEmail(enrollState.email) || !isValidPhone(enrollState.phone)){ showToast(LANG==='ne'?'कृपया मान्य इमेल र फोन नम्बर लेख्नुहोस्।':'Please enter a valid email and phone number.'); return; }
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random()*9000+1000));
  enrollState.enrollId = `JVS-CLS-${year}-${seq}`;
  enrollState.submitted = true;
  const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
  if (storageOk) {
    const key = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.enroll) || 'enroll_';
    await window.JYOTISH_HELPERS.safeStorageSet(key + enrollState.enrollId, JSON.stringify(enrollState));
  }
  showToast(t.enrollSuccessTitle);
  renderEnrollPanel();
}

function resetEnroll(){
  Object.assign(enrollState, { courseIndex:-1, courseName:'', name:'', phone:'', email:'', submitted:false, enrollId:null });
  renderEnrollPanel();
}
