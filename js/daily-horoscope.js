const VASTU_DIRECTION_OPTIONS = [
  ['उत्तर','North'], ['उत्तर-पूर्व','North-East'], ['पूर्व','East'], ['दक्षिण-पूर्व','South-East'],
  ['दक्षिण','South'], ['दक्षिण-पश्चिम','South-West'], ['पश्चिम','West'], ['उत्तर-पश्चिम','North-West'], ['केन्द्र','Center']
];

const VASTU_DIRECTION_FIELDS = [
  ['kitchenDirection','किचनको दिशा'], ['toiletDirection','Toilet को दिशा'], ['staircaseDirection','भ्याङ्ग / Staircase को दिशा'],
  ['waterTankDirection','पानी ट्याङ्कीको दिशा'], ['bedroomDirection','Bedroom को दिशा'], ['masterBedroomDirection','Master Bedroom को दिशा'],
  ['safetyTankDirection','Safety Tank को दिशा'], ['storeRoomDirection','Store Room को दिशा'], ['studyRoomDirection','Study Room को दिशा'],
  ['pujaRoomDirection','पूजा कोठाको दिशा'], ['wellDirection','इनारको दिशा'], ['roomColor','कोठाको Color'], ['houseColor','घरको Color'],
  ['landShape','जग्गाको Shape'], ['plantsDirection','बोट–विरुवाको दिशा'], ['fruitTreesDirection','फलफूलका बोटहरूको दिशा'],
  ['indoorPlantDirection','Indoor Plant को दिशा'], ['sofaDirection','Sofa Set को दिशा'], ['cupboardDirection','दराज / Cupboard को दिशा'],
  ['wasteDirection','फोहोर राख्ने ठाउँको दिशा'], ['broomDirection','कुचो / बढार्ने सिठो राख्ने ठाउँको दिशा']
];

function renderVastuDirectionFields(){
  const panel = document.getElementById('vastuDirectionFields');
  if(!panel) return;
  panel.innerHTML = VASTU_DIRECTION_FIELDS.map(([id,label])=>`<div class="field"><label>${label}</label><select id="vastu-${id}">${VASTU_DIRECTION_OPTIONS.map(([ne,en])=>`<option value="${en}">${ne} (${en})</option>`).join('')}</select></div>`).join('');
}

function collectVastuDirectionFields(){
  return Object.fromEntries(VASTU_DIRECTION_FIELDS.map(([id])=>[id,document.getElementById(`vastu-${id}`)?.value || null]));
}

async function loadLatestDailyHoroscope(){
  const grid = document.getElementById('dailyHoroscopeGrid');
  const empty = document.getElementById('dailyHoroscopeEmpty');
  if(!grid) return;
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client){ grid.innerHTML=''; if(empty){ empty.style.display='block'; empty.textContent='दैनिक फलादेश प्रशासकद्वारा प्रकाशित भएपछि यहाँ देखिनेछ।'; } return; }
  const {data,error} = await client.from('daily_horoscopes').select('*').eq('published',true).lte('horoscope_date',new Date().toISOString().slice(0,10)).order('horoscope_date',{ascending:false}).limit(1).maybeSingle();
  if(error || !data){ grid.innerHTML=''; if(empty){ empty.style.display='block'; empty.textContent='दैनिक फलादेश प्रशासकद्वारा प्रकाशित भएपछि यहाँ देखिनेछ।'; } return; }
  if(empty) empty.style.display='none';
  document.getElementById('dailyHoroscopeEyebrow').textContent='दैनिक फलादेश';
  document.getElementById('dailyHoroscopeTitle').textContent=data.title || 'आजको दैनिक फलादेश';
  document.getElementById('dailyHoroscopeDate').textContent=[data.nepali_date,data.ad_date].filter(Boolean).join(' · ');
  const cards = [['राशि',data.rashi],['दैनिक फलादेश',data.prediction],['शुभ समय',data.auspicious_time],['सावधानी',data.caution],['शुभ रंग',data.lucky_color],['शुभ अंक',data.lucky_number],['सामान्य मार्गदर्शन',data.general_guidance],['अन्य जानकारी',data.other_content]];
  grid.innerHTML=cards.filter(([,value])=>value).map(([label,value])=>`<div class="service-card"><h4>${label}</h4><p>${String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>`).join('');
  const homeCard=document.getElementById('homeDailyHoroscopeCard');
  if(homeCard){document.getElementById('homeDailyHoroscopeDate').textContent=[data.nepali_date,data.ad_date].filter(Boolean).join(' · ');homeCard.innerHTML=`<h3>${String(data.rashi||'').replace(/</g,'&lt;')}</h3><p>${String(data.prediction||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p><a class="btn btn-ghost" href="#" onclick="goView('astrology');return false;">विस्तृत दैनिक फलादेश</a>`;}
}

