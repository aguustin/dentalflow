# Roadmap — de DentalFlow a SaaS multi-vertical

> Objetivo: que la misma plataforma gestione una clínica dental, un taller mecánico, un servicio técnico,
> una tienda de ropa o de tecnología **sin reescribir el núcleo**. Cada fase deja algo usable y mide su costo
> en tests sólo donde hay riesgo real.

---

## 0. Rubros como combinación de bloques

Cada rubro es una **plantilla** que habilita un subconjunto de bloques del núcleo, más (opcionalmente) un módulo propio.

| Bloque (núcleo) | Dental | Servicio técnico / Mecánica | Ropa | Tecnología (venta) |
|---|---|---|---|---|
| Clientes | ✅ pacientes | ✅ | ✅ | ✅ |
| Agenda / turnos | ✅ | opcional | — | — |
| Catálogo | servicios + insumos | repuestos + mano de obra | productos + talle/color | productos + nº serie/garantía |
| Ventas / caja | ✅ | ✅ | ✅ (POS) | ✅ (POS) |
| Inventario | insumos | repuestos | ✅ | ✅ |
| Órdenes de trabajo + equipos del cliente | — | ✅ | — | opcional (si repara) |
| Módulo propio | historia clínica, odontograma | — | — | — |

**Orden de rubros:** Dental (más avanzado) → Servicio técnico / Mecánica (valida la flexibilidad con un bloque
distinto) → Ropa y Tecnología (casi sólo plantillas sobre Catálogo + Ventas + Inventario).

**Fuera de alcance por ahora** (operación muy distinta, complicaría el núcleo): restaurantes (mesas, comandas),
hotelería (reservas por noche), producción/fábricas (recetas, materia prima), inmobiliarias (contratos y cobros recurrentes).

**Experiencia de usuario por rubro** (definido en la plantilla): sólo sus módulos visibles, su vocabulario
(Paciente/Cliente, Tratamiento/Orden, Sillón/Elevador) y su **pantalla principal** (agenda, tablero de órdenes o POS).

---

## 1. Principios (para no sobreingenierizar)

| Hacemos | NO hacemos (por ahora) |
|---|---|
| Un **núcleo genérico** (clientes, staff, agenda, catálogo, ventas, stock) + **módulos verticales** (dental, retail) | Sistema de plugins cargados en runtime |
| `Organization.vertical` + lista de módulos habilitados, definida **en código** por plantilla | Constructor de formularios / campos dinámicos editables por el usuario |
| Campos específicos del rubro en una columna `attributes JSONB` validada con un schema por vertical | Tablas EAV o metadata genérica |
| Terminología por vertical en un diccionario (`Paciente` vs `Cliente`) en `packages/config` | Motor de i18n completo (se agrega cuando haya un segundo idioma) |
| Monolito modular NestJS + un solo Postgres con `organizationId` | Microservicios, una base por tenant |
| Event bus en memoria | Colas/outbox (sólo cuando haya más de una instancia de la API) |

**Regla de oro:** un concepto entra al núcleo sólo si al menos dos verticales lo necesitan. Si no, vive en el módulo vertical.

---

## 2. Estrategia de testing

Testeamos **lógica con reglas, dinero, concurrencia y aislamiento entre tenants**. No testeamos lo que el framework o el compilador ya garantizan.

**Se testea:**
- Cálculos y reglas de negocio puras (disponibilidad, totales, límites del plan, transiciones de estado no triviales).
- Aislamiento multi-tenant y permisos: **una sola suite e2e** que recorra los endpoints críticos con un usuario de otra organización.
- Operaciones con concurrencia o dinero (descuento de stock, ventas, webhooks de pago idempotentes).

**No se testea:**
- CRUDs, mappers, DTOs, controllers que sólo delegan, repositorios Prisma simples.
- Validaciones de `class-validator` ni guards de Nest ya cubiertos por la suite e2e.
- Lo que ya se testeó en una fase anterior (no se repiten tests al tocar código alrededor).
- UI: sin tests unitarios de componentes; como mucho **un** smoke test Playwright del flujo principal por vertical.

