// ===================================================
// 📁 Documento: PLAN_MAESTRO_APROVISIONAMIENTO_FINANCIERO.md
// 📌 Descripción: Plan maestro alineado con FLUJO_GYS para implementar aprovisionamiento financiero
// 🧠 Uso: Guía base para verificar y crear componentes de aprovisionamiento siguiendo los 10 pasos GYS
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-01-21
// ===================================================

# 📋 Plan Maestro - Aprovisionamiento Financiero (Alineado FLUJO_GYS)

## 🎯 Objetivo del Proyecto
Implementar un sistema completo de aprovisionamiento financiero siguiendo **FLUJO_GYS** donde:
- **Logística** gestiona las Órdenes de Compra (PO) y Recepciones
- **Finanzas** maneja el análisis financiero, proyecciones y flujo de caja
- **Integración automática** entre ambas áreas con sincronización en tiempo real
- **Metodología GYS**: Aplicar los 10 pasos del FLUJO_GYS para cada entidad

---

## 🏗️ Arquitectura del Sistema (Según FLUJO_GYS)

### 📁 Separación de Responsabilidades

#### 🚚 Área Logística (`/logistica/`)
- **Órdenes de Compra**: Gestión completa de PO (CRUD, aprobaciones, seguimiento)
- **Recepciones**: Control de entregas, inspección, aceptación/rechazo
- **Dashboard Operativo**: Métricas de entregas, proveedores, tiempos
- **Coordinación**: Comunicación con proveedores y seguimiento de pedidos

#### 💰 Área Finanzas (`/finanzas/`)
- **Aprovisionamiento Financiero**: Análisis de costos y proyecciones
- **Flujo de Caja**: Control de adelantos, pagos y saldos
- **Métricas Financieras**: ROI, variaciones, eficiencia de costos
- **Reportes Ejecutivos**: Dashboards para toma de decisiones

### 🔄 Flujo de Integración
```
Finanzas: Lista Equipo → Pedido Equipo
    ↓ (Transferencia automática)
Logística: Orden Compra → Recepción
    ↓ (Actualización automática)
Finanzas: Pago → Flujo de Caja
```

### 🎯 Entidades Principales a Implementar
1. **OrdenCompra** (Logística)
2. **Recepcion** (Logística)
3. **Pago** (Finanzas)
4. **AprovisionamientoFinanciero** (Finanzas)

---

## 🚀 Plan de Implementación Horizontal (FLUJO_GYS)

> **📋 Metodología**: Implementación **horizontal por capas** - primero TODOS los modelos, luego TODOS los types, etc.
> **🔢 Numeración**: FASE1 → F1.01, F1.02... para progreso secuencial ordenado
> **⚡ Ventaja**: Evita errores de interrelaciones y permite desarrollo más fluido
> **🎯 Enfoque**: Completar cada capa completamente antes de pasar a la siguiente

---

### FASE1: Modelos Prisma (TODOS los Modelos)

#### F1.01: Definición Completa de Modelos
**📅 Duración**: 3 días
**🎯 Objetivo**: Definir TODOS los modelos del sistema de aprovisionamiento en `schema.prisma`

**📋 Entregables:**
- ✅ Modelo `OrdenCompra` con campos completos
- ✅ Modelo `OrdenCompraItem` con relaciones y validaciones
- ✅ Modelo `Recepcion` con campos de control y auditoría
- ✅ Modelo `RecepcionItem` con validaciones de calidad
- ✅ Modelo `Pago` con tipos financieros y referencias
- ✅ Modelo `PagoItem` con detalles de pago por ítem
- ✅ Modelo `AprovisionamientoFinanciero` consolidado
- ✅ Modelo `HistorialAprovisionamiento` para auditoría

**🎯 Acciones:**
1. Definir estructura COMPLETA de TODOS los modelos
2. Configurar campos obligatorios, opcionales y calculados
3. Establecer tipos de datos precisos (Decimal(10,2), DateTime, etc.)
4. Documentar cada campo con comentarios descriptivos
5. Incluir campos de auditoría (createdAt, updatedAt, createdBy)

#### F1.02: Enums y Estados Completos
**📅 Duración**: 1 día
**🎯 Objetivo**: Crear TODOS los enums para workflows y estados del sistema

**📋 Entregables:**
- ✅ `EstadoOrdenCompra`: BORRADOR, ENVIADA, APROBADA, RECHAZADA, COMPLETADA, CANCELADA
- ✅ `EstadoRecepcion`: PENDIENTE, PARCIAL, COMPLETA, RECHAZADA, DEVOLUCION
- ✅ `TipoRecepcion`: NORMAL, URGENTE, DEVOLUCION, EMERGENCIA
- ✅ `EstadoInspeccion`: PENDIENTE, APROBADA, RECHAZADA, CONDICIONAL, REQUERIDA
- ✅ `TipoPago`: CONTADO, CREDITO_30, CREDITO_60, CREDITO_90, TRANSFERENCIA, CHEQUE
- ✅ `EstadoPago`: PENDIENTE, PROCESADO, COMPLETADO, CANCELADO, RECHAZADO
- ✅ `EstadoAprovisionamiento`: PLANIFICADO, EN_PROCESO, COMPLETADO, CANCELADO, SUSPENDIDO
- ✅ `TipoMovimiento`: ENTRADA, SALIDA, AJUSTE, DEVOLUCION, TRANSFERENCIA
- ✅ `PrioridadOrden`: BAJA, NORMAL, ALTA, URGENTE, CRITICA

**🎯 Acciones:**
1. Crear TODOS los enums para estados de workflow
2. Definir valores por defecto apropiados
3. Documentar transiciones válidas entre estados
4. Validar consistencia y completitud entre todos los estados
5. Incluir enums para prioridades y tipos de movimiento

#### F1.03: Relaciones y Constraints Completos
**📅 Duración**: 2 días
**🎯 Objetivo**: Configurar TODAS las relaciones e integridad referencial del sistema

**📋 Entregables:**
- ✅ Relaciones `OrdenCompra` ↔ `OrdenCompraItem` (1:N)
- ✅ Relaciones `Recepcion` ↔ `RecepcionItem` (1:N)
- ✅ Relaciones `Pago` ↔ `PagoItem` (1:N)
- ✅ Flujo completo: `OrdenCompra` → `Recepcion` → `Pago` (1:N cada uno)
- ✅ Relación `AprovisionamientoFinanciero` con todas las entidades
- ✅ Relación `HistorialAprovisionamiento` para auditoría
- ✅ Relaciones con `Proveedor`, `Producto`, `Usuario` existentes
- ✅ Políticas `@relation(..., onDelete: Cascade)` donde aplique
- ✅ Índices compuestos para optimización
- ✅ Constraints de integridad referencial
- ✅ Migración aplicada y validada

**🎯 Acciones:**
1. Configurar TODAS las relaciones entre entidades
2. Establecer políticas de eliminación apropiadas
3. Crear índices compuestos para consultas frecuentes
4. Validar integridad referencial completa
5. Ejecutar: `npx prisma migrate dev --name add-aprovisionamiento-complete`

**🔧 Comandos:**
```bash
npx prisma db push
npx prisma generate
npx prisma validate
npx prisma studio # Para verificar estructura
```

**📝 Ejemplo de Relaciones Completas:**
```prisma
model OrdenCompra {
  id          String @id @default(cuid())
  numero      String @unique
  fecha       DateTime @default(now())
  estado      EstadoOrdenCompra @default(BORRADOR)
  prioridad   PrioridadOrden @default(NORMAL)
  proveedorId String
  total       Decimal @db.Decimal(10,2)
  
  // Relaciones principales
  proveedor   Proveedor @relation(fields: [proveedorId], references: [id])
  items       OrdenCompraItem[]
  recepciones Recepcion[]
  aprovisionamientos AprovisionamientoFinanciero[]
  historial   HistorialAprovisionamiento[]
  
  // Auditoría
  creadoEn    DateTime @default(now())
  actualizadoEn DateTime @updatedAt
  creadoPor   String
  
  @@map("ordenes_compra")
  @@index([proveedorId, estado])
  @@index([fecha, estado])
  @@index([numero])
}
```

---

### FASE2: Types y Interfaces (TODOS los Types)

#### F2.01: Types Base Completos (Modelos)
**📅 Duración**: 2 días
**🎯 Objetivo**: Crear TODAS las interfaces TypeScript base en `src/types/modelos.ts`

**📋 Entregables:**
- ✅ Interfaces base importadas desde Prisma
- ✅ Tipos: `OrdenCompra`, `OrdenCompraItem`, `Recepcion`, `RecepcionItem`
- ✅ Tipos: `Pago`, `PagoItem`, `AprovisionamientoFinanciero`
- ✅ Tipos: `HistorialAprovisionamiento` para auditoría
- ✅ TODOS los enums re-exportados para consistencia
- ✅ Documentación JSDoc completa para cada tipo
- ✅ Tipos auxiliares y utilitarios

