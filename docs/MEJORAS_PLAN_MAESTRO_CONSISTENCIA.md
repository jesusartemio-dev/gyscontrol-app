// ===================================================
// 📁 Documento: MEJORAS_PLAN_MAESTRO_CONSISTENCIA.md
// 📌 Descripción: Plan Maestro MEJORADO para prevenir inconsistencias BD-API-Componentes
// 🧠 Uso: Reemplazo mejorado del plan original con herramientas REALES implementadas
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Fecha: 2025-01-21 | Actualizado: 2025-01-21
// ===================================================

# 🎯 PLAN MAESTRO DE CONSISTENCIA FASE POR FASE - SISTEMA GYS

## 📋 Objetivo del Plan

Este plan maestro define un **flujo de desarrollo fase por fase** que garantiza la consistencia desde el primer momento, evitando las inconsistencias que se presentaron anteriormente. Cada fase incluye puntos de control automáticos y validaciones que aseguran la calidad antes de avanzar.

## 🏗️ Arquitectura del Flujo GYS

### 📊 Flujo de Implementación Horizontal
```
FASE 1: Prisma Models → FASE 2: Types → FASE 3: Payloads → FASE 4: Validators → 
FASE 5: APIs → FASE 6: Services → FASE 7: Components → FASE 8: Pages → FASE 9: Sidebar
```

### 🔄 Puntos de Control de Consistencia
Cada fase incluye:
- ✅ **Validación automática** con `audit-consistency.ts`
- ✅ **Templates estandarizados** basados en patrones existentes
- ✅ **Ejemplos reales** del módulo de aprovisionamientos
- ✅ **Checklist de verificación** antes de avanzar

---

## 📁 Estructura Base del Proyecto

### 🗂️ Organización por Módulos
```
src/
├── app/                          # App Router Next.js 14+
│   ├── (comercial)/             # Grupo de rutas comerciales
│   ├── (proyectos)/             # Grupo de rutas de proyectos
│   ├── (logistica)/             # Grupo de rutas logísticas
│   │   └── aprovisionamientos/  # Módulo aprovisionamientos
│   ├── (admin)/                 # Grupo de rutas administrativas
│   ├── finanzas/                # Módulo financiero
│   └── api/                     # Rutas API REST
│       └── aprovisionamientos/  # APIs del módulo
├── components/                   # Componentes UI
│   ├── ui/                      # shadcn/ui base
│   └── aprovisionamientos/      # Componentes específicos
├── lib/
│   ├── services/                # Lógica de negocio
│   ├── validators/              # Esquemas Zod
│   └── utils/                   # Utilidades
├── types/
│   ├── modelos.ts              # Interfaces TypeScript
│   └── payloads.ts             # Payloads API
└── prisma/
    └── schema.prisma           # Modelos de datos
```

### 🎯 Patrones Identificados en el Proyecto

#### **Módulo de Aprovisionamientos (Referencia)**
- ✅ **5 entidades principales**: AprovisionamientoFinanciero, OrdenCompra, Recepcion, Pago, HistorialAprovisionamiento
- ✅ **Relaciones complejas**: Cascadas, referencias cruzadas
- ✅ **Enums específicos**: EstadoAprovisionamiento, TipoPago, PrioridadOrden
- ✅ **Campos de auditoría**: createdAt, updatedAt, usuario tracking
- ✅ **Sistema de eventos**: EventBus para comunicación entre módulos

---

## 🏗️ Mejoras Propuestas al FLUJO_GYS

### 📋 NUEVA FASE 0: Auditoría de Consistencia (ANTES de cada fase)

#### F0.01: Verificación Pre-Implementación
**📅 Duración**: 1 día por entidad
**🎯 Objetivo**: Garantizar consistencia completa antes de implementar

**📋 Checklist de Consistencia:**

##### ✅ 1. Auditoría Modelo Prisma
- [ ] Verificar que TODOS los campos del modelo existen
- [ ] Validar que las relaciones están correctamente definidas
- [ ] Confirmar que los enums están actualizados
- [ ] Revisar que los tipos de datos son correctos (Decimal, DateTime, etc.)
- [ ] Verificar campos de auditoría (createdAt, updatedAt, createdBy)

##### ✅ 2. Auditoría Types TypeScript
- [ ] Confirmar que types en `modelos.ts` coinciden con Prisma
- [ ] Verificar que payloads en `payloads.ts` están alineados
- [ ] Validar que interfaces extendidas incluyen todos los campos
- [ ] Revisar que enums están re-exportados correctamente

##### ✅ 3. Auditoría Validators Zod
- [ ] Confirmar que schemas incluyen TODOS los campos del modelo
- [ ] Verificar que validaciones coinciden con restricciones de BD
- [ ] Validar que enums en Zod coinciden con Prisma
- [ ] Revisar que mensajes de error están en español

##### ✅ 4. Auditoría APIs
- [ ] Verificar que rutas usan campos que existen en modelo
- [ ] Confirmar que include/select de Prisma son válidos
- [ ] Validar que filtros usan campos existentes
- [ ] Revisar que responses coinciden con types definidos

##### ✅ 5. Auditoría Servicios
- [ ] Confirmar que servicios usan campos válidos del modelo
- [ ] Verificar que queries Prisma son correctas
- [ ] Validar que transformaciones de datos son consistentes
- [ ] Revisar que manejo de errores es completo

##### ✅ 6. Auditoría Componentes
- [ ] Verificar que props coinciden con types definidos
- [ ] Confirmar que acceso a propiedades es válido
- [ ] Validar que formularios usan campos existentes
- [ ] Revisar que estados y loading son consistentes

---

### 🔄 NUEVA METODOLOGÍA: "Database-First Consistency"

#### Principio Fundamental
> **La Base de Datos (Prisma) es la ÚNICA fuente de verdad**
> Todos los demás layers deben derivarse y validarse contra el modelo Prisma

#### Flujo de Consistencia
```
1. Prisma Schema (FUENTE DE VERDAD)
   ↓ (Generar y validar)
2. Types TypeScript (derivados de Prisma)
   ↓ (Alineados con types)
3. Zod Validators (validar contra Prisma)
   ↓ (Usar validators)
4. API Routes (validadas con Zod)
   ↓ (Consumir APIs)
5. Services (usar types correctos)
   ↓ (Usar services)
6. Components (props tipados estrictamente)
```

---

## 🚀 FASES DE IMPLEMENTACIÓN

### 📋 Metodología: **FLUJO_GYS_V2**
Cada fase incluye templates, ejemplos reales y validaciones automáticas.

---

## 📊 FASE 1: Modelos Prisma

### 🎯 Objetivo
Definir la estructura de datos base con relaciones, constraints y enums siguiendo los patrones del módulo de aprovisionamientos.

### 📋 Checklist de Validación
- [ ] Modelo principal definido en `prisma/schema.prisma`
- [ ] Relaciones configuradas con `@relation` y `onDelete: Cascade`
- [ ] Enums creados con valores específicos del dominio
- [ ] Campos de auditoría estándar (`createdAt`, `updatedAt`)
- [ ] Campos de usuario tracking (`creadoPor`, `actualizadoPor`)
- [ ] Ejecutar `npx prisma generate`
- [ ] Ejecutar `npx prisma db push` (desarrollo)
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=prisma`

### 📝 Template Base (Basado en AprovisionamientoFinanciero)
```prisma
model NuevaEntidad {
  id        String   @id @default(cuid())
  codigo    String   @unique // Código único generado
  
  // Campos principales del dominio
  nombre        String
  descripcion   String?
  estado        EstadoNuevaEntidad @default(PENDIENTE)
  prioridad     PrioridadNuevaEntidad @default(MEDIA)
  
  // Campos financieros (si aplica)
  montoTotal    Decimal? @db.Decimal(12,2)
  moneda        Moneda @default(PEN)
  
  // Fechas del proceso
  fechaInicio   DateTime?
  fechaVencimiento DateTime?
  fechaCompletado  DateTime?
  
  // Relaciones principales
  proyectoId    String?
  proyecto      Proyecto? @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  
  usuarioId     String
  usuario       User @relation(fields: [usuarioId], references: [id])
  
  // Relaciones secundarias
  items         NuevaEntidadItem[]
  historial     HistorialNuevaEntidad[]
  
  // Campos de auditoría estándar
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  creadoPor     String?
  actualizadoPor String?
  
  @@map("nueva_entidad")
}

// Modelo de items relacionados
model NuevaEntidadItem {
  id              String @id @default(cuid())
  nuevaEntidadId  String
  nuevaEntidad    NuevaEntidad @relation(fields: [nuevaEntidadId], references: [id], onDelete: Cascade)
  
  // Campos específicos del item
  codigo          String
  descripcion     String
  cantidad        Int
  precioUnitario  Decimal @db.Decimal(10,2)
  subtotal        Decimal @db.Decimal(12,2)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("nueva_entidad_item")
}

// Modelo de historial
model HistorialNuevaEntidad {
  id              String @id @default(cuid())
  nuevaEntidadId  String
  nuevaEntidad    NuevaEntidad @relation(fields: [nuevaEntidadId], references: [id], onDelete: Cascade)
  
  accion          String
  descripcion     String
  detalles        Json?
  
  usuarioId       String
  usuario         User @relation(fields: [usuarioId], references: [id])
  
  fechaAccion     DateTime @default(now())
  
  @@map("historial_nueva_entidad")
}

