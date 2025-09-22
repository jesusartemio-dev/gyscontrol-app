# 🚀 Plan de Implementación Completo: Sistema de Cronograma de 4 Niveles

## 📋 Resumen Ejecutivo

Este documento detalla el plan completo para implementar el sistema de cronograma jerárquico de 4 niveles **Proyecto → Fases → EDTs → Tareas** que se mantiene consistente a través de todo el ciclo de vida: **CRM → Cotización → Planificación → Ejecución**.

### 🎯 Objetivos
- ✅ Implementar jerarquía de 4 niveles consistente en todo el sistema
- ✅ Completar conversión automática cotización → proyecto con fases
- ✅ Crear vista de comparación de 3 cronogramas paralelos
- ✅ Integrar flujo completo desde CRM hasta ejecución del proyecto
- ✅ Mantener consistencia entre estimaciones comerciales y ejecución real

### 📊 Estado Actual vs. Objetivo

| Componente | Estado Actual | Estado Objetivo |
|------------|---------------|-----------------|
| Cronograma Comercial | ✅ Completo | ✅ Completo |
| Conversión Cotización → Proyecto | ❌ Incompleto (solo EDTs) | ✅ Completo (4 niveles) |
| Cronograma de Proyecto | ❌ No existe | ✅ Completo con fases |
| Cronograma de Ejecución | ❌ No existe | ✅ Con datos reales |
| Vista de 3 Cronogramas | ❌ Básico (2 cronogramas) | ✅ Completo (3 paralelos) |
| Integración CRM | ❌ Limitada | ✅ Completo |

---

## 🗓️ Cronograma de Implementación (8 semanas)

### **Semana 1-2: Base de Datos y APIs (Días 1-10)**
**Objetivo**: Establecer la base de datos completa para proyectos con jerarquía de 4 niveles.

#### **Día 1-2: Modelos de Datos**
- [ ] **Crear modelo ProyectoTarea** (similar a CotizacionTarea)
- [ ] **Actualizar ProyectoEdt** para relacionarse con ProyectoTarea
- [ ] **Crear índices y constraints** para optimización
- [ ] **Actualizar tipos TypeScript** en `/types`

#### **Día 3-5: APIs CRUD para Fases de Proyecto**
- [ ] **Crear `/api/proyectos/[id]/fases`** (GET, POST)
- [ ] **Crear `/api/proyectos/[id]/fases/[faseId]`** (GET, PUT, DELETE)
- [ ] **Implementar validaciones** de fechas y jerarquía
- [ ] **Crear servicios** de lógica de negocio

#### **Día 6-7: APIs para Tareas de Proyecto**
- [ ] **Crear `/api/proyectos/[id]/tareas`** (GET, POST)
- [ ] **Crear `/api/proyectos/[id]/tareas/[tareaId]`** (PUT, DELETE)
- [ ] **Implementar dependencias** entre tareas
- [ ] **Crear asignaciones** de recursos

#### **Día 8-10: Conversión Completa Cotización → Proyecto**
- [ ] **Actualizar `/api/proyecto/from-cotizacion`**
- [ ] **Implementar conversión CotizacionFase → ProyectoFase**
- [ ] **Implementar conversión CotizacionTarea → ProyectoTarea**
- [ ] **Crear lógica de distribución automática** de EDTs en fases

### **Semana 3-4: UI de Proyecto - Sistema Jerárquico (Días 11-20)**
**Objetivo**: Crear la interfaz completa de gestión de cronograma en proyectos.

#### **Día 11-12: Estructura Base**
- [ ] **Crear directorio** `src/components/proyectos/fases/`
- [ ] **Crear ProyectoFasesView** principal
- [ ] **Actualizar página de proyecto** agregar tab "Cronograma"
- [ ] **Implementar navegación por tabs** (Fases, EDTs, Gantt, Comparación)

#### **Día 13-14: Gestión de Fases**
- [ ] **Crear FasesList** con métricas y CRUD completo
- [ ] **Crear FaseFormModal** para crear/editar fases
- [ ] **Implementar drag & drop** entre fases
- [ ] **Crear validaciones** de contención de fechas

#### **Día 15-16: Gestión de EDTs por Fase**
- [ ] **Crear EdtsPorFase** con organización jerárquica
- [ ] **Implementar asignación** de EDTs a fases
- [ ] **Crear filtros** por fase y estado
- [ ] **Implementar bulk operations**

