// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/tree/[nodeId]
// 🔧 Descripción: Operaciones CRUD para nodos individuales del árbol
// ✅ PUT: Actualizar nodo, DELETE: Eliminar nodo
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  obtenerCalendarioLaboral,
  calcularFechaFinConCalendario,
  ajustarFechaADiaLaborable
} from '@/lib/utils/calendarioLaboral'

export const dynamic = 'force-dynamic'

// Schema para actualizar nodo
const updateNodeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicioComercial: z.string().optional(),
  fechaFinComercial: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  horasEstimadas: z.union([z.number().min(0), z.string()]).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  estado: z.string().optional(),
  posicionamiento: z.enum(['inicio_padre', 'despues_ultima']).optional()
})

// ✅ PUT /api/cotizaciones/[id]/cronograma/tree/[nodeId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id, nodeId } = await params
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
    const validatedData = updateNodeSchema.parse(body)

    // Extraer tipo y ID real del nodeId (formato: "tipo-id")
    const [nodeType, realId] = nodeId.split('-', 2)

    if (!nodeType || !realId) {
      return NextResponse.json({ error: 'Formato de nodeId inválido' }, { status: 400 })
    }

    // ✅ GYS-GEN-12: Obtener calendario laboral para recálculos
    const calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
    if (!calendarioLaboral) {
      return NextResponse.json({
        error: 'No hay calendario laboral configurado para actualizar fechas'
      }, { status: 400 })
    }

    // Actualizar según el tipo de nodo
    let updatedNode

    switch (nodeType) {
      case 'fase':
        updatedNode = await prisma.cotizacionFase.update({
          where: { id: realId, cotizacionId: id },
          data: {
            nombre: validatedData.nombre,
            descripcion: validatedData.descripcion,
            // Fases no tienen campo 'estado', pero pueden tener fechas plan
            // Priorizar fechaInicioPlan/fechaFinPlan sobre fechaInicioComercial/fechaFinComercial
            ...(validatedData.fechaInicioPlan && validatedData.fechaInicioPlan.trim() && {
              fechaInicioPlan: new Date(validatedData.fechaInicioPlan)
            }),
            ...(validatedData.fechaFinPlan && validatedData.fechaFinPlan.trim() && {
              fechaFinPlan: new Date(validatedData.fechaFinPlan)
            }),
            // Fallback a fechas comerciales si no hay fechas plan
            ...(!validatedData.fechaInicioPlan && validatedData.fechaInicioComercial && validatedData.fechaInicioComercial.trim() && {
              fechaInicioPlan: new Date(validatedData.fechaInicioComercial)
            }),
            ...(!validatedData.fechaFinPlan && validatedData.fechaFinComercial && validatedData.fechaFinComercial.trim() && {
              fechaFinPlan: new Date(validatedData.fechaFinComercial)
            })
          }
        })
        break

      case 'edt':
        updatedNode = await prisma.cotizacionEdt.update({
          where: { id: realId, cotizacionId: id },
          data: {
            nombre: validatedData.nombre,
            descripcion: validatedData.descripcion,
            ...(validatedData.horasEstimadas !== undefined && {
              horasEstimadas: typeof validatedData.horasEstimadas === 'string'
                ? (validatedData.horasEstimadas ? parseFloat(validatedData.horasEstimadas) : undefined)
                : validatedData.horasEstimadas
            }),
            prioridad: validatedData.prioridad as any,
            ...(validatedData.estado && ['planificado', 'pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada'].includes(validatedData.estado) && {
              estado: validatedData.estado as any
            })
          }
        })
        break


      case 'actividad':
        updatedNode = await prisma.cotizacionActividad.update({
          where: { id: realId },
          data: {
            nombre: validatedData.nombre,
            descripcion: validatedData.descripcion,
            fechaInicioComercial: (validatedData.fechaInicioComercial && validatedData.fechaInicioComercial.trim())
              ? new Date(validatedData.fechaInicioComercial) : undefined,
            fechaFinComercial: (validatedData.fechaFinComercial && validatedData.fechaFinComercial.trim())
              ? new Date(validatedData.fechaFinComercial) : undefined,
            ...(validatedData.horasEstimadas !== undefined && {
              horasEstimadas: typeof validatedData.horasEstimadas === 'string'
                ? (validatedData.horasEstimadas ? parseFloat(validatedData.horasEstimadas) : undefined)
                : validatedData.horasEstimadas
            }),
            prioridad: validatedData.prioridad,
            ...(validatedData.estado && ['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada'].includes(validatedData.estado) && {
              estado: validatedData.estado as any
            })
          }
        })
        break

      case 'tarea':
        updatedNode = await prisma.cotizacionTarea.update({
          where: { id: realId },
          data: {
            nombre: validatedData.nombre,
            descripcion: validatedData.descripcion,
            fechaInicio: (validatedData.fechaInicioComercial && validatedData.fechaInicioComercial.trim())
              ? new Date(validatedData.fechaInicioComercial) : undefined,
            fechaFin: (validatedData.fechaFinComercial && validatedData.fechaFinComercial.trim())
              ? new Date(validatedData.fechaFinComercial) : undefined,
            ...(validatedData.horasEstimadas !== undefined && {
              horasEstimadas: typeof validatedData.horasEstimadas === 'string'
                ? (validatedData.horasEstimadas ? parseFloat(validatedData.horasEstimadas) : undefined)
                : validatedData.horasEstimadas
            }),
            prioridad: validatedData.prioridad,
            ...(validatedData.estado && ['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada'].includes(validatedData.estado) && {
              estado: validatedData.estado as any
            })
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    // ✅ GYS-GEN-12: Recalcular fechas de padres e hijos después de la actualización
    await recalcularFechasPostActualizacion(id, nodeType, realId, calendarioLaboral)

    return NextResponse.json({
      success: true,
      data: updatedNode,
      message: 'Nodo actualizado exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error actualizando nodo:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ DELETE /api/cotizaciones/[id]/cronograma/tree/[nodeId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id, nodeId } = await params
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

    // Extraer tipo y ID real del nodeId (formato: "tipo-id")
    const [nodeType, realId] = nodeId.split('-', 2)

    if (!nodeType || !realId) {
      return NextResponse.json({ error: 'Formato de nodeId inválido' }, { status: 400 })
    }

    // Eliminar según el tipo de nodo
    switch (nodeType) {
      case 'fase':
        // ✅ ELIMINACIÓN EN CASCADA: Eliminar fase y todos sus elementos dependientes
        // 1. Obtener la fase con sus EDTs, actividades y tareas
        const faseToDelete = await prisma.cotizacionFase.findFirst({
          where: { id: realId, cotizacionId: id },
          include: {
            cotizacionEdt: {
              include: {
                cotizacionActividad: {
                  include: {
                    cotizacionTarea: true
                  }
                }
              }
            }
          }
        })

        if (!faseToDelete) {
          return NextResponse.json({
            error: 'Fase no encontrada o no pertenece a esta cotización'
          }, { status: 404 })
        }

        // 2. Eliminar tareas de todas las actividades de todos los EDTs de la fase
        for (const edt of faseToDelete.cotizacionEdt) {
          for (const actividad of edt.cotizacionActividad) {
            await prisma.cotizacionTarea.deleteMany({
              where: { cotizacionActividadId: actividad.id }
            })
          }
        }

        // 3. Eliminar actividades de todos los EDTs de la fase
        for (const edt of faseToDelete.cotizacionEdt) {
          await prisma.cotizacionActividad.deleteMany({
            where: { cotizacionEdtId: edt.id }
          })
        }

        // 4. Eliminar EDTs de la fase
        await prisma.cotizacionEdt.deleteMany({
          where: { cotizacionFaseId: realId }
        })

        // 5. Finalmente eliminar la fase
        await prisma.cotizacionFase.delete({
          where: { id: realId, cotizacionId: id }
        })
        break

      case 'edt':
        await prisma.cotizacionEdt.delete({
          where: { id: realId, cotizacionId: id }
        })
        break


      case 'actividad':
        await prisma.cotizacionActividad.delete({
          where: { id: realId }
        })
        break

      case 'tarea':
        await prisma.cotizacionTarea.delete({
          where: { id: realId }
        })
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Nodo eliminado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando nodo:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ GYS-GEN-12: Función para recalcular fechas después de actualizar un nodo
async function recalcularFechasPostActualizacion(
  cotizacionId: string,
  nodeType: string,
  nodeId: string,
  calendarioLaboral: any
): Promise<void> {
  console.log(`🔄 GYS-GEN-12: Recalculando fechas después de actualizar ${nodeType} ${nodeId}`)

  if (nodeType === 'fase') {
    // Si se actualizó una fase, recalcular fechas de sus EDTs
    const fase = await prisma.cotizacionFase.findUnique({
      where: { id: nodeId },
      include: { cotizacionEdt: true }
    })

    if (fase && fase.cotizacionEdt.length > 0 && fase.fechaInicioPlan && fase.fechaFinPlan) {
      // Redistribuir EDTs dentro de la nueva duración de la fase
      const faseInicio = new Date(fase.fechaInicioPlan)
      const faseFin = new Date(fase.fechaFinPlan)
      const numEdts = fase.cotizacionEdt.length
      const diasPorEdt = Math.max(1, Math.floor((faseFin.getTime() - faseInicio.getTime()) / (24 * 60 * 60 * 1000) / numEdts))

      let fechaActual = new Date(faseInicio)

      for (const edt of fase.cotizacionEdt) {
        const fechaInicioEdt = ajustarFechaADiaLaborable(new Date(fechaActual), calendarioLaboral)
        const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, diasPorEdt * calendarioLaboral.horasPorDia, calendarioLaboral)

        await prisma.cotizacionEdt.update({
          where: { id: edt.id },
          data: {
            fechaInicioComercial: fechaInicioEdt.toISOString(),
            fechaFinComercial: fechaFinEdt.toISOString()
          }
        })

        fechaActual.setDate(fechaActual.getDate() + diasPorEdt + 1)
      }
    }
  } else if (nodeType === 'edt') {
    // Si se actualizó un EDT, recalcular fechas de sus actividades
    const edt = await prisma.cotizacionEdt.findUnique({
      where: { id: nodeId },
      include: { cotizacionActividad: true }
    })

    if (edt && edt.cotizacionActividad.length > 0 && edt.fechaInicioComercial && edt.fechaFinComercial) {
      // Redistribuir actividades dentro de la nueva duración del EDT
      const edtInicio = new Date(edt.fechaInicioComercial)
      const edtFin = new Date(edt.fechaFinComercial)
      const numActividades = edt.cotizacionActividad.length
      const diasPorActividad = Math.max(1, Math.floor((edtFin.getTime() - edtInicio.getTime()) / (24 * 60 * 60 * 1000) / numActividades))

      let fechaActual = new Date(edtInicio)

      for (const actividad of edt.cotizacionActividad) {
        const fechaInicioActividad = ajustarFechaADiaLaborable(new Date(fechaActual), calendarioLaboral)
        const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, diasPorActividad * calendarioLaboral.horasPorDia, calendarioLaboral)

        await prisma.cotizacionActividad.update({
          where: { id: actividad.id },
          data: {
            fechaInicioComercial: fechaInicioActividad.toISOString(),
            fechaFinComercial: fechaFinActividad.toISOString()
          }
        })

        fechaActual.setDate(fechaActual.getDate() + diasPorActividad + 1)
      }
    }
  } else if (nodeType === 'actividad') {
    // Si se actualizó una actividad, recalcular fechas de sus tareas
    const actividad = await prisma.cotizacionActividad.findUnique({
      where: { id: nodeId },
      include: { cotizacionTarea: true }
    })

    if (actividad && actividad.cotizacionTarea.length > 0 && actividad.fechaInicioComercial && actividad.fechaFinComercial) {
      // Redistribuir tareas dentro de la nueva duración de la actividad
      const actividadInicio = new Date(actividad.fechaInicioComercial)
      const actividadFin = new Date(actividad.fechaFinComercial)
      const numTareas = actividad.cotizacionTarea.length
      const diasPorTarea = Math.max(1, Math.floor((actividadFin.getTime() - actividadInicio.getTime()) / (24 * 60 * 60 * 1000) / numTareas))

      let fechaActual = new Date(actividadInicio)

      for (const tarea of actividad.cotizacionTarea) {
        const fechaInicioTarea = ajustarFechaADiaLaborable(new Date(fechaActual), calendarioLaboral)
        const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, diasPorTarea * calendarioLaboral.horasPorDia, calendarioLaboral)

        await prisma.cotizacionTarea.update({
          where: { id: tarea.id },
          data: {
            fechaInicio: fechaInicioTarea.toISOString(),
            fechaFin: fechaFinTarea.toISOString()
          }
        })

        fechaActual.setDate(fechaActual.getDate() + diasPorTarea + 1)
      }
    }
  }
  // Para tareas, no hay hijos que recalcular
}