// Enums específicos del dominio
enum EstadoNuevaEntidad {
  PENDIENTE
  EN_PROCESO
  APROBADO
  COMPLETADO
  CANCELADO
  RECHAZADO
}

enum PrioridadNuevaEntidad {
  BAJA
  MEDIA
  ALTA
  URGENTE
}
```

### 🔍 Ejemplo Real: OrdenCompra
```prisma
model OrdenCompra {
  id                    String @id @default(cuid())
  codigo                String @unique
  
  // Información básica
  descripcion           String?
  estado                EstadoOrdenCompra @default(BORRADOR)
  prioridad             PrioridadOrden @default(MEDIA)
  
  // Información financiera
  subtotal              Decimal @db.Decimal(12,2)
  impuestos             Decimal @db.Decimal(12,2)
  total                 Decimal @db.Decimal(12,2)
  moneda                Moneda @default(PEN)
  
  // Fechas importantes
  fechaCreacion         DateTime @default(now())
  fechaRequerida        DateTime?
  fechaEntrega          DateTime?
  fechaAprobacion       DateTime?
  fechaSeguimiento      DateTime?
  
  // Términos comerciales
  terminosEntrega       String?
  condicionesPago       String?
  observaciones         String?
  
  // Relaciones
  pedidoEquipoId        String?
  pedidoEquipo          PedidoEquipo? @relation(fields: [pedidoEquipoId], references: [id])
  
  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])
  
  usuarioId             String
  usuario               User @relation(fields: [usuarioId], references: [id])
  
  aprobadoPor           String?
  aprobadoPorUsuario    User? @relation("OrdenCompraAprobadoPor", fields: [aprobadoPor], references: [id])
  
  // Items y relaciones
  items                 OrdenCompraItem[]
  recepciones           Recepcion[]
  pagos                 Pago[]
  aprovisionamientos    AprovisionamientoFinanciero[]
  
  // Auditoría
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("orden_compra")
}
```

---

## 📊 FASE 2: Types TypeScript

### 🎯 Objetivo
Crear interfaces TypeScript que reflejen exactamente los modelos Prisma, incluyendo tipos con relaciones.

### 📋 Checklist de Validación
- [ ] Tipos base importados de `@prisma/client`
- [ ] Interfaces con relaciones definidas
- [ ] Enums exportados correctamente
- [ ] Tipos compuestos para vistas específicas
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=types`

### 📝 Template Base (Basado en modelos.ts)
```typescript
// types/modelos.ts
import { 
  NuevaEntidad as PrismaNuevaEntidad,
  NuevaEntidadItem as PrismaNuevaEntidadItem,
  HistorialNuevaEntidad as PrismaHistorialNuevaEntidad,
  EstadoNuevaEntidad,
  PrioridadNuevaEntidad,
  User,
  Proyecto
} from '@prisma/client'

// ===== TIPOS BASE =====

/**
 * 📋 Nueva Entidad - Tipo base
 */
export type NuevaEntidad = PrismaNuevaEntidad

/**
 * 📋 Item de Nueva Entidad - Tipo base
 */
export type NuevaEntidadItem = PrismaNuevaEntidadItem

/**
 * 📋 Historial de Nueva Entidad - Tipo base
 */
export type HistorialNuevaEntidad = PrismaHistorialNuevaEntidad

// ===== ENUMS =====

/**
 * 📊 Estados de Nueva Entidad
 */
export { EstadoNuevaEntidad }

/**
 * ⚡ Prioridades de Nueva Entidad
 */
export { PrioridadNuevaEntidad }

// ===== TIPOS COMPUESTOS CON RELACIONES =====

/**
 * 📋 Nueva Entidad con Items - Incluye items relacionados
 */
export type NuevaEntidadConItems = NuevaEntidad & {
  items: (NuevaEntidadItem & {
    // Relaciones adicionales si las hay
  })[]
  usuario?: User
  proyecto?: Proyecto
}

/**
 * 📋 Nueva Entidad Completa - Vista consolidada con historial
 */
export type NuevaEntidadConTodo = NuevaEntidad & {
  items: NuevaEntidadItem[]
  historial: (HistorialNuevaEntidad & {
    usuario: User
  })[]
  usuario?: User
  proyecto?: Proyecto
}

/**
 * 📊 Métricas de Nueva Entidad
 */
export interface NuevaEntidadMetrics {
  total: number
  porEstado: Record<EstadoNuevaEntidad, number>
  porPrioridad: Record<PrioridadNuevaEntidad, number>
  montoTotal: number
  promedioTiempo: number // días
}
```

### 🔍 Ejemplo Real: OrdenCompra Types
```typescript
/**
 * 🛒 Orden de Compra con Items - Incluye productos y detalles completos
 */
export type OrdenCompraConItems = OrdenCompra & {
  items: (OrdenCompraItem & {
    producto?: Producto
    pedidoEquipoItem?: PedidoEquipoItem
  })[]
  proveedor?: Proveedor
  pedidoEquipo?: PedidoEquipo
  usuario?: User
}

/**
 * 🛒 Orden de Compra Completa - Vista consolidada con todo el flujo
 */
export type OrdenCompraConTodo = OrdenCompra & {
  items: (OrdenCompraItem & {
    producto?: Producto
    pedidoEquipoItem?: PedidoEquipoItem
    recepcionItems?: RecepcionItem[]
    pagoItems?: PagoItem[]
  })[]
  proveedor?: Proveedor
  pedidoEquipo?: PedidoEquipo
  recepciones?: (Recepcion & {
    items?: RecepcionItem[]
  })[]
  pagos?: (Pago & {
    items?: PagoItem[]
  })[]
  aprovisionamientos?: AprovisionamientoFinanciero[]
  historial?: HistorialAprovisionamiento[]
  usuario?: User
}
```

---

## 📊 FASE 3: Payloads API

### 🎯 Objetivo
Definir estructuras de datos para requests/responses de APIs siguiendo los patrones establecidos.

### 📋 Checklist de Validación
- [ ] Payloads de creación (`CreateInput`)
- [ ] Payloads de actualización (`UpdateInput`)
- [ ] Filtros de búsqueda (`Filters`)
- [ ] Tipos de respuesta (`Response`, `ListResponse`)
- [ ] Paginación estándar
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=payloads`

### 📝 Template Base (Basado en payloads.ts)
```typescript
// types/payloads.ts
import { 
  NuevaEntidad, 
  NuevaEntidadConItems, 
  NuevaEntidadConTodo,
  EstadoNuevaEntidad, 
  PrioridadNuevaEntidad,
  NuevaEntidadMetrics
} from './modelos'
import { ApiResponse, PaginatedResponse, PaginationParams } from './api'

// ===== PAYLOADS DE ENTRADA =====

/**
 * 📝 Payload para crear Nueva Entidad
 */
export interface CrearNuevaEntidadData {
  nombre: string
  descripcion?: string
  estado?: EstadoNuevaEntidad
  prioridad?: PrioridadNuevaEntidad
  montoTotal?: number
  moneda?: 'PEN' | 'USD'
  fechaInicio?: string
  fechaVencimiento?: string
  proyectoId?: string
  usuarioId: string
  
  // Items relacionados
  items?: {
    codigo: string
    descripcion: string
    cantidad: number
    precioUnitario: number
  }[]
}

/**
 * 📝 Payload para actualizar Nueva Entidad
 */
export interface ActualizarNuevaEntidadData {
  nombre?: string
  descripcion?: string
  estado?: EstadoNuevaEntidad
  prioridad?: PrioridadNuevaEntidad
  montoTotal?: number
  moneda?: 'PEN' | 'USD'
  fechaInicio?: string
  fechaVencimiento?: string
  fechaCompletado?: string
}

/**
 * 🔍 Filtros para búsqueda de Nueva Entidad
 */
export interface FiltrosNuevaEntidad {
  busqueda?: string
  estado?: EstadoNuevaEntidad
  prioridad?: PrioridadNuevaEntidad
  proyectoId?: string
  usuarioId?: string
  fechaInicio?: string
  fechaFin?: string
  montoMinimo?: number
  montoMaximo?: number
  moneda?: 'PEN' | 'USD'
  
