const RASHIFAL_SIGNS = {
  ne: ['मेष','वृषभ','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'],
  en: ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
  hi: ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'],
  sa: ['मेषः','वृषभः','मिथुनम्','कर्कटकः','सिंहः','कन्या','तुला','वृश्चिकः','धनुः','मकरः','कुम्भः','मीनः']
};

const RASHIFAL_UI = {
  ne: {title:'राशिफल', sub:'दैनिक, मासिक र वार्षिक फलादेश भाषा तथा क्षेत्रअनुसार।', daily:'दैनिक', monthly:'मासिक', yearly:'वार्षिक', region:'भौगोलिक क्षेत्र', source:'स्वचालित संकेत · {language} · {region}', auto:'स्वचालित परम्परागत मार्गदर्शन', updated:'अद्यावधिक', empty:'यस भाषा, क्षेत्र र अवधिका लागि फलादेश प्रकाशित गरिएको छैन।', loading:'फलादेश लोड हुँदैछ...', admin:'राशिफल प्रकाशित गर्नुहोस्', period:'अवधि', sign:'राशि', date:'सुरु मिति', prediction:'फलादेश', luckyTime:'शुभ समय', caution:'सावधानी', luckyColor:'शुभ रंग', luckyNumber:'शुभ अंक', periodPrefix:['आज यस राशिको मुख्य ध्यान:','यस महिना यस राशिको मुख्य ध्यान:','यस वर्ष यस राशिको मुख्य ध्यान:'], fallback:'स्थानीय परम्परागत संकेत', save:'प्रकाशित गर्नुहोस्', saved:'राशिफल प्रकाशित भयो।', error:'राशिफल प्रकाशित गर्न सकिएन।'},
  en: {title:'Rashifal', sub:'Daily, monthly, and yearly forecasts matched to language and region.', daily:'Daily', monthly:'Monthly', yearly:'Yearly', region:'Geographic region', source:'Automatic guidance · {language} · {region}', auto:'Automatically generated traditional guidance', updated:'Updated', empty:'No forecast is published for this language, region, and period.', loading:'Loading forecast...', admin:'Publish Rashifal', period:'Period', sign:'Zodiac sign', date:'Start date', prediction:'Forecast', luckyTime:'Lucky time', caution:'Caution', luckyColor:'Lucky color', luckyNumber:'Lucky number', periodPrefix:['Today, focus on:','This month, focus on:','This year, focus on:'], fallback:'traditional fallback', save:'Publish', saved:'Rashifal published.', error:'Rashifal could not be published.'},
  hi: {title:'राशिफल', sub:'भाषा और क्षेत्र के अनुसार दैनिक, मासिक एवं वार्षिक फलादेश।', daily:'दैनिक', monthly:'मासिक', yearly:'वार्षिक', region:'भौगोलिक क्षेत्र', source:'स्वचालित संकेत · {language} · {region}', auto:'स्वचालित पारंपरिक मार्गदर्शन', updated:'अद्यतन', empty:'इस भाषा, क्षेत्र और अवधि के लिए फलादेश प्रकाशित नहीं है।', loading:'फलादेश लोड हो रहा है...', admin:'राशिफल प्रकाशित करें', period:'अवधि', sign:'राशि', date:'आरंभ तिथि', prediction:'फलादेश', luckyTime:'शुभ समय', caution:'सावधानी', luckyColor:'शुभ रंग', luckyNumber:'शुभ अंक', periodPrefix:['आज इस राशि का मुख्य ध्यान:','इस माह इस राशि का मुख्य ध्यान:','इस वर्ष इस राशि का मुख्य ध्यान:'], fallback:'स्थानीय पारंपरिक संकेत', save:'प्रकाशित करें', saved:'राशिफल प्रकाशित हो गया।', error:'राशिफल प्रकाशित नहीं हो सका।'},
  sa: {title:'राशिफलम्', sub:'भाषा-क्षेत्रानुसारं दैनिक-मासिक-वार्षिकं फलादेशम्।', daily:'दैनिकम्', monthly:'मासिकम्', yearly:'वार्षिकम्', region:'भौगोलिकप्रदेशः', source:'स्वचालितः संकेतः · {language} · {region}', auto:'स्वचालितं पारम्परिकं मार्गदर्शनम्', updated:'अद्यतनम्', empty:'अस्याः भाषा-प्रदेश-कालावधेः फलादेशः प्रकाशितः नास्ति।', loading:'फलादेशः प्रचलति...', admin:'राशिफलं प्रकाशयतु', period:'कालावधिः', sign:'राशिः', date:'आरम्भदिनम्', prediction:'फलादेशः', luckyTime:'शुभसमयः', caution:'सावधानी', luckyColor:'शुभवर्णः', luckyNumber:'शुभाङ्कः', periodPrefix:['अद्य अस्याः राशेः मुख्यं ध्यानम्:','अस्मिन् मासे अस्याः राशेः मुख्यं ध्यानम्:','अस्मिन् वर्षे अस्याः राशेः मुख्यं ध्यानम्:'], fallback:'स्थानीयः पारम्परिकः संकेतः', save:'प्रकाशयतु', saved:'राशिफलं प्रकाशितम्।', error:'राशिफलं प्रकाशितुं न शक्यते।'}
};

