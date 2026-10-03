# BidPower — Guía de conexión

## 1. Supabase

1. Crea un proyecto en https://supabase.com
2. Atajo para un proyecto nuevo: pega `supabase/apply_all_migrations.sql` completo en SQL Editor y ejecútalo una vez.
   O bien, SQL Editor → ejecuta **todas** las migraciones de `supabase/migrations/` en orden de nombre
   (de `20260728000000_initial_schema.sql` a `20260814000024_feedback.sql`).
   La última crea la función `create_company_with_owner`, necesaria para que el registro
   cree empresa, owner, settings, plan Free y categorías de forma segura con RLS activo.
3. Storage → New bucket:
   - Nombre: `documents`
   - Public: **No**
4. Authentication → Providers → Email habilitado

## 2. Variables de entorno

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:3000/register y crea la primera empresa.

## 4. Qué queda por cablear en UI (ya hay servicios)

| Formulario | Server Action / Service |
|------------|-------------------------|
| Register / Login | `(auth)/actions.ts` ✅ |
| Nuevo Cliente | `createClientAction` ✅ |
| Nuevo Proyecto | `createProjectAction` ✅ |
| Nuevo Gasto | `createExpenseAction` ✅ |
| Nuevo PO | `createPOAction` ✅ |
| Nuevo Quote | `createQuote` service (falta action wrapper) |
| Subir documento PO | `uploadDocument` service |
| Invitar empleado | `inviteEmployee` service |

## 5. Checklist post-conexión

- [ ] Registro crea empresa + categorías + plan Free
- [ ] Login redirige a dashboard
- [ ] Dashboard muestra métricas reales
- [ ] Crear cliente / proyecto / gasto / PO
- [ ] PO no completa sin documento
- [ ] Límites Free bloquean creación
- [ ] PDF de quote en `/api/quotes/[id]/pdf`
- [ ] Bucket documents acepta uploads

## 6. Deploy (Vercel)

1. Push a GitHub
2. Import en Vercel
3. Añadir env vars
4. Deploy

## 7. Equipo y permisos (Fase 2)

- Invitar: Owner → Empleados → Invitar. Se genera un enlace seguro de un solo uso (vence en 7 días, se muestra una vez).
  Compártelo (p. ej. por WhatsApp); la persona crea su cuenta o inicia sesión con **ese mismo email** y acepta.
  No se envía email desde la app (no hay proveedor de correo configurado).
- Los empleados solo ven proyectos asignados; sin "ver costos" no reciben montos; sin "ver ganancia" no reciben ganancia.
- Límite de PO: por encima del límite el PO no se puede crear (el Owner lo crea). El flujo de aprobación llega en Compras (Fase 5).
- Una persona con cuenta en dos empresas ve la primera a la que se unió (no hay selector de empresa todavía).

## 8. Prueba de humo (Fases 1 y 2)

`scripts/smoke-phase1-2.js` recorre en un navegador real: registro, empresa, proyecto, refresco, logout/login,
aislamiento entre empresas, invitación, permisos, asignación y desactivación (21 comprobaciones).

```bash
BASE_URL=https://TU-APP.vercel.app node scripts/smoke-phase1-2.js
```

Requiere Playwright + Chromium y "Confirm email" desactivado en Supabase Auth. Crea usuarios `@bidpower-smoke.test`;
las instrucciones para borrarlos están en la cabecera del script.

## 9. Materiales (Fase 3)

- **Biblioteca** (`/materials`): ítems de uso frecuente con unidad, categoría, apodos de campo (romex, mud ring…) y favoritos. La gestiona quien tenga el permiso *Gestionar biblioteca* (Owner y Manager por plantilla).
- **Pedido de material** (`Proyecto → Pedidos de material`): buscar en favoritos/recientes/apodos, agregar texto libre, pegar una lista (WhatsApp/correo/Excel) o usar una lista guardada. Requiere el permiso *Pedir material* y un proyecto visible para la persona.
- Owner/Manager revisan en `/materials/requests` (también aparece en Inicio → "Necesita atención"). Un pedido es distinto de una Solicitud a proveedores: no envía nada a nadie ni genera precios.
- Migración nueva: `20260802000011_phase3_materials.sql` (ya incluida en `apply_all_migrations.sql`).

