-- 0010_chat_rls.sql
-- Phase 1, Checkpoint E of docs/IMPLEMENTATION-PLAN.md
--
-- The chat_messages policies in schema.sql compared `cp.conversation_id =
-- conversation_id`; inside the subquery the unqualified name resolves to cp's own
-- column, so Postgres stored `cp.conversation_id = cp.conversation_id` (always true).
-- A participant in ANY conversation could read, post into, and edit EVERY conversation.
-- Reproduced in dev before this migration, as a customer in one conversation:
--   * read another customer's private messages
--   * posted into their conversation
--   * edited the practitioner's message in their own conversation, and the other
--     customer's message in theirs
--   * moved a message from one conversation into another
-- (Impersonation was already refused: `auth.uid() = sender_id` was written correctly.)
--
-- After this migration, for a browser (JWT) caller:
--   chat_messages       read: active participant of THAT conversation
--                       post: as yourself, active participant, conversation active,
--                             message_type 'text', body 1-4000 characters
--                       edit / delete: nobody
--                       created_at / status / delivered_at / read_at: set by the database
--   chat_participants   read: your own rows, plus co-participants of your conversations
--   message_attachments read: participants of the message's conversation
--                       write: nobody -- the server layer creates them (Checkpoint I)
--   chat_conversations  unchanged (read: participants); create/update via the server layer
--   message_reads       unchanged (no policies); read state is chat_participants.last_read_at
--
-- Additive and re-runnable. Run after 0009_audit_log_actor_delete.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. One membership check, used by every chat policy
-- ---------------------------------------------------------------------------
-- security definer so a policy on chat_participants can use it without recursing.
-- It only answers "am I an active participant of this conversation?", so it is safe
-- to expose to signed-in users.

create or replace function public.is_chat_participant(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_participants
     where conversation_id = conversation
       and user_id = auth.uid()
       and is_active
  );
$$;

revoke all on function public.is_chat_participant(uuid) from public, anon;
grant execute on function public.is_chat_participant(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. chat_messages
-- ---------------------------------------------------------------------------

drop policy if exists "participants can read own conversation messages" on public.chat_messages;
drop policy if exists "participants can insert chat messages" on public.chat_messages;
drop policy if exists "participants can update own chat message status" on public.chat_messages;

drop policy if exists "participants can read messages in their conversation" on public.chat_messages;
create policy "participants can read messages in their conversation"
on public.chat_messages
for select using (public.is_chat_participant(chat_messages.conversation_id));

drop policy if exists "participants can post text in their active conversation" on public.chat_messages;
create policy "participants can post text in their active conversation"
on public.chat_messages
for insert with check (
  sender_id = auth.uid()
  and public.is_chat_participant(chat_messages.conversation_id)
  and exists (
    select 1 from public.chat_conversations c
     where c.id = chat_messages.conversation_id
       and c.status = 'active' and c.is_active
  )
  and message_type = 'text'
  and char_length(btrim(coalesce(body, ''))) between 1 and 4000
);

-- The client does not get to pick timestamps or delivery state (a back-dated
-- created_at would slot a message into history). Also bumps the conversation, which
-- has no browser UPDATE policy.
create or replace function public.chat_message_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.created_at   := now();
    new.updated_at   := now();
    new.status       := 'sent';
    new.delivered_at := null;
    new.read_at      := null;
  end if;

  update public.chat_conversations
     set last_message_at = new.created_at, updated_at = now()
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_before_insert on public.chat_messages;
create trigger trg_chat_messages_before_insert
before insert on public.chat_messages
for each row execute function public.chat_message_before_insert();

-- ---------------------------------------------------------------------------
-- 3. chat_participants: see who else is in your conversation
-- ---------------------------------------------------------------------------

drop policy if exists "participants can see co-participants" on public.chat_participants;
create policy "participants can see co-participants"
on public.chat_participants
for select using (public.is_chat_participant(chat_participants.conversation_id));

-- ---------------------------------------------------------------------------
-- 4. message_attachments: read-only from the browser
-- ---------------------------------------------------------------------------
-- The old insert policy let any participant attach a row to ANY message in the
-- conversation, including the other party's. Attachment rows are written by the
-- server after it has validated the upload (Checkpoint I).

drop policy if exists "participants can attach files" on public.message_attachments;

drop policy if exists "participants can view attachments" on public.message_attachments;
create policy "participants can view attachments"
on public.message_attachments
for select using (
  exists (
    select 1 from public.chat_messages cm
     where cm.id = message_attachments.message_id
       and public.is_chat_participant(cm.conversation_id)
  )
);

-- ---------------------------------------------------------------------------
-- 5. One open general conversation per customer / practitioner pair
-- ---------------------------------------------------------------------------
-- Stops the create-or-find path from racing into duplicates. Booking-linked
-- conversations (consultation_id / booking_id set) are not limited.

create unique index if not exists uq_chat_conversations_open_pair
  on public.chat_conversations (customer_id, astrologer_id)
  where status = 'active' and consultation_id is null and booking_id is null;

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0010_chat_rls_test.sql
--
-- Expect no self-referencing comparison in any chat policy:
--   select tablename, policyname, qual, with_check from pg_policies
--    where tablename like 'chat_%' or tablename like 'message_%';