**Herramientas:**
- Jest (ya instalado) para unit tests sobre `application/` y `domain/`.
- e2e con Supertest contra el Postgres de `docker-compose` (una base `_test` aparte, `prisma migrate reset` antes de la suite).
- `typecheck` + `lint` en CI como red de seguridad barata.

**Cómo se marca en cada fase:** 🧪 = test que hay que escribir. Si una tarea no lo tiene, alcanza con la prueba manual vía Swagger/web.

---

## 3. Fases

### Fase 0 — Generalizar el núcleo ✅ *(completada 2026-11-13)*
Es la fase más barata ahora y la más cara después: todavía no hay datos de producción.

| Tarea | Cómo |
|---|---|
| Rubro de la organización | `Organization.vertical` (`dental` \| `repair` \| `retail` \| …) y `enabledModules String[]`. Al crearla, el onboarding copia los módulos de la plantilla del rubro. |
| Plantillas de rubro | `shared/verticals/*.ts`: módulos habilitados, roles y permisos por defecto, schema de `attributes`, vocabulario y pantalla principal. Es código, no está en la base. Se crea sólo `dental`; el resto se agrega en su fase. |
| `Patient` → `Customer` | Renombrar el modelo, la tabla y el módulo. Agregar `attributes JSONB`. Para dental el schema incluye la fecha de nacimiento, la obra social y otros datos del paciente. |
| Habilitación de módulos | Decorador `@RequireModule('scheduling')` + guard que lee `enabledModules` y responde 403 si el módulo no está habilitado. Se combina con el billing guard existente. |
| Terminología | Parte de la plantilla en la API. Los clientes la leen de `GET /organizations/current` (`vertical.terminology`). Se descartó `packages/config` porque exporta `.ts` crudo que la API, en CommonJS, no puede importar en runtime; además así hay una sola fuente de verdad. |
| Limpieza | Actualizar el README y `docs/README.md` (dicen "no hay lógica" o "sólo dental"). |
| Base de tests | `test/jest-e2e.json`, una base de test y helpers para crear una org y un usuario con un token. |

🧪 Suite e2e de **aislamiento entre tenants**: el usuario de la org B no puede leer, editar ni borrar clientes ni turnos de la org A. Se amplía en cada fase agregando endpoints a una lista, no escribiendo tests nuevos.
🧪 Unit: validación de `attributes` contra el schema del rubro (sólo el validador, una vez).

---

### Fase 1 — Frontend web MVP ✅ *(completada 2026-11-13)*
Sin interfaz el producto no se puede probar con usuarios reales.

> **Resultado:** frontend **mínimo y funcional** para pruebas (CSS propio de un archivo, sin librería de estilos).
> El diseño visual se trabaja en una etapa dedicada. Quedó fuera el selector de organización (se cambia de org
> volviendo a iniciar sesión) y agregar a la org usuarios que ya tienen cuenta (requiere invitaciones).
> Smoke test: `pnpm --filter @dentalflow/web test:e2e` (levanta su propia API y web contra la base de test).

| Tarea | Cómo |
|---|---|
| Base | React Router + TanStack Query + un cliente HTTP con refresh token automático. Componentes en `packages/ui` sólo cuando se repiten. |
| Pantallas | Login, selector de organización, onboarding (elegir rubro), clientes (lista, alta, edición), agenda (vista semanal), configuración de usuarios y roles. La home redirige a la pantalla principal del rubro. |
| Adaptación por rubro | Menú y rutas filtrados por `enabledModules`; etiquetas tomadas del diccionario; formulario de `attributes` generado del schema del rubro. **Sólo** tipos simples: texto, número, fecha, select. |
| Tipos compartidos | Mover a `packages/types` los DTOs de respuesta que usa la web. |

🧪 Un smoke test Playwright: login → crear cliente → crear turno.

---

### Fase 2 — Staff y agenda real ✅ *(completada 2026-11-13)*
Hoy los turnos no tienen profesional asignado. Para rubros de servicios, lo importante es *quién* atiende y *dónde*.

