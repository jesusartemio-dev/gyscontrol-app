# 🔗 Dependencias Críticas - Sistema de Aprovisionamiento

## 🎯 Resumen Ejecutivo

Este documento identifica todas las dependencias críticas que se verán afectadas con la eliminación del sistema de aprovisionamiento. Se han identificado **27 archivos principales** que referencian directamente los modelos y funcionalidades del sistema.

**Fecha de análisis:** $(Get-Date -Format "yyyy-MM-dd")
**Estado:** Análisis completo para FASE 1 - Preparación
**Archivos afectados:** 27 archivos principales + dependencias indirectas

---

## 📊 Resumen de Impacto

### Archivos por Categoría:
- **APIs (Rutas):** 8 archivos
- **Servicios:** 4 archivos  
- **Componentes UI:** 8 archivos
- **Páginas:** 3 archivos
- **Types/Modelos:** 4 archivos
- **Tests:** 6 archivos
- **Configuración:** 2 archivos

### Modelos Afectados:
- `OrdenCompra` y `OrdenCompraItem`
- `Recepcion` y `RecepcionItem`
- `Pago` y `PagoItem`
- `AprovisionamientoFinanciero`
- `HistorialAprovisionamiento`

---

## 🚨 Dependencias Críticas por Categoría

### 1. **APIs y Rutas (8 archivos)**

#### Rutas de Órdenes de Compra:
```
📁 src/app/api/aprovisionamientos/ordenes-compra/[id]/aprobar/route.ts
📁 src/app/api/aprovisionamientos/ordenes-compra/[id]/cancelar/route.ts
📁 src/app/api/aprovisionamientos/ordenes-compra/[id]/rechazar/route.ts
```
**Impacto:** Eliminación completa de endpoints de gestión de órdenes de compra
**Funcionalidades perdidas:**
- Aprobación de órdenes de compra
- Cancelación con validación de recepciones/pagos
- Rechazo con manejo de aprovisionamientos asociados

#### Rutas de Recepciones:
```
📁 src/app/api/aprovisionamientos/recepciones/[id]/completar/route.ts
📁 src/app/api/aprovisionamientos/recepciones/[id]/inspeccionar/route.ts
```
**Impacto:** Pérdida de workflow de recepciones
**Funcionalidades perdidas:**
- Completar recepciones con validaciones
- Proceso de inspección de materiales
- Actualización automática de estados

#### Rutas de Pagos:
```
📁 src/app/api/aprovisionamientos/pagos/[id]/aprobar/route.ts
📁 src/app/api/aprovisionamientos/pagos/[id]/procesar/route.ts
```
**Impacto:** Eliminación del sistema de pagos
**Funcionalidades perdidas:**
- Aprobación de pagos con validaciones
- Procesamiento de pagos
- Actualización de aprovisionamientos financieros

#### Rutas Base:
```
📁 src/app/api/pedido-equipo/route.ts (referencias a fechaOrdenCompraRecomendada)
📁 src/app/api/pedido-equipo-item/[id]/route.ts (cálculo de fechaOrdenCompraRecomendada)
📁 src/app/api/pedido-equipo-item/route.ts (fechaOrdenCompraRecomendada)
```
**Impacto:** Pérdida de integración con pedidos de equipo
**Funcionalidades perdidas:**
- Cálculo automático de fechas de orden de compra recomendadas
- Integración entre pedidos y aprovisionamiento

---

### 2. **Servicios de Negocio (4 archivos)**

#### Servicios Principales:
```
📁 src/lib/services/ordenCompra.ts
📁 src/lib/services/ordenesCompra.ts
📁 src/lib/services/recepcion.ts
📁 src/lib/services/recepciones.ts
```

**OrdenCompraService - Funcionalidades Críticas:**
- `getOrdenById()` - Obtener orden con relaciones completas
- `createOrdenCompra()` - Creación con validaciones de negocio
- `updateOrdenCompra()` - Actualización con workflow
- `aprobarOrden()`, `cancelarOrden()`, `rechazarOrden()` - Estados de workflow
- `getMetricas()` - Métricas y estadísticas
- `procesarPagoAprobado()` - Integración con pagos
- `searchOrdenes()` - Búsqueda avanzada

