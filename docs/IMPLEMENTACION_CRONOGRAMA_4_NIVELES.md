# 🚀 Implementación: Sistema de Cronograma de 4 Niveles

## 📋 Resumen Ejecutivo

Este documento detalla la implementación completa del sistema de cronograma jerárquico de 4 niveles **Proyecto → Fases → EDT → Tareas** que se mantiene consistente a través de todo el ciclo de vida: **Cotización → Planificación → Ejecución**.

## 🎯 Objetivos

- ✅ Implementar jerarquía de 4 niveles consistente
- ✅ Mantener alineación entre cronogramas comercial, planificación y ejecución
- ✅ Mejorar organización y seguimiento de proyectos complejos
- ✅ Facilitar comparación entre estimaciones y realidad
- ✅ Escalar para proyectos de cualquier tamaño

## 🏗️ Arquitectura Propuesta

### Jerarquía Completa
```
Proyecto (fecha inicio global, fecha fin global)
├── Fase 1: "Planificación" (fecha inicio: F1, fecha fin: F2)
│   ├── EDT 1.1 (debe estar entre F1-F2)
│   │   ├── Tarea 1.1.1
│   │   └── Tarea 1.1.2
│   └── EDT 1.2 (debe estar entre F1-F2)
├── Fase 2: "Ejecución" (fecha inicio: F3, fecha fin: F4)
│   ├── EDT 2.1 (debe estar entre F3-F4)
│   └── EDT 2.2 (debe estar entre F3-F4)
└── Fase 3: "Cierre" (fecha inicio: F5, fecha fin: F6)
```

### Ciclo de Vida

#### 1. 📊 **Cotización (Comercial)**
- **Propósito**: Estimación de ventas
- **Fechas**: Comerciales/estimadas (±30%)
- **Jerarquía**: Mantiene 4 niveles completos
- **Responsable**: Equipo comercial

#### 2. 📋 **Planificación (Proyecto)**
- **Propósito**: Plan detallado de ejecución
- **Fechas**: Plan/realistas (±15%)
- **Jerarquía**: Misma estructura, mayor detalle
- **Responsable**: Project Manager

#### 3. ⚡ **Ejecución (Real)**
- **Propósito**: Seguimiento real del progreso
- **Fechas**: Reales (±5%)
- **Jerarquía**: Estructura completa con datos reales
- **Responsable**: Equipo de ejecución

## 🗄️ Cambios en Base de Datos

### Nuevo Modelo: ProyectoFase

```prisma
model ProyectoFase {
  id                String   @id @default(cuid())
  proyectoId        String
  nombre            String   // "Planificación", "Ejecución", "Cierre", etc.
  descripcion       String?
  orden             Int      @default(0) // Para ordenar fases

  // Fechas de la fase
  fechaInicioPlan   DateTime?
  fechaFinPlan      DateTime?
  fechaInicioReal   DateTime?
  fechaFinReal      DateTime?

  // Estado y progreso
  estado            EstadoFase @default(planificado)
  porcentajeAvance  Int       @default(0)

  // Auditoría
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relaciones
  proyecto          Proyecto    @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  edts              ProyectoEdt[]

  @@unique([proyectoId, nombre])
  @@index([proyectoId, orden])
  @@map("proyecto_fase")
}

enum EstadoFase {
  planificado
  en_progreso
  completado
  pausado
  cancelado
}
```

### Modificaciones a Modelos Existentes

#### ProyectoEdt
```prisma
model ProyectoEdt {
  // ... campos existentes
  proyectoFaseId    String?        // Nueva relación opcional
  proyectoFase      ProyectoFase?  @relation(fields: [proyectoFaseId], references: [id], onDelete: SetNull)

  // ... resto de campos
}
```

#### Proyecto
```prisma
model Proyecto {
  // ... campos existentes
  fases             ProyectoFase[] // Nueva relación

  // ... resto de campos
}
```

#### CotizacionEdt (ya implementado)
```prisma
model CotizacionEdt {
  // ... campos existentes
  nombre            String  // ✅ Ya agregado

  // ... resto de campos
}
```

