# Buonaprax — Plataforma de gestión para profesionales de la salud

> Gestión completa de pacientes, sesiones, pagos y consultorios desde cualquier dispositivo.

---

## ¿Qué es Buonaprax?

Buonaprax es una aplicación web pensada para profesionales de la salud que quieren dejar de lado las planillas, los cuadernos y el desorden. Centraliza historia clínica, agenda, pagos y documentos en un solo lugar, con acceso desde cualquier dispositivo.

---

## Funcionalidades

### 🧑‍⚕️ Pacientes
- Historia clínica digital completa
- Hoja de ruta editable por paciente para seguimiento sesión a sesión
- Vista previa de la hoja de ruta y editor en pantalla completa
- Datos personales, DNI, obra social, número de afiliado
- Diagnóstico y motivo de consulta
- Estado del tratamiento: activo, inactivo, alta, derivado

### 📅 Agenda
- Vista semanal de todas las sesiones
- Organizada por consultorio y horario
- Indicador visual del día actual

### 📝 Sesiones
- Sesiones presenciales o virtuales
- Registro de observaciones, honorarios y estado de cobro
- Posibilidad de agregar el resumen de una sesión a la hoja de ruta del paciente
- Eliminación de sesiones desde la ficha del paciente
- Estados: programada, realizada, cancelada, inasistencia

### 💰 Pagos
- Registro por sesión o independiente
- Asociación opcional de pagos con una sesión específica
- Sincronización del estado de cobro de la sesión cuando se registra un pago asociado
- Tipos: efectivo, transferencia, tarjeta, obra social, otro
- Estados: pagado, pendiente, devuelto

### 📎 Documentos
- Adjuntar archivos al perfil del paciente
- Actualización inmediata de la lista de documentos luego de subir un archivo
- Descarga segura mediante URLs firmadas
- Tipos: informe, foto, análisis, test, historia clínica, otro
- Almacenamiento privado con acceso seguro

### 🏥 Consultorios
- Gestión de múltiples consultorios
- Color personalizado por consultorio
- Un solo acceso para todos

### 📋 Notas, tareas y recordatorios
- Anotaciones rápidas sin salir de la plataforma

### 📊 Reportes *(Plan Pro)*
- Estadísticas mensuales: sesiones, asistencias, inasistencias
- Contabilidad: ingresos por tipo de pago, pagos asociados a sesiones y comparativa mensual

### 🧾 Exportaciones *(Plan Pro)*
- Hoja de ruta clínica en PDF por paciente
- Planilla de asistencias mensual en PDF
- Envío directo por WhatsApp

### 🎙️ Notas de voz *(Plan Pro)*
- Grabación de audio directamente en la sesión

---

## Sistema de planes

| Funcionalidad | Free | Pro |
|---|:---:|:---:|
| Pacientes ilimitados | ✓ | ✓ |
| Agenda y sesiones | ✓ | ✓ |
| Gestión de pagos | ✓ | ✓ |
| Documentos y archivos | ✓ | ✓ |
| Multi-consultorio | ✓ | ✓ |
| Reportes y estadísticas | — | ✓ |
| Hoja de ruta clínica PDF | — | ✓ |
| Planilla de asistencias PDF | — | ✓ |
| Envío por WhatsApp | — | ✓ |
| Notas de voz en sesiones | — | ✓ |
| Soporte prioritario | — | ✓ |

El plan se gestiona desde el panel `/admin` (requiere `is_admin = true` en el perfil).

---

## Sistema de autenticación

### Login por nombre de usuario
Los usuarios **no se registran solos**. El administrador los crea desde el panel `/admin` dentro de la misma app. El login usa nombre de usuario (sin dominio).

Internamente el sistema construye el email como:
```
{usuario}@bounaprax.com
```

### Primer acceso
Al ingresar por primera vez, el usuario es redirigido automáticamente a `/cambiar-contrasena` donde debe elegir su propia contraseña antes de acceder al sistema.

El flag que controla este comportamiento es `must_change_password` en `user_metadata`.

---

## Panel de administración

Accesible en `/admin` únicamente para usuarios con `is_admin = true` en la tabla `profiles`.

Permite:
- **Crear usuarios**: nombre, usuario (se convierte a `usuario@bounaprax.com`), contraseña temporal y plan inicial
- **Eliminar usuarios**: con confirmación
- **Cambiar plan**: toggle Free ↔ Pro directamente desde la tabla

Para marcar un usuario como admin, ejecutar en Supabase SQL Editor:
```sql
UPDATE profiles SET is_admin = true WHERE email = 'usuario@bounaprax.com';
```

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
│   │   └── cambiar-contrasena/page.tsx   # Primer acceso — cambio de contraseña
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Layout con Sidebar (pasa isPro, isAdmin)
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
│   │   ├── reportes/
│   │   │   ├── page.tsx                  # Server component (fetch isPro)
│   │   │   └── ReportesClient.tsx        # Tabs: Estadísticas + Contabilidad
│   │   ├── contabilidad/page.tsx         # Redirige a /reportes
│   │   ├── consultorios/page.tsx
│   │   └── admin/
│   │       ├── page.tsx                  # Server component (requiere is_admin)
│   │       ├── AdminClient.tsx           # Tabla de usuarios + modales
│   │       └── actions.ts                # Server actions: createUser, deleteUser
│   ├── page.tsx                          # Redirige a /inicio
│   └── globals.css
├── components/
│   ├── layout/Sidebar.tsx                # Navegación (badge PRO, sección Admin)
│   ├── Greeting.tsx                      # Saludo por hora (client component)
│   └── ui/                              # Componentes shadcn
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts                 # Auth guard + lógica de primer acceso
├── types/index.ts
└── middleware.ts
```

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key   # requerida para el panel admin
TZ=America/Argentina/Buenos_Aires
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
  motivo_consulta, diagnostico, hoja_ruta,
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
  categoria,
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

| | Gratuito | Pro |
|---|---|---|
| Precio | $0 · 15 días de prueba | $20.000/mes |
| Pacientes ilimitados | ✓ | ✓ |
| Agenda y sesiones | ✓ | ✓ |
| Pagos y documentos | ✓ | ✓ |
| Multi-consultorio | ✓ | ✓ |
| Reportes y estadísticas | — | ✓ |
| Hoja de ruta clínica PDF | — | ✓ |
| Planilla de asistencias PDF | — | ✓ |
| Envío por WhatsApp | — | ✓ |
| Notas de voz en sesiones | — | ✓ |
| Soporte | Normal | Prioritario |

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