**🎯 Acciones:**
1. Importar TODOS los tipos desde `@prisma/client`
2. Crear aliases para mejor legibilidad
3. Documentar cada interface con JSDoc
4. Validar compatibilidad completa con Prisma
5. Incluir tipos para estados y enums

**📝 Ejemplo Completo:**
```typescript
// src/types/modelos.ts
import { 
  OrdenCompra as PrismaOrdenCompra, 
  OrdenCompraItem as PrismaOrdenCompraItem,
  Recepcion as PrismaRecepcion,
  RecepcionItem as PrismaRecepcionItem,
  Pago as PrismaPago,
  PagoItem as PrismaPagoItem,
  AprovisionamientoFinanciero as PrismaAprovisionamientoFinanciero,
  HistorialAprovisionamiento as PrismaHistorialAprovisionamiento,
  EstadoOrdenCompra,
  EstadoRecepcion,
  EstadoPago,
  TipoPago,
  PrioridadOrden
} from '@prisma/client';

// Tipos base
export type OrdenCompra = PrismaOrdenCompra;
export type OrdenCompraItem = PrismaOrdenCompraItem;
export type Recepcion = PrismaRecepcion;
export type RecepcionItem = PrismaRecepcionItem;
export type Pago = PrismaPago;
export type PagoItem = PrismaPagoItem;
export type AprovisionamientoFinanciero = PrismaAprovisionamientoFinanciero;
export type HistorialAprovisionamiento = PrismaHistorialAprovisionamiento;

// Enums
export { EstadoOrdenCompra, EstadoRecepcion, EstadoPago, TipoPago, PrioridadOrden };
```

#### F2.02: Types Compuestos Completos (Con Relaciones)
**📅 Duración**: 2 días
**🎯 Objetivo**: Definir TODOS los tipos con relaciones anidadas

**📋 Entregables:**
- ✅ `OrdenCompraConItems`: OrdenCompra + items + proveedor + pedidoEquipo
- ✅ `OrdenCompraConTodo`: Incluye recepciones y pagos
- ✅ `RecepcionConItems`: Recepcion + items + ordenCompra + proveedor
- ✅ `RecepcionConTodo`: Incluye pagos relacionados
- ✅ `PagoConItems`: Pago + items + recepcion + ordenCompra
- ✅ `PagoConTodo`: Incluye proveedor y detalles completos
- ✅ `AprovisionamientoConTodo`: Vista consolidada completa
- ✅ Tipos para dashboards y reportes
- ✅ Tipos para vistas específicas por rol

**🎯 Acciones:**
1. Definir TODOS los tipos con `include` de Prisma
2. Crear tipos para diferentes vistas y contextos
3. Optimizar para performance (evitar over-fetching)
4. Validar relaciones circulares
5. Incluir tipos para reportes y dashboards

**📝 Ejemplo Completo:**
```typescript
export type OrdenCompraConItems = OrdenCompra & {
  items: (OrdenCompraItem & {
    producto: Producto;
  })[];
  proveedor: Proveedor;
  pedidoEquipo?: PedidoEquipo;
};

export type OrdenCompraConTodo = OrdenCompra & {
  items: (OrdenCompraItem & { producto: Producto })[];
  proveedor: Proveedor;
  recepciones: (Recepcion & {
    items: RecepcionItem[];
    pagos: Pago[];
  })[];
  aprovisionamientos: AprovisionamientoFinanciero[];
};

export type AprovisionamientoConTodo = AprovisionamientoFinanciero & {
  ordenCompra: OrdenCompraConItems;
  recepcion?: RecepcionConItems;
  pago?: PagoConItems;
  historial: HistorialAprovisionamiento[];
};
```

#### F2.03: Payloads API Completos
**📅 Duración**: 2 días
**🎯 Objetivo**: Crear TODOS los tipos para payloads de API en `src/types/payloads.ts`

**📋 Entregables:**
- ✅ `CreateOrdenCompraPayload`, `UpdateOrdenCompraPayload`
- ✅ `CreateOrdenCompraItemPayload`, `UpdateOrdenCompraItemPayload`
- ✅ `CreateRecepcionPayload`, `UpdateRecepcionPayload`
- ✅ `CreateRecepcionItemPayload`, `UpdateRecepcionItemPayload`
- ✅ `CreatePagoPayload`, `UpdatePagoPayload`
- ✅ `CreatePagoItemPayload`, `UpdatePagoItemPayload`
- ✅ `CreateAprovisionamientoPayload`, `UpdateAprovisionamientoPayload`
- ✅ Tipos para filtros: `OrdenCompraFilters`, `RecepcionFilters`, `PagoFilters`, `AprovisionamientoFilters`
- ✅ Tipos de respuesta: `OrdenCompraResponse`, `RecepcionResponse`, `PagoResponse`
- ✅ Tipos para búsquedas y paginación
- ✅ Tipos para reportes y exportación

**🎯 Acciones:**
1. Definir TODOS los payloads para operaciones CRUD
2. Crear tipos para filtros avanzados y búsquedas
3. Establecer tipos de respuesta API consistentes
4. Validar compatibilidad completa con validators
5. Incluir tipos para paginación y ordenamiento
6. Crear tipos para reportes y dashboards

**📝 Ejemplo Completo:**
```typescript
// src/types/payloads.ts
export interface CreateOrdenCompraPayload {
  numero?: string;
  proveedorId: string;
  pedidoEquipoId?: string;
  prioridad?: PrioridadOrden;
  observaciones?: string;
  items: CreateOrdenCompraItemPayload[];
}

export interface OrdenCompraFilters {
  estado?: EstadoOrdenCompra[];
  proveedorId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  prioridad?: PrioridadOrden[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'fecha' | 'numero' | 'total' | 'estado';
  sortOrder?: 'asc' | 'desc';
}

export interface AprovisionamientoFilters {
  estado?: EstadoAprovisionamiento[];
  fechaDesde?: Date;
  fechaHasta?: Date;
  proveedorId?: string;
  montoMinimo?: number;
  montoMaximo?: number;
  incluirCompletos?: boolean;
}
```

---

### FASE3: Validación y Schemas (TODOS los Validators)

#### F3.01: Schemas Zod Base Completos
**📅 Duración**: 3 días
**🎯 Objetivo**: Crear TODOS los schemas de validación en `src/lib/validators/aprovisionamiento.ts`

**📋 Entregables:**
- ✅ `createOrdenCompraSchema` con validaciones completas
- ✅ `createOrdenCompraItemSchema` con validaciones de producto
- ✅ `createRecepcionSchema` con reglas de negocio
- ✅ `createRecepcionItemSchema` con validaciones de cantidad
- ✅ `createPagoSchema` con validaciones financieras
- ✅ `createPagoItemSchema` con validaciones de monto
- ✅ `createAprovisionamientoSchema` con validaciones de flujo
- ✅ Schemas para enums y estados
- ✅ Mensajes de error en español
- ✅ Validaciones de reglas de negocio específicas

**🎯 Acciones:**
1. Crear TODOS los schemas Zod para validación
2. Definir reglas de negocio específicas por entidad
3. Configurar mensajes personalizados en español
4. Validar tipos numéricos, fechas y decimales
5. Implementar validaciones cruzadas entre entidades
6. Crear schemas para enums y estados

**📝 Ejemplo Completo:**
```typescript
export const createOrdenCompraSchema = z.object({
  numero: z.string().optional(),
  proveedorId: z.string().min(1, "Proveedor es requerido"),
  pedidoEquipoId: z.string().optional(),
  fechaRequerida: z.string().datetime("Fecha inválida"),
  prioridad: z.nativeEnum(PrioridadOrden).default(PrioridadOrden.MEDIA),
  observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
  items: z.array(createOrdenCompraItemSchema).min(1, "Debe tener al menos un item")
});

export const createOrdenCompraItemSchema = z.object({
  productoId: z.string().min(1, "Producto es requerido"),
  cantidad: z.number().positive("Cantidad debe ser positiva"),
  precioUnitario: z.number().positive("Precio debe ser positivo"),
  moneda: z.nativeEnum(Moneda).default(Moneda.PEN)
});

export const createAprovisionamientoSchema = z.object({
  ordenCompraId: z.string().min(1, "Orden de compra es requerida"),
  estado: z.nativeEnum(EstadoAprovisionamiento).default(EstadoAprovisionamiento.PENDIENTE),
  observaciones: z.string().max(1000).optional()
});
```

#### F3.02: Schemas de Actualización Completos
**📅 Duración**: 1 día
**🎯 Objetivo**: Crear TODOS los schemas para updates parciales

