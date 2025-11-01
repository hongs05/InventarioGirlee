-- Enable required extensions
create extension
if not exists "pgcrypto";
create extension
if not exists "uuid-ossp";

-- categories
create table
if not exists public.categories
(
  id bigserial primary key,
  name text unique not null,
  created_at timestamptz default now
()
);

-- products
create table
if not exists public.products
(
  id uuid primary key default gen_random_uuid
(),
  sku text unique,
  name text not null,
  description text,
  category_id bigint references public.categories
(id) on
delete
set null
,
  cost_price numeric
(12,2) not null,
  sell_price numeric
(12,2),
  currency text not null default 'NIO',
  image_path text,
  status text default 'active',
  meta jsonb default '{}'::jsonb,
  created_by uuid references auth.users
(id),
  created_at timestamptz default now
(),
  updated_at timestamptz default now
()
);

-- price_rules
create table
if not exists public.price_rules
(
  id bigserial primary key,
  scope text not null,
  scope_ref text,
  margin_low numeric
(5,2) default 0.40,
  margin_mid numeric
(5,2) default 0.50,
  margin_high numeric
(5,2) default 0.60,
  margin_premium numeric
(5,2) default 0.70,
  endings text[] default array['9','0'],
  created_at timestamptz default now
()
);

-- combos
create table
if not exists public.combos
(
  id uuid primary key default gen_random_uuid
(),
  name text not null,
  description text,
  image_path text,
  packaging_cost numeric
(12,2) default 0.00,
  suggested_price numeric
(12,2),
  status text default 'active',
  created_by uuid references auth.users
(id),
  created_at timestamptz default now
(),
  updated_at timestamptz default now
()
);

-- combo_items
create table
if not exists public.combo_items
(
  combo_id uuid references public.combos
(id) on
delete cascade,
  product_id uuid
references public.products
(id) on
delete restrict,
  qty int
not null default 1,
  primary key
(combo_id, product_id)
);

-- Updated at triggers
create or replace function public.handle_updated_at
()
returns trigger as $$
begin
  new.updated_at = now
();
return new;
end;
$$ language plpgsql;

create trigger set_timestamp_products
before
update on public.products
for each row
execute procedure
public.handle_updated_at
();

create trigger set_timestamp_combos
before
update on public.combos
for each row
execute procedure
public.handle_updated_at
();

-- Row Level Security
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.price_rules enable row level security;
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

-- Policies: public read (status = 'active' where available)
create policy "Categories public read"
  on public.categories
  for
select
    using (true);

create policy "Products public read"
  on public.products
  for
select
    using (status = 'active');

create policy "Price rules public read"
  on public.price_rules
  for
select
    using (true);

create policy "Combos public read"
  on public.combos
  for
select
    using (status = 'active');

create policy "Combo items public read"
  on public.combo_items
  for
select
    using (
    exists (
      select 1
        from public.combos c
        where c.id = combo_id and c.status = 'active'
    )
        and exists (
      select 1
        from public.products p
        where p.id = product_id and p.status = 'active'
    )
  );

-- Authenticated writes (created_by = auth.uid() or service role)
create policy "Categories owner write"
  on public.categories
  for all
  using
(auth.role
() = 'service_role')
  with check
(auth.role
() = 'service_role');

create policy "Products owner insert"
  on public.products
  for
insert
  with check (
    auth.role() = 'service_role' or
auth.uid()
= coalesce
(created_by, auth.uid
())
  );

create policy "Products owner write"
  on public.products
  for
update
  using (
    auth.role()
= 'service_role' or auth.uid
() = created_by
  )
  with check
(
    auth.role
() = 'service_role' or auth.uid
() = coalesce
(created_by, auth.uid
())
  );

create policy "Products owner delete"
  on public.products
  for
delete
  using (
    auth.role
() = 'service_role' or auth.uid
() = created_by
  );

create policy "Price rules owner write"
  on public.price_rules
  for all
  using
(auth.role
() = 'service_role')
  with check
(auth.role
() = 'service_role');

create policy "Combos owner insert"
  on public.combos
  for
insert
  with check (
    auth.role() = 'service_role' or
auth.uid()
= coalesce
(created_by, auth.uid
())
  );

create policy "Combos owner write"
  on public.combos
  for
update
  using (
    auth.role()
= 'service_role' or auth.uid
() = created_by
  )
  with check
(
    auth.role
() = 'service_role' or auth.uid
() = coalesce
(created_by, auth.uid
())
  );

create policy "Combos owner delete"
  on public.combos
  for
delete
  using (
    auth.role
() = 'service_role' or auth.uid
() = created_by
  );

create policy "Combo items owner insert"
  on public.combo_items
  for
insert
  with check (
    auth.role() = 'service_role' or
auth.uid()
=
(
      select created_by
from public.combos
where id = combo_id
    )
);

create policy "Combo items owner update"
  on public.combo_items
  for
update
  using (
    auth.role()
= 'service_role' or auth.uid
() =
(
      select created_by
from public.combos
where id = combo_id
    )
)
  with check
(
    auth.role
() = 'service_role' or auth.uid
() =
(
      select created_by
from public.combos
where id = combo_id
    )
);

create policy "Combo items owner delete"
  on public.combo_items
  for
delete
  using (
    auth.role
() = 'service_role' or auth.uid
() =
(
      select created_by
from public.combos
where id = combo_id
    )
);

-- Storage bucket (run once)
insert into storage.buckets
    (id, name, public)
values
    ('products', 'products', true)
on conflict
(id) do
update set public = true;

-- Seeds
insert into public.categories
    (name)
values
    ('Maquillaje'),
    ('Perfumería'),
    ('Cuidado de la Piel')
on conflict
(name) do nothing;

with
    cat
    as
    (
        select id, name
        from public.categories
    )
insert into public.products
    (sku, name, description, category_id, cost_price, sell_price, currency, status, created_by)
values
    ('SKU-001', 'Labial Brillo Rosa', 'Labial de larga duración con acabado brillante.', (select id
        from cat
        where name = 'Maquillaje'), 150.00, null, 'NIO', 'active', null),
    ('SKU-002', 'Perfume Aurora 50ml', 'Fragancia floral con notas cítricas.', (select id
        from cat
        where name = 'Perfumería'), 900.00, null, 'NIO', 'active', null),
    ('SKU-003', 'Serum Hidratante 30ml', 'Serum ligero para hidratación diaria.', (select id
        from cat
        where name = 'Cuidado de la Piel'), 320.00, null, 'NIO', 'active', null),
    ('SKU-004', 'Delineador Preciso', 'Delineador líquido resistente al agua.', (select id
        from cat
        where name = 'Maquillaje'), 110.00, null, 'NIO', 'active', null),
    ('SKU-005', 'Crema Corporal Premium', 'Crema nutritiva con manteca de karité.', (select id
        from cat
        where name = 'Cuidado de la Piel'), 480.00, null, 'NIO', 'active', null)
on conflict
(sku) do nothing;
