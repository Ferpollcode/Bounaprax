# Buonaprax — Plataforma de gestión para profesionales de la salud

> Gestión completa de pacientes, sesiones, pagos y consultorios desde cualquier dispositivo.

---

## ¿Qué es Buonaprax?

Buonaprax es una aplicación web pensada para profesionales de la salud que quieren dejar de lado las planillas, los cuadernos y el desorden. Centraliza historia clínica, agenda, pagos y documentos en un solo lugar, con acceso desde cualquier dispositivo.

---

## Funcionalidades

### 🧑‍⚕️ Pacientes
- Historia clínica digital completa
- Datos personales, DNI, obra social, número de afiliado
- Diagnóstico y motivo de consulta
- Estado del tratamiento: activo, inactivo, alta, derivado

### 📅 Agenda
- Vista semanal de todas las sesiones
- Organizada por consultorio y horario
- Indicador visual del día actual

### 📝 Sesiones
- Sesiones presenciales o virtuales
- Registro de evolución, tratamiento, objetivos y próximos pasos
- Estados: programada, realizada, cancelada, inasistencia

### 💰 Pagos
- Registro por sesión o independiente
- Tipos: efectivo, transferencia, tarjeta, obra social, otro
- Estados: pagado, pendiente, devuelto

### 📎 Documentos
- Adjuntar archivos al perfil del paciente
- Tipos: informe, foto, análisis, test, historia clínica, otro
- Almacenamiento privado con acceso seguro

### 🏥 Consultorios
- Gestión de múltiples consultorios
- Color personalizado por consultorio
- Un solo acceso para todos

### 📋 Notas, tareas y recordatorios
- Anotaciones rápidas sin salir de la plataforma

---

## Sistema de autenticación

### Login por nombre de usuario
Los usuarios **no se registran solos**. El administrador los crea desde el panel de Supabase. El login usa nombre de usuario (no email).

Internamente el sistema construye el email como:
```
{usuario}@bounaprax.com
```

### Primer acceso
Al ingresar por primera vez, el usuario es redirigido automáticamente a `/cambiar-contrasena` donde debe elegir su propia contraseña antes de acceder al sistema.

El flag que controla este comportamiento es `must_change_password` en `user_metadata`.

---

## Cómo crear un usuario nuevo

### Paso 1 — Crear en Supabase
Ir a **Authentication → Users → Add user → Create new user** con:
- **Email:** `nombreusuario@bounaprax.com`
- **Password:** contraseña temporal (la va a cambiar en el primer acceso)

### Paso 2 — Setear el flag de primer acceso
Ejecutar en el **SQL Editor** de Supabase:

```sql
-- Para un usuario específico
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb
WHERE email = 'nombreusuario@bounaprax.com';

-- Para todos los usuarios que no tengan el flag
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb
WHERE raw_user_meta_data->>'must_change_password' IS NULL
OR raw_user_meta_data->>'must_change_password' != 'true';
```

### Paso 3 — El usuario inicia sesión
El profesional ingresa con:
- **Usuario:** `nombreusuario` (sin el @bounaprax.com)
- **Contraseña:** la temporal que le diste

El sistema lo redirige a la pantalla de cambio de contraseña. Una vez que la cambia, accede al dashboard normalmente.

---

## Lógica del middleware

```
Sin sesión                           →  /login
Con sesión + must_change_password    →  /cambiar-contrasena  (bloqueado hasta cambiar)
Con sesión normal en /login          →  /inicio
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Layout con panel de branding pastel
│   │   ├── login/page.tsx                # Login por nombre de usuario
│   │   ├── cambiar-contrasena/page.tsx   # Primer acceso — cambio de contraseña
│   │   └── register/page.tsx             # Redirige a /login (no disponible)
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Layout con Sidebar
│   │   ├── inicio/page.tsx               # Bienvenida + agenda semanal
│   │   ├── pacientes/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Server component
│   │   │       ├── PatientDetailClient.tsx
│   │   │       ├── editar/page.tsx
│   │   │       ├── sesiones/nueva/page.tsx
│   │   │       └── pagos/nuevo/page.tsx
│   │   ├── agenda/page.tsx
│   │   └── consultorios/page.tsx
│   ├── page.tsx                          # Redirige a /pacientes
│   └── globals.css
├── components/
│   ├── layout/Sidebar.tsx
│   ├── Greeting.tsx                      # Saludo por hora (client component)
│   └── ui/                              # Componentes shadcn
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts                 # Auth guard + lógica de primer acceso
└── middleware.ts
```

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Correr el proyecto

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js (App Router) |
| Runtime | React 19 + TypeScript 5 |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Iconos | Lucide React |
| Fuentes | DM Sans + Playfair Display |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| SDK | @supabase/supabase-js + @supabase/ssr |

---

## Modelos de datos

### Paciente
```typescript
{
  id, professional_id, nombre, apellido, fecha_nacimiento, dni,
  email, telefono, obra_social, numero_afiliado,
  motivo_consulta, diagnostico,
  estado: 'activo' | 'inactivo' | 'alta' | 'derivado',
  consultorio_id, created_at, updated_at
}
```

### Sesión
```typescript
{
  id, paciente_id, professional_id, consultorio_id,
  fecha, hora_inicio, hora_fin,
  tipo: 'presencial' | 'virtual',
  estado: 'programada' | 'realizada' | 'cancelada' | 'inasistencia',
  observaciones, tratamiento, objetivo, evolucion, proximos_pasos,
  monto, pagado, created_at
}
```

### Pago
```typescript
{
  id, paciente_id, sesion_id, professional_id,
  fecha, monto, concepto,
  tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'obra_social' | 'otro',
  estado: 'pagado' | 'pendiente' | 'devuelto',
  created_at
}
```

### Consultorio
```typescript
{
  id, professional_id,
  nombre, direccion, ciudad, telefono,
  color: string,
  activo: boolean,
  created_at
}
```

---

## Planes comerciales

| | Gratuito | Personal | Pro |
|---|---|---|---|
| Precio | $0 · 15 días | $20.000/mes | $45.000/mes |
| Pacientes ilimitados | ✓ | ✓ | ✓ |
| Agenda y sesiones | ✓ | ✓ | ✓ |
| Pagos y documentos | ✓ | ✓ | ✓ |
| Multi-consultorio | ✓ | ✓ | ✓ |
| Reportes mensuales PDF | — | — | ✓ |
| Recordatorios automáticos | — | — | ✓ |
| Exportación historia clínica | — | — | ✓ |
| Sync Google Calendar | — | — | ✓ |
| Soporte | Normal | Normal | Prioritario |

---

## Seguridad

- **RLS activado:** cada profesional accede únicamente a sus propios datos (`professional_id = auth.uid()`)
- **Storage privado:** los documentos requieren URL firmada, no son públicos
- **Sin auto-registro:** los usuarios solo pueden ser creados por el administrador
- **Primer acceso forzado:** el sistema obliga a cambiar la contraseña antes del primer uso

---

## Deploy

**Vercel + Supabase** es la combinación recomendada:

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno en Vercel
3. Cada push a `master` despliega automáticamente

---

## Contacto

**Nahuel Ripoll** — nahuelripoll33@gmail.com

---

## Licencia

Uso privado — todos los derechos reservados.
