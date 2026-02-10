// ===================================================
// API: Desplazar fechas del cronograma de proyecto
// POST /api/proyectos/[id]/cronograma/desplazar-fechas
// Cuando cambia fechaInicio, desplaza todas las fechas del cronograma
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

export const dynamic = 'force-dynamic'

const desplazarSchema = z.object({
  nuevaFechaInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha inválida'
  }),
  cronogramaId: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nuevaFechaInicio, cronogramaId } = desplazarSchema.parse(body)

    // Check cronograma lock
    if (cronogramaId && await isCronogramaBloqueado(cronogramaId)) {
      return cronogramaBloqueadoResponse()
    }

    // Parsear fecha como mediodía UTC para evitar problemas de timezone
    const [year, month, day] = nuevaFechaInicio.split('-').map(Number)
    const nuevaFecha = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    console.log(`📅 [PROYECTO] Fecha solicitada: ${nuevaFechaInicio} -> ${nuevaFecha.toISOString()}`)

    // Obtener proyecto actual
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        fechaInicio: true,
        gestorId: true,
        comercialId: true
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = proyecto.gestorId === session.user.id || proyecto.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'proyectos' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    // Determinar el cronograma a usar
    let targetCronogramaId = cronogramaId
    if (!targetCronogramaId) {
      // Buscar el primer cronograma editable (no comercial)
      const cronograma = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId,
          tipo: { not: 'comercial' }
        },
        orderBy: { createdAt: 'asc' }
      })
      targetCronogramaId = cronograma?.id
    }

    // SIEMPRE usar la fecha más temprana del cronograma real como referencia
    const faseMasTemprana = await prisma.proyectoFase.findFirst({
      where: {
        proyectoId,
        ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {}),
        fechaInicioPlan: { not: null }
      },
      orderBy: { fechaInicioPlan: 'asc' }
    })

    let fechaAnterior: Date | null = null

    if (faseMasTemprana?.fechaInicioPlan) {
      // Usar la fecha de la primera fase como referencia, normalizada a mediodía UTC
      const fechaDB = new Date(faseMasTemprana.fechaInicioPlan)
      fechaAnterior = new Date(Date.UTC(
        fechaDB.getUTCFullYear(),
        fechaDB.getUTCMonth(),
        fechaDB.getUTCDate(),
        12, 0, 0
      ))
      console.log(`📅 [PROYECTO] Fecha de referencia (fase "${faseMasTemprana.nombre}"): ${fechaAnterior.toISOString().split('T')[0]}`)
    } else {
      // No hay cronograma con fechas, solo guardar la nueva fecha de inicio
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { fechaInicio: nuevaFecha }
      })

      return NextResponse.json({
        success: true,
        message: 'Fecha de inicio establecida (no había cronograma previo)',
        desplazamiento: 0
      })
    }

    // Calcular diferencia en milisegundos
    const diferenciaMs = nuevaFecha.getTime() - fechaAnterior.getTime()

    // Si no hay diferencia, no hacer nada
    if (diferenciaMs === 0) {
      return NextResponse.json({
        success: true,
        message: 'Sin cambios - la fecha es la misma',
        desplazamiento: 0
      })
    }

    const diasDesplazamiento = Math.round(diferenciaMs / (24 * 60 * 60 * 1000))

    console.log(`🔄 [PROYECTO] Desplazando cronograma por ${diasDesplazamiento} días`)
    console.log(`   Fecha anterior: ${fechaAnterior.toISOString().split('T')[0]}`)
    console.log(`   Nueva fecha: ${nuevaFecha.toISOString().split('T')[0]}`)

    // Iniciar transacción para desplazar todas las fechas
    let nuevaFechaFin: string | null = null

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar fechaInicio del proyecto
      await tx.proyecto.update({
        where: { id: proyectoId },
        data: { fechaInicio: nuevaFecha }
      })

      // 2. Desplazar fechas de las FASES
      const fases = await tx.proyectoFase.findMany({
        where: {
          proyectoId,
          ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {})
        }
      })

      for (const fase of fases) {
        const updates: any = {}

        if (fase.fechaInicioPlan) {
          updates.fechaInicioPlan = new Date(new Date(fase.fechaInicioPlan).getTime() + diferenciaMs).toISOString()
        }
        if (fase.fechaFinPlan) {
          updates.fechaFinPlan = new Date(new Date(fase.fechaFinPlan).getTime() + diferenciaMs).toISOString()
        }
        // También actualizar fechas reales si existen
        if (fase.fechaInicioReal) {
          updates.fechaInicioReal = new Date(new Date(fase.fechaInicioReal).getTime() + diferenciaMs).toISOString()
        }
        if (fase.fechaFinReal) {
          updates.fechaFinReal = new Date(new Date(fase.fechaFinReal).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.proyectoFase.update({
            where: { id: fase.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${fases.length} fases desplazadas`)

      // 3. Desplazar fechas de los EDTs
      const edts = await tx.proyectoEdt.findMany({
        where: {
          proyectoId,
          ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {})
        }
      })

      for (const edt of edts) {
        const updates: any = {}

        if (edt.fechaInicioPlan) {
          updates.fechaInicioPlan = new Date(new Date(edt.fechaInicioPlan).getTime() + diferenciaMs).toISOString()
        }
        if (edt.fechaFinPlan) {
          updates.fechaFinPlan = new Date(new Date(edt.fechaFinPlan).getTime() + diferenciaMs).toISOString()
        }
        if (edt.fechaInicioReal) {
          updates.fechaInicioReal = new Date(new Date(edt.fechaInicioReal).getTime() + diferenciaMs).toISOString()
        }
        if (edt.fechaFinReal) {
          updates.fechaFinReal = new Date(new Date(edt.fechaFinReal).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.proyectoEdt.update({
            where: { id: edt.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${edts.length} EDTs desplazados`)

      // 4. Desplazar fechas de las ACTIVIDADES
      const actividades = await tx.proyectoActividad.findMany({
        where: {
          ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {}),
          proyectoEdt: { proyectoId }
        }
      })

      for (const actividad of actividades) {
        const updates: any = {}

        if (actividad.fechaInicioPlan) {
          updates.fechaInicioPlan = new Date(new Date(actividad.fechaInicioPlan).getTime() + diferenciaMs).toISOString()
        }
        if (actividad.fechaFinPlan) {
          updates.fechaFinPlan = new Date(new Date(actividad.fechaFinPlan).getTime() + diferenciaMs).toISOString()
        }
        if (actividad.fechaInicioReal) {
          updates.fechaInicioReal = new Date(new Date(actividad.fechaInicioReal).getTime() + diferenciaMs).toISOString()
        }
        if (actividad.fechaFinReal) {
          updates.fechaFinReal = new Date(new Date(actividad.fechaFinReal).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.proyectoActividad.update({
            where: { id: actividad.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${actividades.length} actividades desplazadas`)

      // 5. Desplazar fechas de las TAREAS
      const tareas = await tx.proyectoTarea.findMany({
        where: {
          ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {}),
          proyectoActividad: {
            proyectoEdt: { proyectoId }
          }
        }
      })

      for (const tarea of tareas) {
        const updates: any = {}

        if (tarea.fechaInicio) {
          updates.fechaInicio = new Date(new Date(tarea.fechaInicio).getTime() + diferenciaMs).toISOString()
        }
        if (tarea.fechaFin) {
          updates.fechaFin = new Date(new Date(tarea.fechaFin).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.proyectoTarea.update({
            where: { id: tarea.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${tareas.length} tareas desplazadas`)

      // 6. Recalcular fechaFin del proyecto basada en la fase más tardía
      const fasesActualizadas = await tx.proyectoFase.findMany({
        where: {
          proyectoId,
          ...(targetCronogramaId ? { proyectoCronogramaId: targetCronogramaId } : {})
        },
        orderBy: { fechaFinPlan: 'desc' },
        take: 1
      })

      if (fasesActualizadas.length > 0 && fasesActualizadas[0].fechaFinPlan) {
        const fechaFinDate = new Date(fasesActualizadas[0].fechaFinPlan)
        await tx.proyecto.update({
          where: { id: proyectoId },
          data: { fechaFin: fechaFinDate }
        })
        nuevaFechaFin = fechaFinDate.toISOString().split('T')[0]
        console.log(`   ✅ fechaFin actualizada: ${nuevaFechaFin}`)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Cronograma desplazado exitosamente`,
      desplazamiento: diasDesplazamiento,
      nuevaFechaInicio: nuevaFecha.toISOString().split('T')[0],
      nuevaFechaFin
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ [PROYECTO] Error desplazando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
