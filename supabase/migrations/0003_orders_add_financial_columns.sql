-- Ensure required financial columns exist on orders for POS feature

do $$
begin
	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'subtotal_amount'
	) then
		alter table public.orders
			add column subtotal_amount numeric(12, 2) not null default 0;
	end if;

	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'discount_amount'
	) then
		alter table public.orders
			add column discount_amount numeric(12, 2) not null default 0;
	end if;

	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'tax_amount'
	) then
		alter table public.orders
			add column tax_amount numeric(12, 2) not null default 0;
	end if;

	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'total_cost'
	) then
		alter table public.orders
			add column total_cost numeric(12, 2) not null default 0;
	end if;

	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'profit_amount'
	) then
		alter table public.orders
			add column profit_amount numeric(12, 2) not null default 0;
	end if;
end
$$;
