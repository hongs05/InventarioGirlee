alter table public.order_product_items
    add column
if not exists unit_cost numeric
(12, 2) default 0 not null,
add column
if not exists line_cost_total numeric
(12, 2) default 0 not null;

do
$$
begin
    if exists (
        select 1
    from information_schema.columns
    where table_schema = 'public'
        and table_name = 'order_product_items'
        and column_name = 'unit_cost'
    ) then
    execute 'update public.order_product_items set line_cost_total = coalesce(nullif(line_cost_total, 0), qty * unit_cost)';
end
if;
end
$$;

alter table public.order_combo_items
    add column
if not exists unit_cost numeric
(12, 2) default 0 not null,
add column
if not exists line_cost_total numeric
(12, 2) default 0 not null;

do
$$
begin
    if exists (
        select 1
    from information_schema.columns
    where table_schema = 'public'
        and table_name = 'order_combo_items'
        and column_name = 'unit_cost'
    ) then
    execute 'update public.order_combo_items set line_cost_total = coalesce(nullif(line_cost_total, 0), qty * unit_cost)';
end
if;
end
$$;
