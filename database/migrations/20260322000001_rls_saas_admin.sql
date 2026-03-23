-- =============================================================================
-- Migration: 20260322000001_rls_saas_admin
-- Purpose:   Allow SUPER_ADMIN to manage SaaS modules (clinic_module table).
-- =============================================================================
begin;
-- Create a helper function to check if the current authenticated user is a SUPER_ADMIN
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.app_user
    where id = auth.uid()
      and role = 'SUPER_ADMIN'
  );
$$;
-- Enable RLS on clinic_module if not already enabled (safety check)
alter table public.clinic_module enable row level security;
-- Policy 1: Everyone can read (SELECT) the modules enabled for their clinic (or all if Super Admin)
drop policy if exists "Enable read access for authenticated users" on public.clinic_module;
create policy "Enable read access for authenticated users"
on public.clinic_module
for select
to authenticated
using (
  public.is_super_admin() OR 
  clinic_id = (select clinic_id from public.app_user where id = auth.uid())
);
-- Policy 2: Only SUPER_ADMIN can insert new modules for a clinic
drop policy if exists "Enable insert for SUPER_ADMIN" on public.clinic_module;
create policy "Enable insert for SUPER_ADMIN"
on public.clinic_module
for insert
to authenticated
with check (
  public.is_super_admin()
);
-- Policy 3: Only SUPER_ADMIN can update existing modules (toggle on/off)
drop policy if exists "Enable update for SUPER_ADMIN" on public.clinic_module;
create policy "Enable update for SUPER_ADMIN"
on public.clinic_module
for update
to authenticated
using (
  public.is_super_admin()
)
with check (
  public.is_super_admin()
);
-- Policy 4: Only SUPER_ADMIN can delete
drop policy if exists "Enable delete for SUPER_ADMIN" on public.clinic_module;
create policy "Enable delete for SUPER_ADMIN"
on public.clinic_module
for delete
to authenticated
using (
  public.is_super_admin()
);
commit;
