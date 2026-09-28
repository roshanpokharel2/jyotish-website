/* ============================================================
   VASTU UPLOAD & ANNOTATION MODULE
   Handles plan uploads, canvas-based pin annotation, and submission
============================================================ */

const vcState = { img:null, naturalW:0, naturalH:0, pins:[], pendingXY:null };
const vastuState = { serviceType:'house', topic:'', files:[], projectId:null, hint:null, fullUnlocked:false };
const vastuDirectionOptions = ['North','South','East','West','North-East','North-West','South-East','South-West'];
const vastuServiceTypes = [
  {id:'house',ne:'घर वास्तु',en:'House Vastu'}, {id:'business',ne:'व्यवसाय वास्तु',en:'Business Vastu'},
  {id:'office',ne:'कार्यालय वास्तु',en:'Office Vastu'}, {id:'land',ne:'जग्गा / फिल्ड वास्तु',en:'Land / Field Vastu'},
  {id:'room',ne:'कोठा वास्तु',en:'Room Vastu'}, {id:'personal',ne:'व्यक्तिगत ऊर्जा',en:'Personal Energy'}, {id:'other',ne:'अन्य वास्तु सेवा',en:'Other Vastu Services'}
];

function vastuText(ne,en){ return LANG==='en' ? en : ne; }
function vastuEsc(value){ return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
async function renderVastuPlatform(){
  const planGrid = document.getElementById('vastuPlanGrid');
  if(planGrid){
    const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
    const response = client ? await client.from('vastu_plans').select('id,name,description,amount,currency').eq('active',true).order('amount') : {data:[]};
    const plans = response.data || [];
    if(!plans.length){ planGrid.innerHTML = ''; }
    else planGrid.innerHTML = plans.map((plan,i)=>{ const name=typeof plan.name==='object'?(plan.name[LANG]||plan.name.en||plan.name.ne):plan.name; const description=typeof plan.description==='object'?(plan.description[LANG]||plan.description.en||plan.description.ne):plan.description; return `<div class="service-card"><div class="service-icon">${ICONS[i===2?'star':i===1?'chart':'compass']}</div><h4>${vastuEsc(name)}</h4><p>${vastuEsc(description)}</p><strong>${vastuEsc(plan.currency)} ${Number(plan.amount).toLocaleString()}</strong><br><button class="btn btn-ghost" onclick="vastuSelectPlan('${plan.id}')">${vastuText('छान्नुहोस्','Choose')}</button></div>`; }).join('');
  }
  const service = document.getElementById('vastuServiceType');
  if(service) service.innerHTML = vastuServiceTypes.map(item=>`<option value="${item.id}" ${item.id===vastuState.serviceType?'selected':''}>${LANG==='en'?item.en:item.ne}</option>`).join('');
  const topic = document.getElementById('vastuTopic');
  if(topic && Array.isArray(window.VASTU_SERVICES_DETAILED || VASTU_SERVICES_DETAILED)){
    topic.innerHTML = VASTU_SERVICES_DETAILED.map((item,index)=>`<option value="${index}" ${String(index)===String(vastuState.topic)?'selected':''}>${item[LANG] || item.en}</option>`).join('');
    if(!vastuState.topic) vastuState.topic='0';
  }
  const direction = document.getElementById('vastuEntranceDirection');
  if(direction) direction.innerHTML = vastuDirectionOptions.map(item=>`<option>${item}</option>`).join('');
  const status = document.getElementById('vastuConstructionStatus');
  if(status) status.innerHTML = [vastuText('निर्माण अघि','Pre-construction'),vastuText('निर्माण भइरहेको','Under construction'),vastuText('निर्माण सम्पन्न','Completed')].map(item=>`<option>${item}</option>`).join('');
  renderVastuProjects();
}

async function renderVastuProjects(){
  const panel = document.getElementById('vastuProjectsPanel');
  if(!panel) return;
  const title = vastuText('मेरो वास्तु परियोजनाहरू','My Vastu Projects');
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client || !mainCustomer?.id){ panel.innerHTML = ''; return; }
  const {data,error} = await client.from('vastu_projects').select('id,property_type,service_type,status,created_at').eq('customer_id',mainCustomer.id).order('created_at',{ascending:false});
  if(error){ panel.innerHTML=''; return; }
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;"><h3>${title}</h3><button class="btn btn-gold" onclick="document.getElementById('vastuProjectStart').scrollIntoView({behavior:'smooth'})">+ ${vastuText('नयाँ विश्लेषण','New Analysis')}</button></div>` + (data?.length ? `<div class="card-grid cols-3">${data.map(item=>`<div class="service-card"><h4>${vastuEsc(item.property_type)}</h4><p>${vastuEsc(item.service_type)}<br>${vastuEsc(item.status)}</p></div>`).join('')}</div>` : `<div class="empty-box"><p>${vastuText('अहिलेसम्म परियोजना छैन।','No projects yet.')}</p></div>`);
}