#### **Día 17-18: Gantt Jerárquico de Proyecto**
- [ ] **Crear GanttPorFases** con 4 niveles
- [ ] **Implementar navegación** entre vistas
- [ ] **Crear GanttMini** para comparación
- [ ] **Implementar zoom y pan** avanzado

#### **Día 19-20: Gestión de Tareas**
- [ ] **Crear ProyectoTareaList** con dependencias
- [ ] **Crear ProyectoTareaForm** con validaciones
- [ ] **Implementar drag & drop** de tareas
- [ ] **Crear asignaciones** de recursos

### **Semana 5-6: Vista de 3 Cronogramas Paralelos (Días 21-30)**
**Objetivo**: Implementar comparación completa de los 3 cronogramas.

#### **Día 21-22: Arquitectura de Comparación**
- [ ] **Crear CronogramaTripleView** componente principal
- [ ] **Implementar layout** de 3 paneles paralelos
- [ ] **Crear navegación sincronizada** entre vistas
- [ ] **Implementar filtros** comunes

#### **Día 23-24: Cronograma Comercial (Datos Históricos)**
- [ ] **Crear lógica** para obtener datos de cotización
- [ ] **Implementar conversión** a formato comparable
- [ ] **Crear indicadores visuales** (azul para comercial)
- [ ] **Implementar tooltips** con información histórica

#### **Día 25-26: Cronograma de Planificación**
- [ ] **Crear lógica** para datos de proyecto planificado
- [ ] **Implementar comparación** con comercial
- [ ] **Crear métricas de desviación** planificada
- [ ] **Implementar indicadores** (verde para planificación)

#### **Día 27-28: Cronograma de Ejecución Real**
- [ ] **Crear lógica** para datos reales desde registros de horas
- [ ] **Implementar agregación** por EDT y fase
- [ ] **Crear métricas de eficiencia** real
- [ ] **Implementar indicadores** (naranja/rojo para real)

#### **Día 29-30: Dashboard Ejecutivo**
- [ ] **Crear métricas globales** de los 3 cronogramas
- [ ] **Implementar alertas** de desviaciones críticas
- [ ] **Crear reportes** de eficiencia por fase
- [ ] **Implementar exportación** de comparaciones

### **Semana 7: Integración CRM y Testing (Días 31-35)**
**Objetivo**: Completar integración y validar funcionamiento.

#### **Día 31-32: Integración CRM**
- [ ] **Agregar botón "Crear Proyecto"** en página CRM
- [ ] **Implementar modal** de creación directa desde oportunidad
- [ ] **Crear flujo** CRM → Proyecto (saltando cotización)
- [ ] **Implementar validaciones** de permisos

#### **Día 33-34: Testing End-to-End**
- [ ] **Crear tests** para conversión completa
- [ ] **Validar jerarquía** de 4 niveles en proyectos
- [ ] **Testing de comparación** de 3 cronogramas
- [ ] **Validar navegación** entre vistas

#### **Día 35: Optimización y Documentación**
- [ ] **Optimizar performance** de queries complejas
- [ ] **Crear documentación** de usuario
- [ ] **Implementar training** para usuarios
- [ ] **Preparar deployment**

### **Semana 8: Rollout y Monitoreo (Días 36-40)**
**Objetivo**: Implementar en producción y monitorear.

#### **Día 36-37: Migración de Datos**
- [ ] **Crear script** de migración para proyectos existentes
- [ ] **Implementar conversión** de datos legacy
- [ ] **Validar integridad** de datos migrados
- [ ] **Crear backup** completo

#### **Día 38-39: Training y Comunicación**
- [ ] **Crear material** de capacitación
- [ ] **Realizar sesiones** de training por rol
- [ ] **Crear guía rápida** de uso
- [ ] **Implementar soporte** técnico

#### **Día 40: Monitoreo Post-Implementación**
- [ ] **Configurar monitoreo** de uso y performance
- [ ] **Crear dashboard** de métricas de adopción
- [ ] **Implementar feedback** de usuarios
- [ ] **Planear mejoras** basadas en uso real

---

## 🏗️ Arquitectura Técnica Detallada

### **Modelo de Datos Final**

