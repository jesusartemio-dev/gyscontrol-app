# 🔄 PLAN MAESTRO APROVISIONAMIENTO FINANCIERO V3
## Análisis de Inconsistencias y Plan de Corrección Integral

---

## 📋 RESUMEN EJECUTIVO

**🎯 Objetivo**: Identificar y corregir todas las inconsistencias entre las APIs implementadas, servicios, componentes, tipos y el schema de base de datos de Prisma en el módulo de Aprovisionamiento Financiero.

**📊 Estado Actual**: 
- ✅ APIs implementadas y funcionales
- ⚠️ Inconsistencias detectadas entre código y DB
- 🔧 Necesidad de sincronización integral

**🚀 Resultado Esperado**: Sistema completamente alineado con consistencia total entre todas las capas.

---

## 🔍 ANÁLISIS DE INCONSISTENCIAS DETECTADAS

### 1. **INCONSISTENCIAS EN TIPOS Y PAYLOADS**

#### 1.1 Servicios vs Tipos Definidos
**📁 Archivo**: `src/lib/services/aprovisionamientos.ts`

**❌ Problemas Identificados**:
```typescript
// ❌ El servicio usa tipos que no existen en payloads.ts
import {
  CrearAprovisionamientoData,        // ❌ NO EXISTE
  ActualizarAprovisionamientoData,   // ❌ NO EXISTE
  FiltrosAprovisionamiento           // ❌ NO EXISTE
} from '@/types/payloads';

// ❌ Usa tipos que no están en modelos.ts
import {
  Aprovisionamiento,                 // ❌ NO EXISTE (debería ser AprovisionamientoFinanciero)
  AprovisionamientoConRelaciones,    // ❌ NO EXISTE (debería ser AprovisionamientoConTodo)
  TipoAprovisionamiento,             // ❌ NO EXISTE en Prisma
  Prioridad                          // ❌ NO EXISTE (debería ser PrioridadOrden)
} from '@/types/modelos';
```

**✅ Tipos Correctos Según Prisma**:
```typescript
// ✅ Tipos que SÍ existen
import {
  CreateAprovisionamientoFinancieroPayload,
  UpdateAprovisionamientoFinancieroPayload,
  AprovisionamientoFilters
} from '@/types/payloads';

import {
  AprovisionamientoFinanciero,
  AprovisionamientoConTodo,
  EstadoAprovisionamiento,
  PrioridadOrden
} from '@/types/modelos';
```

#### 1.2 Campos Faltantes en Payloads
**📁 Archivo**: `src/types/payloads.ts`

**❌ Campos Faltantes**:
```typescript
// ❌ FALTAN estos payloads en payloads.ts:
interface CrearAprovisionamientoData {
  proyectoId: string;
  ordenCompraId: string;
  montoTotal: number;
  tipo: TipoAprovisionamiento;  // ❌ Este tipo no existe
  prioridad: Prioridad;         // ❌ Este tipo no existe
  fechaInicio: Date;
  observaciones?: string;
}

interface FiltrosAprovisionamiento {
  proyectoId?: string;
  estado?: EstadoAprovisionamiento;
  fechaInicio?: string;
  fechaFin?: string;
  // ... más filtros
}
```

### 2. **INCONSISTENCIAS EN COMPONENTES**

#### 2.1 Importaciones Incorrectas
**📁 Archivos**: `src/components/aprovisionamientos/*.tsx`

**❌ Problemas Detectados**:
```typescript
// ❌ En AprovisionamientoList.tsx y otros componentes
import { obtenerAprovisionamientos } from '@/lib/services/aprovisionamientos'
// ❌ Esta función no existe, debería ser:
import { obtenerAprovisionamientosFinancieros } from '@/lib/services/aprovisionamientoFinanciero'

// ❌ Uso de tipos incorrectos
const [aprovisionamientos, setAprovisionamientos] = useState<Aprovisionamiento[]>([]);
// ✅ Debería ser:
const [aprovisionamientos, setAprovisionamientos] = useState<AprovisionamientoFinanciero[]>([]);
```

#### 2.2 Campos de Formulario No Alineados
**📁 Archivo**: `src/components/aprovisionamientos/AprovisionamientoForm.tsx`