function vastuSelectPlan(planIndex){
  vastuState.plan = planIndex;
  document.getElementById('vastuProjectStart')?.scrollIntoView({behavior:'smooth'});
  const notice = document.getElementById('vastuUploadNotice');
  if(notice) notice.textContent = vastuText('छानिएको योजना: पूर्ण विश्लेषण भुक्तानी पुष्टि भएपछि मात्र खुल्नेछ।','Selected plan: full analysis unlocks only after verified payment.');
}

function handlePlanUpload(e){
  const files = [...(e.target.files || [])];
  const valid = files.filter(file=>['image/jpeg','image/png','application/pdf'].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024).slice(0,5);
  vastuState.files = valid;
  document.getElementById('planFileName').textContent = valid.length ? valid.map(file=>`✓ ${file.name}`).join(' · ') : '';
  if(!valid.length) return;
  const firstImage = valid.find(file=>file.type.startsWith('image/'));
  if(firstImage){
    loadVcImage(firstImage);
  } else {
    // PDF or other: no canvas preview available, keep upload-only
    vcState.img = null; vcState.pins = [];
    const wrap = document.getElementById('vcCanvasWrap');
    const msg = document.getElementById('vcNoPlanMsg');
    if(wrap) wrap.style.display = 'none';
    if(msg){ msg.style.display='block'; msg.textContent = (LANG==='ne'?'PDF फाइलमा प्रत्यक्ष एनोटेसन उपलब्ध छैन — फाइल प्राप्त भइसक्यो, ज्योतिषीले पछि खोल्नुहुनेछ। एनोटेसन उपकरणका लागि JPG/PNG अपलोड गर्नुहोस्।':LANG==='hi'?'PDF फ़ाइल में सीधे एनोटेशन उपलब्ध नहीं है — फ़ाइल प्राप्त हो गई है, ज्योतिषी बाद में इसे खोलेंगे। एनोटेशन टूल हेतु JPG/PNG अपलोड करें।':LANG==='sa'?'PDF-सञ्चिकायां प्रत्यक्षम् एनोटेशनं न उपलभ्यते — सञ्चिका प्राप्ता, ज्योतिषी पश्चात् उद्घाटयिष्यति। एनोटेशन-साधनार्थं JPG/PNG प्रेषयन्तु।':"Direct annotation is not available for PDF files - the file has been received and our astrologer will open it separately. Upload a JPG/PNG to use the annotation tool.");
    }
  }
  const notice = document.getElementById('vastuUploadNotice');
  if(notice) notice.textContent = files.length===valid.length ? vastuText('फाइलहरू intake का लागि तयार छन्।','Files are ready for project intake.') : vastuText('JPG, PNG वा PDF मात्र र प्रत्येक फाइल १० MB भन्दा कम हुनुपर्छ।','Only JPG, PNG or PDF files under 10 MB each are accepted.');
}

function loadVcImage(file){
  const reader = new FileReader();
  reader.onload = function(ev){
    const img = new Image();
    img.onload = function(){
      vcState.img = img;
      vcState.naturalW = img.naturalWidth;
      vcState.naturalH = img.naturalHeight;
      vcState.pins = [];
      document.getElementById('vcNoPlanMsg').style.display = 'none';
      document.getElementById('vcCanvasWrap').style.display = 'block';
      redrawVcCanvas();
      renderVcPinsList();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function redrawVcCanvas(){
  const canvas = document.getElementById('vcCanvas');
  if(!canvas || !vcState.img) return;
  const maxW = 900;
  const scale = vcState.naturalW > maxW ? maxW / vcState.naturalW : 1;
  canvas.width = Math.round(vcState.naturalW * scale);
  canvas.height = Math.round(vcState.naturalH * scale);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(vcState.img, 0, 0, canvas.width, canvas.height);
  vcState.pins.forEach((p,i)=>{
    const x = p.x * canvas.width, y = p.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI*2);
    ctx.fillStyle = '#b8892b';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#12203f'; ctx.stroke();
    ctx.fillStyle = '#12203f';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i+1), x, y);
  });
  if(vcState.pendingXY){
    const x = vcState.pendingXY.x * canvas.width, y = vcState.pendingXY.y * canvas.height;
    ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2);
    ctx.strokeStyle = '#7a2331'; ctx.lineWidth = 2.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  }
}