> **Resultado:** profesionales (con o sin usuario del sistema), horario semanal, ausencias, recursos, zona horaria
> por organización, disponibilidad cada 15 min y doble reserva bloqueada en la base con exclusion constraints
> (`appointments_staff_no_overlap` / `_resource_no_overlap`). Los turnos confirmados ahora se pueden cancelar o
> marcar ausentes. Profesionales y recursos no se borran: se desactivan. La agenda web asume que el navegador
> está en la misma zona horaria que la organización.

| Tarea | Cómo |
|---|---|
| Staff | Perfil vinculado a `Membership` (especialidad, color en la agenda). Es genérico: odontólogo, vendedor, estilista. |
| Recursos opcionales | Modelo `Resource` (sillón, consultorio, probador). Opcional en el turno. |
| Horarios | `WorkingHours` por miembro del staff (día de la semana, rango) + `TimeOff` (ausencias). |
| Turnos | `staffId` obligatorio y `resourceId` opcional. El solapamiento pasa a validarse **por staff y por recurso**, además de por cliente. Endpoint `GET /availability?staffId&date&duration`. |
| Duración | La duración del servicio se toma del catálogo (Fase 3). Mientras tanto, se envía en el request. |

🧪 Unit: cálculo de disponibilidad (horario laboral − ausencias − turnos existentes, bordes de rango, turnos que cruzan la medianoche). Es la lógica más propensa a bugs del sistema.
🧪 e2e: dos turnos simultáneos para el mismo staff → el segundo devuelve 409. Requiere una exclusion constraint en Postgres o un lock: es un test de concurrencia, no de CRUD.

---

### Fase 3 — Catálogo y ventas (núcleo comercial) ✅ *(completada 2026-11-13)*

> **Resultado:** catálogo (servicios con duración, productos con flag de stock), ventas con numeración correlativa
> atómica por organización, descuentos por línea y global, impuesto configurable (`Organization.taxRateBps`, hoy
> sin pantalla de configuración: 0 = precios finales), pagos parciales con bloqueo optimista (no se puede pagar de
> más ni con pedidos simultáneos), caja diaria (una abierta por org, índice único parcial) y turno completado →
> venta (una por turno). Moneda por organización (`currency`, default ARS). Anular solo sin pagos; reintegros con
> las devoluciones de la Fase 7.
Es el punto donde la tienda de ropa y la clínica comparten código.

| Tarea | Cómo |
|---|---|
| Catálogo | `CatalogItem` con `type: SERVICE | PRODUCT`, precio, duración (servicios), SKU, `attributes JSONB` y flag `trackStock`. |
| Ventas | `Sale` (cliente opcional, staff, estado) + `SaleItem` (ítem, cantidad, precio unitario congelado, descuento) + `Payment` (método, monto). Un turno completado puede generar una venta en borrador. |
| Totales | Servicio de dominio puro: subtotal, descuentos por línea y global, impuesto configurable por org. **Montos en enteros (centavos)**, nunca en float. |
| Estados | `DRAFT → CONFIRMED → PAID / PARTIALLY_PAID → VOIDED`. Al confirmar se emite `SaleConfirmed`. |
| Caja simple | Apertura y cierre de caja con el total por método de pago. Útil para los dos rubros. |

🧪 Unit: cálculo de totales (descuentos, redondeo, impuesto).
🧪 Unit: pagos parciales y el cambio de estado que provocan (un pago que excede el saldo se rechaza).
Sin tests para el CRUD del catálogo.

---

### Fase 4 — Inventario ✅ *(completada 2026-11-13)*

> **Resultado:** ledger de stock compartido (`src/infrastructure/inventory/stock-ledger.ts`) usado por inventario y
> ventas. Confirmar una venta descuenta stock **en la misma transacción** (no por evento, para que nunca quede una
> venta confirmada sin su descuento); si falta stock se rechaza con el detalle de faltantes y la venta queda en
> borrador. Anular repone exactamente lo registrado por la venta. Compras, ajustes por recuento, stock mínimo con
> aviso en el menú. `CHECK stock_quantity >= 0` como red de seguridad.