## 🔧 APIs a Implementar

### 1. Gestión de Fases

#### `GET /api/proyectos/[id]/fases`
```typescript
// Obtener todas las fases de un proyecto con sus EDTs
export async function GET(request, { params }) {
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoId: params.id },
    include: {
      edts: {
        include: {
          categoriaServicio: true,
          responsable: true,
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
      totalEdts: fases.reduce((sum, f) => sum + f.edts.length, 0)
    }
  })
}
```

#### `POST /api/proyectos/[id]/fases`
```typescript
// Crear nueva fase
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const data = await request.json()

  // Validar que las fechas estén dentro del proyecto
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

### 2. APIs de EDTs Modificadas

#### Modificar `POST /api/proyectos/[id]/edts`
```typescript
// Al crear EDT, validar contención en fase
export async function POST(request, { params }) {
  const data = await request.json()

  // Validar contención en fase si se especifica
  if (data.proyectoFaseId) {
    const fase = await prisma.proyectoFase.findUnique({
      where: { id: data.proyectoFaseId },
      select: { fechaInicioPlan: true, fechaFinPlan: true }
    })

    if (data.fechaInicio < fase.fechaInicioPlan ||
        data.fechaFin > fase.fechaFinPlan) {
      return NextResponse.json(
        { error: 'Las fechas del EDT deben estar dentro de su fase' },
        { status: 400 }
      )
    }
  }

  // Crear EDT con faseId
  const edt = await prisma.proyectoEdt.create({
    data: {
      ...data,
      proyectoFaseId: data.proyectoFaseId
    }
  })

  return NextResponse.json({ data: edt })
}
```

### 3. API de Conversión Cotización → Proyecto

#### `POST /api/proyectos/convertir-desde-cotizacion`
```typescript
export async function POST(request) {
  const { cotizacionId, proyectoId } = await request.json()

  try {
    // Ejecutar conversión completa
    const resultado = await convertirCotizacionAProyecto(cotizacionId, proyectoId)

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Conversión completada exitosamente'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en la conversión', details: error.message },
      { status: 500 }
    )
  }
}
```

## 🎨 Componentes, Modales y Páginas

### 📋 **RESUMEN DE CAMBIOS UI/UX**

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| 🆕 **Nuevos Componentes** | 9 | ProyectoFasesView, FasesList, GanttPorFases, etc. |
| 🔄 **Componentes Actualizados** | 4 | EdtList, EdtForm, CronogramaContainer, GanttChart |
| 🚪 **Nuevos Modales** | 3 | FaseForm, AsignarEdtAFase, ConversionCotizacion |
| 📄 **Páginas Actualizadas** | 2 | Proyecto cronograma page, Gantt tareas page |
| 🔗 **Nuevas APIs** | 6 | Fases CRUD, comparación, conversión |

---

### 🆕 **COMPONENTES A CREAR**

#### 1. **ProyectoFasesView** (Vista Principal)
**Ubicación**: `src/components/proyectos/fases/ProyectoFasesView.tsx`
**Propósito**: Vista principal que reemplaza la navegación actual del cronograma
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FasesList } from './FasesList'
import { EdtsPorFase } from './EdtsPorFase'
import { GanttPorFases } from './GanttPorFases'
import { CronogramaComparisonView } from './CronogramaComparisonView'

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
    return <div>Cargando fases...</div>
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
            <TabsTrigger value="comparacion">📈 Comparación</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contenido según vista */}
      <TabsContent value="fases" className="mt-6">
        <FasesList fases={fases} onRefresh={loadFases} />
      </TabsContent>

      <TabsContent value="edts" className="mt-6">
        <EdtsPorFase fases={fases} onRefresh={loadFases} />
      </TabsContent>

      <TabsContent value="gantt" className="mt-6">
        <GanttPorFases fases={fases} proyectoId={proyectoId} />
      </TabsContent>

      <TabsContent value="comparacion" className="mt-6">
        <CronogramaComparisonView proyectoId={proyectoId} />
      </TabsContent>
    </div>
  )
}
```

