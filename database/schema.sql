-- Habilitar extensão para UUIDs
create extension if not exists "uuid-ossp";

-- 1. Tabela de Clínicas (Tenants)
create table clinics (
  id text primary key, -- Mantendo text para compatibilidade com IDs existentes ou slug
  name text not null,
  email text,
  plan text check (plan in ('Starter', 'Pro', 'Enterprise')),
  status text check (status in ('active', 'inactive', 'trial')),
  next_billing timestamptz,
  created_at timestamptz default now()
);

-- 2. Tabela de Perfis de Usuários (Vinculada ao Auth do Supabase)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text,
  role text default 'USER', -- Deprecated field kept for compat
  clinic_id text references clinics(id),
  avatar text,
  assigned_room text,
  created_at timestamptz default now()
);

-- IAM Bindings (Relacionamento N:N flexível armazenado como JSONB para simplificar migração do NoSQL)
-- Alternativamente, poderíamos criar uma tabela 'iam_bindings', mas JSONB é mais próximo do modelo atual
alter table profiles add column iam jsonb default '[]'::jsonb;

-- 3. Pacientes
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  name text not null,
  email text,
  phone text,
  cpf text,
  birth_date date,
  gender text,
  created_at timestamptz default now()
);

-- 4. Produtos (Estoque)
create table products (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  name text not null,
  category text,
  stock numeric default 0,
  min_stock numeric default 0,
  price numeric default 0,
  cost_price numeric default 0,
  supplier text,
  expiry_date date,
  batch_number text,
  notes text,
  deleted boolean default false,
  created_at timestamptz default now()
);

-- 5. Transações de Estoque
create table stock_transactions (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  product_id uuid references products(id),
  product_name text, -- Desnormalizado para facilitar histórico
  type text check (type in ('IN', 'OUT')),
  quantity numeric not null,
  date timestamptz default now(),
  notes text,
  created_by uuid references auth.users(id)
);

-- 6. Agendamentos (Consultas)
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  patient_id uuid references patients(id),
  patient_name text, -- Desnormalizado
  doctor_name text,
  date timestamptz not null,
  status text default 'Agendado',
  type text,
  room_number text,
  created_at timestamptz default now()
);

-- 7. Prontuário Clínico
create table clinical_records (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  patient_id uuid references patients(id),
  patient_name text,
  doctor_name text,
  content text,
  notes text,
  type text,
  created_at timestamptz default now()
);

-- 8. Marketing (Posts Sociais)
create table social_posts (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id) not null,
  title text,
  content text,
  platform text check (platform in ('instagram', 'facebook', 'linkedin')),
  status text check (status in ('draft', 'scheduled', 'published')),
  scheduled_at timestamptz,
  image_url text,
  created_at timestamptz default now()
);

-- 9. Solicitações de Acesso
create table access_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid references auth.users(id),
  requester_name text,
  clinic_id text, -- Pode não existir ainda se for solicitação para criar clínica? Assumindo que sim.
  clinic_name text,
  reason text,
  status text check (status in ('pending', 'approved', 'denied')),
  requested_role_id text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- RLS (Row Level Security) - Básico
alter table clinics enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table products enable row level security;
alter table stock_transactions enable row level security;
alter table appointments enable row level security;
alter table clinical_records enable row level security;
alter table social_posts enable row level security;

-- Policies básicas (Exemplo: Usuários veem dados da sua clínica)
-- Nota: A lógica complexa de IAM (hasAnyRole) deve ser portada para Postgres Functions
-- Para MVP/Migração inicial: permitir leitura autenticada
create policy "Authenticated users can view data" on clinics for select using (auth.role() = 'authenticated');
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);

-- Indices para performance
create index idx_products_clinic on products(clinic_id);
create index idx_appointments_clinic on appointments(clinic_id);
create index idx_patients_clinic on patients(clinic_id);