| Tarea | Cómo |
|---|---|
| Movimientos | Ledger `StockMovement` (entrada, salida, ajuste, devolución) y stock actual en una columna que se actualiza dentro de la misma transacción. Opcionalmente por sucursal o depósito más adelante; **no ahora**. |
| Integración | `SaleConfirmed` → descuenta stock de los ítems con `trackStock`; `SaleVoided` → lo repone. |
| Alertas | `minStock` por ítem + endpoint o badge de stock bajo. Las notificaciones push quedan para después. |

🧪 e2e de concurrencia: dos ventas simultáneas del último ítem → sólo una se confirma (`UPDATE … WHERE stock >= qty`).
🧪 Unit: que la anulación de una venta reponga exactamente lo descontado.

---

### Fase 5 — Vertical Dental
| Tarea | Cómo |
|---|---|
| Historia clínica | `ClinicalRecord` por cliente: anamnesis (JSONB con schema), alergias, notas de evolución con autor y fecha (sólo agregar, sin editar). |
| Odontograma | Estado por pieza y cara (JSONB por cliente + historial de cambios). La UI es la parte costosa; en el backend es simple. |
| Planes de tratamiento | `TreatmentPlan` con ítems del catálogo (servicios) por pieza; los estados del ítem van de propuesto a aceptado y realizado. Un ítem realizado puede generar una línea de venta. |
| Documentos | Adjuntos (radiografías) en S3 o compatible con URL firmada. |

🧪 Unit: transiciones del plan de tratamiento y su generación de ítems de venta (sólo si la lógica deja de ser trivial).
Sin tests para el odontograma ni la historia clínica (son CRUD).

---

### Fase 6 — Órdenes de trabajo (Servicio técnico / Mecánica)
Segundo rubro: valida que la arquitectura sirve. Si esta fase requiere tocar mucho el núcleo, hay que revisar la Fase 0.
El bloque es genérico: sirve después para cerrajería, electricistas, electrodomésticos, etc.

| Tarea | Cómo |
|---|---|
| Equipos del cliente | `Asset` (cliente, tipo, `attributes JSONB`). El schema lo pone el rubro: vehículo (patente, marca, modelo, km) o dispositivo (marca, modelo, nº de serie). Historial de órdenes por equipo. |
| Orden de trabajo | `WorkOrder` (cliente, equipo, staff asignado, problema reportado, diagnóstico) + `WorkOrderItem` (ítem del catálogo: repuesto o mano de obra, cantidad, precio). |
| Estados | `RECEIVED → DIAGNOSING → QUOTED → APPROVED → IN_PROGRESS → READY → DELIVERED`, más `REJECTED`/`CANCELLED`. Transiciones válidas definidas en el dominio. |
| Integraciones | Al aprobar se **reservan** los repuestos; al entregar, la orden se convierte en una `Sale` (Fase 3) y se descuenta el stock (Fase 4). Turno opcional para la recepción (Fase 2). |
| Presupuesto | Vista imprimible o compartible (link) del presupuesto para que el cliente lo apruebe. Aprobación registrada por el staff; la aprobación online del cliente queda para después. |
| UX | Pantalla principal: tablero kanban por estado. Plantillas `repair_mechanic` y `repair_tech` (mismo módulo, distinto vocabulario y schema de equipo). |

🧪 Unit: máquina de estados de la orden (transiciones inválidas rechazadas).
🧪 Unit: conversión orden → venta + reserva o liberación de stock (al rechazar o cancelar se liberan las reservas).
🧪 Smoke Playwright: recibir equipo → presupuestar → aprobar → entregar → venta generada.

---

### Fase 7 — Retail (Ropa y Tecnología)
Casi todo es plantilla sobre Catálogo + Ventas + Inventario.

