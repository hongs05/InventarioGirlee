do $
$
begin
    if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
        and table_name = 'products'
        and column_name = 'subcategory_id'
  ) then
    alter table public.products
      add column subcategory_id bigint references public.subcategories
    (id) on
    delete
    set null;
end
if;
end;
$$;

create index
if not exists products_subcategory_idx
  on public.products
(subcategory_id);