**📋 Entregables:**
- ✅ `updateOrdenCompraSchema` con campos opcionales
- ✅ `updateOrdenCompraItemSchema` con validaciones de cambio
- ✅ `updateRecepcionSchema` con validaciones condicionales
- ✅ `updateRecepcionItemSchema` con restricciones de cantidad
- ✅ `updatePagoSchema` con restricciones de estado
- ✅ `updatePagoItemSchema` con validaciones de monto
- ✅ `updateAprovisionamientoSchema` con transiciones de estado
- ✅ Schemas para operaciones especiales (cancelar, aprobar, rechazar)

**🎯 Acciones:**
1. Crear TODOS los schemas para updates parciales
2. Implementar validaciones condicionales por estado
3. Configurar restricciones por estado y transiciones
4. Validar operaciones especiales del workflow
5. Implementar schemas para cambios de estado masivos
4. Validar transiciones de workflow

#### F3.03: Schemas de Filtros Completos
**📅 Duración**: 1 día
**🎯 Objetivo**: Crear TODOS los schemas para filtros y búsquedas

**📋 Entregables:**
- ✅ `ordenCompraFiltersSchema` para búsquedas avanzadas
- ✅ `recepcionFiltersSchema` con rangos de fecha y estado
- ✅ `pagoFiltersSchema` con filtros financieros y moneda
- ✅ `aprovisionamientoFiltersSchema` con filtros de flujo completo
- ✅ Schemas para paginación y ordenamiento estándar
- ✅ Schemas para exportación y reportes
- ✅ Schemas para búsquedas por texto y autocompletado

**🎯 Acciones:**
1. Crear TODOS los schemas para filtros de búsqueda
2. Implementar validación de rangos de fecha y monto
3. Configurar paginación estándar para todas las entidades
4. Validar parámetros de ordenamiento múltiple
5. Crear schemas para exportación de datos
6. Implementar filtros por roles y permisos

**📝 Ejemplo:**
```typescript
export const ordenCompraFiltersSchema = z.object({
  estado: z.array(z.nativeEnum(EstadoOrdenCompra)).optional(),
  proveedorId: z.string().optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  prioridad: z.array(z.nativeEnum(PrioridadOrden)).optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['fecha', 'numero', 'total', 'estado']).default('fecha'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
```

---

### FASE4: API Routes (TODAS las Rutas)

#### F4.01: Rutas Base CRUD Completas
**📅 Duración**: 4 días
**🎯 Objetivo**: Implementar TODAS las rutas básicas GET y POST

**📋 Entregables:**
- ✅ `src/app/api/aprovisionamientos/ordenes-compra/route.ts` (GET, POST)
- ✅ `src/app/api/aprovisionamientos/recepciones/route.ts` (GET, POST)
- ✅ `src/app/api/aprovisionamientos/pagos/route.ts` (GET, POST)
- ✅ `src/app/api/aprovisionamientos/aprovisionamientos/route.ts` (GET, POST)
- ✅ `src/app/api/aprovisionamientos/historial/route.ts` (GET)
- ✅ Validación Zod integrada en todas las rutas
- ✅ Manejo de errores estándar y logging
- ✅ Middleware de autenticación y autorización
- ✅ Rate limiting y validación de permisos

**🎯 Acciones:**
1. Implementar TODAS las rutas GET con filtros avanzados
2. Crear TODAS las rutas POST con validación completa
3. Configurar paginación estándar para todas las entidades
4. Implementar manejo de errores consistente
5. Integrar middleware de autenticación en todas las rutas
6. Configurar logging y auditoría de operaciones

#### F4.02: Rutas por ID Completas
**📅 Duración**: 3 días
**🎯 Objetivo**: Implementar TODAS las operaciones específicas por ID

**📋 Entregables:**
- ✅ `src/app/api/aprovisionamientos/ordenes-compra/[id]/route.ts` (GET, PUT, DELETE)
- ✅ `src/app/api/aprovisionamientos/recepciones/[id]/route.ts` (GET, PUT, DELETE)
- ✅ `src/app/api/aprovisionamientos/pagos/[id]/route.ts` (GET, PUT, DELETE)
- ✅ `src/app/api/aprovisionamientos/aprovisionamientos/[id]/route.ts` (GET, PUT, DELETE)
- ✅ Rutas para items: `/ordenes-compra/[id]/items/[itemId]/route.ts`
- ✅ Rutas para items: `/recepciones/[id]/items/[itemId]/route.ts`
- ✅ Rutas para items: `/pagos/[id]/items/[itemId]/route.ts`
- ✅ Validación de existencia y relaciones
- ✅ Control de permisos por rol y operación
- ✅ Soft delete y auditoría completa

**🎯 Acciones:**
1. Implementar TODAS las operaciones por ID
2. Validar existencia de recursos y relaciones
3. Configurar control de acceso granular
4. Manejar eliminaciones en cascada y soft delete
5. Implementar rutas para gestión de items
6. Configurar auditoría completa de cambios

#### F4.03: Rutas Especializadas Completas
**📅 Duración**: 3 días
**🎯 Objetivo**: Crear TODOS los endpoints para workflows específicos

**📋 Entregables:**
- ✅ `/ordenes-compra/[id]/aprobar` - Aprobar orden
- ✅ `/ordenes-compra/[id]/cancelar` - Cancelar orden
- ✅ `/ordenes-compra/[id]/enviar` - Enviar a proveedor
- ✅ `/recepciones/[id]/inspeccionar` - Proceso de inspección
- ✅ `/recepciones/[id]/completar` - Completar recepción
- ✅ `/recepciones/[id]/rechazar` - Rechazar recepción
- ✅ `/pagos/[id]/procesar` - Procesar pago
- ✅ `/pagos/[id]/aprobar` - Aprobar pago
- ✅ `/pagos/[id]/rechazar` - Rechazar pago
- ✅ `/aprovisionamientos/[id]/consolidar` - Consolidar aprovisionamiento
- ✅ `/aprovisionamientos/reportes/dashboard` - Dashboard de reportes
- ✅ `/aprovisionamientos/exportar` - Exportar datos
- ✅ Validaciones de estado específicas para cada workflow
- ✅ Logs de auditoría completos
- ✅ Notificaciones automáticas

**🎯 Acciones:**
1. Crear TODOS los endpoints para workflows específicos
2. Implementar validaciones de estado por cada transición
3. Configurar logs de auditoría detallados
4. Validar permisos específicos por operación
5. Implementar notificaciones automáticas
6. Crear endpoints para reportes y dashboards
7. Configurar exportación de datos

---

### FASE5: Services (TODA la Lógica de Negocio)

#### F5.01: Services Base CRUD Completos
**📅 Duración**: 4 días
**🎯 Objetivo**: Crear TODOS los servicios con lógica de negocio en `src/lib/services/`

**📋 Entregables:**
- ✅ `src/lib/services/ordenCompra.ts` con lógica completa
- ✅ `src/lib/services/recepcion.ts` con validaciones de negocio
- ✅ `src/lib/services/pago.ts` con cálculos financieros
- ✅ `src/lib/services/aprovisionamiento.ts` con flujo completo
- ✅ `src/lib/services/historial.ts` para auditoría
- ✅ `src/lib/services/reportes.ts` para dashboards
- ✅ Funciones CRUD estándar: `getAll`, `getById`, `create`, `update`, `delete`
- ✅ Funciones especializadas por workflow
- ✅ Tipado estricto con tipos de `modelos.ts` y `payloads.ts`
- ✅ Cache y optimización de consultas

**🎯 Acciones:**
1. Crear TODOS los servicios con lógica de negocio completa
2. Implementar funciones CRUD estándar para todas las entidades
3. Configurar manejo de errores y logging detallado
4. Validar tipos y payloads en todas las operaciones
5. Implementar cache y optimización de consultas
6. Crear servicios especializados para reportes y auditoría
7. Configurar transacciones y rollback automático

**📝 Ejemplo:**
```typescript
// src/lib/services/ordenCompra.ts
export async function getOrdenesCompra(
  filters: OrdenCompraFilters
): Promise<OrdenCompraConItems[]> {
  try {
    // Lógica de consulta con Prisma
  } catch (error) {
    throw new Error(`Error al obtener órdenes: ${error}`);
  }
}
```

#### F5.02: Services Especializados
**📅 Duración**: 2 días
**🎯 Objetivo**: Implementar funciones específicas de workflow

**📋 Entregables:**
- ✅ `aprobarOrdenCompra()` - Cambiar estado y validar
- ✅ `rechazarOrdenCompra()` - Con motivo de rechazo
- ✅ `aprobarRecepcion()` - Actualizar inventario
- ✅ `rechazarRecepcion()` - Revertir cambios
- ✅ `procesarPago()` - Validar montos y fechas
- ✅ `cancelarPago()` - Con auditoría

**🎯 Acciones:**
1. Desarrollar funciones especializadas por entidad
2. Implementar validaciones de estado
3. Configurar transacciones de base de datos
4. Crear logs de auditoría

#### F5.03: Services de Integración
**📅 Duración**: 1 día
**🎯 Objetivo**: Crear servicios que conecten múltiples entidades