**❌ Campos que no existen en Prisma**:
```typescript
// ❌ Campos usados en formularios que NO están en el schema
- tipo: TipoAprovisionamiento     // ❌ NO EXISTE
- prioridad: Prioridad           // ❌ NO EXISTE (debería ser PrioridadOrden)
- codigoAprovisionamiento        // ❌ NO EXISTE (debería ser 'codigo')
- montoAprovisionado            // ❌ NO EXISTE (debería ser 'montoTotal')
```

### 3. **INCONSISTENCIAS EN APIS**

#### 3.1 Estructura de Respuesta
**📁 Archivo**: `src/app/api/aprovisionamientos/aprovisionamientos/route.ts`

**❌ Problemas en POST**:
```typescript
// ❌ La API usa campos que no están en el schema
const data = await request.json();
// Valida campos como:
- codigoAprovisionamiento  // ❌ Debería ser 'codigo'
- tipo                     // ❌ No existe en Prisma
- prioridad               // ❌ Debería ser PrioridadOrden
```

#### 3.2 Validadores Zod Desactualizados
**📁 Archivo**: `src/lib/validators/aprovisionamiento.ts`

**❌ Schemas Incorrectos**:
```typescript
// ❌ Validadores que no coinciden con Prisma
const AprovisionamientoSchema = z.object({
  codigoAprovisionamiento: z.string(),  // ❌ Debería ser 'codigo'
  tipo: z.enum(['COMPRA', 'SERVICIO']), // ❌ No existe en Prisma
  prioridad: z.enum(['ALTA', 'MEDIA']), // ❌ Debería usar PrioridadOrden
});
```

### 4. **CAMPOS FALTANTES EN BASE DE DATOS**

#### 4.1 Campos Usados en Código pero No en DB
**📊 Análisis del Schema Prisma vs Código**:

```sql
-- ❌ Campos que el código espera pero NO están en Prisma:
- codigoAprovisionamiento (usado en APIs y componentes)
- tipo (TipoAprovisionamiento - no existe)
- prioridad (usado como Prioridad, debería ser PrioridadOrden)
- montoAprovisionado (usado en formularios)
- fechaAprobacion (usado en componentes)
- responsableAprobacion (usado en workflows)
```

#### 4.2 Campos en DB pero No Usados en Código
```sql
-- ✅ Campos que SÍ están en Prisma pero NO se usan:
- responsableAprobacionId
- responsableCompletadoId  
- responsableCancelacionId
- fechaFinalizacion
```

---

## 🛠️ PLAN DE CORRECCIÓN INTEGRAL

### **FASE 1: CORRECCIÓN DE TIPOS Y PAYLOADS** ⚡
**⏱️ Duración**: 1 día
**🎯 Prioridad**: CRÍTICA

#### F1.1: Actualizar Payloads Faltantes
```typescript
// ✅ AGREGAR a src/types/payloads.ts

// 🆕 Payloads para Aprovisionamiento Financiero
export interface CrearAprovisionamientoFinancieroData {
  codigo: string;
  ordenCompraId: string;
  recepcionId?: string;
  pagoId?: string;
  estado: EstadoAprovisionamiento;
  montoTotal: number;
  montoRecibido: number;
  montoPagado: number;
  moneda: string;
  fechaInicio: Date;
  fechaFinalizacion?: Date;
  observaciones?: string;
  usuarioId: string;
  responsableAprobacionId?: string;
  responsableCompletadoId?: string;
  responsableCancelacionId?: string;
}

export interface ActualizarAprovisionamientoFinancieroData 
  extends Partial<CrearAprovisionamientoFinancieroData> {}

export interface FiltrosAprovisionamientoFinanciero {
  codigo?: string;
  ordenCompraId?: string;
  estado?: EstadoAprovisionamiento;
  fechaInicioDesde?: string;
  fechaInicioHasta?: string;
  fechaFinalizacionDesde?: string;
  fechaFinalizacionHasta?: string;
  montoMinimo?: number;
  montoMaximo?: number;
  moneda?: string;
  usuarioId?: string;
  responsableAprobacionId?: string;
}

// 🆕 Payloads para Historial
export interface CrearHistorialAprovisionamientoData {
  aprovisionamientoId: string;
  ordenCompraId?: string;
  recepcionId?: string;
  pagoId?: string;
  tipoMovimiento: TipoMovimiento;
  estadoAnterior?: EstadoAprovisionamiento;
  estadoNuevo?: EstadoAprovisionamiento;
  descripcion: string;
  montoAnterior?: number;
  montoNuevo?: number;
  observaciones?: string;
  usuarioId: string;
  fechaMovimiento: Date;
}
```