**RecepcionService - Funcionalidades Críticas:**
- `getRecepciones()` - Listado con filtros y paginación
- `createRecepcion()` - Creación con validación de órdenes
- `updateRecepcion()` - Actualización de estados
- `updateItemInspeccion()` - Inspección por items
- `getMetricas()` - Métricas de recepciones
- `determinarEstadoOrden()` - Lógica de estados automáticos
- `generateNumeroRecepcion()` - Numeración automática

**Tipos de Datos Perdidos:**
- `OrdenCompraWithRelations`
- `RecepcionWithRelations`
- `OrdenCompraMetrics`
- `RecepcionMetrics`
- `OrdenCompraSummary`
- `RecepcionSummary`

---

### 3. **Componentes UI (8 archivos)**

#### Componentes de Aprovisionamiento:
```
📁 src/components/aprovisionamientos/AprovisionamientoList.tsx
📁 src/components/aprovisionamientos/AprovisionamientoForm.tsx
📁 src/components/aprovisionamientos/AprovisionamientoCard.tsx
📁 src/components/aprovisionamientos/AprovisionamientoSelect.tsx
📁 src/components/aprovisionamientos/AprovisionamientosDashboard.tsx
📁 src/components/aprovisionamientos/PagoForm.tsx
```

**AprovisionamientoList.tsx - Funcionalidades:**
- Lista completa con filtros avanzados
- Acciones: aprobar, completar, cancelar, eliminar
- Estados visuales y badges dinámicos
- Paginación y búsqueda
- Integración con servicios

**AprovisionamientoForm.tsx - Funcionalidades:**
- Formulario completo de creación/edición
- Validación con Zod
- Auto-completado desde órdenes de compra
- Cálculos automáticos de montos
- Integración con proveedores

**AprovisionamientosDashboard.tsx - Funcionalidades:**
- Dashboard ejecutivo con métricas
- Gráficos y visualizaciones
- Proyecciones financieras
- Estados en tiempo real

**PagoForm.tsx - Funcionalidades:**
- Formulario de pagos completo
- Integración con órdenes y recepciones
- Validaciones de negocio
- Auto-completado de datos
- Múltiples métodos de pago

#### Componentes Afectados Indirectamente:
```
📁 src/components/Sidebar.tsx (enlaces a recepciones y pagos)
📁 src/components/NotificationSettings.tsx (alertas de aprovisionamiento)
```

---

### 4. **Páginas de la Aplicación (3 archivos)**

#### Páginas de Logística:
```
📁 src/app/(logistica)/aprovisionamientos/ordenes-compra/[id]/page.tsx
📁 src/app/(logistica)/aprovisionamientos/ordenes-compra/nuevo/page.tsx
📁 src/app/(logistica)/aprovisionamientos/recepciones/[id]/page.tsx
```

**Funcionalidades de Páginas:**
- Vista detallada de órdenes de compra
- Formulario de nueva orden de compra
- Vista detallada de recepciones
- Breadcrumb navigation
- Integración con formularios y servicios
- Estados de carga y error

**Rutas que se Eliminarán:**
- `/logistica/aprovisionamientos/ordenes-compra`
- `/logistica/aprovisionamientos/ordenes-compra/[id]`
- `/logistica/aprovisionamientos/ordenes-compra/nuevo`
- `/logistica/aprovisionamientos/recepciones`
- `/logistica/aprovisionamientos/recepciones/[id]`
- `/finanzas/aprovisionamientos/pagos`
- `/finanzas/aprovisionamientos/dashboard`

---

### 5. **Types y Modelos (4 archivos)**

#### Definiciones de Tipos:
```
📁 src/types/modelos.ts
📁 src/types/modelos-generated.ts
📁 src/types/payloads.ts
📁 src/types/payloads-generated.ts
```