**📋 Entregables:**
- ✅ `generarRecepcionDesdeOrden()` - Crear recepción automática
- ✅ `generarPagoDesdeOrden()` - Crear pago programado
- ✅ `calcularTotalesAprovisionamiento()` - Dashboard financiero
- ✅ `obtenerEstadisticasAprovisionamiento()` - Métricas

**🎯 Acciones:**
1. Crear servicios de integración
2. Implementar cálculos complejos
3. Optimizar consultas relacionadas
4. Configurar cache cuando aplique

---

### FASE6: Componentes Base

#### F6.01: Componentes Lista
**📅 Duración**: 3 días
**🎯 Objetivo**: Crear componentes de lista reutilizables

**📋 Entregables:**
- ✅ `src/components/aprovisionamiento/ordenes-compra/OrdenCompraList.tsx`
- ✅ `src/components/aprovisionamiento/recepciones/RecepcionList.tsx`
- ✅ `src/components/aprovisionamiento/pagos/PagoList.tsx`
- ✅ Props estándar: `data`, `loading`, `onEdit`, `onDelete`, `onView`
- ✅ Filtros integrados con estados y fechas
- ✅ Paginación con `usePagination`
- ✅ Estados visuales: loading, empty, error

**🎯 Acciones:**
1. Desarrollar componentes siguiendo patrones GYS
2. Implementar estados loading/error/empty
3. Configurar props estándar y tipado estricto
4. Aplicar estilos ShadCN + Tailwind

#### F6.02: Componentes Form
**📅 Duración**: 4 días
**🎯 Objetivo**: Crear formularios con validación completa

**📋 Entregables:**
- ✅ `src/components/aprovisionamiento/ordenes-compra/OrdenCompraForm.tsx`
- ✅ `src/components/aprovisionamiento/recepciones/RecepcionForm.tsx`
- ✅ `src/components/aprovisionamiento/pagos/PagoForm.tsx`
- ✅ Integración React Hook Form + Zod
- ✅ Validación inline con mensajes de error
- ✅ Estados: create, edit, view
- ✅ Botones condicionales (Guardar solo si hay cambios)

**🎯 Acciones:**
1. Integrar React Hook Form con schemas Zod
2. Implementar validación en tiempo real
3. Configurar estados de formulario
4. Crear feedback visual para errores

#### F6.03: Componentes Auxiliares
**📅 Duración**: 2 días
**🎯 Objetivo**: Crear componentes de soporte (Select, Accordion)

**📋 Entregables:**
- ✅ `src/components/aprovisionamiento/selects/OrdenCompraSelect.tsx`
- ✅ `src/components/aprovisionamiento/selects/RecepcionSelect.tsx`
- ✅ `src/components/aprovisionamiento/accordions/OrdenCompraAccordion.tsx`
- ✅ `src/components/aprovisionamiento/accordions/RecepcionAccordion.tsx`
- ✅ Opción `__ALL__` para filtros
- ✅ Búsqueda integrada y loading states
- ✅ Expansión/colapso con animaciones

**🎯 Acciones:**
1. Crear componentes Select con búsqueda
2. Implementar Accordions con lazy loading
3. Configurar animaciones Framer Motion
4. Optimizar performance con memoización

---

### FASE7: Páginas

#### F7.01: Páginas Logística
**📅 Duración**: 4 días
**🎯 Objetivo**: Implementar páginas completas del área logística

**📋 Entregables:**
- ✅ `src/app/logistica/ordenes-compra/page.tsx` (Lista con filtros)
- ✅ `src/app/logistica/ordenes-compra/[id]/page.tsx` (Detalle/Edición)
- ✅ `src/app/logistica/ordenes-compra/crear/page.tsx` (Crear nueva)
- ✅ `src/app/logistica/recepciones/page.tsx` (Lista con filtros)
- ✅ `src/app/logistica/recepciones/[id]/page.tsx` (Detalle/Edición)
- ✅ `src/app/logistica/recepciones/crear/page.tsx` (Crear nueva)

**🎯 Acciones:**
1. Crear páginas completas con navegación
2. Implementar breadcrumbs y filtros
3. Integrar componentes desarrollados
4. Configurar responsive design

#### F7.02: Páginas Finanzas
**📅 Duración**: 3 días
**🎯 Objetivo**: Implementar páginas del área financiera

**📋 Entregables:**
- ✅ `src/app/finanzas/pagos/page.tsx` (Lista con filtros)
- ✅ `src/app/finanzas/pagos/[id]/page.tsx` (Detalle/Edición)
- ✅ `src/app/finanzas/pagos/crear/page.tsx` (Crear nuevo)
- ✅ `src/app/finanzas/aprovisionamiento/page.tsx` (Dashboard financiero)

**🎯 Acciones:**
1. Desarrollar páginas financieras
2. Crear dashboard con métricas
3. Implementar gráficos y reportes
4. Configurar permisos específicos

#### F7.03: Características UI Avanzadas
**📅 Duración**: 2 días
**🎯 Objetivo**: Implementar características UX/UI modernas

**📋 Entregables:**
- ✅ Breadcrumb navigation
- ✅ Loading states con Skeleton
- ✅ Error boundaries
- ✅ Responsive design
- ✅ Animaciones Framer Motion

**🎯 Acciones:**
1. Implementar navegación breadcrumb
2. Crear skeleton loaders
3. Configurar error boundaries
4. Optimizar para móviles

---

### FASE8: Sidebar y Navegación

#### F8.01: Integración Sidebar
**📅 Duración**: 2 días
**🎯 Objetivo**: Integrar rutas en navegación por roles

**📋 Entregables:**
- ✅ Actualizar `src/components/layout/Sidebar.tsx`
- ✅ Menús por rol:
  - **Logística**: Órdenes de Compra, Recepciones
  - **Finanzas**: Pagos, Aprovisionamiento Financiero
  - **Admin/Gerente**: Acceso completo
- ✅ Iconos Lucide React
- ✅ Estados activos/inactivos

**🎯 Acciones:**
1. Registrar rutas en sidebar
2. Configurar permisos por rol
3. Asignar iconos apropiados
4. Agrupar por contexto funcional

**📝 Ejemplo:**
```typescript
// Sidebar.tsx - Sección Logística
{
  title: "Logística",
  items: [
    {
      title: "Órdenes de Compra",
      href: "/logistica/ordenes-compra",
      icon: ShoppingCart,
      roles: ["ADMIN", "GERENTE", "LOGISTICA"]
    },
    {
      title: "Recepciones",
      href: "/logistica/recepciones", 
      icon: Package,
      roles: ["ADMIN", "GERENTE", "LOGISTICA"]
    }
  ]
}
```

#### F8.02: Notificaciones y Contadores
**📅 Duración**: 1 día
**🎯 Objetivo**: Implementar sistema de notificaciones

**📋 Entregables:**
- ✅ Contadores de notificaciones (órdenes pendientes, pagos vencidos)
- ✅ Badges dinámicos en sidebar
- ✅ Sistema de alertas en tiempo real
- ✅ Configuración de preferencias de usuario

**🎯 Acciones:**
1. Crear contadores dinámicos
2. Implementar badges de notificación
3. Configurar alertas automáticas
4. Optimizar consultas de conteo

---

### FASE9: Testing y Calidad

#### F9.01: Tests Unitarios
**📅 Duración**: 4 días
**🎯 Objetivo**: Crear tests para APIs y servicios

**📋 Entregables:**
- ✅ `src/__tests__/api/aprovisionamientos/ordenes-compra.test.ts`
- ✅ `src/__tests__/api/aprovisionamientos/recepciones.test.ts`
- ✅ `src/__tests__/api/aprovisionamientos/pagos.test.ts`
- ✅ `src/__tests__/services/ordenCompra.test.ts`
- ✅ `src/__tests__/services/recepcion.test.ts`
- ✅ `src/__tests__/services/pago.test.ts`

**🎯 Acciones:**
1. Crear tests unitarios para servicios
2. Implementar tests de integración para APIs
3. Configurar mocks y fixtures
4. Validar cobertura > 80%

#### F9.02: Tests Componentes
**📅 Duración**: 3 días
**🎯 Objetivo**: Crear tests para componentes React

**📋 Entregables:**
- ✅ `src/__tests__/components/aprovisionamiento/OrdenCompraList.test.tsx`
- ✅ `src/__tests__/components/aprovisionamiento/OrdenCompraForm.test.tsx`
- ✅ `src/__tests__/components/aprovisionamiento/RecepcionList.test.tsx`
- ✅ `src/__tests__/components/aprovisionamiento/RecepcionForm.test.tsx`
- ✅ `src/__tests__/components/aprovisionamiento/PagoList.test.tsx`
- ✅ `src/__tests__/components/aprovisionamiento/PagoForm.test.tsx`

**🎯 Acciones:**
1. Crear tests de renderizado
2. Implementar tests de interacción
3. Validar props y estados
4. Configurar testing utilities