const RASHIFAL_REGIONS = [
  ['NP','नेपाल / Nepal'],
  ['IN','भारत / India'],
  ['GLOBAL','Global']
];
let rashifalPeriod = 'daily';
let rashifalRegion = null;

const RASHIFAL_FALLBACK = {
  ne: {
    title: ['आजको संकेत', 'यस महिनाको संकेत', 'यस वर्षको संकेत'],
    prediction: ['काममा प्राथमिकता मिलाएर अघि बढ्नुहोस्। संवाद स्पष्ट राख्दा अवसर बलियो हुनेछ।', 'योजना, सीप र सम्बन्धमा क्रमिक सुधारको समय हो। खर्च र समय व्यवस्थापनमा ध्यान दिनुहोस्।', 'धैर्यपूर्वक बनाएका योजना विस्तार हुनेछन्। निरन्तरता, स्वास्थ्य र आर्थिक अनुशासनलाई प्राथमिकता दिनुहोस्।'],
  },
  en: {
    title: ['Today\'s guidance', 'This month\'s guidance', 'This year\'s guidance'],
    prediction: ['Prioritize the next practical step. Clear communication can open a useful opportunity.', 'Steady progress is favored in plans, skills, and relationships. Keep time and spending organized.', 'Patiently built plans can expand. Protect your health, consistency, and financial discipline.'],
  },
  hi: {
    title: ['आज का संकेत', 'इस माह का संकेत', 'इस वर्ष का संकेत'],
    prediction: ['काम को प्राथमिकता देकर आगे बढ़ें। स्पष्ट संवाद से उपयोगी अवसर मिल सकता है।', 'योजनाओं, कौशल और संबंधों में धीरे-धीरे सुधार होगा। समय और खर्च व्यवस्थित रखें।', 'धैर्य से बनाई गई योजनाएं आगे बढ़ेंगी। स्वास्थ्य, निरंतरता और आर्थिक अनुशासन को प्राथमिकता दें।'],
  },
  sa: {
    title: ['अद्य मार्गदर्शनम्', 'अस्य मासस्य मार्गदर्शनम्', 'अस्य वर्षस्य मार्गदर्शनम्'],
    prediction: ['कार्येषु प्राथमिकतां निश्चित्य अग्रे गच्छतु। स्पष्टः संवादः उपयोगि-अवसरं जनयिष्यति।', 'योजनासु कौशलेषु सम्बन्धेषु च शनैः उन्नतिः भविष्यति। काल-व्यययोः अनुशासनं धारयतु।', 'धैर्येण निर्मिताः योजनाः विस्तरिष्यन्ति। स्वास्थ्यं सातत्यं वित्तीय-अनुशासनं च रक्षतु।'],
  }
};