```prisma
// ✅ Ya existe
model ProyectoFase {
  id                String   @id @default(cuid())
  proyectoId        String
  nombre            String   // "Planificación", "Ejecución", "Cierre"
  descripcion       String?
  orden             Int      @default(0)
  fechaInicioPlan   DateTime?
  fechaFinPlan      DateTime?
  fechaInicioReal   DateTime?
  fechaFinReal      DateTime?
  estado            EstadoFase @default(planificado)
  porcentajeAvance  Int       @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  proyecto          Proyecto      @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  edts              ProyectoEdt[]

  @@unique([proyectoId, nombre])
  @@index([proyectoId, orden])
  @@map("proyecto_fase")
}

// ✅ Ya existe (actualizar)
model ProyectoEdt {
  id                  String   @id @default(cuid())
  proyectoId          String
  nombre              String   // Nombre descriptivo
  categoriaServicioId String
  zona                String?

  // ✅ Nueva relación con fase
  proyectoFaseId      String?
  proyectoFase        ProyectoFase? @relation(fields: [proyectoFaseId], references: [id], onDelete: SetNull)

  // ✅ NUEVO: Relación con tareas reales
  tareas              ProyectoTarea[]

  // Plan interno
  fechaInicioPlan     DateTime?
  fechaFinPlan        DateTime?
  horasPlan           Decimal?  @db.Decimal(10,2) @default(0)

  // Real (agregado desde HH)
  fechaInicioReal     DateTime?
  fechaFinReal        DateTime?
  horasReales         Decimal   @db.Decimal(10,2) @default(0)

  estado              EstadoEdt @default(planificado)
  responsableId       String?
  porcentajeAvance    Int       @default(0)
  descripcion         String?
  prioridad           PrioridadEdt @default(media)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

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

// ✅ NUEVO: Modelo para tareas de cronograma de proyecto (4 niveles)
model ProyectoTarea {
  id                String   @id @default(cuid())
  proyectoEdtId     String

  // Información básica
  nombre            String
  descripcion       String?

  // Fechas planificadas
  fechaInicio       DateTime
  fechaFin          DateTime

  // Fechas reales
  fechaInicioReal   DateTime?
  fechaFinReal      DateTime?

  // Horas (estimadas vs reales desde RegistroHoras)
  horasEstimadas    Decimal? @db.Decimal(10,2)
  horasReales       Decimal  @db.Decimal(10,2) @default(0) // Calculado automáticamente

  // Estado y prioridad
  estado            EstadoTarea @default(pendiente)
  prioridad         PrioridadTarea @default(media)
  porcentajeCompletado Int @default(0)

  // Dependencias
  dependenciaId     String?

  // Asignaciones
  responsableId     String?
  responsable       User? @relation("ProyectoTareaResponsable", fields: [responsableId], references: [id], onDelete: SetNull)

  // ✅ NUEVO: Registros de horas asociados
  registrosHoras    RegistroHoras[]

  // Funcionalidades avanzadas
  subtareas         ProyectoSubtarea[]
  dependenciasOrigen ProyectoDependenciaTarea[] @relation("ProyectoTareaOrigen")
  dependenciasDependiente ProyectoDependenciaTarea[] @relation("ProyectoTareaDependiente")

  // Auditoría
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relaciones
  proyectoEdt       ProyectoEdt @relation(fields: [proyectoEdtId], references: [id], onDelete: Cascade)
  dependencia       ProyectoTarea? @relation("ProyectoTareaDependencia", fields: [dependenciaId], references: [id], onDelete: SetNull)
  tareasDependientes ProyectoTarea[] @relation("ProyectoTareaDependencia")

  @@index([proyectoEdtId, estado])
  @@index([responsableId, fechaFin])
  @@index([dependenciaId])
  @@map("proyecto_tarea")
}

// ✅ NUEVO: Modelo para subtareas de ProyectoTarea
model ProyectoSubtarea {
  id                String   @id @default(cuid())
  nombre            String
  descripcion       String?
  fechaInicio       DateTime
  fechaFin          DateTime
  fechaInicioReal   DateTime?
  fechaFinReal      DateTime?
  estado            EstadoTarea @default(pendiente)
  porcentajeCompletado Int @default(0)
  horasEstimadas    Decimal? @db.Decimal(10,2)
  horasReales       Decimal? @db.Decimal(10,2) @default(0)

  // Relación con tarea padre
  proyectoTareaId   String
  proyectoTarea     ProyectoTarea @relation(fields: [proyectoTareaId], references: [id], onDelete: Cascade)

  // Asignado
  asignadoId        String?
  asignado          User? @relation("ProyectoSubtareaAsignado", fields: [asignadoId], references: [id], onDelete: SetNull)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("proyecto_subtarea")
}

// ✅ NUEVO: Modelo para dependencias entre ProyectoTarea
model ProyectoDependenciaTarea {
  id                String   @id @default(cuid())
  tipo              TipoDependencia @default(finish_to_start)

  // Tarea origen (predecesora)
  tareaOrigenId     String
  tareaOrigen       ProyectoTarea @relation("ProyectoTareaOrigen", fields: [tareaOrigenId], references: [id], onDelete: Cascade)

  // Tarea dependiente (sucesora)
  tareaDependienteId String
  tareaDependiente  ProyectoTarea @relation("ProyectoTareaDependiente", fields: [tareaDependienteId], references: [id], onDelete: Cascade)

  createdAt         DateTime @default(now())

  @@unique([tareaOrigenId, tareaDependienteId])
  @@map("proyecto_dependencias_tarea")
}

// ✅ ACTUALIZAR: Modelo RegistroHoras con relación a ProyectoTarea
model RegistroHoras {
  id                 String           @id @default(cuid())
  proyectoId         String
  proyectoServicioId String
  categoria          String
  nombreServicio     String
  recursoId          String
  recursoNombre      String
  usuarioId          String
  fechaTrabajo       DateTime
  horasTrabajadas    Float
  descripcion        String?
  observaciones      String?
  aprobado           Boolean          @default(false)

  // Campos existentes
  proyectoEdtId       String?
  categoriaServicioId String?
  origen              OrigenTrabajo?
  ubicacion           String?

  // ✅ NUEVO: Relación con ProyectoTarea
  proyectoTareaId    String?
  proyectoTarea      ProyectoTarea? @relation(fields: [proyectoTareaId], references: [id], onDelete: SetNull)

  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  proyecto           Proyecto         @relation(fields: [proyectoId], references: [id])
  proyectoServicio   ProyectoServicio @relation(fields: [proyectoServicioId], references: [id])
  recurso            Recurso          @relation(fields: [recursoId], references: [id])
  usuario            User             @relation(fields: [usuarioId], references: [id])

  // Nuevas relaciones
  proyectoEdt         ProyectoEdt?      @relation(fields: [proyectoEdtId], references: [id], onDelete: SetNull)
  categoriaServicioRef CategoriaServicio? @relation("RegistroHorasCategoria", fields: [categoriaServicioId], references: [id], onDelete: SetNull)

  // Nuevos índices
  @@index([proyectoTareaId, fechaTrabajo])
  @@index([proyectoEdtId, proyectoTareaId, fechaTrabajo])
}
```