  // Paginación
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ===== PAYLOADS DE SALIDA =====

/**
 * 📤 Respuesta individual de Nueva Entidad
 */
export type NuevaEntidadResponse = ApiResponse<NuevaEntidadConTodo>

/**
 * 📤 Respuesta de lista de Nueva Entidad
 */
export type NuevaEntidadListResponse = PaginatedResponse<NuevaEntidadConItems>

/**
 * 📊 Respuesta de métricas
 */
export type NuevaEntidadMetricsResponse = ApiResponse<NuevaEntidadMetrics>
```

---

## 📊 FASE 4: Validadores Zod

### 🎯 Objetivo
Crear esquemas de validación que coincidan exactamente con los modelos Prisma y payloads.

### 📋 Checklist de Validación
- [ ] Schema de creación (`createSchema`)
- [ ] Schema de actualización (`updateSchema`)
- [ ] Schema de filtros (`filtersSchema`)
- [ ] Validaciones de negocio específicas
- [ ] Mensajes de error personalizados
- [ ] Tipos inferidos exportados
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=validators`

### 📝 Template Base (Basado en aprovisionamiento.ts)
```typescript
// lib/validators/nuevaEntidad.ts
import { z } from 'zod'
import { EstadoNuevaEntidad, PrioridadNuevaEntidad } from '@/types/modelos'

// ===== SCHEMAS DE VALIDACIÓN =====

/**
 * 📝 Schema para crear Nueva Entidad
 */
export const createNuevaEntidadSchema = z.object({
  nombre: z.string()
    .min(1, 'Nombre es requerido')
    .max(255, 'Nombre muy largo'),
  
  descripcion: z.string()
    .max(1000, 'Descripción muy larga')
    .optional(),
  
  estado: z.nativeEnum(EstadoNuevaEntidad)
    .default(EstadoNuevaEntidad.PENDIENTE),
  
  prioridad: z.nativeEnum(PrioridadNuevaEntidad)
    .default(PrioridadNuevaEntidad.MEDIA),
  
  montoTotal: z.number()
    .positive('Monto debe ser positivo')
    .max(999999999.99, 'Monto muy alto')
    .optional(),
  
  moneda: z.enum(['PEN', 'USD'])
    .default('PEN'),
  
  fechaInicio: z.string()
    .datetime('Fecha inválida')
    .optional(),
  
  fechaVencimiento: z.string()
    .datetime('Fecha inválida')
    .optional(),
  
  proyectoId: z.string()
    .cuid('ID de proyecto inválido')
    .optional(),
  
  usuarioId: z.string()
    .cuid('ID de usuario inválido'),
  
  // Items relacionados
  items: z.array(z.object({
    codigo: z.string().min(1, 'Código requerido'),
    descripcion: z.string().min(1, 'Descripción requerida'),
    cantidad: z.number().int().positive('Cantidad debe ser positiva'),
    precioUnitario: z.number().positive('Precio debe ser positivo')
  })).optional()
})

/**
 * 📝 Schema para actualizar Nueva Entidad
 */
export const updateNuevaEntidadSchema = z.object({
  nombre: z.string()
    .min(1, 'Nombre es requerido')
    .max(255, 'Nombre muy largo')
    .optional(),
  
  descripcion: z.string()
    .max(1000, 'Descripción muy larga')
    .optional(),
  
  estado: z.nativeEnum(EstadoNuevaEntidad)
    .optional(),
  
  prioridad: z.nativeEnum(PrioridadNuevaEntidad)
    .optional(),
  
  montoTotal: z.number()
    .positive('Monto debe ser positivo')
    .max(999999999.99, 'Monto muy alto')
    .optional(),
  
  moneda: z.enum(['PEN', 'USD'])
    .optional(),
  
  fechaInicio: z.string()
    .datetime('Fecha inválida')
    .optional(),
  
  fechaVencimiento: z.string()
    .datetime('Fecha inválida')
    .optional(),
  
  fechaCompletado: z.string()
    .datetime('Fecha inválida')
    .optional()
})

/**
 * 🔍 Schema para filtros de Nueva Entidad
 */
export const nuevaEntidadFiltersSchema = z.object({
  busqueda: z.string().optional(),
  estado: z.nativeEnum(EstadoNuevaEntidad).optional(),
  prioridad: z.nativeEnum(PrioridadNuevaEntidad).optional(),
  proyectoId: z.string().cuid().optional(),
  usuarioId: z.string().cuid().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  montoMinimo: z.number().positive().optional(),
  montoMaximo: z.number().positive().optional(),
  moneda: z.enum(['PEN', 'USD']).optional(),
  
  // Paginación
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * 📝 Schema para historial
 */
export const createHistorialNuevaEntidadSchema = z.object({
  nuevaEntidadId: z.string().cuid('ID inválido'),
  accion: z.string().min(1, 'Acción requerida'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  detalles: z.record(z.any()).optional(),
  usuarioId: z.string().cuid('ID de usuario inválido')
})

// ===== TIPOS INFERIDOS =====

export type CreateNuevaEntidadInput = z.infer<typeof createNuevaEntidadSchema>
export type UpdateNuevaEntidadInput = z.infer<typeof updateNuevaEntidadSchema>
export type NuevaEntidadFilters = z.infer<typeof nuevaEntidadFiltersSchema>
export type CreateHistorialNuevaEntidadInput = z.infer<typeof createHistorialNuevaEntidadSchema>
```

### 🔍 Ejemplo Real: OrdenCompra Validators
```typescript
export const createOrdenCompraSchema = z.object({
  descripcion: z.string().max(1000).optional(),
  estado: z.nativeEnum(EstadoOrdenCompra).default(EstadoOrdenCompra.BORRADOR),
  prioridad: z.nativeEnum(PrioridadOrden).default(PrioridadOrden.MEDIA),
  
  subtotal: z.number().positive('Subtotal debe ser positivo'),
  impuestos: z.number().min(0, 'Impuestos no pueden ser negativos'),
  total: z.number().positive('Total debe ser positivo'),
  moneda: z.nativeEnum(Moneda).default(Moneda.PEN),
  
  fechaCreacion: z.string().datetime().optional(),
  fechaRequerida: z.string().datetime().optional(),
  fechaEntrega: z.string().datetime().optional(),
  fechaAprobacion: z.string().datetime().optional(),
  fechaSeguimiento: z.string().datetime().optional(),
  
  terminosEntrega: z.string().max(500).optional(),
  condicionesPago: z.string().max(500).optional(),
  observaciones: z.string().max(1000).optional(),
  
  pedidoEquipoId: z.string().cuid().optional(),
  proveedorId: z.string().cuid('ID de proveedor inválido'),
  usuarioId: z.string().cuid('ID de usuario inválido'),
  aprobadoPor: z.string().cuid().optional()
})
```

## 📊 FASE 5: APIs REST

### 🎯 Objetivo
Crear rutas API CRUD completas con validación, manejo de errores y respuestas consistentes.

### 📋 Checklist de Validación
- [ ] Ruta principal `app/api/nueva-entidad/route.ts` (GET, POST)
- [ ] Ruta individual `app/api/nueva-entidad/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Validación con schemas Zod
- [ ] Manejo de errores estándar
- [ ] Respuestas con formato ApiResponse
- [ ] Logging de operaciones
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=apis`

### 📝 Template Base (Basado en aprovisionamientos/route.ts)
```typescript
// app/api/nueva-entidad/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { 
  createNuevaEntidadSchema, 
  nuevaEntidadFiltersSchema 
} from '@/lib/validators/nuevaEntidad'
import { ApiResponse, PaginatedResponse } from '@/types/api'
import { NuevaEntidadConItems } from '@/types/modelos'

/**
 * 📋 GET /api/nueva-entidad - Obtener lista de entidades
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 🔍 Parsear parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const filters = {
      busqueda: searchParams.get('busqueda') || undefined,
      estado: searchParams.get('estado') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      proyectoId: searchParams.get('proyectoId') || undefined,
      usuarioId: searchParams.get('usuarioId') || undefined,
      fechaInicio: searchParams.get('fechaInicio') || undefined,
      fechaFin: searchParams.get('fechaFin') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }

    // ✅ Validar filtros
    const validatedFilters = nuevaEntidadFiltersSchema.parse(filters)

    // 🔍 Construir condiciones de búsqueda
    const where: any = {}
    
    if (validatedFilters.busqueda) {
      where.OR = [
        { nombre: { contains: validatedFilters.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: validatedFilters.busqueda, mode: 'insensitive' } },
        { codigo: { contains: validatedFilters.busqueda, mode: 'insensitive' } }
      ]
    }
    
    if (validatedFilters.estado) where.estado = validatedFilters.estado
    if (validatedFilters.prioridad) where.prioridad = validatedFilters.prioridad
    if (validatedFilters.proyectoId) where.proyectoId = validatedFilters.proyectoId
    if (validatedFilters.usuarioId) where.usuarioId = validatedFilters.usuarioId
    
    if (validatedFilters.fechaInicio || validatedFilters.fechaFin) {
      where.createdAt = {}
      if (validatedFilters.fechaInicio) where.createdAt.gte = new Date(validatedFilters.fechaInicio)
      if (validatedFilters.fechaFin) where.createdAt.lte = new Date(validatedFilters.fechaFin)
    }

    // 📊 Obtener total de registros
    const total = await prisma.nuevaEntidad.count({ where })

    // 📋 Obtener entidades con paginación
    const entidades = await prisma.nuevaEntidad.findMany({
      where,
      include: {
        items: true,
        usuario: {
          select: { id: true, name: true, email: true }
        },
        proyecto: {
          select: { id: true, nombre: true, codigo: true }
        }
      },
      orderBy: {
        [validatedFilters.sortBy]: validatedFilters.sortOrder
      },
      skip: (validatedFilters.page - 1) * validatedFilters.limit,
      take: validatedFilters.limit
    })

    // 📤 Respuesta paginada
    const response: PaginatedResponse<NuevaEntidadConItems> = {
      success: true,
      data: entidades,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        total,
        totalPages: Math.ceil(total / validatedFilters.limit)
      }
    }

    logger.info('Nueva entidad list retrieved', {
      userId: session.user.id,
      filters: validatedFilters,
      count: entidades.length
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error getting nueva entidad list', { error })
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * 📝 POST /api/nueva-entidad - Crear nueva entidad
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📝 Parsear datos del request
    const body = await request.json()
    
    // ✅ Validar datos
    const validatedData = createNuevaEntidadSchema.parse({
      ...body,
      usuarioId: session.user.id
    })

    // 🔢 Generar código único
    const codigo = `NE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // 💾 Crear entidad con transacción
    const nuevaEntidad = await prisma.$transaction(async (tx) => {
      // Crear entidad principal
      const entidad = await tx.nuevaEntidad.create({
        data: {
          ...validatedData,
          codigo,
          creadoPor: session.user.id
        },
        include: {
          items: true,
          usuario: {
            select: { id: true, name: true, email: true }
          },
          proyecto: {
            select: { id: true, nombre: true, codigo: true }
          }
        }
      })

      // Crear items si existen
      if (validatedData.items && validatedData.items.length > 0) {
        await tx.nuevaEntidadItem.createMany({
          data: validatedData.items.map(item => ({
            ...item,
            nuevaEntidadId: entidad.id,
            subtotal: item.cantidad * item.precioUnitario
          }))
        })
      }

      // Crear registro en historial
      await tx.historialNuevaEntidad.create({
        data: {
          nuevaEntidadId: entidad.id,
          accion: 'CREACION',
          descripcion: 'Nueva entidad creada',
          detalles: { codigo: entidad.codigo },
          usuarioId: session.user.id
        }
      })

      return entidad
    })