## 10. Supplier Pricing (Fase 4, primera parte)

- **Pricing Request** (`/pricing`): se crea desde un pedido de material revisado (las líneas se copian, no se reescriben) o pegando líneas. Tipo Gear/Lighting/Material/Otro, Bid Date, notas/specs, links y archivos (PDF/imagen, máx. 10 MB). Requiere el permiso *Crear Pricing Request*.
- **Envío**: no se envían correos (no hay proveedor de correo). Crea un enlace seguro por supplier y compártelo tú (WhatsApp/correo), o copia el texto y márcalo "enviado".
- **Respuesta del supplier**: Owner/Manager registran precio, disponibilidad y lead time por línea, número y total del quote, y el PDF. La comparación resalta el mejor precio por línea. "Adjudicar" marca la respuesta ganadora; el PO llega en la Fase 5.
- **Precios privados**: solo Owner/Manager, o quien tenga *Crear Pricing Request* **y** *Ver costos*, ve respuestas y PDFs de precios.
- Migraciones nuevas: `20260803000012_phase4_supplier_pricing.sql` y `20260803000013_pricing_attachment_visibility.sql`.

### Enlace seguro para el supplier (sin cuenta)

- En el Pricing Request → *Enlaces para suppliers* → *Crear enlace seguro*. Se muestra **una sola vez** (solo se guarda su hash), vence en 14 días por defecto y se puede revocar.
- El supplier abre `/supplier/<token>`: ve las líneas, Bid Date, notas y links; responde con precio/disponibilidad/lead time por línea, quote number, total, flete e impuesto (puede corregir mientras esté abierto); y puede hacer preguntas. **No** ve proyecto, cliente, otros suppliers ni lo que cobras.
- Una pregunta pone el Pricing Request en *Pregunta abierta* (espera al Owner); al responderla vuelve a esperar al supplier. Una respuesta lo pasa a *Respondió*.
- Límites de esta versión: el supplier no sube el PDF él mismo (súbelo tú en su respuesta) ni ve archivos subidos, solo links; no hay límite de intentos por IP (el token tiene 256 bits); no hay avisos por correo.
- Migración: `20260804000014_phase4_supplier_link.sql`.

## 11. Compras / Purchase Orders (Fase 5)

- **Desde una respuesta de supplier**: en el Pricing Request, botón *Crear Purchase Order* en la respuesta elegida. El PO copia las líneas con precio y disponibles (no las no disponibles), guarda el origen (línea del pedido y del catálogo) y usa el total del quote (o líneas + flete + impuesto). Un PO por respuesta.
- **Compra rápida** (`/pos/new`): sigue igual (se compra y el recibo llega después).
- **Aprobación**: dentro de tu límite el PO queda aprobado; por encima queda *Por aprobar* (espera al Owner/Manager, aparece en Inicio) en vez de bloquearse. Solo Owner/Manager aprueban o rechazan; nadie aprueba su propio PO. Tras aprobarse, solo Owner/Manager cambian monto o proveedor.
- **Flujo**: por aprobar → aprobado → enviado (permiso *Enviar PO*; no se envía correo, se marca cuando lo compartes) → recibido → documento → completado. Estas reglas viven en la base de datos (`trg_enforce_po_rules`), no solo en la pantalla.
- **Documento obligatorio**: recibo, invoice o packing slip (PDF/imagen, 10 MB). Sin documento no se puede completar.
- **Costo real**: al completar (`complete_purchase_order`) se registra el costo real como gasto del proyecto (un solo gasto por PO). Owner/Manager completan cualquier PO; quien lo creó, solo si el costo real está dentro de su límite.
- **Privacidad**: los documentos de un PO solo los ve quien puede ver ese PO.
- Pendiente en esta fase: flujo de *excepción* sin documento (el estado existe pero no hay pantalla), correo al supplier y recepción parcial por línea.
- Migración: `20260805000015_phase5_purchasing.sql`.

## 12. Cliente: Proposal, aprobación y Change Orders (Fase 6)

