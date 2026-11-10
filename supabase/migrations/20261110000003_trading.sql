-- =====================================================================
-- TICOSHOV · Migration 3 · Trading workflow
-- RFQs → quotations → conversations/messages → deals (+ status history)
-- =====================================================================

create table public.rfqs (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique default '',  -- set by trigger
  buyer_company_id   uuid not null references public.companies(id) on delete restrict,
  created_by         uuid references auth.users(id) on delete set null,
  title              text not null check (char_length(title) between 4 and 200),
  description        text not null check (char_length(description) between 10 and 8000),
  category_id        uuid references public.categories(id) on delete set null,
  product_id         uuid references public.products(id) on delete set null,
  -- when set, the RFQ is private to one supplier; otherwise visible to all approved suppliers
  target_company_id  uuid references public.companies(id) on delete set null,
  quantity           numeric(14,2) not null check (quantity > 0),
  unit_code          text not null references public.units(code) on update cascade,
  target_price       numeric(14,2) check (target_price is null or target_price >= 0),
  currency_code      char(3) references public.currencies(code) on update cascade,
  delivery_country   char(2) not null references public.countries(code) on update cascade,
  delivery_city      text check (delivery_city is null or char_length(delivery_city) <= 120),
  incoterm           text references public.incoterms(code) on update cascade,
  required_by        date,
  specifications     jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) = 'array'),
  expires_at         timestamptz not null default (now() + interval '30 days'),
  status             public.rfq_status not null default 'open',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (category_id is not null or product_id is not null)
);
create index rfqs_buyer_idx on public.rfqs(buyer_company_id, created_at desc);
create index rfqs_open_idx on public.rfqs(status, expires_at) where status = 'open';
create index rfqs_category_idx on public.rfqs(category_id);
create index rfqs_target_idx on public.rfqs(target_company_id) where target_company_id is not null;
create trigger rfqs_updated_at before update on public.rfqs
  for each row execute function public.set_updated_at();