function vcCanvasClick(e){
  const canvas = document.getElementById('vcCanvas');
  if(!canvas || !vcState.img) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX, cy = (e.clientY - rect.top) * scaleY;
  vcState.pendingXY = { x: cx / canvas.width, y: cy / canvas.height };
  document.getElementById('vcRoomInput').value = '';
  document.getElementById('vcNoteInput').value = '';
  document.getElementById('vcPinForm').style.display = 'block';
  redrawVcCanvas();
}

async function saveVcPin(){
  if(!vcState.pendingXY) return;
  const room = document.getElementById('vcRoomInput').value.trim();
  const note = document.getElementById('vcNoteInput').value.trim();
  if(!room && !note){ document.getElementById('vcPinForm').style.display='none'; vcState.pendingXY=null; redrawVcCanvas(); return; }
  vcState.pins.push({ x: vcState.pendingXY.x, y: vcState.pendingXY.y, room, note });
  vcState.pendingXY = null;
  document.getElementById('vcPinForm').style.display = 'none';
  redrawVcCanvas();
  renderVcPinsList();
}

function deleteVcPin(i){
  vcState.pins.splice(i,1);
  redrawVcCanvas();
  renderVcPinsList();
}

function clearVcPins(){
  vcState.pins = [];
  redrawVcCanvas();
  renderVcPinsList();
}