#### F1.2: Corregir Importaciones en Servicios
```typescript
// ✅ CORREGIR src/lib/services/aprovisionamientos.ts

// ❌ REMOVER importaciones incorrectas:
// import { CrearAprovisionamientoData, ... } from '@/types/payloads';
// import { Aprovisionamiento, ... } from '@/types/modelos';

// ✅ AGREGAR importaciones correctas:
import {
  CrearAprovisionamientoFinancieroData,
  ActualizarAprovisionamientoFinancieroData,
  FiltrosAprovisionamientoFinanciero
} from '@/types/payloads';

import {
  AprovisionamientoFinanciero,
  AprovisionamientoConTodo,
  EstadoAprovisionamiento,
  PrioridadOrden
} from '@/types/modelos';
```

### **FASE 2: CORRECCIÓN DE VALIDADORES ZOD** ⚡
**⏱️ Duración**: 1 día
**🎯 Prioridad**: CRÍTICA

#### F2.1: Actualizar Schemas de Validación
```typescript
// ✅ CORREGIR src/lib/validators/aprovisionamiento.ts

import { z } from 'zod';
import { 
  EstadoAprovisionamiento, 
  TipoMovimiento,
  PrioridadOrden 
} from '@prisma/client';

// ✅ Schema correcto para Aprovisionamiento Financiero
export const AprovisionamientoFinancieroSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  ordenCompraId: z.string().uuid('ID de orden de compra inválido'),
  recepcionId: z.string().uuid().optional(),
  pagoId: z.string().uuid().optional(),
  estado: z.nativeEnum(EstadoAprovisionamiento),
  montoTotal: z.number().positive('Monto total debe ser positivo'),
  montoRecibido: z.number().min(0, 'Monto recibido no puede ser negativo'),
  montoPagado: z.number().min(0, 'Monto pagado no puede ser negativo'),
  moneda: z.string().min(1, 'Moneda es requerida'),
  fechaInicio: z.date(),
  fechaFinalizacion: z.date().optional(),
  observaciones: z.string().optional(),
  usuarioId: z.string().uuid('ID de usuario inválido'),
  responsableAprobacionId: z.string().uuid().optional(),
  responsableCompletadoId: z.string().uuid().optional(),
  responsableCancelacionId: z.string().uuid().optional(),
});

export const CrearAprovisionamientoFinancieroSchema = AprovisionamientoFinancieroSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ActualizarAprovisionamientoFinancieroSchema = 
  CrearAprovisionamientoFinancieroSchema.partial();

// ✅ Schema para Historial
export const HistorialAprovisionamientoSchema = z.object({
  aprovisionamientoId: z.string().uuid(),
  ordenCompraId: z.string().uuid().optional(),
  recepcionId: z.string().uuid().optional(),
  pagoId: z.string().uuid().optional(),
  tipoMovimiento: z.nativeEnum(TipoMovimiento),
  estadoAnterior: z.nativeEnum(EstadoAprovisionamiento).optional(),
  estadoNuevo: z.nativeEnum(EstadoAprovisionamiento).optional(),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  montoAnterior: z.number().optional(),
  montoNuevo: z.number().optional(),
  observaciones: z.string().optional(),
  usuarioId: z.string().uuid(),
  fechaMovimiento: z.date(),
});

// ✅ Filtros
export const FiltrosAprovisionamientoSchema = z.object({
  codigo: z.string().optional(),
  ordenCompraId: z.string().uuid().optional(),
  estado: z.nativeEnum(EstadoAprovisionamiento).optional(),
  fechaInicioDesde: z.string().optional(),
  fechaInicioHasta: z.string().optional(),
  fechaFinalizacionDesde: z.string().optional(),
  fechaFinalizacionHasta: z.string().optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  moneda: z.string().optional(),
  usuarioId: z.string().uuid().optional(),
  responsableAprobacionId: z.string().uuid().optional(),
});
```

### **FASE 3: CORRECCIÓN DE APIS** ⚡
**⏱️ Duración**: 2 días
**🎯 Prioridad**: ALTA