#### F9.03: Tests E2E y Integración
**📅 Duración**: 2 días
**🎯 Objetivo**: Crear tests de flujos completos

**📋 Entregables:**
- ✅ Tests de flujo completo de órdenes
- ✅ Tests de integración API-Frontend
- ✅ Tests de autorización por roles
- ✅ Tests de validación de formularios

**🎯 Acciones:**
1. Configurar Playwright/Cypress
2. Crear tests de flujos críticos
3. Implementar tests de regresión
4. Validar performance

---

### FASE10: Optimización y Deployment

#### F10.01: Optimización Performance
**📅 Duración**: 3 días
**🎯 Objetivo**: Optimizar rendimiento y bundle

**📋 Entregables:**
- ✅ **Lazy Loading**: Componentes pesados
- ✅ **Memoización**: React.memo, useMemo, useCallback
- ✅ **Prisma**: Optimización de queries (include, select)
- ✅ **Caching**: Redis para consultas frecuentes
- ✅ **Bundle**: Análisis y code splitting

**🎯 Acciones:**
1. Implementar lazy loading
2. Optimizar queries Prisma
3. Configurar caching estratégico
4. Analizar y reducir bundle size

#### F10.02: Métricas y Monitoreo
**📅 Duración**: 2 días
**🎯 Objetivo**: Establecer métricas de calidad

**📋 Entregables:**
- ✅ **Performance**: Lighthouse > 90
- ✅ **Cobertura**: Tests > 80%
- ✅ **Bundle Size**: < 500KB inicial
- ✅ **Core Web Vitals**: LCP < 2.5s, FID < 100ms
- ✅ **Accesibilidad**: AA compliant

**🎯 Acciones:**
1. Configurar métricas automáticas
2. Implementar monitoring
3. Crear dashboards de performance
4. Establecer alertas de calidad

#### F10.03: Comandos y Documentación
**📅 Duración**: 1 día
**🎯 Objetivo**: Documentar procesos de testing

**📋 Entregables:**
```bash
# Ejecutar todos los tests
npm run test

# Tests con cobertura
npm run test:coverage

# Tests E2E
npm run test:e2e

# Build y verificación
npm run build
npm run type-check
```

**🎯 Acciones:**
1. Documentar comandos de testing
2. Crear guías de desarrollo
3. Establecer workflows CI/CD
4. Configurar deployment automático

---

## 📋 Checklist de Verificación por Entidad

> **🎯 Uso**: Marcar cada elemento al completarlo para asegurar implementación completa según FLUJO_GYS

### 🛒 OrdenCompra

#### ✅ FASE 1: Modelo Prisma
- [ ] Modelo `OrdenCompra` definido en `schema.prisma`
- [ ] Modelo `OrdenCompraItem` definido
- [ ] Enum `EstadoOrdenCompra` creado
- [ ] Relaciones configuradas con `onDelete: Cascade`
- [ ] Migración aplicada: `npx prisma db push`

#### ✅ FASE 2: Types - Modelos
- [ ] `OrdenCompra` type en `src/types/modelos.ts`
- [ ] `OrdenCompraConItems` type con relaciones
- [ ] `OrdenCompraItem` type definido
- [ ] Enums importados desde Prisma

#### ✅ FASE 3: Types - Payloads
- [ ] `CreateOrdenCompraPayload` en `src/types/payloads.ts`
- [ ] `UpdateOrdenCompraPayload` definido
- [ ] `OrdenCompraFilters` para filtros
- [ ] `OrdenCompraResponse` para respuestas API

#### ✅ FASE 4: Validators Zod
- [ ] `createOrdenCompraSchema` en `src/lib/validators/aprovisionamiento.ts`
- [ ] `updateOrdenCompraSchema` definido
- [ ] Mensajes de error en español
- [ ] Validación de campos requeridos

#### ✅ FASE 5: API Routes
- [ ] `src/app/api/aprovisionamientos/ordenes-compra/route.ts` (GET, POST)
- [ ] `src/app/api/aprovisionamientos/ordenes-compra/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Validación Zod en todas las rutas
- [ ] Manejo de errores con `try/catch`
- [ ] Filtros implementados (estado, proveedor, fechas)

#### ✅ FASE 6: Services
- [ ] `src/lib/services/ordenCompra.ts` creado
- [ ] `getOrdenesCompra()` con filtros
- [ ] `getOrdenCompraById()` implementado
- [ ] `createOrdenCompra()` con validación
- [ ] `updateOrdenCompra()` implementado
- [ ] `deleteOrdenCompra()` implementado
- [ ] `aprobarOrdenCompra()` función especializada

#### ✅ FASE 7: Componentes
- [ ] `src/components/aprovisionamiento/ordenes-compra/OrdenCompraList.tsx`
- [ ] `src/components/aprovisionamiento/ordenes-compra/OrdenCompraForm.tsx`
- [ ] `src/components/aprovisionamiento/selects/OrdenCompraSelect.tsx`
- [ ] `src/components/aprovisionamiento/accordions/OrdenCompraAccordion.tsx`
- [ ] Props estándar implementados
- [ ] Estados loading/error/empty

#### ✅ FASE 8: Páginas
- [ ] `src/app/logistica/ordenes-compra/page.tsx` (Lista)
- [ ] `src/app/logistica/ordenes-compra/[id]/page.tsx` (Detalle)
- [ ] `src/app/logistica/ordenes-compra/crear/page.tsx` (Crear)
- [ ] Breadcrumb navigation
- [ ] Responsive design

#### ✅ FASE 9: Sidebar
- [ ] Ruta agregada en `src/components/layout/Sidebar.tsx`
- [ ] Permisos por rol configurados
- [ ] Icono Lucide React asignado
- [ ] Estados activo/inactivo

#### ✅ FASE 10: Testing
- [ ] `src/__tests__/api/aprovisionamientos/ordenes-compra.test.ts`
- [ ] `src/__tests__/services/ordenCompra.test.ts`
- [ ] `src/__tests__/components/aprovisionamiento/OrdenCompraList.test.tsx`
- [ ] `src/__tests__/components/aprovisionamiento/OrdenCompraForm.test.tsx`
- [ ] Cobertura > 80%

---

### 📦 Recepcion

#### ✅ FASE 1: Modelo Prisma
- [ ] Modelo `Recepcion` definido en `schema.prisma`
- [ ] Modelo `RecepcionItem` definido
- [ ] Enum `EstadoRecepcion` creado
- [ ] Enum `EstadoInspeccion` creado
- [ ] Relaciones configuradas con `onDelete: Cascade`
- [ ] Migración aplicada: `npx prisma db push`

#### ✅ FASE 2: Types - Modelos
- [ ] `Recepcion` type en `src/types/modelos.ts`
- [ ] `RecepcionConItems` type con relaciones
- [ ] `RecepcionItem` type definido
- [ ] Enums importados desde Prisma

#### ✅ FASE 3: Types - Payloads
- [ ] `CreateRecepcionPayload` en `src/types/payloads.ts`
- [ ] `UpdateRecepcionPayload` definido
- [ ] `RecepcionFilters` para filtros
- [ ] `RecepcionResponse` para respuestas API

#### ✅ FASE 4: Validators Zod
- [ ] `createRecepcionSchema` en `src/lib/validators/aprovisionamiento.ts`
- [ ] `updateRecepcionSchema` definido
- [ ] Mensajes de error en español
- [ ] Validación de campos requeridos

#### ✅ FASE 5: API Routes
- [ ] `src/app/api/aprovisionamientos/recepciones/route.ts` (GET, POST)
- [ ] `src/app/api/aprovisionamientos/recepciones/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Validación Zod en todas las rutas
- [ ] Manejo de errores con `try/catch`
- [ ] Filtros implementados (estado, orden compra, fechas)

#### ✅ FASE 6: Services
- [ ] `src/lib/services/recepcion.ts` creado
- [ ] `getRecepciones()` con filtros
- [ ] `getRecepcionById()` implementado
- [ ] `createRecepcion()` con validación
- [ ] `updateRecepcion()` implementado
- [ ] `deleteRecepcion()` implementado
- [ ] `aprobarRecepcion()` función especializada
- [ ] `rechazarRecepcion()` función especializada

#### ✅ FASE 7: Componentes
- [ ] `src/components/aprovisionamiento/recepciones/RecepcionList.tsx`
- [ ] `src/components/aprovisionamiento/recepciones/RecepcionForm.tsx`
- [ ] `src/components/aprovisionamiento/selects/RecepcionSelect.tsx`
- [ ] `src/components/aprovisionamiento/accordions/RecepcionAccordion.tsx`
- [ ] Props estándar implementados
- [ ] Estados loading/error/empty

#### ✅ FASE 8: Páginas
- [ ] `src/app/logistica/recepciones/page.tsx` (Lista)
- [ ] `src/app/logistica/recepciones/[id]/page.tsx` (Detalle)
- [ ] `src/app/logistica/recepciones/crear/page.tsx` (Crear)
- [ ] Breadcrumb navigation
- [ ] Responsive design