### **APIs a Implementar**

#### **1. Gestión de Fases de Proyecto**
```typescript
// GET /api/proyectos/[id]/fases
export async function GET(request, { params }) {
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoId: params.id },
    include: {
      edts: {
        include: {
          categoriaServicio: true,
          responsable: true,
          tareas: {
            include: {
              asignado: true,
              dependencia: true
            }
          },
          registrosHoras: { take: 5, orderBy: { fechaTrabajo: 'desc' } }
        }
      }
    },
    orderBy: { orden: 'asc' }
  })

  return NextResponse.json({
    success: true,
    data: fases,
    meta: {
      totalFases: fases.length,
      totalEdts: fases.reduce((sum, f) => sum + f.edts.length, 0),
      totalTareas: fases.reduce((sum, f) => sum + f.edts.reduce((sumEdt, edt) => sumEdt + edt.tareas.length, 0), 0)
    }
  })
}

// POST /api/proyectos/[id]/fases
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const data = await request.json()

  // Validar contención en fechas del proyecto
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: params.id },
    select: { fechaInicio: true, fechaFin: true }
  })

  if (data.fechaInicio < proyecto.fechaInicio || data.fechaFin > proyecto.fechaFin) {
    return NextResponse.json(
      { error: 'Las fechas de la fase deben estar dentro del proyecto' },
      { status: 400 }
    )
  }

  const nuevaFase = await prisma.proyectoFase.create({
    data: {
      proyectoId: params.id,
      nombre: data.nombre,
      descripcion: data.descripcion,
      orden: data.orden || 0,
      fechaInicioPlan: new Date(data.fechaInicio),
      fechaFinPlan: new Date(data.fechaFin)
    }
  })

  return NextResponse.json({
    success: true,
    data: nuevaFase,
    message: 'Fase creada exitosamente'
  }, { status: 201 })
}
```