#### F3.1: Actualizar API Principal
```typescript
// ✅ CORREGIR src/app/api/aprovisionamientos/aprovisionamientos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  CrearAprovisionamientoFinancieroSchema,
  FiltrosAprovisionamientoSchema 
} from '@/lib/validators/aprovisionamiento';
import { 
  EstadoAprovisionamiento,
  TipoMovimiento 
} from '@prisma/client';

// ✅ GET - Listar aprovisionamientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' }, 
        { status: 401 }
      );
    }

    // ✅ Validar permisos por rol
    const rolesPermitidos = ['ADMIN', 'GERENTE', 'FINANZAS', 'LOGISTICA'];
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos suficientes' }, 
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // ✅ Construir filtros
    const filtros = {
      codigo: searchParams.get('codigo') || undefined,
      ordenCompraId: searchParams.get('ordenCompraId') || undefined,
      estado: searchParams.get('estado') as EstadoAprovisionamiento || undefined,
      fechaInicioDesde: searchParams.get('fechaInicioDesde') || undefined,
      fechaInicioHasta: searchParams.get('fechaInicioHasta') || undefined,
      montoMinimo: searchParams.get('montoMinimo') ? 
        parseFloat(searchParams.get('montoMinimo')!) : undefined,
      montoMaximo: searchParams.get('montoMaximo') ? 
        parseFloat(searchParams.get('montoMaximo')!) : undefined,
      moneda: searchParams.get('moneda') || undefined,
    };

    // ✅ Validar filtros
    const filtrosValidados = FiltrosAprovisionamientoSchema.parse(filtros);

    // ✅ Construir condiciones WHERE
    const whereConditions: any = {};
    
    if (filtrosValidados.codigo) {
      whereConditions.codigo = {
        contains: filtrosValidados.codigo,
        mode: 'insensitive'
      };
    }
    
    if (filtrosValidados.ordenCompraId) {
      whereConditions.ordenCompraId = filtrosValidados.ordenCompraId;
    }
    
    if (filtrosValidados.estado) {
      whereConditions.estado = filtrosValidados.estado;
    }
    
    if (filtrosValidados.fechaInicioDesde || filtrosValidados.fechaInicioHasta) {
      whereConditions.fechaInicio = {};
      if (filtrosValidados.fechaInicioDesde) {
        whereConditions.fechaInicio.gte = new Date(filtrosValidados.fechaInicioDesde);
      }
      if (filtrosValidados.fechaInicioHasta) {
        whereConditions.fechaInicio.lte = new Date(filtrosValidados.fechaInicioHasta);
      }
    }
    
    if (filtrosValidados.montoMinimo || filtrosValidados.montoMaximo) {
      whereConditions.montoTotal = {};
      if (filtrosValidados.montoMinimo) {
        whereConditions.montoTotal.gte = filtrosValidados.montoMinimo;
      }
      if (filtrosValidados.montoMaximo) {
        whereConditions.montoTotal.lte = filtrosValidados.montoMaximo;
      }
    }
    
    if (filtrosValidados.moneda) {
      whereConditions.moneda = filtrosValidados.moneda;
    }

    // ✅ Ejecutar consultas
    const [aprovisionamientos, total] = await Promise.all([
      prisma.aprovisionamientoFinanciero.findMany({
        where: whereConditions,
        include: {
          ordenCompra: {
            include: {
              proveedor: true,
              items: {
                include: {
                  producto: true
                }
              }
            }
          },
          recepcion: {
            include: {
              items: true
            }
          },
          pago: {
            include: {
              items: true
            }
          },
          historial: {
            orderBy: {
              fechaMovimiento: 'desc'
            },
            take: 5
          },
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.aprovisionamientoFinanciero.count({
        where: whereConditions
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: aprovisionamientos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener aprovisionamientos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// ✅ POST - Crear aprovisionamiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' }, 
        { status: 401 }
      );
    }

    // ✅ Validar permisos
    const rolesPermitidos = ['ADMIN', 'GERENTE', 'FINANZAS'];
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para crear aprovisionamientos' }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // ✅ Validar datos con schema correcto
    const datosValidados = CrearAprovisionamientoFinancieroSchema.parse({
      ...body,
      usuarioId: session.user.id,
      fechaInicio: new Date(body.fechaInicio),
      fechaFinalizacion: body.fechaFinalizacion ? new Date(body.fechaFinalizacion) : undefined
    });

    // ✅ Verificar que la orden de compra existe y está aprobada
    const ordenCompra = await prisma.ordenCompra.findUnique({
      where: { id: datosValidados.ordenCompraId },
      include: {
        proveedor: true,
        items: true
      }
    });

    if (!ordenCompra) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    if (ordenCompra.estado !== 'APROBADA') {
      return NextResponse.json(
        { error: 'La orden de compra debe estar aprobada' },
        { status: 400 }
      );
    }

    // ✅ Verificar que no existe un aprovisionamiento activo para esta orden
    const aprovisionamientoExistente = await prisma.aprovisionamientoFinanciero.findFirst({
      where: {
        ordenCompraId: datosValidados.ordenCompraId,
        estado: {
          in: ['PENDIENTE', 'EN_PROCESO', 'APROBADO']
        }
      }
    });

    if (aprovisionamientoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un aprovisionamiento activo para esta orden' },
        { status: 400 }
      );
    }

    // ✅ Validar que el monto total coincide con la orden
    const montoOrden = ordenCompra.items.reduce((sum, item) => sum + item.subtotal, 0);
    if (Math.abs(datosValidados.montoTotal - montoOrden) > 0.01) {
      return NextResponse.json(
        { error: 'El monto total no coincide con la orden de compra' },
        { status: 400 }
      );
    }

    // ✅ Generar código único
    const ultimoAprovisionamiento = await prisma.aprovisionamientoFinanciero.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { codigo: true }
    });

    let numeroSecuencia = 1;
    if (ultimoAprovisionamiento?.codigo) {
      const match = ultimoAprovisionamiento.codigo.match(/APR-(\d+)/);
      if (match) {
        numeroSecuencia = parseInt(match[1]) + 1;
      }
    }

    const codigoGenerado = `APR-${numeroSecuencia.toString().padStart(4, '0')}`;

    // ✅ Crear aprovisionamiento en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear aprovisionamiento principal
      const nuevoAprovisionamiento = await tx.aprovisionamientoFinanciero.create({
        data: {
          ...datosValidados,
          codigo: codigoGenerado
        },
        include: {
          ordenCompra: {
            include: {
              proveedor: true,
              items: {
                include: {
                  producto: true
                }
              }
            }
          },
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Crear registro en historial
      await tx.historialAprovisionamiento.create({
        data: {
          aprovisionamientoId: nuevoAprovisionamiento.id,
          ordenCompraId: datosValidados.ordenCompraId,
          tipoMovimiento: 'CREACION',
          estadoNuevo: datosValidados.estado,
          descripcion: `Aprovisionamiento creado para orden ${ordenCompra.numero}`,
          montoNuevo: datosValidados.montoTotal,
          usuarioId: session.user.id,
          fechaMovimiento: new Date()
        }
      });

      return nuevoAprovisionamiento;
    });

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Aprovisionamiento creado exitosamente',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear aprovisionamiento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
```

