# 📋 Funcionalidades que se Perderán - Sistema de Aprovisionamiento

## 🎯 Resumen Ejecutivo

Este documento detalla todas las funcionalidades que se perderán con la eliminación del sistema de aprovisionamiento, incluyendo los modelos `OrdenCompra`, `Recepcion`, `Pago`, `AprovisionamientoFinanciero` e `HistorialAprovisionamiento`.

**Fecha de análisis:** $(Get-Date -Format "yyyy-MM-dd")
**Estado:** Documentación para FASE 1 - Preparación

---

## 🏗️ Modelos y Entidades que se Eliminarán

### 1. **OrdenCompra** - Gestión de Órdenes de Compra

#### Funcionalidades Principales:
- **Generación automática de números PO** (formato: PO-YYYY-NNNN)
- **Estados de workflow**: BORRADOR → ENVIADA → APROBADA → COMPLETADA/CANCELADA
- **Gestión de proveedores** y términos de entrega
- **Cálculos automáticos** de montos totales
- **Seguimiento de fechas** (creación, requerida, entrega, seguimiento)
- **Sistema de aprobaciones** con usuarios responsables
- **Soporte multi-moneda** (PEN/USD)
- **Prioridades de orden** (BAJA, NORMAL, ALTA, URGENTE, CRÍTICA)

#### Campos y Datos que se Perderán:
```prisma
- id, numero, pedidoEquipoId, proveedorId
- estado, prioridad, fechaCreacion, fechaRequerida
- fechaEntrega, fechaSeguimiento, montoTotal, moneda
- terminosEntrega, condicionesPago, observaciones
- creadoPor, aprobadoPor, fechaAprobacion
- createdAt, updatedAt
```

#### Relaciones Perdidas:
- Conexión con `PedidoEquipo` (transferencia automática)
- Relación con `Proveedor` para gestión de compras
- Items detallados (`OrdenCompraItem`)
- Recepciones generadas (`Recepcion[]`)
- Pagos originados (`Pago[]`)
- Aprovisionamientos consolidados (`AprovisionamientoFinanciero[]`)
- Historial de cambios (`HistorialAprovisionamiento[]`)

---

### 2. **OrdenCompraItem** - Detalles de Items por Orden

#### Funcionalidades Principales:
- **Gestión detallada de productos** por orden de compra
- **Control de cantidades** solicitadas vs. recibidas vs. pagadas
- **Precios unitarios** y cálculos de subtotales
- **Conexión con catálogo** de productos
- **Trazabilidad** desde pedido hasta pago

#### Campos que se Perderán:
```prisma
- id, ordenCompraId, pedidoEquipoItemId, productoId
- cantidad, cantidadRecibida, cantidadPagada
- precioUnitario, subtotal, observaciones
- createdAt, updatedAt
```

---

### 3. **Recepcion** - Gestión de Recepciones de Mercadería

#### Funcionalidades Principales:
- **Proceso de recepción** de mercadería contra órdenes de compra
- **Estados de recepción**: PENDIENTE → PARCIAL → COMPLETA → RECHAZADA
- **Tipos de recepción**: NORMAL, URGENTE, DEVOLUCIÓN, EMERGENCIA
- **Sistema de inspección** con responsables
- **Control de calidad** y conformidad
- **Documentación** de recepciones (números, fechas, observaciones)

#### Campos que se Perderán:
```prisma
- id, numero, ordenCompraId, estado, tipo
- fechaRecepcion, fechaInspeccion, estadoInspeccion
- observaciones, observacionesInspeccion
- responsableRecepcionId, responsableInspeccionId
- createdAt, updatedAt
```

#### Flujos de Trabajo Perdidos:
- **Recepción parcial** de órdenes de compra
- **Inspección de calidad** con aprobación/rechazo
- **Devoluciones** por no conformidad
- **Trazabilidad** de productos recibidos

---

### 4. **RecepcionItem** - Detalles de Items Recibidos

#### Funcionalidades Principales:
- **Control granular** de cantidades recibidas por producto
- **Estados de inspección** por item individual
- **Observaciones específicas** por producto recibido
- **Conexión** con items de orden de compra

