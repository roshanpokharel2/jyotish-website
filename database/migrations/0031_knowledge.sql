-- 0031_knowledge.sql
-- Step 15 of docs/IMPLEMENTATION-PLAN.md (plan Step 21) -- the knowledge
-- foundation, no AI.
--
-- knowledge_items holds site knowledge (articles, FAQs) through an authoring
-- flow: practitioners and staff write drafts, moderators publish. No
-- embeddings, no search, no LLM calls, no billing -- those are explicitly out
-- of scope; this is the content and its moderation only. Reading surfaces
-- (public pages, admin lists) come with Steps 20+; the table is readable where
-- it needs to be.
--
--   * Authorship comes from the caller, never the request (trigger-filled).
--   * Authors write drafts directly (the jyotish-application precedent); every
--     status step goes through a server-only function with role checks, each
--     moderation writing its audit row.
--   * Published rows are readable by everyone including visitors; anything else
--     is author-or-staff only.
--
-- Run after 0030_reviews.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_items (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.users(id) on delete set null,
  content_type text not null check (content_type in ('article', 'faq')),
  title        text not null check (char_length(title) between 1 and 200),
  body         text not null check (char_length(body) between 1 and 20000),
  status       text not null default 'draft' check (status in (
    'draft','pending_review','published','rejected','archived')),
  visibility   text not null default 'public' check (visibility in ('public', 'staff', 'private')),
  language     text not null default 'ne' check (language in ('ne', 'en', 'hi', 'sa')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.knowledge_items is
  'Authored site knowledge. Drafts are written directly; status moves only through server functions. No embeddings or AI here.';

alter table public.knowledge_items enable row level security;

create index if not exists idx_knowledge_public on public.knowledge_items (status, visibility, language, created_at desc);
create index if not exists idx_knowledge_author on public.knowledge_items (author_id, created_at desc);

drop trigger if exists trg_knowledge_items_updated_at on public.knowledge_items;
create trigger trg_knowledge_items_updated_at
before update on public.knowledge_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Authorship + legal steps, for every writer
-- ---------------------------------------------------------------------------
create or replace function public.guard_knowledge_write()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if tg_op = 'INSERT' then
    -- The author is the caller, never a request field.
    new.author_id := auth.uid();
    if new.status <> 'draft' then raise exception 'INVALID_KNOWLEDGE_STATUS'; end if;
    return new;
  end if;

  if old.status = new.status then return new; end if;

  ok := (old.status = 'draft'          and new.status = 'pending_review')
     or (old.status = 'pending_review' and new.status in ('published', 'rejected'))
     or (old.status = 'rejected'       and new.status = 'pending_review')
     or (old.status = 'published'      and new.status = 'archived');
  if not ok then raise exception 'INVALID_KNOWLEDGE_STATUS'; end if;

  -- A status step never rewrites the content alongside it: review the words
  -- that were submitted, publish exactly them.
  if new.title is distinct from old.title or new.body is distinct from old.body
     or new.content_type is distinct from old.content_type then
    raise exception 'INVALID_KNOWLEDGE_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_knowledge_write on public.knowledge_items;
create trigger trg_knowledge_write
before insert or update of status on public.knowledge_items
for each row execute function public.guard_knowledge_write();

-- ---------------------------------------------------------------------------
-- 3. Policies: authors draft, staff read, visitors read published
-- ---------------------------------------------------------------------------
-- Practitioners and staff write drafts; customers never do.
drop policy if exists "authors can create drafts" on public.knowledge_items;
create policy "authors can create drafts"
on public.knowledge_items
for insert with check (
  public.has_role('jyotish','moderator','finance','admin','super_admin'));

-- Authors edit the words of their own drafts and rework. Under review the words
-- are frozen -- moderators decide on what was submitted, and send it back with
-- rejected for another pass. The WITH CHECK keeps the status where it is, so
-- writers cannot promote their own work: only the functions below move status.
drop policy if exists "authors can edit own unpublished work" on public.knowledge_items;
create policy "authors can edit own unpublished work"
on public.knowledge_items
for update using (author_id = auth.uid() and status in ('draft', 'rejected'))
with check (author_id = auth.uid() and status in ('draft', 'rejected'));

-- Everyone reads published public items, visitors included.
drop policy if exists "published knowledge is public" on public.knowledge_items;
create policy "published knowledge is public"
on public.knowledge_items
for select using (status = 'published' and visibility = 'public');

-- Authors read their own rows; staff read everything.
drop policy if exists "authors read own knowledge" on public.knowledge_items;
create policy "authors read own knowledge"
on public.knowledge_items
for select using (author_id = auth.uid());

drop policy if exists "staff read all knowledge" on public.knowledge_items;
create policy "staff read all knowledge"
on public.knowledge_items
for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 4. Status steps (server only, audited where someone decides)
-- ---------------------------------------------------------------------------
-- Submission is the author's own act; moderation decides for the platform.
create or replace function public.submit_knowledge(p_item uuid, p_actor uuid)
returns public.knowledge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.knowledge_items;
begin
  select * into item from public.knowledge_items where id = p_item for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if item.status not in ('draft', 'rejected') then raise exception 'KNOWLEDGE_ALREADY_PROCESSED'; end if;
  if item.author_id is distinct from p_actor
     and not public.staff_of(p_actor) then
    raise exception 'FORBIDDEN';
  end if;

  update public.knowledge_items set status = 'pending_review'
   where id = p_item returning * into item;
  return item;
end;
$$;

revoke all on function public.submit_knowledge(uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_knowledge(uuid, uuid) to service_role;

create or replace function public.staff_of(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = p_user
      and role in ('moderator','finance','admin','super_admin')
  );
$$;

revoke all on function public.staff_of(uuid) from public, anon, authenticated;
grant execute on function public.staff_of(uuid) to service_role;

create or replace function public.moderate_knowledge(p_item uuid, p_actor uuid, p_decision text)
returns public.knowledge_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.knowledge_items;
  prev text;
begin
  if p_decision not in ('published', 'rejected', 'archived') then
    raise exception 'INVALID_INPUT';
  end if;

  select * into item from public.knowledge_items where id = p_item for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if (select role from public.users where id = p_actor) not in ('moderator', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  if (item.status = 'pending_review' and p_decision not in ('published', 'rejected'))
     or (item.status = 'published' and p_decision <> 'archived')
     or (item.status not in ('pending_review', 'published')) then
    raise exception 'KNOWLEDGE_ALREADY_PROCESSED';
  end if;
  prev := item.status;

  update public.knowledge_items set status = p_decision
   where id = p_item returning * into item;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'knowledge.' || p_decision, 'knowledge_item', p_item,
          jsonb_build_object('status', prev),
          jsonb_build_object('status', p_decision));

  return item;
end;
$$;

revoke all on function public.moderate_knowledge(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_knowledge(uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0031', 'knowledge');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0031_knowledge_test.sql -- it asserts and rolls back.
