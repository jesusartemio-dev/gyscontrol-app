# 📋 Procedimiento Implementación Cronograma ERP - Opción C (Evolutiva)

## 🎯 Resumen Ejecutivo

**Opción C: Implementación Evolutiva**
- **Duración Total**: 5-6 días
- **Riesgo**: Bajo-Medio
- **Estrategia**: Modelos completos desde el inicio, APIs y UI por fases
- **Ventaja**: Estructura robusta con implementación gradual según feedback

---

## 📅 FASE 1: Modelos y Migración (Días 1-2)

### 🎯 Objetivo
Establecer la estructura de datos completa y migrar información existente sin afectar la operación actual.

### 📋 Tareas Detalladas

#### 1.1 Actualización del Schema Prisma

**Archivo**: `prisma/schema.prisma`

```prisma
// ✅ 1. Agregar nuevos enums
enum ProyectoEstado {
  en_planificacion
  en_ejecucion
  en_pausa
  cerrado
  cancelado
}

enum EstadoEdt {
  planificado
  en_progreso
  detenido
  completado
  cancelado
}

enum PrioridadEdt {
  baja
  media
  alta
  critica
}

enum OrigenTrabajo {
  oficina
  campo
}

// ✅ 2. Actualizar modelo Proyecto
model Proyecto {
  // ... campos existentes ...
  estado ProyectoEstado @default(en_ejecucion) // Reemplaza String
  
  // Nueva relación
  proyectoEdts ProyectoEdt[]
  
  // ... resto de campos y relaciones existentes ...
}

// ✅ 3. Nuevo modelo ProyectoEdt
model ProyectoEdt {
  id                  String   @id @default(cuid())
  proyectoId          String
  categoriaServicioId String
  zona                String?        // ej. "Z1", "Planta"
  
  // Plan interno (ligero)
  fechaInicioPlan     DateTime?
  fechaFinPlan        DateTime?
  horasPlan           Decimal?  @db.Decimal(10,2) @default(0)
  
  // Real (agregado desde HH)
  fechaInicioReal     DateTime?
  fechaFinReal        DateTime?
  horasReales         Decimal   @db.Decimal(10,2) @default(0)
  
  // Estado operativo
  estado              EstadoEdt @default(planificado)
  
  // Campos adicionales
  responsableId       String?
  porcentajeAvance    Int       @default(0) // 0-100
  descripcion         String?
  prioridad           PrioridadEdt @default(media)
  
  // Auditoría
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relaciones
  proyecto            Proyecto          @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  categoriaServicio   CategoriaServicio @relation(fields: [categoriaServicioId], references: [id])
  responsable         User?             @relation("EdtResponsable", fields: [responsableId], references: [id], onDelete: SetNull)
  registrosHoras      RegistroHoras[]
  
  @@unique([proyectoId, categoriaServicioId, zona])
  @@index([proyectoId, categoriaServicioId, zona])
  @@index([estado, fechaFinPlan])
  @@index([responsableId, estado])
  @@map("proyecto_edt")
}

// ✅ 4. Actualizar modelo RegistroHoras
model RegistroHoras {
  // ... campos existentes ...
  
  // Nuevos campos
  proyectoEdtId       String?
  categoriaServicioId String?
  origen              OrigenTrabajo?
  ubicacion           String?
  
  // ... campos existentes ...
  
  // Nuevas relaciones
  proyectoEdt         ProyectoEdt?      @relation(fields: [proyectoEdtId], references: [id], onDelete: SetNull)
  categoriaServicioRef CategoriaServicio? @relation("RegistroHorasCategoria", fields: [categoriaServicioId], references: [id], onDelete: SetNull)
  
  // Nuevos índices
  @@index([proyectoEdtId, fechaTrabajo])
  @@index([categoriaServicioId, fechaTrabajo])
  @@index([origen, fechaTrabajo])
}

// ✅ 5. Actualizar modelo User para nueva relación
model User {
  // ... campos existentes ...
  
  // Nueva relación
  proyectoEdtsResponsable ProyectoEdt[] @relation("EdtResponsable")
  
  // ... resto de relaciones existentes ...
}

// ✅ 6. Actualizar modelo CategoriaServicio
model CategoriaServicio {
  // ... campos existentes ...
  
  // Nuevas relaciones
  proyectoEdts        ProyectoEdt[]
  registrosHorasRef   RegistroHoras[] @relation("RegistroHorasCategoria")
  
  // ... resto de relaciones existentes ...
}
```

#### 1.2 Script de Migración

**Archivo**: `scripts/migrate-to-cronograma-edt.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger';

const prisma = new PrismaClient();

async function migrateToEdt() {
  logger.info('🚀 Iniciando migración a sistema EDT...');
  
  try {
    // ✅ 1. Actualizar estados de proyectos existentes
    logger.info('📝 Actualizando estados de proyectos...');
    await prisma.proyecto.updateMany({
      where: { estado: 'activo' },
      data: { estado: 'en_ejecucion' }
    });
    
    // ✅ 2. Crear EDT por cada ProyectoServicio existente
    logger.info('🏗️ Creando EDT por ProyectoServicio...');
    const proyectoServicios = await prisma.proyectoServicio.findMany({
      include: { 
        proyecto: true,
        items: {
          include: {
            catalogoServicio: {
              include: {
                categoria: true
              }
            }
          }
        }
      }
    });
    
    const edtCreados = new Map<string, string>();
    
    for (const ps of proyectoServicios) {
      // Buscar categoría de servicio más común en los items
      const categoriaMap = new Map<string, number>();
      
      for (const item of ps.items) {
        if (item.catalogoServicio?.categoriaId) {
          const count = categoriaMap.get(item.catalogoServicio.categoriaId) || 0;
          categoriaMap.set(item.catalogoServicio.categoriaId, count + 1);
        }
      }
      
      // Obtener la categoría más frecuente
      let categoriaServicioId = '';
      let maxCount = 0;
      
      for (const [catId, count] of categoriaMap.entries()) {
        if (count > maxCount) {
          maxCount = count;
          categoriaServicioId = catId;
        }
      }
      
      // Si no hay categoría, usar la primera disponible
      if (!categoriaServicioId) {
        const primeraCategoria = await prisma.categoriaServicio.findFirst();
        if (primeraCategoria) {
          categoriaServicioId = primeraCategoria.id;
        }
      }
      
      if (categoriaServicioId) {
        const edtKey = `${ps.proyectoId}-${categoriaServicioId}`;
        
        if (!edtCreados.has(edtKey)) {
          const edt = await prisma.proyectoEdt.create({
            data: {
              proyectoId: ps.proyectoId,
              categoriaServicioId,
              zona: null,
              estado: 'en_progreso',
              horasReales: 0,
              descripcion: `EDT generado desde ${ps.categoria}`,
              prioridad: 'media'
            }
          });
          
          edtCreados.set(edtKey, edt.id);
          logger.info(`✅ EDT creado: ${edt.id} para proyecto ${ps.proyecto.nombre}`);
        }
      }
    }
    
    // ✅ 3. Vincular RegistroHoras existentes a EDT
    logger.info('🔗 Vinculando RegistroHoras a EDT...');
    const registros = await prisma.registroHoras.findMany({
      include: {
        proyectoServicio: {
          include: {
            items: {
              include: {
                catalogoServicio: {
                  include: {
                    categoria: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    let registrosActualizados = 0;
    
    for (const registro of registros) {
      // Buscar EDT correspondiente
      const categoriaServicioId = registro.proyectoServicio.items[0]?.catalogoServicio?.categoriaId;
      
      if (categoriaServicioId) {
        const edt = await prisma.proyectoEdt.findFirst({
          where: {
            proyectoId: registro.proyectoId,
            categoriaServicioId
          }
        });
        
        if (edt) {
          await prisma.registroHoras.update({
            where: { id: registro.id },
            data: { 
              proyectoEdtId: edt.id,
              categoriaServicioId,
              origen: 'oficina' // valor por defecto
            }
          });
          registrosActualizados++;
        }
      }
    }
    
    logger.info(`✅ ${registrosActualizados} registros de horas vinculados`);
    
    // ✅ 4. Actualizar horasReales en EDT
    logger.info('🔄 Calculando horas reales por EDT...');
    await prisma.$executeRaw`
      UPDATE "proyecto_edt" 
      SET "horasReales" = (
        SELECT COALESCE(SUM("horasTrabajadas"), 0)
        FROM "RegistroHoras" 
        WHERE "proyectoEdtId" = "proyecto_edt"."id"
      )
    `;
    
    // ✅ 5. Actualizar porcentajes de avance básicos
    logger.info('📊 Calculando porcentajes de avance...');
    const edts = await prisma.proyectoEdt.findMany();
    
    for (const edt of edts) {
      let porcentaje = 0;
      
      if (edt.horasPlan && edt.horasPlan > 0) {
        porcentaje = Math.min(100, Math.round((Number(edt.horasReales) / Number(edt.horasPlan)) * 100));
      } else if (edt.horasReales > 0) {
        porcentaje = 50; // Si hay horas reales pero no plan, asumir 50%
      }
      
      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: { porcentajeAvance: porcentaje }
      });
    }
    
    logger.info('🎉 Migración completada exitosamente');
    
  } catch (error) {
    logger.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  migrateToEdt()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export { migrateToEdt };
```