#### Campos que se Perderán:
```prisma
- id, recepcionId, ordenCompraItemId
- cantidadRecibida, estadoInspeccion
- observaciones, createdAt, updatedAt
```

---

### 5. **Pago** - Gestión de Pagos a Proveedores

#### Funcionalidades Principales:
- **Procesamiento de pagos** contra órdenes de compra y recepciones
- **Tipos de pago**: CONTADO, CRÉDITO_30/60/90, TRANSFERENCIA, CHEQUE
- **Estados de pago**: PENDIENTE → PROCESADO → COMPLETADO → CANCELADO
- **Control de fechas** de vencimiento y pago
- **Gestión de adelantos** y pagos parciales
- **Sistema de aprobaciones** financieras

#### Campos que se Perderán:
```prisma
- id, numero, ordenCompraId, recepcionId
- tipo, estado, monto, moneda
- fechaVencimiento, fechaPago, referencia
- observaciones, aprobadoPor, fechaAprobacion
- createdAt, updatedAt
```

#### Flujos Financieros Perdidos:
- **Flujo de caja** proyectado
- **Control de vencimientos** de pagos
- **Gestión de adelantos** a proveedores
- **Conciliación** de pagos vs. recepciones

---

### 6. **PagoItem** - Detalles de Pagos por Item

#### Funcionalidades Principales:
- **Pagos detallados** por producto/item
- **Control de montos** pagados vs. pendientes
- **Trazabilidad financiera** completa

#### Campos que se Perderán:
```prisma
- id, pagoId, ordenCompraItemId
- montoPagado, observaciones
- createdAt, updatedAt
```

---

### 7. **AprovisionamientoFinanciero** - Consolidación Financiera

#### Funcionalidades Principales:
- **Vista consolidada** del proceso completo de aprovisionamiento
- **Estados integrados**: PLANIFICADO → EN_PROCESO → COMPLETADO → CANCELADO
- **Control financiero** de montos totales, recibidos y pagados
- **Seguimiento temporal** de inicio a finalización
- **Auditoría completa** de responsables por fase

#### Campos que se Perderán:
```prisma
- id, codigo, ordenCompraId, recepcionId, pagoId
- estado, montoTotal, montoRecibido, montoPagado, moneda
- fechaInicio, fechaFinalizacion, observaciones
- creadoPor, aprobadoPor, completadoPor, canceladoPor
- createdAt, updatedAt
```

#### Capacidades de Gestión Perdidas:
- **Dashboard financiero** integrado
- **Métricas de aprovisionamiento** en tiempo real
- **Control de flujo de caja** proyectado vs. real
- **Análisis de eficiencia** del proceso

---

### 8. **HistorialAprovisionamiento** - Auditoría y Trazabilidad

#### Funcionalidades Principales:
- **Auditoría completa** de todos los cambios en el sistema
- **Trazabilidad temporal** de estados y movimientos
- **Registro de responsables** por cada acción
- **Tipos de movimiento**: ENTRADA, SALIDA, AJUSTE, DEVOLUCIÓN, TRANSFERENCIA
- **Historial de montos** (anterior vs. nuevo)
- **Observaciones detalladas** por movimiento

#### Campos que se Perderán:
```prisma
- id, aprovisionamientoId, ordenCompraId, recepcionId, pagoId
- tipoMovimiento, descripcion, estadoAnterior, estadoNuevo
- montoAnterior, montoNuevo, fechaMovimiento
- observaciones, creadoPor, createdAt, updatedAt
```

---

## 🔄 Flujos de Trabajo que se Perderán

### 1. **Flujo Completo de Aprovisionamiento**
```
PedidoEquipo → OrdenCompra → Recepcion → Pago → AprovisionamientoFinanciero
     ↓              ↓           ↓         ↓              ↓
  Finanzas    →  Logística  →  Calidad → Finanzas  →  Consolidación
```

### 2. **Workflow de Aprobaciones**
- **Orden de Compra**: Creación → Revisión → Aprobación → Envío
- **Recepción**: Recepción → Inspección → Conformidad → Almacenamiento
- **Pago**: Solicitud → Revisión → Aprobación → Procesamiento

