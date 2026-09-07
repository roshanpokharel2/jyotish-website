/* ============================================================
   PANCHANGA / MUHURTA MODULE
   Real astronomical calculations for sunrise/sunset, Rahu Kaal,
   Tithi, Nakshatra, Yoga, Karana
============================================================ */

const KTM_LAT = 27.7172, KTM_LON = 85.3240, KTM_TZ_HOURS = 5.75; // Kathmandu, UTC+5:45

function julianDayUTCNoon(y, m, d){
  return Math.floor(Date.UTC(y, m-1, d, 12, 0, 0) / 86400000) + 2440587.5;
}

function calcSunTimes(y, m, d, lat, lon){
  const rad = Math.PI/180;
  const jd = julianDayUTCNoon(y,m,d);
  const n = jd - 2451545.0 + 0.0008;
  const meanSolarNoon = n - lon/360;
  const solarMeanAnomalyDeg = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const M = solarMeanAnomalyDeg * rad;
  const C = 1.9148*Math.sin(M) + 0.0200*Math.sin(2*M) + 0.0003*Math.sin(3*M);
  const eclipticLongDeg = (solarMeanAnomalyDeg + C + 180 + 102.9372) % 360;
  const L = eclipticLongDeg * rad;
  const Jtransit = 2451545.0 + meanSolarNoon + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L);
  const sinDec = Math.sin(L) * Math.sin(23.4397*rad);
  const decl = Math.asin(sinDec);
  const cosHourAngle = (Math.sin(-0.83*rad) - Math.sin(lat*rad)*sinDec) / (Math.cos(lat*rad)*Math.cos(decl));
  const clamped = Math.min(1, Math.max(-1, cosHourAngle));
  const hourAngleDeg = Math.acos(clamped) / rad;
  const Jset = 2451545.0 + (hourAngleDeg/360 + meanSolarNoon) + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L);
  const Jrise = Jtransit - (Jset - Jtransit);
  function jdToDate(jd2){ return new Date((jd2 - 2440587.5) * 86400000); }
  return { sunrise: jdToDate(Jrise), sunset: jdToDate(Jset), transit: jdToDate(Jtransit) };
}

// Standard fixed weekday→segment (1-8, segments of equal length between sunrise & sunset)
const RAHU_SEGMENT   = {0:8, 1:2, 2:7, 3:5, 4:6, 5:4, 6:3}; // 0=Sunday
const YAMA_SEGMENT    = {0:5, 1:4, 2:3, 3:2, 4:1, 5:7, 6:6};
const GULIKA_SEGMENT  = {0:7, 1:6, 2:5, 3:4, 4:3, 5:2, 6:1};

function segmentTimes(sunrise, sunset, segmentIndex1to8){
  const totalMs = sunset.getTime() - sunrise.getTime();
  const segMs = totalMs / 8;
  const start = new Date(sunrise.getTime() + (segmentIndex1to8-1)*segMs);
  const end = new Date(sunrise.getTime() + segmentIndex1to8*segMs);
  return { start, end };
}

function abhijitMuhurta(sunrise, sunset){
  const totalMs = sunset.getTime() - sunrise.getTime();
  const muhurtaMs = totalMs / 15;
  const start = new Date(sunrise.getTime() + 7*muhurtaMs);
  const end = new Date(sunrise.getTime() + 8*muhurtaMs);
  return { start, end };
}

function fmtTimeKtm(date){
  return date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Kathmandu' });
}

function normDeg(d){ d = d % 360; return d < 0 ? d + 360 : d; }
function julianCenturiesNow(date){
  const jd = date.getTime()/86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}