const RASHIFAL_SIGN_PROFILES = [
  {ne:'नयाँ काम सुरु गर्ने ऊर्जा बलियो छ। हतारमा निर्णय नगरी पहिले प्राथमिकता तय गर्नुहोस्।',en:'Initiative is strong. Start one useful task, but set priorities before making a quick decision.',hi:'नई शुरुआत के लिए ऊर्जा अच्छी है। जल्दबाजी से पहले प्राथमिकता तय करें।',sa:'नूतनकार्यस्य आरम्भाय शक्तिः अस्ति। शीघ्रनिर्णयात् पूर्वं प्राथमिकतां निश्चितं कुरुत।',color:'red',number:9},
  {ne:'स्थिर योजना र व्यवहारिक कदमले लाभ दिन्छ। खर्चमा संयम राख्दा बचत बढ्नेछ।',en:'Steady plans and practical steps bring progress. Careful spending can strengthen savings.',hi:'स्थिर योजना और व्यावहारिक कदम लाभ देंगे। खर्च में संयम बचत बढ़ाएगा।',sa:'स्थिरयोजना व्यवहारिकपदं च प्रगतिं दास्यतः। व्यये संयमः सञ्चयं वर्धयिष्यति।',color:'green',number:6},
  {ne:'कुरा मिलाउने र सिक्ने अवसर आउँछ। एउटै समयमा धेरै काम थाल्नुको सट्टा एउटा पूरा गर्नुहोस्।',en:'Learning and conversation open doors. Finish one task before starting several new ones.',hi:'सीखने और बातचीत से अवसर मिलेंगे। कई कामों के बजाय एक काम पूरा करें।',sa:'अध्ययनं संवादश्च अवसरान् उद्घाटयतः। बहूनि कार्याणि त्यक्त्वा एकं पूर्णं कुरुत।',color:'yellow',number:5},
  {ne:'घरपरिवार र भावनात्मक सन्तुलन मुख्य विषय हो। शान्त संवादले पुरानो तनाव घटाउनेछ।',en:'Home and emotional balance need attention. A calm conversation can reduce old tension.',hi:'घर और भावनात्मक संतुलन पर ध्यान दें। शांत संवाद पुराने तनाव को घटाएगा।',sa:'गृहं भावनासन्तुलनं च ध्यानार्हम्। शान्तसंवादः पुरातनं तनावं हरिष्यति।',color:'white',number:2},
  {ne:'नेतृत्व र देखिने काममा प्रगति हुन्छ। श्रेय बाँड्दा सम्बन्ध र टोली दुवै बलियो बन्छन्।',en:'Leadership and visible work can progress. Sharing credit strengthens both team and relationships.',hi:'नेतृत्व और महत्वपूर्ण कार्यों में प्रगति होगी। श्रेय बांटने से संबंध मजबूत होंगे।',sa:'नेतृत्वे दृश्यकार्येषु च प्रगतिः भविष्यति। यशोविभागेन सम्बन्धाः दृढाः भवन्ति।',color:'gold',number:1},
  {ne:'सानो सुधार र अनुशासनले ठूलो परिणाम दिन्छ। स्वास्थ्य, तालिका र कागजी काम व्यवस्थित गर्नुहोस्।',en:'Small improvements and discipline create strong results. Organize health, schedules, and paperwork.',hi:'छोटे सुधार और अनुशासन अच्छे परिणाम देंगे। स्वास्थ्य और कागजी काम व्यवस्थित करें।',sa:'लघुसुधारः अनुशासनं च महत्फलं दास्यतः। स्वास्थ्यं समयसारिणीं लेख्यकार्यं च व्यवस्थितं कुरुत।',color:'green',number:5},
  {ne:'साझेदारी र सम्झौतामा सन्तुलन चाहिन्छ। आफ्नो आवश्यकता स्पष्ट राखेर मात्र सहमति जनाउनुहोस्।',en:'Partnerships need balance. State your needs clearly before agreeing to a commitment.',hi:'साझेदारी और समझौतों में संतुलन रखें। सहमति से पहले अपनी जरूरत स्पष्ट करें।',sa:'सहभागितासु सन्तुलनम् आवश्यकम्। स्वावश्यकतां स्पष्टं कृत्वा एव सम्मतिं ददातु।',color:'blue',number:7},
  {ne:'गहिरो सोच र अधुरा विषय समाधान गर्ने समय हो। गोप्य कुरा सुरक्षित राख्नुहोस् र जोखिम नाप्नुहोस्।',en:'This is a time to resolve unfinished matters. Protect private information and measure risks carefully.',hi:'अधूरे विषय सुलझाने का समय है। निजी जानकारी सुरक्षित रखें और जोखिम सोचकर लें।',sa:'अपूर्णविषयाणां समाधानस्य समयः। निजसूचनां रक्षतु जोखिमं च परीक्ष्य गच्छतु।',color:'maroon',number:8},
  {ne:'नयाँ ज्ञान, यात्रा वा अवसरले दृष्टिकोण फराकिलो बनाउनेछ। वाचा गर्नुअघि समय र साधन जाँच्नुहोस्।',en:'Learning, travel, or a new opportunity can broaden your view. Check time and resources before promising.',hi:'ज्ञान, यात्रा या नया अवसर दृष्टि व्यापक करेगा। वादा करने से पहले समय और साधन जांचें।',sa:'ज्ञानं यात्रा वा नूतनावसरः दृष्टिं विस्तारयिष्यति। वचनात् पूर्वं कालं साधनं च परीक्षताम्।',color:'purple',number:3},
  {ne:'जिम्मेवारी बढे पनि परिणाम दीर्घकालीन हुनेछ। धैर्य, वरिष्ठको सल्लाह र स्पष्ट लक्ष्य उपयोगी छन्।',en:'Responsibility may grow, but results can last. Patience, sound advice, and a clear goal will help.',hi:'जिम्मेदारी बढ़ सकती है पर परिणाम टिकाऊ होंगे। धैर्य और स्पष्ट लक्ष्य सहायक होंगे।',sa:'दायित्वं वर्धेत, किन्तु फलं स्थिरं भवेत्। धैर्यं सुयुक्तिः स्पष्टलक्ष्यं च सहायकरम्।',color:'black',number:4},
  {ne:'मित्रता, समूह र नयाँ विचारबाट अवसर आउँछ। सबै कुरा एक्लै सम्हाल्नुको सट्टा सहयोग लिनुहोस्।',en:'Friends, groups, and new ideas can bring opportunity. Accept support instead of carrying everything alone.',hi:'मित्रों, समूह और नए विचारों से अवसर मिलेंगे। हर काम अकेले न संभालें।',sa:'मित्रेभ्यः समूहेभ्यः नूतनविचारेभ्यश्च अवसराः। सर्वं स्वयमेव न वहतु, साहाय्यं स्वीकरोतु।',color:'blue',number:4},
  {ne:'आराम, कल्पना र आत्मचिन्तन आवश्यक छ। सीमाना स्पष्ट राख्दा ऊर्जा र समय जोगिनेछ।',en:'Rest, imagination, and reflection matter. Clear boundaries will protect your time and energy.',hi:'आराम, कल्पना और आत्मचिंतन जरूरी हैं। स्पष्ट सीमाएं समय और ऊर्जा बचाएंगी।',sa:'विश्रामः कल्पना आत्मचिन्तनं च आवश्यकम्। स्पष्टमर्यादाः कालं शक्तिं च रक्षिष्यन्ति।',color:'sea green',number:7}
];

