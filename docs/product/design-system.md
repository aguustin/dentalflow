# Velatrix One — Sistema de diseño

> Fuente de verdad visual de Velatrix One y sus ediciones (Clinic, Workshop, Retail…).
> Identidad de origen: `docs/velatrix-brand-reference.png`. Implementación: `apps/web/src/design-system/`.
> Aprobado el 2026-11-18. Cualquier cambio de criterio se registra acá antes de implementarse.
> **2026-11-18 — Identidad de producto:** cada edición tiene su color propio como acento principal. Clinic usa el
> cian clínico; el verde Velatrix queda reservado a la marca institucional (logotipo y recursos corporativos).

---

## 1. Principios

1. **La marca enmarca, los datos protagonizan.** Identidad fuerte en el marco (menú, login, onboarding); sobriedad en las pantallas de trabajo.
2. **El color de producto es un acento, no un relleno.** En Clinic, el cian marca acción principal, elemento activo, foco y dato destacado; superficies, textos y separadores siguen neutros.
3. **Nada depende solo del color.** Todo estado lleva texto e ícono; todo gráfico, leyenda o etiqueta.
4. **Accesible por defecto.** Contraste WCAG AA, foco siempre visible, todo usable con teclado.
5. **Una familia, productos reconocibles.** Velatrix aporta lenguaje, tipografía, iconografía y calidad; cada edición aporta su color identificador.

---

## 2. Marca

| Recurso | Uso |
|---|---|
| Ícono oficial (cuadrado redondeado con la V) | `apps/web/public/brand/velatrix-icon.png` — recortado de la pieza oficial, sin modificar |
| Logotipo VELATRIX | **No se recrea con tipografías.** Hasta tener los SVG oficiales, el nombre del producto se escribe en texto plano (Space Grotesk), sin imitar la “Λ” ni el interletrado del logotipo |
| Pendiente | SVG oficiales (símbolo, logotipo, horizontal, versión clara), valor exacto del verde azulado del degradado |

La falta de un recurso no bloquea el desarrollo: se usa el recurso existente o texto plano, nunca una recreación.

**Nombre del producto:** `Velatrix One · Clinic` (producto · edición).

---

## 3. Paleta

### Verde Velatrix (primario)
| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#E6FDF1` | `#C2F9DC` | `#8DF3BF` | `#4DEC9C` | `#1FE884` | **`#00E676`** | `#00C764` | `#00A353` | `#00824A` | `#00663A` | `#003D23` |

### Verde azulado (secundario de marca)
`#5EEAD4` · **`#00C9A7`** · `#00A88C` · `#0B6E5A` — degradado de marca `135°, #00E676 → #00C9A7`.

### Neutros grafito
| 950 | 900 | **850** | 800 | 700 | **600** | 500 | 400 | 300 | 200 | 100 | **50** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `#0A0B0D` | `#111317` | **`#1A1B1E`** | `#22252A` | `#2E3138` | **`#4B5563`** | `#6B7280` | `#9CA3AF` | `#CBD2DB` | `#E2E6EB` | `#F1F4F7` | **`#F8FAFC`** |

### Funcionales
| Rol | Claro (texto / fondo) | Oscuro (texto / fondo) |
|---|---|---|
| Éxito | `#047857` / `#D1FAE5` | `#34D399` / `rgb(52 211 153 / .12)` |
| Advertencia | `#B45309` / `#FEF3C7` | `#FBBF24` / `rgb(251 191 36 / .12)` |
| Peligro | `#DC2626` / `#FEE2E2` | `#F87171` / `rgb(248 113 113 / .12)` |
| Información | `#1D4ED8` / `#DBEAFE` | `#60A5FA` / `rgb(96 165 250 / .14)` |
| En curso | `#6D28D9` / `#EDE9FE` | `#C4B5FD` / `rgb(167 139 250 / .14)` |

### Verde institucional
`#00E676` y el verde azulado `#00C9A7` son de la **marca matriz**: logotipo, símbolo V y recursos corporativos. **No** se usan como acento de interfaz de Clinic (botones, navegación, foco, enlaces).

### Color de producto — Clinic (cian clínico)
| Token | Valor | Uso | Contraste verificado |
|---|---|---|---|
| `--product-accent` | `#22D3EE` | relleno de botón principal, activo del menú, acento en oscuro | texto `#0A0B0D` encima 10,9:1 · sobre `#111317` 10,3:1 |
| `--product-accent-hover` | `#06B6D4` | hover (claro) / presionado (oscuro) | texto oscuro 8,1:1 |
| `--product-accent-strong` | `#0891B2` | indicadores no textuales en claro: foco, barras, bordes seleccionados, casillas | sobre blanco 3,7:1 (≥ 3:1) |
| `--product-accent-ink` | `#0E7490` | **texto** cian en claro (enlaces, selección) | sobre blanco 5,4:1 · sobre `#CFFAFE` 4,8:1 |
| `--product-accent-soft` | `#CFFAFE` | fondo seleccionado (claro) | — |
| `--product-accent-subtle` | `#ECFEFF` | superficie suave (claro) | — |
| `--product-accent-dark-soft` | `rgb(34 211 238 / .12)` | fondo seleccionado (oscuro) | texto cian encima 8,3:1 |
| `--product-accent-dark-hover` | `#67E8F9` | hover en oscuro | texto oscuro 13,6:1 |