- **Proposal** = el quote al cliente que ya existía (sigue separado de los pedidos a suppliers). En el detalle: *Enlaces para el cliente* → crear enlace. Crear el primer enlace de un borrador es "enviar": pasa a *Enviado* y espera al cliente. El enlace se muestra **una sola vez** (solo se guarda su hash), vence en 30 días y se puede revocar. No se envía correo: lo compartes tú (WhatsApp/correo).
- **El cliente** abre `/customer/<token>` sin cuenta: ve su Proposal (líneas, total, términos, contacto de la empresa) y puede **aprobar**, **pedir cambios** o **rechazar**. Al aprobar se guardan su nombre, fecha/hora e IP (según la reporta el servidor de la app). **No es una firma manuscrita** y así se le indica. No ve costos, suppliers, POs ni ganancia.
- **Al aprobarse**: la Proposal queda *Aprobada*; si el proyecto no tenía valor de contrato, se toma el total aprobado, y un proyecto en *lead/quoted* pasa a *aprobado*.
- **Una Proposal enviada no se edita**: para cambiarla, *Nueva versión* (copia las líneas, la anterior queda *Reemplazada* y sus enlaces dejan de funcionar; mismo número, versión 2, 3…). Esto lo impone la base de datos.
- **Pedir cambios**: antes de aprobar, la Proposal pasa a *Cambios pedidos* (espera al Owner) y se crea un **Change Request**; después de aprobada, el Change Request queda abierto sin cambiar la Proposal. Sale en Inicio → "Clientes pidieron cambios".
- **Change Order**: desde un Change Request (o nuevo) en una Proposal aprobada; líneas con precio (negativo = crédito). Se envía al cliente con su propio enlace; al aprobarse, la diferencia se suma al valor del contrato del proyecto (una sola vez).
- **Decisión manual**: si el cliente respondió fuera de la app, se puede registrar (queda marcado como manual).
- Pendiente: PDF/versión imprimible para el cliente en el enlace, avisos por correo y un límite de intentos por IP.
- Migración: `20260806000016_phase6_customer.sql`.

## 13. Control del proyecto y Needs Attention (Fase 7)

- **Una sola fuente de números** (vista `project_cost_summary`, calculada al momento, nada duplicado):
  - **Costo real** = gastos aprobados/reembolsados (los borradores, rechazados y cancelados no cuentan). Un PO completado ya es un gasto, así que no se cuenta dos veces.
  - **Comprometido** = POs aprobados que aún no se completan (enviado, recibido, esperando documento…). Los POs *por aprobar* se muestran aparte y **no** se comprometen.
  - **Costo proyectado** = real + comprometido. **Ganancia estimada** = valor del contrato − costo proyectado; es una estimación hasta que se completen los POs.
  - El **valor del contrato** sube solo con lo que el cliente aprobó (Proposal y Change Orders).
- En cada proyecto: panel de control (solo con permiso de *ver costos*; la ganancia solo con *ver ganancia*), **Esperando a** (todo lo pendiente agrupado por Owner / Empleado / Supplier / Cliente, con enlace) y **Actividad** (línea de tiempo armada con registros reales, sin montos; `project_timeline`).
- **Needs Attention** en Inicio, según el rol: Owner/Manager ven pedidos por revisar, suppliers que respondieron o preguntaron, Bid Dates de hoy/mañana/vencidos, POs por aprobar o sin recibo, clientes que pidieron cambios, Proposals por vencer y proyectos sobre presupuesto; el Empleado ve lo que le devolvieron y los POs suyos sin documento.
- Ambas vistas usan `security_invoker`: cada persona ve solo lo que ya podía ver por RLS.
- `/reports` ahora es solo para Owner/Manager y cuenta solo gastos reales.
- Migración: `20260807000017_phase7_project_control.sql`.

## 14. Takeoff eléctrico manual (Fase 8) — todo PRELIMINAR

