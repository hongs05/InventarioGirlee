-- Upgrade pricing rules schema and add helper metrics for combo pricing

alter table public.price_rules add column
if not exists name text;
alter table public.price_rules add column
if not exists description text;
alter table public.price_rules add column
if not exists target text default 'product';
alter table public.price_rules add column
if not exists active boolean default true;
alter table public.price_rules add column
if not exists priority integer default 100;
alter table public.price_rules add column
if not exists conditions jsonb default '{}'::jsonb;
alter table public.price_rules add column
if not exists price_adjustment_pct numeric
(6,2) default 0;
alter table public.price_rules add column
if not exists starts_at timestamptz;
alter table public.price_rules add column
if not exists ends_at timestamptz;
alter table public.price_rules add column
if not exists created_by uuid references auth.users
(id);
alter table public.price_rules add column
if not exists updated_at timestamptz default now
();

update public.price_rules
set name = coalesce(name, initcap(scope) || ' rule');

alter table public.price_rules
	alter column name
set
default 'Regla general',
alter column name
set
not null,
alter column target
set
default 'product',
alter column active
set
default true,
alter column priority
set
default 100,
alter column conditions
set
default '{}'::jsonb,
alter column price_adjustment_pct
set
default 0;

alter table public.price_rules	drop constraint if exists price_rules_target_check;
alter table public.price_rules
	add constraint price_rules_target_check
		check (target in ('product', 'combo'));

create index
if not exists price_rules_target_priority_idx
	on public.price_rules
(target, active, priority);

-- ensure updated_at stays in sync
drop trigger if exists set_timestamp_price_rules
on public.price_rules;
create trigger set_timestamp_price_rules
	before
update on public.price_rules
	for each row
execute
procedure public.handle_updated_at
();

-- combo level metadata -----------------------------------------------------
alter table public.combos
	add column
if not exists promo_tag text,
add column
if not exists pricing_meta jsonb default '{}'::jsonb;

-- pricing metrics helper ---------------------------------------------------
create or replace function public.product_pricing_metrics
()
returns table
(
	product_id uuid,
	latest_occurred_at timestamptz,
	inventory_age_days integer,
	latest_unit_cost numeric
(12,2),
	previous_unit_cost numeric
(12,2),
	cost_change_pct numeric
(8,4)
)
language sql
stable
security definer
set search_path
= public
as
$$
with
    ordered_intake
    as
    (
        select
            product_id,
            unit_cost,
            occurred_at,
            lag(unit_cost) over (partition by product_id order by occurred_at) as previous_unit_cost,
            row_number() over (partition by product_id order by occurred_at desc) as rn
        from public.inventory_intake
    ),
    latest_intake
    as
    (
        select
            product_id,
            unit_cost as latest_unit_cost,
            previous_unit_cost,
            occurred_at as latest_occurred_at
        from ordered_intake
        where rn = 1
    )
select
    p.id as product_id,
    l.latest_occurred_at,
    case
			when l.latest_occurred_at is null then null
			else greatest(0, floor(extract(epoch from now() - l.latest_occurred_at) / 86400)
::int)
end as inventory_age_days,
		l.latest_unit_cost,
		l.previous_unit_cost,
		case
			when l.previous_unit_cost is null or l.previous_unit_cost = 0 then null
			else round
(((l.latest_unit_cost - l.previous_unit_cost) / l.previous_unit_cost) * 100, 4)
end as cost_change_pct
	from public.products p
	left join latest_intake l on l.product_id = p.id;
$$;

grant execute on function public.product_pricing_metrics
() to authenticated;
grant execute on function public.product_pricing_metrics
() to anon;
grant execute on function public.product_pricing_metrics
() to service_role;
