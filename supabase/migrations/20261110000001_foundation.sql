-- =====================================================================
-- TICOSHOV · Migration 1 · Foundation
-- Enums, reference data tables (countries, currencies, units, incoterms),
-- profiles (1:1 with auth.users), companies, membership, verification.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'operations', 'supplier', 'buyer');
create type public.company_kind as enum ('supplier', 'buyer');
create type public.member_role as enum ('owner', 'manager', 'member');
create type public.verification_status as enum
  ('pending', 'under_review', 'approved', 'rejected', 'needs_documents');
create type public.verification_doc_type as enum
  ('commercial_registration', 'tax_certificate', 'company_identity', 'export_license', 'other');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.rfq_status as enum ('open', 'closed', 'awarded', 'cancelled');
create type public.quotation_status as enum
  ('submitted', 'negotiating', 'accepted', 'rejected', 'withdrawn', 'expired');
create type public.deal_status as enum (
  'negotiation', 'quotation_accepted', 'awaiting_payment_confirmation',
  'payment_confirmed', 'production', 'ready_for_shipment', 'shipped',
  'delivered', 'completed', 'cancelled', 'disputed');
create type public.commission_status as enum
  ('pending', 'due', 'partially_paid', 'paid', 'overdue', 'waived');
create type public.commission_payment_status as enum ('submitted', 'confirmed', 'rejected');
create type public.shipment_status as enum
  ('preparing', 'booked', 'in_transit', 'at_customs', 'delivered', 'exception');
create type public.trade_doc_type as enum (
  'commercial_invoice', 'packing_list', 'certificate_of_origin', 'bill_of_lading',
  'shipping_document', 'customs_document', 'payment_evidence', 'contract', 'other');
create type public.dispute_status as enum ('open', 'under_review', 'resolved', 'closed');
create type public.report_status as enum ('open', 'reviewed', 'dismissed');

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Reference data (administered from the admin dashboard)
-- ---------------------------------------------------------------------
create table public.currencies (
  code        char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name_en     text not null,
  name_ar     text not null,
  symbol      text not null,
  decimals    smallint not null default 2 check (decimals between 0 and 4),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.countries (
  code              char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name_en           text not null,
  name_ar           text not null,
  phone_code        text not null check (phone_code ~ '^\+[0-9]{1,4}$'),
  default_currency  char(3) references public.currencies(code) on update cascade,
  is_active         boolean not null default true,
  -- whether suppliers / buyers can register from this country
  supplier_enabled  boolean not null default true,
  buyer_enabled     boolean not null default true,
  -- country-specific registration fields, e.g. {"cr_label_en":"Commercial Registry No."}
  business_fields   jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create table public.units (
  code      text primary key check (code ~ '^[a-z0-9_]{1,20}$'),
  name_en   text not null,
  name_ar   text not null,
  is_active boolean not null default true
);

create table public.incoterms (
  code        text primary key check (code ~ '^[A-Z]{3}$'),
  name_en     text not null,
  name_ar     text not null,
  sort_order  smallint not null default 0
);

-- ---------------------------------------------------------------------
-- Profiles (application user record; auth.users is managed by Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              public.user_role not null default 'buyer',
  full_name         text not null default '' check (char_length(full_name) <= 120),
  phone             text check (phone is null or phone ~ '^\+[0-9]{6,15}$'),
  preferred_locale  text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Companies: public business profile (non-sensitive fields only)
-- ---------------------------------------------------------------------
create table public.companies (
  id                   uuid primary key default gen_random_uuid(),
  kind                 public.company_kind not null,
  name                 text not null check (char_length(name) between 2 and 160),
  name_ar              text check (name_ar is null or char_length(name_ar) <= 160),
  slug                 text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  logo_path            text,
  country_code         char(2) not null references public.countries(code) on update cascade,
  city                 text not null check (char_length(city) between 1 and 120),
  business_type        text not null check (business_type in (
                         'manufacturer', 'factory', 'wholesaler', 'supplier', 'importer',
                         'distributor', 'retailer', 'trading_company', 'other')),
  description          text check (description is null or char_length(description) <= 4000),
  description_ar       text check (description_ar is null or char_length(description_ar) <= 4000),
  website              text check (website is null or website ~* '^https?://'),
  year_established     smallint check (year_established is null or year_established between 1800 and 2100),
  employees_range      text,
  export_markets       char(2)[] not null default '{}',
  import_markets       char(2)[] not null default '{}',
  verification_status  public.verification_status not null default 'pending',
  verified_at          timestamptz,
  is_active            boolean not null default true,
  is_demo              boolean not null default false,   -- demo/seed data flag, never true for real records
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index companies_kind_status_idx on public.companies(kind, verification_status) where is_active;
create index companies_country_idx on public.companies(country_code);
create index companies_name_trgm_idx on public.companies using gin (name extensions.gin_trgm_ops);
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- Sensitive company information: never publicly exposed.
create table public.company_legal (
  company_id                  uuid primary key references public.companies(id) on delete cascade,
  commercial_registration_no  text check (commercial_registration_no is null or char_length(commercial_registration_no) <= 60),
  tax_number                  text check (tax_number is null or char_length(tax_number) <= 60),
  contact_name                text check (contact_name is null or char_length(contact_name) <= 120),
  contact_email               text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone               text check (contact_phone is null or contact_phone ~ '^\+[0-9]{6,15}$'),
  address_line                text check (address_line is null or char_length(address_line) <= 300),
  postal_code                 text check (postal_code is null or char_length(postal_code) <= 20),
  updated_at                  timestamptz not null default now()
);
create trigger company_legal_updated_at before update on public.company_legal
  for each row execute function public.set_updated_at();

create table public.company_members (
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  member_role public.member_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members(user_id);

-- ---------------------------------------------------------------------
-- Supplier verification
-- ---------------------------------------------------------------------
create table public.supplier_verifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  status              public.verification_status not null default 'pending',
  submitted_by        uuid references auth.users(id) on delete set null,
  submitted_at        timestamptz,
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_at         timestamptz,
  message_to_company  text check (message_to_company is null or char_length(message_to_company) <= 2000),
  internal_notes      text check (internal_notes is null or char_length(internal_notes) <= 4000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index supplier_verifications_company_idx on public.supplier_verifications(company_id, created_at desc);
create index supplier_verifications_status_idx on public.supplier_verifications(status);
create trigger supplier_verifications_updated_at before update on public.supplier_verifications
  for each row execute function public.set_updated_at();

create table public.verification_documents (
  id               uuid primary key default gen_random_uuid(),
  verification_id  uuid not null references public.supplier_verifications(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  doc_type         public.verification_doc_type not null,
  storage_path     text not null unique,
  file_name        text not null check (char_length(file_name) <= 200),
  mime_type        text,
  size_bytes       bigint check (size_bytes is null or size_bytes between 0 and 20971520),
  uploaded_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index verification_documents_verification_idx on public.verification_documents(verification_id);
