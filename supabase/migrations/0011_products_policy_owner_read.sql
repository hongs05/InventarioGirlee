-- Recreate product select policies so owners can view all statuses
-- NOTE: Avoid editing this file manually; Supabase requires the DO block format exactly as written.

do $
$
begin
    execute 'drop policy if exists "Products public read" on public.products';
    execute 'drop policy if exists "Products owner read" on public.products';
    execute 'drop policy if exists "Products owner select" on public.products';

    execute $cmd$
    create policy "Products active public read"
            on public.products
            for
    select
        using (coalesce(status, 'active') = 'active')
    $cmd$;

execute $cmd$
create policy "Products owner read"
            on public.products
            for
select
    using (
                auth.role() = 'service_role'
        or created_by = auth.uid()
        or created_by is null
            )
$cmd$;
end
$$;
