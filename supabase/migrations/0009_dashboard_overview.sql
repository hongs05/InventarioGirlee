create or replace function public.dashboard_overview()
returns table (
    product_count bigint,
    active_product_count bigint,
    combo_count bigint,
    category_count bigint,
    orders_last_30 bigint,
    revenue_last_30 numeric,
    profit_last_30 numeric,
    inventory_units numeric,
    inventory_value numeric,
    zero_stock_count bigint,
    low_stock_products jsonb,
    sales_last_7 jsonb,
    recent_products jsonb,
    recent_combos jsonb
)
language plpgsql
stable
as
$$
begin
    return query
    with
        recent_orders as (
            select *
            from public.orders
            where status = 'completed'
                and created_at >= now() - interval '30 days'
        ),
        date_series as (
            select generate_series(
                (current_date - interval '6 days')::date,
                current_date,
                interval '1 day'
            ) as sale_date
        ),
        sales_last_week as (
            select
                d.sale_date,
                coalesce(sum(o.total_amount), 0) as total_amount,
                coalesce(sum(o.profit_amount), 0) as profit_amount,
                count(o.id) as order_count
            from date_series d
            left join public.orders o on date_trunc('day', o.created_at)::date = d.sale_date
                and o.status = 'completed'
            group by d.sale_date
            order by d.sale_date
        ),
        low_stock as (
            select id, name, quantity
            from public.products
            where status = 'active'
                and quantity is not null
                and quantity <= 5
            order by quantity asc, name asc
            limit 5
        )
    select
        (select count(*) from public.products) as product_count,
        (
            select count(*)
            from public.products
            where coalesce(status, 'active') = 'active'
        ) as active_product_count,
        (select count(*) from public.combos) as combo_count,
        (select count(*) from public.categories) as category_count,
        (select count(*) from recent_orders) as orders_last_30,
        (select coalesce(sum(total_amount), 0) from recent_orders) as revenue_last_30,
        (select coalesce(sum(profit_amount), 0) from recent_orders) as profit_last_30,
        (
            select coalesce(sum(greatest(quantity, 0)), 0)
            from public.products
            where coalesce(status, 'active') <> 'archived'
        ) as inventory_units,
        (
            select coalesce(sum(cost_price * greatest(quantity, 0)), 0)
            from public.products
            where coalesce(status, 'active') <> 'archived'
        ) as inventory_value,
        (
            select count(*)
            from public.products
            where coalesce(status, 'active') = 'active'
              and coalesce(quantity, 0) <= 0
        ) as zero_stock_count,
        (
            select coalesce(jsonb_agg(row_to_json(ls)), '[]'::jsonb)
            from (
                select id, name, quantity
                from low_stock
            ) as ls
        ) as low_stock_products,
        (
            select coalesce(
                jsonb_agg(
                    jsonb_build_object(
                        'sale_date', to_char(sale_date, 'YYYY-MM-DD'),
                        'total_amount', total_amount,
                        'profit_amount', profit_amount,
                        'order_count', order_count
                    )
                    order by sale_date
                ),
                '[]'::jsonb
            )
            from sales_last_week
        ) as sales_last_7,
        (
            select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb)
            from (
                select id, name, created_at
                from public.products
                order by created_at desc
                limit 5
            ) as row
        ) as recent_products,
        (
            select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb)
            from (
                select id, name, created_at
                from public.combos
                order by created_at desc
                limit 5
            ) as row
        ) as recent_combos;
end;
$$;
