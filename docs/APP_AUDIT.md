# BidPower — auditoría completa de la app y plan de reestructuración

Fecha de la revisión: 1 de octubre de 2026. Basada en el código de la rama `claude/relaxed-feynman-92wttq` (todo lo de los PR #1 a #6) y en la base de datos de Supabase. Todo lo que aparece aquí lo verifiqué leyendo el código o consultando la base de datos. Lo que no pude comprobar queda marcado como tal.

## 1. Resumen en diez líneas

1. La app tiene **56 pantallas, 27 migraciones y unas 70 tablas**. Funciona de punta a punta, pero creció por capas: cada fase agregó su propio camino y nadie quitó el anterior.
2. Los tres flujos que más importan (**comprar material → PO**, **pedir cotización al supply**, **mandar propuesta al cliente**) tienen entre 2 y 4 entradas cada uno, con nombres distintos y reglas distintas.
3. **La app no envía ningún correo ni mensaje.** Todo "enviar" es copiar un enlace y mandarlo tú por WhatsApp o correo. Los contactos con email son solo una libreta.
4. **No hay notificaciones.** La tabla, el servicio y la pantalla existen, pero nada las escribe y nadie llega a ellas desde el menú.
5. La **factura está desconectada**: no sale de la propuesta ni del proyecto. Se escribe a mano con un solo monto.
6. Hay **estados y funciones que nadie puede alcanzar** (flujo de "excepción" de PO, reloj de entrada y salida, plantillas de ensamblaje, calendario de eventos).
7. El **código de acciones está mezclado**: un solo archivo de 538 líneas hace de todo (clientes, equipo, facturas, gastos, PO, propuestas).
8. Los **nombres** de la base de datos no coinciden con los de la pantalla (`supply_quote_requests` es "Cotizaciones"; `quotes` es "Propuestas").
9. Hay **112 textos traducidos sin uso** (de 1,114) y varios repetidos.
10. Lo bueno: reglas de seguridad por empresa y por rol, recibo obligatorio, límite de PO, pruebas de punta a punta con una base real (154 comprobaciones).

---

## 2. Mapa actual de la app

### Pantallas por área (entrada desde el menú)

| Área | Pantallas | Quién las ve |
|---|---|---|
| Inicio | `/dashboard` (dueño/manager) y la pantalla propia del empleado | todos |
| Proyectos | lista, nuevo, detalle, editar, **lista de material por proyecto** (3 pantallas), **takeoff** (2) | todos según permiso |
| Ventas | Propuestas (lista, nueva, detalle), Facturas (lista, nueva, detalle) | dueño, manager |
| Compras | Material (puerta), Cotizaciones (lista, nueva, detalle), Órdenes de compra (lista, nueva, detalle), Listas de material, Biblioteca | según permiso |
| Dinero | Gastos (lista, nuevo, detalle), Reportes, Contabilidad (exportación) | dueño, manager |
| Conexiones | Clientes (4 pantallas), Suppliers, Equipo (3 pantallas) | dueño, manager |
| Empresa | Configuración, categorías, Ayuda y comentarios | dueño |
| Sin entrada en el menú | **Notificaciones**, Calendario (solo desde un proyecto) | — |
| Enlaces externos | `/customer/[token]`, `/supplier/[token]`, `/invite/[token]` | quien recibe el enlace |
| Cuenta de supply | `/supply`, `/supply/contractors`, `/supply/requests/[id]` | supply |

### Tamaño del código (líneas)

Servicios 3,070 · componentes 1,167 · proyectos 999 · propuestas 616 · cotizaciones 593 · **acciones comunes 538** · órdenes de compra 456 · equipo 352 · materiales 334 · supply 297.

---

## 3. Los tres flujos de negocio, uno por uno

### A. Del material a la compra (Orden de compra)

**Cómo es hoy: hay 3 caminos para crear una PO** (el botón + y el inicio del empleado solo llevan al tercero).

| # | Camino | Dónde empieza | Qué hace distinto |
|---|---|---|---|
| 1 | "Comprar ya" | detalle de una lista de material | copia las líneas de la lista; pide el monto si la persona tiene límite |
| 2 | Desde una respuesta de supply | detalle de una cotización | copia líneas y precios; si solo hay un total, copia las líneas con el total |
| 3 | PO libre | `/pos/new` | no tiene líneas, solo proveedor, monto y descripción |

**Problemas encontrados**
- El camino 3 vive en el archivo de acciones comunes y registra actividad; los caminos 1 y 2 viven en el módulo de PO y **no** registran nada. Reglas distintas para la misma cosa.
- Una PO libre (sin líneas) no tiene qué recibir ni qué comparar: rompe la recepción parcial y el historial de precios.
- La PO tiene **13 estados**. Cuatro no se pueden alcanzar desde la pantalla: `open` y los tres de excepción (`exception_requested`, `exception_approved`, `exception_rejected`). La función existe (`requestException`), pero ningún botón la llama.
- Las excepciones **contradicen la regla nueva**: "el recibo es obligatorio". Si se activan, permiten saltarlo.
- Qué es "recibido" y qué es "recibo subido" se confunde: dos estados (`received`, `pending_document`) significan prácticamente "falta el recibo".
- El límite por persona se aplica en la acción y en la base de datos para crear y completar, pero el texto "hasta $500 sin aprobación" solo aparece en el inicio del empleado y en `/pos/new`.
- El aviso al dueño de que hay una PO por aprobar solo existe como lista en su inicio. No hay aviso fuera de la app.

**Cómo debería ser (propuesta)**
- **Un solo camino:** toda PO nace de una **lista de material** (aunque sea de una línea). "Comprar ya" es el camino. La respuesta de un supply también termina en una lista con precios.
- **Un solo conjunto de reglas** en un solo módulo: crear, límite, aprobación, registro de actividad y aviso.
- **Menos estados:** `esperando aprobación → aprobada → enviada → recibida → recibo subido → cerrada` (más `rechazada` y `cancelada`). Quitar los tres de excepción y `open`.
- El recibo siempre es una foto/archivo y siempre es obligatorio; el dueño puede cerrar con una nota, **pero queda registrado quién lo hizo y por qué**.

### B. Pedir cotización al supply

**Cómo es hoy: hay 2 formas de que el supply responda y una tercera que no existe.**
1. **Enlace seguro**: se crea un enlace, lo copias y se lo mandas tú. El supply responde sin cuenta.
2. **Cuenta de supply conectada** (código de conexión): el supply entra a su propia bandeja.
3. **Correo**: el contacto con email se guarda, pero **no se envía nada**. La pantalla puede dar la impresión de que sí.

**Problemas encontrados**
- El nombre cambia según el lugar: "Pedir cotización", "Cotizaciones", "Pricing request" (en el código y en la ruta `/pricing`), `supply_quote_requests` (en la base de datos).
- El formulario tenía 9 campos con el mismo peso (ya lo simplifiqué en el PR #6), pero el detalle de la cotización sigue teniendo demasiadas secciones juntas (enlaces, contactos, respuestas, preguntas, adjuntos, premios).
- El servicio `pricing-requests` tiene 33 funciones y mezcla tres cosas distintas: cotizaciones, proveedores/contactos y preguntas.
- "Enviado" aparece como estado aunque nadie lo haya enviado: solo se creó un enlace.
- Un supplier que ya tiene cuenta recibe lo mismo por dos caminos distintos (enlace y bandeja).

**Cómo debería ser (propuesta)**
- **Nombre único:** "Cotización" en pantalla, `quote_requests` en el código y la base de datos, y la ruta `/quote-requests` (hoy es `/pricing`; `/quotes` es de las Propuestas).
- **Un solo botón de envío** con tres salidas visibles: *enviar por correo* (cuando exista el envío real), *copiar enlace*, *enviar por WhatsApp*. La cuenta de supply conectada recibe sin pasos extra.
- El estado "enviado" solo cuando haya salido de verdad por correo/cuenta; con enlace copiado queda "enlace listo".
- Separar en el código: `quote-requests`, `suppliers`, `questions`.

### C. Mandar una propuesta al cliente

**Cómo es hoy**
- Propuesta (con líneas, impuesto, PDF, versiones, órdenes de cambio, enlace para el cliente que aprueba con su nombre).
- Aprobada por el cliente o a mano ("decisión manual").
- Correcto en lo esencial, y ya no dice que hay firma.

**Problemas encontrados**
- **No sale ninguna factura de la propuesta.** La base de datos ya tiene `quote_id`, `project_id` y líneas en facturas, pero la pantalla de nueva factura pide número, cliente, **un solo monto** y una sola descripción.
- Una propuesta aprobada **no cambia nada en el proyecto** (ni valor del contrato ni estado).
- La propuesta no tiene botón de enviar por correo/WhatsApp, solo copiar enlace.
- El campo "tipo de propuesta" ya se quitó, pero el tipo sigue guardándose como `complete` en cada una.
- Las líneas de propuesta sugieren materiales de la biblioteca (PR #6), pero **no sugieren precio**: la biblioteca no guarda precio.
- La propuesta y la lista de material de un mismo proyecto no se conocen: no hay "armar propuesta desde la lista" ni "ver margen de la propuesta contra lo comprado".

**Cómo debería ser**
- **Propuesta aprobada → proyecto activo, con valor de contrato** y botón **"Crear factura"** que copia las líneas (o un porcentaje: anticipo, avance, final).
- **Margen vivo por proyecto:** propuesta aprobada contra gastos reales y compras comprometidas. Ya existe `project_cost_summary`; falta mostrarlo en la propuesta.
- Un solo lugar para "enviar" (igual que en B).

---

## 4. Funciones duplicadas, huérfanas o muertas

| Cosa | Qué pasa | Qué hacer |
|---|---|---|
| **Notificaciones** (tabla, servicio, pantalla) | Nada las escribe (`notifyPOCreated` y `notifyExceptionRequested` nunca se llaman). La campana se quitó del menú. La pantalla queda huérfana. | Rehacer (ver sección 7) o borrar. No dejar a medias. |
| **Registro de actividad** (`activity_logs`) | Solo se escribe desde 5 acciones del archivo común. Ninguna pantalla lo muestra. | Escribirlo desde un solo lugar y mostrarlo por proyecto, o borrarlo. |
| **Reloj de entrada/salida** (`clockInAction`, `time_entries`) | La acción y el servicio existen. No hay pantalla. | Quitar o decidir si es parte de la visión. |
| **Excepción de PO** | Función sin botón; contradice "recibo obligatorio". | Quitar. |
| **Ensamblajes de material** (`material_assemblies`) | Tabla y servicio, sin pantalla. | Quitar o pasar a "listas guardadas". |
| **Listas guardadas** | Existen, pero se usan solo desde el armado de una lista. | Mantener, dentro de Material. |
| **Contactos de cliente** (`client_contacts`), **eventos de calendario** (`calendar_events`), **actividad de proyecto** (`project_activity`), **referencias externas** (`external_refs`) | Tablas sin ningún código que las use. | Quitar en una migración de limpieza o dejarlas marcadas como reservadas. |
| **Planes, suscripciones, uso** | Hay límites (3 empleados en el plan gratis) pero no hay cobro. | Dejar hasta la fase de Stripe. |
| **Dos vistas de lo mismo** | Las **herramientas de un proyecto** (Gastos, PO, Propuestas, Facturas, Calendario) llevan a las **listas generales de la empresa**, no a lo de ese proyecto. | Que cada una abra filtrada por el proyecto. |
| **Reportes y Contabilidad** | Dos pantallas de dinero con poca relación entre sí. | Unir en "Dinero" con dos pestañas. |
| **"Quotes"/"Cotizaciones" en el menú** | En inglés el menú dice "Quotes" para pedir precio al supply y "Proposals" para el cliente. Es la mayor fuente de confusión. | Nombre fijo (ver sección 6). |
| **112 textos sin uso** | Quedaron de pantallas borradas (hub, estimador, archivos, notificaciones). | Borrarlos con un script. |
| **Textos repetidos** | "Proyectos", "Clientes", "Gastos", "Propuesta", "Órdenes de compra" aparecen 3 a 5 veces con claves distintas. | Una clave por concepto. |

---

## 5. Estructura del código

- **`src/app/(dashboard)/actions.ts` (538 líneas):** mezcla empresa, perfil, categorías, equipo, clientes, proyectos, facturas, gastos, PO libre, propuestas, notificaciones y reloj. Debe repartirse por dominio, como ya está `pos/actions.ts` y `pricing/actions.ts`.
- **Servicios:** `pricing-requests.ts` (33 funciones), `purchase-orders.ts` (19) y `materials.ts` (13) hacen demasiado. `quotes.ts` y `proposals.ts` son lo mismo con dos nombres.
- **Nombres:** la base de datos habla de `supplier_quote_*` y `supply_quote_*` (dos prefijos para lo mismo), `quotes` (propuestas), `pricing` (en rutas y código). Pantalla: Cotización, Propuesta, Supplier, Supply.
- **Permisos:** dos sistemas conviven: roles fijos (dueño/manager/empleado) y 11 permisos por persona. Varias pantallas validan el rol a mano en lugar de usar el permiso.
- **Pruebas:** hay una batería real (Postgres, PostgREST, navegador) con 154 comprobaciones. Falta cubrir: el aviso de recibos atrasados, el flujo de la cuenta de supply y la importación con datos reales.

---

## 6. Vocabulario único (propuesta para aprobar)

| En pantalla (ES) | En pantalla (EN) | Para qué | Nombre interno |
|---|---|---|---|
| **Propuesta** | Proposal | Lo que se manda al cliente con precio | `proposals` |
| **Cotización** | Quote request | Lo que se pide al supply | `quote_requests` |
| **Lista de material** | Material list | Lo que se necesita para un proyecto | `material_lists` |
| **Orden de compra** | Purchase order | La compra real | `purchase_orders` |
| **Factura** | Invoice | El cobro al cliente | `invoices` |
| **Supply** | Supply | La empresa que vende | `suppliers` / `supply_accounts` |

Reglas: una palabra para cada cosa, también en el código y la base de datos; nunca "Quote" a secas.

---

## 7. Lo que falta de verdad (producto)

1. **Envío real:** correo (y WhatsApp como enlace) para cotizaciones, propuestas e invitaciones. Hoy todo es copiar y pegar.
2. **Notificaciones** útiles y pocas: PO por aprobar, respuesta del supply, propuesta aprobada, recibo atrasado.
3. **Factura desde propuesta** con avance por porcentajes.
4. **Margen por proyecto** visible en la propuesta y el proyecto.
5. **Verificación del que abre un enlace:** hoy cualquiera con el enlace lo abre. Falta atarlo al correo del contacto.
6. **Supply:** invitar a sus clientes con enlace o QR, catálogo propio, y pulir su bandeja.
7. **Cobro de membresía** (Stripe): planes y límites ya existen en datos.
8. **QuickBooks en vivo** (hoy solo exportación manual).
9. **Catálogo base de materiales** con números de parte. Tiene que ser de fuente abierta o con permiso; **no** cargar listas internas de otra empresa sin autorización escrita.

---

## 8. Plan de reestructuración por fases

Cada fase se prueba de punta a punta antes de pasar a la siguiente y no mezcla funciones nuevas con limpieza.

**R1 — Limpieza sin cambiar el comportamiento** (bajo riesgo)
- Repartir `actions.ts` por dominio. Unir `quotes.ts` y `proposals.ts`.
- Borrar los 112 textos sin uso y unificar los repetidos.
- Quitar código y estados muertos (excepción de PO, reloj, ensamblajes, notificaciones huérfanas).
- Herramientas del proyecto abren filtradas por proyecto.
- *Resultado:* menos código, mismo funcionamiento.

**R2 — Un solo camino de compra**
- Toda PO nace de una lista de material. La PO libre desaparece (o se vuelve "lista de una línea").
- Un módulo con todas las reglas: límite, aprobación, recibo, registro de actividad.
- Estados reducidos de 13 a 8.
- Migración con datos existentes (convertir PO libres a listas de una línea).

**R3 — Cotización al supply, ordenada**
- Nombre único. Un botón de envío con las tres salidas.
- Detalle de la cotización dividido en pasos (Líneas → A quién → Respuestas → Decidir).
- Estado "enlace listo" distinto de "enviado".

**R4 — Propuesta → proyecto → factura**
- Aprobar la propuesta activa el proyecto con su valor de contrato.
- "Crear factura" desde la propuesta (anticipo, avance, final).
- Margen vivo en proyecto y propuesta.

**R5 — Envío real y notificaciones**
- Proveedor de correo (necesita tu decisión y una cuenta tuya; no pongo claves en el chat).
- Cuatro notificaciones básicas.
- Enlaces atados al correo del contacto.

**R6 — Supply y membresía** (lo que dijiste que se pule después).

---

## 9. Decisiones que necesito de ti antes de empezar R1

1. **¿Apruebas el vocabulario de la sección 6?** (Cotización / Propuesta / Lista de material / Orden de compra / Factura).
2. **¿Se elimina la PO libre?** Mi recomendación: sí; toda compra nace de una lista, aunque sea de una línea.
3. **¿Se elimina el flujo de excepción?** Mi recomendación: sí, por la regla del recibo obligatorio.
4. **¿Qué hacemos con lo que hoy nadie usa** (reloj, ensamblajes, notificaciones huérfanas)? Mi recomendación: quitar lo que no está en la visión y reconstruir las notificaciones en R5.
5. **¿Qué proveedor de correo prefieres?** (Resend es lo más simple.) La cuenta y la clave las pones tú, fuera del chat.

---

## 10. Cómo se verificó esto

- Recorrí el código de todas las pantallas, acciones y servicios, y busqué cuáles pantallas tienen entradas desde el menú o desde otras pantallas.
- Revisé las 27 migraciones y busqué qué tablas tiene código que las use.
- Medí textos sin uso y repetidos contra el código.
- No probé la app desplegada con un navegador real; lo que sé del comportamiento sale del código y de la batería local.

---

## 11. Estado de la reestructuración (actualizado)

**R1 hecha (limpieza):** el archivo de acciones comunes se repartió por dominio (`settings`, `employees`, `clients`, `projects`, `invoices`, `expenses`, `quotes`) con ayudantes comunes en `src/lib/action-helpers.ts`. Se borraron las notificaciones huérfanas, el reloj de entrada/salida, la subida de documentos sin uso, el flujo de excepción de PO y 124 textos sin uso. Las herramientas de un proyecto (Gastos, PO, Propuestas, Facturas) ahora abren filtradas por ese proyecto, con una etiqueta para quitar el filtro.

**R2 hecha (un solo camino de compra):** no existe la PO libre (`/pos/new` lleva a Material). Toda compra nace de una lista de material con "Comprar ya", o de la respuesta de un supply. La Cotización siempre parte de una lista (el servidor lo exige). El empleado tiene una sola puerta: "Pedir o comprar material".

**Pendiente de decisión:** los estados `open` y `exception_*` siguen en la base de datos pero ya no se pueden alcanzar desde ninguna pantalla. Quitarlos requiere una migración; se hace junto con R5.

**R3 hecha (cotización ordenada):** el detalle de una cotización muestra cuatro pasos en una franja (Lo que pides → A quién → Respuestas → Decidir), marca el paso actual y numera las secciones. El estado "Enviado" ahora dice "Esperando al supply", que es verdad sea cual sea el canal (enlace o cuenta conectada).

**R4 hecha (propuesta → proyecto → factura):** aprobar una propuesta a mano mueve el proyecto igual que el enlace del cliente; una propuesta aprobada se factura en partes (30 %, 50 %, lo que falta) sin pasar de su total, y muestra lo facturado y el margen del proyecto.

**Sigue pendiente:** R5 (envío real de correo y notificaciones; necesita elegir el proveedor de correo), R6 (supply y membresía) y quitar de la base de datos los estados de PO que ya no se usan.