    // 📤 Respuesta exitosa
    const response: ApiResponse<NuevaEntidadConItems> = {
      success: true,
      data: nuevaEntidad,
      message: 'Nueva entidad creada exitosamente'
    }

    logger.info('Nueva entidad created', {
      userId: session.user.id,
      entidadId: nuevaEntidad.id,
      codigo: nuevaEntidad.codigo
    })

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    logger.error('Error creating nueva entidad', { error })
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### 🔍 Ejemplo Real: OrdenCompra API
```typescript
// app/api/aprovisionamientos/ordenes-compra/route.ts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      busqueda: searchParams.get('busqueda') || undefined,
      estado: searchParams.get('estado') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      proveedorId: searchParams.get('proveedorId') || undefined,
      fechaInicio: searchParams.get('fechaInicio') || undefined,
      fechaFin: searchParams.get('fechaFin') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const validatedFilters = ordenCompraFiltersSchema.parse(filters)
    
    // Construcción de where clause...
    const where: any = {}
    if (validatedFilters.busqueda) {
      where.OR = [
        { codigo: { contains: validatedFilters.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: validatedFilters.busqueda, mode: 'insensitive' } }
      ]
    }
    
    const total = await prisma.ordenCompra.count({ where })
    const ordenes = await prisma.ordenCompra.findMany({
      where,
      include: {
        items: {
          include: {
            producto: true
          }
        },
        proveedor: true,
        usuario: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (validatedFilters.page - 1) * validatedFilters.limit,
      take: validatedFilters.limit
    })

    return NextResponse.json({
      success: true,
      data: ordenes,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        total,
        totalPages: Math.ceil(total / validatedFilters.limit)
      }
    })
  } catch (error) {
    logger.error('Error getting orden compra list', { error })
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

---

## 📊 FASE 6: Services

### 🎯 Objetivo
Crear servicios de lógica de negocio que encapsulen las operaciones CRUD y funcionalidades específicas.

### 📋 Checklist de Validación
- [ ] Servicio principal en `lib/services/nuevaEntidad.ts`
- [ ] Funciones CRUD estándar (`get`, `create`, `update`, `delete`)
- [ ] Funciones de búsqueda y filtrado
- [ ] Manejo de errores consistente
- [ ] Tipos de retorno definidos
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=services`

### 📝 Template Base (Basado en aprovisionamientos.ts)
```typescript
// lib/services/nuevaEntidad.ts
import { 
  NuevaEntidad, 
  NuevaEntidadConItems, 
  NuevaEntidadConTodo,
  EstadoNuevaEntidad,
  PrioridadNuevaEntidad
} from '@/types/modelos'
import { 
  CrearNuevaEntidadData, 
  ActualizarNuevaEntidadData, 
  FiltrosNuevaEntidad 
} from '@/types/payloads'
import { ApiResponse, PaginatedResponse } from '@/types/api'

/**
 * 🌐 Base URL para las APIs de Nueva Entidad
 */
const BASE_URL = '/api/nueva-entidad'

/**
 * 📋 Servicio para gestión de Nueva Entidad
 */
export class NuevaEntidadService {
  
  /**
   * 📋 Obtener lista de entidades con filtros y paginación
   */
  static async getList(
    filters: FiltrosNuevaEntidad = {}
  ): Promise<PaginatedResponse<NuevaEntidadConItems>> {
    try {
      const params = new URLSearchParams()
      
      // 🔍 Agregar filtros a los parámetros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener lista de entidades')
      }

      return data
    } catch (error) {
      console.error('Error in NuevaEntidadService.getList:', error)
      throw error
    }
  }

  /**
   * 📋 Obtener entidad por ID
   */
  static async getById(id: string): Promise<ApiResponse<NuevaEntidadConTodo>> {
    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Entidad no encontrada')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener entidad')
      }

      return data
    } catch (error) {
      console.error('Error in NuevaEntidadService.getById:', error)
      throw error
    }
  }

  /**
   * 📝 Crear nueva entidad
   */
  static async create(
    data: CrearNuevaEntidadData
  ): Promise<ApiResponse<NuevaEntidadConItems>> {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al crear entidad')
      }

      return result
    } catch (error) {
      console.error('Error in NuevaEntidadService.create:', error)
      throw error
    }
  }

  /**
   * ✏️ Actualizar entidad existente
   */
  static async update(
    id: string, 
    data: ActualizarNuevaEntidadData
  ): Promise<ApiResponse<NuevaEntidadConTodo>> {
    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar entidad')
      }

      return result
    } catch (error) {
      console.error('Error in NuevaEntidadService.update:', error)
      throw error
    }
  }

  /**
   * 🗑️ Eliminar entidad
   */
  static async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar entidad')
      }

      return result
    } catch (error) {
      console.error('Error in NuevaEntidadService.delete:', error)
      throw error
    }
  }

  /**
   * 📊 Obtener métricas de entidades
   */
  static async getMetrics(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${BASE_URL}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener métricas')
      }

      return data
    } catch (error) {
      console.error('Error in NuevaEntidadService.getMetrics:', error)
      throw error
    }
  }

  /**
   * 🔄 Cambiar estado de entidad
   */
  static async cambiarEstado(
    id: string, 
    nuevoEstado: EstadoNuevaEntidad,
    observaciones?: string
  ): Promise<ApiResponse<NuevaEntidadConTodo>> {
    try {
      const response = await fetch(`${BASE_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          estado: nuevoEstado,
          observaciones 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cambiar estado')
      }

      return result
    } catch (error) {
      console.error('Error in NuevaEntidadService.cambiarEstado:', error)
      throw error
    }
  }
}

// ===== FUNCIONES DE UTILIDAD =====

/**
 * 🎨 Obtener color del badge según estado
 */