### **FASE 4: CORRECCIÓN DE SERVICIOS** ⚡
**⏱️ Duración**: 2 días
**🎯 Prioridad**: ALTA

#### F4.1: Renombrar y Corregir Servicio Principal
```typescript
// ✅ RENOMBRAR archivo:
// src/lib/services/aprovisionamientos.ts → src/lib/services/aprovisionamientoFinanciero.ts

// ✅ CORREGIR contenido completo:
import { logger } from '@/lib/logger';
import {
  CrearAprovisionamientoFinancieroData,
  ActualizarAprovisionamientoFinancieroData,
  FiltrosAprovisionamientoFinanciero
} from '@/types/payloads';
import {
  AprovisionamientoFinanciero,
  AprovisionamientoConTodo,
  EstadoAprovisionamiento
} from '@/types/modelos';

// ✅ Función: Obtener aprovisionamientos financieros
export async function obtenerAprovisionamientosFinancieros(
  filtros: FiltrosAprovisionamientoFinanciero = {},
  page: number = 1,
  limit: number = 10
): Promise<{
  aprovisionamientos: AprovisionamientoConTodo[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.entries(filtros).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>)
    });

    const response = await fetch(`${baseUrl}/api/aprovisionamientos/aprovisionamientos?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Aprovisionamientos financieros obtenidos exitosamente', {
      filtros,
      page,
      limit,
      total: data.total
    });

    return {
      aprovisionamientos: data.data,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
      currentPage: data.pagination.page
    };

  } catch (error) {
    logger.error('Error al obtener aprovisionamientos financieros', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros,
      page,
      limit
    });
    throw error;
  }
}