**Tipos que se Eliminarán:**
- `OrdenCompra`, `OrdenCompraItem`
- `Recepcion`, `RecepcionItem`
- `Pago`, `PagoItem`
- `AprovisionamientoFinanciero`
- `HistorialAprovisionamiento`
- `OrdenCompraConTodo`, `OrdenCompraConItems`
- `RecepcionConTodo`, `RecepcionConItems`
- `PagoConTodo`, `PagoConItems`
- `AprovisionamientoConTodo`

**Enums Afectados:**
- `EstadoOrdenCompra`
- `EstadoRecepcion`
- `EstadoPago`
- `EstadoAprovisionamiento`
- `PrioridadAprovisionamiento`
- `TipoRecepcion`
- `TipoPago`

**Payloads Eliminados:**
- `CreateOrdenCompraPayload`
- `UpdateOrdenCompraPayload`
- `OrdenCompraFilters`
- `CreateRecepcionPayload`
- `UpdateRecepcionPayload`
- `RecepcionFilters`
- `CreatePagoPayload`
- `UpdatePagoPayload`
- `PagoFilters`

---

### 6. **Tests (6 archivos)**

#### Tests Afectados:
```
📁 src/app/api/pedido-equipo/route.test.ts
📁 src/components/logistica/__tests__/GenerarPedidoDesdeCotizacion.test.tsx
📁 src/components/logistica/__tests__/CotizacionProveedorTabla.test.tsx
📁 src/__tests__/__mocks__/fixtures.ts
📁 src/__tests__/__mocks__/services.ts
📁 src/lib/__mocks__/cotizaciones.ts
```

**Mocks y Fixtures Eliminados:**
- `mockOrdenesCompra`
- `mockRecepciones`
- `mockPagos`
- `mockOrdenCompraService`
- `mockRecepcionService`
- `mockPagoService`
- `mockAprovisionamientoService`

**Tests que Fallarán:**
- Tests de API de pedido-equipo (fechaOrdenCompraRecomendada)
- Tests de componentes de cotización
- Tests de integración de aprovisionamiento
- Tests de servicios eliminados

---

### 7. **Configuración y Hooks (2 archivos)**

#### Hooks y Utilidades:
```
📁 src/lib/hooks/useNotifications.ts
📁 src/lib/validators/base-generated.ts
```

**useNotifications.ts - Funcionalidades Perdidas:**
- Notificaciones de recepciones pendientes
- Alertas de pagos vencidos
- Badges en sidebar para contadores
- Integración con endpoints de aprovisionamiento

**Validators Eliminados:**
- `ordenCompraSchema`
- `recepcionSchema`
- `pagoSchema`
- `aprovisionamientoSchema`
- Validaciones de filtros y payloads

---

## 🔄 Dependencias Indirectas Críticas

### 1. **Integración con PedidoEquipo**

**Archivos Afectados:**
- `src/components/equipos/PedidoEquipoItemList.tsx`
- `src/components/equipos/PedidoEquipoListWithFilters.tsx`
- `src/components/equipos/ExportData.tsx`
- `src/components/logistica/GenerarPedidoDesdeCotizacion.tsx`

**Funcionalidades Perdidas:**
- Campo `fechaOrdenCompraRecomendada` en items de pedido
- Cálculo automático de fechas de orden de compra
- Exportación de datos con fechas OC
- Generación automática de pedidos desde cotizaciones
- Filtros por fecha de orden de compra recomendada

### 2. **Sistema de Notificaciones**

**Archivos Afectados:**
- `src/components/Sidebar.tsx`
- `src/components/NotificationSettings.tsx`
- `src/app/configuracion/notificaciones/page.tsx`

**Funcionalidades Perdidas:**
- Enlaces en sidebar a recepciones y pagos
- Badges de contadores (recepciones-pendientes, pagos-vencidos)
- Configuración de alertas de aprovisionamiento
- Notificaciones automáticas del sistema

### 3. **Integración con Productos**

**Archivos Afectados:**
- `src/lib/services/producto.ts`

