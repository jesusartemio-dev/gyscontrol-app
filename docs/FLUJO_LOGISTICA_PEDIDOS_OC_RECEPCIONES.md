# Flujo de Logística: Pedidos → OC / Requerimiento de Dinero → Recepciones

> Documento de referencia del flujo completo de aprovisionamiento en GySControl.

---

## Tabla de Contenidos

1. [Resumen del Flujo](#1-resumen-del-flujo)
2. [Modelos de Datos](#2-modelos-de-datos)
3. [Fase 1 — Creación del Pedido](#3-fase-1--creación-del-pedido)
4. [Fase 2A — Atención por OC](#4-fase-2a--atención-por-oc)
5. [Fase 2B — Atención por Requerimiento de Dinero](#5-fase-2b--atención-por-requerimiento-de-dinero)
6. [Fase 3 — Ciclo de Vida de la OC](#6-fase-3--ciclo-de-vida-de-la-oc)
7. [Fase 4 — Recepción Física](#7-fase-4--recepción-física)
8. [Fase 5 — Entrega al Proyecto](#8-fase-5--entrega-al-proyecto)
9. [Casos Especiales](#9-casos-especiales)
10. [Máquinas de Estado](#10-máquinas-de-estado)
11. [Control de Acceso por Rol](#11-control-de-acceso-por-rol)
12. [Reglas de Negocio](#12-reglas-de-negocio)

---

## 1. Resumen del Flujo

Un item de pedido puede atenderse por **dos caminos mutuamente excluyentes**:

```
[Proyectos] Crea Pedido
      │
      ▼
[Logística] Revisa y asigna proveedores
      │
      ├──► CAMINO A: Orden de Compra (OC)
      │         │
      │         ├─ Generar OCs automáticamente desde pedido (agrupa por proveedor)
      │         └─ Crear OC manual
      │               │
      │               ▼
      │         OC: borrador → aprobada → enviada → confirmada
      │                                                  │
      │                                   ┌─────────────┤
      │                                   │             │
      │                          requiereRecepcion=true  =false
      │                                   │             │
      │                                   ▼             ▼
      │                            Registrar        completada
      │                            Recepción
      │                                   │
      │                     RecepcionPendiente (fuente=OC)
      │
      └──► CAMINO B: Requerimiento de Dinero (REQ)
                │  (empleado compra directamente con efectivo/anticipo)
                │
                ▼
          HojaDeGastos (compra_materiales):
          borrador → enviado → aprobado → depositado → rendido → validado → cerrado
                                                                              │
                                                              RecepcionPendiente (fuente=REQ)

──────────── FLUJO COMÚN DE RECEPCIÓN ────────────

RecepcionPendiente (fuente: OC o REQ)
      │
      ▼ [/logistica/recepciones]
  pendiente
      │
      ├──► rechazado
      │
      ▼
  en_almacen
      │
      ▼
  entregado_proyecto
      │
      ▼
  PedidoEquipoItem.cantidadAtendida += cantidadRecibida
  PedidoEquipo.estado recalculado (parcial / entregado)
```

---

## 2. Modelos de Datos

### PedidoEquipo (Solicitud de compra)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigo` | String (único) | Código automático: PED-001 |
| `estado` | EstadoPedido | Ver máquina de estado |
| `proyectoId` | FK | Proyecto que solicita |
| `responsableId` | FK | Usuario solicitante |
| `fechaNecesaria` | DateTime | Cuándo necesita el material |
| `fechaEntregaEstimada` | DateTime? | Estimado por logística |
| `fechaEntregaReal` | DateTime? | Real cuando todo fue entregado |
| `esUrgente` | Boolean | Bandera de urgencia |
| `prioridad` | String? | baja / media / alta / critica |

### PedidoEquipoItem (Línea del pedido)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigo, descripcion, unidad` | String | Descripción del material |
| `cantidadPedida` | Float | Lo que solicita proyectos |
| `cantidadAtendida` | Float? | Acumulado recibido/entregado al proyecto |
| `estado` | EstadoPedidoItem | Ver máquina de estado |
| `estadoEntrega` | EstadoEntregaItem | Seguimiento de entrega física |
| `proveedorId` | FK? | Proveedor asignado |
| `tiempoEntregaDias` | Int? | Días estimados de entrega |
| `ordenCompraItems` | Rel | OCs que cubren este item |
| `requerimientoMaterialItems` | Rel | REQs que cubren este item |

### OrdenCompra

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `numero` | String (único) | Formato: OC-YYMMDD-### |
| `estado` | EstadoOrdenCompra | Ver máquina de estado |
| `proveedorId` | FK | Proveedor (requerido) |
| `proyectoId` ó `centroCostoId` | FK | Excluyentes entre sí (uno es requerido) |
| `pedidoEquipoId` | FK? | Pedido origen (si aplica) |
| `requiereRecepcion` | Boolean | Si necesita confirmación física |
| `moneda` | String | PEN / USD |
| `subtotal, igv, total` | Float | IGV = 18% |

### OrdenCompraItem

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pedidoEquipoItemId` | FK? | Trazabilidad al item del pedido |
| `cantidad` | Float | Cantidad ordenada |
| `cantidadRecibida` | Float | Acumulado recibido (default 0) |
| `precioUnitario, costoTotal` | Float | Precio acordado |

### HojaDeGastos (Requerimiento de dinero)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `numero` | String (único) | Formato: REQ-YYMMDD-### |
| `estado` | EstadoHojaGastos | Ver máquina de estado |
| `tipoPropósito` | Enum | `compra_materiales` / `gastos_viaticos` |
| `proyectoId` ó `centroCostoId` | FK | Destino de imputación |
| `empleadoId` | FK | Quien ejecuta la compra |
| `montoAnticipo` | Float | Dinero adelantado |
| `montoDepositado` | Float | Depositado efectivamente |
| `montoGastado` | Float | Calculado en vivo desde líneas |
| `itemsMateriales` | Rel | Items del pedido incluidos (RequerimientoMaterialItem) |
| `comprobantes` | Rel | Facturas/boletas registradas (GastoComprobante) |
| `lineas` | Rel | Líneas de gasto individuales (GastoLinea) |

### RequerimientoMaterialItem (Snapshot del item en el REQ)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `hojaDeGastosId` | FK | REQ al que pertenece |
| `pedidoEquipoItemId` | FK | Item del pedido original |
| `pedidoId` | FK | Pedido origen |
| `proyectoId` | FK | Proyecto de imputación |
| `codigo, descripcion, unidad` | String | Snapshot al momento de crear el REQ |
| `cantidadSolicitada` | Float | Cantidad a comprar |
| `precioEstimado / precioReal` | Float? | Estimado vs real (se carga al subir comprobante) |
| `totalEstimado / totalReal` | Float? | Totales calculados |
| `recepciones` | Rel | RecepcionPendiente generadas al cerrar el REQ |

### RecepcionPendiente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `estado` | EstadoRecepcion | pendiente → en_almacen → entregado_proyecto / rechazado |
| `cantidadRecibida` | Float | Cantidad en esta recepción |
| `fechaRecepcion` | DateTime | Cuando llegó al almacén |
| `ordenCompraItemId` | FK? | Fuente: OC (mutuamente excluyente con REQ) |
| `requerimientoMaterialItemId` | FK? | Fuente: REQ (mutuamente excluyente con OC) |
| `pedidoEquipoItemId` | FK? | Item del pedido que se actualiza al confirmar entrega |
| `confirmadoPorId` | FK? | Quien confirma calidad en almacén |
| `entregadoPorId` | FK? | Quien lleva al proyecto |
| `motivoRechazo` | String? | Razón del rechazo |

---

## 3. Fase 1 — Creación del Pedido

**Actores:** Usuario de proyectos, jefe de proyecto

**Ruta UI:** `/logistica/pedidos` → "Nuevo Pedido"

### Pasos:
1. Crear `PedidoEquipo` con proyecto, fecha necesaria, items y urgencia.
2. El pedido inicia en estado **`borrador`** — editable libremente.
3. Al estar listo: **Enviar pedido** → estado `enviado`. Notifica a logística.

> **Regla:** El proveedor puede venir de la Lista de Equipos/Cotización o dejarse en blanco.

### Vista del pedido (`/logistica/pedidos/[id]`)

La tabla de items muestra en la columna **Proveedor/Gestión** el camino activo de cada item:
- `🛒 OC-0042` — link azul si tiene OC activa
- `REQ-260326-002 · depositado` — badge con link si tiene requerimiento de dinero activo (color según estado)
- `Sin OC` / `Directo` / `Importación` — si fue atendido por otro método

---

## 4. Fase 2A — Atención por OC

**Actores:** logístico, coordinador_logístico

**Ruta UI:** `/logistica/pedidos/[pedidoId]`

### Cuándo usar este camino
- El proveedor emite factura formal a la empresa.
- La compra requiere proceso de aprobación interna.
- El pago se procesa por cuentas por pagar (CxP), no en efectivo.

### Pasos:
1. Asignar proveedores a items sin proveedor.
2. Generar OCs de dos maneras:

#### Opción A — Generar automáticamente desde el pedido
- Click en **"Generar OCs"** → modal con items elegibles.
- Items sin proveedor o con OC activa se excluyen automáticamente.
- Click en **"Ir a crear OC"** → navega a `/ordenes-compra/nueva` con items pre-cargados.

#### Opción B — Crear OC manual
- Ir a `/logistica/ordenes-compra/nueva`.
- Usar **"Desde Pedidos"** para importar items de un pedido existente.

> **Elegibilidad para OC:** Item sin OC activa y sin requerimiento activo (estados: aprobado/depositado/rendido/validado/cerrado).

---

## 5. Fase 2B — Atención por Requerimiento de Dinero

**Actores:** empleados del proyecto, coordinadores

**Ruta UI:** `/gastos/mis-requerimientos/nuevo`

### Cuándo usar este camino
- El empleado compra directamente en tienda con efectivo o anticipo.
- No hay tiempo o conveniencia para una OC formal.
- OC previa fue cancelada y se necesita recomprar.

### Pasos:
1. Crear nueva HojaDeGastos con `tipoPropósito = compra_materiales`.
2. Agregar items del pedido: el modal muestra solo items **sin OC activa** y **sin REQ activo**.
3. Cada item seleccionado crea un `RequerimientoMaterialItem` (snapshot con cantidad, precio estimado, proyecto).
4. Enviar para aprobación.

### Ciclo de vida del REQ:
```
borrador → enviado → aprobado → depositado → rendido → validado → cerrado
```

| Estado | Descripción |
|--------|-------------|
| `borrador` | En edición, puede agregar/quitar items |
| `enviado` | Enviado para aprobación del gerente |
| `aprobado` | Aprobado, pendiente de depósito del anticipo |
| `depositado` | Dinero depositado al empleado; puede subir comprobantes |
| `rendido` | Empleado subió todos los comprobantes y rindió cuentas |
| `validado` | Finanzas validó la rendición |
| `cerrado` | Cierre definitivo — se crean las RecepcionPendiente automáticamente |

### Rendición (estado `depositado`):
- El empleado sube comprobantes (`GastoComprobante`: factura, boleta, ticket).
- Cada comprobante genera `GastoLinea` con monto y proyecto de imputación.
- Los items del requerimiento muestran badge con el comprobante que los cubre.
- El total gastado se calcula en vivo desde las líneas.

### Al cerrar el REQ:
- El sistema crea automáticamente una `RecepcionPendiente` por cada `RequerimientoMaterialItem`.
- `cantidadRecibida = cantidadSolicitada`, estado inicial: `pendiente`.
- El almacenero ve estas recepciones en `/logistica/recepciones` identificadas con badge **REQ**.

---

## 6. Fase 3 — Ciclo de Vida de la OC

**Ruta UI:** `/logistica/ordenes-compra/[id]`

### Estados y transiciones:
```
borrador ──► aprobada ──► enviada ──► confirmada ──► parcial ──► completada
   │             │                        │
   └─ cancelada  └─ cancelada        ─────┘ (recepcion o completar-sin-recepcion)
```

| Estado | Acciones disponibles |
|--------|---------------------|
| `borrador` | Aprobar, Cancelar |
| `aprobada` | Enviar al proveedor, Retroceder a borrador |
| `enviada` | Confirmar, Retroceder a aprobada |
| `confirmada` | Registrar Recepción (si requiereRecepcion=true) o Completar, Retroceder |
| `parcial` | Registrar más recepciones, Retroceder a confirmada |
| `completada` | Solo lectura |
| `cancelada` | Terminal — libera items para REQ |

> **Efecto al confirmar OC:** propaga `precioUnitario` al `CatálogoEquipo` como precio real.

---

## 7. Fase 4 — Recepción Física

**Ruta UI:** `/logistica/recepciones`

La página muestra recepciones de **ambos orígenes** con badge identificador:

| Badge | Color | Origen | Link |
|-------|-------|--------|------|
| `OC` | Azul | OrdenCompra | → detalle de la OC |
| `REQ` | Morado | HojaDeGastos | → detalle del requerimiento |
| `Directo` | Gris | PedidoEquipoItem | → detalle del pedido |

### Creación de RecepcionPendiente según origen:

**Desde OC:**
- En OC confirmada/parcial: click en **"Registrar Recepción"**.
- Ingresar cantidad recibida por item.
- Solo se crean recepciones si la OC tiene `proyectoId`.

**Desde REQ:**
- Se crean automáticamente al cerrar la HojaDeGastos.
- `cantidadRecibida = RequerimientoMaterialItem.cantidadSolicitada`.

### Flujo de la Recepción Pendiente:

| Paso | Estado | Actor | Acción |
|------|--------|-------|--------|
| 1 | `pendiente` | Almacenero | Confirmar llegada al almacén → `en_almacen` |
| 1b | `pendiente` | Almacenero | Rechazar (dañado, incorrecto) → `rechazado` |
| 2 | `en_almacen` | Responsable | Entregar al proyecto → `entregado_proyecto` |

---

## 8. Fase 5 — Entrega al Proyecto

Cuando una `RecepcionPendiente` pasa a `entregado_proyecto` (independiente del origen):

1. Se registra `entregadoPorId` y `fechaEntregaProyecto`.
2. Se actualiza `PedidoEquipoItem`:
   - `cantidadAtendida += recepcion.cantidadRecibida`
   - `estadoEntrega` → derivado de cantidadAtendida vs cantidadPedida
   - `estado` → sincronizado con estadoEntrega
   - `fechaEntregaReal = now()`
3. Se crea registro `EntregaItem`.
4. Se evalúa `PedidoEquipo`:
   - Todos los items `entregado` → `PedidoEquipo.estado = entregado`
   - Algunos → `PedidoEquipo.estado = parcial`

---

## 9. Casos Especiales

### 9.1 Exclusividad OC ↔ REQ

Un item de pedido solo puede estar en **un camino activo** a la vez:

- Item con OC activa → **no aparece** en el selector de items para REQ.
- Item con REQ activo (aprobado/depositado/rendido/validado/cerrado) → **no aparece** para crear OC ni nuevo REQ.
- Item con REQ en borrador/enviado/rechazado → puede re-agregarse a otro REQ.
- OC cancelada → el item queda libre para crear REQ.

### 9.2 OC Sin Recepción (`requiereRecepcion = false`)
- Para servicios, suscripciones, bienes digitales.
- Flujo: `confirmada` → click "Completar" → `completada`. No crea RecepcionPendiente.

### 9.3 OC a Centro de Costo (sin proyecto)
- No crea `RecepcionPendiente` (no hay proyecto al que entregar).
- Flujo de recepción solo actualiza `cantidadRecibida` en los items.

### 9.4 Recepción Parcial
- Item pedido: 100 unidades. Llegaron 60 hoy.
- OC pasa a `parcial`. Se registran más recepciones cuando llegue el resto.
- Cuando `cantidadRecibida >= cantidad` en todos los items → OC `completada`.

### 9.5 Múltiples proveedores desde un pedido
- Pedido con items de 3 proveedores → se crea **una OC por proveedor**.
- En el modal del pedido: seleccionar items → "Ir a crear OC" → repetir por proveedor.

### 9.6 Rollback de recepciones
| Acción | Desde | Hasta | Efecto |
|--------|-------|-------|--------|
| Retroceder | `en_almacen` | `pendiente` | Sin efecto en cantidades |
| Retroceder entrega | `entregado_proyecto` | `en_almacen` | Elimina EntregaItem, decrementa cantidadAtendida |
| Revertir rechazo | `rechazado` | `pendiente` | Reactiva la recepción |
| Rechazar desde almacén | `en_almacen` | `rechazado` | Si viene de OC: decrementa cantidadRecibida en OrdenCompraItem |

### 9.7 Rechazo en almacén
- `RecepcionPendiente.estado → rechazado`.
- Si viene de OC: decrementa `OrdenCompraItem.cantidadRecibida`.
- Workflow manual: contactar proveedor, crear nueva OC o REQ según corresponda.

---

## 10. Máquinas de Estado

### PedidoEquipo
```
borrador → enviado → atendido → parcial → entregado
                ↓
           cancelado
```

### OrdenCompra
```
borrador → aprobada → enviada → confirmada → parcial → completada
   ↓           ↓
cancelada   cancelada
```

### HojaDeGastos (compra_materiales)
```
borrador → enviado → aprobado → depositado → rendido → validado → cerrado
    ↑                    ↓
rechazado ←──────────────┘
```

### RecepcionPendiente
```
pendiente → en_almacen → entregado_proyecto
    ↓            ↓
rechazado    rechazado
```

---

## 11. Control de Acceso por Rol

| Acción | Roles requeridos |
|--------|-----------------|
| Crear pedido | Cualquier usuario autenticado |
| Enviar pedido | Responsable del pedido, admin, gerente |
| Ver todos los pedidos | admin, gerente, logistico, coordinador_logistico |
| Crear OC | admin, gerente, logistico, coordinador_logistico, administracion |
| Aprobar / Enviar / Confirmar OC | admin, gerente, logistico, coordinador_logistico, administracion |
| Registrar recepción (desde OC) | admin, gerente, logistico, coordinador_logistico, administracion |
| Crear REQ | Cualquier usuario autenticado |
| Aprobar REQ | admin, gerente |
| Depositar anticipo REQ | admin, gerente, administracion |
| Subir comprobantes REQ | Empleado dueño del REQ |
| Validar rendición REQ | admin, gerente, administracion |
| Cerrar REQ (crea recepciones) | admin, gerente, administracion |
| Confirmar recepción en almacén | admin, gerente, logistico, coordinador_logistico |
| Entregar a proyecto | admin, gerente, logistico, coordinador_logistico, gestor, coordinador |
| Rechazar recepción | admin, gerente, logistico, coordinador_logistico, gestor |
| Retroceder / Revertir recepción | admin, gerente |
| Eliminar recepción | admin |

---

## 12. Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| **Exclusividad OC ↔ REQ** | Un item solo puede tener un camino activo: OC activa OR REQ activo. No ambos simultáneamente |
| **OC cancelada libera item** | Al cancelar una OC, sus items quedan elegibles para crear REQ |
| **REQ solo en borrador/rechazado es re-elegible** | Un item con REQ en borrador, enviado o rechazado puede agregarse a otro REQ |
| **Exclusividad proyecto/CC** | Una OC o REQ debe tener exactamente `proyectoId` OR `centroCostoId`, nunca ambos ni ninguno |
| **Solo borrador editable** | Items y campos de OC/REQ solo modificables en estado borrador |
| **Cancelación OC limitada** | Solo desde borrador o aprobada. Desde enviada: usar retroceder primero |
| **RecepcionPendiente solo para proyectos (OC)** | Si la OC es para centro de costo, no se crean recepciones |
| **REQ cerrado crea recepciones** | Al cerrar una HojaDeGastos, el sistema genera RecepcionPendiente por cada item automáticamente |
| **cantidadAtendida solo sube al entregar** | El campo `PedidoEquipoItem.cantidadAtendida` solo se incrementa al pasar a `entregado_proyecto`, no al crear la recepción |
| **Sin duplicados activos** | No puede haber dos RecepcionPendiente activas para el mismo item en un mismo estado |
| **Precio real al catálogo** | Al confirmar OC, `precioUnitario` se propaga al `CatálogoEquipo`. Para REQ, `precioReal` se carga al subir el comprobante |
| **Items sin proveedor excluidos de OC** | Al generar OCs automáticamente, items sin proveedor se omiten |

---

## Páginas del Sistema

| Ruta | Descripción |
|------|-------------|
| `/logistica/pedidos` | Listado de pedidos con filtros y estadísticas |
| `/logistica/pedidos/[id]` | Detalle: items con su gestión activa (OC o REQ), generar OCs |
| `/logistica/ordenes-compra` | Listado de OCs con filtros, exportar/importar Excel |
| `/logistica/ordenes-compra/nueva` | Crear OC: proveedor, items (catálogo / manual / desde pedidos) |
| `/logistica/ordenes-compra/[id]` | Detalle OC: estado stepper, acciones, items, CxP |
| `/logistica/recepciones` | Confirmar, entregar o rechazar recepciones (origen OC o REQ) |
| `/gastos/mis-requerimientos` | Listado de requerimientos de dinero del empleado |
| `/gastos/mis-requerimientos/nuevo` | Crear REQ: seleccionar items de pedidos, tipo propósito |
| `/gastos/mis-requerimientos/[id]` | Detalle REQ: items, comprobantes, líneas de gasto, estado |

---

*Última actualización: Marzo 2026*