`#0891B2` **no** se usa para texto en claro (3,7:1 < 4,5:1): para eso está `--product-accent-ink`. Nunca texto blanco sobre cian (blanco sobre `#0891B2`: 3,7:1).

### Ediciones futuras
| Edición | Color previsto |
|---|---|
| Clinic | `#22D3EE` (implementado) |
| Workshop | `#FB923C` (a definir y verificar) |
| Retail | `#A78BFA` (a definir y verificar) |
Cada edición redefine solo la capa de producto (`--product-*`); el resto del sistema no cambia.

---

## 4. Tokens semánticos

Definidos en `design-system/tokens.css`, en cinco capas: **institucional** (`--vx-*`), **global** (neutros, tipografía, forma, movimiento), **producto** (`--product-*`), **funcional** (`--fn-*`) y **tema** (semánticos claro/oscuro). Los componentes **solo** usan tokens semánticos, nunca HEX directos.

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` | `#F8FAFC` | `#0A0B0D` |
| `--surface` | `#FFFFFF` | `#111317` |
| `--surface-2` | `#F1F4F7` | `#1A1B1E` |
| `--surface-3` | `#FFFFFF` (+sombra) | `#22252A` |
| `--border` / `--border-strong` | `#E2E6EB` / `#CBD2DB` | `#26282D` / `#2E3138` |
| `--text` / `--text-muted` / `--text-subtle` | `#0A0B0D` / `#4B5563` / `#6B7280` | `#F8FAFC` / `#9CA3AF` / `#8B93A1` |
| `--accent` / `--accent-hover` / `--accent-pressed` / `--on-accent` | `#22D3EE` / `#06B6D4` / `#0891B2` / `#0A0B0D` | `#22D3EE` / `#67E8F9` / `#06B6D4` / `#0A0B0D` |
| `--accent-text` (texto cian) | `#0E7490` | `#22D3EE` |
| `--accent-indicator` (barras, bordes, casillas) | `#0891B2` | `#22D3EE` |
| `--accent-soft` / `--accent-subtle` | `#CFFAFE` / `#ECFEFF` | `rgb(34 211 238 / .12)` / `/ .06` |
| `--focus-ring` | `#0891B2` | `#22D3EE` |
| `--sidebar-*` | oscuro en **ambos** temas (`#0A0B0D`) | ídem |
| `--radius-sm/md/lg` | 6 / 10 / 14 px | ídem |

---

## 5. Apariencia

Tres preferencias: **Claro**, **Oscuro**, **Automático (según el sistema operativo)**. Por defecto: Automático.
La preferencia se guarda **por producto** en el dispositivo (`velatrix.clinic.theme`): la de Clinic no cambia la de Retail o Workshop. Se aplica antes del primer render (sin parpadeo).
El menú lateral es oscuro en los tres modos: es el ancla de marca.

---

## 6. Tipografía

| Uso | Fuente | Detalle |
|---|---|---|
| Títulos, cifras KPI, etiquetas de sección | Space Grotesk (500–600) | etiquetas de sección: 11–12 px, mayúsculas, +12% interletrado |
| Interfaz, formularios, tablas | Inter (400–600) | 14 px base; números con `tabular-nums` |
| Códigos (SKU, IMEI, nº) | JetBrains Mono (500) | 13 px |

Escala: 12 · 13 · 14 · 15 · 16 · 18 · 20 · 24 · 30 · 36. Fuentes empaquetadas en la app (sin CDN: la app de escritorio no depende de servicios externos).

---

## 7. Semántica de estados

Todo estado se muestra con **color + ícono + texto** (componente `StatusBadge`). Las categorías son comunes a todos los módulos:

| Categoría | Color | Ícono | Ejemplos |
|---|---|---|---|
| Pendiente | Advertencia (ámbar) | reloj | Turno agendado, presupuesto presentado, borrador, pago pendiente, recibido |
| Confirmado | Información (azul, distinto del cian de Clinic) | check en círculo | Turno confirmado, presupuesto aprobado, venta confirmada |
| En atención / en curso | En curso (violeta) | actividad | Orden en reparación, en diagnóstico, en atención |
| Finalizado | Éxito (verde) | doble check | Turno completado, venta pagada, orden entregada / lista |
| Cancelado | Neutro (gris) | círculo con cruz | Cancelado, anulado, descartado |
| Problema | Peligro (rojo) | alerta | Ausente, pago rechazado, stock insuficiente |

El estado “En atención” para turnos (paciente en consulta) no existe todavía en el modelo; cuando se agregue usa la categoría En curso.

---

## 8. Componentes