**Funcionalidades Perdidas:**
- Conteo de `ordenCompraItems` por producto
- Validación de productos en uso en órdenes
- Métricas de productos en aprovisionamiento
- Restricciones de eliminación por órdenes asociadas

### 4. **PDFs y Reportes**

**Archivos Afectados:**
- `src/components/pdf/CotizacionPDF.tsx`

**Funcionalidades Perdidas:**
- Referencias a condiciones de pago en PDFs
- Integración con datos de aprovisionamiento
- Reportes financieros consolidados

---

## ⚠️ Riesgos de Eliminación

### 1. **Riesgos Altos**
- **Pérdida de datos históricos** de órdenes, recepciones y pagos
- **Ruptura del flujo logístico** completo
- **Eliminación de métricas financieras** críticas
- **Pérdida de trazabilidad** de aprovisionamiento

### 2. **Riesgos Medios**
- **Tests fallidos** en múltiples módulos
- **Enlaces rotos** en navegación
- **Notificaciones no funcionales**
- **Exportaciones incompletas**

### 3. **Riesgos Bajos**
- **Referencias en comentarios** y documentación
- **Imports no utilizados** que quedarán huérfanos
- **Configuraciones obsoletas**

---

## 🛠️ Plan de Mitigación

### 1. **Antes de la Eliminación**
- [ ] ✅ Backup completo realizado
- [ ] ✅ Funcionalidades documentadas
- [ ] ✅ Dependencias identificadas
- [ ] ⏳ Migración de datos críticos
- [ ] ⏳ Actualización de tests
- [ ] ⏳ Notificación a stakeholders

### 2. **Durante la Eliminación**
- [ ] ⏳ Eliminar APIs en orden específico
- [ ] ⏳ Actualizar componentes dependientes
- [ ] ⏳ Remover referencias en tipos
- [ ] ⏳ Limpiar imports y exports
- [ ] ⏳ Actualizar configuraciones

### 3. **Después de la Eliminación**
- [ ] ⏳ Verificar funcionamiento de módulos restantes
- [ ] ⏳ Ejecutar suite completa de tests
- [ ] ⏳ Validar navegación y enlaces
- [ ] ⏳ Confirmar notificaciones funcionales
- [ ] ⏳ Documentar cambios realizados

---

## 📋 Checklist de Verificación

### APIs y Servicios:
- [ ] ⏳ Verificar que no hay llamadas a endpoints eliminados
- [ ] ⏳ Confirmar que servicios restantes no dependen de aprovisionamiento
- [ ] ⏳ Validar que no hay imports de servicios eliminados

### Componentes UI:
- [ ] ⏳ Verificar que no hay referencias a componentes eliminados
- [ ] ⏳ Confirmar que formularios no usan tipos eliminados
- [ ] ⏳ Validar que navegación no tiene enlaces rotos

### Base de Datos:
- [ ] ⏳ Verificar que no hay foreign keys huérfanas
- [ ] ⏳ Confirmar que migraciones están preparadas
- [ ] ⏳ Validar que datos críticos están respaldados

### Tests:
- [ ] ⏳ Actualizar mocks y fixtures
- [ ] ⏳ Remover tests de funcionalidades eliminadas
- [ ] ⏳ Verificar que tests restantes pasan

---

## 🎯 Próximos Pasos

### Inmediatos (FASE 1):
1. ✅ Backup completo
2. ✅ Documentación de funcionalidades
3. ✅ Identificación de dependencias
4. ⏳ Verificación de datos en producción
5. ⏳ Mapeo de relaciones de BD
6. ⏳ Identificación de tests afectados

### Siguientes Fases:
- **FASE 2:** Eliminación de APIs
- **FASE 3:** Eliminación de servicios
- **FASE 4:** Eliminación de componentes
- **FASE 5:** Limpieza de tipos y modelos
- **FASE 6:** Actualización de tests
- **FASE 7:** Limpieza de base de datos
- **FASE 8:** Verificación final

---

*Documento generado para FASE 1 - Análisis de Dependencias*  
*Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*  
*Estado: Análisis Completo - 27 archivos identificados*  
*Próximo paso: Verificación de datos en producción*