function sunLongitudeNow(T){
  const rad = Math.PI/180;
  const M = normDeg(357.5291092 + 35999.0502909*T);
  const L0 = normDeg(280.4664567 + 36000.76982779*T);
  const C = (1.914602 - 0.004817*T)*Math.sin(M*rad) + 0.019993*Math.sin(2*M*rad) + 0.000289*Math.sin(3*M*rad);
  return normDeg(L0 + C);
}
function moonLongitudeNow(T){
  const rad = Math.PI/180;
  const Lp = normDeg(218.3164477 + 481267.88123421*T);
  const D  = normDeg(297.8501921 + 445267.1114034*T);
  const M  = normDeg(357.5291092 + 35999.0502909*T);
  const Mp = normDeg(134.9633964 + 477198.8675055*T);
  const F  = normDeg(93.2720950 + 483202.0175233*T);
  const dL = 6.289*Math.sin(Mp*rad) - 1.274*Math.sin((2*D-Mp)*rad) + 0.658*Math.sin(2*D*rad)
    - 0.186*Math.sin(M*rad) - 0.059*Math.sin((2*D-2*Mp)*rad) - 0.057*Math.sin((2*D-M-Mp)*rad)
    + 0.053*Math.sin((2*D+Mp)*rad) + 0.046*Math.sin((2*D-M)*rad) + 0.041*Math.sin((Mp-M)*rad)
    - 0.035*Math.sin(D*rad) - 0.031*Math.sin((Mp+M)*rad) - 0.015*Math.sin((2*F-2*D)*rad)
    + 0.011*Math.sin((Mp-4*D)*rad);
  return normDeg(Lp + dL);
}
function lahiriAyanamsa(year){ return 23.85 + 0.01397*(year-2000); }

