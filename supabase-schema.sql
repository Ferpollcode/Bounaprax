-- Bounaprax - Schema Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- CONSULTORIOS
create table consultorios (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  direccion text,
  ciudad text,
  telefono text,
  color text default '#6366f1',
  activo boolean default true,
  created_at timestamptz default now()
);

-- PACIENTES
create table pacientes (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date,
  dni text,
  email text,
  telefono text,
  obra_social text,
  numero_afiliado text,
  motivo_consulta text,
  diagnostico text,
  estado text default 'activo' check (estado in ('activo','inactivo','alta','derivado')),
  consultorio_id uuid references consultorios(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SESIONES
create table sesiones (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  consultorio_id uuid references consultorios(id) on delete set null,
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  tipo text default 'presencial' check (tipo in ('presencial','virtual')),
  estado text default 'programada' check (estado in ('programada','realizada','cancelada','inasistencia')),
  observaciones text,
  tratamiento text,
  objetivo text,
  evolucion text,
  proximos_pasos text,
  monto numeric(10,2),
  pagado boolean default false,
  created_at timestamptz default now()
);

-- PAGOS
create table pagos (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  sesion_id uuid references sesiones(id) on delete set null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  fecha date not null default current_date,
  monto numeric(10,2) not null,
  tipo text default 'efectivo' check (tipo in ('efectivo','transferencia','tarjeta','obra_social','otro')),
  concepto text,
  estado text default 'pagado' check (estado in ('pagado','pendiente','devuelto')),
  created_at timestamptz default now()
);

-- DOCUMENTOS
create table documentos (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  tipo text default 'otro' check (tipo in ('informe','foto','analisis','test','historia_clinica','otro')),
  descripcion text,
  archivo_url text not null,
  archivo_nombre text not null,
  archivo_tipo text not null,
  archivo_tamanio integer,
  created_at timestamptz default now()
);

-- TESTS
create table tests (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  sesion_id uuid references sesiones(id) on delete set null,
  nombre text not null,
  fecha date not null default current_date,
  resultado text,
  observaciones text,
  archivo_url text,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (cada profesional solo ve sus datos)
alter table consultorios enable row level security;
alter table pacientes enable row level security;
alter table sesiones enable row level security;
alter table pagos enable row level security;
alter table documentos enable row level security;
alter table tests enable row level security;

-- Políticas RLS
create policy "Profesional ve sus consultorios" on consultorios for all using (auth.uid() = professional_id);
create policy "Profesional ve sus pacientes" on pacientes for all using (auth.uid() = professional_id);
create policy "Profesional ve sus sesiones" on sesiones for all using (auth.uid() = professional_id);
create policy "Profesional ve sus pagos" on pagos for all using (auth.uid() = professional_id);
create policy "Profesional ve sus documentos" on documentos for all using (auth.uid() = professional_id);
create policy "Profesional ve sus tests" on tests for all using (auth.uid() = professional_id);

-- Storage bucket para documentos
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false);
create policy "Profesional sube documentos" on storage.objects for insert with check (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Profesional ve documentos" on storage.objects for select using (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Profesional borra documentos" on storage.objects for delete using (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);

-- NOTAS POR PACIENTE
create table paciente_notas (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  contenido text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table paciente_notas enable row level security;
create policy "Profesional ve sus notas" on paciente_notas for all using (auth.uid() = professional_id);

-- TAREAS POR PACIENTE
create table paciente_tareas (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references pacientes(id) on delete cascade not null,
  professional_id uuid references auth.users(id) on delete cascade not null,
  texto text not null,
  completada boolean default false,
  created_at timestamptz default now()
);
alter table paciente_tareas enable row level security;
create policy "Profesional ve sus tareas" on paciente_tareas for all using (auth.uid() = professional_id);

-- RECORDATORIOS
create table recordatorios (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references auth.users(id) on delete cascade not null,
  paciente_id uuid references pacientes(id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha_recordatorio timestamptz,
  completado boolean default false,
  prioridad text default 'normal' check (prioridad in ('baja','normal','alta')),
  created_at timestamptz default now()
);
alter table recordatorios enable row level security;
create policy "Profesional ve sus recordatorios" on recordatorios for all using (auth.uid() = professional_id);

-- Trigger updated_at en pacientes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pacientes_updated_at before update on pacientes
  for each row execute function update_updated_at();

-- PLANES Y ACCESO
-- Ejecutar también en proyectos existentes para que Admin pueda aplicar:
-- Free por 15 días y Optimiza por tiempo ilimitado.
alter table profiles
  add column if not exists access_expires_at timestamptz;

create or replace function admin_get_users()
returns table (
  id uuid,
  email text,
  plan text,
  access_expires_at timestamptz,
  is_admin boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    coalesce(p.email, u.email)::text as email,
    coalesce(p.plan, 'free')::text as plan,
    p.access_expires_at,
    coalesce(p.is_admin, false) as is_admin,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
$$;

grant execute on function admin_get_users() to authenticated;

-- FEEDBACK DE USUARIOS
-- Ejecutar en proyectos existentes para que los usuarios puedan enviar
-- recomendaciones y el Admin pueda verlas desde la sección Usuarios.
create table if not exists feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text not null check (char_length(message) between 5 and 2000),
  created_at timestamptz default now()
);

alter table feedback enable row level security;

drop policy if exists "Usuarios envian feedback" on feedback;
create policy "Usuarios envian feedback" on feedback
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admin ve feedback" on feedback;
create policy "Admin ve feedback" on feedback
  for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
