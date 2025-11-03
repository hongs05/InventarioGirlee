
alter table public.orders
    add column
if not exists subtotal_amount numeric
(12, 2) not null default 0;

alter table public.orders
    add column
if not exists discount_amount numeric
(12, 2) not null default 0;

alter table public.orders
    add column
if not exists tax_amount numeric
(12, 2) not null default 0;

alter table public.orders
    add column
if not exists total_cost numeric
(12, 2) not null default 0;

alter table public.orders
    add column
if not exists profit_amount numeric
(12, 2) not null default 0;