#### **2. Gestión de Tareas de Proyecto**
```typescript
// GET /api/proyectos/[id]/tareas
export async function GET(request, { params }) {
  const tareas = await prisma.proyectoTarea.findMany({
    where: {
      proyectoEdt: {
        proyectoId: params.id
      }
    },
    include: {
      proyectoEdt: {
        include: {
          proyectoFase: true,
          categoriaServicio: true
        }
      },
      responsable: true,
      dependencia: true,
      tareasDependientes: true,
      registrosHoras: {
        take: 5,
        orderBy: { fechaTrabajo: 'desc' },
        select: {
          horasTrabajadas: true,
          fechaTrabajo: true,
          aprobado: true
        }
      }
    },
    orderBy: [
      { proyectoEdt: { proyectoFase: { orden: 'asc' } } },
      { fechaInicio: 'asc' }
    ]
  })

  return NextResponse.json({
    success: true,
    data: tareas
  })
}

// POST /api/proyectos/[id]/tareas
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const data = await request.json()

  // Validar que el EDT existe y pertenece al proyecto
  const edt = await prisma.proyectoEdt.findFirst({
    where: {
      id: data.proyectoEdtId,
      proyectoId: params.id
    }
  })

  if (!edt) {
    return NextResponse.json(
      { error: 'EDT no encontrado o no pertenece al proyecto' },
      { status: 404 }
    )
  }

  const nuevaTarea = await prisma.proyectoTarea.create({
    data: {
      proyectoEdtId: data.proyectoEdtId,
      nombre: data.nombre,
      descripcion: data.descripcion,
      fechaInicio: new Date(data.fechaInicio),
      fechaFin: new Date(data.fechaFin),
      horasEstimadas: data.horasEstimadas,
      responsableId: data.responsableId,
      prioridad: data.prioridad || 'media'
    },
    include: {
      proyectoEdt: {
        include: {
          proyectoFase: true
        }
      },
      responsable: true
    }
  })

  return NextResponse.json({
    success: true,
    data: nuevaTarea,
    message: 'Tarea creada exitosamente'
  }, { status: 201 })
}
```

#### **3. Gestión de Registro de Horas por ProyectoTarea**
```typescript
// POST /api/registro-horas/proyecto-tarea
export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const data = await request.json()

  // Validar que la tarea existe y el usuario tiene acceso
  const tarea = await prisma.proyectoTarea.findFirst({
    where: {
      id: data.proyectoTareaId,
      proyectoEdt: {
        proyecto: {
          OR: [
            { comercialId: session.user.id },
            { gestorId: session.user.id }
          ]
        }
      }
    },
    include: {
      proyectoEdt: {
        include: {
          proyecto: true
        }
      }
    }
  })

  if (!tarea) {
    return NextResponse.json(
      { error: 'Tarea no encontrada o sin permisos' },
      { status: 404 }
    )
  }

  const registro = await prisma.registroHoras.create({
    data: {
      proyectoId: tarea.proyectoEdt.proyectoId,
      proyectoServicioId: data.proyectoServicioId, // Mantener compatibilidad
      proyectoEdtId: tarea.proyectoEdtId,
      proyectoTareaId: data.proyectoTareaId,
      categoria: data.categoria,
      nombreServicio: data.nombreServicio,
      recursoId: data.recursoId,
      recursoNombre: data.recursoNombre,
      usuarioId: session.user.id,
      fechaTrabajo: new Date(data.fechaTrabajo),
      horasTrabajadas: data.horasTrabajadas,
      descripcion: data.descripcion,
      origen: 'oficina'
    }
  })

  // Actualizar horas reales en la tarea
  await actualizarHorasRealesProyectoTarea(data.proyectoTareaId)

  return NextResponse.json({
    success: true,
    data: registro,
    message: 'Horas registradas exitosamente'
  }, { status: 201 })
}

// Función auxiliar para actualizar horas reales
async function actualizarHorasRealesProyectoTarea(proyectoTareaId: string) {
  const horasReales = await prisma.registroHoras.aggregate({
    where: {
      proyectoTareaId,
      aprobado: true
    },
    _sum: { horasTrabajadas: true }
  })

  await prisma.proyectoTarea.update({
    where: { id: proyectoTareaId },
    data: {
      horasReales: horasReales._sum.horasTrabajadas || 0
    }
  })
}
```

### **Componentes a Crear**

#### **1. ProyectoFasesView (Vista Principal)**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FasesList } from './FasesList'
import { EdtsPorFase } from './EdtsPorFase'
import { GanttPorFases } from './GanttPorFases'
import { CronogramaTripleView } from './CronogramaTripleView'

interface ProyectoFasesViewProps {
  proyectoId: string
}