function downloadVcCanvas(){
  const canvas = document.getElementById('vcCanvas');
  if(!canvas || !vcState.img) return;
  const a = document.createElement('a');
  a.download = 'vastu-annotated-plan.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

function renderVcPinsList(){
  const t = T[LANG];
  const list = document.getElementById('vcPinsList');
  if(!list) return;
  if(!vcState.pins.length){
    list.innerHTML = `<p style="color:var(--ink-soft);font-size:.86rem;">${t.vcNoPins}</p>`;
    return;
  }
  list.innerHTML = vcState.pins.map((p,i)=>`
    <div class="review-row" style="align-items:flex-start;">
      <span><b style="color:var(--gold);">#${i+1}</b> &nbsp; <b>${p.room||'—'}</b> — ${p.note||''}</span>
      <a href="#" onclick="deleteVcPin(${i});return false;" style="color:var(--maroon);font-weight:700;flex-shrink:0;">${t.vcDelete}</a>
    </div>`).join('');
}

async function submitVastu(){
  const t = T[LANG];
  if(!vastuState.files.length){ showToast(vastuText('कृपया नक्सा वा फोटो Upload गर्नुहोस्।','Please upload a map or photo.')); return; }
  const requiredFields = [
    ['vLocation','कृपया स्थान लेख्नुहोस्।','Please enter the property location.'],
    ['vProblem','कृपया समस्या वा आवश्यकताको विवरण लेख्नुहोस्।','Please describe the problem or requirement.']
  ];
  const missingField = requiredFields.find(([id]) => !document.getElementById(id)?.value.trim());
  if(missingField){ showToast(vastuText(missingField[1],missingField[2])); document.getElementById(missingField[0])?.focus(); return; }
  const floors = Number(document.getElementById('vFloors')?.value);
  if(!Number.isInteger(floors) || floors < 1 || floors > 200){ showToast(vastuText('तल संख्या १ देखि २०० बीचमा हुनुपर्छ।','Floors must be a whole number between 1 and 200.')); return; }
  const record = {
    direction: document.getElementById('vDirection').value,
    buildingType: document.getElementById('vBuildingType').value,
    location: document.getElementById('vLocation').value,
    floors: document.getElementById('vFloors').value,
    problem: document.getElementById('vProblem').value,
    serviceType: document.getElementById('vastuServiceType').value,
    topic: document.getElementById('vastuTopic').value,
    entranceDirection: document.getElementById('vastuEntranceDirection').value,
    constructionStatus: document.getElementById('vastuConstructionStatus').value,
    directions: collectVastuDirectionFields(),
    files: vastuState.files.map(file=>({name:file.name,type:file.type,size:file.size})),
    ts: Date.now()
  };
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(client && mainCustomer?.id){
    const result = await client.from('vastu_projects').insert({customer_id:mainCustomer.id,property_type:record.buildingType,service_type:record.serviceType,topic:record.topic,property_details:record}).select('id').single();
    if(result.error){ showToast(result.error.message); return; }
    vastuState.projectId = result.data.id;
    for(const file of vastuState.files){
      const path = `${mainAuthUser.id}/${vastuState.projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const upload = await client.storage.from('vastu-files').upload(path,file,{upsert:false,contentType:file.type});
      if(upload.error){ showToast(vastuText('फाइल सुरक्षित गर्न सकिएन। Storage bucket जाँच गर्नुहोस्।','File storage failed. Check the configured storage bucket.')); return; }
      const saved = await client.from('vastu_files').insert({project_id:vastuState.projectId,customer_id:mainCustomer.id,storage_path:path,file_name:file.name,mime_type:file.type,file_size:file.size});
      if(saved.error){ showToast(saved.error.message); return; }
    }
  }
  renderVastuFreeInsight(record);
  showToast(t.toastVastu);
  document.getElementById('vLocation').value='';
  document.getElementById('vFloors').value='';
  document.getElementById('vProblem').value='';
  document.getElementById('planFileName').textContent='';
}

async function renderVastuFreeInsight(record){
  const result = document.getElementById('vastuAnalysisResult');
  if(!result) return;
  result.innerHTML = `<div class="disclaimer-box"><b>${vastuText('विश्लेषण भइरहेको छ...','Analysis in progress...')}</b></div>`;
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  let rule = null;
  if(client){
    const response = await client.from('vastu_rules').select('rule_name,free_hint,explanation').eq('active',true).eq('direction',record.direction).limit(1).maybeSingle();
    if(!response.error) rule=response.data;
  }
  const configuredHint = rule?.free_hint && typeof rule.free_hint==='object' ? (rule.free_hint[LANG] || rule.free_hint.en || rule.free_hint.ne) : rule?.free_hint;
  const hint = configuredHint || vastuText('हाल उपलब्ध expert-configured rule अनुसार थप समीक्षा आवश्यक छ।','The configured expert rule set requires further review for this property.');
  result.innerHTML = `<div class="service-card" style="text-align:left;"><span class="eyebrow">${vastuText('एक निःशुल्क संकेत','One Free Insight')}</span><h3>${vastuEsc(hint)}</h3><p>${vastuText('यो प्रारम्भिक संकेत मात्र हो। पूर्ण वास्तु विश्लेषण, दोष पहिचान तथा remedy का लागि verified paid analysis आवश्यक हुन्छ।','This is only an initial insight. Verified paid analysis is required for full findings, dosha review and remedies.')}</p><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-gold" onclick="vastuRequestUnlock()">${vastuText('पूर्ण विश्लेषण हेर्नुहोस्','Unlock Full Analysis')}</button><button class="btn btn-ghost" onclick="goView('booking')">${vastuText('वास्तु विशेषज्ञसँग परामर्श','Consult a Vastu Expert')}</button></div></div><div class="card-grid cols-3" style="margin-top:16px;">${['Main Gate Analysis','Room Analysis','Dosha Analysis','Remedies','Detailed Map Analysis','Complete Report'].map(item=>`<div class="service-card" style="opacity:.62;"><h4>🔒 ${item}</h4><p>${vastuText('भुक्तानी पुष्टि भएपछि खुल्नेछ।','Unlocks after verified payment.')}</p></div>`).join('')}</div>`;
}
function vastuRequestUnlock(){
  if(!mainAuthUser){ goView('account'); return; }
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(client && vastuState.projectId){
    client.from('vastu_projects').update({status:'payment_pending'}).eq('id',vastuState.projectId).then(({error})=>{ if(error) console.warn('Vastu payment intent status update failed:',error); });
  }
  document.getElementById('vastuProjectStart')?.scrollIntoView({behavior:'smooth'});
  showToast(vastuText('भुक्तानी योजना admin बाट पुष्टि भएपछि मात्र analysis unlock हुनेछ।','Analysis unlocks only after verified payment through the configured plan.'));
}

renderVastuPlatform();

// Attach canvas click listener when DOM is ready
if (document.getElementById('vcCanvas')) {
  document.getElementById('vcCanvas').addEventListener('click', vcCanvasClick);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('vcCanvas');
    if (canvas) canvas.addEventListener('click', vcCanvasClick);
  });
}