- **No hay IA ni análisis automático de planos, y no se inventa ninguna cantidad.** Lo que existe es una herramienta para que tú cuentes y midas y BidPower sume. (La pantalla vieja "Plan Estimator" era una maqueta que solo guardaba un nombre de archivo; ahora explica esto y lleva a los proyectos.)
- En cada proyecto → *Takeoffs* (Owner/Manager, o con permiso *Crear Pricing Request*): subir planos como referencia (PDF/imagen, 25 MB), **conteos** por tipo (luminarias, dispositivos, gear, otros), **paneles con circuitos** (breaker A y polos) y **feeders** con longitud, calibre y conduit.
- **Lista preliminar de materiales** = suma de lo ingresado: conteos iguales se suman; breakers por amperaje y polos (más el main de cada panel: 2 polos monofásico, 3 polos trifásico); un panel por panel; cable = longitud × conductores, tierra y conduit = longitud, todos con un **desperdicio % editable** (supuesto por defecto 10 %, visible). Cada línea muestra su base. No se estiman cable/conduit de circuitos ramales, cajas ni accesorios (se avisa en pantalla).
- **Verificación**: solo Owner/Manager marcan *Verificado* (queda quién y cuándo). Cualquier cambio a los números lo devuelve a *Sin verificar*; esto lo impone la base de datos.
- **Envío**: *Enviar como pedido de material* crea un Material Request (líneas de texto, nota PRELIMINAR) que sigue el flujo normal → Pricing Request → PO. Nunca lleva precios.
- Pendiente: editar filas en su lugar (hoy se borra y se agrega), lectura asistida de planos (requiere proveedor de IA y verificación humana), exportar CSV/PDF.
- Migración: `20260808000018_phase8_electrical_takeoff.sql`.

## 15. Gastos, Proposals reales y prueba de extremo a extremo local

- **Gastos** (`/expenses/new`): ahora son reales (proyecto, categoría de la empresa, monto, fecha, recibo). Antes la pantalla era una maqueta que no guardaba nada. El gasto de un Empleado queda **por aprobar** y **no cuenta** como costo real hasta que el Owner/Manager lo aprueba (regla en la base de datos, `20260809000019_expense_review_rules.sql`); los de Owner/Manager entran aprobados. Aparece en Inicio → Needs Attention.
- **Proposals** (`/quotes`, `/quotes/new`): la lista y el formulario usaban datos de ejemplo (clientes "Juan Rivera"…) y no podían crear una Proposal real; ahora usan clientes y proyectos reales. "Supply & Purchase" ya no se mezcla con los quotes al cliente.
- **Editar cliente** cargaba valores de ejemplo (habría sobrescrito datos reales); ahora parte del cliente guardado.
- **Prueba local completa**: `scripts/e2e/` levanta Postgres + PostgREST real + las migraciones y ejecuta las fases 1–8 en un navegador (`up.sh`, `app.sh`, `flows.js`; ver su README). Encontró y corrigió, entre otros, la barra "Enviar pedido" tapada por la navegación móvil. No sustituye la prueba con el proyecto Supabase real.

## 16. Cuentas Supply (Fase 9)

- Un supply house se registra con su propio tipo de cuenta (`companies.kind = 'supply'`) y ve solo su bandeja `/supply`: solicitudes de precio, contratistas conectados y sus cotizaciones. Nunca ve el nombre del proyecto.
- El contratista y el supply se conectan con un **código de un solo uso** (Suppliers → conectar). Al revocar, la bandeja del supply queda vacía y las solicitudes ya enviadas se conservan.
- Las respuestas por cuenta y por enlace comparten la misma lógica en la base de datos, así que el contratista las compara igual.
- Migración: `20260810000020_phase9_supply_premium.sql`.

## 17. Exportación contable / QuickBooks (Fase 10)

- BidPower **no es software de contabilidad**: exporta datos operativos para importarlos en QuickBooks u otro sistema.
- Pantalla `/accounting` (solo Owner, o Manager con permiso de ver costos; lo decide la función `can_export_accounting` en la base de datos). Datasets: clientes, proveedores, proyectos, gastos (solo aprobados y reembolsados), órdenes de compra, facturas y costos por proyecto, en CSV o JSON; "Todo" solo en JSON. Filtros por fechas y proyecto.
- El CSV usa BOM UTF-8 y saltos CRLF, y neutraliza fórmulas de hoja de cálculo. Los ids son estables.
- Cada descarga queda en `accounting_export_log` (quién, cuándo, filtros, filas). Si la bitácora no se puede escribir, no se entrega el archivo.
- `external_refs` queda lista para guardar el id de cada registro en QuickBooks, pero está vacía.
- **Lo que NO existe:** la sincronización en vivo con QuickBooks. Necesita credenciales de una app de desarrollador de Intuit (OAuth); esas credenciales solo se cargan en las variables de entorno del despliegue, nunca en el chat ni con prefijo `NEXT_PUBLIC_`.
- Migración: `20260811000021_phase10_accounting_export.sql`. Prueba: `node scripts/e2e/flows.js 10`.