#### ✅ FASE 9: Sidebar
- [ ] Ruta agregada en `src/components/layout/Sidebar.tsx`
- [ ] Permisos por rol configurados
- [ ] Icono Lucide React asignado
- [ ] Estados activo/inactivo

#### ✅ FASE 10: Testing
- [ ] `src/__tests__/api/aprovisionamientos/recepciones.test.ts`
- [ ] `src/__tests__/services/recepcion.test.ts`
- [ ] `src/__tests__/components/aprovisionamiento/RecepcionList.test.tsx`
- [ ] `src/__tests__/components/aprovisionamiento/RecepcionForm.test.tsx`
- [ ] Cobertura > 80%

---

### 💰 Pago

#### ✅ FASE 1: Modelo Prisma
- [ ] Modelo `Pago` definido en `schema.prisma`
- [ ] Enum `TipoPago` creado
- [ ] Enum `EstadoPago` creado
- [ ] Relaciones configuradas con `onDelete: Cascade`
- [ ] Migración aplicada: `npx prisma db push`

#### ✅ FASE 2: Types - Modelos
- [ ] `Pago` type en `src/types/modelos.ts`
- [ ] `PagoConOrdenCompra` type con relaciones
- [ ] Enums importados desde Prisma

#### ✅ FASE 3: Types - Payloads
- [ ] `CreatePagoPayload` en `src/types/payloads.ts`
- [ ] `UpdatePagoPayload` definido
- [ ] `PagoFilters` para filtros
- [ ] `PagoResponse` para respuestas API

#### ✅ FASE 4: Validators Zod
- [ ] `createPagoSchema` en `src/lib/validators/aprovisionamiento.ts`
- [ ] `updatePagoSchema` definido
- [ ] Mensajes de error en español
- [ ] Validación de campos requeridos

#### ✅ FASE 5: API Routes
- [ ] `src/app/api/aprovisionamientos/pagos/route.ts` (GET, POST)
- [ ] `src/app/api/aprovisionamientos/pagos/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Validación Zod en todas las rutas
- [ ] Manejo de errores con `try/catch`
- [ ] Filtros implementados (estado, tipo, montos, fechas)

#### ✅ FASE 6: Services
- [ ] `src/lib/services/pago.ts` creado
- [ ] `getPagos()` con filtros
- [ ] `getPagoById()` implementado
- [ ] `createPago()` con validación
- [ ] `updatePago()` implementado
- [ ] `deletePago()` implementado
- [ ] `procesarPago()` función especializada
- [ ] `cancelarPago()` función especializada

#### ✅ FASE 7: Componentes
- [ ] `src/components/aprovisionamiento/pagos/PagoList.tsx`
- [ ] `src/components/aprovisionamiento/pagos/PagoForm.tsx`
- [ ] `src/components/aprovisionamiento/selects/PagoSelect.tsx`
- [ ] `src/components/aprovisionamiento/accordions/PagoAccordion.tsx`
- [ ] Props estándar implementados
- [ ] Estados loading/error/empty

#### ✅ FASE 8: Páginas
- [ ] `src/app/finanzas/pagos/page.tsx` (Lista)
- [ ] `src/app/finanzas/pagos/[id]/page.tsx` (Detalle)
- [ ] `src/app/finanzas/pagos/crear/page.tsx` (Crear)
- [ ] Breadcrumb navigation
- [ ] Responsive design

#### ✅ FASE 9: Sidebar
- [ ] Ruta agregada en `src/components/layout/Sidebar.tsx`
- [ ] Permisos por rol configurados
- [ ] Icono Lucide React asignado
- [ ] Estados activo/inactivo

#### ✅ FASE 10: Testing
- [ ] `src/__tests__/api/aprovisionamientos/pagos.test.ts`
- [ ] `src/__tests__/services/pago.test.ts`
- [ ] `src/__tests__/components/aprovisionamiento/PagoList.test.tsx`
- [ ] `src/__tests__/components/aprovisionamiento/PagoForm.test.tsx`
- [ ] Cobertura > 80%

---

## 🚀 Comandos de Verificación

```bash
# 🔍 Verificar tipos
npx tsc --noEmit --skipLibCheck

# 🏗️ Build completo
npx next build --no-lint

# 🧪 Ejecutar tests
npm run test

# 📊 Cobertura de tests
npm run test:coverage

# 🔄 Aplicar migraciones Prisma
npx prisma db push
npx prisma generate

# 🎯 Verificar linting
npm run lint

# 🚀 Iniciar desarrollo
npm run dev
```

---

## 📝 Notas Finales

> **✅ Documento Actualizado**: Este plan maestro está completamente alineado con **FLUJO_GYS**
> **🎯 Objetivo**: Servir como guía base para verificar y crear componentes de aprovisionamiento
> **📋 Metodología**: Seguir los 10 pasos secuencialmente para cada entidad
> **⚡ Eficiencia**: Marcar cada checkbox al completar para tracking de progreso

**🧙‍♂️ Master Experto - Jesús Artemio**  
*Especialista en Next.js 14+ y Arquitectura Enterprise*

---

## 📋 Verificación Final y Comandos

### ✅ Lista de Verificación Completa

#### **FASE 1: Modelos Prisma**
- [ ] `OrdenCompra` model creado en `prisma/schema.prisma`
- [ ] `OrdenCompraItem` model creado
- [ ] `Recepcion` model creado
- [ ] `RecepcionItem` model creado
- [ ] `Pago` model creado
- [ ] Enums creados: `EstadoOrdenCompra`, `EstadoRecepcion`, `TipoRecepcion`, `EstadoInspeccion`, `TipoPago`, `EstadoPago`
- [ ] Relaciones configuradas correctamente
- [ ] Migración ejecutada: `npx prisma migrate dev --name add-aprovisionamiento-models`

#### **FASE 2: Types y Validators**
- [ ] Types en `src/types/modelos.ts`
- [ ] Payloads en `src/types/payloads.ts`
- [ ] Validators Zod en `src/lib/validators/aprovisionamiento.ts`

#### **FASE 3: API Routes**
- [ ] `src/app/api/logistica/ordenes-compra/route.ts` (GET, POST)
- [ ] `src/app/api/logistica/ordenes-compra/[id]/route.ts` (GET, PUT, DELETE)
- [ ] `src/app/api/logistica/recepciones/route.ts`
- [ ] `src/app/api/logistica/recepciones/[id]/route.ts`
- [ ] `src/app/api/finanzas/pagos/route.ts`
- [ ] `src/app/api/finanzas/pagos/[id]/route.ts`

#### **FASE 4: Services**
- [ ] `src/lib/services/ordenCompra.ts`
- [ ] `src/lib/services/recepcion.ts`
- [ ] `src/lib/services/pago.ts`

#### **FASE 5: Components**
- [ ] `src/components/logistica/OrdenesCompraList.tsx`
- [ ] `src/components/logistica/OrdenesCompraForm.tsx`
- [ ] `src/components/logistica/OrdenesCompraSelect.tsx`
- [ ] `src/components/logistica/RecepcionesList.tsx`
- [ ] `src/components/logistica/RecepcionesForm.tsx`
- [ ] `src/components/finanzas/PagosList.tsx`
- [ ] `src/components/finanzas/PagosForm.tsx`

#### **FASE 6: Pages**
- [ ] `src/app/(logistica)/ordenes-compra/page.tsx`
- [ ] `src/app/(logistica)/ordenes-compra/nueva/page.tsx`
- [ ] `src/app/(logistica)/ordenes-compra/[id]/page.tsx`
- [ ] `src/app/(logistica)/recepciones/page.tsx`
- [ ] `src/app/(finanzas)/pagos/page.tsx`

#### **FASE 7: Sidebar Integration**
- [ ] Rutas agregadas en `src/components/layout/Sidebar.tsx`
- [ ] Permisos por rol configurados

#### **FASE 8: Testing**
- [ ] Tests unitarios para servicios
- [ ] Tests de integración para APIs
- [ ] Tests de componentes

### 🔧 Comandos de Verificación

```bash
# Verificar modelos Prisma
npx prisma validate
npx prisma format

# Ejecutar migración
npx prisma migrate dev --name add-aprovisionamiento-models

# Generar cliente Prisma
npx prisma generate

# Verificar tipos TypeScript
npx tsc --noEmit

# Ejecutar tests
npm run test

# Verificar build
npm run build