function rashifalFallbackEntries(period, language, region){
  const fallback = RASHIFAL_FALLBACK[language] || RASHIFAL_FALLBACK.en;
  const ui = RASHIFAL_UI[language] || RASHIFAL_UI.en;
  const periodIndex = ['daily','monthly','yearly'].indexOf(period);
  const periodPrefix = ui.periodPrefix[periodIndex];
  return RASHIFAL_SIGNS[language].map((sign, index) => {
    const profile = RASHIFAL_SIGN_PROFILES[index];
    const prediction = profile[language] || profile.en;
    return {
    zodiac_sign: sign,
    title: `${fallback.title[periodIndex]} · ${region}`,
    prediction: `${periodPrefix} ${prediction}`,
    lucky_color: profile.color,
    lucky_number: String(profile.number)
    };
  });
}

function rashifalText(value){ return String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
function rashifalDefaultRegion(){ return LANG === 'ne' || LANG === 'sa' ? 'NP' : LANG === 'hi' ? 'IN' : 'GLOBAL'; }
function rashifalDate(period){
  const now = new Date();
  if(period === 'yearly') return `${now.getFullYear()}-01-01`;
  if(period === 'monthly') return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function rashifalPeriodLabel(period, t){ return t[period]; }

async function renderRashifal(){
  const grid = document.getElementById('rashifalGrid');
  if(!grid) return;
  const t = RASHIFAL_UI[LANG] || RASHIFAL_UI.en;
  if(!rashifalRegion || (LANG === 'ne' || LANG === 'sa')) rashifalRegion = rashifalDefaultRegion();
  setText('rashifalPageTitle', t.title);
  setText('rashifalPageSub', t.sub);
  setText('rashifalAutoLabel', t.auto);
  setText('rashifalUpdatedLabel', `${t.updated}: ${rashifalDate(rashifalPeriod)}`);
  setText('rashifalRegionLabel', t.region);
  const select = document.getElementById('rashifalRegionSelect');
  if(select){
    select.innerHTML = RASHIFAL_REGIONS.map(([value,label]) => `<option value="${value}">${label}</option>`).join('');
    select.value = rashifalRegion;
    select.disabled = LANG === 'ne' || LANG === 'sa';
    select.onchange = () => { rashifalRegion = select.value; renderRashifal(); };
  }
  const tabs = document.getElementById('rashifalPeriodTabs');
  if(tabs) tabs.innerHTML = ['daily','monthly','yearly'].map(period => `<button class="faq-tab ${rashifalPeriod === period ? 'active' : ''}" onclick="rashifalSetPeriod('${period}')">${rashifalText(rashifalPeriodLabel(period,t))}</button>`).join('');
  setText('rashifalSourceNote', t.source.replace('{language}', LANG.toUpperCase()).replace('{region}', rashifalRegion));
  grid.innerHTML = `<div class="empty-box">${rashifalText(t.loading)}</div>`;
  const empty = document.getElementById('rashifalEmpty');
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  let data = null;
  let error = null;
  if(client){
    const result = await client.from('rashifal_entries').select('*').eq('published',true).eq('period',rashifalPeriod).eq('period_start',rashifalDate(rashifalPeriod)).eq('language',LANG).eq('region_code',rashifalRegion).order('zodiac_sign');
    data = result.data;
    error = result.error;
  }
  const entries = error || !data || !data.length ? rashifalFallbackEntries(rashifalPeriod, LANG, rashifalRegion) : data;
  if(empty) empty.style.display='none';
  const labels = [[t.luckyTime,'auspicious_time'],[t.caution,'caution'],[t.luckyColor,'lucky_color'],[t.luckyNumber,'lucky_number']];
  const bySign = new Map(entries.map(entry => [entry.zodiac_sign, entry]));
  grid.innerHTML = RASHIFAL_SIGNS[LANG].map(sign => {
    const entry = bySign.get(sign) || entries.find(item => item.zodiac_sign === sign);
    if(!entry) return `<article class="service-card rashifal-card"><h3>${rashifalText(sign)}</h3><p>${rashifalText(t.empty)}</p></article>`;
    const details = labels.filter(([,key]) => entry[key]).map(([label,key]) => `<div class="rashifal-detail"><b>${rashifalText(label)}</b><span>${rashifalText(entry[key])}</span></div>`).join('');
    return `<article class="service-card rashifal-card"><h3>${rashifalText(sign)}</h3><p>${rashifalText(entry.prediction)}</p>${details}</article>`;
  }).join('');
  if(error || !data || !data.length) setText('rashifalSourceNote', `${t.source.replace('{language}', LANG.toUpperCase()).replace('{region}', rashifalRegion)} · ${t.fallback}`);
}

function rashifalSetPeriod(period){ rashifalPeriod = period; renderRashifal(); }

function renderRashifalAdmin(){
  const panel = document.getElementById('rashifalAdminPanel');
  if(!panel) return;
  const t = RASHIFAL_UI[LANG] || RASHIFAL_UI.en;
  if(typeof mainAuthUser === 'undefined' || !mainAuthUser){ panel.innerHTML=''; return; }
  const signs = RASHIFAL_SIGNS[LANG];
  panel.innerHTML = `<div class="booking-panel"><h3>${t.admin}</h3><div class="form-grid cols-2"><label class="field">${t.period}<select id="rashifalAdminPeriod"><option value="daily">${t.daily}</option><option value="monthly">${t.monthly}</option><option value="yearly">${t.yearly}</option></select></label><label class="field">${t.date}<input type="date" id="rashifalAdminDate" value="${rashifalDate(rashifalPeriod)}"></label><label class="field">${t.sign}<select id="rashifalAdminSign">${signs.map(sign => `<option>${rashifalText(sign)}</option>`).join('')}</select></label><label class="field">${t.region}<select id="rashifalAdminRegion">${RASHIFAL_REGIONS.map(([value,label]) => `<option value="${value}" ${value===rashifalRegion?'selected':''}>${label}</option>`).join('')}</select></label></div><label class="field"><span>${t.prediction}</span><textarea id="rashifalAdminPrediction" rows="4"></textarea></label><button class="btn btn-gold" onclick="publishRashifal()">${t.save}</button></div>`;
}

async function publishRashifal(){
  const t = RASHIFAL_UI[LANG] || RASHIFAL_UI.en;
  const client = typeof getMainSupabase === 'function' ? getMainSupabase() : null;
  if(!client || typeof mainAuthUser === 'undefined' || !mainAuthUser){ showToast(t.error); return; }
  const payload = {period:document.getElementById('rashifalAdminPeriod').value, period_start:document.getElementById('rashifalAdminDate').value, language:LANG, region_code:document.getElementById('rashifalAdminRegion').value, zodiac_sign:document.getElementById('rashifalAdminSign').value, prediction:document.getElementById('rashifalAdminPrediction').value.trim(), published:true, published_by:mainAuthUser.id};
  if(!payload.prediction){ showToast(t.error); return; }
  const {error} = await client.from('rashifal_entries').upsert(payload,{onConflict:'period,period_start,language,region_code,zodiac_sign'});
  if(error){ showToast(t.error); return; }
  showToast(t.saved); renderRashifal();
}
