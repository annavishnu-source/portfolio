-- ============================================================
-- AnnaVault — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Properties ─────────────────────────────────────────────
create table if not exists properties (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Property Details
  address         text not null,
  purchase_price  numeric(14,2),
  ownership_pct   numeric(5,2),
  title_entity    text,
  current_rent    numeric(10,2),

  -- Mortgage
  loan_provider       text,
  interest_rate       numeric(5,3),
  mortgage_balance    numeric(14,2),
  mortgage_username   text,

  -- HOA
  hoa_portal_url  text,
  hoa_username    text,
  hoa_dues        numeric(10,2),

  -- Status
  status          text default 'active' check (status in ('active','sold','inactive'))
);

-- ── Leases ─────────────────────────────────────────────────
create table if not exists leases (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  property_id     uuid not null references properties(id) on delete cascade,

  -- Tenant
  tenant_name     text not null,
  tenant_email    text,
  tenant_phone    text,

  -- Lease Terms
  lease_start     date not null,
  lease_end       date not null,
  monthly_rent    numeric(10,2) not null,
  security_deposit numeric(10,2),
  rent_due_day    integer default 1 check (rent_due_day between 1 and 31),

  -- Status
  status          text default 'active' check (status in ('active','expired','terminated','upcoming')),
  notes           text
);

-- ── Documents ──────────────────────────────────────────────
create table if not exists documents (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  property_id     uuid references properties(id) on delete cascade,
  lease_id        uuid references leases(id) on delete cascade,

  -- File Info
  name            text not null,
  file_path       text not null,  -- path in Supabase Storage
  file_size       bigint,
  mime_type       text,
  doc_type        text default 'other' check (doc_type in (
                    'lease','addendum','inspection','insurance',
                    'tax','deed','hoa','other'
                  )),
  notes           text
);

-- ── Assets (future-ready) ──────────────────────────────────
create table if not exists assets (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  asset_type      text not null check (asset_type in (
                    'stock','etf','crypto','cash','retirement','other'
                  )),
  name            text not null,
  ticker          text,
  quantity        numeric(18,6),
  purchase_price  numeric(14,4),
  current_price   numeric(14,4),
  account_name    text,
  institution     text,
  notes           text
);

-- ── Auto-update updated_at ─────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_updated_at before update on properties
  for each row execute function update_updated_at();

create trigger leases_updated_at before update on leases
  for each row execute function update_updated_at();

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();

-- ── Row Level Security ─────────────────────────────────────
-- For now (single user, no auth), allow all operations.
-- When you add auth later, replace these with user-scoped policies.

alter table properties enable row level security;
alter table leases enable row level security;
alter table documents enable row level security;
alter table assets enable row level security;

create policy "allow_all_properties" on properties for all using (true) with check (true);
create policy "allow_all_leases" on leases for all using (true) with check (true);
create policy "allow_all_documents" on documents for all using (true) with check (true);
create policy "allow_all_assets" on assets for all using (true) with check (true);

-- ── Enable Realtime ────────────────────────────────────────
alter publication supabase_realtime add table properties;
alter publication supabase_realtime add table leases;
alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table assets;

-- ── Storage Bucket ─────────────────────────────────────────
-- Run this separately in Supabase Dashboard > Storage > New Bucket
-- OR uncomment and run here:
--
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- create policy "allow_all_documents_storage" on storage.objects
--   for all using (bucket_id = 'documents') with check (bucket_id = 'documents');