#### 2. **FasesList** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/FasesList.tsx`
**Funcionalidades**: Lista de fases con métricas, CRUD completo

#### 3. **FaseForm** (Nuevo modal)
**Ubicación**: `src/components/proyectos/fases/FaseFormModal.tsx`
**Campos**: Nombre, descripción, fechas plan, orden

#### 4. **EdtsPorFase** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/EdtsPorFase.tsx`
**Funcionalidades**: EDTs organizados por fases, drag & drop entre fases

#### 5. **GanttPorFases** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/GanttPorFases.tsx`
**Funcionalidades**: Gantt jerárquico 4 niveles con timeline

#### 6. **CronogramaComparisonView** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/CronogramaComparisonView.tsx`
**Funcionalidades**: Vista paralela de 3 cronogramas

#### 7. **GanttMini** (Nuevo auxiliar)
**Ubicación**: `src/components/proyectos/fases/GanttMini.tsx`
**Funcionalidades**: Versión compacta para comparación

#### 8. **AsignarEdtAFase Modal** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/AsignarEdtAFaseModal.tsx`
**Funcionalidades**: Bulk assignment de EDTs a fases

#### 9. **ConversionCotizacion Modal** (Nuevo)
**Ubicación**: `src/components/proyectos/fases/ConversionCotizacionModal.tsx`
**Funcionalidades**: Preview y confirmación de conversión

---

### 🔄 **COMPONENTES A ACTUALIZAR**

#### 1. **CronogramaContainer** (Reemplazar)
**Ubicación**: `src/components/proyectos/CronogramaContainer.tsx`
**Cambios**:
- Reemplazar contenido con `ProyectoFasesView`
- Mantener como wrapper si es necesario
- Posible eliminación completa

#### 2. **EdtList** (Actualizar)
**Ubicación**: `src/components/proyectos/EdtList.tsx`
**Cambios**:
- Añadir columna "Fase padre"
- Filtro por fase
- Funcionalidad de reasignación

#### 3. **EdtForm** (Actualizar)
**Ubicación**: `src/components/proyectos/EdtForm.tsx`
**Cambios**:
- Selector de fase padre
- Validaciones contra fechas de fase
- Auto-sugerencia de fechas

#### 4. **GanttChart** (Actualizar)
**Ubicación**: `src/components/proyectos/GanttChart.tsx`
**Cambios**:
- Soporte para modo "jerárquico" vs "tareas"
- Mostrar contexto EDT/fase en tooltips
- Navegación hacia Gantt jerárquico

---

### 📄 **PÁGINAS A ACTUALIZAR**

#### 1. **Proyecto Cronograma Page** (Actualizar)
**Ubicación**: `src/app/proyectos/[id]/cronograma/page.tsx`
**Cambios**:
- Reemplazar `CronogramaContainer` con `ProyectoFasesView`
- Actualizar breadcrumbs y metadata

#### 2. **Gantt Tareas Page** (Actualizar mayor)
**Ubicación**: `src/app/proyectos/tareas/gantt/page.tsx`
**Cambios**:
- Añadir modo "Jerárquico 4 niveles" vs "Tareas detalladas"
- Soporte para filtrar por proyecto específico
- Vista de múltiples proyectos con selector
- Integración con Gantt jerárquico

**Nuevas funcionalidades en Gantt tareas:**
```tsx
// Añadir selector de modo y proyecto
const [modoVista, setModoVista] = useState<'tareas' | 'jerarquico'>('tareas')
const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('')
const [vistaProyecto, setVistaProyecto] = useState<'unico' | 'multiple'>('multiple')

// Modo jerárquico: mostrar EDTs con tareas agrupadas por fases
// Modo tareas: vista detallada actual con dependencias
// Vista múltiple: selector de proyectos
// Vista única: filtrado por proyecto específico (desde URL params)
```

**Navegación integrada:**
```tsx
// Desde Gantt jerárquico → Gantt tareas
const handleEdtClick = (edt: ProyectoEdt) => {
  router.push(`/proyectos/tareas/gantt?proyectoId=${edt.proyectoId}&edtId=${edt.id}&modo=jerarquico`)
}

// Desde Gantt tareas → Gantt jerárquico
const handleProyectoClick = (proyectoId: string) => {
  router.push(`/proyectos/${proyectoId}/cronograma?vista=gantt`)
}
```

