# Bounaprax

> Gestión profesional para psicólogos y psicopedagogos — desde cualquier dispositivo.

**Bounaprax** es una aplicación web diseñada para que profesionales de la salud mental y la psicopedagogía gestionen su consulta de forma simple, ordenada y sin complicaciones. Sin planillas, sin cuadernos: toda la información de tu práctica en un solo lugar.

---

## ¿Qué te permite hacer?

### 📅 Agenda inteligente
Organizá tus turnos en vistas diaria, semanal y mensual. Programá sesiones únicas o repetí un turno semana a semana con un solo clic. Desde la propia agenda podés editar, cambiar el estado y enviar la confirmación directamente por WhatsApp al paciente.

### 📲 Confirmaciones por WhatsApp
Al agendar un turno, la app genera automáticamente un mensaje personalizado con el nombre del paciente, la fecha, el horario y el consultorio. Lo podés editar antes de enviarlo, y también reenviarlo desde el modal de cada sesión cuando lo necesités.

### 👤 Gestión de pacientes
Historia clínica completa: datos personales, diagnóstico, evolución, sesiones realizadas, pagos, documentos y tareas pendientes — todo organizado por paciente.

### ✅ Tareas por paciente
Anotá indicaciones, objetivos o recordatorios para cada paciente. Editalas o marcalas como completadas a medida que avanzás en el tratamiento.

### 💰 Contabilidad
Resumen de ingresos semanal y mensual. Filtrá por tipo de pago (efectivo, transferencia, tarjeta, obra social) y consultá el historial completo de cobros con fecha, paciente y consultorio.

### 🏢 Múltiples consultorios
Administrá distintas sedes de atención, cada una con su color identificador, y asociá cada sesión al espacio correspondiente.

---

## ¿Para quién es?

Para profesionales independientes — psicólogos, psicopedagogos, terapeutas — que atienden en uno o varios consultorios y quieren tener el control de su práctica sin depender de herramientas genéricas que no entienden su trabajo.

---

## Capturas de pantalla

> *Próximamente*

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 + React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| Deploy recomendado | Vercel + Supabase |

---

## Instalación

### Requisitos

- Node.js 18+
- Una cuenta en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/bounaprax.git
cd bounaprax

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar .env.local con tus credenciales de Supabase

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
│   └── (dashboard)/     # Inicio, pacientes, agenda, sesiones, contabilidad, consultorios
├── components/          # Componentes reutilizables (Sidebar, ThemeToggle, etc.)
├── lib/                 # Clientes de Supabase (browser / server)
└── types/               # Interfaces TypeScript
supabase-schema.sql      # Schema completo de la base de datos
```

---

## Base de datos

El archivo `supabase-schema.sql` contiene el schema completo con tablas, políticas de Row-Level Security y triggers. Cada profesional accede únicamente a sus propios datos.

**Tablas principales:** `pacientes` · `sesiones` · `pagos` · `consultorios` · `documentos` · `tests` · `paciente_tareas`

---

## Deploy

**Vercel + Supabase** es la combinación recomendada para producción:

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno en Vercel
3. Cada push a `master` despliega automáticamente

---

## Licencia

Uso privado — todos los derechos reservados.
