# Velatrix One — Sistema de diseño

> Fuente de verdad visual de Velatrix One y sus ediciones (Clinic, Workshop, Retail…).
> Identidad de origen: `docs/velatrix-brand-reference.png`. Implementación: `apps/web/src/design-system/`.
> Aprobado el 2026-11-18. Cualquier cambio de criterio se registra acá antes de implementarse.

---

## 1. Principios

1. **La marca enmarca, los datos protagonizan.** Identidad fuerte en el marco (menú, login, onboarding); sobriedad en las pantallas de trabajo.
2. **El verde Velatrix es un acento, no un relleno.** Acción principal, elemento activo, foco, dato destacado.
3. **Nada depende solo del color.** Todo estado lleva texto e ícono; todo gráfico, leyenda o etiqueta.
4. **Accesible por defecto.** Contraste WCAG AA, foco siempre visible, todo usable con teclado.
5. **Una sola identidad, ediciones con matices.** El color de edición es estrictamente secundario.

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
| Éxito | `#00824A` / `#E6FDF1` | `#1FE884` / `rgb(0 230 118 / .12)` |
| Advertencia | `#B45309` / `#FEF3C7` | `#FBBF24` / `rgb(251 191 36 / .12)` |
| Peligro | `#DC2626` / `#FEE2E2` | `#F87171` / `rgb(248 113 113 / .12)` |
| Información | `#0369A1` / `#E0F2FE` | `#38BDF8` / `rgb(56 189 248 / .12)` |
| En curso | `#6D28D9` / `#EDE9FE` | `#C4B5FD` / `rgb(167 139 250 / .14)` |

### Colores de edición (estrictamente secundarios)
| Edición | Color | Permitido | **Prohibido** |
|---|---|---|---|
| Clinic | `#22D3EE` | nombre de edición junto a la marca, ilustraciones de estados vacíos/onboarding, detalle de ícono | acciones principales, navegación activa, foco, identidad de marca, estados |
| Workshop | `#FB923C` | ídem | ídem |
| Retail | `#A78BFA` | ídem | ídem |

---

## 4. Tokens semánticos

Definidos en `design-system/tokens.css`. Los componentes **solo** usan tokens, nunca HEX directos.

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` | `#F8FAFC` | `#0A0B0D` |
| `--surface` | `#FFFFFF` | `#111317` |
| `--surface-2` | `#F1F4F7` | `#1A1B1E` |
| `--surface-3` | `#FFFFFF` (+sombra) | `#22252A` |
| `--border` / `--border-strong` | `#E2E6EB` / `#CBD2DB` | `#26282D` / `#2E3138` |
| `--text` / `--text-muted` / `--text-subtle` | `#0A0B0D` / `#4B5563` / `#6B7280` | `#F8FAFC` / `#9CA3AF` / `#8B93A1` |
| `--accent` / `--accent-hover` / `--on-accent` | `#00E676` / `#00C764` / `#0A0B0D` | `#00E676` / `#1FE884` / `#0A0B0D` |
| `--accent-text` | `#00824A` | `#00E676` |
| `--accent-soft` | `#E6FDF1` | `rgb(0 230 118 / .10)` |
| `--focus-ring` | `#00A353` | `#00E676` |
| `--sidebar-*` | oscuro en **ambos** temas (`#0A0B0D`) | ídem |
| `--radius-sm/md/lg` | 6 / 10 / 14 px | ídem |

---

## 5. Apariencia

Tres preferencias: **Claro**, **Oscuro**, **Automático (según el sistema operativo)**. Por defecto: Automático.
La preferencia se guarda por usuario en el dispositivo y se aplica antes del primer render (sin parpadeo).
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
| Confirmado | Información (celeste) | check en círculo | Turno confirmado, presupuesto aprobado, venta confirmada |
| En atención / en curso | En curso (violeta) | actividad | Orden en reparación, en diagnóstico, en atención |
| Finalizado | Éxito (verde) | doble check | Turno completado, venta pagada, orden entregada / lista |
| Cancelado | Neutro (gris) | círculo con cruz | Cancelado, anulado, descartado |
| Problema | Peligro (rojo) | alerta | Ausente, pago rechazado, stock insuficiente |

El estado “En atención” para turnos (paciente en consulta) no existe todavía en el modelo; cuando se agregue usa la categoría En curso.

---

## 8. Componentes

