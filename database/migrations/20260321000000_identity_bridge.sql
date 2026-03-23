-- Transition migration: bridge legacy public."user" references to canonical app_user/actor identities.
-- This migration is intentionally additive. It does not remove legacy columns or tables yet.

begin;

-- 1. Add canonical identity columns beside legacy text-based references.

alter table if exists public.appointment
  add column if not exists doctor_actor_id uuid;

alter table if exists public.clinical_record
  add column if not exists doctor_actor_id uuid;

alter table if exists public.access_request
  add column if not exists requester_user_id uuid;

-- 2. Backfill canonical references from legacy public."user".
-- doctor_id on appointment/clinical_record currently points to public."user"(id text).
-- requester_id on access_request currently points to public."user"(id text).

update public.appointment a
set doctor_actor_id = u.actor_id
from public."user" u
where a.doctor_actor_id is null
  and a.doctor_id = u.id;

update public.clinical_record cr
set doctor_actor_id = u.actor_id
from public."user" u
where cr.doctor_actor_id is null
  and cr.doctor_id = u.id;

update public.access_request ar
set requester_user_id = au.id
from public."user" u
join public.app_user au
  on au.actor_id = u.actor_id
where ar.requester_user_id is null
  and ar.requester_id = u.id;

-- 3. Add indexes for the new canonical references.

create index if not exists idx_appointment_doctor_actor_id
  on public.appointment (doctor_actor_id);

create index if not exists idx_clinical_record_doctor_actor_id
  on public.clinical_record (doctor_actor_id);

create index if not exists idx_access_request_requester_user_id
  on public.access_request (requester_user_id);

-- 4. Add foreign keys for the new canonical references.
-- Keep legacy FKs in place during the transition window.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_doctor_actor_id_fkey'
  ) then
    alter table public.appointment
      add constraint appointment_doctor_actor_id_fkey
      foreign key (doctor_actor_id)
      references public.actor(id)
      on delete restrict;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinical_record_doctor_actor_id_fkey'
  ) then
    alter table public.clinical_record
      add constraint clinical_record_doctor_actor_id_fkey
      foreign key (doctor_actor_id)
      references public.actor(id)
      on delete restrict;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'access_request_requester_user_id_fkey'
  ) then
    alter table public.access_request
      add constraint access_request_requester_user_id_fkey
      foreign key (requester_user_id)
      references public.app_user(id)
      on delete cascade;
  end if;
end
$$;

-- 5. Record intent for the follow-up migration.
comment on column public.appointment.doctor_actor_id is
  'Canonical doctor reference. Transitional bridge while legacy doctor_id text still exists.';

comment on column public.clinical_record.doctor_actor_id is
  'Canonical doctor reference. Transitional bridge while legacy doctor_id text still exists.';

comment on column public.access_request.requester_user_id is
  'Canonical requester reference to app_user. Transitional bridge while legacy requester_id text still exists.';

commit;
