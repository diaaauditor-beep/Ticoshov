-- =====================================================================
-- TICOSHOV · Migration 2 · Catalog
-- Categories are a self-referencing tree (category → subcategory → …),
-- so any depth of nesting is supported without schema changes.
-- Products are category-agnostic: industry-specific attributes live in
-- product_specifications (key/value), never as hardcoded columns.
-- =====================================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories(id) on delete restrict,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name_en     text not null check (char_length(name_en) between 2 and 120),
  name_ar     text not null check (char_length(name_ar) between 2 and 120),
  icon        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories(parent_id);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- Compatibility view requested by the brief: subcategories = categories with a parent.
create view public.subcategories with (security_invoker = true) as
  select id, parent_id as category_id, slug, name_en, name_ar, sort_order, is_active, created_at
  from public.categories where parent_id is not null;

-- Which categories a company operates in
create table public.company_categories (
  company_id  uuid not null references public.companies(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (company_id, category_id)
);
create index company_categories_category_idx on public.company_categories(category_id);

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  category_id          uuid not null references public.categories(id) on delete restrict,
  name_en              text not null check (char_length(name_en) between 2 and 200),
  name_ar              text not null check (char_length(name_ar) between 2 and 200),
  description_en       text check (description_en is null or char_length(description_en) <= 8000),
  description_ar       text check (description_ar is null or char_length(description_ar) <= 8000),
  sku                  text check (sku is null or char_length(sku) <= 80),
  moq                  numeric(14,2) not null check (moq > 0),
  unit_code            text not null references public.units(code) on update cascade,
  price_min            numeric(14,2) check (price_min is null or price_min >= 0),
  price_max            numeric(14,2) check (price_max is null or price_max >= 0),
  currency_code        char(3) not null references public.currencies(code) on update cascade,
  origin_country       char(2) not null references public.countries(code) on update cascade,
  available_quantity   numeric(14,2) check (available_quantity is null or available_quantity >= 0),
  lead_time_days       integer check (lead_time_days is null or lead_time_days between 0 and 730),
  export_available     boolean not null default true,
  export_countries     char(2)[] not null default '{}',
  status               public.product_status not null default 'draft',
  published_at         timestamptz,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search_vector        tsvector generated always as (
                         setweight(to_tsvector('simple', coalesce(name_en, '') || ' ' || coalesce(name_ar, '') || ' ' || coalesce(sku, '')), 'A') ||
                         setweight(to_tsvector('simple', coalesce(description_en, '') || ' ' || coalesce(description_ar, '')), 'B')
                       ) stored,
  check (price_min is null or price_max is null or price_max >= price_min),
  unique (company_id, sku)
);
create index products_company_idx on public.products(company_id);
create index products_category_idx on public.products(category_id) where status = 'published';
create index products_status_idx on public.products(status, created_at desc);
create index products_origin_idx on public.products(origin_country);
create index products_search_idx on public.products using gin (search_vector);
create index products_name_en_trgm_idx on public.products using gin (name_en extensions.gin_trgm_ops);
create index products_name_ar_trgm_idx on public.products using gin (name_ar extensions.gin_trgm_ops);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text     text check (alt_text is null or char_length(alt_text) <= 200),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id, sort_order);

create table public.product_specifications (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  key_en      text not null check (char_length(key_en) between 1 and 80),
  key_ar      text check (key_ar is null or char_length(key_ar) <= 80),
  value       text not null check (char_length(value) between 1 and 400),
  sort_order  integer not null default 0
);
create index product_specifications_product_idx on public.product_specifications(product_id, sort_order);