### 3. **Integración Automática entre Áreas**
- **Finanzas ↔ Logística**: Transferencia automática de pedidos a órdenes
- **Logística ↔ Calidad**: Proceso de inspección y conformidad
- **Calidad ↔ Finanzas**: Autorización de pagos post-conformidad

---

## 📊 APIs y Endpoints que se Eliminarán

### Órdenes de Compra:
```
GET    /api/aprovisionamientos/ordenes-compra
POST   /api/aprovisionamientos/ordenes-compra
GET    /api/aprovisionamientos/ordenes-compra/[id]
PUT    /api/aprovisionamientos/ordenes-compra/[id]
DELETE /api/aprovisionamientos/ordenes-compra/[id]
POST   /api/aprovisionamientos/ordenes-compra/[id]/aprobar
POST   /api/aprovisionamientos/ordenes-compra/[id]/cancelar
POST   /api/aprovisionamientos/ordenes-compra/[id]/rechazar
```

### Recepciones:
```
GET    /api/aprovisionamientos/recepciones
POST   /api/aprovisionamientos/recepciones
GET    /api/aprovisionamientos/recepciones/[id]
PUT    /api/aprovisionamientos/recepciones/[id]
POST   /api/aprovisionamientos/recepciones/[id]/inspeccionar
POST   /api/aprovisionamientos/recepciones/[id]/completar
```

### Pagos:
```
GET    /api/aprovisionamientos/pagos
POST   /api/aprovisionamientos/pagos
GET    /api/aprovisionamientos/pagos/[id]
PUT    /api/aprovisionamientos/pagos/[id]
POST   /api/aprovisionamientos/pagos/[id]/procesar
POST   /api/aprovisionamientos/pagos/[id]/aprobar
```

---

## 🛠️ Servicios y Lógica de Negocio Perdida

### 1. **OrdenCompraService**
- Generación automática de números PO
- Cálculos de montos y subtotales
- Validaciones de stock y disponibilidad
- Workflow de aprobaciones
- Métricas y reportes de órdenes

### 2. **RecepcionService**
- Proceso de recepción contra órdenes
- Control de calidad e inspección
- Gestión de devoluciones
- Actualización automática de stocks

### 3. **PagoService**
- Cálculos financieros y vencimientos
- Gestión de adelantos y pagos parciales
- Conciliación automática
- Reportes de flujo de caja

### 4. **AprovisionamientoService**
- Vista consolidada del proceso
- Métricas de eficiencia
- Dashboard ejecutivo
- Análisis de costos y variaciones

---

## 🎨 Componentes UI que se Eliminarán

### Formularios:
- `OrdenCompraForm.tsx` - Creación/edición de órdenes
- `RecepcionForm.tsx` - Registro de recepciones
- `PagoForm.tsx` - Procesamiento de pagos
- `AprovisionamientoForm.tsx` - Gestión consolidada

### Listas y Tablas:
- `OrdenCompraList.tsx` - Listado de órdenes
- `RecepcionList.tsx` - Gestión de recepciones
- `PagoList.tsx` - Control de pagos
- `AprovisionamientoDashboard.tsx` - Panel ejecutivo

### Componentes Especializados:
- `OrdenCompraSelect.tsx` - Selector de órdenes
- `RecepcionAccordion.tsx` - Vista expandible
- `PagoCard.tsx` - Tarjetas de pago
- `AprovisionamientoMetrics.tsx` - Métricas en tiempo real

---

## 📄 Páginas y Vistas que se Eliminarán

### Logística:
- `/logistica/aprovisionamientos/ordenes-compra` - Gestión de órdenes
- `/logistica/aprovisionamientos/ordenes-compra/[id]` - Detalle de orden
- `/logistica/aprovisionamientos/ordenes-compra/nuevo` - Nueva orden
- `/logistica/aprovisionamientos/recepciones` - Gestión de recepciones
- `/logistica/aprovisionamientos/recepciones/[id]` - Detalle de recepción