// ✅ Función: Obtener aprovisionamiento por ID
export async function obtenerAprovisionamientoFinancieroPorId(
  id: string
): Promise<AprovisionamientoConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/aprovisionamientos/aprovisionamientos/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Aprovisionamiento financiero obtenido exitosamente', {
      aprovisionamientoId: id
    });

    return data.data;

  } catch (error) {
    logger.error('Error al obtener aprovisionamiento financiero', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      aprovisionamientoId: id
    });
    throw error;
  }
}

// ✅ Función: Crear aprovisionamiento financiero
export async function crearAprovisionamientoFinanciero(
  datos: CrearAprovisionamientoFinancieroData
): Promise<AprovisionamientoConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/aprovisionamientos/aprovisionamientos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Aprovisionamiento financiero creado exitosamente', {
      aprovisionamientoId: data.data.id,
      codigo: data.data.codigo,
      ordenCompraId: datos.ordenCompraId,
      montoTotal: datos.montoTotal
    });

    return data.data;

  } catch (error) {
    logger.error('Error al crear aprovisionamiento financiero', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      datos
    });
    throw error;
  }
}

// ✅ Función: Actualizar aprovisionamiento financiero
export async function actualizarAprovisionamientoFinanciero(
  id: string,
  datos: ActualizarAprovisionamientoFinancieroData
): Promise<AprovisionamientoConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/aprovisionamientos/aprovisionamientos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Aprovisionamiento financiero actualizado exitosamente', {
      aprovisionamientoId: id,
      cambios: datos
    });

    return data.data;

  } catch (error) {
    logger.error('Error al actualizar aprovisionamiento financiero', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      aprovisionamientoId: id,
      datos
    });
    throw error;
  }
}

// ✅ Función: Eliminar aprovisionamiento financiero
export async function eliminarAprovisionamientoFinanciero(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/aprovisionamientos/aprovisionamientos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Aprovisionamiento financiero eliminado exitosamente', {
      aprovisionamientoId: id
    });

    return data;

  } catch (error) {
    logger.error('Error al eliminar aprovisionamiento financiero', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      aprovisionamientoId: id
    });
    throw error;
  }
}
```

### **FASE 5: CORRECCIÓN DE COMPONENTES** ⚡
**⏱️ Duración**: 3 días
**🎯 Prioridad**: MEDIA

#### F5.1: Actualizar Importaciones en Componentes
```typescript
// ✅ CORREGIR todos los componentes en src/components/aprovisionamientos/

// ❌ REMOVER importaciones incorrectas:
// import { obtenerAprovisionamientos } from '@/lib/services/aprovisionamientos'
// import { Aprovisionamiento } from '@/types/modelos'

// ✅ AGREGAR importaciones correctas:
import { 
  obtenerAprovisionamientosFinancieros,
  crearAprovisionamientoFinanciero,
  actualizarAprovisionamientoFinanciero,
  eliminarAprovisionamientoFinanciero
} from '@/lib/services/aprovisionamientoFinanciero'
import { 
  AprovisionamientoFinanciero,
  AprovisionamientoConTodo,
  EstadoAprovisionamiento
} from '@/types/modelos'
import {
  CrearAprovisionamientoFinancieroData,
  FiltrosAprovisionamientoFinanciero
} from '@/types/payloads'
```

#### F5.2: Corregir Estados y Variables
```typescript
// ✅ En AprovisionamientoList.tsx
const [aprovisionamientos, setAprovisionamientos] = 
  useState<AprovisionamientoFinanciero[]>([]);

// ✅ En AprovisionamientoForm.tsx
const [aprovisionamiento, setAprovisionamiento] = 
  useState<AprovisionamientoConTodo | null>(null);

// ✅ Corregir nombres de campos en formularios
// ❌ codigoAprovisionamiento → ✅ codigo
// ❌ montoAprovisionado → ✅ montoTotal
// ❌ tipo → ✅ (remover, no existe)
// ❌ prioridad → ✅ (usar PrioridadOrden si es necesario)
```

### **FASE 6: PRUEBAS Y VALIDACIÓN** ⚡
**⏱️ Duración**: 2 días
**🎯 Prioridad**: ALTA

#### F6.1: Pruebas de Integración
```typescript
// ✅ CREAR src/app/api/aprovisionamientos/__tests__/integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../aprovisionamientos/route';
import { prisma } from '@/lib/prisma';
import { EstadoAprovisionamiento } from '@prisma/client';

