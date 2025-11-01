-- POS schema for orders and sales tracking

-- Orders table --------------------------------------------------------------

create table public.orders
(
    id uuid primary key default gen_random_uuid(),
    receipt_number text unique,
    customer_name text,
    customer_phone text,
    customer_email text,
    notes text,
    status text not null default 'completed',
    payment_method text not null default 'cash',
    payment_reference text,
    subtotal_amount numeric(12, 2) not null default 0,
    discount_amount numeric(12, 2) not null default 0,
    tax_amount numeric(12, 2) not null default 0,
    total_amount numeric(12, 2) not null default 0,
    total_cost numeric(12, 2) not null default 0,
    profit_amount numeric(12, 2) not null default 0,
    currency text not null default 'NIO',
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint orders_status_check check (status in ('pending', 'processing', 'completed', 'cancelled')),
    constraint orders_payment_method_check check (payment_method in ('cash', 'card', 'transfer'))
);

create trigger set_timestamp_orders
before
update on public.orders
for each row
execute
procedure public.handle_updated_at
();

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_created_by_idx on public.orders (created_by);

-- Order line items ---------------------------------------------------------

create table public.order_product_items (
	id bigserial primary key,
	order_id uuid not null references public.orders (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete restrict,
	qty integer not null check
(qty > 0),
	unit_price numeric
(12, 2) not null,
	unit_cost numeric
(12, 2) not null,
	line_total numeric
(12, 2) not null,
	line_cost_total numeric
(12, 2) not null
);

create index order_product_items_order_idx on public.order_product_items (order_id);
create index order_product_items_product_idx on public.order_product_items (product_id);

create table public.order_combo_items (
	id bigserial primary key,
	order_id uuid not null references public.orders (id) on delete cascade,
	combo_id uuid not null references public.combos (id) on delete restrict,
	qty integer not null check
(qty > 0),
	unit_price numeric
(12, 2) not null,
	unit_cost numeric
(12, 2) not null,
	line_total numeric
(12, 2) not null,
	line_cost_total numeric
(12, 2) not null
);

create index order_combo_items_order_idx on public.order_combo_items (order_id);
create index order_combo_items_combo_idx on public.order_combo_items (combo_id);

-- Row Level Security -------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_product_items enable row level security;
alter table public.order_combo_items enable row level security;

create policy "Orders read"
	on public.orders
	for
select
    using (
		auth.role() = 'service_role'
        or created_by is null
        or created_by = auth.uid()
	);

create policy "Orders insert"
	on public.orders
	for
insert
	with check (auth.role() = 'service_role')
;

create policy "Orders update"
	on public.orders
	for
update
	using (auth.role()
= 'service_role');

create policy "Orders delete"
	on public.orders
	for
delete
	using (auth.role
() = 'service_role');

create policy "Order product items read"
	on public.order_product_items
	for
select
    using (
		auth.role() = 'service_role'
        or exists (
			select 1
        from public.orders o
        where o.id = order_id
            and (o.created_by is null or o.created_by = auth.uid())
		)
	);

create policy "Order product items insert"
	on public.order_product_items
	for
insert
	with check (auth.role() = 'service_role')
;

create policy "Order combo items read"
	on public.order_combo_items
	for
select
    using (
		auth.role() = 'service_role'
        or exists (
			select 1
        from public.orders o
        where o.id = order_id
            and (o.created_by is null or o.created_by = auth.uid())
		)
	);

create policy "Order combo items insert"
	on public.order_combo_items
	for
insert
	with check (auth.role() = 'service_role')
;
