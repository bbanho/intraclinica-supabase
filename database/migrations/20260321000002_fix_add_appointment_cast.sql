-- Fix: cast p_date text → timestamptz explicitly in add_appointment RPC
-- The original INSERT failed because PostgreSQL won't implicitly cast text to timestamptz
-- in a VALUES clause with a typed column.

create or replace function public.add_appointment(
  p_clinic_id       uuid,
  p_patient_id      uuid,
  p_doctor_actor_id uuid,
  p_date            text,
  p_status          text default 'Agendado',
  p_room_number     text default null,
  p_priority        text default null
)
returns setof public.appointment language plpgsql security definer as $$
declare
  v_patient_name text;
  v_id           uuid := gen_random_uuid();
begin
  select a.name into v_patient_name
    from public.actor a
   where a.id = p_patient_id;

  insert into public.appointment
    (id, clinic_id, patient_id, patient_name, doctor_actor_id, appointment_date, status, room_number, priority, timestamp)
  values
    (v_id, p_clinic_id, p_patient_id, coalesce(v_patient_name, ''), p_doctor_actor_id, p_date::timestamptz, p_status, p_room_number, p_priority, now());

  return query select * from public.appointment where id = v_id;
end;
$$;