## 18. Idiomas (ES / EN / PT)

- Todo el texto visible sale de `src/lib/i18n/dictionaries/{es,en,pt}.ts`. Las acciones del servidor devuelven códigos (`errorCode`), no mensajes: el cliente los traduce. Nunca se muestra un mensaje crudo de la base de datos.
- El idioma se guarda en `localStorage` **y** en una cookie (`bidpower-locale`); el servidor la lee (o el `Accept-Language`) para que el primer render ya esté en el idioma correcto, sin parpadeo.
- Las categorías de gasto del sistema se guardan en español en la base; la pantalla las muestra traducidas (`src/lib/category-label.ts`). Las categorías que crea la empresa se muestran tal como se escribieron.
- El PDF/HTML de un Quote respeta el idioma (`?lang=`) y escapa todo el contenido.
- Auditoría: `AUDIT_EMAIL=<usuario del e2e> node scripts/e2e/i18n-audit.js` recorre las pantallas en los 3 idiomas y marca texto de otro idioma. El vocabulario de producto (Owner, Manager, Quote, PO, Bid Date…) se mantiene en inglés a propósito en español.
- Limpieza de pantallas que eran maquetas: Configuración (ya carga los datos reales de la empresa y del perfil; antes tenía valores de ejemplo que se habrían guardado encima de los reales), Categorías de gasto (ahora se guardan de verdad), Calendario (mes real), Facturas (cliente elegido de una lista), Archivos. Se quitaron los interruptores de notificaciones, el contador "0 análisis" y el botón de firma, que no hacían nada.

## 19. Cuentas de prueba (sin correos reales y sin puertas traseras)

- No existe ni existirá un "bypass" de login dentro de la app: en un sistema multiempresa sería una puerta abierta a los datos de todos.
- Para revisar la app sin registrar correos reales: `scripts/seed-test-users.js` crea cuentas ya confirmadas (`owner@prueba.test`, `supply@prueba.test`) con la API de administración de Supabase. Se ejecuta en tu máquina con `SUPABASE_SERVICE_ROLE_KEY` en el entorno (nunca en el chat ni con prefijo `NEXT_PUBLIC_`) y `--yes`. La empresa se crea sola en el primer login.
- Manager y Employee se invitan desde el Owner (Empleados → Invitar), como en producción.
- Alternativa sin script: desactiva "Confirm email" en Supabase y regístrate en `/register` con correos inventados.

## 20. Logística de compras y precios reales

- **Entrega esperada** en cada PO (`20260812000022`): se fija al marcar como enviado o después. Aparece atrasada / hoy / mañana en la lista, el detalle y en Inicio → Necesita atención.
- **Recepción parcial** (`20260813000023`): se registra cuánto llegó de cada línea (`received_quantity`). El estado del PO no cambia; "Marcar como recibido" sigue siendo la decisión que cierra la entrega. Una regla en la base impide cambiar cualquier otro dato de la línea y recibir más de lo pedido.
- **Historial de precios** por material (Biblioteca de materiales → editar): solo con datos reales, líneas de POs y cotizaciones de suppliers, y solo para quien puede ver costos. Un material sin historial lo dice.
- La ganancia estimada de Reportes usa el pronóstico (real + comprometido), igual que la pantalla del proyecto.

## 21. Listo para las primeras entrevistas

- **Primeros pasos reales** en Inicio (solo Owner): cada paso se marca cuando el registro existe de verdad (cliente, proyecto, Quote, gasto, invitación). La tarjeta desaparece al completar todo.
- **Enviar comentarios** (Más → Enviar comentarios): guarda en la tabla `feedback` (`20260814000024`). Cada persona ve solo los suyos; el equipo los lee en Supabase → Table Editor.
- **Guía de entrevistas:** `docs/INTERVIEW_GUIDE.md` (tareas por rol, qué observar, preguntas finales).
- No hay datos de ejemplo: lo que se ve es lo que se crea.

## 22. Conexión real: Vercel y Supabase