function renderDailyHoroscopeAdmin(){
  const panel=document.getElementById('dailyHoroscopeAdminPanel');
  if(!panel) return;
  if(!mainAuthUser){ panel.innerHTML=''; return; }
  panel.innerHTML=`<div class="booking-panel"><h3>दैनिक फलादेश प्रकाशित / अपडेट</h3><div class="form-grid cols-2"><div class="field"><label>मिति</label><input type="date" id="horoscopeDate"></div><div class="field"><label>नेपाली मिति</label><input id="horoscopeNepaliDate"></div><div class="field"><label>राशि</label><input id="horoscopeRashi"></div><div class="field"><label>शुभ समय</label><input id="horoscopeAuspiciousTime"></div><div class="field"><label>शुभ रंग</label><input id="horoscopeLuckyColor"></div><div class="field"><label>शुभ अंक</label><input id="horoscopeLuckyNumber"></div></div><div class="field"><label>दैनिक prediction</label><textarea id="horoscopePrediction" rows="3"></textarea></div><div class="field"><label>सावधानी</label><textarea id="horoscopeCaution" rows="2"></textarea></div><div class="field"><label>सामान्य मार्गदर्शन</label><textarea id="horoscopeGuidance" rows="2"></textarea></div><div class="field"><label>अन्य जानकारी</label><textarea id="horoscopeOther" rows="2"></textarea></div><button class="btn btn-gold" onclick="publishDailyHoroscope()">प्रकाशित गर्नुहोस्</button></div>`;
}

async function publishDailyHoroscope(){
  const client=typeof getMainSupabase==='function'?getMainSupabase():null;
  if(!client || !mainAuthUser){ showToast('Admin login आवश्यक छ।'); return; }
  const payload={horoscope_date:document.getElementById('horoscopeDate').value,nepali_date:document.getElementById('horoscopeNepaliDate').value,ad_date:document.getElementById('horoscopeDate').value,rashi:document.getElementById('horoscopeRashi').value,prediction:document.getElementById('horoscopePrediction').value,auspicious_time:document.getElementById('horoscopeAuspiciousTime').value,caution:document.getElementById('horoscopeCaution').value,lucky_color:document.getElementById('horoscopeLuckyColor').value,lucky_number:document.getElementById('horoscopeLuckyNumber').value,general_guidance:document.getElementById('horoscopeGuidance').value,other_content:document.getElementById('horoscopeOther').value,published:true,published_by:mainAuthUser.id};
  const {error}=await client.from('daily_horoscopes').upsert(payload,{onConflict:'horoscope_date'});
  if(error){showToast(error.message);return;} showToast('दैनिक फलादेश प्रकाशित भयो।'); loadLatestDailyHoroscope();
}

function renderMarriageMatchForm(){
  ['groomMatchFields','brideMatchFields'].forEach((target,index)=>{ const prefix=index?'bride':'groom'; const panel=document.getElementById(target); if(!panel)return; panel.innerHTML=[['name','नाम','text'],['dobAd','जन्म मिति (AD)','date'],['birthTime','जन्म समय','time'],['birthPlace','जन्म स्थान','text'],['birthCountry','जन्म देश','text']].map(([key,label,type])=>`<div class="field"><label>${label}</label><input type="${type}" id="${prefix}-${key}"></div>`).join(''); });
}

async function calculateMarriageMatch(){
  const result=document.getElementById('marriageMatchResult');
  if(!result)return;
  const profiles=['groom','bride'].map(prefix=>Object.fromEntries(['name','dobAd','birthTime','birthPlace','birthCountry'].map(key=>[key,document.getElementById(`${prefix}-${key}`)?.value.trim()||''])));
  if(profiles.some(profile=>Object.values(profile).some(value=>!value))){result.innerHTML='<div class="disclaimer-box">कृपया दुवै प्रोफाइलका सबै विवरण भर्नुहोस्।</div>';return;}
  const endpoint=window.APP_CONFIG?.astrologyEngineUrl;
  if(!endpoint){result.innerHTML='<div class="disclaimer-box"><b>Calculation engine जडान भएको छैन।</b><br>वास्तविक ग्रहस्थितिबिना मिलान परिणाम देखाइएको छैन। प्रशासकले astrology engine integration endpoint जडान गरेपछि यो सेवा सक्रिय हुनेछ।</div>';return;}
  result.innerHTML='<div class="disclaimer-box">वास्तविक astrology engine बाट परिणाम ल्याउँदैछ...</div>';
  try{const response=await fetch(`${endpoint.replace(/\/$/,'')}/marriage-match`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groom:profiles[0],bride:profiles[1]})});if(!response.ok)throw new Error('engine unavailable');const data=await response.json();result.innerHTML=`<div class="service-card"><h3>मिलान परिणाम</h3><pre style="white-space:pre-wrap;font:inherit;">${JSON.stringify(data,null,2).replace(/</g,'&lt;')}</pre></div>`;}catch(error){result.innerHTML='<div class="disclaimer-box">Calculation engine बाट परिणाम प्राप्त गर्न सकिएन। कुनै अनुमानित वा fake परिणाम देखाइएको छैन।</div>';}
}