# Ejecutar desarrollo
npm run dev
```

### 📝 Notas Finales

1. **Seguir FLUJO_GYS**: Cada entidad debe implementarse siguiendo los 10 pasos metodológicos
2. **Consistencia de tipos**: Usar aliases en `payloads.ts` que apunten a validators
3. **Validación estricta**: Zod + React Hook Form en todos los formularios
4. **UI moderna**: ShadCN + Tailwind + Framer Motion
5. **Testing completo**: Jest + Testing Library para todas las capas
6. **Documentación**: Comentarios claros y estandarizados

---

**✅ Documento actualizado y alineado con FLUJO_GYS**  
**📅 Última actualización**: $(date)  
**🎯 Listo para implementación sistemática**
          <div className="flex gap-4 items-center">
            <div className="flex-1">
## 📋 Notas Finales

- **Adherencia a FLUJO_GYS**: Cada implementación debe seguir estrictamente los 10 pasos metodológicos
- **Calidad Enterprise**: Aplicar principios SOLID, DRY, KISS y Clean Code
- **Tipado Estricto**: TypeScript en todo el proyecto con validación Zod
- **UX/UI Moderna**: Componentes shadcn/ui con animaciones Framer Motion
- **Testing**: Cobertura completa con Jest y Testing Library
- **Documentación**: Comentarios claros y estandarizados en el código

---

**Documento actualizado según metodología FLUJO_GYS**  
*Versión: 2.0 | Fecha: Enero 2025*
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPedido.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.equipo.nombre}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.equipo.especificaciones || 'N/A'}
                        </TableCell>
                        <TableCell>{item.cantidad}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={itemsPrecios[item.id] || ''}
                            onChange={(e) => handlePrecioChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.cantidad * (itemsPrecios[item.id] || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Monto Total</div>
                    <div className="text-2xl font-bold">{formatCurrency(calcularMontoTotal())}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => window.location.href = '/logistica/ordenes-compra'}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedPedido}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Crear Orden de Compra
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

#### ✅ Entregables Fase 3
- [ ] Página principal de Órdenes de Compra
- [ ] Formulario de nueva orden
- [ ] Vista de detalle de orden
- [ ] Dashboard operativo básico
- [ ] Navegación y menús configurados

---

### 🎯 FASE 4: Frontend Logística - Recepciones (Semanas 7-8)

#### 📋 Objetivos
- Crear interfaz para gestión de recepciones
- Implementar proceso de inspección
- Desarrollar control de entregas
- Integrar con sistema de notificaciones

#### ✅ Entregables Fase 4
- [ ] Página de gestión de recepciones
- [ ] Formulario de nueva recepción
- [ ] Sistema de inspección y aprobación
- [ ] Control de entregas parciales
- [ ] Notificaciones automáticas a Finanzas

---

### 🎯 FASE 5: Frontend Finanzas - Análisis Avanzado (Semanas 9-10)

#### 📋 Objetivos
- Mejorar página de aprovisionamientos
- Implementar análisis financiero avanzado
- Crear dashboard de flujo de caja
- Desarrollar reportes ejecutivos

#### ✅ Entregables Fase 5
- [ ] Dashboard financiero mejorado
- [ ] Análisis de costos y variaciones
- [ ] Proyecciones de flujo de caja
- [ ] Reportes ejecutivos
- [ ] Métricas financieras avanzadas

---

### 🎯 FASE 6: Integración y Optimización (Semanas 11-12)

#### 📋 Objetivos
- Integrar completamente ambas áreas
- Optimizar rendimiento del sistema
- Implementar pruebas completas
- Capacitar usuarios finales

#### ✅ Entregables Fase 6
- [ ] Integración completa Finanzas-Logística
- [ ] Optimización de rendimiento
- [ ] Suite de pruebas completa
- [ ] Documentación de usuario
- [ ] Capacitación de equipos
- [ ] Despliegue en producción

---

## 🔧 Configuración Técnica

### 📁 Estructura de Archivos
```
src/
├── app/
│   ├── logistica/
│   │   ├── ordenes-compra/
│   │   │   ├── page.tsx
│   │   │   ├── nueva/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── editar/
│   │   │           └── page.tsx
│   │   └── recepciones/
│   │       ├── page.tsx
│   │       ├── nueva/
│   │       │   └── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   ├── finanzas/
│   │   ├── aprovisionamientos/
│   │   │   ├── page.tsx
│   │   │   ├── proyecciones/
│   │   │   │   └── page.tsx
│   │   │   └── cronograma/
│   │   │       └── page.tsx
│   │   └── flujo-caja/
│   │       ├── page.tsx
│   │       ├── adelantos/
│   │       │   └── page.tsx
│   │       └── metricas/
│   │           └── page.tsx
│   └── api/
│       ├── logistica/
│       │   ├── ordenes-compra/
│       │   │   ├── route.ts
│       │   │   └── [id]/
│       │   │       └── route.ts
│       │   └── recepciones/
│       │       ├── route.ts
│       │       └── [id]/
│       │           └── route.ts
│       └── finanzas/
│           ├── aprovisionamientos/
│           │   └── route.ts
│           └── flujo-caja/
│               └── route.ts
├── components/
│   ├── logistica/
│   │   ├── OrdenesCompraTable.tsx
│   │   ├── NuevaOrdenCompraForm.tsx
│   │   ├── RecepcionesTable.tsx
│   │   └── DashboardLogistica.tsx
│   └── finanzas/
│       ├── AprovisionamientoFinanciero.tsx
│       ├── FlujoCajaTable.tsx
│       └── DashboardFinanzas.tsx
├── lib/
│   ├── services/
│   │   ├── ordenCompra.ts
│   │   ├── recepcion.ts
│   │   ├── pago.ts
│   │   └── aprovisionamientoFinanciero.ts
│   └── events/
│       └── aprovisionamiento-events.ts
└── types/
    ├── ordenCompra.ts
    ├── recepcion.ts
    ├── pago.ts
    └── aprovisionamiento.ts
```

### 🔐 Configuración de Permisos

```typescript
// middleware.ts - Configuración de autorización
export const rolePermissions = {
  // Logística
  LOGISTICA: [
    '/logistica/ordenes-compra',
    '/logistica/recepciones',
    '/logistica/proveedores',
    '/logistica/dashboard'
  ],
  COORDINADOR: [
    '/logistica/ordenes-compra',
    '/logistica/recepciones'
  ],
  
  // Finanzas
  GERENTE: [
    '/finanzas/aprovisionamientos',
    '/finanzas/flujo-caja',
    '/finanzas/reportes'
  ],
  GESTOR: [
    '/finanzas/aprovisionamientos',
    '/finanzas/flujo-caja'
  ],
  
  // Admin
  ADMIN: ['*'] // Acceso completo
};
```

### 📊 Menús de Navegación

#### 🚚 Menú Logística
```typescript
export const menuLogistica = [
  {
    title: 'Dashboard',
    href: '/logistica/dashboard',
    icon: 'BarChart3',
    roles: ['ADMIN', 'LOGISTICA', 'COORDINADOR']
  },
  {
    title: 'Órdenes de Compra',
    href: '/logistica/ordenes-compra',
    icon: 'ShoppingCart',
    roles: ['ADMIN', 'LOGISTICA', 'COORDINADOR'],
    submenu: [
      { title: 'Lista de Órdenes', href: '/logistica/ordenes-compra' },
      { title: 'Nueva Orden', href: '/logistica/ordenes-compra/nueva' },
      { title: 'Pendientes de Aprobación', href: '/logistica/ordenes-compra?estado=BORRADOR' }
    ]
  },
  {
    title: 'Recepciones',
    href: '/logistica/recepciones',
    icon: 'Package',
    roles: ['ADMIN', 'LOGISTICA', 'COORDINADOR'],
    submenu: [
      { title: 'Lista de Recepciones', href: '/logistica/recepciones' },
      { title: 'Nueva Recepción', href: '/logistica/recepciones/nueva' },
      { title: 'Pendientes de Inspección', href: '/logistica/recepciones?estado=PENDIENTE' }
    ]
  },
  {
    title: 'Proveedores',
    href: '/logistica/proveedores',
    icon: 'Users',
    roles: ['ADMIN', 'LOGISTICA']
  }
];
```

#### 💰 Menú Finanzas
```typescript
export const menuFinanzas = [
  {
    title: 'Dashboard',
    href: '/finanzas/dashboard',
    icon: 'TrendingUp',
    roles: ['ADMIN', 'GERENTE', 'GESTOR']
  },
  {
    title: 'Aprovisionamientos',
    href: '/finanzas/aprovisionamientos',
    icon: 'Calculator',
    roles: ['ADMIN', 'GERENTE', 'GESTOR'],
    submenu: [
      { title: 'Análisis Financiero', href: '/finanzas/aprovisionamientos' },
      { title: 'Proyecciones', href: '/finanzas/aprovisionamientos/proyecciones' },
      { title: 'Cronograma', href: '/finanzas/aprovisionamientos/cronograma' }
    ]
  },
  {
    title: 'Flujo de Caja',
    href: '/finanzas/flujo-caja',
    icon: 'DollarSign',
    roles: ['ADMIN', 'GERENTE', 'GESTOR'],
    submenu: [
      { title: 'Control de Pagos', href: '/finanzas/flujo-caja' },
      { title: 'Adelantos', href: '/finanzas/flujo-caja/adelantos' },
      { title: 'Métricas', href: '/finanzas/flujo-caja/metricas' }
    ]
  },
  {
    title: 'Reportes',
    href: '/finanzas/reportes',
    icon: 'FileText',
    roles: ['ADMIN', 'GERENTE']
  }
];
```

---

## 📈 KPIs y Métricas de Éxito

### 🚚 Métricas Logística
- **Tiempo promedio de creación de PO**: < 2 días
- **Porcentaje de entregas a tiempo**: > 85%
- **Precisión en recepciones**: > 95%
- **Tiempo de inspección**: < 24 horas
- **Satisfacción de proveedores**: > 4.0/5.0

### 💰 Métricas Finanzas
- **Precisión en proyecciones**: ±5% del real
- **Tiempo de procesamiento de pagos**: < 3 días
- **Control de adelantos**: 100% trazabilidad
- **Variación presupuestaria**: < 10%
- **ROI de aprovisionamientos**: > 15%

### 🔄 Métricas de Integración
- **Sincronización automática**: > 99% éxito
- **Tiempo de actualización**: < 5 minutos
- **Notificaciones entregadas**: > 98%
- **Consistencia de datos**: 100%

---

## 🧪 Estrategia de Pruebas

### 🔧 Pruebas Unitarias
```typescript
// __tests__/services/ordenCompra.test.ts
import { OrdenCompraService } from '@/lib/services/ordenCompra';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  ordenCompra: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  }
}));

