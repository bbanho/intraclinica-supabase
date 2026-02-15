-- Migration to add user and actor tables if missing, and create RPCs
-- 20260215000000_add_user_actor_rpc.sql

-- Ensure actor table exists (inferred structure)
create table if not exists actor (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id),
  name text not null,
  type text check (type in ('user', 'patient', 'clinic', 'system')),
  created_at timestamptz default now()
);

-- Ensure user table exists (inferred structure)
create table if not exists "user" (
  id uuid references auth.users primary key, -- The Auth ID
  actor_id uuid references actor(id),
  email text,
  role text,
  iam_bindings jsonb,
  assigned_room text
);

-- Enable RLS on user table if created
alter table "user" enable row level security;
-- Policy for user to see own data
create policy "Users can view own user record" on "user" for select using (auth.uid() = id);

-- RPC: Create User with Actor
create or replace function create_user_with_actor(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_clinic_id text,
  p_role text,
  p_iam_bindings jsonb,
  p_assigned_room text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor_id uuid;
  v_user_result jsonb;
begin
  -- 1. Create Actor
  insert into actor (clinic_id, name, type)
  values (p_clinic_id, p_name, 'user')
  returning id into v_actor_id;

  -- 2. Create User linked to Actor
  insert into "user" (id, actor_id, email, role, iam_bindings, assigned_room)
  values (p_user_id, v_actor_id, p_email, p_role, p_iam_bindings, p_assigned_room);

  -- 3. Return the created user with actor info
  select jsonb_build_object(
    'id', u.id,
    'actor_id', u.actor_id,
    'email', u.email,
    'role', u.role,
    'iam_bindings', u.iam_bindings,
    'assigned_room', u.assigned_room,
    'actor', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'clinic_id', a.clinic_id
    )
  )
  into v_user_result
  from "user" u
  join actor a on u.actor_id = a.id
  where u.id = p_user_id;

  return v_user_result;
exception
  when others then
    raise;
end;
$$;

-- RPC: Update User with Actor
create or replace function update_user_with_actor(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_iam_bindings jsonb,
  p_assigned_room text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor_id uuid;
  v_user_result jsonb;
begin
  -- 1. Get Actor ID
  select actor_id into v_actor_id from "user" where id = p_user_id;

  if v_actor_id is null then
    raise exception 'User not found or not linked to actor';
  end if;

  -- 2. Update Actor
  update actor
  set name = p_name
  where id = v_actor_id;

  -- 3. Update User
  update "user"
  set 
    role = p_role,
    iam_bindings = p_iam_bindings,
    assigned_room = p_assigned_room
  where id = p_user_id;

  -- 4. Return the updated user with actor info
  select jsonb_build_object(
    'id', u.id,
    'actor_id', u.actor_id,
    'email', u.email,
    'role', u.role,
    'iam_bindings', u.iam_bindings,
    'assigned_room', u.assigned_room,
    'actor', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'clinic_id', a.clinic_id
    )
  )
  into v_user_result
  from "user" u
  join actor a on u.actor_id = a.id
  where u.id = p_user_id;

  return v_user_result;
exception
  when others then
    raise;
end;
$$;
