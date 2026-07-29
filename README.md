# ContractorOS

ContractorOS es un sistema operativo SaaS, mobile-first, para empresas de servicios como electricidad, HVAC, plomería, remodelación y construcción.

Su objetivo es centralizar clientes, jobs, quotes, invoices, gastos, purchase orders, empleados, calendario, archivos, reportes y configuración de la empresa en una sola aplicación.

## Estado actual

El proyecto está preparado para pruebas beta en Vercel. La compilación de producción y TypeScript pasan correctamente.

Incluye:

- Autenticación con Supabase y recuperación de contraseña.
- Empresas multi-tenant mediante `company_id`.
- Roles Owner, Manager y Employee.
- Clientes, jobs/projects, quotes, invoices, expenses y purchase orders.
- Supply Requests separados de los quotes del cliente.
- Dashboard con datos reales cuando Supabase está conectado.
- Calendar base, Reports, Notifications y Settings.
- Files & Photos usando Supabase Storage.
- Plan Estimator preparado sin inventar resultados de IA.
- Idiomas Español, English y Português.
- Tema claro, oscuro y automático.
- Diseño adaptado a móvil, notch/Dynamic Island de iPhone e iPad.

## Stack

- Next.js 15 App Router.
- React 19 y TypeScript.
- Tailwind CSS.
- Supabase Auth, PostgreSQL, Storage y RLS.
- Vercel para deployment.

## Ejecutar localmente

```bash
npm install
```

Crea `.env.local` desde `.env.example` y agrega:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Después:

```bash
npm run dev
npm run typecheck
npm run build
```

## Supabase

Ejecuta las migraciones en orden desde `supabase/migrations/` usando Supabase SQL Editor. La migración más reciente agrega invoices, contactos, asignaciones, calendario, actividad y control de horas.

Debe existir un bucket privado llamado `documents`.

Nunca pongas una service role key en el navegador ni en una variable que empiece con `NEXT_PUBLIC_`.

## Deployment en Vercel

El repositorio oficial es:

`https://github.com/ifitotech/contractoros`

La rama de producción es `main`. Cada push a `main` debe iniciar un deployment automático en Vercel.

Variables requeridas en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Configura en Supabase Authentication → URL Configuration:

```text
https://TU-DOMINIO.vercel.app/auth/callback
```

## Estructura

```text
src/app/(auth)/              Login, register, reset password
src/app/(dashboard)/         Dashboard y módulos principales
src/components/              UI, layout y componentes reutilizables
src/lib/services/             Lógica de negocio y consultas Supabase
src/lib/supabase/             Clientes browser/server
src/lib/i18n/                 Diccionarios y provider de idiomas
src/lib/theme/                Tema light/dark/system
supabase/migrations/          Esquema, relaciones y RLS
```

## Reglas para continuar el proyecto

- No eliminar funciones existentes sin autorización.
- Mantener separación entre Customer Quotes y Supply Requests.
- No inventar datos reales ni resultados de IA.
- No desactivar RLS para solucionar errores.
- Toda modificación de base de datos debe ser una migración nueva.
- Mantener diseño mobile-first y responsive para iPhone/iPad/escritorio.
- Ejecutar `npm run typecheck` y `npm run build` después de cambios importantes.

Consulta `PROJECT_CONTEXT.md` para contexto completo dirigido a desarrolladores y otras IAs.
