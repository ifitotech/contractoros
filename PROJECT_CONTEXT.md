# ContractorOS — Contexto para desarrolladores e IAs

## Objetivo del producto

ContractorOS ayuda al dueño de una empresa de servicios a operar el negocio completo: captar clientes, organizar jobs, preparar quotes, pedir precios a suppliers, facturar, registrar gastos, controlar purchase orders, asignar empleados, guardar archivos y revisar reportes.

La prioridad es que una persona trabajando desde el teléfono pueda hacer las tareas principales rápidamente.

## Conceptos importantes

### Customer Quote

Es el presupuesto que la empresa envía a su cliente. Puede incluir labor, materiales, tax, discount, overhead, profit, términos y expiración.

### Supply Request

Es una solicitud separada para pedir precio y disponibilidad a un supply house. Puede contener supplier, part number, descripción y cantidades. Nunca debe mezclarse conceptualmente con el quote enviado al cliente.

### Job / Project

Es el trabajo operativo del cliente. Contiene cliente, dirección, descripción, estado, fechas, presupuesto, gastos, materiales, empleados y actividad.

### Owner / Manager / Employee

- Owner: administra empresa, usuarios, roles, planes y configuración.
- Manager: puede operar jobs, quotes y revisar operaciones según permisos.
- Employee: debe ver solo la información necesaria para realizar su trabajo.

## Fases

- Fase 1: Auth y empresa — núcleo completado.
- Fase 2: Dashboard — métricas reales y estados vacíos.
- Fase 3: Clientes — CRUD, búsqueda, archivo, detalle y relaciones.
- Fase 4: Jobs/Projects — creación, estados, finanzas y edición base.
- Fase 5: Calendar — vistas base y jobs con fecha.
- Fase 6: Quotes — creación, partidas, estados, PDF y relaciones.
- Fase 7: Invoices — creación, partidas, balance y pagos manuales.
- Fase 8: Employees — invitaciones, roles, activación y time entries base.
- Fase 9: Expenses/POs — datos reales, filtros y regla de documentos.
- Fase 10: Plan Estimator — subida, historial y estados; IA todavía no conectada.
- Fase 11: Files/Photos — Storage seguro y uploads.
- Fase 12: Notifications — datos reales, unread/read y enlaces.
- Fase 13: Reports — métricas reales y exportación CSV.
- Fase 14: Settings — empresa, idioma, tema, defaults, plan y upgrade preparado.

## Pendientes externos

- Conectar proveedor de IA para analizar planos. No agregar resultados ficticios.
- Configurar Stripe cuando se autorice facturación real.
- Configurar Google OAuth si se desea login con Google.
- Configurar emails profesionales/SMTP para invitaciones y notificaciones.
- Añadir firma electrónica real.
- Ejecutar y verificar todas las migraciones en el proyecto Supabase correcto.

## Comandos de verificación

```bash
npm run typecheck
npm run build
npm run dev
```

## Variables

Solo son obligatorias para la app:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

No exponer nunca secrets, service role keys o API keys de proveedores en el cliente.

## Instrucción para otra IA

Antes de modificar ContractorOS, leer `README.md`, este archivo y las migraciones Supabase. Preservar la interfaz existente, comprobar rutas relacionadas, crear migraciones nuevas para cambios de DB y ejecutar typecheck/build antes de entregar.