| Tarea | Cómo |
|---|---|
| Variantes | `CatalogItemVariant` (talle, color, SKU y stock propios). El stock pasa a vivir en la variante cuando existe. Este cambio sí toca el núcleo: conviene diseñarlo en la Fase 3/4 dejando `variantId` nullable desde el inicio. |
| Nº de serie y garantía (tecnología) | Registro opcional del nº de serie vendido en `SaleItem` + fecha de fin de garantía. Si el negocio también repara, habilita el módulo de órdenes de trabajo (Fase 6) y el nº de serie se vincula como `Asset`. |
| POS | Pantalla de venta rápida: búsqueda por SKU o código de barras, carrito y cobro. Reutiliza `Sale` de la Fase 3. |
| Devoluciones y cambios | Venta con líneas negativas que vinculan a la venta original + movimiento de stock de devolución. |
| Plantillas | `retail_clothing` y `retail_tech`: módulos `customers, catalog, sales, inventory, reports`. **Sin** `scheduling`. |

🧪 Unit: devoluciones (no se puede devolver más de lo vendido, se repone el stock de la variante correcta).
🧪 Smoke Playwright del POS: escanear → cobrar → stock decrementado.

---

### Fase 8 — Reportes
| Tarea | Cómo |
|---|---|
| KPIs | Consultas SQL agregadas (Prisma `$queryRaw`) por período: ventas, ticket promedio, top ítems, ocupación de la agenda, ausencias (no-show), stock valorizado, órdenes por estado y tiempo promedio de reparación. |
| Dashboard | Una pantalla por rubro que reutiliza los mismos endpoints filtrados por los módulos habilitados. |
| Exportación | CSV. PDF sólo si lo piden. |

🧪 Un test de integración por consulta con agrupación por fecha o zona horaria (es el error típico). El resto no se testea.

---

### Fase 9 — Cobro real del SaaS
| Tarea | Cómo |
|---|---|
| Proveedor | Mercado Pago o Stripe detrás de una interfaz `IPaymentGateway` (es la única abstracción "a futuro" justificada: el proveedor depende del país). |
| Webhooks | Endpoint público con verificación de firma; actualiza `Subscription.status`. |
| Planes por rubro | Los límites actuales (pacientes y turnos) pasan a métricas genéricas: `customers`, `appointments`, `sales`, `catalogItems`, `workOrders`. |

🧪 Unit: idempotencia del webhook (el mismo evento dos veces no duplica el cambio de estado) y verificación de firma.

---

### Más adelante (sólo con demanda real)
- **Mobile:** agenda del profesional y POS para retail. Reutiliza `packages/types` y el cliente HTTP.
- **Multi-sucursal:** `Location` en org, stock por sucursal.
- **Notificaciones:** recordatorios de turnos por WhatsApp o email (con el outbox en ese momento).
- **Tienda online y facturación electrónica:** dependen del país; se evalúan aparte.
- **Aprobación online del presupuesto** por el cliente (link con aceptar/rechazar).
- **Nuevos rubros** (peluquería, veterinaria, gimnasio, cerrajería, electricistas): idealmente sólo una plantilla + a lo sumo un módulo propio chico.

---

## 4. Orden y dependencias

```
F0 Núcleo genérico ──► F1 Web MVP ──► F2 Staff/Agenda ──────────────► F5 Dental
                                 └──► F3 Catálogo/Ventas ──► F4 Inventario ──► F6 Órdenes de trabajo
                                                         │                 └──► F7 Retail
                                                         └──► F8 Reportes ──► F9 Cobro SaaS
```

F2 y F3 pueden avanzar en paralelo. F5, F6 y F7 son independientes entre sí (F6 usa la agenda de F2 sólo de forma opcional).

## 5. Criterio de "fase terminada"
1. Funciona de punta a punta desde la web para al menos un rubro.
2. Los tests 🧪 de la fase pasan en CI junto con `typecheck` y `lint`.
3. Los endpoints nuevos se agregaron a la suite de aislamiento entre tenants.
4. Se agregó un ADR corto en `decisions/` si se tomó una decisión difícil de revertir.