describe('OrdenCompraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrdenes', () => {
    it('should return orders with pagination', async () => {
      const mockOrdenes = [
        { id: '1', numero: 'PO-000001', estado: 'ENVIADA' },
        { id: '2', numero: 'PO-000002', estado: 'CONFIRMADA' }
      ];
      
      (prisma.ordenCompra.findMany as jest.Mock).mockResolvedValue(mockOrdenes);
      (prisma.ordenCompra.count as jest.Mock).mockResolvedValue(2);

      const result = await OrdenCompraService.getOrdenes({}, 1, 10);

      expect(result.ordenes).toEqual(mockOrdenes);
      expect(result.pagination.total).toBe(2);
      expect(prisma.ordenCompra.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { fechaCreacion: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('createOrden', () => {
    it('should create order with generated number', async () => {
      const mockData = {
        pedidoEquipoId: 'pedido-1',
        proveedorId: 'proveedor-1',
        fechaRequerida: new Date(),
        items: [
          {
            pedidoEquipoItemId: 'item-1',
            cantidad: 5,
            precioUnitario: 100
          }
        ]
      };

      const mockOrden = {
        id: 'orden-1',
        numero: 'PO-000001',
        ...mockData
      };

      (prisma.ordenCompra.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.ordenCompra.create as jest.Mock).mockResolvedValue(mockOrden);

      const result = await OrdenCompraService.createOrden(mockData, 'user-1');

      expect(result).toEqual(mockOrden);
      expect(prisma.ordenCompra.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          numero: 'PO-000001',
          montoTotal: 500,
          creadoPor: 'user-1'
        }),
        include: expect.any(Object)
      });
    });
  });
});
```

### 🎭 Pruebas de Integración
```typescript
// __tests__/integration/aprovisionamiento.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '@/app/api/logistica/ordenes-compra/route';

describe('/api/logistica/ordenes-compra', () => {
  it('should create order and sync with finance', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pedidoEquipoId: 'pedido-test',
            proveedorId: 'proveedor-test',
            fechaRequerida: new Date().toISOString(),
            items: [
              {
                pedidoEquipoItemId: 'item-test',
                cantidad: 10,
                precioUnitario: 50
              }
            ]
          })
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.numero).toMatch(/^PO-\d{6}$/);
        expect(data.montoTotal).toBe(500);
      }
    });
  });
});
```

---

## 🚀 Cronograma de Despliegue

### 📅 Calendario de Releases

| Semana | Fase | Entregables | Ambiente |
|--------|------|-------------|----------|
| 1-2 | Fase 1 | Modelos Prisma, APIs base | Desarrollo |
| 3-4 | Fase 2 | APIs completas, Servicios | Desarrollo |
| 5-6 | Fase 3 | Frontend Logística PO | Testing |
| 7-8 | Fase 4 | Frontend Logística Recepciones | Testing |
| 9-10 | Fase 5 | Frontend Finanzas | Staging |
| 11-12 | Fase 6 | Integración completa | Producción |

### 🎯 Criterios de Aceptación por Fase

#### ✅ Fase 1 - Completada cuando:
- [ ] Todos los modelos Prisma migrados sin errores
- [ ] Relaciones entre entidades funcionando
- [ ] Sistema de eventos configurado
- [ ] Base de datos poblada con datos de prueba

#### ✅ Fase 2 - Completada cuando:
- [ ] APIs REST responden correctamente
- [ ] Validaciones Zod implementadas
- [ ] Servicios de negocio probados
- [ ] Sincronización automática funcionando

#### ✅ Fase 3 - Completada cuando:
- [ ] Lista de PO carga y filtra correctamente
- [ ] Formulario de nueva PO funciona
- [ ] Estados de PO se actualizan
- [ ] Navegación entre páginas fluida

#### ✅ Fase 4 - Completada cuando:
- [ ] Recepciones se crean desde PO
- [ ] Inspección y aprobación funciona
- [ ] Notificaciones a Finanzas enviadas
- [ ] Control de entregas parciales

#### ✅ Fase 5 - Completada cuando:
- [ ] Dashboard financiero actualizado
- [ ] Análisis de costos preciso
- [ ] Flujo de caja sincronizado
- [ ] Reportes generados correctamente

#### ✅ Fase 6 - Completada cuando:
- [ ] Integración completa probada
- [ ] Performance optimizado
- [ ] Usuarios capacitados
- [ ] Sistema en producción estable

---

## 📚 Documentación y Capacitación

### 📖 Documentos a Crear
- **Manual de Usuario Logística**: Gestión de PO y Recepciones
- **Manual de Usuario Finanzas**: Análisis y Flujo de Caja
- **Guía de Administrador**: Configuración y mantenimiento
- **API Documentation**: Endpoints y ejemplos
- **Troubleshooting Guide**: Solución de problemas comunes

### 🎓 Plan de Capacitación
1. **Sesión 1**: Introducción al nuevo sistema (2 horas)
2. **Sesión 2**: Logística - Gestión de PO (3 horas)
3. **Sesión 3**: Logística - Recepciones e Inspección (2 horas)
4. **Sesión 4**: Finanzas - Análisis y Proyecciones (3 horas)
5. **Sesión 5**: Finanzas - Flujo de Caja (2 horas)
6. **Sesión 6**: Integración y Casos de Uso (2 horas)

---

## 🔧 Configuración de Desarrollo

### 📦 Dependencias Adicionales
```json
{
  "dependencies": {
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0",
    "framer-motion": "^10.16.0",
    "react-hook-form": "^7.47.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "next-test-api-route-handler": "^4.0.0"
  }
}
```

### 🔨 Scripts de Desarrollo
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

---

## 🎯 Próximos Pasos Recomendados

### 🚀 Para Comenzar Inmediatamente
1. **Revisar y aprobar este plan maestro**
2. **Configurar ambiente de desarrollo**
3. **Iniciar Fase 1**: Crear modelos Prisma
4. **Configurar repositorio y CI/CD**
5. **Definir equipo de desarrollo**

### 📋 Checklist de Inicio
- [ ] Plan maestro aprobado por stakeholders
- [ ] Equipo de desarrollo asignado
- [ ] Ambiente de desarrollo configurado
- [ ] Base de datos de desarrollo lista
- [ ] Repositorio Git configurado
- [ ] CI/CD pipeline básico
- [ ] Herramientas de testing configuradas

---

## 💡 Beneficios Esperados

### 🚚 Para Logística
- **Eficiencia operativa**: Reducción 40% tiempo gestión PO
- **Control de entregas**: Trazabilidad completa 100%
- **Comunicación proveedores**: Automatización 80%
- **Reducción errores**: Mejora 60% precisión

### 💰 Para Finanzas
- **Visibilidad financiera**: Tiempo real 100%
- **Control de costos**: Reducción 25% variaciones
- **Flujo de caja**: Proyecciones precisas ±5%
- **Reportes ejecutivos**: Automatización 90%

### 🔄 Para la Organización
- **Integración áreas**: Sincronización automática
- **Toma de decisiones**: Información en tiempo real
- **Cumplimiento**: Trazabilidad completa
- **Escalabilidad**: Arquitectura modular

---

*Este plan maestro está diseñado para ser ejecutado de manera incremental, permitiendo validar cada fase antes de continuar con la siguiente. La separación clara de responsabilidades entre Logística y Finanzas, junto con la integración automática, garantiza un sistema robusto y eficiente.*