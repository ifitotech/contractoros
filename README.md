# ContractorOS

Sistema operativo para empresas de servicios (electricistas, HVAC, plomeros, construcción, etc.).

## Stack
- Next.js 15 + TypeScript
- Tailwind CSS (mobile-first)
- Supabase (Auth, DB, Storage, RLS) — listo para conectar
- i18n ES / EN (extensible)

## Arranque

```bash
npm install
cp .env.example .env.local
# Ver SETUP.md para conectar Supabase
npm run dev
```

## Qué incluye

### Producto
- Multi-tenant SaaS (company_id)
- Roles: Owner / Manager / Employee
- Planes Free / Pro / Ultra + límites
- Clientes, Proyectos, Quotes, Gastos, Purchase Orders
- Flujo PO: documento obligatorio + excepciones
- Empleados, Reportes, Notificaciones, Configuración
- PDF template de Quotes
- PWA manifest

### i18n
- Español e English en todas las pantallas operativas
- Selector en Login, Más y Configuración
- Preferencia en localStorage
- Preparado para más idiomas (ver `src/lib/i18n/`)

### Código
- 12 servicios de negocio
- Server Actions (auth + CRUD)
- 2 migraciones SQL (schema + RLS)
- Componentes UI reutilizables
- Middleware de autenticación

## Conectar Supabase

Ver **SETUP.md** (~15 minutos).

## Estructura

```
src/
  app/(auth)/          Login, Register
  app/(dashboard)/     Todas las pantallas de la app
  components/          UI + layout + shared
  lib/
    i18n/              Diccionarios ES/EN + provider
    services/          Lógica de negocio
    supabase/          Clients
  types/               TypeScript domain types
supabase/migrations/   Schema + RLS
```
