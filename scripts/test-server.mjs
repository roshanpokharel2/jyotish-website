// End-to-end check of the server layer (lib/server/*, app/api/*) against a running app:
//
//   npm run dev                      (one terminal)
//   npm run test:server              (another; API_BASE=http://localhost:3100 to change)
//
// Development only (same guard as db.mjs). Creates throwaway Auth users with the admin
// API, signs them in over HTTP like the browser, and deletes them (and their chat
// files) at the end.
import { createClient } from '@supabase/supabase-js';
import { assertTarget, env } from './env.mjs';

assertTarget();
const base = process.env.API_BASE ?? 'http://localhost:3000';
// No realtime here; the stub also keeps supabase-js working on Node < 22.
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: class { constructor() { throw new Error('no realtime in tests'); } } },
};
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
// Browser-like clients get realtime when Node has WebSocket (22+, or 20 with
// --experimental-websocket, which the npm script passes).
const browserOptions = typeof WebSocket === 'undefined' ? options : { auth: options.auth };
const browser = () => createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, browserOptions);

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + JSON.stringify(detail)}`);
  if (!ok) failures++;
};
const call = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const r = await fetch(`${base}${path}`, { method, headers, body });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json, cache: r.headers.get('cache-control') };
};
const me = (headers = {}, method = 'GET') => call('/api/me', { method, headers });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const postJson = (path, user, value, raw) => call(path, {
  method: 'POST',
  headers: { ...bearer(user.token), 'Content-Type': 'application/json' },
  body: raw ?? JSON.stringify(value),
});
const upload = (conversationId, user, ...files) => {
  const form = new FormData();
  for (const [bytes, name, type] of files) form.append('file', new Blob([bytes], { type }), name);
  return call(`/api/chat/conversations/${conversationId}/attachments`, { method: 'POST', headers: bearer(user.token), body: form });
};

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f40000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

const stamp = Date.now();
const created = [];
const clients = [];
const newUser = async (label) => {
  const email = `servertest-${label}-${stamp}@example.test`;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  const client = browser();
  clients.push(client);
  const { data: s, error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, email, token: s.session.access_token, db: client };
};
const addCustomer = async (u) => {
  const { data, error } = await admin.from('customers').insert({ user_id: u.id, full_name: 'Server Test' }).select('id').single();
  if (error) throw error;
  u.customerId = data.id;
};
const conversationIds = new Set();
const proofPrefixes = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (condition, ms = 10000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(200)) if (condition()) return true;
  return condition();
};
// A realtime subscription as the browser makes it. Ready once Realtime reports the
// database subscription itself ("Subscribed to PostgreSQL"), which can trail SUBSCRIBED.
const listen = (client, name, spec) => {
  const rows = [];
  const ready = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(`realtime ${name}: not ready after 20 s`)), 20000);
    client.channel(name)
      .on('postgres_changes', spec, (change) => rows.push(change.new))
      .on('system', {}, (event) => {
        if (event.extension !== 'postgres_changes') return;
        if (event.status === 'ok') resolve();
        else reject(new Error(`realtime ${name}: ${event.message}`));
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(error ?? new Error(`realtime ${status}`));
      });
  });
  return { rows, ready };
};

try {
  const reach = await fetch(`${base}/api/me`).catch(() => null);
  if (!reach) throw new Error(`no app at ${base} -- start it with npm run dev`);

  const c = await newUser('customer');
  const b = await newUser('blocked');
  const x = await newUser('signedout');
  const s = await newUser('stranger');
  const a = await newUser('astrologer');
  // Customer rows, as the browser's login sync creates them; B is then blocked by staff.
  for (const u of [c, b, x, s, a]) await addCustomer(u);
  const { error: blockError } = await admin.from('customers').update({ status: 'blocked' }).eq('user_id', b.id);
  if (blockError) throw blockError;
  // An approved practitioner (written as the platform would on approval).
  const { data: astro, error: astroError } = await admin.from('astrologers')
    .insert({ user_id: a.id, name: 'Server Test Jyotish', status: 'active' }).select('id').single();
  if (astroError) throw astroError;

  // ---- practitioner directory (0017) ------------------------------------------------
  const rowRead = await c.db.from('astrologers').select('id, verification_documents, rejection_reason').eq('id', astro.id);
  check('directory: a customer cannot read the practitioner row', rowRead.data?.length === 0, rowRead);
  const listed = await c.db.rpc('active_practitioners');
  const entry = listed.data?.find((p) => p.id === astro.id);
  check('directory: a customer finds the practitioner, public columns only',
    entry?.name === 'Server Test Jyotish' && !Object.keys(entry).some((k) => /user_id|status|verification|rejection|review|applied/.test(k)), listed);
  const visitorList = await browser().rpc('active_practitioners');
  check('directory: visitors are refused', !!visitorList.error, visitorList);
  const ownList = await a.db.rpc('active_practitioners');
  check('directory: a practitioner is not offered to themselves', !ownList.error && !ownList.data.some((p) => p.id === astro.id), ownList);

  // ---- /api/me ------------------------------------------------------------------
  let r = await me();
  check('no token -> 401', r.status === 401 && r.body?.error?.code === 'unauthenticated', r);
  check('responses are not cacheable', r.cache === 'no-store', r.cache);
  r = await me({ Authorization: 'Bearer not-a-token' });
  check('garbage token -> 401', r.status === 401, r);
  r = await me({ Authorization: c.token });
  check('token without "Bearer" -> 401', r.status === 401, r);

  // Same signature, payload swapped to claim another user: must fail verification.
  const [h, , sig] = c.token.split('.');
  const payload = JSON.parse(Buffer.from(c.token.split('.')[1], 'base64url'));
  const forged = `${h}.${Buffer.from(JSON.stringify({ ...payload, sub: b.id })).toString('base64url')}.${sig}`;
  r = await me(bearer(forged));
  check('forged token (payload edited) -> 401', r.status === 401, r);
  r = await me(bearer(env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  check('publishable key as a token -> 401', r.status === 401, r);

  r = await me(bearer(c.token));
  check('signed-in customer -> 200 with db role', r.status === 200 && r.body?.id === c.id && r.body?.role === 'customer' && r.body?.customerId, r);
  check('response carries only id/email/role/customerId',
    r.status === 200 && Object.keys(r.body).sort().join() === 'customerId,email,id,role', r.body);

  r = await me(bearer(b.token));
  check('blocked customer -> 403 account_inactive', r.status === 403 && r.body?.error?.code === 'account_inactive', r);

  // ---- open a conversation --------------------------------------------------------
  const OPEN = '/api/chat/conversations';
  const direct = await c.db.from('chat_conversations').insert({ customer_id: c.customerId, astrologer_id: astro.id }).select();
  check('browser cannot create a conversation itself (RLS)', !!direct.error, direct);

  r = await call(OPEN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astrologerId: astro.id }) });
  check('open: no token -> 401', r.status === 401, r);
  r = await call(OPEN, { method: 'POST', headers: bearer(c.token), body: 'astrologerId=1' });
  check('open: not JSON content type -> 415', r.status === 415, r);
  r = await postJson(OPEN, c, null, '{"astrologerId":');
  check('open: malformed JSON -> 400', r.status === 400 && r.body?.error?.code === 'invalid_body', r);
  r = await postJson(OPEN, c, [astro.id]);
  check('open: array body -> 400', r.status === 400, r);
  r = await postJson(OPEN, c, { astrologerId: "' or 1=1 --" });
  check('open: astrologerId not a uuid -> 400', r.status === 400, r);
  r = await postJson(OPEN, c, { astrologerId: astro.id, pad: 'x'.repeat(5000) });
  check('open: body over 4 KB -> 413', r.status === 413, r);
  r = await postJson(OPEN, c, { astrologerId: crypto.randomUUID() });
  check('open: unknown practitioner -> 404', r.status === 404, r);
  await admin.from('astrologers').update({ status: 'suspended' }).eq('id', astro.id);
  r = await postJson(OPEN, c, { astrologerId: astro.id });
  check('open: suspended practitioner -> 404', r.status === 404, r);
  await admin.from('astrologers').update({ status: 'active' }).eq('id', astro.id);
  r = await postJson(OPEN, b, { astrologerId: astro.id });
  check('open: blocked customer -> 403', r.status === 403, r);
  r = await postJson(OPEN, a, { astrologerId: astro.id });
  check('open: practitioner with themselves -> 400', r.status === 400 && r.body?.error?.code === 'self', r);

  r = await postJson(OPEN, c, { astrologerId: astro.id });
  const conv = r.body?.conversation;
  if (conv) conversationIds.add(conv.id);
  check('open: customer -> 200, active, own customer id', r.status === 200 && conv?.status === 'active' && conv?.customer_id === c.customerId && conv?.astrologer_id === astro.id, r);
  const { data: parts } = await admin.from('chat_participants').select('user_id, role').eq('conversation_id', conv?.id);
  check('open: both participants added', parts?.length === 2 && parts.some((p) => p.user_id === c.id && p.role === 'customer') && parts.some((p) => p.user_id === a.id && p.role === 'astrologer'), parts);
  r = await postJson(OPEN, c, { astrologerId: astro.id });
  check('open again -> same conversation', r.body?.conversation?.id === conv?.id, r);
  const racing = await Promise.all([1, 2, 3].map(() => postJson(OPEN, s, { astrologerId: astro.id })));
  const racedIds = new Set(racing.map((x) => x.body?.conversation?.id));
  racedIds.forEach((id) => id && conversationIds.add(id));
  check('three concurrent opens -> one conversation', racing.every((x) => x.status === 200) && racedIds.size === 1, racing.map((x) => x.status));
  const strangerConv = [...racedIds][0];

  // RLS still decides reads and text posts.
  const seen = await c.db.from('chat_conversations').select('id');
  check('customer sees only their own conversation', seen.data?.length === 1 && seen.data[0].id === conv?.id, seen);
  const intrude = await s.db.from('chat_messages').insert({ conversation_id: conv?.id, sender_id: s.id, body: 'hi' });
  check('stranger cannot post into it', !!intrude.error, intrude);
  const post = await c.db.from('chat_messages').insert({ conversation_id: conv?.id, sender_id: c.id, body: 'Namaste' });
  check('customer posts text directly', !post.error, post);

  // ---- realtime -----------------------------------------------------------------------
  let closedLive = null;
  if (typeof WebSocket === 'undefined') {
    console.log('SKIP  realtime checks (no WebSocket in this Node; use npm run test:server)');
  } else {
    const toPractitioner = listen(a.db, 'rt-a', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conv?.id}` });
    closedLive = listen(a.db, 'rt-a-conv', { event: 'UPDATE', schema: 'public', table: 'chat_conversations', filter: `id=eq.${conv?.id}` });
    // The stranger asks for every chat message, no filter: RLS must still hide these.
    const toStranger = listen(s.db, 'rt-s', { event: 'INSERT', schema: 'public', table: 'chat_messages' });
    const toStrangerFiltered = listen(s.db, 'rt-s2', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conv?.id}` });
    await Promise.all([toPractitioner.ready, closedLive.ready, toStranger.ready, toStrangerFiltered.ready]);
    const live = await c.db.from('chat_messages').insert({ conversation_id: conv?.id, sender_id: c.id, body: 'live?' }).select('id').single();
    const arrived = await waitFor(() => toPractitioner.rows.some((m) => m.id === live.data?.id));
    check('realtime: practitioner receives the message live', arrived, toPractitioner.rows);
    check('realtime: delivered row is the stored one', toPractitioner.rows.find((m) => m.id === live.data?.id)?.body === 'live?', toPractitioner.rows);
    await sleep(2000);
    check('realtime: stranger receives nothing (unfiltered or filtered)', toStranger.rows.length === 0 && toStrangerFiltered.rows.length === 0, [toStranger.rows, toStrangerFiltered.rows]);
  }

  // ---- read state -------------------------------------------------------------------
  const READ = (id) => `/api/chat/conversations/${id}/read`;
  r = await call(READ(conv?.id), { method: 'POST', headers: bearer(s.token) });
  check('read: stranger -> 404', r.status === 404, r);
  r = await call(READ('not-a-uuid'), { method: 'POST', headers: bearer(c.token) });
  check('read: bad id -> 404', r.status === 404, r);
  r = await call(READ(conv?.id), { method: 'POST', headers: bearer(c.token) });
  const { data: mine } = await admin.from('chat_participants').select('last_read_at').eq('conversation_id', conv?.id).eq('user_id', c.id).single();
  check('read: participant -> 200, last_read_at stored', r.status === 200 && r.body?.lastReadAt && mine?.last_read_at && Date.parse(mine.last_read_at) === Date.parse(r.body.lastReadAt), { r, mine });

  // ---- attachments --------------------------------------------------------------------
  r = await upload(conv?.id, s, [PNG, 'x.png', 'image/png']);
  check('attach: stranger -> 404', r.status === 404, r);
  r = await upload(conv?.id, c, [PNG, '../../etc/evil<b>.png', 'image/png']);
  const att = r.body?.attachment;
  check('attach: PNG -> 200 image message', r.status === 200 && r.body?.message?.message_type === 'image' && r.body.message.sender_id === c.id, r);
  check('attach: stored under the conversation, name cleaned', att?.storage_path?.startsWith(`${conv?.id}/`) && att.storage_path.endsWith('.png') && att.file_name === 'evilb.png' && att.mime_type === 'image/png' && att.file_size === PNG.length, att);
  const got = await a.db.storage.from('chat-attachments').download(att?.storage_path ?? 'none');
  check('attach: other participant can download it', !got.error && got.data?.size === PNG.length, got.error);
  const peek = await s.db.storage.from('chat-attachments').download(att?.storage_path ?? 'none');
  check('attach: stranger cannot download it', !!peek.error, peek.data?.size);
  const peekRow = await s.db.from('message_attachments').select('id').eq('id', att?.id ?? crypto.randomUUID());
  check('attach: stranger cannot see the attachment row', peekRow.data?.length === 0, peekRow);
  r = await upload(conv?.id, a, [PDF, 'chart.pdf', 'application/pdf']);
  check('attach: PDF from the practitioner -> 200 file message', r.status === 200 && r.body?.message?.message_type === 'file' && r.body.attachment?.mime_type === 'application/pdf', r);
  r = await upload(conv?.id, c, [Buffer.from('<script>alert(1)</script>'), 'photo.png', 'image/png']);
  check('attach: HTML renamed to .png -> 415', r.status === 415, r);
  r = await upload(conv?.id, c, [Buffer.alloc(0), 'empty.png', 'image/png']);
  check('attach: empty file -> 400', r.status === 400, r);
  r = await upload(conv?.id, c, [PNG, 'a.png', 'image/png'], [PNG, 'b.png', 'image/png']);
  check('attach: two files -> 400', r.status === 400, r);
  r = await call(`/api/chat/conversations/${conv?.id}/attachments`, { method: 'POST', headers: { ...bearer(c.token), 'Content-Type': 'application/json' }, body: '{}' });
  check('attach: not multipart -> 415', r.status === 415, r);
  r = await upload(conv?.id, c, [Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]), 'big.png', 'image/png']);
  check('attach: over 10 MB -> 413', r.status === 413, r);
  const { count: attCount } = await admin.from('message_attachments').select('id, chat_messages!inner(conversation_id)', { count: 'exact', head: true }).eq('chat_messages.conversation_id', conv?.id);
  const { data: objects } = await admin.storage.from('chat-attachments').list(conv?.id);
  check('attach: refused uploads left no rows or files', attCount === 2 && objects?.length === 2, { attCount, objects: objects?.length });

  // ---- close ------------------------------------------------------------------------
  const CLOSE = (id) => `/api/chat/conversations/${id}/close`;
  r = await call(CLOSE(conv?.id), { method: 'POST', headers: bearer(s.token) });
  check('close: stranger -> 404', r.status === 404, r);
  r = await call(CLOSE(conv?.id), { method: 'POST', headers: bearer(a.token) });
  check('close: practitioner -> 200 closed', r.status === 200 && r.body?.conversation?.status === 'closed' && r.body.conversation.closed_at, r);
  r = await call(CLOSE(conv?.id), { method: 'POST', headers: bearer(c.token) });
  check('close again -> 200, still closed', r.status === 200 && r.body?.conversation?.status === 'closed', r);
  if (closedLive) {
    check('realtime: other side sees the close live', await waitFor(() => closedLive.rows.some((row) => row.status === 'closed')), closedLive.rows);
  }
  const late = await c.db.from('chat_messages').insert({ conversation_id: conv?.id, sender_id: c.id, body: 'still there?' });
  check('closed: text post refused', !!late.error, late);
  r = await upload(conv?.id, c, [PNG, 'x.png', 'image/png']);
  check('closed: attachment -> 409', r.status === 409, r);
  const history = await c.db.from('chat_messages').select('id').eq('conversation_id', conv?.id);
  check('closed: history still readable', history.data?.length === (closedLive ? 4 : 3), history);
  r = await postJson(OPEN, c, { astrologerId: astro.id });
  if (r.body?.conversation) conversationIds.add(r.body.conversation.id);
  check('open after close -> a new conversation', r.status === 200 && r.body?.conversation?.id !== conv?.id, r);
  r = await call(CLOSE(strangerConv), { method: 'POST', headers: bearer(c.token) });
  check("close: another customer's conversation -> 404", r.status === 404, r);

  // ---- bookings --------------------------------------------------------------------
  const BOOK = '/api/bookings';
  const service = async (slug) => (await admin.from('services').select('id').eq('slug', slug).is('astrologer_id', null).single()).data?.id;
  const callService = await service('live-call');
  const { error: hoursError } = await admin.from('availability')
    .insert([0, 1, 2, 3, 4, 5, 6].map((d) => ({ astrologer_id: astro.id, day_of_week: d, start_time: '09:00', end_time: '12:00' })));
  if (hoursError) throw hoursError;
  const day = new Date(Date.now() + 2 * 86400e3).toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
  // What the booking form will ask for: free slots, as a visitor, straight from the database.
  const freeSlots = async () => (await browser().rpc('available_slots', { p_astrologer: astro.id, p_service: callService, p_from: day, p_to: day })).data ?? [];
  const slots = await freeSlots();
  check('slots: a visitor gets the 6 free start times', slots.length === 6 && slots[0].starts_at, slots);
  const at = (i) => slots[i]?.starts_at;
  const book = (user, value) => postJson(BOOK, user, value);

  const directBooking = await c.db.from('bookings').insert({ customer_id: c.customerId, astrologer_id: astro.id, consultation_type_id: crypto.randomUUID(), status: 'confirmed' });
  check('browser cannot write a booking itself (RLS)', !!directBooking.error, directBooking);
  r = await call(BOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astrologerId: astro.id, serviceId: callService, startsAt: at(0) }) });
  check('book: no token -> 401', r.status === 401, r);
  r = await book(c, { astrologerId: 'kp', serviceId: callService, startsAt: at(0) });
  check('book: astrologerId not a uuid -> 400', r.status === 400, r);
  r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: `${day}T10:00` });
  check('book: time without a time zone -> 400', r.status === 400, r);
  r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: at(0), notes: 'x'.repeat(2001) });
  check('book: notes over 2000 characters -> 400', r.status === 400, r);
  r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: at(0), notes: { html: '<b>' } });
  check('book: notes not text -> 400', r.status === 400, r);
  const person = { name: ' Ram ', dobAd: '1990-01-15', tob: '05:30', pob: 'Pokhara', country: 'Nepal', dobBs: { year: 2046, month: 10, day: 1 } };
  const future = new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10);
  for (const [what, subject] of [['a birth date in the future', { ...person, dobAd: future }], ['an impossible date', { ...person, dobAd: '1990-02-30' }],
    ['a bad birth time', { ...person, tob: '25:00' }], ['no birth place', { ...person, pob: '' }], ['not an object', ['Ram']]]) {
    r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: at(0), subject });
    check(`book: subject with ${what} -> 400`, r.status === 400, r);
  }
  r = await book(b, { astrologerId: astro.id, serviceId: callService, startsAt: at(0) });
  check('book: blocked customer -> 403', r.status === 403, r);
  r = await book(a, { astrologerId: astro.id, serviceId: callService, startsAt: at(0) });
  check('book: practitioner books themselves -> 400', r.status === 400 && r.body?.error?.code === 'self', r);
  r = await book(c, { astrologerId: astro.id, serviceId: crypto.randomUUID(), startsAt: at(0) });
  check('book: unknown service -> 404', r.status === 404, r);
  r = await book(c, { astrologerId: astro.id, serviceId: await service('direct'), startsAt: at(0) });
  check('book: draft service -> 404', r.status === 404, r);
  r = await book(c, { astrologerId: crypto.randomUUID(), serviceId: callService, startsAt: at(0) });
  check('book: unknown practitioner -> 404', r.status === 404, r);
  r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: new Date(Date.parse(at(0)) + 10 * 60e3).toISOString() });
  check('book: a time that is not offered -> 409', r.status === 409 && r.body?.error?.code === 'slot_unavailable', r);

  // The browser's claims about price, status, owner and length are ignored.
  const sentAt = Date.now();
  r = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: at(0), notes: ' Career question ',
    price: 1, status: 'confirmed', customerId: s.customerId, endsAt: at(5), currency: 'USD', subject: { ...person, role: 'admin' } });
  const booked = r.body?.booking;
  check('book: customer -> 200, payment_pending, price and length from the database',
    r.status === 200 && booked?.status === 'payment_pending' && booked.price === 1000 && booked.currency === 'NPR'
    && Date.parse(booked.endsAt) - Date.parse(booked.startsAt) === 30 * 60e3 && Date.parse(booked.startsAt) === Date.parse(at(0))
    && booked.notes === 'Career question', r);
  const holdMinutes = (Date.parse(booked?.holdExpiresAt) - sentAt) / 60e3;
  check('book: slot held for about 20 minutes', holdMinutes > 19 && holdMinutes < 21, booked?.holdExpiresAt);
  check('book: subject stored trimmed, unknown fields dropped',
    booked?.subject?.name === 'Ram' && booked.subject.dobAd === '1990-01-15' && booked.subject.tob === '05:30'
    && booked.subject.dobBs?.year === 2046 && Object.keys(booked.subject).sort().join() === 'country,dobAd,dobBs,name,pob,tob', booked?.subject);
  check('book: response has no commission or internal fields', booked && !Object.keys(booked).some((k) => /commission|customer/i.test(k)), booked);
  const { data: stored } = await admin.from('bookings').select('customer_id, status').eq('id', booked?.id ?? crypto.randomUUID()).single();
  check('book: stored for the signed-in customer, not the one claimed', stored?.customer_id === c.customerId && stored.status === 'payment_pending', stored);
  check('book: the held time is no longer offered', !(await freeSlots()).some((x) => x.starts_at === at(0)), null);
  r = await book(s, { astrologerId: astro.id, serviceId: callService, startsAt: at(0) });
  check('book: the same time again -> 409', r.status === 409 && r.body?.error?.code === 'slot_unavailable', r);

  // Three customers ask for one time at the same moment.
  const race = await Promise.all([s, x, c].map((u) => book(u, { astrologerId: astro.id, serviceId: callService, startsAt: at(1) })));
  check('book: three concurrent requests for one time -> one 200, two 409',
    race.filter((x) => x.status === 200).length === 1 && race.filter((x) => x.status === 409).length === 2, race.map((x) => x.status));

  // No more than two slots held at once per customer.
  let holdsRefused = null;
  for (let i = 2; i <= 4 && !holdsRefused; i++) {
    const res = await book(c, { astrologerId: astro.id, serviceId: callService, startsAt: at(i) });
    if (res.status !== 200) holdsRefused = res;
  }
  const { count: cHolds } = await admin.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', c.customerId).eq('status', 'payment_pending');
  check('book: a third hold -> 409 too_many_holds', holdsRefused?.body?.error?.code === 'too_many_holds' && cHolds === 2, { holdsRefused, cHolds });

  // Reads stay with RLS; the browser still cannot change a booking.
  const ownBookings = await c.db.from('bookings').select('id, customer_id');
  check('bookings: customer sees only their own', ownBookings.data?.length === 2 && ownBookings.data.every((x) => x.customer_id === c.customerId), ownBookings);
  const othersBooking = await s.db.from('bookings').select('id').eq('id', booked?.id ?? crypto.randomUUID());
  check("bookings: another customer cannot see it", othersBooking.data?.length === 0, othersBooking);
  const practitionerView = await a.db.from('bookings').select('id, subject').eq('id', booked?.id ?? crypto.randomUUID());
  check('bookings: the practitioner sees it, with the birth details', practitionerView.data?.length === 1 && practitionerView.data[0].subject?.pob === 'Pokhara', practitionerView);
  const selfConfirm = await c.db.from('bookings').update({ status: 'confirmed' }).eq('id', booked?.id ?? crypto.randomUUID()).select();
  const { data: still } = await admin.from('bookings').select('status').eq('id', booked?.id ?? crypto.randomUUID()).single();
  check('bookings: customer cannot confirm their own booking', (selfConfirm.error || selfConfirm.data?.length === 0) && still?.status === 'payment_pending', { selfConfirm, still });
  r = await call(BOOK, { headers: bearer(c.token) });
  check('book: GET -> 405', r.status === 405, r.status);

  // ---- payment proof (8b) -------------------------------------------------------
  // Fail-before: on 8a this route does not exist, so the PNG upload below 404s.
  const PROOF = (paymentId) => `/api/payments/${paymentId}/proof`;
  const uploadProof = (paymentId, user, ...files) => {
    const form = new FormData();
    for (const [bytes, name, type] of files) form.append('file', new Blob([bytes], { type }), name);
    return call(PROOF(paymentId), { method: 'POST', headers: bearer(user.token), body: form });
  };
  const { data: bookedPay } = await admin.from('payments').select('id, status').eq('booking_id', booked?.id ?? crypto.randomUUID()).maybeSingle();
  check('book: the booking opened an awaiting payment', bookedPay?.status === 'awaiting_payment', bookedPay);
  r = await call(PROOF(bookedPay?.id ?? crypto.randomUUID()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('proof: no token -> 401', r.status === 401 && r.body?.error?.code === 'unauthenticated', r);
  r = await uploadProof('not-a-uuid', c, [PNG, 'shot.png', 'image/png']);
  check('proof: bad id -> 404', r.status === 404, r);
  r = await uploadProof(bookedPay?.id, s, [PNG, 'shot.png', 'image/png']);
  check('proof: another customer -> 404', r.status === 404, r);
  r = await uploadProof(bookedPay?.id, b, [PNG, 'shot.png', 'image/png']);
  check('proof: blocked customer -> 403', r.status === 403, r);
  r = await uploadProof(bookedPay?.id, c, [Buffer.from('<script>alert(1)</script>'), 'shot.png', 'image/png']);
  check('proof: HTML renamed to .png -> 415', r.status === 415, r);
  r = await uploadProof(bookedPay?.id, c, [Buffer.alloc(0), 'shot.png', 'image/png']);
  check('proof: empty file -> 400', r.status === 400, r);
  r = await uploadProof(bookedPay?.id, c, [PNG, 'a.png', 'image/png'], [PNG, 'b.png', 'image/png']);
  check('proof: two files -> 400', r.status === 400, r);
  r = await call(PROOF(bookedPay?.id), { method: 'POST', headers: { ...bearer(c.token), 'Content-Type': 'application/json' }, body: '{}' });
  check('proof: not multipart -> 415', r.status === 415, r);
  r = await uploadProof(bookedPay?.id, c, [Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]), 'big.png', 'image/png']);
  check('proof: over 10 MB -> 413', r.status === 413, r);
  const longForm = new FormData();
  longForm.append('file', new Blob([PNG], { type: 'image/png' }), 'shot.png');
  longForm.append('reference', 'x'.repeat(121));
  r = await call(PROOF(bookedPay?.id), { method: 'POST', headers: bearer(c.token), body: longForm });
  check('proof: reference over 120 characters -> 400', r.status === 400, r);

  const proofForm = new FormData();
  proofForm.append('file', new Blob([PNG], { type: 'image/png' }), 'esewa-shot.png');
  proofForm.append('reference', 'ESEWA-123');
  r = await call(PROOF(bookedPay?.id), { method: 'POST', headers: bearer(c.token), body: proofForm });
  check('proof: PNG -> 200 proof_submitted', r.status === 200 && r.body?.payment?.status === 'proof_submitted', r);
  const { data: proofRow } = await admin.from('payments').select('status, proof_storage_path, customer_reference').eq('id', bookedPay?.id ?? crypto.randomUUID()).single();
  const proofPrefix = `${c.id}/${bookedPay?.id}`;
  if (proofPrefix) proofPrefixes.add(proofPrefix);
  check('proof: path and reference stored on the payment',
    proofRow?.status === 'proof_submitted' && proofRow?.proof_storage_path?.startsWith(`${proofPrefix}/`) && proofRow?.proof_storage_path?.endsWith('.png') && proofRow?.customer_reference === 'ESEWA-123', proofRow);
  const proofDl = await admin.storage.from('payment-proofs').download(proofRow?.proof_storage_path ?? 'none');
  check('proof: server can fetch the file', !proofDl.error && proofDl.data?.size === PNG.length, proofDl.error);
  const proofPeek = await s.db.storage.from('payment-proofs').download(proofRow?.proof_storage_path ?? 'none');
  check('proof: another customer cannot fetch it directly', !!proofPeek.error, proofPeek.data?.size);
  const { data: held } = await admin.from('bookings').select('status, hold_expires_at, scheduled_at').eq('id', booked?.id ?? crypto.randomUUID()).single();
  check('proof: hold frozen at the consultation start', held?.status === 'payment_pending' && held?.hold_expires_at === held?.scheduled_at, held);
  check('proof: the held time is still not offered', !(await freeSlots()).some((x) => x.starts_at === at(0)), null);
  r = await uploadProof(bookedPay?.id, c, [PNG, 'again.png', 'image/png']);
  check('proof: a second proof -> 409', r.status === 409 && r.body?.error?.code === 'already_processed', r);
  const { data: proofObjects } = await admin.storage.from('payment-proofs').list(proofPrefix);
  check('proof: refused uploads left no extra files', proofObjects?.length === 1, proofObjects?.length);

  // ---- payment review (8c) --------------------------------------------------------
  // Fail-before: on 8b these routes do not exist, so the queue below 404s.
  const QUEUE = '/api/payments/review-queue';
  const decide = (paymentId, action, user, value) => postJson(`/api/payments/${paymentId}/${action}`, user, value ?? {});
  r = await call(QUEUE);
  check('queue: no token -> 401', r.status === 401, r);
  r = await call(QUEUE, { headers: bearer(c.token) });
  check('queue: customer -> 403', r.status === 403, r);
  await admin.from('users').update({ role: 'moderator' }).eq('id', s.id);
  r = await call(QUEUE, { headers: bearer(s.token) });
  check('queue: moderator -> 403', r.status === 403, r);
  r = await decide(bookedPay?.id ?? crypto.randomUUID(), 'approve', s, {});
  check('review: moderator cannot approve -> 403', r.status === 403, r);

  const f = await newUser('finance');
  await addCustomer(f);
  await admin.from('users').update({ role: 'finance' }).eq('id', f.id);
  const f2 = await newUser('finance2');
  await admin.from('users').update({ role: 'finance' }).eq('id', f2.id);

  r = await call(QUEUE, { headers: bearer(f.token) });
  const queued = r.body?.payments;
  check('queue: finance sees the proof, oldest consultation first',
    r.status === 200 && queued?.length === 1 && queued[0]?.id === bookedPay?.id && queued[0]?.proofUrl
    && queued[0]?.booking?.startsAt === at(0) && queued[0]?.customer?.name && queued[0]?.amount === 1000, r.body);
  const proofGet = await fetch(queued?.[0]?.proofUrl ?? 'http://localhost:0/none');
  check('queue: the signed proof URL downloads', proofGet.status === 200 && (await proofGet.arrayBuffer()).byteLength === PNG.length, proofGet.status);

  // A second proof lands while the first waits: the queue stays time-ordered.
  const holdsOf = async (customerId) => (await admin.from('bookings').select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId).eq('status', 'payment_pending')).count;
  const reviewer = (await holdsOf(s.customerId)) < 2 ? s : x;
  const sSlot = (await freeSlots())[0]?.starts_at;
  r = await book(reviewer, { astrologerId: astro.id, serviceId: callService, startsAt: sSlot });
  const sBooking = r.body?.booking;
  check('review: a second customer books and pays', r.status === 200 && sBooking?.id, r);
  r = await uploadProof((await admin.from('payments').select('id').eq('booking_id', sBooking?.id ?? crypto.randomUUID()).maybeSingle()).data?.id
    ?? crypto.randomUUID(), reviewer, [PNG, 's-shot.png', 'image/png']);
  check('review: second proof -> 200', r.status === 200 && r.body?.payment?.status === 'proof_submitted', r);
  const { data: sPayRow } = await admin.from('payments').select('proof_storage_path').eq('booking_id', sBooking?.id ?? crypto.randomUUID()).single();
  proofPrefixes.add(sPayRow.proof_storage_path.split('/').slice(0, 2).join('/'));
  r = await call(QUEUE, { headers: bearer(f.token) });
  const starts = r.body?.payments?.map((p) => p.booking.startsAt) ?? [];
  check('queue: two proofs, oldest consultation first',
    r.status === 200 && starts.length === 2 && starts[0] === at(0) && starts[0] <= starts[1], starts);

  r = await decide(bookedPay?.id, 'approve', f, {});
  check('approve: finance -> 200 paid', r.status === 200 && r.body?.payment?.status === 'paid', r);
  const { data: confirmed } = await admin.from('bookings').select('status').eq('id', booked?.id ?? crypto.randomUUID()).single();
  check('approve: the booking is confirmed', confirmed?.status === 'confirmed', confirmed);
  const { data: entries } = await admin.from('ledger_entries').select('entry_type, amount, direction').eq('payment_id', bookedPay?.id ?? crypto.randomUUID());
  const byType = Object.fromEntries((entries ?? []).map((e) => [e.entry_type, e]));
  check('approve: the ledger triple is written in the same transaction',
    entries?.length === 3 && byType.platform_gross?.amount === 1000 && byType.platform_commission?.amount === 150
    && byType.jyotish_payable?.amount === 850 && entries.every((e) => e.direction === 'credit'), entries);
  const { data: approvalAudit } = await admin.from('audit_log').select('actor_user_id, previous_state, new_state')
    .eq('entity_id', bookedPay?.id ?? crypto.randomUUID()).eq('action', 'payment.approved');
  check('approve: written to the audit log', approvalAudit?.length === 1 && approvalAudit[0]?.actor_user_id === f.id
    && approvalAudit[0]?.previous_state?.status === 'proof_submitted' && approvalAudit[0]?.new_state?.status === 'paid', approvalAudit);
  r = await decide(bookedPay?.id, 'approve', f, {});
  check('approve: again -> 409 already_processed', r.status === 409 && r.body?.error?.code === 'already_processed', r);
  r = await decide(bookedPay?.id, 'reject', f, { reason: 'late' });
  check('reject after approve -> 409', r.status === 409, r);

  const sPayId = (await admin.from('payments').select('id').eq('booking_id', sBooking?.id ?? crypto.randomUUID()).maybeSingle()).data?.id;
  r = await decide(sPayId ?? crypto.randomUUID(), 'reject', f, {});
  check('reject: missing reason -> 400', r.status === 400, r);
  r = await decide(sPayId ?? crypto.randomUUID(), 'reject', f, { reason: '   ' });
  check('reject: blank reason -> 400', r.status === 400, r);
  r = await decide(sPayId ?? crypto.randomUUID(), 'reject', f, { reason: 'No money arrived' });
  check('reject: finance -> 200 rejected', r.status === 200 && r.body?.payment?.status === 'rejected', r);
  const { data: cancelled } = await admin.from('bookings').select('status').eq('id', sBooking?.id ?? crypto.randomUUID()).single();
  check('reject: the booking is cancelled', cancelled?.status === 'cancelled', cancelled);
  check('reject: the slot is offered again', (await freeSlots()).some((x) => x.starts_at === sSlot), null);
  const { data: rejectionAudit } = await admin.from('audit_log').select('actor_user_id, reason')
    .eq('entity_id', sPayId ?? crypto.randomUUID()).eq('action', 'payment.rejected');
  check('reject: written to the audit log with the reason',
    rejectionAudit?.length === 1 && rejectionAudit[0]?.actor_user_id === f.id && rejectionAudit[0]?.reason === 'No money arrived', rejectionAudit);
  r = await decide(sPayId ?? crypto.randomUUID(), 'approve', f, {});
  check('approve after reject -> 409', r.status === 409, r);

  // Nobody decides their own booking: f books, pays, and is refused; f2 cleans up.
  const fSlot = (await freeSlots())[0]?.starts_at;
  r = await book(f, { astrologerId: astro.id, serviceId: callService, startsAt: fSlot });
  const fBooking = r.body?.booking;
  check('review: finance books their own consultation', r.status === 200 && fBooking?.id, r);
  const fPayId = (await admin.from('payments').select('id').eq('booking_id', fBooking?.id ?? crypto.randomUUID()).maybeSingle()).data?.id;
  r = await uploadProof(fPayId ?? crypto.randomUUID(), f, [PNG, 'f-shot.png', 'image/png']);
  check('review: own proof -> 200', r.status === 200, r);
  const { data: fPayRow } = await admin.from('payments').select('proof_storage_path').eq('id', fPayId ?? crypto.randomUUID()).single();
  proofPrefixes.add(fPayRow.proof_storage_path.split('/').slice(0, 2).join('/'));
  r = await decide(fPayId ?? crypto.randomUUID(), 'approve', f, {});
  check('review: self-approval -> 403', r.status === 403 && r.body?.error?.code === 'forbidden', r);
  r = await decide(fPayId ?? crypto.randomUUID(), 'reject', f2, { reason: 'Staff bookings are settled separately' });
  check('review: another finance reviewer can still decide -> 200', r.status === 200 && r.body?.payment?.status === 'rejected', r);

  r = await call(QUEUE, { headers: bearer(f2.token) });
  check('queue: empty once everything is decided', r.status === 200 && r.body?.payments?.length === 0, r.body);

  // ---- email drain (12b) ----------------------------------------------------------
  // Fail-before: without 12b this route 404s.
  const DRAIN = '/api/email/drain';
  const drain = (secret) => call(DRAIN, { method: 'POST', headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
  r = await drain(null);
  check('drain: no secret -> 401', r.status === 401, r);
  r = await drain('wrong-secret');
  check('drain: wrong secret -> 401', r.status === 401, r);
  // Muted recipients leave the queue quietly instead of being mailed.
  await admin.from('notification_preferences').upsert({ user_id: s.id, email_transactional: false });
  // Keyed by payment (stable), not by test user: the muted recipient's job
  // cancels, every other fresh job is attempted exactly once.
  const jobForEntity = async (paymentId) => (await admin.from('email_jobs').select('id, status, attempts')
    .eq('entity_id', paymentId ?? crypto.randomUUID()).order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
  const freshStates = async () => {
    const [cc, ss, ff] = await Promise.all([
      jobForEntity(bookedPay?.id), jobForEntity(sPayId), jobForEntity(fPayId),
    ]);
    return { c: cc?.status, s: ss?.status, f: ff?.status, attempts: [cc?.attempts ?? 0, ss?.attempts ?? 0, ff?.attempts ?? 0] };
  };
  // Older runs leave retrying orphans behind; drain until the fresh jobs leave
  // pending (at most a few rounds at batch 10).
  let rounds = 0;
  let fresh = await freshStates();
  while ((fresh.c === 'pending' || fresh.f === 'pending' || fresh.s === 'pending') && rounds < 4) {
    r = await drain(env.CRON_SECRET);
    if (r.status !== 200) break;
    rounds++;
    fresh = await freshStates();
  }
  check('drain: runs without error', r.status === 200 && r.body?.drained, r.body);
  // Sent with a working sender, failed-and-recorded without one; either way
  // attempted exactly once, and the muted job cancelled, never sent.
  check('drain: fresh jobs attempted, muted job cancelled',
    (fresh.c === 'sent' || fresh.c === 'failed') && (fresh.f === 'sent' || fresh.f === 'failed')
    && fresh.attempts.every((a) => a >= 1) && fresh.s === 'cancelled', fresh);
  const snap = JSON.stringify(fresh);
  r = await drain(env.CRON_SECRET);
  check('drain: nothing fresh reprocessed', r.status === 200 && JSON.stringify(await freshStates()) === snap, r.body);

  // ---- reminders run (13b) ----------------------------------------------------------
  // Fail-before: without 13b this route 404s.
  const RUN = '/api/reminders/run';
  const run = (secret) => call(RUN, { method: 'POST', headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
  r = await run(null);
  check('reminders: no secret -> 401', r.status === 401, r);
  r = await run('wrong-secret');
  check('reminders: wrong secret -> 401', r.status === 401, r);
  r = await call(RUN, { method: 'POST', headers: bearer(c.token) });
  check('reminders: user token is not a scheduler secret -> 401', r.status === 401, r);
  r = await run(env.CRON_SECRET);
  check('reminders: nothing due -> generated 0', r.status === 200 && r.body?.generated === 0, r.body);
  // Pull the confirmed booking into both windows; both kinds go out once.
  await admin.from('bookings').update({
    scheduled_at: new Date(Date.now() + 30 * 60e3).toISOString(),
    ends_at: new Date(Date.now() + 60 * 60e3).toISOString(),
  }).eq('id', booked?.id ?? crypto.randomUUID());
  r = await run(env.CRON_SECRET);
  check('reminders: due booking notified (24h + 1h)', r.status === 200 && r.body?.generated === 2, r.body);
  const { data: remindRows } = await admin.from('reminders').select('kind').eq('booking_id', booked?.id ?? crypto.randomUUID());
  check('reminders: both kinds recorded', remindRows?.length === 2 && remindRows.some((x) => x.kind === 'booking_24h') && remindRows.some((x) => x.kind === 'booking_1h'), remindRows);
  const { data: remindNotes } = await admin.from('notifications').select('user_id, type').eq('reference_id', booked?.id ?? crypto.randomUUID()).in('type', ['booking_24h', 'booking_1h']);
  check('reminders: customer and practitioner notified',
    remindNotes?.filter((x) => x.user_id === c.id).length === 2 && remindNotes?.filter((x) => x.user_id === a.id).length === 2, remindNotes);
  const { data: remindMail } = await admin.from('email_jobs').select('kind, status').eq('entity_id', booked?.id ?? crypto.randomUUID());
  check('reminders: customer emails queued',
    remindMail?.length === 2 && remindMail.every((x) => x.status === 'pending'), remindMail);
  r = await run(env.CRON_SECRET);
  check('reminders: second run is a no-op', r.status === 200 && r.body?.generated === 0, r.body);

  // ---- booking form payment step (8d) -------------------------------------------------
  // Fail-before: on 8c the booking response carries no payment id for the form.
  const xSlot = (await freeSlots())[0]?.starts_at;
  r = await book(x, { astrologerId: astro.id, serviceId: callService, startsAt: xSlot });
  const xBooking = r.body?.booking;
  check('book: response carries the payment id for the upload step', r.status === 200 && xBooking?.paymentId, xBooking);
  r = await uploadProof(xBooking?.paymentId ?? crypto.randomUUID(), x, [PNG, 'x-shot.png', 'image/png']);
  check('book: the form can submit proof straight from the response', r.status === 200 && r.body?.payment?.status === 'proof_submitted', r);
  const { data: xPayRow } = await admin.from('payments').select('proof_storage_path').eq('id', xBooking?.paymentId ?? crypto.randomUUID()).single();
  proofPrefixes.add(xPayRow.proof_storage_path.split('/').slice(0, 2).join('/'));
  // The eSewa account is public settings: the form reads it without staff help.
  const esewa = await x.db.from('platform_settings').select('key,value').in('key', ['esewa_account_label', 'esewa_account_id', 'esewa_qr_path']);
  const esewaMap = Object.fromEntries((esewa.data ?? []).map((s) => [s.key, s.value]));
  check('pay: eSewa account readable for the form, QR empty until set',
    esewaMap.esewa_account_id === '9851001890' && esewaMap.esewa_account_label && esewaMap.esewa_qr_path === '', esewaMap);
  // My Account: own bookings with their payment status, nothing else's.
  const myBookings = await x.db.from('bookings').select('id,payments(status)').eq('id', xBooking?.id ?? crypto.randomUUID());
  check('account: customer reads own booking with its payment status',
    myBookings.data?.length === 1 && myBookings.data[0]?.payments?.[0]?.status === 'proof_submitted', myBookings);
  const hiddenBooking = await c.db.from('bookings').select('id').eq('id', xBooking?.id ?? crypto.randomUUID());
  check('account: another customer cannot see it', hiddenBooking.data?.length === 0, hiddenBooking);

  // ---- payouts staff flow (16b) ---------------------------------------------------------
  // Fail-before: without 16b these routes 404.
  const PAYOUTS = '/api/payouts';
  const payoutDo = (id, action, user, value) => postJson(`/api/payouts/${id}/${action}`, user, value ?? {});
  r = await call(`${PAYOUTS}/queue`);
  check('payouts: no token -> 401', r.status === 401, r);
  r = await call(`${PAYOUTS}/queue`, { headers: bearer(c.token) });
  check('payouts: customer -> 403', r.status === 403, r);
  // x's proof is still waiting: finance confirms it first, funding the balance.
  const xPayId = (await admin.from('payments').select('id').eq('booking_id', xBooking?.id ?? crypto.randomUUID()).maybeSingle()).data?.id;
  r = await decide(xPayId ?? crypto.randomUUID(), 'approve', f, {});
  check('payouts: approving funds the balance -> 200', r.status === 200, r);
  const bal = await a.db.rpc('my_payout_balance').maybeSingle();
  check('payouts: practitioner reads own payable', bal.data?.payable === 1700, bal.data);
  r = await postJson(PAYOUTS, a, { astrologerId: astro.id, amount: 1000 });
  check('payouts: practitioner requests -> 200 pending', r.status === 200 && r.body?.payout?.status === 'pending', r);
  const payoutId = r.body?.payout?.id;
  r = await postJson(PAYOUTS, c, { astrologerId: astro.id, amount: 1000 });
  check('payouts: customer cannot request -> 403', r.status === 403, r);
  r = await postJson(PAYOUTS, a, { astrologerId: astro.id, amount: 100 });
  check('payouts: below the floor -> 409', r.status === 409 && r.body?.error?.code === 'too_small', r);
  r = await postJson(PAYOUTS, a, { astrologerId: astro.id, amount: 2000 });
  check('payouts: above the balance -> 409', r.status === 409, r);
  r = await call(`${PAYOUTS}/queue`, { headers: bearer(f2.token) });
  check('payouts: queue lists it with context',
    r.status === 200 && r.body?.payouts?.length === 1 && r.body.payouts[0]?.id === payoutId && r.body.payouts[0]?.payable === 1700, r.body);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'approve', f2, {});
  check('payouts: approve -> 200', r.status === 200 && r.body?.payout?.status === 'approved', r);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'approve', f2, {});
  check('payouts: double approve -> 409', r.status === 409, r);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'process', f2, {});
  check('payouts: process -> 200', r.status === 200 && r.body?.payout?.status === 'processing', r);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'pay', f2, {});
  check('payouts: pay without reference -> 400', r.status === 400, r);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'pay', f2, { externalReference: 'ESEWA-PA1' });
  check('payouts: pay -> 200 with ledger entry', r.status === 200 && r.body?.payout?.status === 'paid', r);
  const { data: payoutEntries } = await admin.from('ledger_entries').select('entry_type').eq('astrologer_id', astro.id).eq('entry_type', 'payout');
  check('payouts: the payout entry debits the balance', payoutEntries?.length === 1, payoutEntries);
  r = await payoutDo(payoutId ?? crypto.randomUUID(), 'pay', f2, { externalReference: 'ESEWA-PA1' });
  check('payouts: double pay -> 409', r.status === 409, r);
  const ownPayouts = await a.db.from('payouts').select('id');
  check('payouts: practitioner reads own rows', ownPayouts.data?.length === 1, ownPayouts);
  const hiddenPayouts = await c.db.from('payouts').select('id');
  check('payouts: customer reads none', hiddenPayouts.data?.length === 0, hiddenPayouts);

  // ---- reviews UI contract (14b) ------------------------------------------------------
  // The new My Account form inserts straight through RLS -- the exact calls,
  // over HTTP as the browser. (Eligibility itself was proved in 0030.)
  await admin.from('bookings').update({ status: 'completed' }).eq('id', xBooking?.id ?? crypto.randomUUID());
  const myReview = await x.db.from('reviews')
    .insert({ booking_id: xBooking?.id ?? crypto.randomUUID(), rating: 5, private_feedback: 'Thorough' }).select('id, rating, customer_id');
  check('review: customer reviews own completed booking',
    !myReview.error && myReview.data?.[0]?.rating === 5 && myReview.data[0]?.customer_id === x.customerId, myReview);
  const dupReview = await x.db.from('reviews').insert({ booking_id: xBooking?.id ?? crypto.randomUUID(), rating: 4 });
  check('review: a second review is refused', !!dupReview.error, dupReview.error?.message);
  const othersReview = await c.db.from('reviews').insert({ booking_id: xBooking?.id ?? crypto.randomUUID(), rating: 1 });
  check("review: another customer cannot review it", !!othersReview.error, othersReview.error?.message);
  const seenReviews = await browser().from('public_reviews').select('id, astrologer_id, rating').eq('astrologer_id', astro.id);
  check('review: visitors see the stars, and nothing else',
    seenReviews.data?.length === 1 && seenReviews.data[0]?.rating === 5 && !('private_feedback' in (seenReviews.data[0] ?? {})) && !('customer_id' in (seenReviews.data[0] ?? {})), seenReviews);
  const ratedPractitioner = await browser().from('practitioner_ratings').select('review_count, avg_rating').eq('astrologer_id', astro.id).maybeSingle();
  check('review: visitors see the computed average', ratedPractitioner.data?.review_count === 1 && ratedPractitioner.data?.avg_rating === 5, ratedPractitioner);

  // ---- refunds staff flow (16a) -------------------------------------------------------
  // Fail-before: without 16a these routes 404.
  const REFUNDS = '/api/refunds';
  const refundDo = (id, action, user, value) => postJson(`/api/refunds/${id}/${action}`, user, value ?? {});
  r = await call(`${REFUNDS}/queue`);
  check('refunds: no token -> 401', r.status === 401, r);
  r = await call(`${REFUNDS}/queue`, { headers: bearer(c.token) });
  check('refunds: customer -> 403', r.status === 403, r);
  r = await postJson(REFUNDS, f, { paymentId: bookedPay?.id, amount: 200, reason: 'test refund' });
  check('refunds: finance records -> 200 requested', r.status === 200 && r.body?.refund?.status === 'requested', r);
  const refundId = r.body?.refund?.id;
  r = await call(`${REFUNDS}/queue`, { headers: bearer(f.token) });
  check('refunds: queue lists it', r.status === 200 && r.body?.refunds?.length === 1 && r.body.refunds[0]?.id === refundId, r.body);
  r = await postJson(REFUNDS, f, { paymentId: bookedPay?.id, amount: 900, reason: 'too much' });
  check('refunds: over the paid amount -> 409', r.status === 409, r);
  r = await postJson(REFUNDS, c, { paymentId: bookedPay?.id, amount: 100, reason: 'mine' });
  check('refunds: customer cannot record -> 403', r.status === 403, r);
  r = await refundDo(refundId ?? crypto.randomUUID(), 'approve', f, {});
  check('refunds: approve -> 200', r.status === 200 && r.body?.refund?.status === 'approved', r);
  r = await refundDo(refundId ?? crypto.randomUUID(), 'approve', f, {});
  check('refunds: double approve -> 409', r.status === 409, r);
  r = await refundDo(refundId ?? crypto.randomUUID(), 'process', f, {});
  check('refunds: process -> 200', r.status === 200 && r.body?.refund?.status === 'processing', r);
  r = await refundDo(refundId ?? crypto.randomUUID(), 'complete', f, { externalReference: 'ESEWA-T1' });
  check('refunds: complete -> 200 with reversals', r.status === 200 && r.body?.refund?.status === 'completed', r);
  const { data: reversals } = await admin.from('ledger_entries').select('entry_type').eq('payment_id', bookedPay?.id ?? crypto.randomUUID()).eq('entry_type', 'refund_reversal');
  check('refunds: completion wrote the reversals', reversals?.length === 3, reversals);
  r = await postJson(REFUNDS, f, { paymentId: bookedPay?.id, amount: 300, reason: 'second' });
  const refund2 = r.body?.refund?.id;
  r = await refundDo(refund2 ?? crypto.randomUUID(), 'reject', f, {});
  check('refunds: reject without note -> 400', r.status === 400, r);
  r = await refundDo(refund2 ?? crypto.randomUUID(), 'reject', f, { note: 'withdrawn' });
  check('refunds: reject -> 200 rejected', r.status === 200 && r.body?.refund?.status === 'rejected', r);
  r = await call(`${REFUNDS}/queue`, { headers: bearer(f.token) });
  check('refunds: queue empty once finished', r.status === 200 && r.body?.refunds?.length === 0, r.body);

  // ---- knowledge moderation (16c) -------------------------------------------------------
  // Fail-before: without 16c these routes 404.
  await admin.from('users').update({ role: 'jyotish' }).eq('id', a.id);
  const draft = await a.db.from('knowledge_items')
    .insert({ content_type: 'article', title: 'Shani Sade Sati', body: 'Saturn...', language: 'en' }).select('id, author_id, status').single();
  check('knowledge: practitioner drafts (author forced, draft forced)',
    !draft.error && draft.data?.author_id === a.id && draft.data?.status === 'draft', draft);
  const custDraft = await c.db.from('knowledge_items')
    .insert({ content_type: 'article', title: 'Mine', body: 'x' });
  check('knowledge: customer cannot author', !!custDraft.error, custDraft.error?.message);
  const KNOW = (id) => `/api/knowledge/${id}`;
  r = await postJson(`${KNOW(draft.data?.id ?? crypto.randomUUID())}/submit`, a, {});
  check('knowledge: submit -> 200 pending_review', r.status === 200 && r.body?.item?.status === 'pending_review', r);
  r = await postJson(`${KNOW(draft.data?.id ?? crypto.randomUUID())}/submit`, a, {});
  check('knowledge: double submit -> 409', r.status === 409, r);
  r = await call('/api/knowledge/queue', { headers: bearer(f.token) });
  check('knowledge: finance cannot moderate -> 403', r.status === 403, r);
  r = await call('/api/knowledge/queue', { headers: bearer(s.token) });
  check('knowledge: moderator queue lists it with author',
    r.status === 200 && r.body?.items?.length === 1 && r.body.items[0]?.author?.email === a.email, r.body);
  r = await postJson(`${KNOW(draft.data?.id ?? crypto.randomUUID())}/moderate`, a, { decision: 'published' });
  check('knowledge: author cannot moderate -> 403', r.status === 403, r);
  r = await postJson(`${KNOW(draft.data?.id ?? crypto.randomUUID())}/moderate`, s, { decision: 'published' });
  check('knowledge: moderator publishes -> 200', r.status === 200 && r.body?.item?.status === 'published', r);
  const { data: modAudit } = await admin.from('audit_log').select('actor_user_id')
    .eq('entity_id', draft.data?.id ?? crypto.randomUUID()).eq('action', 'knowledge.published');
  check('knowledge: moderation audited', modAudit?.length === 1 && modAudit[0]?.actor_user_id === s.id, modAudit);
  const seenKnowledge = await browser().from('knowledge_items').select('id, title').eq('id', draft.data?.id ?? crypto.randomUUID());
  check('knowledge: visitors read the published piece', seenKnowledge.data?.length === 1, seenKnowledge);
  r = await postJson(`${KNOW(draft.data?.id ?? crypto.randomUUID())}/moderate`, s, { decision: 'archived' });
  check('knowledge: moderator archives -> 200', r.status === 200 && r.body?.item?.status === 'archived', r);
  const goneKnowledge = await browser().from('knowledge_items').select('id').eq('id', draft.data?.id ?? crypto.randomUUID());
  check('knowledge: archived pieces leave the public eye', goneKnowledge.data?.length === 0, goneKnowledge);
  const auditSelf = await c.db.from('audit_log').select('id');
  check('audit: customer reads none', auditSelf.data?.length === 0, auditSelf);
  const auditStaff = await f.db.from('audit_log').select('id', { count: 'exact', head: true });
  check('audit: finance reads the trail', (auditStaff.count ?? 0) > 0, auditStaff);

  // ---- consultations join (17b) ---------------------------------------------------------
  // Fail-before: without 17b this route 404s.
  const JOIN = '/api/consultations/join';
  const joinAs = (user, bookingId) => postJson(JOIN, user, { bookingId });
  const decode = (token) => JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url'));
  r = await call(JOIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('join: no token -> 401', r.status === 401, r);
  r = await joinAs(c, 'not-a-uuid');
  check('join: bad id -> 400', r.status === 400, r);
  r = await joinAs(c, booked?.id ?? crypto.randomUUID());
  check('join: outside the window -> 409', r.status === 409 && r.body?.error?.code === 'not_joinable', r);
  r = await joinAs(s, booked?.id ?? crypto.randomUUID());
  check('join: stranger -> 404', r.status === 404, r);
  const joinSlot = (await freeSlots())[0]?.starts_at;
  r = await book(s, { astrologerId: astro.id, serviceId: callService, startsAt: joinSlot });
  const unpaidBooking = r.body?.booking;
  r = await joinAs(s, unpaidBooking?.id ?? crypto.randomUUID());
  check('join: unpaid booking -> 409', r.status === 409 && r.body?.error?.code === 'not_joinable', r);
  await admin.from('bookings').update({
    scheduled_at: new Date(Date.now() - 10 * 60e3).toISOString(),
    ends_at: new Date(Date.now() + 20 * 60e3).toISOString(),
  }).eq('id', booked?.id ?? crypto.randomUUID());
  r = await joinAs(c, booked?.id ?? crypto.randomUUID());
  const grant = r.body?.token ? decode(r.body.token).video : null;
  check('join: customer in window -> 200 with audio+video grants',
    r.status === 200 && r.body?.room === `consultation_${booked?.id}` && r.body?.mode === 'audio_video'
    && grant?.roomJoin && grant?.canSubscribe && grant?.canPublish
    && [...(grant?.canPublishSources ?? [])].sort().join() === 'camera,microphone'
    && decode(r.body.token).sub === c.id && decode(r.body.token).exp - decode(r.body.token).nbf === 7200, { room: r.body?.room, grant });
  r = await joinAs(a, booked?.id ?? crypto.randomUUID());
  check('join: practitioner in window -> 200 for themselves',
    r.status === 200 && decode(r.body?.token ?? '').sub === a.id, r.status);
  await admin.from('bookings').update({ consultation_mode: 'audio' }).eq('id', booked?.id ?? crypto.randomUUID());
  r = await joinAs(c, booked?.id ?? crypto.randomUUID());
  check('join: audio mode mints microphone-only grants',
    r.status === 200 && (decode(r.body?.token ?? '').video?.canPublishSources ?? []).join() === 'microphone', r.status);
  await admin.from('bookings').update({ consultation_mode: 'audio_video' }).eq('id', booked?.id ?? crypto.randomUUID());
  await admin.from('bookings').update({
    scheduled_at: new Date(Date.now() - 2 * 3600e3).toISOString(),
    ends_at: new Date(Date.now() - 90 * 60e3).toISOString(),
  }).eq('id', booked?.id ?? crypto.randomUUID());
  r = await joinAs(c, booked?.id ?? crypto.randomUUID());
  check('join: after it ended -> 409', r.status === 409, r);

  // ---- consultation room page (17c) -------------------------------------------------------
  // Fail-before: without 17c the page 404s. The room itself is exercised by hand
  // (camera and microphone need a real browser); here the page, its script, and
  // the join-button contract it relies on.
  r = await call('/site-assets/consult.html');
  check('room: page served', r.status === 200, r.status);
  const roomJs = await (await fetch(`${base}/site-assets/js/consult-room.js`)).text();
  check('room: script joins through the endpoint, never mints',
    roomJs.includes('/api/consultations/join') && roomJs.includes('LivekitClient.Room') && !roomJs.includes('AccessToken'), roomJs.length);

  // ---- questions (Q2) ------------------------------------------------------------------
  // Fail-before: without Q2 these routes 404.
  const QUESTIONS = '/api/questions';
  const answerQ = (id, user, value) => postJson(`${QUESTIONS}/${id}/answer`, user, value);
  const rv = await newUser('rival');
  const { data: rivalAstro, error: rivalError } = await admin.from('astrologers')
    .insert({ user_id: rv.id, name: 'Server Test Rival', status: 'active' }).select('id').single();
  if (rivalError) throw rivalError;

  r = await call(QUESTIONS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('questions: no token -> 401', r.status === 401, r);
  const ask = { astrologerId: astro.id, question: '  Will Saturn affect my career?  ', subject: person };
  for (const [what, value] of [['a bad practitioner id', { ...ask, astrologerId: 'x' }], ['a blank question', { ...ask, question: '   ' }],
    ['a 2001-character question', { ...ask, question: 'x'.repeat(2001) }], ['no birth details', { ...ask, subject: undefined }],
    ['an impossible birth date', { ...ask, subject: { ...person, dobAd: '1990-02-30' } }]]) {
    r = await postJson(QUESTIONS, c, value);
    check(`questions: ${what} -> 400`, r.status === 400 && r.body?.error?.code === 'invalid_body', r);
  }
  r = await postJson(QUESTIONS, b, ask);
  check('questions: blocked customer -> 403', r.status === 403, r);
  r = await postJson(QUESTIONS, a, { ...ask });
  check('questions: a practitioner cannot ask themselves -> 400', r.status === 400 && r.body?.error?.code === 'self', r);
  r = await postJson(QUESTIONS, c, { ...ask, astrologerId: crypto.randomUUID() });
  check('questions: unknown practitioner -> 404', r.status === 404, r);

  // The browser's claims about price, status and owner are ignored.
  r = await postJson(QUESTIONS, c, { ...ask, price: 1, status: 'PAID', paymentStatus: 'PAID', customerId: s.customerId, answer: 'forged' });
  const asked = r.body?.question;
  check('questions: ask -> 200, price and status from the database',
    r.status === 200 && asked?.price === 100 && asked?.currency === 'NPR' && asked?.status === 'UNPAID'
    && asked?.question === 'Will Saturn affect my career?' && asked?.astrologerId === astro.id && asked?.paymentId
    && asked?.subject?.name === 'Ram' && !('commission' in asked), r);
  const { data: askedRow } = await admin.from('question_consultations').select('customer_id, answer').eq('id', asked?.id ?? crypto.randomUUID()).single();
  check('questions: owned by the caller, no forged answer', askedRow?.customer_id === c.customerId && askedRow?.answer === null, askedRow);
  const unpaidPeek = await a.db.from('question_consultations').select('id').eq('id', asked?.id ?? crypto.randomUUID());
  check('questions: the practitioner cannot see it before payment', unpaidPeek.data?.length === 0, unpaidPeek);
  const directAsk = await c.db.from('question_consultations')
    .insert({ customer_id: c.customerId, customer_name: 'Direct', question_text: 'Straight from the browser' }).select('id');
  check('questions: the browser cannot insert directly', !!directAsk.error, directAsk);

  r = await postJson(QUESTIONS, c, ask);
  const asked2 = r.body?.question;
  r = await postJson(QUESTIONS, c, ask);
  check('questions: a third unpaid question -> 409', r.status === 409 && r.body?.error?.code === 'too_many_unpaid', r);

  r = await uploadProof(asked?.paymentId ?? crypto.randomUUID(), s, [PNG, 'q.png', 'image/png']);
  check('questions: another customer cannot upload the proof -> 404', r.status === 404, r);
  r = await uploadProof(asked?.paymentId ?? crypto.randomUUID(), c, [PNG, 'q.png', 'image/png']);
  check('questions: proof -> 200 proof_submitted', r.status === 200 && r.body?.payment?.status === 'proof_submitted', r);
  proofPrefixes.add(`${c.id}/${asked?.paymentId}`);
  r = await uploadProof(asked2?.paymentId ?? crypto.randomUUID(), c, [PDF, 'q2.pdf', 'application/pdf']);
  check('questions: second proof -> 200', r.status === 200, r);
  proofPrefixes.add(`${c.id}/${asked2?.paymentId}`);

  r = await call(QUEUE, { headers: bearer(f.token) });
  const qItem = r.body?.payments?.find((p) => p.id === asked?.paymentId);
  check('questions: the review queue shows it as a question',
    r.status === 200 && qItem?.kind === 'question' && qItem?.question?.text === 'Will Saturn affect my career?'
    && qItem?.booking === null && qItem?.customer?.name && qItem?.astrologer?.name === 'Server Test Jyotish' && qItem?.proofUrl, r.body);
  r = await decide(asked?.paymentId ?? crypto.randomUUID(), 'approve', s, {});
  check('questions: moderator cannot approve -> 403', r.status === 403, r);
  r = await decide(asked?.paymentId ?? crypto.randomUUID(), 'approve', f, {});
  check('questions: finance approves -> 200 paid', r.status === 200 && r.body?.payment?.status === 'paid', r);
  r = await decide(asked2?.paymentId ?? crypto.randomUUID(), 'reject', f, { reason: 'No money arrived' });
  check('questions: finance rejects the second -> 200', r.status === 200 && r.body?.payment?.status === 'rejected', r);
  const { data: qState } = await admin.from('question_consultations').select('id, status, payment_status').in('id', [asked?.id, asked2?.id].filter(Boolean));
  const stateOf = (id) => qState?.find((q) => q.id === id);
  check('questions: approved is PAID, rejected is CLOSED',
    stateOf(asked?.id)?.status === 'PAID' && stateOf(asked?.id)?.payment_status === 'PAID'
    && stateOf(asked2?.id)?.status === 'CLOSED' && stateOf(asked2?.id)?.payment_status === 'FAILED', qState);

  const paidPeek = await a.db.from('question_consultations').select('id, question_text').eq('id', asked?.id ?? crypto.randomUUID());
  check('questions: the practitioner sees it once paid', paidPeek.data?.length === 1, paidPeek);
  const rivalPeek = await rv.db.from('question_consultations').select('id').eq('id', asked?.id ?? crypto.randomUUID());
  check('questions: a rival practitioner never sees it', rivalPeek.data?.length === 0, rivalPeek);
  const directAnswer = await a.db.from('question_consultations').update({ answer: 'direct' }).eq('id', asked?.id ?? crypto.randomUUID()).select('id');
  check('questions: the browser cannot write the answer', !!directAnswer.error || directAnswer.data?.length === 0, directAnswer);

  r = await call(`${QUESTIONS}/${asked?.id}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('answer: no token -> 401', r.status === 401, r);
  r = await answerQ(asked?.id, rv, { answer: 'Rival says', final: true });
  check('answer: a rival practitioner -> 404', r.status === 404, r);
  r = await answerQ(asked?.id, c, { answer: 'I answer myself', final: true });
  check('answer: the customer -> 404', r.status === 404, r);
  r = await answerQ(asked?.id, a, { answer: '   ', final: false });
  check('answer: blank -> 400', r.status === 400, r);
  r = await answerQ(asked?.id, a, { answer: 'Draft', final: 'yes' });
  check('answer: final not a boolean -> 400', r.status === 400, r);
  r = await answerQ(asked2?.id, a, { answer: 'Closed one', final: true });
  check('answer: a rejected question -> 409', r.status === 409 && r.body?.error?.code === 'closed', r);
  r = await answerQ(asked?.id, a, { answer: 'Draft answer', final: false });
  check('answer: draft -> 200 IN REVIEW', r.status === 200 && r.body?.question?.status === 'IN REVIEW' && !r.body?.question?.answeredAt, r);
  r = await answerQ(asked?.id, a, { answer: 'Saturn favours patience in your work.', final: true });
  check('answer: final -> 200 ANSWERED', r.status === 200 && r.body?.question?.status === 'ANSWERED' && r.body?.question?.answeredAt, r);
  r = await answerQ(asked?.id, a, { answer: 'Changed my mind', final: true });
  check('answer: locked once final -> 409', r.status === 409, r);
  const custRead = await c.db.from('question_consultations').select('status, answer').eq('id', asked?.id ?? crypto.randomUUID()).single();
  check('answer: the customer reads it', custRead.data?.status === 'ANSWERED' && custRead.data?.answer === 'Saturn favours patience in your work.', custRead);
  const { data: qNotes } = await admin.from('notifications').select('type').eq('user_id', c.id).in('type', ['question_payment_verified', 'question_answered']);
  check('answer: the customer was notified of payment and answer', qNotes?.length === 2, qNotes);

  r = await postJson(REFUNDS, f, { paymentId: asked?.paymentId, amount: 100, reason: 'Question refund' });
  const qRefund = r.body?.refund?.id;
  check('questions: finance records a refund -> 200', r.status === 200, r);
  r = await call(`${REFUNDS}/queue`, { headers: bearer(f.token) });
  const qRefundItem = r.body?.refunds?.find((x) => x.id === qRefund);
  check('questions: the refund queue shows it as a question',
    r.status === 200 && qRefundItem?.kind === 'question' && qRefundItem?.booking === null && qRefundItem?.question?.id === asked?.id && qRefundItem?.customer?.name, r.body);
  await refundDo(qRefund ?? crypto.randomUUID(), 'approve', f, {});
  r = await refundDo(qRefund ?? crypto.randomUUID(), 'complete', f, { externalReference: 'ESEWA-Q1' });
  check('questions: refund completes -> 200', r.status === 200 && r.body?.refund?.status === 'completed', r);
  const { data: qRefunded } = await admin.from('question_consultations').select('payment_status').eq('id', asked?.id ?? crypto.randomUUID()).single();
  check('questions: fully refunded question is REFUNDED', qRefunded?.payment_status === 'REFUNDED', qRefunded);

  // The approval email renders for a question (no consultation time to show).
  let qJob = await jobForEntity(asked?.paymentId);
  for (let round = 0; qJob?.status === 'pending' && round < 4; round++) {
    r = await drain(env.CRON_SECRET);
    if (r.status !== 200) break;
    qJob = await jobForEntity(asked?.paymentId);
  }
  check('questions: approval email attempted', r.status === 200 && (qJob?.status === 'sent' || qJob?.status === 'failed'), { r: r.body, qJob });

  // ---- /api/me, account changes (destructive for C, so last) -------------------------
  // A role change is seen on the next request (read from the db, not the token).
  await admin.from('users').update({ role: 'support' }).eq('id', c.id);
  r = await me(bearer(c.token));
  check('role change applies immediately', r.status === 200 && r.body?.role === 'support', r);

  await admin.auth.admin.signOut(x.token, 'global');
  r = await me(bearer(x.token));
  check('token of a signed-out session -> 401', r.status === 401, r);

  await admin.auth.admin.deleteUser(c.id);
  created.splice(created.indexOf(c.id), 1);
  r = await me(bearer(c.token));
  check('token of a deleted user -> 401', r.status === 401, r);

  r = await me(bearer(b.token), 'POST');
  check('wrong method -> 405', r.status === 405, r.status);
  r = await call(OPEN, { headers: bearer(s.token) });
  check('open: GET -> 405', r.status === 405, r.status);
} catch (error) {
  failures++;
  console.error('ERROR ', error.message ?? error);
} finally {
  for (const client of [admin, ...clients]) await client.removeAllChannels();
  const bucket = admin.storage.from('chat-attachments');
  for (const id of conversationIds) {
    const { data } = await bucket.list(id);
    if (data?.length) await bucket.remove(data.map((o) => `${id}/${o.name}`));
  }
  for (const id of created) await admin.auth.admin.deleteUser(id);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const left = data.users.filter((u) => u.email?.startsWith('servertest-')).length;
  check('throwaway users removed', left === 0, left);
  let files = 0;
  for (const id of conversationIds) files += (await bucket.list(id)).data?.length ?? 0;
  check('throwaway chat files removed', files === 0, files);
  const proofs = admin.storage.from('payment-proofs');
  for (const prefix of proofPrefixes) {
    const { data } = await proofs.list(prefix);
    if (data?.length) await proofs.remove(data.map((o) => `${prefix}/${o.name}`));
  }
  let stray = 0;
  for (const prefix of proofPrefixes) stray += (await proofs.list(prefix)).data?.length ?? 0;
  check('throwaway proof files removed', stray === 0, stray);
}

console.log(failures ? `\n${failures} failure(s)` : '\ntest-server: all checks passed');
process.exit(failures ? 1 : 0);