- Vercel (`bidpower`): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Production, Preview y Development; `NEXT_PUBLIC_SITE_URL` en Production. Los previews usan la dirección con la que se abren.
- Los correos de Supabase (recuperar contraseña, confirmar correo) vuelven a la dirección real del sitio, nunca a localhost. En Supabase → Authentication → URL Configuration: pon Site URL = la URL de producción y agrega `https://<tu-dominio>/**` a Redirect URLs.
- Google: el botón solo aparece con `NEXT_PUBLIC_GOOGLE_AUTH=true` (y el proveedor Google activado en Supabase).
- Los previews piden iniciar sesión en Vercel (Deployment Protection); desactívalo para probar con otras personas.

## 23. Materiales ya fabricados con número de parte (importar)

- Biblioteca de materiales → **Importar lista**: sube un CSV/TSV (o pega filas desde Excel). Columnas reconocidas (español, inglés o portugués): descripción, número de parte (`part number`, `sku`, `pn`…), fabricante, unidad, categoría y apodos (separados por coma o `|`). Hay plantilla descargable con un ejemplo real (`THHN-10-STR-BLK`).
- El nombre de campo va en **apodos** ("cable 10 negro, #10 black") y el número de parte en su columna: después el material se encuentra escribiendo cualquiera de los dos.
- Repetidos: se omite lo que ya existe por número de parte (un número de parte sin fabricante coincide con cualquier fabricante) o, sin número de parte, por nombre. Máximo 2000 filas por importación; se muestra vista previa antes de importar.
- Requiere el permiso de administrar la biblioteca. El número de parte viaja a los Pricing Requests y a lo que ve el supplier.

## 24. Orden de la app (vocabulario, menú y flujo de Material)

- **Un nombre por cosa:** *Propuesta* (lo que se le manda al cliente), *Cotización* (la respuesta de un supplier; "Pedir cotización" es la acción), *Lista de material* (lo que pide el equipo), *Orden de compra (PO)*. "Quote" ya no se usa como nombre general. Mismo criterio en ES/EN/PT.
- **Menú por áreas:** Inicio, Proyectos | Ventas (Propuestas, Facturas) | Compras (Material, Cotizaciones, Órdenes de compra, Listas, Materiales) | Dinero (Gastos, Reportes, Contabilidad) | Conexiones (Clientes, Suppliers, Equipo) | Empresa (Ajustes, Ayuda). El Employee ve solo lo suyo. En el teléfono: Inicio, Proyectos, Ventas, Compras, Más (Employee: Inicio, Proyectos, Material, Gastos, Más).
- **Material es una sola puerta** (`/material`): eliges proyecto, armas la lista y decides: *Pedir cotización* a suppliers o *Comprar ya* (crea la orden de compra con las líneas de la lista, con las mismas reglas de límite y aprobación).
- **Inicio** responde "¿Qué quieres hacer?" con cuatro acciones: Nuevo proyecto, Material, Propuesta, Gasto. El "+" repite esas cuatro.
- **Nuevo proyecto** pide solo nombre, cliente y dirección (lo demás en "Más detalles") y aterriza en el proyecto.
- **Se quitaron** las pantallas que solo decían que algo no existe (Estimator, Material list, Supply requests), la subida suelta de Archivos, el hub de Clientes, los tipos de Quote y la campana de notificaciones vacía. `/my-company` redirige a Ajustes.

## 25. Conexiones: suppliers con contactos y cotización con PDF

- **Supplier con contactos** (`20260815000025`): un supplier es una empresa con personas (nombre + correo, teléfono opcional; un contacto principal). Se crea en un solo paso en Suppliers. Validación de correo, sin repetir el mismo correo en un supplier y aviso si el correo parece compartido (`ventas@`, `info@`). Un contacto es solo libreta: no se envía ni se comparte nada hasta que mandes una solicitud.
- Al pedir cotización, elegir el supplier ofrece sus contactos y rellena el correo de la invitación. **Todavía no** hay verificación del correo al abrir el enlace: el enlace funciona para quien lo tenga (pendiente del modelo de permisos por correo).
- **Cotización con PDF y solo total:** al registrar la respuesta de un supplier, lo principal es el **total de la cotización** (con el PDF adjunto); el detalle por línea es opcional. La orden de compra creada desde un total único conserva las líneas de la lista y el total cotizado.