- **Menú lateral**: oscuro siempre (ancla institucional); grupos *Operación / Gestión / Configuración*; ítem activo = texto cian + barra izquierda de 3 px + fondo cian al 10%; nombre de edición “Clinic” en cian junto al ícono oficial; colapsable a íconos.
- **Botones**: primario (cian de producto, texto negro, **uno por vista**), secundario (borde), terciario (texto), peligro (rojo). Estados: hover, presionado, foco (anillo de 2 px con separación), deshabilitado.
- **Deshabilitado**: **sin opacidad general**. Fondo `--surface-2`, texto `--text-subtle`, borde `--border`, cursor no permitido. Sigue siendo legible.
- **Tarjetas / KPI**: borde + (claro) sombra suave; cifra en Space Grotesk; variación con signo y color; la tarjeta destacada lleva una línea superior de 2 px en `--accent-indicator`.
- **Formularios** (estilo “delineado refinado”, aprobado 2026-11-18): campos de 40 px, radio 8 px, margen lateral 12 px, borde `--input-border` (3:1) y sombra interna leve; en oscuro el campo es más oscuro que la tarjeta (`--field-bg`). Hover = borde más oscuro; foco = borde `--focus-ring` + halo de 3 px; error = borde y halo rojos + mensaje con ícono (`.field-error`); ayuda debajo (`.hint`); deshabilitado y solo lectura con fondo `--surface-2`, sin opacidad. Etiqueta arriba (13 px, 600).
- **Select**: flecha propia (chevron Lucide) a 12 px del borde, con espacio reservado para el texto; gris en reposo, más oscura en hover, cian con foco. Fecha y hora alinean su ícono igual. Buscador con lupa a la izquierda dentro del campo. Casillas y radios de 18 px en `--accent-indicator`.
- **Tablas**: encabezado `--surface-2`, 12 px 600; filas de 44 px; hover `--surface-2`; seleccionada `--accent-soft` + barra `--accent-indicator`; números a la derecha y tabulares; códigos en monoespaciada.
- **Pestañas**: indicador activo = barra de 2 px en `--accent-indicator`.
- **Foco**: siempre visible (`:focus-visible`), 2 px `--focus-ring` con 2 px de separación, en todo elemento interactivo.

---

## 9. Gráficos

- Serie principal en el color de producto (`--chart-1`), con relleno degradado (25% → 0%).
- Paleta categórica **ordenada para máxima distinción** (no hay dos tonos de la misma familia en series adyacentes; ningún azul/celeste junto al cian), con valores por tema para mantener ≥ 3:1 contra el fondo:
  - Oscuro: `#22D3EE` · `#F59E0B` · `#A78BFA` · `#F472B6` · `#4ADE80` · `#94A3B8`
  - Claro: `#0891B2` · `#B45309` · `#7C3AED` · `#DB2777` · `#15803D` · `#64748B`
- Máximo 6 series por gráfico; el resto se agrupa en “Otros”.
- Siempre leyenda o etiqueta directa; valores en tooltips y, en barras, sobre la barra cuando entran.
- Positivo/negativo con signo o ícono además del color. Las líneas de distintas series pueden diferenciarse también por trazo (continuo/punteado).

---

## 10. Reglas de uso del color

1. Proporción aproximada 80 / 15 / 5: neutros / superficies y texto / color de producto.
2. Una sola acción primaria por vista.
3. Nunca texto blanco sobre cian ni sobre verde: texto `--on-accent` (`#0A0B0D`).
4. En tema claro, el texto cian usa `--accent-text` (`#0E7490`) y los indicadores `--accent-indicator` (`#0891B2`); `#22D3EE` solo como relleno con texto oscuro.
5. Verde Velatrix y degradado de marca: solo marca institucional (logotipo, recursos corporativos). Nunca en botones, navegación ni fondos de datos de Clinic.
6. Curvas de luz y partículas: solo login, onboarding y estados vacíos, con baja opacidad.
7. El color nunca es el único portador de información.
8. Los colores funcionales (éxito, advertencia, error, información) nunca se reemplazan por el color de producto.

---

## 11. Ediciones y especialidades (Clinic)

- **Clinic** está pensada para **clínicas generales**: pacientes, agenda, profesionales, historia clínica, tratamientos, facturación.
- Las funcionalidades de especialidad son **módulos activables**: el **odontograma** (y lo específicamente odontológico) solo aparece en clínicas con especialidad odontológica.
- Agregar una edición = elegir su color de edición y su vocabulario (plantilla de rubro). El resto del sistema no cambia.

---

## 12. Accesibilidad

- Contraste mínimo 4.5:1 en texto, 3:1 en componentes y foco (WCAG 2.2 AA). Valores verificados: texto oscuro sobre `#22D3EE` 10,9:1; `#0E7490` sobre blanco 5,4:1; foco/indicador claro `#0891B2` sobre blanco 3,7:1; cian sobre `#111317` 10,3:1; `#4B5563` sobre blanco 7,6:1; `#9CA3AF` sobre `#0A0B0D` 7,7:1; insignia del menú (blanco sobre `#DC2626`) 4,8:1.
- La opacidad no se usa para atenuar texto ni estados: se usan tokens de color.
- Respetar `prefers-reduced-motion`.
- Áreas táctiles de 36 px mínimo (40 px en el punto de venta).
