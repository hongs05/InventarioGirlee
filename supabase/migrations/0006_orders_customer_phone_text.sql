alter table public.orders
    alter column customer_phone type
text using customer_phone::text;