create table public.rfq_attachments (
  id            uuid primary key default gen_random_uuid(),
  rfq_id        uuid not null references public.rfqs(id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null check (char_length(file_name) <= 200),
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index rfq_attachments_rfq_idx on public.rfq_attachments(rfq_id);

create table public.quotations (
  id                   uuid primary key default gen_random_uuid(),
  rfq_id               uuid not null references public.rfqs(id) on delete restrict,
  supplier_company_id  uuid not null references public.companies(id) on delete restrict,
  created_by           uuid references auth.users(id) on delete set null,
  unit_price           numeric(14,2) not null check (unit_price >= 0),
  quantity             numeric(14,2) not null check (quantity > 0),
  total_amount         numeric(16,2) not null check (total_amount >= 0),
  currency_code        char(3) not null references public.currencies(code) on update cascade,
  moq                  numeric(14,2) check (moq is null or moq > 0),
  lead_time_days       integer not null check (lead_time_days between 0 and 730),
  incoterm             text references public.incoterms(code) on update cascade,
  delivery_terms       text check (delivery_terms is null or char_length(delivery_terms) <= 2000),
  payment_terms        text check (payment_terms is null or char_length(payment_terms) <= 2000),
  valid_until          date not null,
  notes                text check (notes is null or char_length(notes) <= 4000),
  status               public.quotation_status not null default 'submitted',
  revision             integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (rfq_id, supplier_company_id)
);
create index quotations_rfq_idx on public.quotations(rfq_id);
create index quotations_supplier_idx on public.quotations(supplier_company_id, created_at desc);
create trigger quotations_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_items (
  id            uuid primary key default gen_random_uuid(),
  quotation_id  uuid not null references public.quotations(id) on delete cascade,
  description   text not null check (char_length(description) between 1 and 400),
  quantity      numeric(14,2) not null check (quantity > 0),
  unit_code     text references public.units(code) on update cascade,
  unit_price    numeric(14,2) not null check (unit_price >= 0),
  line_total    numeric(16,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order    integer not null default 0
);
create index quotation_items_quotation_idx on public.quotation_items(quotation_id);

create table public.quotation_attachments (
  id            uuid primary key default gen_random_uuid(),
  quotation_id  uuid not null references public.quotations(id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null check (char_length(file_name) <= 200),
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index quotation_attachments_quotation_idx on public.quotation_attachments(quotation_id);

create sequence public.deal_reference_seq;
create sequence public.rfq_reference_seq;

create table public.deals (
  id                             uuid primary key default gen_random_uuid(),
  reference                      text not null unique,
  rfq_id                         uuid references public.rfqs(id) on delete restrict,
  quotation_id                   uuid unique references public.quotations(id) on delete restrict,
  buyer_company_id               uuid not null references public.companies(id) on delete restrict,
  supplier_company_id            uuid not null references public.companies(id) on delete restrict,
  title                          text not null,
  deal_value                     numeric(16,2) not null check (deal_value >= 0),
  currency_code                  char(3) not null references public.currencies(code) on update cascade,
  incoterm                       text references public.incoterms(code) on update cascade,
  status                         public.deal_status not null default 'negotiation',
  status_before_dispute          public.deal_status,
  -- Payment confirmation is information declared by the parties, NOT verified by TICOSHOV.
  buyer_payment_declared_at      timestamptz,
  supplier_payment_declared_at   timestamptz,
  accepted_at                    timestamptz,
  completed_at                   timestamptz,
  cancelled_at                   timestamptz,
  created_by                     uuid references auth.users(id) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  check (buyer_company_id <> supplier_company_id)
);
create index deals_buyer_idx on public.deals(buyer_company_id, created_at desc);
create index deals_supplier_idx on public.deals(supplier_company_id, created_at desc);
create index deals_status_idx on public.deals(status);
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

create table public.deal_status_history (
  id           uuid primary key default gen_random_uuid(),
  deal_id      uuid not null references public.deals(id) on delete cascade,
  from_status  public.deal_status,
  to_status    public.deal_status not null,
  changed_by   uuid references auth.users(id) on delete set null,
  note         text check (note is null or char_length(note) <= 2000),
  created_at   timestamptz not null default now()
);
create index deal_status_history_deal_idx on public.deal_status_history(deal_id, created_at);

-- One conversation per (rfq, supplier) pair, linked to the deal once one exists.
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  rfq_id               uuid references public.rfqs(id) on delete cascade,
  quotation_id         uuid references public.quotations(id) on delete set null,
  deal_id              uuid unique references public.deals(id) on delete set null,
  buyer_company_id     uuid not null references public.companies(id) on delete cascade,
  supplier_company_id  uuid not null references public.companies(id) on delete cascade,
  subject              text not null check (char_length(subject) between 1 and 200),
  is_locked            boolean not null default false,  -- moderation lock
  last_message_at      timestamptz,
  created_at           timestamptz not null default now(),
  unique (rfq_id, supplier_company_id)
);
create index conversations_buyer_idx on public.conversations(buyer_company_id, last_message_at desc nulls last);
create index conversations_supplier_idx on public.conversations(supplier_company_id, last_message_at desc nulls last);

create table public.messages (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references public.conversations(id) on delete cascade,
  sender_id          uuid references auth.users(id) on delete set null,
  sender_company_id  uuid references public.companies(id) on delete set null,  -- null = TICOSHOV staff
  body               text not null check (char_length(body) between 1 and 5000),
  attachment_path    text,
  attachment_name    text check (attachment_name is null or char_length(attachment_name) <= 200),
  is_hidden          boolean not null default false,  -- hidden by moderation
  created_at         timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create table public.message_reports (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages(id) on delete cascade,
  reporter_id  uuid references auth.users(id) on delete set null,
  reason       text not null check (char_length(reason) between 3 and 1000),
  status       public.report_status not null default 'open',
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (message_id, reporter_id)
);
create index message_reports_status_idx on public.message_reports(status);