## 26. Adding material: type, tap, quantity

In a new material list the search understands field shorthand: `thhn 8 red`, `THHN #8 RD`, `thhn 8 rojo` and `THHN-10-STR-BLK` find the same library items (colour words in ES/EN/PT, punctuation ignored, a plain number matches a whole number only so `8` does not match `#18`). Tapping a suggestion opens a quantity step (big number field, +1/+10/+50/+100 chips, unit) and "Add to list" puts it on the list and returns to the search. Typing the quantity with the item (`thhn 8 red x 500`, `500 x thhn 8 red`) and pressing Enter adds it straight away.

The quantity step never guesses the unit: it starts from the library item's own unit (EA for free text) and shows a labelled unit selector right under the quantity (Pieza, Pies, Rollo, Caja...). Wire is not special-cased.

## 27. The employee's own home and the mandatory receipt photo

- **Same login, own first screen.** A field employee lands on `/dashboard` and gets `EmployeeHome`: ask for material, buy (only with the purchasing template, shows the PO limit), receipts to hand in, their own requests and purchases, and their assigned projects. No money, reports or clients.
- **Receipt photo.** An employee uploads the receipt as a photo (camera button or gallery); PDFs are refused for them. Owners and managers can still attach PDF/JPG/PNG. A PO cannot be closed without a document (database rule `po_needs_document`).
- **Block.** Migration `20260816000026_po_pending_receipts_block.sql`: an employee with 2 or more of their own POs waiting for the receipt (`pending_document`, `received`) cannot create another (`pending_receipts`, shown as `errPendingReceipts`). Owners and managers are never blocked.
- **Templates.** `employee_basic` can only ask for material. `employee_purchasing` can also create POs up to the PO limit (500 by default) but cannot send them or request quotes. `manager` can do everything except see profit.
- e2e: `node scripts/e2e/flows.js emp`.

## 28. Import from Excel and a floating "+" that follows the page

- Materials → "Import list (Excel or CSV)": `.xlsx` files are read in the browser (`read-excel-file`) and go through the same preview and de-duplication as CSV/paste. Old `.xls` files ask to be saved as `.xlsx` or CSV. The two buttons (add item / import) are always labelled, also on the phone. `/materials?add=1` and `/materials?import=1` open them directly.
- The floating "+" offers what can be started from the current page (home, projects, a project, clients, proposals, suppliers, quote requests, purchase orders, library, expenses, invoices, team) and always respects the person's permissions. It is hidden on forms and on screens with nothing to create (settings, reports, accounting).

## 29. App icon and installed app (PWA)

The PNG icons in `public/icons` were corrupt, so the installed app had no logo. They are now rendered from the brand SVGs with `node scripts/make-icons.js` (rounded tile for "any", full-bleed square for maskable and Apple icons). The manifest no longer locks portrait (iPad landscape works), has shortcuts, and the theme colour follows light/dark. The doubled top safe-area padding was removed. After installing, delete the old home-screen icon and add it again: iOS caches the icon.

## 30. Suggestions while typing a proposal line

In a new Proposal, the line "Description" suggests items from the company library while you type (same search as the material list: shorthand, colours, part numbers). Picking one fills the description, the part number and the unit. Arrow keys + Enter also work.

## 31. One Material place and a simpler "Request quotes"

- The menu has one Material entry (Purchasing: Material, Quotes, Purchase orders). The material lists and the library hang from the Material page ("More about material"), no longer from the menu. Quotes has its own icon.
- "Request quotes": choose the material list (the latest is preselected) or "Another list: type or paste lines", then "Reply by", delivery (delivery to site by default) and notes. Title, type and links are under "More options".

## 32. Restructuring R1 + R2