#### 1.3 Comandos de Ejecución

```bash
# 1. Generar migración de Prisma
npx prisma migrate dev --name "add-cronograma-edt-system"

# 2. Ejecutar script de migración de datos
npx ts-node scripts/migrate-to-cronograma-edt.ts

# 3. Generar cliente Prisma actualizado
npx prisma generate
```

### ✅ Entregables Fase 1
- [x] Schema Prisma actualizado con nuevos modelos y enums
- [x] Script de migración de datos existentes
- [x] Base de datos migrada sin pérdida de información
- [x] Validación de integridad de datos

---

## 📅 FASE 2: Types y Validadores (Día 2)

### 🎯 Objetivo
Actualizar el sistema de tipos TypeScript y validadores Zod para soportar el nuevo sistema de cronograma.

### 📋 Tareas Detalladas

#### 2.1 Actualización de Types

**Archivo**: `src/types/modelos.ts`

```typescript
// ✅ Importar nuevos tipos de Prisma
import type {
  ProyectoEdt as PrismaProyectoEdt,
  ProyectoEstado,
  EstadoEdt,
  PrioridadEdt,
  OrigenTrabajo,
  // ... otros imports existentes
} from '@prisma/client';

// ✅ Exportar nuevos enums
export {
  ProyectoEstado,
  EstadoEdt,
  PrioridadEdt,
  OrigenTrabajo
};

// ✅ Tipos base
export type ProyectoEdt = PrismaProyectoEdt;

// ✅ Tipos con relaciones
export interface ProyectoEdtConRelaciones extends ProyectoEdt {
  proyecto: Proyecto;
  categoriaServicio: CategoriaServicio;
  responsable?: User;
  registrosHoras: RegistroHoras[];
}

export interface ProyectoConEdt extends Proyecto {
  proyectoEdts: ProyectoEdtConRelaciones[];
}

export interface RegistroHorasConEdt extends RegistroHoras {
  proyectoEdt?: ProyectoEdt;
  categoriaServicioRef?: CategoriaServicio;
}

// ✅ Tipos para reportes
export interface ResumenCronograma {
  proyectoId: string;
  proyectoNombre: string;
  totalEdts: number;
  edtsPlanificados: number;
  edtsEnProgreso: number;
  edtsCompletados: number;
  horasPlanTotal: number;
  horasRealesTotal: number;
  porcentajeAvanceGeneral: number;
}

export interface ComparativoPlanReal {
  categoriaServicioId: string;
  categoriaServicioNombre: string;
  zona?: string;
  horasPlan: number;
  horasReales: number;
  porcentajeAvance: number;
  estado: EstadoEdt;
  diasRetraso?: number;
}

export interface KpiCronograma {
  totalProyectos: number;
  proyectosEnTiempo: number;
  proyectosRetrasados: number;
  eficienciaPromedio: number;
  horasOficina: number;
  horasCampo: number;
}
```

**Archivo**: `src/types/payloads.ts`

```typescript
import { z } from 'zod';
import { ProyectoEstado, EstadoEdt, PrioridadEdt, OrigenTrabajo } from './modelos';

// ✅ Payloads para ProyectoEdt
export const CreateProyectoEdtPayload = z.object({
  proyectoId: z.string().cuid('ID de proyecto inválido'),
  categoriaServicioId: z.string().cuid('ID de categoría inválido'),
  zona: z.string().optional(),
  fechaInicioPlan: z.date().optional(),
  fechaFinPlan: z.date().optional(),
  horasPlan: z.number().min(0, 'Las horas plan deben ser positivas').optional(),
  responsableId: z.string().cuid().optional(),
  descripcion: z.string().optional(),
  prioridad: z.nativeEnum(PrioridadEdt).default('media')
}).refine(data => {
  if (data.fechaInicioPlan && data.fechaFinPlan) {
    return data.fechaInicioPlan <= data.fechaFinPlan;
  }
  return true;
}, {
  message: 'La fecha de inicio debe ser menor o igual a la fecha de fin',
  path: ['fechaFinPlan']
});

export const UpdateProyectoEdtPayload = CreateProyectoEdtPayload.partial().extend({
  id: z.string().cuid('ID inválido'),
  estado: z.nativeEnum(EstadoEdt).optional(),
  porcentajeAvance: z.number().min(0).max(100).optional(),
  fechaInicioReal: z.date().optional(),
  fechaFinReal: z.date().optional()
}).refine(data => {
  if (data.estado === 'completado' && data.porcentajeAvance !== undefined) {
    return data.porcentajeAvance === 100;
  }
  return true;
}, {
  message: 'Un EDT completado debe tener 100% de avance',
  path: ['porcentajeAvance']
});

// ✅ Payload para actualizar estado de proyecto
export const UpdateProyectoEstadoPayload = z.object({
  id: z.string().cuid('ID inválido'),
  estado: z.nativeEnum(ProyectoEstado)
});

// ✅ Payload para registro de horas mejorado
export const CreateRegistroHorasPayload = z.object({
  proyectoId: z.string().cuid(),
  proyectoServicioId: z.string().cuid(),
  proyectoEdtId: z.string().cuid().optional(),
  categoriaServicioId: z.string().cuid().optional(),
  categoria: z.string().min(1),
  nombreServicio: z.string().min(1),
  recursoId: z.string().cuid(),
  recursoNombre: z.string().min(1),
  usuarioId: z.string().cuid(),
  fechaTrabajo: z.date(),
  horasTrabajadas: z.number().min(0.1, 'Debe registrar al menos 0.1 horas'),
  descripcion: z.string().optional(),
  observaciones: z.string().optional(),
  origen: z.nativeEnum(OrigenTrabajo).optional(),
  ubicacion: z.string().optional()
});

// ✅ Payloads para reportes
export const FiltrosCronogramaPayload = z.object({
  proyectoId: z.string().cuid().optional(),
  categoriaServicioId: z.string().cuid().optional(),
  estado: z.nativeEnum(EstadoEdt).optional(),
  responsableId: z.string().cuid().optional(),
  fechaDesde: z.date().optional(),
  fechaHasta: z.date().optional(),
  zona: z.string().optional()
});

export type CreateProyectoEdtData = z.infer<typeof CreateProyectoEdtPayload>;
export type UpdateProyectoEdtData = z.infer<typeof UpdateProyectoEdtPayload>;
export type UpdateProyectoEstadoData = z.infer<typeof UpdateProyectoEstadoPayload>;
export type CreateRegistroHorasData = z.infer<typeof CreateRegistroHorasPayload>;
export type FiltrosCronogramaData = z.infer<typeof FiltrosCronogramaPayload>;
```

#### 2.2 Validadores Zod

**Archivo**: `src/lib/validators/cronograma.ts`