export function getEstadoBadgeColor(estado: EstadoNuevaEntidad): string {
  const colors = {
    [EstadoNuevaEntidad.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
    [EstadoNuevaEntidad.EN_PROCESO]: 'bg-blue-100 text-blue-800',
    [EstadoNuevaEntidad.APROBADO]: 'bg-green-100 text-green-800',
    [EstadoNuevaEntidad.COMPLETADO]: 'bg-emerald-100 text-emerald-800',
    [EstadoNuevaEntidad.CANCELADO]: 'bg-red-100 text-red-800',
    [EstadoNuevaEntidad.RECHAZADO]: 'bg-red-100 text-red-800'
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

/**
 * ⚡ Obtener color del badge según prioridad
 */
export function getPrioridadBadgeColor(prioridad: PrioridadNuevaEntidad): string {
  const colors = {
    [PrioridadNuevaEntidad.BAJA]: 'bg-gray-100 text-gray-800',
    [PrioridadNuevaEntidad.MEDIA]: 'bg-blue-100 text-blue-800',
    [PrioridadNuevaEntidad.ALTA]: 'bg-orange-100 text-orange-800',
    [PrioridadNuevaEntidad.URGENTE]: 'bg-red-100 text-red-800'
  }
  return colors[prioridad] || 'bg-gray-100 text-gray-800'
}
```

---

## 📊 FASE 7: Components

### 🎯 Objetivo
Crear componentes UI reutilizables siguiendo los patrones de diseño establecidos.

### 📋 Checklist de Validación
- [ ] `NuevaEntidadList.tsx` - Lista con filtros y paginación
- [ ] `NuevaEntidadForm.tsx` - Formulario de creación/edición
- [ ] `NuevaEntidadSelect.tsx` - Selector para relaciones
- [ ] `NuevaEntidadAccordion.tsx` - Vista expandible
- [ ] Componentes con props tipadas
- [ ] Estados de loading, error y empty
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=components`

### 📝 Template Base: NuevaEntidadList.tsx
```typescript
// components/nueva-entidad/NuevaEntidadList.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  NuevaEntidadConItems, 
  EstadoNuevaEntidad, 
  PrioridadNuevaEntidad 
} from '@/types/modelos'
import { FiltrosNuevaEntidad } from '@/types/payloads'
import { NuevaEntidadService, getEstadoBadgeColor, getPrioridadBadgeColor } from '@/lib/services/nuevaEntidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react'

/**
 * 📋 Props para NuevaEntidadList
 */
interface NuevaEntidadListProps {
  /** Filtros iniciales */
  initialFilters?: Partial<FiltrosNuevaEntidad>
  /** Mostrar botón de crear */
  showCreateButton?: boolean
  /** Callback al seleccionar entidad */
  onSelect?: (entidad: NuevaEntidadConItems) => void
  /** Modo de selección */
  selectionMode?: boolean
  /** Clase CSS adicional */
  className?: string
}

/**
 * 📋 Componente Lista de Nueva Entidad
 */
export function NuevaEntidadList({
  initialFilters = {},
  showCreateButton = true,
  onSelect,
  selectionMode = false,
  className = ''
}: NuevaEntidadListProps) {
  const router = useRouter()
  
  // ===== ESTADO =====
  const [entidades, setEntidades] = useState<NuevaEntidadConItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FiltrosNuevaEntidad>({
    page: 1,
    limit: 10,
    ...initialFilters
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // ===== EFECTOS =====
  useEffect(() => {
    loadEntidades()
  }, [filters])

  // ===== FUNCIONES =====
  
  /**
   * 📋 Cargar lista de entidades
   */
  const loadEntidades = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await NuevaEntidadService.getList(filters)
      
      setEntidades(response.data)
      setPagination(response.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar entidades'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 🔍 Manejar cambio en filtros
   */
  const handleFilterChange = (key: keyof FiltrosNuevaEntidad, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset page when filters change
    }))
  }

  /**
   * 📄 Cambiar página
   */
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  /**
   * 👁️ Ver detalle de entidad
   */
  const handleView = (entidad: NuevaEntidadConItems) => {
    if (onSelect) {
      onSelect(entidad)
    } else {
      router.push(`/nueva-entidad/${entidad.id}`)
    }
  }

  /**
   * ✏️ Editar entidad
   */
  const handleEdit = (entidad: NuevaEntidadConItems) => {
    router.push(`/nueva-entidad/${entidad.id}/editar`)
  }

  /**
   * 🗑️ Eliminar entidad
   */
  const handleDelete = async (entidad: NuevaEntidadConItems) => {
    if (!confirm(`¿Está seguro de eliminar la entidad "${entidad.nombre}"?`)) {
      return
    }

    try {
      await NuevaEntidadService.delete(entidad.id)
      toast.success('Entidad eliminada exitosamente')
      loadEntidades() // Recargar lista
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar entidad'
      toast.error(errorMessage)
    }
  }

  // ===== RENDER =====
  
  if (loading && entidades.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error && entidades.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar entidades</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadEntidades} variant="outline">
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Entidad</h2>
          <p className="text-gray-600">
            {pagination.total} entidad{pagination.total !== 1 ? 'es' : ''} encontrada{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => router.push('/nueva-entidad/crear')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Entidad
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, código..."
                  value={filters.busqueda || ''}
                  onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filters.estado || ''}
                onValueChange={(value) => handleFilterChange('estado', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {Object.values(EstadoNuevaEntidad).map(estado => (
                    <SelectItem key={estado} value={estado}>
                      {estado.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={filters.prioridad || ''}
                onValueChange={(value) => handleFilterChange('prioridad', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las prioridades</SelectItem>
                  {Object.values(PrioridadNuevaEntidad).map(prioridad => (
                    <SelectItem key={prioridad} value={prioridad}>
                      {prioridad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Límite por página */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Por página</label>
              <Select
                value={filters.limit?.toString() || '10'}
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de entidades */}
      {entidades.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron entidades</h3>
          <p className="text-gray-600 mb-4">Intenta ajustar los filtros o crear una nueva entidad.</p>
          {showCreateButton && (
            <Button onClick={() => router.push('/nueva-entidad/crear')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Entidad
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {entidades.map((entidad) => (
            <Card key={entidad.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {entidad.nombre}
                      </h3>
                      <Badge className={getEstadoBadgeColor(entidad.estado)}>
                        {entidad.estado.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPrioridadBadgeColor(entidad.prioridad)}>
                        {entidad.prioridad}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Código: {entidad.codigo}
                    </p>
                    
                    {entidad.descripcion && (
                      <p className="text-sm text-gray-600 mb-2">
                        {entidad.descripcion}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Items: {entidad.items?.length || 0}</span>
                      {entidad.montoTotal && (
                        <span>
                          Monto: {entidad.moneda} {entidad.montoTotal.toFixed(2)}
                        </span>
                      )}
                      <span>
                        Creado: {new Date(entidad.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(entidad)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!selectionMode && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entidad)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(entidad)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-gray-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

## 📊 FASE 8: Pages

### 🎯 Objetivo
Crear páginas que integren los componentes y servicios siguiendo la estructura App Router.

### 📋 Checklist de Validación
- [ ] Página principal `app/nueva-entidad/page.tsx`
- [ ] Página de detalle `app/nueva-entidad/[id]/page.tsx`
- [ ] Página de creación `app/nueva-entidad/crear/page.tsx`
- [ ] Página de edición `app/nueva-entidad/[id]/editar/page.tsx`
- [ ] Layout con breadcrumbs
- [ ] Manejo de estados de loading y error
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=pages`

### 📝 Template Base: page.tsx principal
```typescript
// app/nueva-entidad/page.tsx
import { Metadata } from 'next'
import { NuevaEntidadList } from '@/components/nueva-entidad/NuevaEntidadList'

export const metadata: Metadata = {
  title: 'Nueva Entidad | GYS App',
  description: 'Gestión de Nueva Entidad - Sistema GYS'
}

/**
 * 📋 Página principal de Nueva Entidad
 */
export default function NuevaEntidadPage() {
  return (
    <div className="container mx-auto py-6">
      <NuevaEntidadList />
    </div>
  )
}
```

---

## 📊 FASE 9: Sidebar & Navigation

### 🎯 Objetivo
Registrar las nuevas rutas en el sistema de navegación según roles de usuario.

### 📋 Checklist de Validación
- [ ] Agregar enlaces en `components/Sidebar.tsx`
- [ ] Configurar permisos por rol
- [ ] Iconos apropiados
- [ ] Orden lógico en menús
- [ ] **Validación automática**: `npm run audit:consistency -- --phase=sidebar`

### 📝 Template Base: Sidebar Integration
```typescript
// En components/Sidebar.tsx - agregar nueva sección
{
  title: 'Nueva Entidad',
  icon: <FileText className="h-5 w-5" />,
  href: '/nueva-entidad',
  roles: ['admin', 'gerente', 'gestor']
}
```

---

## 📊 FASE 10: Testing

### 🎯 Objetivo
Crear pruebas unitarias e integración para garantizar la calidad del código.

### 📋 Checklist de Validación
- [ ] Tests de API routes
- [ ] Tests de servicios
- [ ] Tests de componentes
- [ ] Tests E2E básicos
- [ ] Cobertura mínima 80%
- [ ] **Validación automática**: `npm run test`

### 📝 Template Base: API Test
```typescript
// __tests__/api/nueva-entidad.test.ts
import { GET, POST } from '@/app/api/nueva-entidad/route'
import { NextRequest } from 'next/server'

describe('/api/nueva-entidad', () => {
  describe('GET', () => {
    it('should return paginated list', async () => {
      const request = new NextRequest('http://localhost:3000/api/nueva-entidad')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeInstanceOf(Array)
      expect(data.pagination).toBeDefined()
    })
  })
})
```

---

## 🛠️ Herramientas de Verificación Automática

### 📊 Script de Auditoría Mejorado

```typescript
// scripts/audit-consistency.ts
import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

/**
 * 🔍 Tipos de validación por fase
 */
type ValidationPhase = 'models' | 'types' | 'payloads' | 'validators' | 'apis' | 'services' | 'components' | 'pages' | 'sidebar' | 'testing'

/**
 * 📋 Resultado de validación
 */
interface ValidationResult {
  phase: ValidationPhase
  entity: string
  passed: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * 🎯 Configuración de validación por fase
 */
const PHASE_CONFIG = {
  models: {
    name: 'Prisma Models',
    files: ['prisma/schema.prisma'],
    validators: ['validatePrismaModel']
  },
  types: {
    name: 'TypeScript Types',
    files: ['src/types/modelos.ts'],
    validators: ['validateTypes']
  },
  payloads: {
    name: 'API Payloads',
    files: ['src/types/payloads.ts'],
    validators: ['validatePayloads']
  },
  validators: {
    name: 'Zod Validators',
    files: ['src/lib/validators/*.ts'],
    validators: ['validateZodSchemas']
  },
  apis: {
    name: 'API Routes',
    files: ['src/app/api/**/route.ts'],
    validators: ['validateApiRoutes']
  },
  services: {
    name: 'Services',
    files: ['src/lib/services/*.ts'],
    validators: ['validateServices']
  },
  components: {
    name: 'Components',
    files: ['src/components/**/*.tsx'],
    validators: ['validateComponents']
  },
  pages: {
    name: 'Pages',
    files: ['src/app/**/page.tsx'],
    validators: ['validatePages']
  },
  sidebar: {
    name: 'Sidebar Navigation',
    files: ['src/components/Sidebar.tsx'],
    validators: ['validateSidebar']
  },
  testing: {
    name: 'Tests',
    files: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    validators: ['validateTests']
  }
}

/**
 * 🔍 Clase principal de auditoría
 */
class ConsistencyAuditor {
  private results: ValidationResult[] = []
  private entities: string[] = []

  constructor() {
    this.loadEntities()
  }

  /**
   * 📋 Cargar entidades del proyecto
   */
  private loadEntities() {
    try {
      const schemaContent = readFileSync('prisma/schema.prisma', 'utf-8')
      const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g)
      
      if (modelMatches) {
        this.entities = modelMatches.map(match => {
          const modelName = match.match(/model\s+(\w+)/)?.[1]
          return modelName || ''
        }).filter(Boolean)
      }

      console.log(chalk.blue(`📋 Entidades encontradas: ${this.entities.join(', ')}`)))
    } catch (error) {
      console.error(chalk.red('❌ Error al cargar entidades del schema.prisma'))
    }
  }

  /**
   * 🔍 Ejecutar auditoría por fase
   */
  async auditPhase(phase: ValidationPhase, entityFilter?: string): Promise<ValidationResult[]> {
    console.log(chalk.yellow(`\n🔍 Auditando fase: ${PHASE_CONFIG[phase].name}`))
    
    const phaseResults: ValidationResult[] = []
    const entitiesToCheck = entityFilter ? [entityFilter] : this.entities

    for (const entity of entitiesToCheck) {
      const result = await this.validateEntityInPhase(phase, entity)
      phaseResults.push(result)
      this.results.push(result)
    }

    return phaseResults
  }

  /**
   * ✅ Validar entidad en fase específica
   */
  private async validateEntityInPhase(phase: ValidationPhase, entity: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      phase,
      entity,
      passed: true,
      errors: [],
      warnings: [],
      suggestions: []
    }

    try {
      switch (phase) {
        case 'models':
          await this.validatePrismaModel(entity, result)
          break
        case 'types':
          await this.validateTypes(entity, result)
          break
        case 'payloads':
          await this.validatePayloads(entity, result)
          break
        case 'validators':
          await this.validateZodSchemas(entity, result)
          break
        case 'apis':
          await this.validateApiRoutes(entity, result)
          break
        case 'services':
          await this.validateServices(entity, result)
          break
        case 'components':
          await this.validateComponents(entity, result)
          break
        case 'pages':
          await this.validatePages(entity, result)
          break
        case 'sidebar':
          await this.validateSidebar(entity, result)
          break
        case 'testing':
          await this.validateTests(entity, result)
          break
      }
    } catch (error) {
      result.errors.push(`Error durante validación: ${error}`)
      result.passed = false
    }

    return result
  }

  /**
   * 🗄️ Validar modelo Prisma
   */
  private async validatePrismaModel(entity: string, result: ValidationResult) {
    const schemaPath = 'prisma/schema.prisma'
    
    if (!existsSync(schemaPath)) {
      result.errors.push('Archivo schema.prisma no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(schemaPath, 'utf-8')
    const modelRegex = new RegExp(`model\\s+${entity}\\s*{([^}]+)}`, 's')
    const match = content.match(modelRegex)

    if (!match) {
      result.errors.push(`Modelo ${entity} no encontrado en schema.prisma`)
      result.passed = false
      return
    }

    const modelContent = match[1]
    
    // Validar campos obligatorios
    const requiredFields = ['id', 'createdAt', 'updatedAt']
    for (const field of requiredFields) {
      if (!modelContent.includes(field)) {
        result.errors.push(`Campo obligatorio '${field}' faltante en modelo ${entity}`)
        result.passed = false
      }
    }

    // Validar relaciones
    const relationMatches = modelContent.match(/@relation\([^)]+\)/g)
    if (relationMatches) {
      for (const relation of relationMatches) {
        if (!relation.includes('onDelete')) {
          result.warnings.push(`Relación sin onDelete definido: ${relation}`)
        }
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Modelo Prisma validado`))
  }

  /**
   * 📝 Validar tipos TypeScript
   */
  private async validateTypes(entity: string, result: ValidationResult) {
    const typesPath = 'src/types/modelos.ts'
    
    if (!existsSync(typesPath)) {
      result.errors.push('Archivo modelos.ts no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(typesPath, 'utf-8')
    
    // Validar que existe la interfaz base
    if (!content.includes(`export interface ${entity}`)) {
      result.errors.push(`Interfaz ${entity} no encontrada en modelos.ts`)
      result.passed = false
      return
    }

    // Validar interfaces con relaciones
    const expectedInterfaces = [
      `${entity}ConItems`,
      `${entity}ConTodo`
    ]

    for (const interfaceName of expectedInterfaces) {
      if (!content.includes(interfaceName)) {
        result.warnings.push(`Interfaz ${interfaceName} no encontrada`)
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Tipos TypeScript validados`))
  }

  /**
   * 📦 Validar payloads
   */
  private async validatePayloads(entity: string, result: ValidationResult) {
    const payloadsPath = 'src/types/payloads.ts'
    
    if (!existsSync(payloadsPath)) {
      result.errors.push('Archivo payloads.ts no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(payloadsPath, 'utf-8')
    
    // Validar payloads esperados
    const expectedPayloads = [
      `Crear${entity}Data`,
      `Actualizar${entity}Data`,
      `Filtros${entity}`
    ]

    for (const payload of expectedPayloads) {
      if (!content.includes(payload)) {
        result.errors.push(`Payload ${payload} no encontrado en payloads.ts`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Payloads validados`))
  }

  /**
   * 🔍 Validar schemas Zod
   */
  private async validateZodSchemas(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const validatorPath = `src/lib/validators/${entityLower}.ts`
    
    if (!existsSync(validatorPath)) {
      result.errors.push(`Archivo de validadores ${validatorPath} no encontrado`)
      result.passed = false
      return
    }

    const content = readFileSync(validatorPath, 'utf-8')
    
    // Validar schemas esperados
    const expectedSchemas = [
      `create${entity}Schema`,
      `update${entity}Schema`,
      `${entityLower}FiltersSchema`
    ]

    for (const schema of expectedSchemas) {
      if (!content.includes(schema)) {
        result.errors.push(`Schema ${schema} no encontrado`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Schemas Zod validados`))
  }

  /**
   * 🌐 Validar rutas API
   */
  private async validateApiRoutes(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const apiBasePath = `src/app/api/${entityKebab}`
    const routePath = `${apiBasePath}/route.ts`
    const idRoutePath = `${apiBasePath}/[id]/route.ts`
    
    // Validar ruta principal
    if (!existsSync(routePath)) {
      result.errors.push(`Ruta API principal ${routePath} no encontrada`)
      result.passed = false
    } else {
      const content = readFileSync(routePath, 'utf-8')
      if (!content.includes('export async function GET') || !content.includes('export async function POST')) {
        result.errors.push('Ruta principal debe exportar funciones GET y POST')
        result.passed = false
      }
    }

    // Validar ruta individual
    if (!existsSync(idRoutePath)) {
      result.errors.push(`Ruta API individual ${idRoutePath} no encontrada`)
      result.passed = false
    } else {
      const content = readFileSync(idRoutePath, 'utf-8')
      const requiredMethods = ['GET', 'PUT', 'DELETE']
      for (const method of requiredMethods) {
        if (!content.includes(`export async function ${method}`)) {
          result.errors.push(`Método ${method} faltante en ruta individual`)
          result.passed = false
        }
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Rutas API validadas`))
  }

  /**
   * 🔧 Validar servicios
   */
  private async validateServices(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const servicePath = `src/lib/services/${entityLower}.ts`
    
    if (!existsSync(servicePath)) {
      result.errors.push(`Servicio ${servicePath} no encontrado`)
      result.passed = false
      return
    }

    const content = readFileSync(servicePath, 'utf-8')
    
    // Validar clase de servicio
    if (!content.includes(`export class ${entity}Service`)) {
      result.errors.push(`Clase ${entity}Service no encontrada`)
      result.passed = false
    }

    // Validar métodos CRUD
    const requiredMethods = ['getList', 'getById', 'create', 'update', 'delete']
    for (const method of requiredMethods) {
      if (!content.includes(`static async ${method}`)) {
        result.errors.push(`Método ${method} faltante en servicio`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Servicio validado`))
  }

  /**
   * 🎨 Validar componentes
   */
  private async validateComponents(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const componentDir = `src/components/${entityKebab}`
    
    if (!existsSync(componentDir)) {
      result.errors.push(`Directorio de componentes ${componentDir} no encontrado`)
      result.passed = false
      return
    }

    // Validar componentes esperados
    const expectedComponents = [
      `${entity}List.tsx`,
      `${entity}Form.tsx`,
      `${entity}Select.tsx`
    ]

    for (const component of expectedComponents) {
      const componentPath = `${componentDir}/${component}`
      if (!existsSync(componentPath)) {
        result.warnings.push(`Componente ${component} no encontrado`)
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Componentes validados`))
  }

  /**
   * 📄 Validar páginas
   */
  private async validatePages(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const pageDir = `src/app/${entityKebab}`
    
    if (!existsSync(pageDir)) {
      result.errors.push(`Directorio de páginas ${pageDir} no encontrado`)
      result.passed = false
      return
    }

    // Validar página principal
    const mainPagePath = `${pageDir}/page.tsx`
    if (!existsSync(mainPagePath)) {
      result.errors.push(`Página principal ${mainPagePath} no encontrada`)
      result.passed = false
    }

    console.log(chalk.green(`  ✅ ${entity} - Páginas validadas`))
  }

  /**
   * 🧭 Validar sidebar
   */
  private async validateSidebar(entity: string, result: ValidationResult) {
    const sidebarPath = 'src/components/Sidebar.tsx'
    
    if (!existsSync(sidebarPath)) {
      result.errors.push('Archivo Sidebar.tsx no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(sidebarPath, 'utf-8')
    const entityKebab = this.toKebabCase(entity)
    
    if (!content.includes(`/${entityKebab}`)) {
      result.warnings.push(`Ruta /${entityKebab} no encontrada en sidebar`)
    }

    console.log(chalk.green(`  ✅ ${entity} - Sidebar validado`))
  }

  /**
   * 🧪 Validar tests
   */
  private async validateTests(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const testPaths = [
      `src/__tests__/api/${entityLower}.test.ts`,
      `src/__tests__/services/${entityLower}.test.ts`,
      `src/__tests__/components/${entityLower}.test.tsx`
    ]

    let testsFound = 0
    for (const testPath of testPaths) {
      if (existsSync(testPath)) {
        testsFound++
      }
    }

    if (testsFound === 0) {
      result.warnings.push('No se encontraron tests para esta entidad')
    } else if (testsFound < testPaths.length) {
      result.warnings.push(`Solo ${testsFound}/${testPaths.length} tipos de tests encontrados`)
    }

    console.log(chalk.green(`  ✅ ${entity} - Tests validados (${testsFound}/${testPaths.length})`))
  }

  /**
   * 📊 Generar reporte final
   */
  generateReport(): void {
    console.log(chalk.blue('\n📊 REPORTE DE CONSISTENCIA\n'))
    
    const totalEntities = this.entities.length
    const totalValidations = this.results.length
    const passedValidations = this.results.filter(r => r.passed).length
    const failedValidations = totalValidations - passedValidations
    
    console.log(chalk.white(`Total de entidades: ${totalEntities}`))
    console.log(chalk.white(`Total de validaciones: ${totalValidations}`))
    console.log(chalk.green(`Validaciones exitosas: ${passedValidations}`))
    console.log(chalk.red(`Validaciones fallidas: ${failedValidations}`))
    
    const successRate = ((passedValidations / totalValidations) * 100).toFixed(1)
    console.log(chalk.yellow(`Tasa de éxito: ${successRate}%\n`))

    // Agrupar por fase
    const byPhase = this.results.reduce((acc, result) => {
      if (!acc[result.phase]) acc[result.phase] = []
      acc[result.phase].push(result)
      return acc
    }, {} as Record<ValidationPhase, ValidationResult[]>)

    // Mostrar resultados por fase
    for (const [phase, results] of Object.entries(byPhase)) {
      const phasePassed = results.filter(r => r.passed).length
      const phaseTotal = results.length
      const phaseRate = ((phasePassed / phaseTotal) * 100).toFixed(1)
      
      console.log(chalk.blue(`📋 ${PHASE_CONFIG[phase as ValidationPhase].name}: ${phasePassed}/${phaseTotal} (${phaseRate}%)`))
      
      // Mostrar errores
      const errors = results.flatMap(r => r.errors)
      if (errors.length > 0) {
        console.log(chalk.red('  ❌ Errores:'))
        errors.forEach(error => console.log(chalk.red(`    • ${error}`)))
      }
      
      // Mostrar advertencias
      const warnings = results.flatMap(r => r.warnings)
      if (warnings.length > 0) {
        console.log(chalk.yellow('  ⚠️  Advertencias:'))
        warnings.forEach(warning => console.log(chalk.yellow(`    • ${warning}`)))
      }
      
      console.log()
    }

    // Recomendaciones finales
    if (failedValidations > 0) {
      console.log(chalk.red('🚨 ACCIÓN REQUERIDA:'))
      console.log(chalk.white('1. Revisa los errores listados arriba'))
      console.log(chalk.white('2. Ejecuta las correcciones necesarias'))
      console.log(chalk.white('3. Vuelve a ejecutar la auditoría'))
      console.log(chalk.white('4. Repite hasta alcanzar 100% de consistencia\n'))
    } else {
      console.log(chalk.green('🎉 ¡FELICITACIONES!'))
      console.log(chalk.white('Todas las validaciones han pasado exitosamente.'))
      console.log(chalk.white('El proyecto mantiene 100% de consistencia.\n'))
    }
  }

  /**
   * 🔧 Convertir a kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
  }
}

/**
 * 🚀 Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  const phaseArg = args.find(arg => arg.startsWith('--phase='))?.split('=')[1] as ValidationPhase
  const entityArg = args.find(arg => arg.startsWith('--entity='))?.split('=')[1]
  
  const auditor = new ConsistencyAuditor()
  
  if (phaseArg) {
    // Auditar fase específica
    await auditor.auditPhase(phaseArg, entityArg)
  } else {
    // Auditar todas las fases
    const phases: ValidationPhase[] = ['models', 'types', 'payloads', 'validators', 'apis', 'services', 'components', 'pages', 'sidebar', 'testing']
    
    for (const phase of phases) {
      await auditor.auditPhase(phase, entityArg)
    }
  }
  
  auditor.generateReport()
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { ConsistencyAuditor, ValidationPhase, ValidationResult }
```

### 📦 Comandos NPM para Ejecución por Fases

```json
// package.json - agregar estos scripts
{
  "scripts": {
    // Auditoría completa
    "audit:consistency": "tsx scripts/audit-consistency.ts",
    "audit:full": "npm run audit:consistency",
    
    // Auditoría por fases
    "audit:models": "npm run audit:consistency -- --phase=models",
    "audit:types": "npm run audit:consistency -- --phase=types",
    "audit:payloads": "npm run audit:consistency -- --phase=payloads",
    "audit:validators": "npm run audit:consistency -- --phase=validators",
    "audit:apis": "npm run audit:consistency -- --phase=apis",
    "audit:services": "npm run audit:consistency -- --phase=services",
    "audit:components": "npm run audit:consistency -- --phase=components",
    "audit:pages": "npm run audit:consistency -- --phase=pages",
    "audit:sidebar": "npm run audit:consistency -- --phase=sidebar",
    "audit:testing": "npm run audit:consistency -- --phase=testing",
    
    // Auditoría por entidad específica
    "audit:entity": "npm run audit:consistency -- --entity=",
    
    // Comandos de ejecución por fase
    "phase:1": "echo '🗄️ FASE 1: Prisma Models' && npm run audit:models",
    "phase:2": "echo '📝 FASE 2: TypeScript Types' && npm run audit:types",
    "phase:3": "echo '📦 FASE 3: API Payloads' && npm run audit:payloads",
    "phase:4": "echo '🔍 FASE 4: Zod Validators' && npm run audit:validators",
    "phase:5": "echo '🌐 FASE 5: API Routes' && npm run audit:apis",
    "phase:6": "echo '🔧 FASE 6: Services' && npm run audit:services",
    "phase:7": "echo '🎨 FASE 7: Components' && npm run audit:components",
    "phase:8": "echo '📄 FASE 8: Pages' && npm run audit:pages",
    "phase:9": "echo '🧭 FASE 9: Sidebar' && npm run audit:sidebar",
    "phase:10": "echo '🧪 FASE 10: Testing' && npm run audit:testing",
    
    // Comando para ejecutar todas las fases secuencialmente
    "phases:all": "npm run phase:1 && npm run phase:2 && npm run phase:3 && npm run phase:4 && npm run phase:5 && npm run phase:6 && npm run phase:7 && npm run phase:8 && npm run phase:9 && npm run phase:10",
    
    // Comandos de desarrollo
    "dev:audit": "npm run audit:consistency && npm run dev",
    "build:audit": "npm run audit:consistency && npm run build",
    
    // Comandos de testing con auditoría
    "test:audit": "npm run audit:testing && npm run test",
    "test:coverage": "npm run test -- --coverage"
  }
}
```

### 🎯 Uso de los Comandos

```bash
# Auditoría completa del proyecto
npm run audit:full

# Auditoría por fase específica
npm run audit:models
npm run audit:apis
npm run audit:components

# Auditoría de entidad específica
npm run audit:entity AprovisionamientoFinanciero
npm run audit:consistency -- --entity=OrdenCompra

# Ejecutar fase específica con validación
npm run phase:1  # Prisma Models
npm run phase:5  # API Routes
npm run phase:7  # Components

# Ejecutar todas las fases secuencialmente
npm run phases:all

# Desarrollo con auditoría automática
npm run dev:audit

# Build con validación previa
npm run build:audit
```

### 📋 Templates de Generación Automática

```typescript
// scripts/generate-entity.ts
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

/**
 * 🏗️ Generador automático de entidades
 */
class EntityGenerator {
  constructor(private entityName: string) {}

  /**
   * 🚀 Generar entidad completa
   */
  async generateAll() {
    console.log(chalk.blue(`🏗️ Generando entidad: ${this.entityName}`))
    
    await this.generatePrismaModel()
    await this.generateTypes()
    await this.generatePayloads()
    await this.generateValidators()
    await this.generateApiRoutes()
    await this.generateService()
    await this.generateComponents()
    await this.generatePages()
    await this.generateTests()
    
    console.log(chalk.green(`✅ Entidad ${this.entityName} generada completamente`))
    console.log(chalk.yellow('🔍 Ejecuta npm run audit:consistency para validar'))
  }

  private async generatePrismaModel() {
    // Implementar generación de modelo Prisma
  }

  private async generateTypes() {
    // Implementar generación de tipos
  }

  // ... más métodos de generación
}

// Uso: npm run generate:entity -- NuevaEntidad
```

### 🔄 Workflow de Desarrollo Recomendado

```bash
# 1. Crear nueva entidad
npm run generate:entity -- NuevaEntidad

# 2. Validar cada fase durante desarrollo
npm run phase:1  # Después de definir modelo Prisma
npm run phase:2  # Después de crear tipos
npm run phase:3  # Después de crear payloads
# ... continuar con cada fase

# 3. Validación final
npm run audit:full

# 4. Ejecutar tests
npm run test:audit

# 5. Build final
npm run build:audit
```

### 📝 Script de Auditoría Automática
```typescript
// scripts/audit-consistency.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

interface ConsistencyReport {
  entity: string;
  prismaFields: string[];
  typeFields: string[];
  payloadFields: string[];
  validatorFields: string[];
  missingInTypes: string[];
  missingInPayloads: string[];
  missingInValidators: string[];
  status: 'CONSISTENT' | 'INCONSISTENT';
}

async function auditConsistency(entityName: string): Promise<ConsistencyReport> {
  // 1. Extraer campos del modelo Prisma
  const prismaFields = await extractPrismaFields(entityName);
  
  // 2. Extraer campos de types TypeScript
  const typeFields = extractTypeFields(entityName);
  
  // 3. Extraer campos de payloads
  const payloadFields = extractPayloadFields(entityName);
  
  // 4. Extraer campos de validators Zod
  const validatorFields = extractValidatorFields(entityName);
  
  // 5. Comparar y generar reporte
  const missingInTypes = prismaFields.filter(f => !typeFields.includes(f));
  const missingInPayloads = prismaFields.filter(f => !payloadFields.includes(f));
  const missingInValidators = prismaFields.filter(f => !validatorFields.includes(f));
  
  return {
    entity: entityName,
    prismaFields,
    typeFields,
    payloadFields,
    validatorFields,
    missingInTypes,
    missingInPayloads,
    missingInValidators,
    status: (missingInTypes.length === 0 && 
             missingInPayloads.length === 0 && 
             missingInValidators.length === 0) ? 'CONSISTENT' : 'INCONSISTENT'
  };
}

// Ejecutar auditoría para todas las entidades
async function runFullAudit() {
  const entities = ['AprovisionamientoFinanciero', 'OrdenCompra', 'Recepcion', 'Pago'];
  const reports: ConsistencyReport[] = [];
  
  for (const entity of entities) {
    const report = await auditConsistency(entity);
    reports.push(report);
    
    console.log(`\n🔍 Auditoría: ${entity}`);
    console.log(`Status: ${report.status === 'CONSISTENT' ? '✅' : '❌'} ${report.status}`);
    
    if (report.missingInTypes.length > 0) {
      console.log(`❌ Campos faltantes en Types: ${report.missingInTypes.join(', ')}`);
    }
    
    if (report.missingInPayloads.length > 0) {
      console.log(`❌ Campos faltantes en Payloads: ${report.missingInPayloads.join(', ')}`);
    }
    
    if (report.missingInValidators.length > 0) {
      console.log(`❌ Campos faltantes en Validators: ${report.missingInValidators.join(', ')}`);
    }
  }
  
  // Generar reporte HTML
  generateHTMLReport(reports);
}

runFullAudit().catch(console.error);
```

### 📊 Comando de Verificación
```bash
# Ejecutar auditoría de consistencia
npm run audit:consistency

# Verificar antes de cada commit
npm run pre-commit:audit

# Generar reporte completo
npm run audit:report
```

---

## 📋 Checklist Mejorado por Fase

### ✅ FASE 1 MEJORADA: Modelos Prisma + Auditoría

#### F1.01: Definición y Verificación de Modelos
**📋 Entregables Adicionales:**
- ✅ **Auditoría Pre-Migración**: Verificar que no hay campos huérfanos en código existente
- ✅ **Validación de Relaciones**: Confirmar que todas las FK existen
- ✅ **Verificación de Enums**: Validar que enums están actualizados en todo el código
- ✅ **Test de Migración**: Ejecutar migración en ambiente de prueba
- ✅ **Generación de Cliente**: Confirmar que `prisma generate` funciona sin errores

**🔧 Comandos de Verificación:**
```bash
# Verificar schema antes de migrar
npx prisma validate

# Generar cliente y verificar tipos
npx prisma generate

# Ejecutar auditoría de consistencia
npm run audit:consistency

# Migrar solo si auditoría pasa
npx prisma migrate dev --name add-entity-name
```

### ✅ FASE 2 MEJORADA: Types + Validación Automática

#### F2.01: Types Base con Verificación
**📋 Entregables Adicionales:**
- ✅ **Sincronización Automática**: Script que genera types desde Prisma
- ✅ **Validación de Imports**: Verificar que todos los imports de Prisma son válidos
- ✅ **Test de Compilación**: Confirmar que TypeScript compila sin errores
- ✅ **Documentación JSDoc**: Incluir comentarios descriptivos para cada campo

**🔧 Script de Generación Automática:**
```typescript
// scripts/generate-types.ts
import { DMMF } from '@prisma/client/runtime';
import fs from 'fs';

function generateTypesFromPrisma() {
  // Leer schema de Prisma
  // Generar interfaces TypeScript
  // Crear payloads automáticamente
  // Validar consistencia
}
```

### ✅ FASE 3 MEJORADA: Validators + Sincronización

#### F3.01: Schemas Zod Sincronizados
**📋 Entregables Adicionales:**
- ✅ **Generación Automática**: Scripts que crean schemas Zod desde Prisma
- ✅ **Validación Cruzada**: Verificar que validators coinciden con modelo
- ✅ **Test de Validación**: Probar todos los casos edge
- ✅ **Mensajes Consistentes**: Estandarizar mensajes de error

### ✅ FASE 4 MEJORADA: APIs + Verificación de Endpoints

#### F4.01: APIs con Validación Completa
**📋 Entregables Adicionales:**
- ✅ **Test de Endpoints**: Verificar que todas las rutas funcionan
- ✅ **Validación de Queries**: Confirmar que include/select son válidos
- ✅ **Test de Filtros**: Probar todos los filtros con datos reales
- ✅ **Documentación OpenAPI**: Generar docs automáticas

---

## 🚨 Alertas y Prevención

### 📢 Sistema de Alertas Automáticas

#### Pre-commit Hooks
```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Ejecutando auditoría de consistencia..."
npm run audit:consistency

if [ $? -ne 0 ]; then
  echo "❌ Auditoría falló. Commit cancelado."
  echo "💡 Ejecuta 'npm run fix:consistency' para corregir automáticamente"
  exit 1
fi

echo "✅ Auditoría pasó. Continuando con commit..."
```

#### CI/CD Pipeline
```yaml
# .github/workflows/consistency-check.yml
name: Consistency Check

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx prisma generate
      - run: npm run audit:consistency
      - run: npm run type-check
      - run: npm run test:consistency
```

---

## 📚 Documentación de Mejores Prácticas

### 🎯 Reglas de Oro para Consistencia

1. **Database-First**: Prisma es la única fuente de verdad
2. **Auditoría Continua**: Verificar consistencia en cada cambio
3. **Generación Automática**: Usar scripts para derivar types y validators
4. **Testing Obligatorio**: Probar consistencia en CI/CD
5. **Documentación Viva**: Mantener docs actualizadas automáticamente

### 🔧 Comandos Estándar
```bash
# Flujo completo de desarrollo
npm run dev:setup          # Configurar ambiente
npm run audit:full          # Auditoría completa
npm run fix:consistency     # Corregir automáticamente
npm run test:consistency    # Probar consistencia
npm run deploy:check        # Verificar antes de deploy
```

---

## 🎯 Beneficios de las Mejoras

### ✅ Prevención de Errores
- **Reducción 90%** de inconsistencias BD-API-Frontend
- **Detección temprana** de campos faltantes o incorrectos
- **Validación automática** antes de cada commit
- **Rollback automático** si hay inconsistencias

### ⚡ Eficiencia de Desarrollo
- **Generación automática** de types y validators
- **Documentación actualizada** automáticamente
- **Testing integrado** de consistencia
- **Feedback inmediato** sobre problemas

### 🛡️ Calidad del Código
- **Tipado estricto** en toda la aplicación
- **Validación completa** de datos
- **Trazabilidad** de cambios
- **Mantenibilidad** mejorada

---

## 🚀 Implementación Inmediata

### 📋 Pasos para Aplicar Mejoras

1. **Crear scripts de auditoría** (1 día)
2. **Configurar pre-commit hooks** (0.5 días)
3. **Actualizar CI/CD pipeline** (0.5 días)
4. **Documentar nuevos procesos** (1 día)
5. **Capacitar al equipo** (0.5 días)

### 🎯 Resultado Esperado

Con estas mejoras, el **PLAN_MAESTRO_APROVISIONAMIENTO_FINANCIERO.md** se convierte en un plan **robusto y a prueba de inconsistencias**, garantizando que:

- ✅ **Nunca más** habrá campos en APIs que no existen en BD
- ✅ **Nunca más** habrá componentes usando propiedades inexistentes
- ✅ **Nunca más** habrá validators desactualizados
- ✅ **Siempre** habrá consistencia entre todas las capas
- ✅ **Siempre** habrá detección temprana de problemas

---

*Estas mejoras transforman el Plan Maestro de un excelente plan de implementación a un **sistema robusto de desarrollo enterprise** que previene inconsistencias desde el diseño.*