-- =============================================================================
-- Migration: 20260322000000_appointment_conflict_guard
-- Purpose:   Prevent double-booking of the same doctor at overlapping times.
--
-- Strategy (defense in depth):
--   1. Add `duration_minutes` column to `appointment` (default 30).
--   2. Enable `btree_gist` extension (required for EXCLUDE on scalar + range).
--   3. Create EXCLUDE USING GIST constraint on (doctor_actor_id, tstzrange).
--      - Only active appointments are considered (Cancelado / Realizado excluded).
--      - Partial index via WHERE clause so cancelled/done slots free the slot.
--   4. Create trigger function with a human-readable Portuguese error message,
--      fired BEFORE INSERT OR UPDATE as a second layer of defence.
--   5. Update the `add_appointment` RPC to accept `p_duration_minutes`.
--
-- Safe to re-run (idempotent via IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Add duration_minutes column
--    Default 30 min keeps all existing rows valid.
-- ---------------------------------------------------------------------------

alter table public.appointment
  add column if not exists duration_minutes integer not null default 60
  check (duration_minutes > 0 and duration_minutes <= 480);

comment on column public.appointment.duration_minutes is
  'Duration of the appointment in minutes. Used to build the time range for conflict detection.';

-- ---------------------------------------------------------------------------
-- 2. Enable btree_gist
--    Required so PostgreSQL can build a GiST index combining a uuid scalar
--    (doctor_actor_id) with a tstzrange — neither alone is a range type.
-- ---------------------------------------------------------------------------

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- 3. EXCLUDE constraint: one doctor, no overlapping time ranges
--
--    tstzrange(appointment_date, appointment_date + duration, '[)')
--      '[)' = inclusive start, exclusive end (standard half-open interval)
--
--    WHERE clause: only enforce for "active" appointments.
--    Cancelled or completed appointments release the slot.
--
--    NOTE: The constraint creates its own GiST index automatically.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_no_doctor_overlap'
  ) then
    alter table public.appointment
      add constraint appointment_no_doctor_overlap
      exclude using gist (
        doctor_actor_id with =,
        tstzrange(
          appointment_date,
          appointment_date + make_interval(secs => duration_minutes * 60),
          '[)'
        ) with &&
      )
      where (
        doctor_actor_id is not null
        and status not in ('Cancelado', 'Realizado')
      );
  end if;
end
$$;

comment on constraint appointment_no_doctor_overlap on public.appointment is
  'Prevents two active appointments for the same doctor from overlapping in time.
   Cancelled (Cancelado) and completed (Realizado) appointments are excluded from
   the check so their slots become available for rescheduling.';

-- ---------------------------------------------------------------------------
-- 4. Trigger function: human-readable error in Brazilian Portuguese
--
--    The EXCLUDE constraint already blocks the insert at the DB level, but its
--    raw error message is not user-friendly. This trigger fires BEFORE INSERT OR
--    UPDATE and raises a cleaner exception that the frontend can surface directly.
--
--    Why BEFORE and not AFTER?
--      BEFORE triggers fire before constraint checks, so we can give a better
--      message. If somehow bypassed, the EXCLUDE constraint is the hard stop.
-- ---------------------------------------------------------------------------

create or replace function public.trg_fn_appointment_conflict_check()
returns trigger
language plpgsql
security definer
as $$
declare
  v_conflict record;
begin
  -- Skip check for statuses that free the slot
  if NEW.status in ('Cancelado', 'Realizado') then
    return NEW;
  end if;

  -- Skip when no doctor is assigned (nullable)
  if NEW.doctor_actor_id is null then
    return NEW;
  end if;

  -- Look for any active, overlapping appointment for the same doctor
  -- Exclude the row itself on UPDATE (OLD.id)
  select id, patient_name, appointment_date, duration_minutes
    into v_conflict
    from public.appointment
   where doctor_actor_id = NEW.doctor_actor_id
     and id <> coalesce(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
     and status not in ('Cancelado', 'Realizado')
     and tstzrange(appointment_date, appointment_date + make_interval(secs => duration_minutes * 60), '[)')
      && tstzrange(NEW.appointment_date, NEW.appointment_date + make_interval(secs => NEW.duration_minutes * 60), '[)')
   limit 1;

  if found then
    raise exception
      'Conflito de horário: o médico já possui um agendamento com "%" às % (duração: % min). Escolha outro horário ou médico.',
      v_conflict.patient_name,
      to_char(v_conflict.appointment_date at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      v_conflict.duration_minutes
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

comment on function public.trg_fn_appointment_conflict_check() is
  'BEFORE trigger: validates that a new or updated appointment does not overlap
   with an existing active appointment for the same doctor. Raises a human-readable
   error in Brazilian Portuguese (errcode P0001).';

-- ---------------------------------------------------------------------------
-- Drop and recreate trigger to ensure idempotency
-- ---------------------------------------------------------------------------

drop trigger if exists trg_appointment_conflict_check on public.appointment;

create trigger trg_appointment_conflict_check
  before insert or update of doctor_actor_id, appointment_date, duration_minutes, status
  on public.appointment
  for each row
  execute function public.trg_fn_appointment_conflict_check();

comment on trigger trg_appointment_conflict_check on public.appointment is
  'Fires BEFORE INSERT or UPDATE on relevant columns to prevent doctor double-booking.
   Second layer of defence after the EXCLUDE USING GIST constraint.';

-- ---------------------------------------------------------------------------
-- 5. Update add_appointment RPC: accept p_duration_minutes
--    Default 30 keeps all existing callers backward-compatible.
-- ---------------------------------------------------------------------------

create or replace function public.add_appointment(
  p_clinic_id         uuid,
  p_patient_id        uuid,
  p_doctor_actor_id   uuid,
  p_date              text,
  p_status            text    default 'Agendado',
  p_room_number       text    default null,
  p_priority          text    default null,
  p_duration_minutes  integer default 60
)
returns setof public.appointment
language plpgsql
security definer
as $$
declare
  v_patient_name text;
  v_id           uuid := gen_random_uuid();
begin
  -- Resolve patient name server-side — never trusted from the frontend
  select a.name into v_patient_name
    from public.actor a
   where a.id = p_patient_id;

  insert into public.appointment
    (id, clinic_id, patient_id, patient_name, doctor_actor_id,
     appointment_date, status, room_number, priority, duration_minutes, timestamp)
  values
    (v_id, p_clinic_id, p_patient_id, coalesce(v_patient_name, ''), p_doctor_actor_id,
     p_date::timestamptz, p_status, p_room_number, p_priority, p_duration_minutes, now());

  return query select * from public.appointment where id = v_id;
end;
$$;

comment on function public.add_appointment is
  'Server-side appointment creation. Resolves patient name from actor table.
   Conflict detection is handled by trg_appointment_conflict_check (trigger)
   and appointment_no_doctor_overlap (EXCLUDE constraint).
   p_duration_minutes defaults to 60 for backward compatibility.';

-- ---------------------------------------------------------------------------
-- 6. Supporting index for fast conflict queries by doctor + date range
--    (the EXCLUDE constraint creates its own GiST index, but this B-tree
--     index accelerates the trigger''s manual SELECT overlap check)
-- ---------------------------------------------------------------------------

create index if not exists idx_appointment_doctor_date
  on public.appointment (doctor_actor_id, appointment_date)
  where status not in ('Cancelado', 'Realizado');

commit;