type VistaActiva = 'fases' | 'edts' | 'gantt' | 'comparacion'

export function ProyectoFasesView({ proyectoId }: ProyectoFasesViewProps) {
  const [fases, setFases] = useState([])
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('fases')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFases()
  }, [proyectoId])

  const loadFases = async () => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases`)
      const result = await response.json()
      setFases(result.data || [])
    } catch (error) {
      console.error('Error loading fases:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando cronograma del proyecto...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cronograma del Proyecto</h1>
          <p className="text-muted-foreground">
            Gestión jerárquica: Proyecto → Fases → EDTs → Tareas
          </p>
        </div>

        <Tabs value={vistaActiva} onValueChange={(value) => setVistaActiva(value as VistaActiva)}>
          <TabsList>
            <TabsTrigger value="fases">📋 Fases</TabsTrigger>
            <TabsTrigger value="edts">🔧 EDTs</TabsTrigger>
            <TabsTrigger value="gantt">📊 Gantt</TabsTrigger>
            <TabsTrigger value="comparacion">📈 3 Cronogramas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contenido según vista */}
      <TabsContent value="fases" className="mt-6">
        <FasesList fases={fases} onRefresh={loadFases} proyectoId={proyectoId} />
      </TabsContent>

      <TabsContent value="edts" className="mt-6">
        <EdtsPorFase fases={fases} onRefresh={loadFases} proyectoId={proyectoId} />
      </TabsContent>

      <TabsContent value="gantt" className="mt-6">
        <GanttPorFases fases={fases} proyectoId={proyectoId} />
      </TabsContent>

      <TabsContent value="comparacion" className="mt-6">
        <CronogramaTripleView proyectoId={proyectoId} />
      </TabsContent>
    </div>
  )
}
```