### Finanzas:
- `/finanzas/aprovisionamientos/pagos` - Gestión de pagos
- `/finanzas/aprovisionamientos/pagos/[id]` - Detalle de pago
- `/finanzas/aprovisionamientos/dashboard` - Dashboard financiero
- `/finanzas/aprovisionamientos/reportes` - Reportes ejecutivos

---

## 🔔 Sistema de Notificaciones Afectado

### Notificaciones que se Perderán:
- **Órdenes pendientes de aprobación**
- **Recepciones pendientes de inspección**
- **Pagos vencidos o por vencer**
- **Aprovisionamientos en riesgo**
- **Alertas de flujo de caja**

### Configuraciones Afectadas:
- `NotificationSettings.tsx` - Configuración de alertas
- `useNotifications.ts` - Hook de notificaciones
- Sidebar badges para contadores

---

## 📈 Métricas y Reportes Perdidos

### Dashboard Ejecutivo:
- **Órdenes por estado** (gráficos de torta)
- **Flujo de caja proyectado** vs. real
- **Eficiencia de aprovisionamiento** (KPIs)
- **Análisis de proveedores** (performance)
- **Métricas de tiempo** (lead times)

### Reportes Financieros:
- **Estado de órdenes de compra**
- **Recepciones pendientes**
- **Pagos programados**
- **Análisis de costos**
- **Variaciones presupuestarias**

---

## 🧪 Tests y Validaciones Perdidas

### Tests Unitarios:
- `ordenCompra.test.ts` - Lógica de órdenes
- `recepcion.test.ts` - Proceso de recepción
- `pago.test.ts` - Cálculos financieros
- `aprovisionamiento.test.ts` - Flujo completo

### Tests de Integración:
- Flujo completo de aprovisionamiento
- Integración Finanzas ↔ Logística
- APIs y endpoints
- Validaciones de negocio

### Mocks y Fixtures:
- Datos de prueba para órdenes
- Mocks de servicios
- Fixtures de aprovisionamiento

---

## ⚠️ Impacto en Funcionalidades Relacionadas

### 1. **PedidoEquipo**
- Pérdida de transferencia automática a órdenes de compra
- Sin seguimiento de estado de aprovisionamiento
- Desconexión del flujo logístico

### 2. **Producto (Catálogo)**
- Sin conexión con órdenes de compra
- Pérdida de historial de compras
- Sin métricas de aprovisionamiento

### 3. **Proveedor**
- Sin gestión de órdenes de compra
- Pérdida de historial de transacciones
- Sin métricas de performance

### 4. **Sistema de Notificaciones**
- Reducción significativa de alertas
- Pérdida de badges en sidebar
- Sin notificaciones de aprovisionamiento

---

## 📋 Checklist de Verificación

### Antes de la Eliminación:
- [ ] ✅ Backup completo realizado
- [ ] ✅ Funcionalidades documentadas
- [ ] ⏳ Dependencias críticas identificadas
- [ ] ⏳ Plan de migración de datos preparado
- [ ] ⏳ Alternativas evaluadas
- [ ] ⏳ Stakeholders notificados

### Funcionalidades Críticas a Evaluar:
- [ ] ⚠️ ¿Existe un sistema alternativo para órdenes de compra?
- [ ] ⚠️ ¿Cómo se gestionarán las recepciones sin este sistema?
- [ ] ⚠️ ¿Hay un proceso alternativo para pagos a proveedores?
- [ ] ⚠️ ¿Se mantendrá la trazabilidad financiera?
- [ ] ⚠️ ¿Cómo se generarán los reportes ejecutivos?

---

## 🎯 Recomendaciones

### 1. **Evaluación de Impacto**
- Revisar si las funcionalidades son realmente obsoletas
- Considerar migración a un sistema simplificado
- Evaluar impacto en usuarios finales

### 2. **Alternativas Sugeridas**
- Mantener funcionalidades críticas en un módulo simplificado
- Migrar datos históricos importantes
- Crear reportes de transición

### 3. **Plan de Comunicación**
- Notificar a usuarios del sistema
- Documentar procesos alternativos
- Capacitar en nuevos flujos de trabajo

---

*Documento generado para FASE 1 - Preparación y Análisis*  
*Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*  
*Estado: Documentación Completa*