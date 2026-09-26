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
    price: 1, status: 'confirmed', customerId: s.customerId, endsAt: at(5), currency: 'USD' });
  const booked = r.body?.booking;
  check('book: customer -> 200, payment_pending, price and length from the database',
    r.status === 200 && booked?.status === 'payment_pending' && booked.price === 1000 && booked.currency === 'NPR'
    && Date.parse(booked.endsAt) - Date.parse(booked.startsAt) === 30 * 60e3 && Date.parse(booked.startsAt) === Date.parse(at(0))
    && booked.notes === 'Career question', r);
  const holdMinutes = (Date.parse(booked?.holdExpiresAt) - sentAt) / 60e3;
  check('book: slot held for about 10 minutes', holdMinutes > 9 && holdMinutes < 11, booked?.holdExpiresAt);
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
  const practitionerView = await a.db.from('bookings').select('id').eq('id', booked?.id ?? crypto.randomUUID());
  check('bookings: the practitioner sees it', practitionerView.data?.length === 1, practitionerView);
  const selfConfirm = await c.db.from('bookings').update({ status: 'confirmed' }).eq('id', booked?.id ?? crypto.randomUUID()).select();
  const { data: still } = await admin.from('bookings').select('status').eq('id', booked?.id ?? crypto.randomUUID()).single();
  check('bookings: customer cannot confirm their own booking', (selfConfirm.error || selfConfirm.data?.length === 0) && still?.status === 'payment_pending', { selfConfirm, still });
  r = await call(BOOK, { headers: bearer(c.token) });
  check('book: GET -> 405', r.status === 405, r.status);

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
}

console.log(failures ? `\n${failures} failure(s)` : '\ntest-server: all checks passed');
process.exit(failures ? 1 : 0);