#### **2. ProyectoTareaList (Gestión de Tareas por EDT)**
```typescript
interface ProyectoTareaListProps {
  proyectoEdtId: string
  onRefresh: () => void
}

export function ProyectoTareaList({ proyectoEdtId, onRefresh }: ProyectoTareaListProps) {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTareas()
  }, [proyectoEdtId])

  const loadTareas = async () => {
    try {
      const response = await fetch(`/api/proyecto-edt/${proyectoEdtId}/tareas`)
      const result = await response.json()
      setTareas(result.data || [])
    } catch (error) {
      console.error('Error loading tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTarea = async (tareaData) => {
    try {
      const response = await fetch(`/api/proyecto-edt/${proyectoEdtId}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tareaData, proyectoEdtId })
      })

      if (response.ok) {
        loadTareas()
        onRefresh()
      }
    } catch (error) {
      console.error('Error creating tarea:', error)
    }
  }

  if (loading) return <div>Cargando tareas...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tareas del EDT</h3>
        <Button onClick={() => {/* Abrir modal de creación */}}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      <div className="space-y-2">
        {tareas.map((tarea) => (
          <Card key={tarea.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{tarea.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>📅 {formatDate(tarea.fechaInicio)} - {formatDate(tarea.fechaFin)}</span>
                    <span>⏱️ {tarea.horasEstimadas}h estimadas</span>
                    <span>✅ {tarea.horasReales}h reales</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getEstadoVariant(tarea.estado)}>
                    {tarea.estado}
                  </Badge>
                  <Badge variant="outline">
                    {tarea.prioridad}
                  </Badge>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progreso</span>
                  <span>{tarea.porcentajeCompletado}%</span>
                </div>
                <Progress value={tarea.porcentajeCompletado} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

#### **3. CronogramaTripleView (Comparación de 3 Cronogramas)**
```typescript
interface CronogramaTripleViewProps {
  proyectoId: string
}

export function CronogramaTripleView({ proyectoId }: CronogramaTripleViewProps) {
  const [datosComparacion, setDatosComparacion] = useState(null)

  useEffect(() => {
    loadComparacion()
  }, [proyectoId])

  const loadComparacion = async () => {
    const response = await fetch(`/api/proyectos/${proyectoId}/comparacion-cronogramas`)
    const data = await response.json()
    setDatosComparacion(data)
  }

  if (!datosComparacion) return <div>Cargando comparación...</div>

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Cronograma Comercial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">📊 Cronograma Comercial</CardTitle>
          <p className="text-sm text-muted-foreground">Estimaciones de venta (±30%)</p>
        </CardHeader>
        <CardContent>
          <GanttMini
            data={datosComparacion.comercial}
            color="blue"
            showMetrics={true}
            tipo="comercial"
          />
        </CardContent>
      </Card>

      {/* Cronograma Planificado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">📋 Cronograma Planificado</CardTitle>
          <p className="text-sm text-muted-foreground">Plan de ejecución (±15%)</p>
        </CardHeader>
        <CardContent>
          <GanttMini
            data={datosComparacion.planificado}
            color="green"
            showMetrics={true}
            tipo="planificado"
          />
        </CardContent>
      </Card>

      {/* Cronograma Real */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-600">⚡ Cronograma Real</CardTitle>
          <p className="text-sm text-muted-foreground">Ejecución actual (±5%)</p>
        </CardHeader>
        <CardContent>
          <GanttMini
            data={datosComparacion.real}
            color="orange"
            showMetrics={true}
            tipo="real"
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🔄 Lógica de Conversión Completa

### **Servicio de Conversión Mejorado**

```typescript
// src/lib/services/cronogramaConversion.ts
export class CronogramaConversionService {
  static async convertirCotizacionAProyectoCompleto(cotizacionId: string, proyectoId: string) {
    // 1. Obtener datos completos de la cotización
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        fases: {
          include: {
            edts: {
              include: {
                categoriaServicio: true,
                tareas: true,
                responsable: true
              }
            }
          }
        }
      }
    })

    // 2. Crear fases de proyecto desde fases comerciales
    const fasesProyecto = await this.crearFasesProyectoDesdeComercial(cotizacion.fases, proyectoId)

    // 3. Convertir EDTs asignándolos a fases
    for (const faseComercial of cotizacion.fases) {
      const faseProyecto = fasesProyecto.find(f => f.nombre === faseComercial.nombre)

      for (const edtComercial of faseComercial.edts) {
        // Crear EDT de proyecto
        const edtProyecto = await prisma.proyectoEdt.create({
          data: {
            proyectoId,
            proyectoFaseId: faseProyecto.id,
            nombre: edtComercial.nombre,
            categoriaServicioId: edtComercial.categoriaServicioId,
            zona: edtComercial.zona,
            fechaInicioPlan: edtComercial.fechaInicioComercial,
            fechaFinPlan: edtComercial.fechaFinComercial,
            horasPlan: edtComercial.horasEstimadas,
            responsableId: edtComercial.responsableId,
            descripcion: edtComercial.descripcion,
            prioridad: edtComercial.prioridad
          }
        })

        // Convertir tareas comerciales a tareas reales de proyecto
        for (const tareaComercial of edtComercial.tareas) {
          await prisma.proyectoTarea.create({
            data: {
              proyectoEdtId: edtProyecto.id,
              nombre: tareaComercial.nombre,
              descripcion: tareaComercial.descripcion,
              fechaInicio: tareaComercial.fechaInicio,
              fechaFin: tareaComercial.fechaFin,
              horasEstimadas: tareaComercial.horasEstimadas,
              responsableId: tareaComercial.responsableId,
              estado: 'pendiente',
              prioridad: tareaComercial.prioridad,
              porcentajeCompletado: 0
            }
          })
        }
      }
    }

    return { fases: fasesProyecto, conversionCompleta: true }
  }

  private static async crearFasesProyectoDesdeComercial(fasesComerciales: any[], proyectoId: string) {
    const fasesProyecto = []

    for (const faseComercial of fasesComerciales) {
      const faseProyecto = await prisma.proyectoFase.create({
        data: {
          proyectoId,
          nombre: faseComercial.nombre,
          descripcion: faseComercial.descripcion,
          orden: faseComercial.orden,
          fechaInicioPlan: faseComercial.fechaInicioPlan,
          fechaFinPlan: faseComercial.fechaFinPlan,
          estado: 'planificado'
        }
      })
      fasesProyecto.push(faseProyecto)
    }

    return fasesProyecto
  }
}
```

---

## ✅ Criterios de Éxito

### **Funcionalidad**
- [ ] Jerarquía de 4 niveles completa en proyectos
- [ ] Conversión automática cotización → proyecto con fases
- [ ] Vista de comparación de 3 cronogramas paralelos
- [ ] Navegación fluida entre vistas Gantt
- [ ] APIs CRUD completas para fases y tareas
- [ ] Integración completa con CRM

### **Performance**
- [ ] Carga de cronograma < 2 segundos
- [ ] Navegación Gantt fluida con 100+ tareas
- [ ] Comparación de 3 cronogramas < 3 segundos
- [ ] Memoria eficiente en grandes proyectos

### **UX/UI**
- [ ] Interfaz intuitiva con navegación por tabs
- [ ] Tooltips informativos en todas las vistas
- [ ] Colores consistentes por tipo de cronograma
- [ ] Responsive design en todas las vistas

### **Datos**
- [ ] Integridad referencial completa
- [ ] Validaciones de jerarquía de fechas
- [ ] Backup automático antes de conversiones
- [ ] Auditoría completa de cambios

---

## 🚨 Riesgos y Mitigaciones

### **Riesgo 1: Complejidad de Conversión**
**Impacto**: Alto - Puede corromper datos existentes
**Mitigación**:
- Tests unitarios exhaustivos
- Backup automático antes de conversión
- Rollback automático en caso de error
- Validación de integridad post-conversión

### **Riesgo 2: Performance con Grandes Proyectos**
**Impacto**: Medio - UX degradada
**Mitigación**:
- Lazy loading de componentes
- Virtualización de listas grandes
- Optimización de queries con índices
- Caching inteligente de datos

### **Riesgo 3: Curva de Aprendizaje**
**Impacto**: Medio - Baja adopción inicial
**Mitigación**:
- Training sessions obligatorias
- Documentación detallada con ejemplos
- Tooltips contextuales
- Soporte técnico dedicado

### **Riesgo 4: Migración de Datos Legacy**
**Impacto**: Alto - Pérdida de datos históricos
**Mitigación**:
- Script de migración con validaciones
- Backup completo de base de datos
- Testing en ambiente de staging
- Plan de rollback detallado

---

## 📞 Equipo y Responsabilidades

### **Equipo de Desarrollo**
- **Tech Lead**: [Nombre] - Arquitectura y supervisión
- **Backend Developer**: [Nombre] - APIs y base de datos
- **Frontend Developer**: [Nombre] - UI/UX de cronogramas
- **QA Engineer**: [Nombre] - Testing y validación

### **Equipo de Negocio**
- **Product Owner**: [Nombre] - Requisitos y prioridades
- **Project Manager**: [Nombre] - Coordinación y cronograma
- **Business Analyst**: [Nombre] - Validación funcional

### **Equipo de Soporte**
- **DevOps**: [Nombre] - Deployment y monitoreo
- **DBA**: [Nombre] - Optimización de base de datos
- **Soporte Técnico**: [Nombre] - Training y soporte usuario

---

## 📊 KPIs de Éxito

### **Métricas Técnicas**
- **Performance**: < 2s carga inicial, < 500ms navegación
- **Disponibilidad**: 99.9% uptime
- **Error Rate**: < 0.1% en operaciones críticas
- **Data Integrity**: 100% consistencia referencial

### **Métricas de Negocio**
- **Adopción**: 80% de proyectos usando cronograma de 4 niveles
- **Eficiencia**: 30% reducción en tiempo de planificación
- **Precisión**: ±10% desviación entre plan y real
- **Satisfacción**: > 4.5/5 en encuestas de usuario

### **Métricas de Calidad**
- **Coverage**: 90%+ código cubierto por tests
- **Defects**: < 5 bugs críticos en producción
- **Maintainability**: Código siguiendo estándares
- **Documentation**: 100% APIs documentadas

---

## 🎯 Próximos Pasos

1. **Revisión del Plan**: Validar alcance y timeline con stakeholders
2. **Kickoff Meeting**: Alinear equipo y responsabilidades
3. **Setup de Ambiente**: Preparar entornos de desarrollo y testing
4. **Inicio Fase 1**: Comenzar con modelos de datos y APIs

---

**Fecha de Creación**: 22 de septiembre de 2025
**Última Actualización**: 22 de septiembre de 2025
**Versión**: 1.1
**Estado**: Actualizado con arquitectura ProyectoTarea
**Duración Total**: 8 semanas
**Esfuerzo Estimado**: 320 horas/día

**Cambios en v1.1**:
- ✅ Arquitectura completa con `ProyectoTarea` para registro de horas
- ✅ Modelo `ProyectoTarea` con funcionalidades avanzadas (subtareas, dependencias)
- ✅ Modelo `ProyectoSubtarea` y `ProyectoDependenciaTarea`
- ✅ Actualización `RegistroHoras` con relación a `ProyectoTarea`
- ✅ APIs completas para gestión de tareas EDT
- ✅ Componentes actualizados para trabajar con `ProyectoTarea`
- ✅ Servicio de conversión actualizado para usar `ProyectoTarea`