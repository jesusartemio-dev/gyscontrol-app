// ===================================================
// API: Desplazar fechas del cronograma
// POST /api/cotizaciones/[id]/cronograma/desplazar-fechas
// Cuando cambia fechaInicio, desplaza todas las fechas del cronograma
// ===================================================

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const desplazarSchema = z.object({
  nuevaFechaInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha inválida'
  })
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nuevaFechaInicio } = desplazarSchema.parse(body)

    // Parsear fecha como mediodía UTC para evitar problemas de timezone
    // new Date("2026-04-28") crea UTC midnight, que en Peru (UTC-5) es April 27 7pm
    // Usamos mediodía UTC para que cualquier zona horaria muestre el día correcto
    const [year, month, day] = nuevaFechaInicio.split('-').map(Number)
    const nuevaFecha = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    console.log(`📅 Fecha solicitada: ${nuevaFechaInicio} -> ${nuevaFecha.toISOString()}`)

    // Obtener cotización actual
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: {
        id: true,
        fechaInicio: true,
        comercialId: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = tieneRol(session, ['admin', 'gerente', 'comercial']) || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    // SIEMPRE usar la fecha más temprana del cronograma real como referencia
    // Esto asegura que el cronograma se alinee con la nueva fecha de inicio
    const faseMasTemprana = await prisma.cotizacionFase.findFirst({
      where: {
        cotizacionId,
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
      console.log(`📅 Fecha de referencia (fase "${faseMasTemprana.nombre}"): ${fechaAnterior.toISOString().split('T')[0]}`)
    } else {
      // No hay cronograma con fechas, solo guardar la nueva fecha de inicio
      await prisma.cotizacion.update({
        where: { id: cotizacionId },
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

    console.log(`🔄 Desplazando cronograma por ${diasDesplazamiento} días`)
    console.log(`   Fecha anterior: ${fechaAnterior.toISOString().split('T')[0]}`)
    console.log(`   Nueva fecha: ${nuevaFecha.toISOString().split('T')[0]}`)

    // Iniciar transacción para desplazar todas las fechas
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar fechaInicio de la cotización
      await tx.cotizacion.update({
        where: { id: cotizacionId },
        data: { fechaInicio: nuevaFecha }
      })

      // 2. Desplazar fechas de las FASES
      const fases = await tx.cotizacionFase.findMany({
        where: { cotizacionId }
      })

      for (const fase of fases) {
        const updates: any = {}

        if (fase.fechaInicioPlan) {
          updates.fechaInicioPlan = new Date(new Date(fase.fechaInicioPlan).getTime() + diferenciaMs).toISOString()
        }
        if (fase.fechaFinPlan) {
          updates.fechaFinPlan = new Date(new Date(fase.fechaFinPlan).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.cotizacionFase.update({
            where: { id: fase.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${fases.length} fases desplazadas`)

      // 3. Desplazar fechas de los EDTs
      const edts = await tx.cotizacionEdt.findMany({
        where: { cotizacionId }
      })

      for (const edt of edts) {
        const updates: any = {}

        if (edt.fechaInicioComercial) {
          updates.fechaInicioComercial = new Date(new Date(edt.fechaInicioComercial).getTime() + diferenciaMs).toISOString()
        }
        if (edt.fechaFinComercial) {
          updates.fechaFinComercial = new Date(new Date(edt.fechaFinComercial).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.cotizacionEdt.update({
            where: { id: edt.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${edts.length} EDTs desplazados`)

      // 4. Desplazar fechas de las ACTIVIDADES
      const actividades = await tx.cotizacionActividad.findMany({
        where: {
          cotizacionEdt: { cotizacionId }
        }
      })

      for (const actividad of actividades) {
        const updates: any = {}

        if (actividad.fechaInicioComercial) {
          updates.fechaInicioComercial = new Date(new Date(actividad.fechaInicioComercial).getTime() + diferenciaMs).toISOString()
        }
        if (actividad.fechaFinComercial) {
          updates.fechaFinComercial = new Date(new Date(actividad.fechaFinComercial).getTime() + diferenciaMs).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await tx.cotizacionActividad.update({
            where: { id: actividad.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${actividades.length} actividades desplazadas`)

      // 5. Desplazar fechas de las TAREAS
      const tareas = await tx.cotizacionTarea.findMany({
        where: {
          cotizacionActividad: {
            cotizacionEdt: { cotizacionId }
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
          await tx.cotizacionTarea.update({
            where: { id: tarea.id },
            data: updates
          })
        }
      }

      console.log(`   ✅ ${tareas.length} tareas desplazadas`)

      // 6. Recalcular fechaFin de la cotización basada en la fase más tardía
      const fasesActualizadas = await tx.cotizacionFase.findMany({
        where: { cotizacionId },
        orderBy: { fechaFinPlan: 'desc' },
        take: 1
      })

      if (fasesActualizadas.length > 0 && fasesActualizadas[0].fechaFinPlan) {
        await tx.cotizacion.update({
          where: { id: cotizacionId },
          data: { fechaFin: new Date(fasesActualizadas[0].fechaFinPlan) }
        })
        console.log(`   ✅ fechaFin actualizada: ${fasesActualizadas[0].fechaFinPlan}`)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Cronograma desplazado exitosamente`,
      desplazamiento: diasDesplazamiento,
      nuevaFechaInicio: nuevaFecha.toISOString().split('T')[0]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error desplazando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
