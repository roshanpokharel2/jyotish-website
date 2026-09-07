create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'customer' check (role in ('customer','astrologer','admin','consultant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  dob_ad date,
  dob_bs_year integer,
  dob_bs_month integer,
  dob_bs_day integer,
  birth_time time,
  birth_place text,
  birth_country text,
  photo_url text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists dob_ad date;
alter table public.customers add column if not exists dob_bs_year integer;
alter table public.customers add column if not exists dob_bs_month integer;
alter table public.customers add column if not exists dob_bs_day integer;
alter table public.customers add column if not exists birth_time time;
alter table public.customers add column if not exists birth_place text;
alter table public.customers add column if not exists birth_country text;

create table if not exists public.consultants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  photo_url text,
  biography text,
  qualification text,
  experience_years integer default 0,
  specialization text,
  languages text[] default array['Nepali'],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.astrologers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  consultant_id uuid references public.consultants(id) on delete set null,
  name text not null,
  photo_url text,
  biography text,
  qualification text,
  experience_years integer default 0,
  specialization text,
  languages text[] default array['Nepali'],
  consultation_fee numeric(12,2) not null default 600,
  status text not null default 'active' check (status in ('active','inactive','paused','blocked')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('ONLINE','DIRECT','QUESTION')),
  mode text not null check (mode in ('live_call','live_online_chart','live_qa','chat','direct_in_person','question')),
  default_fee numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  price numeric(12,2) default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  consultation_type_id uuid not null references public.consultation_types(id),
  scheduled_at timestamptz,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','rescheduled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  consultation_type_id uuid not null references public.consultation_types(id),
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','scheduled','active','completed','closed','cancelled')),
  is_closed boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid references public.astrologers(id) on delete set null,
  total_tokens integer not null default 0,
  consumed_tokens integer not null default 0,
  balance integer not null default 0,
  source text not null default 'purchase' check (source in ('purchase','bonus','reward','adjustment')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'NPR',
  payment_method text not null check (payment_method in ('esewa','khalti','cash','wallet')),
  payment_destination text not null default '9851001890',
  status text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  external_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active','closed','archived')),
  is_active boolean not null default true,
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('customer','astrologer','admin')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text,
  message_type text not null default 'text' check (message_type in ('text','file','image','system')),
  status text not null default 'sent' check (status in ('sent','delivered','read','failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Kathmandu',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  source_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'generated' check (status in ('generated','review','resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  request_type text not null check (request_type in ('booking','kundali','chat','question','order','enrollment','contact')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_requests add column if not exists calculation_parameters jsonb not null default '{}'::jsonb;

create table if not exists public.vastu_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  amount numeric(12,2) not null default 0,
  currency text not null default 'NPR',
  billing_model text not null default 'one_time' check (billing_model in ('one_time','subscription')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vastu_projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  property_name text,
  property_type text not null,
  service_type text not null,
  topic text,
  property_details jsonb not null default '{}'::jsonb,
  status text not null default 'free_hint' check (status in ('draft','free_hint','payment_pending','paid','analysis_ready','consultation_requested','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vastu_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.vastu_projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.vastu_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  category text not null,
  direction text,
  condition jsonb not null default '{}'::jsonb,
  severity text check (severity in ('low','medium','high')),
  explanation jsonb not null default '{}'::jsonb,
  free_hint jsonb not null default '{}'::jsonb,
  remedy jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  property_types text[] not null default '{}',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vastu_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.vastu_projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_id uuid references public.vastu_plans(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  score numeric(5,2),
  free_hint jsonb not null default '{}'::jsonb,
  findings jsonb not null default '{}'::jsonb,
  marked_map_path text,
  status text not null default 'locked' check (status in ('locked','processing','ready','reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vastu_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_id uuid not null references public.vastu_plans(id),
  payment_id uuid references public.payments(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_vastu_projects_customer on public.vastu_projects (customer_id, created_at desc);
create index if not exists idx_vastu_files_project on public.vastu_files (project_id);
create index if not exists idx_vastu_rules_active on public.vastu_rules (active, category, direction);
create index if not exists idx_vastu_analyses_customer on public.vastu_analyses (customer_id, created_at desc);

create table if not exists public.question_consultations (
  id uuid primary key default gen_random_uuid(),
  question_id bigint generated always as identity unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  astrologer_id uuid references public.astrologers(id) on delete set null,
  consultation_id uuid references public.consultations(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  token_id uuid references public.tokens(id) on delete set null,
  token text unique,
  customer_name text not null,
  birth_snapshot jsonb not null default '{}'::jsonb,
  question_text text not null,
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','FAILED','REFUNDED')),
  status text not null default 'UNPAID' check (status in ('UNPAID','PAID','PENDING','IN REVIEW','ANSWERED','CLOSED')),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_horoscopes (
  id uuid primary key default gen_random_uuid(),
  horoscope_date date not null unique,
  nepali_date text,
  ad_date text,
  title text not null default 'आजको दैनिक फलादेश',
  rashi text,
  prediction text not null,
  auspicious_time text,
  caution text,
  lucky_color text,
  lucky_number text,
  general_guidance text,
  other_content text,
  published boolean not null default false,
  published_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marriage_matching_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  groom_profile jsonb not null default '{}'::jsonb,
  bride_profile jsonb not null default '{}'::jsonb,
  engine_status text not null default 'pending' check (engine_status in ('pending','processing','ready','failed')),
  engine_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_consultations add column if not exists customer_name text;
alter table public.question_consultations add column if not exists birth_snapshot jsonb not null default '{}'::jsonb;

create index if not exists idx_question_consultations_customer on public.question_consultations (customer_id, created_at desc);
create index if not exists idx_question_consultations_astrologer on public.question_consultations (astrologer_id, status);

create index if not exists idx_customers_user_id on public.customers (user_id);
create index if not exists idx_astrologers_user_id on public.astrologers (user_id);
create index if not exists idx_consultations_customer on public.consultations (customer_id);
create index if not exists idx_consultations_astrologer on public.consultations (astrologer_id);
create index if not exists idx_bookings_customer on public.bookings (customer_id);
create index if not exists idx_chat_conversations_customer on public.chat_conversations (customer_id);
create index if not exists idx_chat_conversations_astrologer on public.chat_conversations (astrologer_id);
create index if not exists idx_chat_messages_conversation on public.chat_messages (conversation_id, created_at);
create index if not exists idx_chat_messages_sender on public.chat_messages (sender_id);
create index if not exists idx_notifications_user on public.notifications (user_id, is_read);
create index if not exists idx_service_requests_user on public.service_requests (user_id, created_at desc);
create index if not exists idx_service_requests_type on public.service_requests (request_type, created_at desc);
create index if not exists idx_availability_astrologer on public.availability (astrologer_id, day_of_week);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger trg_consultants_updated_at
before update on public.consultants
for each row execute function public.set_updated_at();

create trigger trg_astrologers_updated_at
before update on public.astrologers
for each row execute function public.set_updated_at();

create trigger trg_service_requests_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

create trigger trg_vastu_plans_updated_at
before update on public.vastu_plans
for each row execute function public.set_updated_at();

create trigger trg_vastu_projects_updated_at
before update on public.vastu_projects
for each row execute function public.set_updated_at();

create trigger trg_vastu_rules_updated_at
before update on public.vastu_rules
for each row execute function public.set_updated_at();

create trigger trg_vastu_analyses_updated_at
before update on public.vastu_analyses
for each row execute function public.set_updated_at();

create trigger trg_question_consultations_updated_at
before update on public.question_consultations
for each row execute function public.set_updated_at();

create trigger trg_daily_horoscopes_updated_at
before update on public.daily_horoscopes
for each row execute function public.set_updated_at();

create or replace function public.notify_question_answer()
returns trigger
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status or new.payment_status is distinct from old.payment_status then
    insert into public.notifications (user_id, type, title, body, reference_type, reference_id)
    select c.user_id,
      case when new.status = 'ANSWERED' then 'question_answered' when new.status = 'IN REVIEW' then 'question_in_review' when new.payment_status = 'PAID' then 'question_payment_verified' else 'question_status_changed' end,
      case when new.status = 'ANSWERED' then 'Question answer ready' when new.status = 'IN REVIEW' then 'Question is being reviewed' when new.payment_status = 'PAID' then 'Question payment verified' else 'Question status updated' end,
      case when new.status = 'ANSWERED' then 'Your astrology question has been answered.' when new.status = 'IN REVIEW' then 'Your astrology question is being reviewed.' when new.payment_status = 'PAID' then 'Your NPR 100 payment was verified.' else 'Your question consultation status was updated.' end,
      'question_consultation', new.id
    from public.customers c where c.id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_question_answer_notification
after update on public.question_consultations
for each row execute function public.notify_question_answer();

create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger trg_consultations_updated_at
before update on public.consultations
for each row execute function public.set_updated_at();

create trigger trg_chat_conversations_updated_at
before update on public.chat_conversations
for each row execute function public.set_updated_at();

create trigger trg_chat_messages_updated_at
before update on public.chat_messages
for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_participants;

create or replace function public.seed_initial_astrologer()
returns void as $$
begin
  if not exists (select 1 from public.astrologers where name = 'Krishna Prasad Pokharel') then
    insert into public.astrologers (
      user_id,
      name,
      biography,
      qualification,
      experience_years,
      specialization,
      languages,
      consultation_fee,
      status,
      is_active
    )
    values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'Krishna Prasad Pokharel',
      'Initial seeded astrologer record for the platform.',
      'Jyotisha and Vastu Specialist',
      12,
      'Vedic astrology, kundali analysis, vastu guidance',
      array['Nepali', 'Hindi', 'English'],
      600,
      'active',
      true
    );
  end if;
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.consultants enable row level security;
alter table public.astrologers enable row level security;
alter table public.consultation_types enable row level security;
alter table public.consultations enable row level security;
alter table public.bookings enable row level security;
alter table public.tokens enable row level security;
alter table public.payments enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.availability enable row level security;
alter table public.services enable row level security;
alter table public.reports enable row level security;
alter table public.service_requests enable row level security;
alter table public.vastu_plans enable row level security;
alter table public.vastu_projects enable row level security;
alter table public.vastu_files enable row level security;
alter table public.vastu_rules enable row level security;
alter table public.vastu_analyses enable row level security;
alter table public.vastu_subscriptions enable row level security;
alter table public.question_consultations enable row level security;
alter table public.daily_horoscopes enable row level security;
alter table public.marriage_matching_requests enable row level security;

create policy "users can view own profile"
on public.users
for select using (auth.uid() = id);

create policy "users can update own profile"
on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "customers can view own profile"
on public.customers
for select using (auth.uid() = user_id);

create policy "customers can create own profile"
on public.customers
for insert with check (auth.uid() = user_id);

create policy "customers can update own profile"
on public.customers
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can create own service requests"
on public.service_requests
for insert with check (auth.uid() = user_id);

create policy "users can view own service requests"
on public.service_requests
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

create policy "authenticated users can view active Vastu plans"
on public.vastu_plans for select using (active = true and auth.role() = 'authenticated');

create policy "customers can view own Vastu projects"
on public.vastu_projects for select using (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can create own Vastu projects"
on public.vastu_projects for insert with check (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can update own Vastu projects"
on public.vastu_projects for update using (auth.uid() = (select user_id from public.customers where id = customer_id))
with check (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "everyone can view published daily horoscopes"
on public.daily_horoscopes for select using (published = true);

create policy "admins can manage daily horoscopes"
on public.daily_horoscopes for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "customers can view own marriage matching requests"
on public.marriage_matching_requests for select using (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can create own marriage matching requests"
on public.marriage_matching_requests for insert with check (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can view own Vastu files"
on public.vastu_files for select using (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can create own Vastu files"
on public.vastu_files for insert with check (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "authenticated users can view active Vastu hints"
on public.vastu_rules for select using (active = true);

create policy "admins can manage Vastu plans"
on public.vastu_plans for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "admins can manage Vastu rules"
on public.vastu_rules for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "customers can view own unlocked Vastu analyses"
on public.vastu_analyses for select using (
  auth.uid() = (select user_id from public.customers where id = customer_id)
  and status in ('ready','reviewed')
);

create policy "customers can view own Vastu subscriptions"
on public.vastu_subscriptions for select using (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can upload Vastu files"
on storage.objects for insert with check (
  bucket_id = 'vastu-files'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "customers can view own Vastu files from storage"
on storage.objects for select using (
  bucket_id = 'vastu-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "customers can view own question consultations"
on public.question_consultations
for select using (auth.uid() = (select user_id from public.customers where id = customer_id));

create policy "customers can create own unpaid question consultations"
on public.question_consultations
for insert with check (
  auth.uid() = (select user_id from public.customers where id = customer_id)
  and status = 'UNPAID' and payment_status = 'UNPAID'
);

create policy "assigned astrologers can view question consultations"
on public.question_consultations
for select using (auth.uid() = (select user_id from public.astrologers where id = astrologer_id));

create policy "assigned astrologers can answer question consultations"
on public.question_consultations
for update using (auth.uid() = (select user_id from public.astrologers where id = astrologer_id))
with check (auth.uid() = (select user_id from public.astrologers where id = astrologer_id));

create policy "astrologers can view own profile"
on public.astrologers
for select using (auth.uid() = user_id or auth.uid() is not null);

create policy "astrologers can update own profile"
on public.astrologers
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "consultation types are readable by authenticated users"
on public.consultation_types
for select using (auth.role() = 'authenticated');

create policy "bookings accessible to owner and astrologer"
on public.bookings
for select using (
  auth.uid() = (select user_id from public.customers where id = customer_id)
  or auth.uid() = (select user_id from public.astrologers where id = astrologer_id)
);

create policy "customers can create own bookings"
on public.bookings
for insert with check (
  auth.uid() = (select user_id from public.customers where id = customer_id)
);

create policy "consultations accessible to owner and astrologer"
on public.consultations
for select using (
  auth.uid() = (select user_id from public.customers where id = customer_id)
  or auth.uid() = (select user_id from public.astrologers where id = astrologer_id)
);

create policy "chat conversations visible only to participants"
on public.chat_conversations
for select using (
  exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = public.chat_conversations.id
      and cp.user_id = auth.uid()
      and cp.is_active = true
  )
);

create policy "chat participants visible only to self"
on public.chat_participants
for select using (user_id = auth.uid());

create policy "participants can insert chat messages"
on public.chat_messages
for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
      and cp.is_active = true
  )
);

create policy "participants can read own conversation messages"
on public.chat_messages
for select using (
  exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
      and cp.is_active = true
  )
);

create policy "participants can update own chat message status"
on public.chat_messages
for update using (
  exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
      and cp.is_active = true
  )
) with check (
  exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
      and cp.is_active = true
  )
);

create policy "participants can attach files"
on public.message_attachments
for insert with check (
  exists (
    select 1 from public.chat_messages cm
    join public.chat_participants cp on cp.conversation_id = cm.conversation_id
    where cm.id = message_id and cp.user_id = auth.uid() and cp.is_active = true
  )
);

create policy "participants can view attachments"
on public.message_attachments
for select using (
  exists (
    select 1 from public.chat_messages cm
    join public.chat_participants cp on cp.conversation_id = cm.conversation_id
    where cm.id = message_id and cp.user_id = auth.uid() and cp.is_active = true
  )
);

create policy "notifications only for self"
on public.notifications
for select using (user_id = auth.uid());

create policy "users can manage own notifications"
on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "customers can view own tokens"
on public.tokens
for select using (
  auth.uid() = (select user_id from public.customers where id = customer_id)
);

create policy "payments visible to the paying customer and the astrologer"
on public.payments
for select using (
  auth.uid() = (select user_id from public.customers where id = customer_id)
  or auth.uid() = (select user_id from public.astrologers where id = astrologer_id)
);

create policy "authenticated users can read active astrologers"
on public.astrologers
for select using (status = 'active' and auth.role() = 'authenticated');

create policy "self service mutation for astrologers"
on public.astrologers
for insert with check (auth.uid() = user_id);

create policy "secure chat attachments bucket"
on storage.objects for insert with check (
  bucket_id = 'chat-attachments'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.chat_participants cp
    where cp.user_id = auth.uid()
      and cp.is_active = true
      and split_part(name, '/', 1) = cp.conversation_id::text
  )
);

create policy "participants can read their chat attachments"
on storage.objects for select using (
  bucket_id = 'chat-attachments'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.chat_participants cp
    where cp.user_id = auth.uid()
      and cp.is_active = true
      and split_part(name, '/', 1) = cp.conversation_id::text
  )
);

insert into public.consultation_types (slug, name, category, mode, default_fee, is_active)
values
  ('online-live-call', 'Online / Live Call', 'ONLINE', 'live_call', 1000, true),
  ('chat-consultation', 'Chat Consultation', 'ONLINE', 'chat', 600, true),
  ('live-online-chart', 'Live Online Chart', 'ONLINE', 'live_online_chart', 1000, true),
  ('live-question-answer', 'Live Question & Answer', 'ONLINE', 'live_qa', 1000, true),
  ('direct-consultation', 'Direct / In-Person Consultation', 'DIRECT', 'direct_in_person', 0, true),
  ('question-service', 'Question Service', 'QUESTION', 'question', 100, true)
on conflict (slug) do nothing;

insert into public.services (name, category, description, price, is_active)
values
  ('Live Call Consultation', 'ONLINE', 'Personalised live consultation on call.', 1000, true),
  ('Chat Consultation', 'ONLINE', 'Text-based private consultation.', 600, true),
  ('Question Service', 'QUESTION', 'One question = one payment.', 100, true),
  ('Direct Consultation', 'DIRECT', 'In-person and on-site consultation.', 0, true)
on conflict do nothing;

insert into public.astrologers (
  user_id,
  name,
  biography,
  qualification,
  experience_years,
  specialization,
  languages,
  consultation_fee,
  status,
  is_active
)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Krishna Prasad Pokharel',
  'Initial astrologer record for the platform.',
  'Jyotisha and Vastu Specialist',
  12,
  'Vedic astrology, kundali analysis, vastu guidance',
  array['Nepali', 'Hindi', 'English'],
  600,
  'active',
  true
)
on conflict do nothing;