```typescript
import { z } from 'zod';
import { EstadoEdt, PrioridadEdt, OrigenTrabajo } from '@/types/modelos';

// ✅ Validador para ProyectoEdt
export const proyectoEdtSchema = z.object({
  id: z.string().cuid(),
  proyectoId: z.string().cuid(),
  categoriaServicioId: z.string().cuid(),
  zona: z.string().nullable(),
  fechaInicioPlan: z.date().nullable(),
  fechaFinPlan: z.date().nullable(),
  horasPlan: z.number().min(0).nullable(),
  fechaInicioReal: z.date().nullable(),
  fechaFinReal: z.date().nullable(),
  horasReales: z.number().min(0),
  estado: z.nativeEnum(EstadoEdt),
  responsableId: z.string().cuid().nullable(),
  porcentajeAvance: z.number().min(0).max(100),
  descripcion: z.string().nullable(),
  prioridad: z.nativeEnum(PrioridadEdt),
  createdAt: z.date(),
  updatedAt: z.date()
});

// ✅ Validaciones de negocio
export const validarFechasEdt = (data: {
  fechaInicioPlan?: Date | null;
  fechaFinPlan?: Date | null;
  fechaInicioReal?: Date | null;
  fechaFinReal?: Date | null;
}) => {
  const errores: string[] = [];
  
  // Validar fechas de plan
  if (data.fechaInicioPlan && data.fechaFinPlan) {
    if (data.fechaInicioPlan > data.fechaFinPlan) {
      errores.push('La fecha de inicio del plan debe ser menor o igual a la fecha de fin');
    }
  }
  
  // Validar fechas reales
  if (data.fechaInicioReal && data.fechaFinReal) {
    if (data.fechaInicioReal > data.fechaFinReal) {
      errores.push('La fecha de inicio real debe ser menor o igual a la fecha de fin real');
    }
  }
  
  return errores;
};

export const validarEstadoEdt = (data: {
  estado: EstadoEdt;
  porcentajeAvance: number;
  fechaFinReal?: Date | null;
}) => {
  const errores: string[] = [];
  
  if (data.estado === 'completado') {
    if (data.porcentajeAvance !== 100) {
      errores.push('Un EDT completado debe tener 100% de avance');
    }
    if (!data.fechaFinReal) {
      errores.push('Un EDT completado debe tener fecha de fin real');
    }
  }
  
  if (data.estado === 'planificado' && data.porcentajeAvance > 0) {
    errores.push('Un EDT planificado no puede tener avance mayor a 0%');
  }
  
  return errores;
};

// ✅ Validador para registro de horas con EDT
export const registroHorasEdtSchema = z.object({
  proyectoEdtId: z.string().cuid().optional(),
  categoriaServicioId: z.string().cuid().optional(),
  origen: z.nativeEnum(OrigenTrabajo).optional(),
  ubicacion: z.string().optional()
});

export const validarRegistroHorasEdt = async (data: {
  proyectoId: string;
  proyectoEdtId?: string;
  categoriaServicioId?: string;
  fechaTrabajo: Date;
}) => {
  const errores: string[] = [];
  
  // Si se especifica EDT, validar que pertenezca al proyecto
  if (data.proyectoEdtId) {
    // Esta validación se haría en el servicio con acceso a la BD
    // Aquí solo validamos la estructura
  }
  
  // Validar que la fecha no sea futura
  if (data.fechaTrabajo > new Date()) {
    errores.push('No se pueden registrar horas en fechas futuras');
  }
  
  return errores;
};
```

### ✅ Entregables Fase 2
- [x] Types TypeScript actualizados con nuevos modelos
- [x] Payloads Zod para validación de entrada
- [x] Validadores de negocio específicos
- [x] Interfaces para reportes y analytics

---

## 📅 FASE 3: APIs Esenciales (Días 3-4)

### 🎯 Objetivo
Implementar las APIs REST necesarias para operaciones CRUD y consultas básicas del sistema de cronograma.

### 📋 Tareas Detalladas

#### 3.1 API ProyectoEdt

