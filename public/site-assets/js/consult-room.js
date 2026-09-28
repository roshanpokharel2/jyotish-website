/* ============================================================
   CONSULTATION ROOM
   One private room per booking: the server (/api/consultations/join) verifies
   the caller and hands back a short-lived token; this page only joins with it,
   publishes the microphone (plus camera unless the booking is audio-only) and
   renders the other side. No token is stored anywhere.
============================================================ */

const CR_STRINGS = {
  ne:{ title:"परामर्श कक्ष", connecting:"जोडिँदै…", waiting:"अर्को पक्षको प्रतीक्षा…", live:"जोडियो।", mute:"म्यूट", unmute:"अनम्यूट", camera:"क्यामेरा", cameraOff:"क्यामेरा बन्द", leave:"छोड्नुहोस्", signIn:"पहिले मुख्य साइटमा लगइन गर्नुहोस्।", notJoinable:"यो परामर्शमा अहिले जोडिन सकिँदैन।", failed:"जडान असफल भयो। कृपया फेरि प्रयास गर्नुहोस्।" },
  en:{ title:"Consultation room", connecting:"Connecting…", waiting:"Waiting for the other side…", live:"Connected.", mute:"Mute", unmute:"Unmute", camera:"Camera", cameraOff:"Camera off", leave:"Leave", signIn:"Please sign in on the main site first.", notJoinable:"This consultation cannot be joined right now.", failed:"Connection failed. Please try again." },
  hi:{ title:"परामर्श कक्ष", connecting:"जुड़ रहे हैं…", waiting:"दूसरे पक्ष की प्रतीक्षा…", live:"जुड़ गए।", mute:"म्यूट", unmute:"अनम्यूट", camera:"कैमरा", cameraOff:"कैमरा बंद", leave:"छोड़ें", signIn:"पहले मुख्य साइट पर लॉगिन करें।", notJoinable:"इस परामर्श में अभी नहीं जुड़ा जा सकता।", failed:"कनेक्शन विफल। कृपया पुनः प्रयास करें।" },
  sa:{ title:"परामर्शकक्षः", connecting:"युज्यते…", waiting:"अपरपक्षस्य प्रतीक्षा…", live:"युक्तम्।", mute:"मूकम्", unmute:"अमूकम्", camera:"क्यामरा", cameraOff:"क्यामरा बन्दम्", leave:"त्यजतु", signIn:"प्रथमं मुख्यस्थाने प्रविशतु।", notJoinable:"अस्मिन् परामर्शे इदानीं योक्तुं न शक्यते।", failed:"सम्बन्धः विफलः। पुनः प्रयतताम्।" }
};

let crLang = 'ne';
let crRoom = null;
let crMode = 'audio_video';

const crText = (key) => (CR_STRINGS[crLang] || CR_STRINGS.ne)[key];
const crEl = (id) => document.getElementById(id);
const crSay = (key) => { crEl('crStatus').textContent = crText(key); };
const crFail = (key, detail) => {
  crEl('crError').innerHTML = `<div class="disclaimer-box" style="margin-top:14px;">${escapeHtml(crText(key))}${detail ? ` ${escapeHtml(detail)}` : ''}</div>`;
  crSay(key);
};

function crPaint(){
  document.documentElement.lang = crLang;
  crEl('crTitle').textContent = crText('title');
  crEl('crLang').innerHTML = ['ne','en','hi','sa']
    .map(l => `<button class="${l === crLang ? 'active' : ''}" onclick="crSetLang('${l}')">${l}</button>`).join('');
  crEl('crMic').textContent = crRoom && crRoom.localParticipant.isMicrophoneEnabled ? crText('unmute') : crText('mute');
  crEl('crCam').textContent = crRoom && crRoom.localParticipant.isCameraEnabled ? crText('cameraOff') : crText('camera');
  crEl('crCam').style.display = crMode === 'audio' ? 'none' : '';
  crEl('crLeave').textContent = crText('leave');
}

function crSetLang(l){
  crLang = CR_STRINGS[l] ? l : 'ne';
  crPaint();
}

function crAttach(participant){
  participant.trackPublications.forEach(pub => {
    if(pub.track && pub.kind === 'video') pub.track.attach(crEl('crRemote'));
    if(pub.track && pub.kind === 'audio') pub.track.attach(crEl('crRemoteAudio'));
  });
}

async function crInit(){
  crPaint();
  document.getElementById('crMic').onclick = async () => {
    if(!crRoom) return;
    await crRoom.localParticipant.setMicrophoneEnabled(!crRoom.localParticipant.isMicrophoneEnabled);
    crPaint();
  };
  document.getElementById('crCam').onclick = async () => {
    if(!crRoom) return;
    await crRoom.localParticipant.setCameraEnabled(!crRoom.localParticipant.isCameraEnabled);
    crPaint();
  };
  document.getElementById('crLeave').onclick = async () => {
    if(crRoom) await crRoom.disconnect();
    window.location.href = '/';
  };

  const bookingId = new URLSearchParams(window.location.search).get('booking');
  if(!bookingId) return crFail('notJoinable');
  const supabase = window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    auth:{ persistSession:true, autoRefreshToken:true }
  });
  const session = (await supabase.auth.getSession()).data.session;
  if(!session) return crFail('signIn');

  let joined;
  try{
    const response = await fetch('/api/consultations/join', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
      body: JSON.stringify({ bookingId })
    });
    joined = await response.json().catch(()=>({}));
    if(!response.ok) return crFail(response.status === 409 ? 'notJoinable' : 'failed', joined.error?.message);
  } catch(err){
    return crFail('failed');
  }

  crMode = joined.mode;
  crSay('connecting');
  try{
    crRoom = new LivekitClient.Room({ adaptiveStream:true, dynacast:true });
    crRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
      if(track.kind === 'video') track.attach(crEl('crRemote'));
      if(track.kind === 'audio') track.attach(crEl('crRemoteAudio'));
      crSay('live');
    });
    crRoom.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => track.detach());
    crRoom.on(LivekitClient.RoomEvent.Disconnected, () => crSay('waiting'));
    await crRoom.connect(joined.url, joined.token);
    await crRoom.localParticipant.setMicrophoneEnabled(true);
    if(joined.mode !== 'audio') await crRoom.localParticipant.setCameraEnabled(true);
    crRoom.localParticipant.trackPublications.forEach(pub => {
      if(pub.videoTrack) pub.videoTrack.attach(crEl('crLocal'));
    });
    if(crRoom.remoteParticipants.size) crRoom.remoteParticipants.forEach(crAttach);
    else crSay('waiting');
    crPaint();
  } catch(err){
    crFail('failed');
  }
}

// escapeHtml comes from site-helpers.js on the main site; the room stands
// alone, so it carries a tiny local copy.
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

document.addEventListener('DOMContentLoaded', crInit);
