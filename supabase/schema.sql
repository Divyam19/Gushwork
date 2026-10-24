create table reps (
  id text primary key,
  name text not null,
  initials text not null,
  color text not null
);

create table leads (
  id text primary key,
  name text not null,
  company text not null,
  phone text not null,
  city text,
  source text not null,
  rep_id text not null references reps(id),
  product_interest text,
  notes text,
  last_contact_date date not null,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references leads(id) on delete cascade,
  sender text not null check (sender in ('rep','buyer')),
  text text not null,
  sent_at timestamptz not null
);
create index on messages(lead_id, sent_at);

create table analyses (
  lead_id text primary key references leads(id) on delete cascade,
  tag text not null check (tag in ('Hot','Warm','Cold')),
  score int not null,
  signals jsonb not null,
  reason text not null,
  next_followup_date date not null,
  draft text not null,
  draft_status text not null default 'pending' check (draft_status in ('pending','sent')),
  sent_at timestamptz,
  pending_draft text,
  status text not null default 'ready' check (status in ('ready','analyzing','error')),
  error text,
  model text,
  analyzed_at timestamptz default now()
);
