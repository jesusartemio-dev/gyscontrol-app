// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/importar/tareas
// 🔧 Descripción: Importar tareas desde items de servicio a actividades
// ✅ POST: Importar tareas seleccionadas a una actividad
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importTareasSchema = z.object({
  actividadId: z.string().min(1, 'El ID de la actividad es requerido'),
  servicioItemIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un item de servicio')
})

// ✅ POST /api/cotizaciones/[id]/cronograma/importar/tareas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para modificar el cronograma' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = importTareasSchema.parse(body)

    // Verificar que la actividad existe y pertenece a la cotización
    const actividad = await prisma.cotizacionActividad.findFirst({
      where: {
        id: validatedData.actividadId,
        ...(await getActividadParentCondition(id, validatedData.actividadId))
      }
    })

    if (!actividad) {
      return NextResponse.json({
        error: 'Actividad no encontrada o no pertenece a esta cotización'
      }, { status: 400 })
    }

    // Obtener items de servicio seleccionados que pertenecen a la cotización
    const servicioItems = await prisma.cotizacionServicioItem.findMany({
      where: {
        id: { in: validatedData.servicioItemIds },
        cotizacionServicio: {
          cotizacionId: id
        }
      },
      include: {
        cotizacionServicio: true,
        recurso: true,
        unidadServicio: true
      }
    })

    if (servicioItems.length === 0) {
      return NextResponse.json({
        error: 'Ninguno de los items seleccionados pertenece a esta cotización'
      }, { status: 400 })
    }

    // Verificar que no existan tareas con nombres duplicados en la actividad
    const tareasExistentes = await prisma.cotizacionTarea.findMany({
      where: {
        cotizacionActividadId: validatedData.actividadId
      },
      select: { nombre: true }
    })

    const nombresExistentes = tareasExistentes.map(tarea => tarea.nombre)

    // Crear tareas para los items seleccionados
    const tareasCreadas = []
    for (const item of servicioItems) {
      // Verificar que no exista ya una tarea con este nombre
      if (nombresExistentes.includes(item.nombre)) {
        continue // Saltar este item
      }

      const nuevaTarea = await prisma.cotizacionTarea.create({
        data: {
          id: `cot-tarea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cotizacionActividadId: validatedData.actividadId,
          cotizacionServicioItemId: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion || `Tarea generada desde item ${item.nombre}`,
          fechaInicio: actividad.fechaInicioComercial || new Date(),
          fechaFin: actividad.fechaFinComercial || new Date(),
          horasEstimadas: item.horaTotal,
          estado: 'pendiente',
          prioridad: 'media',
          updatedAt: new Date()
        }
      })

      tareasCreadas.push({
        ...nuevaTarea,
        servicioItemId: item.id,
        horasTotal: item.horaTotal
      })
    }

    return NextResponse.json({
      success: true,
      data: tareasCreadas,
      message: `Se importaron ${tareasCreadas.length} tareas exitosamente`,
      skipped: servicioItems.length - tareasCreadas.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error importando tareas:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ GET /api/cotizaciones/[id]/cronograma/importar/tareas - Obtener items disponibles para importar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const actividadId = searchParams.get('actividadId')

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver el cronograma' }, { status: 403 })
    }

    if (!actividadId) {
      return NextResponse.json({
        error: 'Parámetro actividadId es requerido'
      }, { status: 400 })
    }

    // Verificar que la actividad existe
    const actividad = await prisma.cotizacionActividad.findFirst({
      where: {
        id: actividadId,
        ...(await getActividadParentCondition(id, actividadId))
      }
    })

    if (!actividad) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    // Obtener tareas existentes en la actividad para filtrar duplicados
    const tareasExistentes = await prisma.cotizacionTarea.findMany({
      where: {
        cotizacionActividadId: actividadId
      },
      select: { nombre: true }
    })

    const nombresTareasExistentes = tareasExistentes.map(tarea => tarea.nombre)

    // Obtener todos los items de servicio de la cotización
    const servicioItems = await prisma.cotizacionServicioItem.findMany({
      where: {
        cotizacionServicio: {
          cotizacionId: id
        }
      },
      include: {
        cotizacionServicio: true,
        recurso: true,
        unidadServicio: true
      }
    })

    // Filtrar items que no tienen tarea ya creada
    const itemsDisponibles = servicioItems
      .filter(item => !nombresTareasExistentes.includes(item.nombre))
      .map(item => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        servicioNombre: item.cotizacionServicio.nombre,
        edtId: item.edtId,
        recursoNombre: item.recurso.nombre,
        unidadServicioNombre: item.unidadServicio.nombre,
        horaTotal: item.horaTotal,
        cantidad: item.cantidad
      }))

    return NextResponse.json({
      success: true,
      data: itemsDisponibles
    })

  } catch (error) {
    console.error('❌ Error obteniendo items disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función auxiliar para obtener condición de padre de actividad
async function getActividadParentCondition(cotizacionId: string, actividadId: string) {
  // Verificar si la actividad pertenece a un EDT de esta cotización
  const actividad = await prisma.cotizacionActividad.findUnique({
    where: { id: actividadId },
    select: {
      cotizacionEdtId: true
    }
  })

  if (!actividad) return {}

  if (actividad.cotizacionEdtId) {
    return {
      cotizacionEdt: {
        cotizacionId
      }
    }
  }

  return {}
}