create table
if not exists public.subcategories
(
  id bigserial primary key,
  category_id bigint not null references public.categories
(id) on
delete cascade,
  name text
not null,
  created_at timestamptz default now
()
);

create unique index
if not exists subcategories_category_name_idx
  on public.subcategories
(category_id, name);

alter table public.subcategories enable row level security;

create policy "Subcategories public read"
  on public.subcategories
  for
select
    using (true);

create policy "Subcategories owner write"
  on public.subcategories
  for all
  using
(auth.role
() = 'service_role')
  with check
(auth.role
() = 'service_role');