const NAK_DEV = ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वाफाल्गुनी","उत्तराफाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपद","उत्तराभाद्रपद","रेवती"];
const NAK_EN = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const YOGA_DEV = ["विष्कुम्भ","प्रीति","आयुष्मान","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान्","परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","इन्द्र","वैधृति"];
const YOGA_EN = ["Vishkumbha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
const TITHI_DEV = ["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी"];
const TITHI_EN = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi"];
const KARANA_MOV_DEV = ["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि"];
const KARANA_MOV_EN = ["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"];
const KARANA_FIX_DEV = ["किंस्तुघ्न","शकुनि","चतुष्पाद","नाग"];
const KARANA_FIX_EN = ["Kimstughna","Shakuni","Chatushpada","Naga"];
const RASHI_DEV = ["मेष","वृषभ","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
const RASHI_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const RITU_DEV = ["वसन्त ऋतु","ग्रीष्म ऋतु","वर्षा ऋतु","शरद् ऋतु","हेमन्त ऋतु","शिशिर ऋतु"];
const RITU_EN = ["Vasanta","Grishma","Varsha","Sharad","Hemanta","Shishira"];
const DISHASHOOL_DEV = ["पश्चिम","पूर्व","उत्तर","उत्तर","दक्षिण","पश्चिम","पूर्व"];
const DISHASHOOL_EN = ["West","East","North","North","South","West","East"];
const CHANDRA_NIVASA_DEV = ["पूर्व","दक्षिण","पश्चिम","उत्तर"];
const CHANDRA_NIVASA_EN = ["East","South","West","North"];
const HORA_DEV = ["सूर्य","शुक्र","बुध","चन्द्र","शनि","गुरु","मङ्गल"];
const HORA_EN = ["Sun","Venus","Mercury","Moon","Saturn","Jupiter","Mars"];
const CHOGHADIYA_DEV = {udveg:"उद्वेग", char:"चर", labh:"लाभ", amrit:"अमृत", kaal:"काल", shubh:"शुभ", rog:"रोग"};
const CHOGHADIYA_EN = {udveg:"Udveg", char:"Char", labh:"Labh", amrit:"Amrit", kaal:"Kaal", shubh:"Shubh", rog:"Rog"};
const CHOGHADIYA_CYCLE = ["udveg","char","labh","amrit","kaal","shubh","rog"];
const CHOGHADIYA_DAY_START = [0, 3, 6, 2, 5, 1, 4];
const CHOGHADIYA_NIGHT_START = [5, 6, 1, 4, 0, 3, 2];

function computePanchangaAngles(now){
  const T = julianCenturiesNow(now);
  const sunLong = sunLongitudeNow(T);
  const moonLong = moonLongitudeNow(T);
  const ayan = lahiriAyanamsa(now.getFullYear());
  const sunSid = normDeg(sunLong - ayan);
  const moonSid = normDeg(moonLong - ayan);

  const tithiRaw = normDeg(moonLong - sunLong);
  const tithiAbs = Math.floor(tithiRaw/12) + 1;
  const paksha = tithiAbs<=15 ? 'shukla' : 'krishna';
  const tithiNum = tithiAbs<=15 ? tithiAbs : tithiAbs-15;
  let tithiDev, tithiEn;
  if(tithiNum===15){
    tithiDev = paksha==='shukla' ? 'पूर्णिमा' : 'अमावस्या';
    tithiEn = paksha==='shukla' ? 'Purnima' : 'Amavasya';
  } else {
    tithiDev = TITHI_DEV[tithiNum-1]; tithiEn = TITHI_EN[tithiNum-1];
  }
  const pakshaDev = paksha==='shukla' ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  const pakshaEn = paksha==='shukla' ? 'Shukla Paksha' : 'Krishna Paksha';

  const nakIdx = Math.floor(moonSid / (360/27)) % 27;
  const yogaIdx = Math.floor(normDeg(sunSid+moonSid) / (360/27)) % 27;
  const karanaIdx = Math.floor(tithiRaw/6) + 1;
  let karanaDev, karanaEn;
  if(karanaIdx===1){ karanaDev=KARANA_FIX_DEV[0]; karanaEn=KARANA_FIX_EN[0]; }
  else if(karanaIdx>=58){ karanaDev=KARANA_FIX_DEV[karanaIdx-57]; karanaEn=KARANA_FIX_EN[karanaIdx-57]; }
  else { const mi=(karanaIdx-2)%7; karanaDev=KARANA_MOV_DEV[mi]; karanaEn=KARANA_MOV_EN[mi]; }

  return {
    tithi: { dev: `${tithiDev} (${pakshaDev})`, en: `${tithiEn} (${pakshaEn})` },
    nakshatra: { dev: NAK_DEV[nakIdx], en: NAK_EN[nakIdx] },
    yoga: { dev: YOGA_DEV[yogaIdx], en: YOGA_EN[yogaIdx] },
    karana: { dev: karanaDev, en: karanaEn },
    moonRashi: { dev: RASHI_DEV[Math.floor(moonSid / 30)], en: RASHI_EN[Math.floor(moonSid / 30)] },
    chandraNivasa: { dev: CHANDRA_NIVASA_DEV[Math.floor(moonSid / 30) % 4], en: CHANDRA_NIVASA_EN[Math.floor(moonSid / 30) % 4] },
    ritu: { dev: RITU_DEV[Math.floor(normDeg(sunSid + 30) / 60) % 6], en: RITU_EN[Math.floor(normDeg(sunSid + 30) / 60) % 6] },
    ayana: { dev: (sunSid >= 270 || sunSid < 90) ? 'उत्तरायण' : 'दक्षिणायन', en: (sunSid >= 270 || sunSid < 90) ? 'Uttarayana' : 'Dakshinayana' }
  };
}

function formatPeriod(period){ return `${fmtTimeKtm(period.start)} – ${fmtTimeKtm(period.end)}`; }

function computeHoraData(sun, nextSun, weekday, now){
  const periods = [];
  const dayMs = (sun.sunset - sun.sunrise) / 12;
  const nightMs = (nextSun.sunrise - sun.sunset) / 12;
  for(let i=0;i<12;i++) periods.push({start:new Date(sun.sunrise.getTime()+i*dayMs), end:new Date(sun.sunrise.getTime()+(i+1)*dayMs), planet:HORA_DEV[(weekday+i)%7], planetEn:HORA_EN[(weekday+i)%7], part:'day'});
  for(let i=0;i<12;i++) periods.push({start:new Date(sun.sunset.getTime()+i*nightMs), end:new Date(sun.sunset.getTime()+(i+1)*nightMs), planet:HORA_DEV[(weekday+12+i)%7], planetEn:HORA_EN[(weekday+12+i)%7], part:'night'});
  return { current: periods.find(period=>now >= period.start && now <= period.end) || periods[0], periods };
}

function computeChoghadiyaData(sun, nextSun, weekday, now){
  const periods = [];
  const dayMs = (sun.sunset - sun.sunrise) / 8;
  const nightMs = (nextSun.sunrise - sun.sunset) / 8;
  const addPeriods = (start, length, offset, part) => {
    for(let i=0;i<8;i++){
      const key = CHOGHADIYA_CYCLE[(offset+i)%CHOGHADIYA_CYCLE.length];
      periods.push({start:new Date(start.getTime()+i*length), end:new Date(start.getTime()+(i+1)*length), key, part});
    }
  };
  addPeriods(sun.sunrise, dayMs, CHOGHADIYA_DAY_START[weekday], 'day');
  addPeriods(sun.sunset, nightMs, CHOGHADIYA_NIGHT_START[weekday], 'night');
  return { current: periods.find(period=>now >= period.start && now <= period.end) || periods[0], periods };
}

function computeTodayPanchanga(){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
  const sun = calcSunTimes(y, m, d, KTM_LAT, KTM_LON);
  const nextDate = new Date(y, m-1, d+1);
  const nextSun = calcSunTimes(nextDate.getFullYear(), nextDate.getMonth()+1, nextDate.getDate(), KTM_LAT, KTM_LON);
  const weekday = now.getDay();
  const rahu = segmentTimes(sun.sunrise, sun.sunset, RAHU_SEGMENT[weekday]);
  const yama = segmentTimes(sun.sunrise, sun.sunset, YAMA_SEGMENT[weekday]);
  const gulika = segmentTimes(sun.sunrise, sun.sunset, GULIKA_SEGMENT[weekday]);
  const abhijit = abhijitMuhurta(sun.sunrise, sun.sunset);
  const angles = computePanchangaAngles(now);
  const hora = computeHoraData(sun, nextSun, weekday, now);
  const choghadiya = computeChoghadiyaData(sun, nextSun, weekday, now);
  let bs = null;
  try{ const NepaliDateCtor = nepaliDateConstructor(); if(NepaliDateCtor){ const nd = new NepaliDateCtor(now); bs = { year: nd.getYear(), month: nd.getMonth()+1, day: nd.getDate() }; } }catch(e){ console.warn(e); }
  return { now, sun, rahu, yama, gulika, abhijit, bs, weekday, angles, hora, choghadiya };
}

function muhurtaStatus(now, period, t){
  if(now < period.start) return {label:t.muhurtaUpcoming, cls:'upcoming'};
  if(now > period.end) return {label:t.muhurtaDone, cls:'done'};
  return {label:t.muhurtaNow, cls:'now'};
}

const WEEKDAY_NAMES = {
  ne: ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'],
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  hi: ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'],
  sa: ['रविवासरः','सोमवासरः','मङ्गलवासरः','बुधवासरः','गुरुवासरः','शुक्रवासरः','शनिवासरः']
};

function renderPanchangaPage(){
  const t = T[LANG];
  const data = computeTodayPanchanga();
  const grid = document.getElementById('panchangaGrid');
  if(grid){
    const bsStr = data.bs ? `${data.bs.day} ${(LANG==='en'?BS_MONTHS_EN:BS_MONTHS_NE)[data.bs.month-1]} ${data.bs.year}` : '—';
    const adStr = data.now.toLocaleDateString(LANG==='ne'?'ne-NP':LANG==='hi'?'hi-IN':'en-US', {year:'numeric',month:'long',day:'numeric'});
    const devLang = (LANG==='en') ? 'en' : 'dev';
    const rows = [
      [t.lblAdDate, adStr],
      [t.lblBsDate, bsStr],
      [t.lblWeekday, WEEKDAY_NAMES[LANG][data.weekday]],
      [t.lblSunrise, fmtTimeKtm(data.sun.sunrise)],
      [t.lblSunset, fmtTimeKtm(data.sun.sunset)],
      [t.lblTithi, data.angles.tithi[devLang]],
      [t.lblNakshatra, data.angles.nakshatra[devLang]],
      [t.lblYoga, data.angles.yoga[devLang]],
      [t.lblKarana, data.angles.karana[devLang]],
      [t.lblMoonRashi, data.angles.moonRashi[devLang]],
      [t.lblRitu, data.angles.ritu[devLang]],
      [t.lblAyana, data.angles.ayana[devLang]],
      [t.lblDishashool, (LANG==='en'?DISHASHOOL_EN:DISHASHOOL_DEV)[data.weekday]],
      [t.lblChandraNivasa, data.angles.chandraNivasa[devLang]]
    ];
    grid.innerHTML = rows.map(([label,val])=>`<div class="stat-card" style="text-align:left;padding:16px 18px;"><div style="font-size:.74rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;">${label}</div><div style="font-size:1rem;font-weight:600;color:var(--navy);margin-top:4px;">${val}</div></div>`).join('');
  }
  const muhGrid = document.getElementById('muhurtaGrid');
  if(muhGrid){
    const periods = [
      [t.muhLabels.abhijit, data.abhijit],
      [t.muhLabels.rahu, data.rahu],
      [t.muhLabels.gulika, data.gulika],
      [t.muhLabels.yama, data.yama]
    ];
    muhGrid.innerHTML = periods.map(([label,period])=>{
      const st = muhurtaStatus(data.now, period, t);
      const badgeColor = st.cls==='now'?'var(--maroon)':(st.cls==='upcoming'?'var(--gold)':'#9a9a9a');
      return `<div class="service-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4 style="margin:0;">${label}</h4>
          <span style="background:${badgeColor};color:#fff;font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:999px;">${st.label}</span>
        </div>
        <p style="margin:8px 0 0;font-size:.9rem;">${formatPeriod(period)}</p>
      </div>`;
    }).join('');
  }
  const horaGrid = document.getElementById('horaGrid');
  if(horaGrid){
    const horaName = LANG==='en' ? data.hora.current.planetEn : data.hora.current.planet;
    horaGrid.innerHTML = `<div class="service-card"><h4>${t.horaCurrent}</h4><p style="margin:8px 0 0;font-size:1rem;font-weight:700;">${horaName} · ${formatPeriod(data.hora.current)}</p></div>` + data.hora.periods.map((period,index)=>`<div class="stat-card" style="text-align:left;padding:12px 14px;"><div style="font-size:.74rem;font-weight:700;color:var(--gold);">${index+1}. ${LANG==='en'?period.planetEn:period.planet}</div><div style="font-size:.86rem;margin-top:3px;">${formatPeriod(period)}</div></div>`).join('');
  }
  const choghadiyaGrid = document.getElementById('choghadiyaGrid');
  if(choghadiyaGrid){
    const names = LANG==='en' ? CHOGHADIYA_EN : CHOGHADIYA_DEV;
    choghadiyaGrid.innerHTML = data.choghadiya.periods.map((period,index)=>`<div class="stat-card" style="text-align:left;padding:12px 14px;${period===data.choghadiya.current?'border-color:var(--gold);box-shadow:var(--shadow);':''}"><div style="font-size:.74rem;font-weight:700;color:var(--gold);">${index<8?t.choghadiyaDay:t.choghadiyaNight} ${index%8+1} · ${names[period.key]}</div><div style="font-size:.86rem;margin-top:3px;">${formatPeriod(period)}</div></div>`).join('');
  }
  setText('panchangaPageTitleEl', t.panchangaPageTitle);
  setText('panchangaPageSubEl', t.panchangaPageSub);
  setText('muhurtaTitleEl', t.muhurtaTitle);
  setText('muhurtaSubEl', t.muhurtaSub);
  setText('horaTitleEl', t.horaTitle);
  setText('choghadiyaTitleEl', t.choghadiyaTitle);
  setText('panchangaAccuracyNoteEl', t.panchangaAccuracyNote);
  setText('refreshBtnEl', t.refreshBtn);
}
