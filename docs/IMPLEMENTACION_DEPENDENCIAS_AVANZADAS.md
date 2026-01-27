# 🚀 **GUÍA COMPLETA DE IMPLEMENTACIÓN DE DEPENDENCIAS AVANZADAS**

## 📋 **ÍNDICE EJECUTIVO**

1. [Contexto y Objetivos](#contexto-y-objetivos)
2. [Análisis de Estado Actual](#análisis-de-estado-actual)
3. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
4. [Cambios en Base de Datos](#cambios-en-base-de-datos)
5. [APIs y Servicios Backend](#apis-y-servicios-backend)
6. [Componentes de UI](#componentes-de-ui)
7. [Lógica de Negocio](#lógica-de-negocio)
8. [Testing y Validación](#testing-y-validación)
9. [Despliegue y Monitoreo](#despliegue-y-monitoreo)

---

## 🎯 **CONTEXTO Y OBJETIVOS**

### **Objetivo Principal**
Implementar sistema completo de dependencias avanzadas entre tareas para cronogramas de cotizaciones, incluyendo:
- ✅ Tipos de dependencia: FS, SS, FF, SF
- ✅ Retrasos precisos en minutos
- ✅ Identificación automática de hitos
- ✅ Compatibilidad completa con MS Project

### **Alcance**
- **Incluye:** Cotizaciones comerciales (nivel 5 jerárquico)
- **Excluye:** Proyectos de ejecución (implementación futura)
- **Riesgo:** Bajo - no rompe funcionalidad existente

### **Beneficios Esperados**
- Scheduling más realista y flexible
- Compatibilidad 100% con MS Project
- Mejor control de secuenciación de tareas
- Identificación clara de hitos y eventos puntuales

---

## 🔍 **ANÁLISIS DE ESTADO ACTUAL**

### **✅ Lo que YA existe:**
- Modelo `ProyectoDependenciaTarea` (para proyectos)
- APIs CRUD completas para proyectos
- Validaciones de ciclos
- Exportación XML con TaskLinks
- Campo `dependenciaId` en tareas

### **❌ Lo que FALTA:**
- Campo `esHito` en tareas
- Campo `lagMinutos` en dependencias
- Campo `duracionHoras` en tareas
- Modelo `CotizacionDependenciaTarea`
- UI para gestión manual
- Lógica de aplicación automática

---

## 📅 **PLAN DE IMPLEMENTACIÓN POR FASES**

### **Fase 1: Base de Datos (1-2 días)**
**Prioridad: CRÍTICA** - Sin esto no se puede continuar

### **Fase 2: APIs Backend (2-3 días)**
**Prioridad: ALTA** - APIs necesarias para UI

### **Fase 3: Lógica de Negocio (2-3 días)**
**Prioridad: ALTA** - Aplicación automática de dependencias

### **Fase 4: UI de Gestión (3-4 días)**
**Prioridad: MEDIA** - UX para usuarios

### **Fase 5: Testing y Validación (2-3 días)**
**Prioridad: ALTA** - Calidad y estabilidad

### **Fase 6: Documentación y Despliegue (1 día)**
**Prioridad: BAJA** - Comunicación y rollout

---

## 🗄️ **FASE 1: CAMBIOS EN BASE DE DATOS**

### **1.1 Actualizar Schema Prisma**

```prisma
// 📁 prisma/schema.prisma

// ✅ Agregar campos faltantes a CotizacionTarea
model CotizacionTarea {
  // ... campos existentes ...

  // 🆕 NUEVOS CAMPOS PARA DEPENDENCIAS AVANZADAS
  esHito          Boolean   @default(false)  // ✅ Identifica hitos (duración 0)
  duracionHoras   Decimal?  @db.Decimal(10, 2) // ✅ Duración explícita en horas

  // 🔗 Relaciones de dependencias
  dependenciasOrigen      CotizacionDependenciaTarea[] @relation("CotizacionTareaOrigen")
  dependenciasDependiente CotizacionDependenciaTarea[] @relation("CotizacionTareaDependiente")

  // ... resto de campos ...
}

// ✅ Crear modelo para dependencias de cotizaciones
model CotizacionDependenciaTarea {
  id   String          @id @default(cuid())

  // 🔗 Relaciones con tareas
  tareaOrigenId      String // Tarea predecesora
  tareaOrigen        CotizacionTarea @relation("CotizacionTareaOrigen", fields: [tareaOrigenId], references: [id], onDelete: Cascade)

  tareaDependienteId String // Tarea sucesora
  tareaDependiente   CotizacionTarea @relation("CotizacionTareaDependiente", fields: [tareaDependienteId], references: [id], onDelete: Cascade)

  // 📊 Tipo de dependencia
  tipo TipoDependencia @default(finish_to_start)

  // ⏱️ Retraso preciso en minutos
  lagMinutos Int @default(0)

  // 📅 Auditoría
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 🔑 Restricciones de unicidad
  @@unique([tareaOrigenId, tareaDependienteId])
  @@map("cotizacion_dependencia_tarea")
}
```

### **1.2 Generar y Ejecutar Migración**

```bash
# 📋 Generar migración
npx prisma migrate dev --name add_dependencias_avanzadas_cotizaciones

# 🔍 Verificar migración generada
cat prisma/migrations/[timestamp]_add_dependencias_avanzadas_cotizaciones.sql

# ✅ Aplicar migración
npx prisma migrate deploy

# 🔄 Regenerar cliente Prisma
npx prisma generate
```

### **1.3 Validar Cambios**

```typescript
// 📋 Verificar que los nuevos campos existen
const tarea = await prisma.cotizacionTarea.findFirst()
console.log('Campos nuevos:', {
  esHito: tarea?.esHito,
  duracionHoras: tarea?.duracionHoras
})

const dependencia = await prisma.cotizacionDependenciaTarea.findFirst()
console.log('Dependencia nueva:', {
  tipo: dependencia?.tipo,
  lagMinutos: dependencia?.lagMinutos
})
```

---

## 🔧 **FASE 2: APIs BACKEND**

### **2.1 Crear API de Dependencias**

```typescript
// 📁 src/app/api/cotizaciones/[id]/cronograma/dependencias/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 📋 Schema de validación
const createDependenciaSchema = z.object({
  tareaOrigenId: z.string(),
  tareaDependienteId: z.string(),
  tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
  lagMinutos: z.number().min(0).default(0)
})

// ✅ GET /api/cotizaciones/[id]/cronograma/dependencias
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 🔍 Obtener todas las dependencias de la cotización
    const dependencias = await prisma.cotizacionDependenciaTarea.findMany({
      where: {
        tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
      },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: dependencias
    })

  } catch (error) {
    console.error('❌ Error obteniendo dependencias:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/cronograma/dependencias
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)
    const body = await request.json()

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const validatedData = createDependenciaSchema.parse(body)

    // 🔍 Verificar que ambas tareas existen y pertenecen a la cotización
    const [tareaOrigen, tareaDependiente] = await Promise.all([
      prisma.cotizacionTarea.findFirst({
        where: {
          id: validatedData.tareaOrigenId,
          cotizacionActividad: { cotizacionEdt: { cotizacionId } }
        }
      }),
      prisma.cotizacionTarea.findFirst({
        where: {
          id: validatedData.tareaDependienteId,
          cotizacionActividad: { cotizacionEdt: { cotizacionId } }
        }
      })
    ])

    if (!tareaOrigen || !tareaDependiente) {
      return NextResponse.json({
        error: 'Una o ambas tareas no existen en esta cotización'
      }, { status: 404 })
    }

    // 🚫 Verificar que no se cree un ciclo
    const tieneCiclo = await verificarCiclo(validatedData.tareaDependienteId, validatedData.tareaOrigenId)
    if (tieneCiclo) {
      return NextResponse.json({
        error: 'Esta dependencia crearía un ciclo en las dependencias'
      }, { status: 400 })
    }

    // ✅ Crear dependencia
    const dependencia = await prisma.cotizacionDependenciaTarea.create({
      data: validatedData,
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: dependencia
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error creando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// 🔄 Función auxiliar para detectar ciclos
async function verificarCiclo(tareaActualId: string, tareaBuscadaId: string): Promise<boolean> {
  // Obtener todas las dependencias donde la tarea actual es origen
  const dependencias = await prisma.cotizacionDependenciaTarea.findMany({
    where: { tareaOrigenId: tareaActualId }
  })

  // Verificar recursivamente
  for (const dep of dependencias) {
    if (dep.tareaDependienteId === tareaBuscadaId) {
      return true
    }

    // Verificar recursivamente en las dependencias de esta tarea
    const tieneCiclo = await verificarCiclo(dep.tareaDependienteId, tareaBuscadaId)
    if (tieneCiclo) return true
  }

  return false
}
```

### **2.2 Crear API para Dependencia Específica**

```typescript
// 📁 src/app/api/cotizaciones/[id]/cronograma/dependencias/[dependenciaId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ✅ GET /api/cotizaciones/[id]/cronograma/dependencias/[dependenciaId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: cotizacionId, dependenciaId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dependencia = await prisma.cotizacionDependenciaTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
      },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    })

    if (!dependencia) {
      return NextResponse.json({ error: 'Dependencia no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: dependencia
    })

  } catch (error) {
    console.error('❌ Error obteniendo dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// ✅ PUT /api/cotizaciones/[id]/cronograma/dependencias/[dependenciaId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: cotizacionId, dependenciaId } = await params
    const session = await getServerSession(authOptions)
    const body = await request.json()

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 🔍 Verificar que la dependencia existe
    const dependenciaExistente = await prisma.cotizacionDependenciaTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
      }
    })

    if (!dependenciaExistente) {
      return NextResponse.json({ error: 'Dependencia no encontrada' }, { status: 404 })
    }

    // 🚫 Verificar ciclos si cambian las tareas
    if (body.tareaOrigenId && body.tareaDependienteId) {
      const tieneCiclo = await verificarCiclo(body.tareaDependienteId, body.tareaOrigenId)
      if (tieneCiclo) {
        return NextResponse.json({
          error: 'Este cambio crearía un ciclo en las dependencias'
        }, { status: 400 })
      }
    }

    // ✅ Actualizar dependencia
    const dependencia = await prisma.cotizacionDependenciaTarea.update({
      where: { id: dependenciaId },
      data: body,
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: dependencia
    })

  } catch (error) {
    console.error('❌ Error actualizando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// ✅ DELETE /api/cotizaciones/[id]/cronograma/dependencias/[dependenciaId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: cotizacionId, dependenciaId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 🔍 Verificar que la dependencia existe
    const dependencia = await prisma.cotizacionDependenciaTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
      }
    })

    if (!dependencia) {
      return NextResponse.json({ error: 'Dependencia no encontrada' }, { status: 404 })
    }

    // ✅ Eliminar dependencia
    await prisma.cotizacionDependenciaTarea.delete({
      where: { id: dependenciaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Dependencia eliminada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
```

### **2.3 Crear Servicio de Dependencias**

```typescript
// 📁 src/lib/services/cotizacionDependencias.ts

import { prisma } from '@/lib/prisma'
import type { TipoDependencia } from '@prisma/client'

// 📊 Obtener dependencias de una cotización
export const getDependenciasCotizacion = async (cotizacionId: string) => {
  return await prisma.cotizacionDependenciaTarea.findMany({
    where: {
      tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
    },
    include: {
      tareaOrigen: { select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } },
      tareaDependiente: { select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } }
    }
  })
}

// 📊 Obtener dependencias de una tarea específica
export const getDependenciasByTarea = async (tareaId: string) => {
  const [dependenciasOrigen, dependenciasDestino] = await Promise.all([
    prisma.cotizacionDependenciaTarea.findMany({
      where: { tareaOrigenId: tareaId },
      include: {
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    }),
    prisma.cotizacionDependenciaTarea.findMany({
      where: { tareaDependienteId: tareaId },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } }
      }
    })
  ])

  return {
    dependenciasOrigen,
    dependenciasDestino
  }
}

// 🔄 Aplicar dependencias a fechas de tareas
export const aplicarDependenciasAFechas = async (
  cotizacionId: string,
  calendarioLaboral: any
) => {
  const dependencias = await getDependenciasCotizacion(cotizacionId)
  const correcciones: string[] = []

  for (const dependencia of dependencias) {
    const { tareaOrigen, tareaDependiente, tipo, lagMinutos } = dependencia

    // Calcular nueva fecha de inicio para tarea dependiente
    let nuevaFechaInicio: Date

    switch (tipo) {
      case 'finish_to_start':
        // FS: tareaDependiente inicia cuando tareaOrigen termina + lag
        nuevaFechaInicio = new Date(tareaOrigen.fechaFin.getTime() + (lagMinutos * 60 * 1000))
        break

      case 'start_to_start':
        // SS: tareaDependiente inicia cuando tareaOrigen inicia + lag
        nuevaFechaInicio = new Date(tareaOrigen.fechaInicio.getTime() + (lagMinutos * 60 * 1000))
        break

      case 'finish_to_finish':
        // FF: tareaDependiente termina cuando tareaOrigen termina + lag
        const fechaFinCalculada = new Date(tareaOrigen.fechaFin.getTime() + (lagMinutos * 60 * 1000))
        // Calcular fechaInicio para que termine en fechaFinCalculada
        const duracionTarea = tareaDependiente.fechaFin.getTime() - tareaDependiente.fechaInicio.getTime()
        nuevaFechaInicio = new Date(fechaFinCalculada.getTime() - duracionTarea)
        break

      case 'start_to_finish':
        // SF: tareaDependiente termina cuando tareaOrigen inicia + lag
        const fechaFinCalculadaSF = new Date(tareaOrigen.fechaInicio.getTime() + (lagMinutos * 60 * 1000))
        const duracionTareaSF = tareaDependiente.fechaFin.getTime() - tareaDependiente.fechaInicio.getTime()
        nuevaFechaInicio = new Date(fechaFinCalculadaSF.getTime() - duracionTareaSF)
        break
    }

    // Ajustar al calendario laboral
    nuevaFechaInicio = ajustarFechaADiaLaborable(nuevaFechaInicio, calendarioLaboral)

    // Actualizar fecha si es diferente
    if (nuevaFechaInicio.getTime() !== tareaDependiente.fechaInicio.getTime()) {
      await prisma.cotizacionTarea.update({
        where: { id: tareaDependiente.id },
        data: { fechaInicio: nuevaFechaInicio }
      })

      correcciones.push(`Tarea "${tareaDependiente.nombre}" ajustada por dependencia ${tipo}`)
    }
  }

  return correcciones
}

// 🚫 Detectar ciclos en dependencias
export const detectarCiclos = async (cotizacionId: string): Promise<string[]> => {
  const dependencias = await getDependenciasCotizacion(cotizacionId)
  const errores: string[] = []

  // Crear grafo de dependencias
  const grafo: { [key: string]: string[] } = {}

  dependencias.forEach(dep => {
    if (!grafo[dep.tareaOrigenId]) grafo[dep.tareaOrigenId] = []
    grafo[dep.tareaOrigenId].push(dep.tareaDependienteId)
  })

  // Función recursiva para detectar ciclos
  const tieneCiclo = (nodo: string, visitados: Set<string>): boolean => {
    if (visitados.has(nodo)) return true

    visitados.add(nodo)

    const dependientes = grafo[nodo] || []
    for (const dependiente of dependientes) {
      if (tieneCiclo(dependiente, new Set(visitados))) {
        return true
      }
    }

    visitados.delete(nodo)
    return false
  }

  // Verificar cada nodo
  Object.keys(grafo).forEach(nodo => {
    if (tieneCiclo(nodo, new Set())) {
      errores.push(`Ciclo detectado en dependencias desde tarea ${nodo}`)
    }
  })

  return errores
}

// 🎯 Identificar hitos automáticamente
export const identificarHitosAutomaticamente = async (cotizacionId: string) => {
  const tareas = await prisma.cotizacionTarea.findMany({
    where: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
  })

  const hitosIdentificados: string[] = []

  for (const tarea of tareas) {
    const esHito =
      (tarea.duracionHoras && tarea.duracionHoras === 0) ||
      (tarea.fechaInicio && tarea.fechaFin && tarea.fechaInicio.getTime() === tarea.fechaFin.getTime())

    if (esHito && !tarea.esHito) {
      await prisma.cotizacionTarea.update({
        where: { id: tarea.id },
        data: { esHito: true }
      })
      hitosIdentificados.push(`Hito identificado: ${tarea.nombre}`)
    }
  }

  return hitosIdentificados
}
```

---

## 🎨 **FASE 3: COMPONENTES DE UI**

### **3.1 Crear Modal de Gestión de Dependencias**

```tsx
// 📁 src/components/cronograma/DependencyManager.tsx

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface DependencyManagerProps {
  cotizacionId: string
  isOpen: boolean
  onClose: () => void
}

interface Tarea {
  id: string
  nombre: string
  actividadNombre: string
  edtNombre: string
}

interface Dependencia {
  id: string
  tareaOrigen: Tarea
  tareaDependiente: Tarea
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagMinutos: number
}

const TIPOS_DEPENDENCIA = {
  finish_to_start: { label: 'Fin a Inicio (FS)', descripcion: 'La tarea B inicia cuando A termina' },
  start_to_start: { label: 'Inicio a Inicio (SS)', descripcion: 'La tarea B inicia cuando A inicia' },
  finish_to_finish: { label: 'Fin a Fin (FF)', descripcion: 'La tarea B termina cuando A termina' },
  start_to_finish: { label: 'Inicio a Fin (SF)', descripcion: 'La tarea B termina cuando A inicia' }
}

export function DependencyManager({ cotizacionId, isOpen, onClose }: DependencyManagerProps) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [tareaOrigenId, setTareaOrigenId] = useState('')
  const [tareaDependienteId, setTareaDependienteId] = useState('')
  const [tipo, setTipo] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'>('finish_to_start')
  const [lagMinutos, setLagMinutos] = useState(0)

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      cargarDatos()
    }
  }, [isOpen])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar tareas disponibles
      const tareasResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tareas-disponibles`)
      const tareasData = await tareasResponse.json()
      setTareas(tareasData.data || [])

      // Cargar dependencias existentes
      const dependenciasResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias`)
      const dependenciasData = await dependenciasResponse.json()
      setDependencias(dependenciasData.data || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos de dependencias')
    } finally {
      setLoading(false)
    }
  }

  const crearDependencia = async () => {
    if (!tareaOrigenId || !tareaDependienteId) {
      toast.error('Debe seleccionar ambas tareas')
      return
    }

    if (tareaOrigenId === tareaDependienteId) {
      toast.error('No puede crear dependencia de una tarea consigo misma')
      return
    }

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaOrigenId,
          tareaDependienteId,
          tipo,
          lagMinutos
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Dependencia creada exitosamente')
        setShowCreateForm(false)
        resetForm()
        await cargarDatos()
      } else {
        toast.error(data.error || 'Error al crear dependencia')
      }
    } catch (error) {
      console.error('Error creando dependencia:', error)
      toast.error('Error al crear dependencia')
    }
  }

  const eliminarDependencia = async (dependenciaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta dependencia?')) return

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias/${dependenciaId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Dependencia eliminada exitosamente')
        await cargarDatos()
      } else {
        toast.error(data.error || 'Error al eliminar dependencia')
      }
    } catch (error) {
      console.error('Error eliminando dependencia:', error)
      toast.error('Error al eliminar dependencia')
    }
  }

  const resetForm = () => {
    setTareaOrigenId('')
    setTareaDependienteId('')
    setTipo('finish_to_start')
    setLagMinutos(0)
  }

  const getTareaDisplayName = (tarea: Tarea) => {
    return `${tarea.nombre} (${tarea.actividadNombre} → ${tarea.edtNombre})`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Dependencias Avanzadas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de dependencias existentes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Dependencias Existentes</h3>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Dependencia
              </Button>
            </div>

            {dependencias.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay dependencias definidas. Las tareas siguen la secuenciación automática FS+1.
              </p>
            ) : (
              <div className="space-y-3">
                {dependencias.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <div className="font-medium">{getTareaDisplayName(dep.tareaOrigen)}</div>
                        <div className="text-gray-500">Predecesora</div>
                      </div>

                      <div className="flex flex-col items-center">
                        <ArrowRight className="w-5 h-5 text-blue-500" />
                        <Badge variant="secondary" className="text-xs">
                          {TIPOS_DEPENDENCIA[dep.tipo].label}
                        </Badge>
                        {dep.lagMinutos > 0 && (
                          <span className="text-xs text-gray-500">
                            +{dep.lagMinutos}min
                          </span>
                        )}
                      </div>

                      <div className="text-sm">
                        <div className="font-medium">{getTareaDisplayName(dep.tareaDependiente)}</div>
                        <div className="text-gray-500">Sucesora</div>
                      </div>
                    </div>

                    <Button
                      onClick={() => eliminarDependencia(dep.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de creación */}
          {showCreateForm && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Crear Nueva Dependencia</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tarea-origen">Tarea Predecesora (Origen)</Label>
                  <Select value={tareaOrigenId} onValueChange={setTareaOrigenId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tarea origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {tareas.map((tarea) => (
                        <SelectItem key={tarea.id} value={tarea.id}>
                          {getTareaDisplayName(tarea)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tarea-dependiente">Tarea Sucesora (Destino)</Label>
                  <Select value={tareaDependienteId} onValueChange={setTareaDependienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tarea destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tareas.map((tarea) => (
                        <SelectItem key={tarea.id} value={tarea.id}>
                          {getTareaDisplayName(tarea)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipo">Tipo de Dependencia</Label>
                  <Select value={tipo} onValueChange={(value: any) => setTipo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_DEPENDENCIA).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">{info.label}</div>
                            <div className="text-xs text-gray-500">{info.descripcion}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lag">Retraso (minutos)</Label>
                  <Input
                    id="lag"
                    type="number"
                    value={lagMinutos}
                    onChange={(e) => setLagMinutos(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tiempo adicional entre tareas (0 = sin retraso)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button onClick={crearDependencia}>
                  Crear Dependencia
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### **3.2 Actualizar Componente de Vista de Árbol**

```tsx
// 📁 src/components/cronograma/CronogramaTreeView.tsx

// Agregar indicadores visuales de dependencias
const renderTareaNode = (tarea: any) => {
  const tieneDependencias = tarea.dependenciasOrigen?.length > 0 || tarea.dependenciasDependiente?.length > 0
  const esHito = tarea.esHito

  return (
    <div className="flex items-center space-x-2">
      {esHito && <Badge variant="outline" className="text-xs">Hito</Badge>}
      {tieneDependencias && <ArrowRight className="w-4 h-4 text-blue-500" />}
      <span>{tarea.nombre}</span>
      {tarea.duracionHoras && (
        <span className="text-xs text-gray-500">
          ({tarea.duracionHoras}h)
        </span>
      )}
    </div>
  )
}
```

---

## 🧠 **FASE 4: LÓGICA DE NEGOCIO**

### **4.1 Actualizar Generación de Cronograma**

```typescript
// 📁 src/app/api/cotizaciones/[id]/cronograma/generar/route.ts

// Después del roll-up final, aplicar dependencias definidas por usuario
console.log('🔗 Aplicando dependencias avanzadas definidas por usuario')

try {
  const { aplicarDependenciasAFechas, identificarHitosAutomaticamente } = await import('@/lib/services/cotizacionDependencias')

  // Aplicar dependencias a fechas
  const correccionesDependencias = await aplicarDependenciasAFechas(cotizacionId, calendarioLaboral)
  if (correccionesDependencias.length > 0) {
    console.log('✅ Dependencias aplicadas:', correccionesDependencias)
  }

  // Identificar hitos automáticamente
  const hitosIdentificados = await identificarHitosAutomaticamente(cotizacionId)
  if (hitosIdentificados.length > 0) {
    console.log('🎯 Hitos identificados:', hitosIdentificados)
  }

} catch (error) {
  console.warn('⚠️ Error aplicando dependencias avanzadas:', error)
  // No fallar la generación si las dependencias fallan
}
```

### **4.2 Actualizar Exportación XML**

```typescript
// 📁 src/lib/utils/msProjectXmlExport.ts

// Agregar TaskLinks para dependencias avanzadas
const taskLinks: Array<{ predecessorUID: number, successorUID: number, type: number, lag: number }> = []

// Procesar dependencias avanzadas desde CotizacionDependenciaTarea
const dependenciasAvanzadas = await prisma.cotizacionDependenciaTarea.findMany({
  where: {
    tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
  }
})

dependenciasAvanzadas.forEach(dep => {
  const predecessorUID = taskIdMap.get(dep.tareaOrigenId)
  const successorUID = taskIdMap.get(dep.tareaDependienteId)

  if (predecessorUID && successorUID) {
    // Mapear tipo de dependencia a código MS Project
    const tipoMSProject = {
      'finish_to_start': 1,  // FS
      'start_to_start': 2,   // SS
      'finish_to_finish': 3, // FF
      'start_to_finish': 4   // SF
    }[dep.tipo] || 1

    taskLinks.push({
      predecessorUID,
      successorUID,
      type: tipoMSProject,
      lag: dep.lagMinutos // ✅ Usar lagMinutos en lugar de 0
    })
  }
})

// Generar XML con lag correcto
taskLinks.forEach(link => {
  xml += `    <TaskLink>
      <PredecessorUID>${link.predecessorUID}</PredecessorUID>
      <SuccessorUID>${link.successorUID}</SuccessorUID>
      <Type>${link.type}</Type>
      <Lag>${link.lag}</Lag>
    </TaskLink>
  `
})
```

---

## 🧪 **FASE 5: TESTING Y VALIDACIÓN**

### **5.1 Crear Tests Unitarios**

```typescript
// 📁 src/__tests__/services/cotizacionDependencias.test.ts

describe('CotizacionDependencias Service', () => {
  describe('aplicarDependenciasAFechas', () => {
    it('debería aplicar dependencia FS correctamente', async () => {
      // Setup
      const dependenciaFS = {
        tareaOrigen: { fechaFin: new Date('2024-01-15T17:00:00') },
        tareaDependiente: {
          fechaInicio: new Date('2024-01-16T08:00:00'),
          fechaFin: new Date('2024-01-16T12:00:00')
        },
        tipo: 'finish_to_start' as const,
        lagMinutos: 480 // 8 horas
      }

      // Execute
      const resultado = await aplicarDependenciasAFechas('cotizacion-1', mockCalendario)

      // Assert
      expect(resultado).toContain('ajustada por dependencia finish_to_start')
    })

    it('debería respetar calendario laboral en dependencias', async () => {
      // Test que las fechas se ajusten a días laborables
    })
  })

  describe('detectarCiclos', () => {
    it('debería detectar ciclo simple A→B→A', async () => {
      // Setup dependencias que formen ciclo

      // Execute
      const errores = await detectarCiclos('cotizacion-1')

      // Assert
      expect(errores).toContain('Ciclo detectado')
    })

    it('debería detectar ciclo complejo A→B→C→A', async () => {
      // Test ciclo de 3 tareas
    })
  })

  describe('identificarHitosAutomaticamente', () => {
    it('debería marcar tarea con duracionHoras=0 como hito', async () => {
      // Setup tarea con duración 0

      // Execute
      const resultado = await identificarHitosAutomaticamente('cotizacion-1')

      // Assert
      expect(resultado).toContain('Hito identificado')
    })

    it('debería marcar tarea con fechaInicio=fechaFin como hito', async () => {
      // Test con fechas iguales
    })
  })
})
```

### **5.2 Crear Tests de Integración**

```typescript
// 📁 src/__tests__/api/cronograma-dependencias.test.ts

describe('API Dependencias Cotizaciones', () => {
  describe('POST /api/cotizaciones/[id]/cronograma/dependencias', () => {
    it('debería crear dependencia válida', async () => {
      const response = await request(app)
        .post('/api/cotizaciones/cotizacion-1/cronograma/dependencias')
        .send({
          tareaOrigenId: 'tarea-1',
          tareaDependienteId: 'tarea-2',
          tipo: 'finish_to_start',
          lagMinutos: 0
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('debería rechazar dependencia con ciclo', async () => {
      // Crear dependencia A→B, luego intentar B→A

      const response = await request(app)
        .post('/api/cotizaciones/cotizacion-1/cronograma/dependencias')
        .send({
          tareaOrigenId: 'tarea-2', // B
          tareaDependienteId: 'tarea-1', // A
          tipo: 'finish_to_start',
          lagMinutos: 0
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('ciclo')
    })
  })

  describe('DELETE /api/cotizaciones/[id]/cronograma/dependencias/[id]', () => {
    it('debería eliminar dependencia existente', async () => {
      const response = await request(app)
        .delete('/api/cotizaciones/cotizacion-1/cronograma/dependencias/dep-1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})
```

### **5.3 Crear Tests E2E**

```typescript
// 📁 src/__tests__/e2e/cronograma-dependencias.e2e.spec.ts

test('flujo completo de gestión de dependencias', async ({ page }) => {
  // Navegar a cronograma
  await page.goto('/comercial/cotizaciones/cotizacion-1/cronograma')

  // Abrir modal de dependencias
  await page.click('[data-testid="btn-dependencias"]')

  // Crear nueva dependencia
  await page.click('[data-testid="btn-nueva-dependencia"]')
  await page.selectOption('[data-testid="select-origen"]', 'tarea-1')
  await page.selectOption('[data-testid="select-destino"]', 'tarea-2')
  await page.selectOption('[data-testid="select-tipo"]', 'finish_to_start')
  await page.fill('[data-testid="input-lag"]', '480')
  await page.click('[data-testid="btn-crear-dependencia"]')

  // Verificar que se creó
  await expect(page.locator('[data-testid="dependencia-item"]')).toHaveCount(1)

  // Verificar en exportación XML
  await page.click('[data-testid="btn-exportar-xml"]')
  const download = await page.waitForEvent('download')
  const xmlContent = await readFile(download.path())

  expect(xmlContent).toContain('<Type>1</Type>') // FS
  expect(xmlContent).toContain('<Lag>480</Lag>') // 8 horas
})
```

---

## 🚀 **FASE 6: DESPLIEGUE Y MONITOREO**

### **6.1 Checklist de Despliegue**

- [ ] ✅ Migración de BD ejecutada en producción
- [ ] ✅ APIs desplegadas y accesibles
- [ ] ✅ Componentes UI renderizando correctamente
- [ ] ✅ Tests pasando en CI/CD
- [ ] ✅ Documentación actualizada
- [ ] ✅ Usuarios clave notificados

### **6.2 Monitoreo Post-Despliegue**

```typescript
// 📁 src/lib/monitoring/dependenciasMetrics.ts

export const trackDependenciasMetrics = async () => {
  // Métricas de uso
  const totalDependencias = await prisma.cotizacionDependenciaTarea.count()
  const dependenciasPorTipo = await prisma.cotizacionDependenciaTarea.groupBy({
    by: ['tipo'],
    _count: true
  })

  // Métricas de rendimiento
  const tiempoPromedio