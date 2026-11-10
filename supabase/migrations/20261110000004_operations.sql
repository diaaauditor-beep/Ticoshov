-- =====================================================================
-- TICOSHOV · Migration 4 · Operations & administration
-- Commissions (tracked, never auto-charged), shipments, trade documents,
-- notifications, reviews, disputes, admin actions, audit logs, settings.
-- =====================================================================

-- Commission rules: the most specific active rule wins (see resolve_commission_rate).
create table public.commission_rules (
  id                   uuid primary key default gen_random_uuid(),
  scope                text not null check (scope in ('supplier', 'buyer', 'category', 'country')),
  supplier_company_id  uuid references public.companies(id) on delete cascade,
  buyer_company_id     uuid references public.companies(id) on delete cascade,
  category_id          uuid references public.categories(id) on delete cascade,
  country_code         char(2) references public.countries(code) on delete cascade,
  rate                 numeric(5,2) not null check (rate >= 0 and rate <= 100),
  is_active            boolean not null default true,
  notes                text,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  check (
    (scope = 'supplier' and supplier_company_id is not null) or
    (scope = 'buyer'    and buyer_company_id    is not null) or
    (scope = 'category' and category_id         is not null) or
    (scope = 'country'  and country_code        is not null)
  )
);

create table public.commissions (
  id                   uuid primary key default gen_random_uuid(),
  deal_id              uuid not null unique references public.deals(id) on delete restrict,
  deal_value           numeric(16,2) not null check (deal_value >= 0),
  rate                 numeric(5,2) not null check (rate >= 0 and rate <= 100),
  amount               numeric(16,2) not null check (amount >= 0),
  amount_paid          numeric(16,2) not null default 0 check (amount_paid >= 0),
  currency_code        char(3) not null references public.currencies(code) on update cascade,
  supplier_company_id  uuid not null references public.companies(id) on delete restrict,
  buyer_company_id     uuid not null references public.companies(id) on delete restrict,
  payer                text not null default 'supplier' check (payer in ('supplier', 'buyer', 'both')),
  rate_source          text not null default 'default',  -- which rule produced the rate
  status               public.commission_status not null default 'pending',
  due_date             date,
  admin_notes          text check (admin_notes is null or char_length(admin_notes) <= 4000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index commissions_status_idx on public.commissions(status, due_date);
create index commissions_supplier_idx on public.commissions(supplier_company_id);
create trigger commissions_updated_at before update on public.commissions
  for each row execute function public.set_updated_at();

create table public.commission_payments (
  id             uuid primary key default gen_random_uuid(),
  commission_id  uuid not null references public.commissions(id) on delete restrict,
  amount         numeric(16,2) not null check (amount > 0),
  paid_on        date not null,
  method         text check (method is null or char_length(method) <= 80),
  reference      text check (reference is null or char_length(reference) <= 120),
  evidence_path  text,
  status         public.commission_payment_status not null default 'submitted',
  submitted_by   uuid references auth.users(id) on delete set null,
  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,
  notes          text check (notes is null or char_length(notes) <= 2000),
  created_at     timestamptz not null default now()
);
create index commission_payments_commission_idx on public.commission_payments(commission_id);

create table public.shipments (
  id                   uuid primary key default gen_random_uuid(),
  deal_id              uuid not null references public.deals(id) on delete cascade,
  carrier              text check (carrier is null or char_length(carrier) <= 120),
  tracking_number      text check (tracking_number is null or char_length(tracking_number) <= 120),
  transport_mode       text check (transport_mode is null or transport_mode in ('sea', 'air', 'land', 'multimodal', 'courier')),
  incoterm             text references public.incoterms(code) on update cascade,
  origin_country       char(2) references public.countries(code) on update cascade,
  destination_country  char(2) references public.countries(code) on update cascade,
  port_of_loading      text check (port_of_loading is null or char_length(port_of_loading) <= 120),
  port_of_discharge    text check (port_of_discharge is null or char_length(port_of_discharge) <= 120),
  etd                  date,
  eta                  date,
  status               public.shipment_status not null default 'preparing',
  notes                text check (notes is null or char_length(notes) <= 2000),
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index shipments_deal_idx on public.shipments(deal_id);
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

create table public.shipment_documents (
  id             uuid primary key default gen_random_uuid(),
  deal_id        uuid not null references public.deals(id) on delete cascade,
  shipment_id    uuid references public.shipments(id) on delete set null,
  doc_type       public.trade_doc_type not null,
  storage_path   text not null unique,
  file_name      text not null check (char_length(file_name) <= 200),
  mime_type      text,
  size_bytes     bigint,
  company_id     uuid references public.companies(id) on delete set null,
  uploaded_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index shipment_documents_deal_idx on public.shipment_documents(deal_id);

-- Configurable document checklist per corridor. Informational only — TICOSHOV
-- does not certify customs or regulatory compliance.
create table public.trade_document_requirements (
  id                   uuid primary key default gen_random_uuid(),
  origin_country       char(2) references public.countries(code) on delete cascade,
  destination_country  char(2) references public.countries(code) on delete cascade,
  doc_type             public.trade_doc_type not null,
  is_required          boolean not null default true,
  note_en              text,
  note_ar              text,
  unique nulls not distinct (origin_country, destination_country, doc_type)
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.reviews (
  id                    uuid primary key default gen_random_uuid(),
  deal_id               uuid not null references public.deals(id) on delete cascade,
  reviewer_company_id   uuid not null references public.companies(id) on delete cascade,
  reviewee_company_id   uuid not null references public.companies(id) on delete cascade,
  rating                smallint not null check (rating between 1 and 5),
  comment               text check (comment is null or char_length(comment) <= 2000),
  is_hidden             boolean not null default false,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  unique (deal_id, reviewer_company_id),
  check (reviewer_company_id <> reviewee_company_id)
);
create index reviews_reviewee_idx on public.reviews(reviewee_company_id);

create table public.disputes (
  id                     uuid primary key default gen_random_uuid(),
  deal_id                uuid not null references public.deals(id) on delete restrict,
  raised_by              uuid references auth.users(id) on delete set null,
  raised_by_company_id   uuid not null references public.companies(id) on delete restrict,
  against_company_id     uuid not null references public.companies(id) on delete restrict,
  reason                 text not null check (reason in (
                           'quality', 'quantity', 'delivery_delay', 'non_delivery', 'payment',
                           'documentation', 'misrepresentation', 'other')),
  description            text not null check (char_length(description) between 10 and 5000),
  status                 public.dispute_status not null default 'open',
  assigned_to            uuid references auth.users(id) on delete set null,
  resolution             text check (resolution is null or char_length(resolution) <= 5000),
  resolved_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index disputes_status_idx on public.disputes(status, created_at desc);
create index disputes_deal_idx on public.disputes(deal_id);
create trigger disputes_updated_at before update on public.disputes
  for each row execute function public.set_updated_at();

create table public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index admin_actions_created_idx on public.admin_actions(created_at desc);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_record_idx on public.audit_logs(table_name, record_id);

create table public.platform_settings (
  key          text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value        jsonb not null,
  description  text,
  is_public    boolean not null default false,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();