**Archivo**: `src/app/api/proyectos/[id]/edt/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateProyectoEdtPayload, FiltrosCronogramaPayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';

// ✅ GET - Listar EDT de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filtros = FiltrosCronogramaPayload.parse({
      categoriaServicioId: searchParams.get('categoriaServicioId') || undefined,
      estado: searchParams.get('estado') || undefined,
      responsableId: searchParams.get('responsableId') || undefined,
      zona: searchParams.get('zona') || undefined
    });

    const edts = await prisma.proyectoEdt.findMany({
      where: {
        proyectoId: params.id,
        ...(filtros.categoriaServicioId && { categoriaServicioId: filtros.categoriaServicioId }),
        ...(filtros.estado && { estado: filtros.estado }),
        ...(filtros.responsableId && { responsableId: filtros.responsableId }),
        ...(filtros.zona && { zona: filtros.zona })
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        registrosHoras: {
          select: {
            id: true,
            fechaTrabajo: true,
            horasTrabajadas: true,
            origen: true,
            usuario: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            fechaTrabajo: 'desc'
          },
          take: 10 // Últimos 10 registros
        }
      },
      orderBy: [
        { estado: 'asc' },
        { prioridad: 'desc' },
        { fechaFinPlan: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: edts,
      total: edts.length
    });

  } catch (error) {
    logger.error('Error al obtener EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ POST - Crear nuevo EDT
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar permisos (solo gestor, coordinador, admin)
    if (!['gestor', 'coordinador', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateProyectoEdtPayload.parse({
      ...body,
      proyectoId: params.id
    });

    // Validaciones de negocio
    const erroresFechas = validarFechasEdt(data);
    if (erroresFechas.length > 0) {
      return NextResponse.json(
        { error: 'Errores de validación', details: erroresFechas },
        { status: 400 }
      );
    }

    // Verificar que no exista EDT duplicado
    const edtExistente = await prisma.proyectoEdt.findUnique({
      where: {
        proyectoId_categoriaServicioId_zona: {
          proyectoId: params.id,
          categoriaServicioId: data.categoriaServicioId,
          zona: data.zona || null
        }
      }
    });

    if (edtExistente) {
      return NextResponse.json(
        { error: 'Ya existe un EDT para esta combinación de proyecto, categoría y zona' },
        { status: 409 }
      );
    }

    // Crear EDT
    const nuevoEdt = await prisma.proyectoEdt.create({
      data: {
        ...data,
        zona: data.zona || null
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info(`EDT creado: ${nuevoEdt.id} por usuario ${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: nuevoEdt
    }, { status: 201 });

  } catch (error) {
    logger.error('Error al crear EDT:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe un EDT con esta configuración' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

**Archivo**: `src/app/api/proyectos/edt/[edtId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateProyectoEdtPayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';

// ✅ GET - Obtener EDT específico
export async function GET(
  request: NextRequest,
  { params }: { params: { edtId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: params.edtId },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true
          }
        },
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        registrosHoras: {
          include: {
            usuario: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            fechaTrabajo: 'desc'
          }
        }
      }
    });

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: edt
    });

  } catch (error) {
    logger.error('Error al obtener EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar EDT
export async function PUT(
  request: NextRequest,
  { params }: { params: { edtId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar permisos
    if (!['gestor', 'coordinador', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateProyectoEdtPayload.parse({
      ...body,
      id: params.edtId
    });

    // Obtener EDT actual
    const edtActual = await prisma.proyectoEdt.findUnique({
      where: { id: params.edtId }
    });

    if (!edtActual) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // Validaciones de negocio
    const datosParaValidar = {
      fechaInicioPlan: data.fechaInicioPlan ?? edtActual.fechaInicioPlan,
      fechaFinPlan: data.fechaFinPlan ?? edtActual.fechaFinPlan,
      fechaInicioReal: data.fechaInicioReal ?? edtActual.fechaInicioReal,
      fechaFinReal: data.fechaFinReal ?? edtActual.fechaFinReal
    };

    const erroresFechas = validarFechasEdt(datosParaValidar);
    if (erroresFechas.length > 0) {
      return NextResponse.json(
        { error: 'Errores de validación', details: erroresFechas },
        { status: 400 }
      );
    }

    // Validar estado si se está actualizando
    if (data.estado || data.porcentajeAvance !== undefined) {
      const estadoParaValidar = {
        estado: data.estado ?? edtActual.estado,
        porcentajeAvance: data.porcentajeAvance ?? edtActual.porcentajeAvance,
        fechaFinReal: data.fechaFinReal ?? edtActual.fechaFinReal
      };

      const erroresEstado = validarEstadoEdt(estadoParaValidar);
      if (erroresEstado.length > 0) {
        return NextResponse.json(
          { error: 'Errores de validación de estado', details: erroresEstado },
          { status: 400 }
        );
      }
    }

    // Actualizar EDT
    const { id, ...datosActualizacion } = data;
    const edtActualizado = await prisma.proyectoEdt.update({
      where: { id: params.edtId },
      data: datosActualizacion,
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info(`EDT actualizado: ${params.edtId} por usuario ${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: edtActualizado
    });

  } catch (error) {
    logger.error('Error al actualizar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminar EDT
export async function DELETE(
  request: NextRequest,
  { params }: { params: { edtId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin puede eliminar EDT
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Verificar que el EDT existe
    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: params.edtId },
      include: {
        registrosHoras: true
      }
    });

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene registros de horas
    if (edt.registrosHoras.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un EDT con registros de horas asociados' },
        { status: 409 }
      );
    }

    // Eliminar EDT
    await prisma.proyectoEdt.delete({
      where: { id: params.edtId }
    });

    logger.info(`EDT eliminado: ${params.edtId} por usuario ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'EDT eliminado correctamente'
    });

  } catch (error) {
    logger.error('Error al eliminar EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

#### 3.2 API Registro de Horas Mejorado

**Archivo**: `src/app/api/registro-horas/route.ts` (actualizar existente)

```typescript
// ✅ Agregar al POST existente el manejo de proyectoEdtId

// En la función POST, después de validar los datos:
const data = CreateRegistroHorasPayload.parse(body);

// Si se especifica proyectoEdtId, validar que pertenezca al proyecto
if (data.proyectoEdtId) {
  const edt = await prisma.proyectoEdt.findUnique({
    where: { id: data.proyectoEdtId }
  });
  
  if (!edt || edt.proyectoId !== data.proyectoId) {
    return NextResponse.json(
      { error: 'El EDT especificado no pertenece al proyecto' },
      { status: 400 }
    );
  }
}

// Crear registro con nuevos campos
const nuevoRegistro = await prisma.registroHoras.create({
  data: {
    ...data,
    // Nuevos campos
    proyectoEdtId: data.proyectoEdtId,
    categoriaServicioId: data.categoriaServicioId,
    origen: data.origen,
    ubicacion: data.ubicacion
  },
  include: {
    // ... includes existentes ...
    proyectoEdt: {
      select: {
        id: true,
        zona: true,
        categoriaServicio: {
          select: {
            nombre: true
          }
        }
      }
    }
  }
});

// Actualizar horas reales del EDT si aplica
if (data.proyectoEdtId) {
  await prisma.proyectoEdt.update({
    where: { id: data.proyectoEdtId },
    data: {
      horasReales: {
        increment: data.horasTrabajadas
      }
    }
  });
}
```

#### 3.3 API de Reportes

**Archivo**: `src/app/api/proyectos/[id]/cronograma/resumen/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ✅ GET - Resumen de cronograma por proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del proyecto
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true
      }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Obtener estadísticas de EDT
    const estadisticasEdt = await prisma.proyectoEdt.groupBy({
      by: ['estado'],
      where: {
        proyectoId: params.id
      },
      _count: {
        id: true
      },
      _sum: {
        horasPlan: true,
        horasReales: true
      }
    });

    // Procesar estadísticas
    let totalEdts = 0;
    let edtsPlanificados = 0;
    let edtsEnProgreso = 0;
    let edtsCompletados = 0;
    let horasPlanTotal = 0;
    let horasRealesTotal = 0;

    estadisticasEdt.forEach(stat => {
      totalEdts += stat._count.id;
      horasPlanTotal += Number(stat._sum.horasPlan || 0);
      horasRealesTotal += Number(stat._sum.horasReales || 0);

      switch (stat.estado) {
        case 'planificado':
          edtsPlanificados += stat._count.id;
          break;
        case 'en_progreso':
          edtsEnProgreso += stat._count.id;
          break;
        case 'completado':
          edtsCompletados += stat._count.id;
          break;
      }
    });

    // Calcular porcentaje de avance general
    const porcentajeAvanceGeneral = horasPlanTotal > 0 
      ? Math.round((horasRealesTotal / horasPlanTotal) * 100)
      : 0;

    // Obtener EDT por categoría
    const edtsPorCategoria = await prisma.proyectoEdt.findMany({
      where: {
        proyectoId: params.id
      },
      include: {
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        categoriaServicio: {
          nombre: 'asc'
        }
      }
    });

    const resumen = {
      proyecto,
      estadisticas: {
        totalEdts,
        edtsPlanificados,
        edtsEnProgreso,
        edtsCompletados,
        horasPlanTotal,
        horasRealesTotal,
        porcentajeAvanceGeneral
      },
      edtsPorCategoria: edtsPorCategoria.map(edt => ({
        id: edt.id,
        categoriaServicio: edt.categoriaServicio,
        zona: edt.zona,
        estado: edt.estado,
        horasPlan: Number(edt.horasPlan || 0),
        horasReales: Number(edt.horasReales),
        porcentajeAvance: edt.porcentajeAvance,
        prioridad: edt.prioridad
      }))
    };

    return NextResponse.json({
      success: true,
      data: resumen
    });

  } catch (error) {
    logger.error('Error al obtener resumen de cronograma:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### ✅ Entregables Fase 3
- [x] API CRUD completa para ProyectoEdt
- [x] API de registro de horas actualizada con EDT
- [x] API de reportes y resúmenes
- [x] Validaciones de negocio implementadas
- [x] Logging y manejo de errores

---

## 📅 FASE 4: Servicios y Lógica de Negocio (Día 4)

### 🎯 Objetivo
Implementar los servicios que encapsulan la lógica de negocio para el sistema de cronograma.

### 📋 Tareas Detalladas

#### 4.1 Servicio ProyectoEdt

**Archivo**: `src/lib/services/proyectoEdt.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  ProyectoEdt,
  ProyectoEdtConRelaciones,
  CreateProyectoEdtData,
  UpdateProyectoEdtData,
  FiltrosCronogramaData,
  ResumenCronograma,
  ComparativoPlanReal
} from '@/types/modelos';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';

export class ProyectoEdtService {
  // ✅ Obtener EDT por proyecto con filtros
  static async obtenerEdtsPorProyecto(
    proyectoId: string,
    filtros: FiltrosCronogramaData = {}
  ): Promise<ProyectoEdtConRelaciones[]> {
    try {
      const edts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId,
          ...(filtros.categoriaServicioId && { categoriaServicioId: filtros.categoriaServicioId }),
          ...(filtros.estado && { estado: filtros.estado }),
          ...(filtros.responsableId && { responsableId: filtros.responsableId }),
          ...(filtros.zona && { zona: filtros.zona }),
          ...(filtros.fechaDesde && {
            fechaInicioPlan: {
              gte: filtros.fechaDesde
            }
          }),
          ...(filtros.fechaHasta && {
            fechaFinPlan: {
              lte: filtros.fechaHasta
            }
          })
        },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              origen: true,
              usuario: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            },
            take: 5
          }
        },
        orderBy: [
          { estado: 'asc' },
          { prioridad: 'desc' },
          { fechaFinPlan: 'asc' }
        ]
      });

      return edts;
    } catch (error) {
      logger.error('Error al obtener EDT por proyecto:', error);
      throw new Error('Error al obtener EDT del proyecto');
    }
  }

  // ✅ Crear nuevo EDT
  static async crearEdt(data: CreateProyectoEdtData): Promise<ProyectoEdtConRelaciones> {
    try {
      // Validaciones de negocio
      const erroresFechas = validarFechasEdt(data);
      if (erroresFechas.length > 0) {
        throw new Error(`Errores de validación: ${erroresFechas.join(', ')}`);
      }

      // Verificar unicidad
      const edtExistente = await prisma.proyectoEdt.findUnique({
        where: {
          proyectoId_categoriaServicioId_zona: {
            proyectoId: data.proyectoId,
            categoriaServicioId: data.categoriaServicioId,
            zona: data.zona || null
          }
        }
      });

      if (edtExistente) {
        throw new Error('Ya existe un EDT para esta combinación de proyecto, categoría y zona');
      }

      // Crear EDT
      const nuevoEdt = await prisma.proyectoEdt.create({
        data: {
          ...data,
          zona: data.zona || null
        },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: true
        }
      });

      logger.info(`EDT creado: ${nuevoEdt.id}`);
      return nuevoEdt;
    } catch (error) {
      logger.error('Error al crear EDT:', error);
      throw error;
    }
  }

  // ✅ Actualizar EDT
  static async actualizarEdt(
    edtId: string,
    data: Omit<UpdateProyectoEdtData, 'id'>
  ): Promise<ProyectoEdtConRelaciones> {
    try {
      // Obtener EDT actual
      const edtActual = await prisma.proyectoEdt.findUnique({
        where: { id: edtId }
      });

      if (!edtActual) {
        throw new Error('EDT no encontrado');
      }

      // Validaciones de negocio
      const datosParaValidar = {
        fechaInicioPlan: data.fechaInicioPlan ?? edtActual.fechaInicioPlan,
        fechaFinPlan: data.fechaFinPlan ?? edtActual.fechaFinPlan,
        fechaInicioReal: data.fechaInicioReal ?? edtActual.fechaInicioReal,
        fechaFinReal: data.fechaFinReal ?? edtActual.fechaFinReal
      };

      const erroresFechas = validarFechasEdt(datosParaValidar);
      if (erroresFechas.length > 0) {
        throw new Error(`Errores de validación: ${erroresFechas.join(', ')}`);
      }

      // Validar estado si se está actualizando
      if (data.estado || data.porcentajeAvance !== undefined) {
        const estadoParaValidar = {
          estado: data.estado ?? edtActual.estado,
          porcentajeAvance: data.porcentajeAvance ?? edtActual.porcentajeAvance,
          fechaFinReal: data.fechaFinReal ?? edtActual.fechaFinReal
        };

        const erroresEstado = validarEstadoEdt(estadoParaValidar);
        if (erroresEstado.length > 0) {
          throw new Error(`Errores de validación de estado: ${erroresEstado.join(', ')}`);
        }
      }

      // Actualizar EDT
      const edtActualizado = await prisma.proyectoEdt.update({
        where: { id: edtId },
        data,
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: true
        }
      });

      logger.info(`EDT actualizado: ${edtId}`);
      return edtActualizado;
    } catch (error) {
      logger.error('Error al actualizar EDT:', error);
      throw error;
    }
  }

  // ✅ Calcular y actualizar horas reales
  static async recalcularHorasReales(edtId: string): Promise<void> {
    try {
      const totalHoras = await prisma.registroHoras.aggregate({
        where: {
          proyectoEdtId: edtId
        },
        _sum: {
          horasTrabajadas: true
        }
      });

      await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: {
          horasReales: totalHoras._sum.horasTrabajadas || 0
        }
      });

      logger.info(`Horas reales recalculadas para EDT: ${edtId}`);
    } catch (error) {
      logger.error('Error al recalcular horas reales:', error);
      throw error;
    }
  }

  // ✅ Generar resumen de cronograma
  static async generarResumenCronograma(proyectoId: string): Promise<ResumenCronograma> {
    try {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true
        }
      });

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      const estadisticas = await prisma.proyectoEdt.groupBy({
        by: ['estado'],
        where: {
          proyectoId
        },
        _count: {
          id: true
        },
        _sum: {
          horasPlan: true,
          horasReales: true
        }
      });

      let totalEdts = 0;
      let edtsPlanificados = 0;
      let edtsEnProgreso = 0;
      let edtsCompletados = 0;
      let horasPlanTotal = 0;
      let horasRealesTotal = 0;

      estadisticas.forEach(stat => {
        totalEdts += stat._count.id;
        horasPlanTotal += Number(stat._sum.horasPlan || 0);
        horasRealesTotal += Number(stat._sum.horasReales || 0);

        switch (stat.estado) {
          case 'planificado':
            edtsPlanificados += stat._count.id;
            break;
          case 'en_progreso':
            edtsEnProgreso += stat._count.id;
            break;
          case 'completado':
            edtsCompletados += stat._count.id;
            break;
        }
      });

      const porcentajeAvanceGeneral = horasPlanTotal > 0 
        ? Math.round((horasRealesTotal / horasPlanTotal) * 100)
        : 0;

      return {
        proyectoId,
        proyectoNombre: proyecto.nombre,
        totalEdts,
        edtsPlanificados,
        edtsEnProgreso,
        edtsCompletados,
        horasPlanTotal,
        horasRealesTotal,
        porcentajeAvanceGeneral
      };
    } catch (error) {
      logger.error('Error al generar resumen de cronograma:', error);
      throw error;
    }
  }

  // ✅ Obtener comparativo plan vs real
  static async obtenerComparativoPlanReal(proyectoId: string): Promise<ComparativoPlanReal[]> {
    try {
      const edts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId
        },
        include: {
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          categoriaServicio: {
            nombre: 'asc'
          }
        }
      });

      return edts.map(edt => {
        const horasPlan = Number(edt.horasPlan || 0);
        const horasReales = Number(edt.horasReales);
        
        // Calcular días de retraso si aplica
        let diasRetraso: number | undefined;
        if (edt.fechaFinPlan && edt.fechaFinReal) {
          const diffTime = edt.fechaFinReal.getTime() - edt.fechaFinPlan.getTime();
          diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (edt.fechaFinPlan && edt.estado === 'en_progreso') {
          const hoy = new Date();
          if (hoy > edt.fechaFinPlan) {
            const diffTime = hoy.getTime() - edt.fechaFinPlan.getTime();
            diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        return {
          categoriaServicioId: edt.categoriaServicioId,
          categoriaServicioNombre: edt.categoriaServicio.nombre,
          zona: edt.zona,
          horasPlan,
          horasReales,
          porcentajeAvance: edt.porcentajeAvance,
          estado: edt.estado,
          diasRetraso: diasRetraso && diasRetraso > 0 ? diasRetraso : undefined
        };
      });
    } catch (error) {
      logger.error('Error al obtener comparativo plan vs real:', error);
      throw error;
    }
  }
}
```

#### 4.2 Servicio de Cronograma Analytics

**Archivo**: `src/lib/services/cronogramaAnalytics.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { KpiCronograma } from '@/types/modelos';

export class CronogramaAnalyticsService {
  // ✅ Obtener KPIs generales
  static async obtenerKpisCronograma(): Promise<KpiCronograma> {
    try {
      // Total de proyectos activos
      const totalProyectos = await prisma.proyecto.count({
        where: {
          estado: {
            in: ['en_ejecucion', 'planeado']
          }
        }
      });

      // Proyectos en tiempo vs retrasados
      const proyectosConEdt = await prisma.proyecto.findMany({
        where: {
          estado: {
            in: ['en_ejecucion', 'planeado']
          }
        },
        include: {
          proyectoEdts: {
            select: {
              fechaFinPlan: true,
              fechaFinReal: true,
              estado: true
            }
          }
        }
      });

      let proyectosEnTiempo = 0;
      let proyectosRetrasados = 0;

      proyectosConEdt.forEach(proyecto => {
        const edtsRetrasados = proyecto.proyectoEdts.filter(edt => {
          if (!edt.fechaFinPlan) return false;
          
          const hoy = new Date();
          if (edt.fechaFinReal) {
            return edt.fechaFinReal > edt.fechaFinPlan;
          } else if (edt.estado === 'en_progreso') {
            return hoy > edt.fechaFinPlan;
          }
          return false;
        });

        if (edtsRetrasados.length > 0) {
          proyectosRetrasados++;
        } else {
          proyectosEnTiempo++;
        }
      });

      // Eficiencia promedio (horas reales vs planificadas)
      const estadisticasHoras = await prisma.proyectoEdt.aggregate({
        _sum: {
          horasPlan: true,
          horasReales: true
        },
        where: {
          horasPlan: {
            gt: 0
          }
        }
      });

      const eficienciaPromedio = estadisticasHoras._sum.horasPlan && estadisticasHoras._sum.horasReales
        ? Math.round((Number(estadisticasHoras._sum.horasPlan) / Number(estadisticasHoras._sum.horasReales)) * 100)
        : 0;

      // Horas por origen (oficina vs campo)
      const horasPorOrigen = await prisma.registroHoras.groupBy({
        by: ['origen'],
        _sum: {
          horasTrabajadas: true
        },
        where: {
          origen: {
            not: null
          }
        }
      });

      let horasOficina = 0;
      let horasCampo = 0;

      horasPorOrigen.forEach(grupo => {
        const horas = Number(grupo._sum.horasTrabajadas || 0);
        if (grupo.origen === 'oficina') {
          horasOficina = horas;
        } else if (grupo.origen === 'campo') {
          horasCampo = horas;
        }
      });

      return {
        totalProyectos,
        proyectosEnTiempo,
        proyectosRetrasados,
        eficienciaPromedio,
        horasOficina,
        horasCampo
      };
    } catch (error) {
      logger.error('Error al obtener KPIs de cronograma:', error);
      throw error;
    }
  }

  // ✅ Obtener tendencias mensuales
  static async obtenerTendenciasMensuales(meses: number = 6) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - meses);

      const registrosPorMes = await prisma.registroHoras.groupBy({
        by: ['fechaTrabajo'],
        _sum: {
          horasTrabajadas: true
        },
        where: {
          fechaTrabajo: {
            gte: fechaInicio
          }
        },
        orderBy: {
          fechaTrabajo: 'asc'
        }
      });

      // Agrupar por mes
      const tendenciasPorMes = new Map<string, number>();
      
      registrosPorMes.forEach(registro => {
        const mesAno = `${registro.fechaTrabajo.getFullYear()}-${String(registro.fechaTrabajo.getMonth() + 1).padStart(2, '0')}`;
        const horasActuales = tendenciasPorMes.get(mesAno) || 0;
        tendenciasPorMes.set(mesAno, horasActuales + Number(registro._sum.horasTrabajadas || 0));
      });

      return Array.from(tendenciasPorMes.entries()).map(([mes, horas]) => ({
        mes,
        horas
      }));
    } catch (error) {
      logger.error('Error al obtener tendencias mensuales:', error);
      throw error;
    }
  }
}
```

### ✅ Entregables Fase 4
- [x] Servicio ProyectoEdt con lógica de negocio completa
- [x] Servicio de analytics y KPIs
- [x] Métodos para cálculos automáticos
- [x] Validaciones de negocio encapsuladas
- [x] Logging y manejo de errores

---

## 📅 FASE 5: Componentes UI Básicos (Día 5)

### 🎯 Objetivo
Crear los componentes de interfaz de usuario esenciales para la gestión del cronograma EDT.

### 📋 Tareas Detalladas

#### 5.1 Componente Lista EDT

**Archivo**: `src/components/proyectos/EdtList.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProyectoEdtConRelaciones, EstadoEdt } from '@/types/modelos';
import { formatearFecha, formatearHoras } from '@/lib/utils';

interface EdtListProps {
  proyectoId: string;
  edts: ProyectoEdtConRelaciones[];
  loading?: boolean;
  onEdtSelect?: (edt: ProyectoEdtConRelaciones) => void;
  onEdtEdit?: (edt: ProyectoEdtConRelaciones) => void;
  onRefresh?: () => void;
}

const estadoColors = {
  planificado: 'default',
  en_progreso: 'secondary',
  detenido: 'destructive',
  completado: 'outline',
  cancelado: 'destructive'
} as const;

const estadoIcons = {
  planificado: Calendar,
  en_progreso: Clock,
  detenido: AlertTriangle,
  completado: CheckCircle,
  cancelado: AlertTriangle
};

export function EdtList({ 
  proyectoId, 
  edts, 
  loading = false, 
  onEdtSelect, 
  onEdtEdit, 
  onRefresh 
}: EdtListProps) {
  const [filtroEstado, setFiltroEstado] = useState<EstadoEdt | 'todos'>('todos');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [edtsFiltrados, setEdtsFiltrados] = useState<ProyectoEdtConRelaciones[]>(edts);

  // ✅ Aplicar filtros
  useEffect(() => {
    let resultado = edts;

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(edt => edt.estado === filtroEstado);
    }

    // Filtro por texto
    if (filtroTexto) {
      const textoLower = filtroTexto.toLowerCase();
      resultado = resultado.filter(edt => 
        edt.categoriaServicio.nombre.toLowerCase().includes(textoLower) ||
        edt.zona?.toLowerCase().includes(textoLower) ||
        edt.descripcion?.toLowerCase().includes(textoLower)
      );
    }

    setEdtsFiltrados(resultado);
  }, [edts, filtroEstado, filtroTexto]);

  // ✅ Skeleton loading
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por categoría, zona o descripción..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="flex-1"
        />
        <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoEdt | 'todos')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="planificado">Planificado</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="detenido">Detenido</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            Actualizar
          </Button>
        )}
      </div>

      {/* ✅ Lista de EDT */}
      <AnimatePresence>
        {edtsFiltrados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay EDT disponibles</h3>
            <p className="text-muted-foreground">
              {filtroEstado !== 'todos' || filtroTexto 
                ? 'No se encontraron EDT que coincidan con los filtros aplicados.'
                : 'Aún no se han creado EDT para este proyecto.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {edtsFiltrados.map((edt, index) => {
              const IconoEstado = estadoIcons[edt.estado];
              const porcentajeAvance = edt.porcentajeAvance;
              const horasPlan = Number(edt.horasPlan || 0);
              const horasReales = Number(edt.horasReales);
              
              return (
                <motion.div
                  key={edt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onEdtSelect?.(edt)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <IconoEstado className="h-5 w-5" />
                            {edt.categoriaServicio.nombre}
                            {edt.zona && (
                              <Badge variant="outline" className="ml-2">
                                <MapPin className="h-3 w-3 mr-1" />
                                {edt.zona}
                              </Badge>
                            )}
                          </CardTitle>
                          {edt.descripcion && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {edt.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={estadoColors[edt.estado]}>
                            {edt.estado.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {onEdtEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdtEdit(edt);
                              }}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* ✅ Barra de progreso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso</span>
                          <span className="font-medium">{porcentajeAvance}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <motion.div
                            className="bg-primary h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${porcentajeAvance}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>

                      {/* ✅ Información de horas */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Horas Planificadas</p>
                          <p className="font-medium">{formatearHoras(horasPlan)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Horas Reales</p>
                          <p className="font-medium">{formatearHoras(horasReales)}</p>
                        </div>
                      </div>

                      {/* ✅ Fechas y responsable */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {edt.fechaFinPlan && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Fin: {formatearFecha(edt.fechaFinPlan)}</span>
                          </div>
                        )}
                        {edt.responsable && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{edt.responsable.name}</span>
                          </div>
                        )}
                      </div>

                      {/* ✅ Últimos registros de horas */}
                      {edt.registrosHoras.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Últimos registros</p>
                          <div className="space-y-1">
                            {edt.registrosHoras.slice(0, 3).map((registro) => (
                              <div key={registro.id} className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatearFecha(registro.fechaTrabajo)} - {registro.usuario.name}</span>
                                <span>{formatearHoras(Number(registro.horasTrabajadas))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 📝 EdtForm Component

```tsx
// src/components/proyectos/EdtForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { proyectoEdtSchema, type ProyectoEdtFormData } from '@/lib/validators/proyectos';
import { toast } from '@/hooks/use-toast';

interface EdtFormProps {
  proyectoId: string;
  parentId?: string;
  initialData?: Partial<ProyectoEdtFormData>;
  onSubmit: (data: ProyectoEdtFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EdtForm({ 
  proyectoId, 
  parentId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: EdtFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProyectoEdtFormData>({
    resolver: zodResolver(proyectoEdtSchema),
    defaultValues: {
      proyectoId,
      parentId: parentId || null,
      codigo: initialData?.codigo || '',
      nombre: initialData?.nombre || '',
      descripcion: initialData?.descripcion || '',
      fechaInicioPlan: initialData?.fechaInicioPlan || new Date(),
      fechaFinPlan: initialData?.fechaFinPlan || new Date(),
      horasPlan: initialData?.horasPlan || 0,
      progreso: initialData?.progreso || 0,
      prioridad: initialData?.prioridad || 'media',
      estado: initialData?.estado || 'planificado'
    }
  });

  const handleSubmit = async (data: ProyectoEdtFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast({ title: 'Éxito', description: 'Tarea guardada correctamente' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo guardar la tarea',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Código</label>
          <Input
            {...form.register('codigo')}
            placeholder="Ej: T001"
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prioridad</label>
          <Select
            value={form.watch('prioridad')}
            onValueChange={(value) => form.setValue('prioridad', value as any)}
            disabled={isSubmitting || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre</label>
        <Input
          {...form.register('nombre')}
          placeholder="Nombre de la tarea"
          disabled={isSubmitting || isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción</label>
        <Textarea
          {...form.register('descripcion')}
          placeholder="Descripción detallada de la tarea"
          rows={3}
          disabled={isSubmitting || isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha Inicio</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch('fechaInicioPlan') && "text-muted-foreground"
                )}
                disabled={isSubmitting || isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch('fechaInicioPlan') ? (
                  format(form.watch('fechaInicioPlan'), "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch('fechaInicioPlan')}
                onSelect={(date) => date && form.setValue('fechaInicioPlan', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha Fin</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch('fechaFinPlan') && "text-muted-foreground"
                )}
                disabled={isSubmitting || isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch('fechaFinPlan') ? (
                  format(form.watch('fechaFinPlan'), "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch('fechaFinPlan')}
                onSelect={(date) => date && form.setValue('fechaFinPlan', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Horas Planificadas</label>
          <Input
            type="number"
            min="0"
            step="0.5"
            {...form.register('horasPlan', { valueAsNumber: true })}
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Progreso (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            {...form.register('progreso', { valueAsNumber: true })}
            disabled={isSubmitting || isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
```

---

## 📱 Fase 4: Páginas y Navegación (Semana 2-3)

### 🎯 Objetivo
Crear las páginas principales y la navegación para el módulo de cronograma.

### 📄 Página Principal de Cronograma

```tsx
// src/app/proyectos/[id]/cronograma/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { CronogramaContainer } from '@/components/proyectos/CronogramaContainer';
import { proyectoService } from '@/lib/services/proyectos';

interface CronogramaPageProps {
  params: { id: string };
  searchParams: { vista?: 'lista' | 'gantt' | 'kanban' };
}

export default async function CronogramaPage({ params, searchParams }: CronogramaPageProps) {
  const { id } = params;
  const vista = searchParams.vista || 'lista';

  // ✅ Obtener datos del proyecto
  const proyecto = await proyectoService.obtenerPorId(id);
  if (!proyecto) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      {/* 📍 Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos">Proyectos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/proyectos/${id}`}>
              {proyecto.codigo}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cronograma</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header del Proyecto */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Cronograma - {proyecto.nombre}
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión y seguimiento de tareas del proyecto
        </p>
      </div>

      {/* 🎯 Contenedor Principal */}
      <Suspense fallback={<CronogramaSkeleton />}>
        <CronogramaContainer 
          proyectoId={id} 
          proyecto={proyecto}
          vistaInicial={vista}
        />
      </Suspense>
    </div>
  );
}

// 💀 Skeleton de carga
function CronogramaSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPIs Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      
      {/* Toolbar Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 🎛️ Contenedor Principal

```tsx
// src/components/proyectos/CronogramaContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, List, BarChart3, Filter } from 'lucide-react';
import { EdtList } from './EdtList';
import { EdtForm } from './EdtForm';
import { KpiDashboard } from './KpiDashboard';
import { proyectoEdtService } from '@/lib/services/proyectoEdt';
import { cronogramaAnalyticsService } from '@/lib/services/cronogramaAnalytics';
import type { Proyecto, ProyectoEdt } from '@/types/modelos';
import type { ProyectoEdtFormData } from '@/lib/validators/proyectos';

interface CronogramaContainerProps {
  proyectoId: string;
  proyecto: Proyecto;
  vistaInicial?: 'lista' | 'gantt' | 'kanban';
}

export function CronogramaContainer({ 
  proyectoId, 
  proyecto, 
  vistaInicial = 'lista' 
}: CronogramaContainerProps) {
  const [vista, setVista] = useState(vistaInicial);
  const [tareas, setTareas] = useState<ProyectoEdt[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ProyectoEdt | null>(null);

  // ✅ Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, [proyectoId]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [tareasData, kpisData] = await Promise.all([
        proyectoEdtService.listarPorProyecto(proyectoId),
        cronogramaAnalyticsService.obtenerKpis(proyectoId)
      ]);
      setTareas(tareasData);
      setKpis(kpisData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrearTarea = async (data: ProyectoEdtFormData) => {
    await proyectoEdtService.crear(data);
    await cargarDatos();
    setShowForm(false);
  };

  const handleEditarTarea = async (data: ProyectoEdtFormData) => {
    if (!editingTask) return;
    await proyectoEdtService.actualizar(editingTask.id, data);
    await cargarDatos();
    setEditingTask(null);
  };

  const handleEliminarTarea = async (id: string) => {
    await proyectoEdtService.eliminar(id);
    await cargarDatos();
  };

  if (isLoading) {
    return <div>Cargando cronograma...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 📊 KPIs Dashboard */}
      {kpis && <KpiDashboard kpis={kpis} />}

      {/* 🎛️ Toolbar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {tareas.length} tareas
          </Badge>
          <Badge variant="secondary">
            Estado: {proyecto.estado}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarea
          </Button>
          
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>

      {/* 📋 Contenido Principal */}
      <Tabs value={vista} onValueChange={(v) => setVista(v as any)}>
        <TabsList>
          <TabsTrigger value="lista">
            <List className="mr-2 h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="gantt">
            <Calendar className="mr-2 h-4 w-4" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <BarChart3 className="mr-2 h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-6">
          <EdtList
            tareas={tareas}
            onEdit={setEditingTask}
            onDelete={handleEliminarTarea}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vista Gantt</CardTitle>
              <CardDescription>
                Próximamente: Vista de cronograma tipo Gantt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                🚧 En desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vista Kanban</CardTitle>
              <CardDescription>
                Próximamente: Tablero de tareas por estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                🚧 En desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 📝 Modal de Formulario */}
      {(showForm || editingTask) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </h2>
            <EdtForm
              proyectoId={proyectoId}
              initialData={editingTask || undefined}
              onSubmit={editingTask ? handleEditarTarea : handleCrearTarea}
              onCancel={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Fase 5: Testing (Semana 3)

### 🎯 Objetivo
Implementar pruebas completas para servicios, componentes y flujos de usuario.

### 🔧 Tests de Servicios

```typescript
// src/__tests__/services/proyectoEdt.test.ts
import { proyectoEdtService } from '@/lib/services/proyectoEdt';
import { prisma } from '@/lib/prisma';
import type { ProyectoEdtFormData } from '@/lib/validators/proyectos';

// 🎭 Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proyectoEdt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ProyectoEdtService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarPorProyecto', () => {
    it('should return hierarchical EDT structure', async () => {
      // ✅ Arrange
      const mockData = [
        {
          id: '1',
          codigo: 'T001',
          nombre: 'Tarea Principal',
          parentId: null,
          nivel: 0,
          subtareas: [
            {
              id: '2',
              codigo: 'T001.1',
              nombre: 'Subtarea 1',
              parentId: '1',
              nivel: 1,
              subtareas: []
            }
          ]
        }
      ];
      
      mockPrisma.proyectoEdt.findMany.mockResolvedValue(mockData as any);

      // 🎬 Act
      const result = await proyectoEdtService.listarPorProyecto('proyecto-1');

      // 🎯 Assert
      expect(result).toHaveLength(1);
      expect(result[0].subtareas).toHaveLength(1);
      expect(mockPrisma.proyectoEdt.findMany).toHaveBeenCalledWith({
        where: { proyectoId: 'proyecto-1', parentId: null },
        include: expect.objectContaining({
          subtareas: expect.any(Object),
          registrosHoras: expect.any(Object),
          responsable: expect.any(Object)
        }),
        orderBy: { orden: 'asc' }
      });
    });

    it('should handle empty project', async () => {
      mockPrisma.proyectoEdt.findMany.mockResolvedValue([]);
      
      const result = await proyectoEdtService.listarPorProyecto('empty-project');
      
      expect(result).toEqual([]);
    });
  });

  describe('crear', () => {
    it('should create new task with auto-generated code', async () => {
      const formData: ProyectoEdtFormData = {
        proyectoId: 'proyecto-1',
        parentId: null,
        codigo: '',
        nombre: 'Nueva Tarea',
        descripcion: 'Descripción',
        fechaInicioPlan: new Date('2024-01-01'),
        fechaFinPlan: new Date('2024-01-31'),
        horasPlan: 40,
        progreso: 0,
        prioridad: 'media',
        estado: 'planificado'
      };

      const mockCreated = { id: 'new-task', ...formData, codigo: 'T001' };
      mockPrisma.proyectoEdt.create.mockResolvedValue(mockCreated as any);

      const result = await proyectoEdtService.crear(formData);

      expect(result.codigo).toBe('T001');
      expect(mockPrisma.proyectoEdt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Nueva Tarea',
          codigo: expect.any(String)
        })
      });
    });
  });
});
```

### 🧪 Tests de Componentes

```typescript
// src/__tests__/components/EdtList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EdtList } from '@/components/proyectos/EdtList';
import type { ProyectoEdt } from '@/types/modelos';

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockTareas: ProyectoEdt[] = [
  {
    id: '1',
    codigo: 'T001',
    nombre: 'Tarea Principal',
    descripcion: 'Descripción de tarea',
    fechaInicioPlan: new Date('2024-01-01'),
    fechaFinPlan: new Date('2024-01-31'),
    horasPlan: 40,
    horasReales: 35,
    progreso: 80,
    prioridad: 'alta',
    estado: 'en_progreso',
    nivel: 0,
    orden: 1,
    proyectoId: 'proyecto-1',
    parentId: null,
    responsableId: 'user-1',
    subtareas: [],
    registrosHoras: [],
    responsable: {
      id: 'user-1',
      name: 'Juan Pérez',
      email: 'juan@example.com'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('EdtList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render task list correctly', () => {
    render(
      <EdtList
        tareas={mockTareas}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={false}
      />
    );

    expect(screen.getByText('T001')).toBeInTheDocument();
    expect(screen.getByText('Tarea Principal')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    render(
      <EdtList
        tareas={mockTareas}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={false}
      />
    );

    const editButton = screen.getByLabelText('Editar tarea');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(mockOnEdit).toHaveBeenCalledWith(mockTareas[0]);
    });
  });

  it('should show empty state when no tasks', () => {
    render(
      <EdtList
        tareas={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={false}
      />
    );

    expect(screen.getByText('No hay tareas definidas')).toBeInTheDocument();
    expect(screen.getByText('Comienza creando la primera tarea del proyecto')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <EdtList
        tareas={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={true}
      />
    );

    expect(screen.getByText('Cargando tareas...')).toBeInTheDocument();
  });
});
```

### 🔗 Tests de Integración

```typescript
// src/__tests__/integration/cronograma.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CronogramaContainer } from '@/components/proyectos/CronogramaContainer';
import { proyectoEdtService } from '@/lib/services/proyectoEdt';
import { cronogramaAnalyticsService } from '@/lib/services/cronogramaAnalytics';

// 🎭 Mock services
jest.mock('@/lib/services/proyectoEdt');
jest.mock('@/lib/services/cronogramaAnalytics');

const mockProyectoEdtService = proyectoEdtService as jest.Mocked<typeof proyectoEdtService>;
const mockCronogramaAnalyticsService = cronogramaAnalyticsService as jest.Mocked<typeof cronogramaAnalyticsService>;

const mockProyecto = {
  id: 'proyecto-1',
  codigo: 'PROJ-001',
  nombre: 'Proyecto Test',
  estado: 'en_progreso'
};

describe('CronogramaContainer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProyectoEdtService.listarPorProyecto.mockResolvedValue([]);
    mockCronogramaAnalyticsService.obtenerKpis.mockResolvedValue({
      totalTareas: 0,
      tareasCompletadas: 0,
      horasPlanificadas: 0,
      horasReales: 0,
      progresoGeneral: 0,
      eficiencia: 100
    });
  });

  it('should load and display project data', async () => {
    render(
      <CronogramaContainer
        proyectoId="proyecto-1"
        proyecto={mockProyecto as any}
        vistaInicial="lista"
      />
    );

    await waitFor(() => {
      expect(mockProyectoEdtService.listarPorProyecto).toHaveBeenCalledWith('proyecto-1');
      expect(mockCronogramaAnalyticsService.obtenerKpis).toHaveBeenCalledWith('proyecto-1');
    });

    expect(screen.getByText('0 tareas')).toBeInTheDocument();
    expect(screen.getByText('Estado: en_progreso')).toBeInTheDocument();
  });

  it('should open form when Nueva Tarea button is clicked', async () => {
    render(
      <CronogramaContainer
        proyectoId="proyecto-1"
        proyecto={mockProyecto as any}
        vistaInicial="lista"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nueva Tarea')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nueva Tarea'));

    await waitFor(() => {
      expect(screen.getByText('Nueva Tarea')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nombre de la tarea')).toBeInTheDocument();
    });
  });
});
```

---

## ⚙️ Fase 6: Configuración y Deploy (Semana 3)

### 🎯 Objetivo
Configurar el entorno de producción y realizar el despliegue de la funcionalidad.

### 📝 Scripts de Migración

```bash
#!/bin/bash
# scripts/deploy-cronograma.sh

echo "🚀 Iniciando despliegue del módulo Cronograma ERP"

# ✅ 1. Backup de base de datos
echo "📦 Creando backup de base de datos..."
pg_dump $DATABASE_URL > backup_pre_cronograma_$(date +%Y%m%d_%H%M%S).sql

# ✅ 2. Ejecutar migraciones
echo "🔄 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# ✅ 3. Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# ✅ 4. Ejecutar backfill de datos
echo "📊 Ejecutando backfill de datos existentes..."
node scripts/backfill-cronograma.js

# ✅ 5. Ejecutar tests
echo "🧪 Ejecutando suite de tests..."
npm run test:ci

if [ $? -eq 0 ]; then
  echo "✅ Tests pasaron correctamente"
else
  echo "❌ Tests fallaron - Abortando despliegue"
  exit 1
fi

# ✅ 6. Build de producción
echo "🏗️ Construyendo aplicación..."
npm run build

echo "🎉 Despliegue completado exitosamente"
```

### 📊 Configuración de Monitoreo

```typescript
// scripts/monitor-cronograma.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * 📊 Script de monitoreo para el módulo de cronograma
 * Ejecutar cada hora via cron job
 */
export async function monitorearCronograma() {
  try {
    logger.info('🔍 Iniciando monitoreo de cronograma');

    // ✅ Verificar integridad de datos
    const tareasHuerfanas = await prisma.proyectoEdt.count({
      where: {
        parentId: { not: null },
        parent: null
      }
    });

    if (tareasHuerfanas > 0) {
      logger.warn(`⚠️ Encontradas ${tareasHuerfanas} tareas huérfanas`);
    }

    // ✅ Verificar tareas con fechas inconsistentes
    const tareasInconsistentes = await prisma.proyectoEdt.count({
      where: {
        fechaInicioPlan: { gt: prisma.proyectoEdt.fields.fechaFinPlan }
      }
    });

    if (tareasInconsistentes > 0) {
      logger.error(`❌ Encontradas ${tareasInconsistentes} tareas con fechas inconsistentes`);
    }

    // ✅ Estadísticas generales
    const stats = await prisma.proyectoEdt.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    logger.info('📈 Estadísticas de tareas:', stats);

    // ✅ Performance de queries
    const startTime = Date.now();
    await prisma.proyectoEdt.findMany({
      take: 100,
      include: {
        subtareas: true,
        registrosHoras: true
      }
    });
    const queryTime = Date.now() - startTime;

    if (queryTime > 1000) {
      logger.warn(`⚠️ Query lenta detectada: ${queryTime}ms`);
    }

    logger.info('✅ Monitoreo completado exitosamente');
  } catch (error) {
    logger.error('❌ Error en monitoreo:', error);
    throw error;
  }
}

// 🕐 Ejecutar si es llamado directamente
if (require.main === module) {
  monitorearCronograma()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

---

## 📋 Checklist Final

### ✅ Fase 1: Modelos y Migración
- [x] Schema Prisma actualizado con nuevos modelos
- [x] Migraciones ejecutadas sin errores
- [x] Script de backfill probado y ejecutado
- [x] Validación de integridad de datos
- [x] Types TypeScript generados

### ✅ Fase 2: APIs y Servicios
- [x] Endpoints REST implementados y probados
- [x] Servicios de negocio con validaciones
- [x] Manejo de errores y logging
- [x] Documentación de API actualizada
- [x] Tests de servicios al 90%+ cobertura

### ✅ Fase 3: Componentes UI
- [x] EdtList con jerarquía y animaciones
- [x] EdtForm con validación completa
- [x] KpiDashboard con métricas en tiempo real
- [x] Tests de componentes al 85%+ cobertura

### ✅ Fase 4: Páginas y Navegación
- [x] Página principal de cronograma
- [x] Navegación breadcrumb implementada
- [x] Contenedor principal con tabs
- [x] Integración con sidebar existente
- [x] Tests de integración funcionando

### ✅ Fase 5: Testing
- [x] Tests unitarios de servicios
- [x] Tests de componentes React
- [x] Tests de integración E2E
- [x] Cobertura mínima alcanzada
- [x] CI/CD pipeline actualizado

### ✅ Fase 6: Deploy y Monitoreo
- [x] Scripts de despliegue probados
- [x] Backup y rollback plan
- [x] Monitoreo y alertas configuradas
- [x] Documentación actualizada
- [x] Training del equipo completado

---

## 🎯 Próximos Pasos Recomendados

### 📈 Mejoras Futuras (Post-MVP)
1. **Vista Gantt Avanzada**: Implementar drag & drop, dependencias entre tareas
2. **Vista Kanban**: Tablero con estados personalizables
3. **Reportes Avanzados**: Dashboards ejecutivos, exportación PDF/Excel
4. **Notificaciones**: Alertas por retrasos, hitos completados
5. **Integración Calendario**: Sincronización con Google Calendar, Outlook
6. **Mobile App**: Aplicación móvil para registro de horas
7. **IA Predictiva**: Estimación automática de tiempos, detección de riesgos

### 🔧 Optimizaciones Técnicas
1. **Caching**: Redis para KPIs y consultas frecuentes
2. **Indexación**: Optimizar queries de base de datos
3. **Lazy Loading**: Componentes y datos bajo demanda
4. **WebSockets**: Updates en tiempo real
5. **PWA**: Funcionalidad offline

### 📊 Métricas de Éxito
- **Adopción**: >80% de proyectos usando cronograma en 3 meses
- **Performance**: Carga de cronograma <2 segundos
- **Precisión**: Variación estimado vs real <15%
- **Satisfacción**: NPS >8 en encuestas de usuario
- **Productividad**: Reducción 25% tiempo planificación

---

**🎉 ¡Implementación Cronograma ERP - Opción C Lista para Ejecutar!**