**Nuevos controles en UI:**
```tsx
{/* Selector de modo de vista */}
<Tabs value={modoVista} onValueChange={(value: 'tareas' | 'jerarquico') => setModoVista(value)}>
  <TabsList>
    <TabsTrigger value="tareas">📋 Vista de Tareas</TabsTrigger>
    <TabsTrigger value="jerarquico">🏗️ Vista Jerárquica</TabsTrigger>
  </TabsList>
</Tabs>

{/* Selector de vista de proyecto */}
<Select value={vistaProyecto} onValueChange={(value: 'unico' | 'multiple') => setVistaProyecto(value)}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="multiple">Múltiples Proyectos</SelectItem>
    <SelectItem value="unico">Proyecto Específico</SelectItem>
  </SelectContent>
</Select>

{/* Selector de proyecto (cuando vista múltiple) */}
{vistaProyecto === 'multiple' && (
  <Select value={proyectoSeleccionado} onValueChange={setProyectoSeleccionado}>
    <SelectTrigger>
      <SelectValue placeholder="Seleccionar proyecto" />
    </SelectTrigger>
    <SelectContent>
      {proyectos.map(proyecto => (
        <SelectItem key={proyecto.id} value={proyecto.id}>
          {proyecto.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

**Modo Jerárquico en Gantt tareas:**
- Vista simplificada del Gantt 4 niveles
- Enfoque en EDTs agrupados por fases
- Click en EDT expande/colapsa tareas
- Menos detalle que el Gantt jerárquico completo
- Optimizado para gestión operativa

---

### 🗂️ **ESTRUCTURA FINAL DE ARCHIVOS**

```
src/components/proyectos/
├── fases/                          # 🆕 NUEVO DIRECTORIO
│   ├── ProyectoFasesView.tsx       # 🆕 NUEVO
│   ├── FasesList.tsx               # 🆕 NUEVO
│   ├── FaseFormModal.tsx           # 🆕 NUEVO
│   ├── EdtsPorFase.tsx             # 🆕 NUEVO
│   ├── GanttPorFases.tsx           # 🆕 NUEVO
│   ├── GanttMini.tsx               # 🆕 NUEVO
│   ├── CronogramaComparisonView.tsx # 🆕 NUEVO
│   ├── AsignarEdtAFaseModal.tsx    # 🆕 NUEVO
│   └── ConversionCotizacionModal.tsx # 🆕 NUEVO
├── EdtList.tsx                     # 🔄 ACTUALIZAR
├── EdtForm.tsx                     # 🔄 ACTUALIZAR
├── GanttChart.tsx                  # 🔄 ACTUALIZAR
└── CronogramaContainer.tsx         # 🔄 REEMPLAZAR

src/app/proyectos/
├── [id]/cronograma/page.tsx        # 🔄 ACTUALIZAR
└── tareas/gantt/page.tsx           # 🔄 ACTUALIZAR (mayor)

src/app/api/proyectos/
├── [id]/fases/                     # 🆕 NUEVO
│   ├── route.ts                    # 🆕 NUEVO
│   └── [faseId]/route.ts           # 🆕 NUEVO
├── comparacion-cronogramas/        # 🆕 NUEVO
│   └── route.ts                    # 🆕 NUEVO
└── convertir-desde-cotizacion/     # 🆕 NUEVO
    └── route.ts                    # 🆕 NUEVO
