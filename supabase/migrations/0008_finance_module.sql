-- Finance module schema: expense tracking and inventory intake

-- Expense transactions ------------------------------------------------------

do $
$
begin
    if not exists (
        select 1
    from information_schema.tables
    where table_schema = 'public'
        and table_name = 'expense_transactions'
    ) then
    execute $ddl$
    create table public.expense_transactions
    (
        id uuid primary key default gen_random_uuid(),
        description text not null,
        category text,
        type text not null default 'expense',
        provider_name text,
        amount numeric(12, 2) not null default 0,
        currency text not null default 'NIO',
        reference text,
        occurred_at timestamptz not null default now(),
        created_by uuid references auth.users (id),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint expense_transactions_type_check check (type in ('inventory', 'expense'))
    );
    $ddl$;
end
if;
end;
$$;

drop trigger if exists set_timestamp_expense_transactions
on public.expense_transactions;
create trigger set_timestamp_expense_transactions
    before
update on public.expense_transactions
    for each row
execute procedure
public.handle_updated_at
();

create index
if not exists expense_transactions_occurred_at_idx
    on public.expense_transactions
(occurred_at desc);
create index
if not exists expense_transactions_created_by_idx
    on public.expense_transactions
(created_by);

alter table public.expense_transactions enable row level security;

drop policy
if exists "Expense transactions read" on public.expense_transactions;
create policy "Expense transactions read"
    on public.expense_transactions
    for
select
    using (
        auth.role() = 'service_role'
        or created_by is null
        or created_by = auth.uid()
    );

drop policy
if exists "Expense transactions insert" on public.expense_transactions;
create policy "Expense transactions insert"
    on public.expense_transactions
    for
insert
    with check (auth.role() = 'service_role')
;

drop policy
if exists "Expense transactions update" on public.expense_transactions;
create policy "Expense transactions update"
    on public.expense_transactions
    for
update
    using (auth.role()
= 'service_role');

drop policy
if exists "Expense transactions delete" on public.expense_transactions;
create policy "Expense transactions delete"
    on public.expense_transactions
    for
delete
    using (auth.role
() = 'service_role');

-- Inventory intake ----------------------------------------------------------

do $$
begin
    if not exists (
        select 1
    from information_schema.tables
    where table_schema = 'public'
        and table_name = 'inventory_intake'
    ) then
    execute $ddl$
    create table public.inventory_intake (
            id uuid primary key default gen_random_uuid(),
            product_id uuid not null references public.products (id) on delete restrict,
            provider_name text,
            quantity integer not null check
    (quantity > 0),
            unit_cost numeric
    (12, 2) not null,
            total_cost numeric
    (12, 2) not null,
            currency text not null default 'NIO',
            notes text,
            occurred_at timestamptz not null default now
    (),
            created_by uuid references auth.users
    (id),
            created_at timestamptz not null default now
    (),
            updated_at timestamptz not null default now
    ()
        );
$ddl$;
end
if;
end;
$$;

drop trigger if exists set_timestamp_inventory_intake
on public.inventory_intake;
create trigger set_timestamp_inventory_intake
    before
update on public.inventory_intake
    for each row
execute procedure
public.handle_updated_at
();

create index
if not exists inventory_intake_occurred_at_idx
    on public.inventory_intake
(occurred_at desc);
create index
if not exists inventory_intake_product_idx
    on public.inventory_intake
(product_id);
create index
if not exists inventory_intake_created_by_idx
    on public.inventory_intake
(created_by);

alter table public.inventory_intake enable row level security;

drop policy
if exists "Inventory intake read" on public.inventory_intake;
create policy "Inventory intake read"
    on public.inventory_intake
    for
select
    using (
        auth.role() = 'service_role'
        or created_by is null
        or created_by = auth.uid()
    );

drop policy
if exists "Inventory intake insert" on public.inventory_intake;
create policy "Inventory intake insert"
    on public.inventory_intake
    for
insert
    with check (auth.role() = 'service_role')
;

drop policy
if exists "Inventory intake update" on public.inventory_intake;
create policy "Inventory intake update"
    on public.inventory_intake
    for
update
    using (auth.role()
= 'service_role');

drop policy
if exists "Inventory intake delete" on public.inventory_intake;
create policy "Inventory intake delete"
    on public.inventory_intake
    for
delete
    using (auth.role
() = 'service_role');