describe('/api/aprovisionamientos/aprovisionamientos', () => {
  let testOrdenCompraId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Crear datos de prueba
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        password: 'hashedpassword'
      }
    });
    testUserId = testUser.id;

    const testProveedor = await prisma.proveedor.create({
      data: {
        nombre: 'Proveedor Test',
        ruc: '12345678901'
      }
    });

    const testOrdenCompra = await prisma.ordenCompra.create({
      data: {
        numero: 'OC-TEST-001',
        proveedorId: testProveedor.id,
        fechaEmision: new Date(),
        fechaEntrega: new Date(),
        estado: 'APROBADA',
        montoTotal: 1000,
        moneda: 'PEN',
        usuarioId: testUserId,
        items: {
          create: [
            {
              descripcion: 'Producto Test',
              cantidad: 1,
              precioUnitario: 1000,
              subtotal: 1000
            }
          ]
        }
      }
    });
    testOrdenCompraId = testOrdenCompra.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.aprovisionamientoFinanciero.deleteMany();
    await prisma.historialAprovisionamiento.deleteMany();
    await prisma.ordenCompraItem.deleteMany();
    await prisma.ordenCompra.deleteMany();
    await prisma.proveedor.deleteMany();
    await prisma.user.deleteMany();
  });

  it('GET - debe listar aprovisionamientos con paginación', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeInstanceOf(Array);
        expect(data.pagination).toBeDefined();
      }
    });
  });

  it('POST - debe crear aprovisionamiento correctamente', async () => {
    const nuevoAprovisionamiento = {
      ordenCompraId: testOrdenCompraId,
      estado: EstadoAprovisionamiento.PENDIENTE,
      montoTotal: 1000,
      montoRecibido: 0,
      montoPagado: 0,
      moneda: 'PEN',
      fechaInicio: new Date().toISOString(),
      observaciones: 'Aprovisionamiento de prueba'
    };

    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nuevoAprovisionamiento)
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.codigo).toMatch(/^APR-\d{4}$/);
        expect(data.data.montoTotal).toBe(1000);
        expect(data.data.estado).toBe(EstadoAprovisionamiento.PENDIENTE);
      }
    });
  });

  it('POST - debe validar datos requeridos', async () => {
    const datosIncompletos = {
      // Falta ordenCompraId
      estado: EstadoAprovisionamiento.PENDIENTE,
      montoTotal: 1000
    };

    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(datosIncompletos)
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Datos de entrada inválidos');
      }
    });
  });
});
```

#### F6.2: Pruebas de Servicios
```typescript
// ✅ CREAR src/lib/services/__tests__/aprovisionamientoFinanciero.test.ts

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  obtenerAprovisionamientosFinancieros,
  crearAprovisionamientoFinanciero,
  obtenerAprovisionamientoFinancieroPorId
} from '../aprovisionamientoFinanciero';
import { EstadoAprovisionamiento } from '@prisma/client';

// Mock fetch
global.fetch = jest.fn();

