# HealthPro — Gestión de Pacientes para Profesionales de la Salud

Plataforma web para que profesionales de la salud gestionen su consultorio de forma digital: pacientes, sesiones, pagos y documentos, desde cualquier dispositivo.

---

## Características

- **Pacientes** — Historia clínica completa, datos de contacto, obra social, estado (activo, inactivo, alta, derivado)
- **Sesiones** — Registro de encuentros presenciales y virtuales, notas clínicas, evolución, próximos pasos
- **Pagos** — Control de ingresos por período, múltiples métodos de pago, estado de cobro por sesión
- **Documentos** — Carga de archivos médicos (informes, análisis, fotos, tests) con drag & drop
- **Consultorios** — Soporte multi-consultorio con colores personalizados
- **Agenda** — Vista de calendario de sesiones
- **Seguridad** — Cada profesional solo ve sus propios datos (Row-Level Security en Supabase)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 + React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| Deploy recomendado | Vercel + Supabase Pro |

---

## Requisitos

- Node.js 18+
- Una cuenta en [Supabase](https://supabase.com)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/healthpro-app.git
cd healthpro-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Inicializar la base de datos
# Ejecutar supabase-schema.sql en el SQL Editor de tu proyecto Supabase

# 5. Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Estas claves se encuentran en **Supabase → Project Settings → API**.

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm start        # Servidor de producción
npm run lint     # Linter
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login y registro
│   └── (dashboard)/     # Pacientes, sesiones, pagos, agenda, consultorios
├── components/          # Componentes reutilizables
├── lib/                 # Clientes de Supabase (browser / server)
└── types/               # Interfaces TypeScript
supabase-schema.sql      # Schema completo de la base de datos
```

---

## Base de datos

El archivo `supabase-schema.sql` contiene el schema completo con todas las tablas, políticas de Row-Level Security y triggers necesarios para inicializar el proyecto desde cero.

**Tablas principales:** `pacientes`, `sesiones`, `pagos`, `documentos`, `tests`, `consultorios`

---

## Deploy

**Vercel + Supabase Pro** es la combinación recomendada para producción:

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno en Vercel
3. Cada push a `master` despliega automáticamente

---

## Licencia

Uso privado — todos los derechos reservados.