- **Menú lateral**: oscuro siempre; grupos *Operación / Gestión / Configuración*; ítem activo = texto verde + barra izquierda de 3 px + fondo verde al 10%; colapsable a íconos.
- **Botones**: primario (verde, texto negro, **uno por vista**), secundario (borde), terciario (texto), peligro (rojo). Estados: hover, presionado, foco (anillo de 2 px con separación), deshabilitado.
- **Deshabilitado**: **sin opacidad general**. Fondo `--surface-2`, texto `--text-subtle`, borde `--border`, cursor no permitido. Sigue siendo legible.
- **Tarjetas / KPI**: borde + (claro) sombra suave; cifra en Space Grotesk; variación con signo y color; la tarjeta destacada de una vista puede llevar una línea superior de 2 px con el degradado de marca (único uso del degradado dentro de la app).
- **Formularios** (estilo “delineado refinado”, aprobado 2026-11-18): campos de 40 px, radio 8 px, margen lateral 12 px, borde `--input-border` (3:1) y sombra interna leve; en oscuro el campo es más oscuro que la tarjeta (`--field-bg`). Hover = borde más oscuro; foco = borde verde + halo verde de 3 px; error = borde y halo rojos + mensaje con ícono (`.field-error`); ayuda debajo (`.hint`); deshabilitado y solo lectura con fondo `--surface-2`, sin opacidad. Etiqueta arriba (13 px, 600).
- **Select**: flecha propia (chevron Lucide) a 12 px del borde, con espacio reservado para el texto; gris en reposo, más oscura en hover, verde con foco. Fecha y hora alinean su ícono igual. Buscador con lupa a la izquierda dentro del campo. Casillas y radios de 18 px en verde de marca.
- **Tablas**: encabezado `--surface-2`, 12 px 600; filas de 44 px; hover `--surface-2`; seleccionada `--accent-soft` + barra verde; números a la derecha y tabulares; códigos en monoespaciada.
- **Pestañas**: indicador activo = barra verde de 2 px (eco de la barra de acento de la marca).
- **Foco**: siempre visible (`:focus-visible`), 2 px `--focus-ring` con 2 px de separación, en todo elemento interactivo.

---

## 9. Gráficos

- Serie principal en verde de marca, con relleno degradado (25% → 0%).
- Paleta categórica **ordenada para máxima distinción** (no se usan dos tonos de la misma familia en series adyacentes):
  `#00E676` · `#38BDF8` · `#F59E0B` · `#A78BFA` · `#F472B6` · `#94A3B8`. El verde azulado no se usa junto al verde.
- Máximo 6 series por gráfico; el resto se agrupa en “Otros”.
- Siempre leyenda o etiqueta directa; valores en tooltips y, en barras, sobre la barra cuando entran.
- Positivo/negativo con signo o ícono además del color. Las líneas de distintas series pueden diferenciarse también por trazo (continuo/punteado).

---

## 10. Reglas de uso del color

1. Proporción aproximada 80 / 15 / 5: neutros / superficies y texto / verde.
2. Una sola acción primaria verde por vista.
3. Nunca texto blanco sobre verde.
4. En tema claro, el texto verde usa `--accent-text` (`#00824A`); `#00E676` solo para rellenos, íconos grandes y detalles.
5. Degradado de marca: logo, login/onboarding, línea de la tarjeta destacada. Nunca en botones ni fondos de datos.
6. Curvas de luz y partículas: solo login, onboarding y estados vacíos, con baja opacidad.
7. El color nunca es el único portador de información.
8. El color de edición nunca reemplaza al verde Velatrix.

---

## 11. Ediciones y especialidades (Clinic)

- **Clinic** está pensada para **clínicas generales**: pacientes, agenda, profesionales, historia clínica, tratamientos, facturación.
- Las funcionalidades de especialidad son **módulos activables**: el **odontograma** (y lo específicamente odontológico) solo aparece en clínicas con especialidad odontológica.
- Agregar una edición = elegir su color de edición y su vocabulario (plantilla de rubro). El resto del sistema no cambia.

---

## 12. Accesibilidad

- Contraste mínimo 4.5:1 en texto, 3:1 en componentes y foco. Valores verificados: verde de marca sobre negro 11.8:1; `#00824A` sobre blanco 4.9:1; `#4B5563` sobre blanco 7.6:1; `#9CA3AF` sobre `#0A0B0D` 7.7:1; foco claro `#00A353` sobre blanco 3.3:1.
- La opacidad no se usa para atenuar texto ni estados: se usan tokens de color.
- Respetar `prefers-reduced-motion`.
- Áreas táctiles de 36 px mínimo (40 px en el punto de venta).