describe('AprovisionamientoFinanciero Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerAprovisionamientosFinancieros', () => {
    it('debe obtener lista de aprovisionamientos con filtros', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            codigo: 'APR-0001',
            estado: EstadoAprovisionamiento.PENDIENTE,
            montoTotal: 1000
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const filtros = { estado: EstadoAprovisionamiento.PENDIENTE };
      const resultado = await obtenerAprovisionamientosFinancieros(filtros, 1, 10);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/aprovisionamientos/aprovisionamientos'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(resultado.aprovisionamientos).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.aprovisionamientos[0].codigo).toBe('APR-0001');
    });

    it('debe manejar errores de red', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Error interno' })
      } as Response);

      await expect(
        obtenerAprovisionamientosFinancieros()
      ).rejects.toThrow('Error interno');
    });
  });

  describe('crearAprovisionamientoFinanciero', () => {
    it('debe crear aprovisionamiento correctamente', async () => {
      const mockAprovisionamiento = {
        id: '1',
        codigo: 'APR-0001',
        estado: EstadoAprovisionamiento.PENDIENTE,
        montoTotal: 1000,
        ordenCompraId: 'oc-1'
      };

      const mockResponse = {
        success: true,
        data: mockAprovisionamiento
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const datos = {
        codigo: 'APR-0001',
        ordenCompraId: 'oc-1',
        estado: EstadoAprovisionamiento.PENDIENTE,
        montoTotal: 1000,
        montoRecibido: 0,
        montoPagado: 0,
        moneda: 'PEN',
        fechaInicio: new Date(),
        usuarioId: 'user-1'
      };

      const resultado = await crearAprovisionamientoFinanciero(datos);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/aprovisionamientos/aprovisionamientos'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos)
        })
      );

      expect(resultado.codigo).toBe('APR-0001');
      expect(resultado.montoTotal).toBe(1000);
    });
  });
});
```

---

## 📊 CRONOGRAMA DE IMPLEMENTACIÓN

| Fase | Duración | Prioridad | Dependencias |
|------|----------|-----------|-------------|
| **F1: Tipos y Payloads** | 1 día | CRÍTICA | - |
| **F2: Validadores Zod** | 1 día | CRÍTICA | F1 |
| **F3: APIs** | 2 días | ALTA | F1, F2 |
| **F4: Servicios** | 2 días | ALTA | F1, F2, F3 |
| **F5: Componentes** | 3 días | MEDIA | F1, F2, F4 |
| **F6: Pruebas** | 2 días | ALTA | F1-F5 |

**⏱️ Duración Total**: 11 días
**🎯 Fecha Objetivo**: Completar antes del próximo sprint

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-implementación
- [ ] Backup de base de datos actual
- [ ] Backup de archivos de código
- [ ] Crear rama específica para correcciones
- [ ] Configurar entorno de testing

### Durante implementación
- [ ] **F1**: Tipos y payloads actualizados
- [ ] **F2**: Validadores Zod corregidos
- [ ] **F3**: APIs funcionando correctamente
- [ ] **F4**: Servicios renombrados y corregidos
- [ ] **F5**: Componentes actualizados
- [ ] **F6**: Pruebas pasando al 100%

### Post-implementación
- [ ] Todas las APIs responden correctamente
- [ ] Componentes renderizan sin errores
- [ ] Formularios validan correctamente
- [ ] Base de datos mantiene integridad
- [ ] Logs no muestran errores
- [ ] Performance no se ve afectada

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgo Alto: Pérdida de Datos
**🛡️ Mitigación**: 
- Backup completo antes de iniciar
- Implementar en rama separada
- Pruebas exhaustivas en desarrollo

### Riesgo Medio: Tiempo de Inactividad
**🛡️ Mitigación**: 
- Implementar en horarios de baja actividad
- Rollback plan preparado
- Monitoreo continuo durante despliegue

### Riesgo Bajo: Regresiones en Funcionalidad
**🛡️ Mitigación**: 
- Suite de pruebas completa
- Testing manual de flujos críticos
- Validación con usuarios finales

---

## 📈 MÉTRICAS DE ÉXITO

### Técnicas
- ✅ 0 errores de TypeScript
- ✅ 100% de pruebas pasando
- ✅ 0 warnings en consola
- ✅ Tiempo de respuesta < 500ms

### Funcionales
- ✅ Todos los formularios funcionan
- ✅ Filtros y búsquedas operativos
- ✅ CRUD completo sin errores
- ✅ Reportes generan correctamente

### Calidad
- ✅ Código limpio y documentado
- ✅ Patrones consistentes
- ✅ Tipado estricto
- ✅ Validaciones robustas

---

## 🎯 CONCLUSIONES

Este análisis ha identificado **inconsistencias críticas** entre las APIs implementadas y el schema de base de datos en el módulo de Aprovisionamiento Financiero. Las principales causas son:

1. **Evolución desincronizada**: Las APIs se desarrollaron antes que el schema final
2. **Tipos obsoletos**: Referencias a entidades que no existen
3. **Campos faltantes**: Payloads incompletos
4. **Nomenclatura inconsistente**: Nombres de campos diferentes

La implementación de este plan garantizará:
- ✅ **Consistencia total** entre todas las capas
- ✅ **Tipado estricto** y validación robusta
- ✅ **Mantenibilidad** a largo plazo
- ✅ **Performance** optimizada
- ✅ **Experiencia de usuario** mejorada

**🚀 Próximo paso**: Iniciar Fase 1 con corrección de tipos y payloads.

---

**📝 Documento generado**: 2025-01-21  
**👨‍💻 Autor**: Sistema GYS - Análisis Integral V3  
**🔄 Versión**: 3.0 - Plan de Corrección Completo