- Actions are split by domain (`src/app/(dashboard)/<domain>/actions.ts`); shared helpers in `src/lib/action-helpers.ts`.
- There is no free-form purchase order: `/pos/new` redirects to Material. A purchase always starts from a material list ("Buy now") or from a supplier's answer. A quote request always starts from a material list (`errPricingNeedsList`).
- The employee has one door: "Ask for or buy material".
- Lists of expenses, purchase orders, proposals and invoices accept `?projectId=` (the project's tools use it) and show a chip to clear the filter.
- Removed: notifications page and service, time clock, unused document upload, PO exception flow, 124 unused texts.
- e2e helpers: `createList` and `buyOne` in `scripts/e2e/lib.js`.

## 33. R4: proposal -> project -> invoice, with margin

- Migration `20260817000027_proposal_approved_sets_contract.sql`: approving a proposal by hand (like the customer's link already did) gives a project without a contract value the proposal's total and moves a lead/quoted project to approved. A contract value that was already set is never overwritten.
- An approved proposal shows "Billing": billed vs total, its invoices, and "Create invoice". The invoice form suggests the number (INV-0001...), offers 30%, 50% and "the rest", and refuses more than what is left (`errInvoiceTooMuch`). Only an approved proposal can be billed (`errInvoiceQuoteNotApproved`); client and project come from the proposal. Invoices are Owner/Manager work.
- With cost permission the proposal also shows the project's margin (contract vs actual + committed cost; profit only with "view profit").

## 34. R3: quote request in four steps

The detail of a quote request shows a strip with four steps (what you ask, to whom, answers, decide), marks the current one and numbers the sections. The status "Sent" reads "Waiting for the supplier", which is true for a link and for a connected supply account.

## 35. Supply connect link, login that remembers, closed PO exceptions

- A supply house generating a connection code also gets a shareable link (`/suppliers?code=...`, with copy and WhatsApp). The contractor opens it, signs in and lands on Suppliers with the code typed.
- Any link opened while signed out goes to the login with `?next=` and comes back there after signing in (only internal paths are accepted).
- Migration `20260818000028_po_no_exception_states.sql`: no purchase order can enter the three exception statuses any more (trigger); existing rows, if any, are untouched.

## 36. Money follow-through, a real calendar and one search box

- **Invoice:** printable page (`/api/invoices/[id]/pdf?lang=`), "Mark as sent", "Cancel" only while nothing is paid, a link back to its proposal, and a computed **Overdue** status (not stored: sent or partly paid, past its due date, with a balance). Payments are not offered on a cancelled invoice.
- **Needs Attention** (owner/manager) now also lists approved proposals with something left to bill and invoices past their due date with what is owed.
- **Project** shows billed, collected and still owed; **client** shows their invoices and what they owe.
- **Calendar** shows real dates besides project starts: purchase order deliveries, invoices to collect, quote answers due, proposals about to expire and estimated project ends, with a "This month" list. Employees only see their own purchases arriving.
- **Search** (`/search?q=`, the box on the home screen): projects, clients, proposals, invoices, purchase orders, material lists, quote requests, library items and suppliers. Row security decides what each person finds; money documents only for owners and managers.

## 37. Audit pass 1 (security and consistency)

- `scripts/e2e/rls.js` attacks the database directly with each kind of person (owner of another company, employee, visitor, supply). It found that **any member could read the whole customer list**; migration `20260820000030_clients_visibility.sql` limits employees to the customers of their own projects.
- `scripts/e2e/concurrency.js` creates documents at the same moment: it showed that 16 simultaneous calls all received the **same number**. Migration `20260819000029_atomic_document_numbers.sql` hands out PO, material list, quote request, proposal and invoice numbers from an atomic counter, and adds `record_invoice_payment` so simultaneous payments all count.
- Pages that survive a failure now log it (`src/lib/log.ts`) instead of turning it into "not found" or an empty list.
- "Today" for reminders and the overdue status uses the company's time zone.
- Known and accepted: the price list (`plans`, `plan_limits`) is public on purpose; every member can read the team roster and the material library; a project's money columns (contract value, budgets) are readable through the API by employees assigned to that project even though the screens hide them. Fixing the last one means moving those columns to their own table, a data change that needs approval.
- Supabase through the assistant: `DROP ...` statements wait for a human confirmation and time out, so policies are changed with `ALTER POLICY` and the old ones are left in place when identical.
- Receipt and attachment inputs list the accepted image types explicitly (not `image/*`): iPhones then convert HEIC photos to JPEG on their own instead of sending a format the app refuses.
- Migration `20260821000031_storage_limits.sql`: the file store itself accepts only PDF/JPEG/PNG/WEBP up to 10 MB (SVG is excluded because it can carry scripts).