```

---

### 🎯 **FLUJO DE USUARIO ACTUALIZADO**

#### Para Project Manager:
1. **Vista Estratégica**: Proyecto → Cronograma → Gantt jerárquico
2. **Vista Detallada**: Click EDT → `/proyectos/tareas/gantt?edtId=xxx`
3. **Vista Cruzada**: `/proyectos/tareas/gantt` → Selector de proyecto + modo jerárquico

#### Para Ejecutivo/Stakeholder:
1. **Vista General**: Solo Gantt jerárquico en detalle del proyecto
2. **Comparación**: 3 cronogramas paralelos
3. **Métricas**: KPIs por fase y EDT

#### Para Equipo de Ejecución:
1. **Vista Operativa**: Gantt de tareas tradicional
2. **Vista Jerárquica**: Contexto de fases y EDTs
3. **Vista Múltiple**: Cambiar entre proyectos fácilmente

### 2. Gantt Jerárquico

```tsx
interface GanttPorFasesProps {
  fases: any[]
  proyectoId: string
}

export function GanttPorFases({ fases, proyectoId }: GanttPorFasesProps) {
  // Lógica de Gantt con 4 niveles
  // Implementar timeline, barras por nivel, interacciones

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Gantt Jerárquica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Timeline Header */}
          <div className="flex border-b mb-4">
            <div className="w-64 p-4 font-medium">Proyecto / Fase / EDT / Tarea</div>
            <div className="flex-1 flex">
              {/* Timeline columns */}
            </div>
          </div>

          {/* Proyecto Level */}
          <div className="border rounded-lg mb-4">
            <div className="flex bg-blue-50">
              <div className="w-64 p-4 font-semibold">🏗️ Proyecto Completo</div>
              <div className="flex-1 relative p-4">
                {/* Proyecto bar */}
              </div>
            </div>
          </div>

          {/* Fases */}
          {fases.map(fase => (
            <div key={fase.id} className="mb-4">
              {/* Fase Header */}
              <div className="flex border bg-green-50">
                <div className="w-64 p-4 font-medium">📁 {fase.nombre}</div>
                <div className="flex-1 relative p-4">
                  {/* Fase bar */}
                </div>
              </div>

              {/* EDTs dentro de la fase */}
              {fase.edts?.map(edt => (
                <div key={edt.id} className="ml-8">
                  {/* EDT Row */}
                  <div className="flex border">
                    <div className="w-56 p-3 bg-gray-50">
                      🔧 {edt.nombre}
                    </div>
                    <div className="flex-1 relative">
                      {/* EDT bar */}
                    </div>
                  </div>

                  {/* Tasks dentro del EDT */}
                  {edt.tareas?.map(tarea => (
                    <div key={tarea.id} className="ml-8">
                      <div className="flex border">
                        <div className="w-48 p-2 bg-white">
                          ✅ {tarea.nombre}
                        </div>
                        <div className="flex-1 relative">
                          {/* Task bar */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

## 🔄 Lógica de Negocio

### Servicio de Validaciones

```typescript
// src/lib/services/cronogramaValidation.ts
export class CronogramaValidationService {
  // Validar jerarquía completa
  static async validarJerarquiaCompleta(proyectoId: string) {
    const errores = []

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        fases: {
          include: {
            edts: {
              include: {
                tareas: true
              }
            }
          }
        }
      }
    })

    // 1. Validar fases dentro del proyecto
    proyecto.fases.forEach(fase => {
      if (fase.fechaInicioPlan < proyecto.fechaInicio) {
        errores.push(`Fase "${fase.nombre}" inicia antes del proyecto`)
      }
      if (fase.fechaFinPlan > proyecto.fechaFin) {
        errores.push(`Fase "${fase.nombre}" termina después del proyecto`)
      }
    })

    // 2. Validar EDTs dentro de sus fases
    proyecto.fases.forEach(fase => {
      fase.edts.forEach(edt => {
        if (edt.fechaInicioPlan < fase.fechaInicioPlan) {
          errores.push(`EDT "${edt.nombre}" inicia antes de su fase`)
        }
        if (edt.fechaFinPlan > fase.fechaFinPlan) {
          errores.push(`EDT "${edt.nombre}" termina después de su fase`)
        }
      })
    })

    // 3. Validar tareas dentro de sus EDTs
    proyecto.fases.forEach(fase => {
      fase.edts.forEach(edt => {
        edt.tareas?.forEach(tarea => {
          if (tarea.fechaInicio < edt.fechaInicioPlan) {
            errores.push(`Tarea "${tarea.nombre}" inicia antes de su EDT`)
          }
          if (tarea.fechaFin > edt.fechaFinPlan) {
            errores.push(`Tarea "${tarea.nombre}" termina después de su EDT`)
          }
        })
      })
    })

    return errores
  }

  // Auto-ajustar fechas hacia arriba
  static async autoAjustarFechas(proyectoId: string) {
    // Lógica para expandir fases y proyecto según EDTs y tareas
  }
}
```

### Servicio de Conversión

```typescript
// src/lib/services/cronogramaConversion.ts
export class CronogramaConversionService {
  static async convertirCotizacionAProyecto(cotizacionId: string, proyectoId: string) {
    // 1. Obtener cronograma comercial
    const edtsComerciales = await prisma.cotizacionEdt.findMany({
      where: { cotizacionId },
      include: { tareas: true, categoriaServicio: true }
    })

    // 2. Crear fases estándar
    const fasesProyecto = await this.crearFasesEstandar(proyectoId)

    // 3. Distribuir EDTs en fases
    const asignaciones = await this.distribuirEdtsEnFases(edtsComerciales, fasesProyecto)

    // 4. Crear EDTs del proyecto
    for (const asignacion of asignaciones) {
      await prisma.proyectoEdt.create({
        data: {
          proyectoId,
          proyectoFaseId: asignacion.faseId,
          nombre: asignacion.edt.nombre,
          categoriaServicioId: asignacion.edt.categoriaServicioId,
          fechaInicioPlan: asignacion.edt.fechaInicioComercial,
          fechaFinPlan: asignacion.edt.fechaFinComercial,
          tareas: {
            create: asignacion.edt.tareas?.map(tarea => ({
              nombre: tarea.nombre,
              fechaInicio: tarea.fechaInicio,
              fechaFin: tarea.fechaFin,
              horasEstimadas: tarea.horasEstimadas
            })) || []
          }
        }
      })
    }

    // 5. Ajustar fechas de fases
    await this.ajustarFechasFases(fasesProyecto)

    return { fases: fasesProyecto, asignaciones }
  }

  private static async crearFasesEstandar(proyectoId: string) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { fechaInicio: true, fechaFin: true }
    })

    const duracionTotal = proyecto.fechaFin.getTime() - proyecto.fechaInicio.getTime()
    const fase1Duracion = duracionTotal * 0.2 // 20% planificación
    const fase2Duracion = duracionTotal * 0.6 // 60% ejecución
    const fase3Duracion = duracionTotal * 0.2 // 20% cierre

    const fases = [
      {
        nombre: 'Planificación Detallada',
        orden: 1,
        fechaInicio: proyecto.fechaInicio,
        fechaFin: new Date(proyecto.fechaInicio.getTime() + fase1Duracion)
      },
      {
        nombre: 'Ejecución Planificada',
        orden: 2,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + fase1Duracion),
        fechaFin: new Date(proyecto.fechaInicio.getTime() + fase1Duracion + fase2Duracion)
      },
      {
        nombre: 'Cierre Planificado',
        orden: 3,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + fase1Duracion + fase2Duracion),
        fechaFin: proyecto.fechaFin
      }
    ]

    const fasesCreadas = []
    for (const fase of fases) {
      const faseCreada = await prisma.proyectoFase.create({
        data: {
          proyectoId,
          nombre: fase.nombre,
          orden: fase.orden,
          fechaInicioPlan: fase.fechaInicio,
          fechaFinPlan: fase.fechaFin
        }
      })
      fasesCreadas.push(faseCreada)
    }

    return fasesCreadas
  }

  private static determinarFaseParaEdt(edtComercial: any, fases: any[]) {
    const categoria = edtComercial.categoriaServicio?.nombre?.toLowerCase() || ''

    if (categoria.includes('levantamiento') || categoria.includes('diseño') ||
        categoria.includes('planificación')) {
      return fases.find(f => f.nombre === 'Planificación Detallada')
    }

    if (categoria.includes('instalación') || categoria.includes('montaje') ||
        categoria.includes('ejecución')) {
      return fases.find(f => f.nombre === 'Ejecución Planificada')
    }

    if (categoria.includes('prueba') || categoria.includes('puesta en marcha') ||
        categoria.includes('cierre')) {
      return fases.find(f => f.nombre === 'Cierre Planificado')
    }

    // Default: fase de ejecución
    return fases.find(f => f.nombre === 'Ejecución Planificada')
  }

  private static async distribuirEdtsEnFases(edtsComerciales: any[], fases: any[]) {
    const asignaciones = []

    for (const edt of edtsComerciales) {
      const faseAsignada = this.determinarFaseParaEdt(edt, fases)
      asignaciones.push({
        edt,
        faseId: faseAsignada.id,
        faseNombre: faseAsignada.nombre
      })
    }

    return asignaciones
  }

  private static async ajustarFechasFases(fases: any[]) {
    // Ajustar fechas de fases según los EDTs asignados
    for (const fase of fases) {
      const edtsFase = await prisma.proyectoEdt.findMany({
        where: { proyectoFaseId: fase.id },
        select: { fechaInicioPlan: true, fechaFinPlan: true }
      })

      if (edtsFase.length > 0) {
        const minFecha = new Date(Math.min(...edtsFase.map(e => e.fechaInicioPlan.getTime())))
        const maxFecha = new Date(Math.max(...edtsFase.map(e => e.fechaFinPlan.getTime())))

        await prisma.proyectoFase.update({
          where: { id: fase.id },
          data: {
            fechaInicioPlan: minFecha,
            fechaFinPlan: maxFecha
          }
        })
      }
    }
  }
}
```

## 📊 Dashboard Comparativo

```tsx
interface CronogramaComparisonViewProps {
  proyectoId: string
}

export function CronogramaComparisonView({ proyectoId }: CronogramaComparisonViewProps) {
  const [comparacion, setComparacion] = useState(null)

  useEffect(() => {
    loadComparacion()
  }, [proyectoId])

  const loadComparacion = async () => {
    const response = await fetch(`/api/proyectos/${proyectoId}/comparacion-cronogramas`)
    const data = await response.json()
    setComparacion(data)
  }

  if (!comparacion) return <div>Cargando comparación...</div>

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
            data={comparacion.comercial}
            color="blue"
            showMetrics={true}
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
            data={comparacion.planificado}
            color="green"
            showMetrics={true}
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
            data={comparacion.real}
            color="orange"
            showMetrics={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

## 📈 Métricas y KPIs

### Métricas por Nivel

```typescript
interface MetricasCronograma {
  proyecto: {
    totalFases: number
    fasesCompletadas: number
    progresoGeneral: number
    desviacionGlobal: number // vs plan
  }
  fases: Array<{
    nombre: string
    progreso: number
    edtsTotal: number
    edtsCompletados: number
    desviacionFase: number
  }>
  edts: Array<{
    nombre: string
    progreso: number
    tareasTotal: number
    tareasCompletadas: number
    desviacionEdt: number
    horasReales: number
    horasPlan: number
  }>
  comparacion: {
    precisionComercial: number // % de acierto en estimaciones
    eficienciaPlanificacion: number // % de cumplimiento del plan
    velocidadEjecucion: number // % sobre/under tiempo
  }
}
```

## 🚀 Plan de Implementación Actualizado

### Fase 1: Base de Datos y APIs (2 semanas)
- [ ] Crear modelo ProyectoFase
- [ ] Modificar ProyectoEdt para incluir faseId
- [ ] Crear APIs CRUD para fases
- [ ] Actualizar APIs de EDTs con validaciones
- [ ] Implementar API de conversión cotización → proyecto
- [ ] Crear API de comparación de cronogramas

### Fase 2: Servicios de Lógica de Negocio (1 semana)
- [ ] Implementar CronogramaValidationService
- [ ] Implementar CronogramaConversionService
- [ ] Crear servicios de métricas y KPIs
- [ ] Tests unitarios de lógica de negocio

### Fase 3: UI Básica - Sistema Jerárquico (2 semanas)
- [ ] Crear directorio `src/components/proyectos/fases/`
- [ ] Implementar ProyectoFasesView principal
- [ ] Crear FasesList con CRUD completo
- [ ] Implementar EdtsPorFase con drag & drop
- [ ] Crear modales: FaseForm, AsignarEdtAFase, ConversionCotizacion
- [ ] Actualizar EdtList y EdtForm con soporte de fases

### Fase 4: Gantt Jerárquico y Comparativo (3 semanas)
- [ ] Implementar GanttPorFases con 4 niveles
- [ ] Crear GanttMini para comparación
- [ ] Implementar CronogramaComparisonView
- [ ] Añadir métricas de comparación y desviaciones
- [ ] Implementar interacciones (drag & drop, zoom)
- [ ] Actualizar página proyecto cronograma

### Fase 5: Mejora Gantt Existente (2 semanas)
- [ ] Actualizar `src/app/proyectos/tareas/gantt/page.tsx`
- [ ] Añadir modo "Jerárquico 4 niveles" vs "Tareas detalladas"
- [ ] Implementar selector de vista (único vs múltiple proyecto)
- [ ] Soporte para filtrado por proyecto específico
- [ ] Integración con Gantt jerárquico (navegación cruzada)
- [ ] Actualizar GanttChart con modo jerárquico

### Fase 6: Testing, Optimización e Integración (2 semanas)
- [ ] Tests de integración end-to-end
- [ ] Optimización de performance (virtualización para 50+ EDTs)
- [ ] Testing de navegación cruzada entre Gantts
- [ ] Documentación completa y training
- [ ] Validación de jerarquía completa en todos los flujos

### Fase 7: Migración y Rollout (1 semana)
- [ ] Script de migración para datos existentes
- [ ] Actualización de permisos y roles
- [ ] Training para usuarios finales
- [ ] Monitoreo post-implementación

## ✅ Criterios de Éxito

- [ ] Jerarquía de 4 niveles funcionando en todas las fases
- [ ] Conversión automática cotización → proyecto con fases
- [ ] Validaciones de contención de fechas en jerarquía completa
- [ ] Dashboard comparativo operativo (3 cronogramas)
- [ ] Gantt existente actualizado con modo jerárquico
- [ ] Navegación fluida entre Gantts jerárquico y de tareas
- [ ] Performance aceptable con 50+ EDTs y 100+ tareas
- [ ] Interfaz intuitiva con navegación por tabs
- [ ] Soporte para vista de múltiples proyectos

## 🎯 Beneficios Esperados

1. **Mejor Organización**: Proyectos complejos lógicamente estructurados en 4 niveles
2. **Mayor Precisión**: Comparación continua entre estimaciones, planificación y realidad
3. **Mejor Control**: Seguimiento granular por fases y EDTs con navegación cruzada
4. **Escalabilidad**: Soporta proyectos de cualquier complejidad (50+ EDTs)
5. **Flexibilidad**: Dos Gantts complementarios para diferentes necesidades
6. **Business Intelligence**: Métricas avanzadas y reportes de desviaciones
7. **Experiencia de Usuario**: Navegación intuitiva entre vistas jerárquicas y detalladas

## 📋 Riesgos y Mitigaciones

### Riesgo 1: Complejidad de UI
**Mitigación**: Implementar wizard de configuración inicial, navegación intuitiva por tabs

### Riesgo 2: Performance con Grandes Proyectos
**Mitigación**: Lazy loading, virtualización, optimización de queries

### Riesgo 3: Curva de Aprendizaje
**Mitigación**: Training sessions, documentación detallada, tooltips contextuales

### Riesgo 4: Migración de Datos Existentes
**Mitigación**: Script de migración automática, respaldo completo, rollback plan

## 📞 Contactos y Responsabilidades

- **Product Owner**: [Nombre]
- **Tech Lead**: [Nombre]
- **QA Lead**: [Nombre]
- **UX/UI Designer**: [Nombre]

---

**Fecha de Creación**: 21 de septiembre de 2025
**Última Actualización**: 21 de septiembre de 2025
**Versión**: 1.1
**Estado**: Aprobado para implementación
**Duración Total**: 7 fases / 9 semanas