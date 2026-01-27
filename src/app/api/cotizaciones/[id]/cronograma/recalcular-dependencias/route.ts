// ===================================================
// API: Recalcular fechas según dependencias
// POST /api/cotizaciones/[id]/cronograma/recalcular-dependencias
// Ajusta las fechas de las tareas basándose en las dependencias creadas
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  obtenerCalendarioLaboral,
  calcularFechaFinConCalendario,
  ajustarFechaADiaLaborable
} from '@/lib/utils/calendarioLaboral'

export const dynamic = 'force-dynamic'

interface TareaConDependencias {
  id: string
  nombre: string
  fechaInicio: Date | null
  fechaFin: Date | null
  horasEstimadas: number | null
  actividadId: string
  dependenciasComoDependiente: {
    id: string
    tipo: string
    lagMinutos: number
    tareaOrigen: {
      id: string
      nombre: string
      fechaInicio: Date | null
      fechaFin: Date | null
    }
  }[]
}

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

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        calendarioLaboral: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    // Obtener calendario laboral
    let calendarioLaboral = cotizacion.calendarioLaboral
    if (!calendarioLaboral) {
      calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
    }

    if (!calendarioLaboral) {
      return NextResponse.json({
        error: 'No hay calendario laboral configurado'
      }, { status: 400 })
    }

    // Obtener todas las tareas de la cotización con sus dependencias
    const tareas = await prisma.cotizacionTarea.findMany({
      where: {
        cotizacionActividad: {
          cotizacionEdt: { cotizacionId }
        }
      },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionEdt: true
          }
        },
        dependenciasComoDependiente: {
          include: {
            tareaOrigen: true
          }
        }
      }
    })

    if (tareas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay tareas para recalcular',
        tareasActualizadas: 0
      })
    }

    // Obtener todas las dependencias
    const dependencias = await prisma.cotizacionDependenciasTarea.findMany({
      where: {
        tareaOrigenId: { in: tareas.map(t => t.id) }
      }
    })

    if (dependencias.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay dependencias para procesar',
        tareasActualizadas: 0
      })
    }

    console.log(`🔄 Recalculando ${tareas.length} tareas con ${dependencias.length} dependencias`)

    // Crear mapa de tareas para acceso rápido
    const tareasMap = new Map(tareas.map(t => [t.id, t]))

    // Ordenamiento topológico: procesar tareas sin dependencias primero
    const tareasOrdenadas = ordenarTopologicamente(tareas, dependencias)

    let tareasActualizadas = 0
    const cambios: { tarea: string; fechaAnterior: string; fechaNueva: string }[] = []

    // Procesar cada tarea en orden topológico
    for (const tareaId of tareasOrdenadas) {
      const tarea = tareasMap.get(tareaId)
      if (!tarea) continue

      // Obtener dependencias entrantes de esta tarea
      const depsEntrantes = dependencias.filter(d => d.tareaDependienteId === tareaId)

      if (depsEntrantes.length === 0) continue // Sin dependencias, mantener fecha actual

      // Calcular la fecha de inicio mínima basada en todas las dependencias
      let fechaInicioMinima: Date | null = null

      for (const dep of depsEntrantes) {
        const tareaOrigen = tareasMap.get(dep.tareaOrigenId)
        if (!tareaOrigen) continue

        let fechaRequerida: Date | null = null

        switch (dep.tipo) {
          case 'finish_to_start':
            // La tarea dependiente inicia cuando la origen termina
            if (tareaOrigen.fechaFin) {
              fechaRequerida = new Date(tareaOrigen.fechaFin)
              // Agregar 1 día (FS+1) para que inicie el día siguiente
              fechaRequerida.setDate(fechaRequerida.getDate() + 1)
            }
            break

          case 'start_to_start':
            // La tarea dependiente inicia cuando la origen inicia
            if (tareaOrigen.fechaInicio) {
              fechaRequerida = new Date(tareaOrigen.fechaInicio)
            }
            break

          case 'finish_to_finish':
            // La tarea dependiente termina cuando la origen termina
            // Calcular hacia atrás desde la fecha fin requerida
            if (tareaOrigen.fechaFin && tarea.horasEstimadas) {
              const duracionDias = Math.ceil(Number(tarea.horasEstimadas) / (calendarioLaboral.horasPorDia || 8))
              fechaRequerida = new Date(tareaOrigen.fechaFin)
              fechaRequerida.setDate(fechaRequerida.getDate() - duracionDias)
            }
            break

          case 'start_to_finish':
            // La tarea dependiente termina cuando la origen inicia
            if (tareaOrigen.fechaInicio && tarea.horasEstimadas) {
              const duracionDias = Math.ceil(Number(tarea.horasEstimadas) / (calendarioLaboral.horasPorDia || 8))
              fechaRequerida = new Date(tareaOrigen.fechaInicio)
              fechaRequerida.setDate(fechaRequerida.getDate() - duracionDias)
            }
            break
        }

        // Agregar lag si existe
        if (fechaRequerida && dep.lagMinutos > 0) {
          const lagDias = Math.ceil(dep.lagMinutos / (60 * (calendarioLaboral.horasPorDia || 8)))
          fechaRequerida.setDate(fechaRequerida.getDate() + lagDias)
        }

        // Ajustar a día laborable
        if (fechaRequerida) {
          fechaRequerida = ajustarFechaADiaLaborable(fechaRequerida, calendarioLaboral)

          // Mantener la fecha más tardía (respetar todas las dependencias)
          if (!fechaInicioMinima || fechaRequerida > fechaInicioMinima) {
            fechaInicioMinima = fechaRequerida
          }
        }
      }

      // Si encontramos una fecha mínima y es diferente a la actual, actualizar
      if (fechaInicioMinima) {
        const fechaActual = tarea.fechaInicio ? new Date(tarea.fechaInicio) : null
        const necesitaActualizar = !fechaActual ||
          fechaInicioMinima.toISOString().split('T')[0] !== fechaActual.toISOString().split('T')[0]

        if (necesitaActualizar) {
          // Calcular nueva fecha fin basada en horas estimadas
          const horasEstimadas = Number(tarea.horasEstimadas) || 8 // Default 1 día
          const nuevaFechaFin = calcularFechaFinConCalendario(
            fechaInicioMinima,
            horasEstimadas,
            calendarioLaboral
          )

          // Guardar cambio para log
          cambios.push({
            tarea: tarea.nombre,
            fechaAnterior: fechaActual?.toISOString().split('T')[0] || 'Sin fecha',
            fechaNueva: fechaInicioMinima.toISOString().split('T')[0]
          })

          // Actualizar en BD
          await prisma.cotizacionTarea.update({
            where: { id: tarea.id },
            data: {
              fechaInicio: fechaInicioMinima,
              fechaFin: nuevaFechaFin
            }
          })

          // Actualizar en el mapa local para que las siguientes tareas usen las fechas actualizadas
          tarea.fechaInicio = fechaInicioMinima
          tarea.fechaFin = nuevaFechaFin

          tareasActualizadas++
          console.log(`   ✅ ${tarea.nombre}: ${fechaActual?.toISOString().split('T')[0] || 'null'} → ${fechaInicioMinima.toISOString().split('T')[0]}`)
        }
      }
    }

    // Roll-up: actualizar fechas de actividades, EDTs y fases
    await rollupFechas(cotizacionId)

    console.log(`🔄 Recálculo completado: ${tareasActualizadas} tareas actualizadas`)

    return NextResponse.json({
      success: true,
      message: `Recálculo completado`,
      tareasActualizadas,
      dependenciasProcesadas: dependencias.length,
      cambios
    })

  } catch (error) {
    console.error('❌ Error recalculando dependencias:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Ordenamiento topológico usando algoritmo de Kahn
function ordenarTopologicamente(
  tareas: any[],
  dependencias: any[]
): string[] {
  const grafo = new Map<string, string[]>()
  const gradoEntrada = new Map<string, number>()

  // Inicializar
  tareas.forEach(t => {
    grafo.set(t.id, [])
    gradoEntrada.set(t.id, 0)
  })

  // Construir grafo
  dependencias.forEach(dep => {
    const sucesores = grafo.get(dep.tareaOrigenId) || []
    sucesores.push(dep.tareaDependienteId)
    grafo.set(dep.tareaOrigenId, sucesores)

    const grado = gradoEntrada.get(dep.tareaDependienteId) || 0
    gradoEntrada.set(dep.tareaDependienteId, grado + 1)
  })

  // Cola de tareas sin dependencias
  const cola: string[] = []
  gradoEntrada.forEach((grado, tareaId) => {
    if (grado === 0) cola.push(tareaId)
  })

  const resultado: string[] = []

  while (cola.length > 0) {
    const tareaId = cola.shift()!
    resultado.push(tareaId)

    const sucesores = grafo.get(tareaId) || []
    sucesores.forEach(sucesorId => {
      const nuevoGrado = (gradoEntrada.get(sucesorId) || 1) - 1
      gradoEntrada.set(sucesorId, nuevoGrado)
      if (nuevoGrado === 0) {
        cola.push(sucesorId)
      }
    })
  }

  // Agregar tareas que no están en el grafo (sin dependencias)
  tareas.forEach(t => {
    if (!resultado.includes(t.id)) {
      resultado.push(t.id)
    }
  })

  return resultado
}

// Roll-up de fechas hacia arriba (Actividades → EDTs → Fases)
async function rollupFechas(cotizacionId: string) {
  console.log('🔄 Ejecutando roll-up de fechas...')

  // 1. Roll-up Actividades (desde tareas)
  const actividades = await prisma.cotizacionActividad.findMany({
    where: {
      cotizacionEdt: { cotizacionId }
    },
    include: {
      cotizacionTarea: true
    }
  })

  for (const actividad of actividades) {
    if (actividad.cotizacionTarea.length === 0) continue

    const fechasInicio = actividad.cotizacionTarea
      .filter(t => t.fechaInicio)
      .map(t => new Date(t.fechaInicio!))

    const fechasFin = actividad.cotizacionTarea
      .filter(t => t.fechaFin)
      .map(t => new Date(t.fechaFin!))

    if (fechasInicio.length > 0 && fechasFin.length > 0) {
      const minInicio = new Date(Math.min(...fechasInicio.map(d => d.getTime())))
      const maxFin = new Date(Math.max(...fechasFin.map(d => d.getTime())))

      await prisma.cotizacionActividad.update({
        where: { id: actividad.id },
        data: {
          fechaInicioComercial: minInicio,
          fechaFinComercial: maxFin
        }
      })
    }
  }

  // 2. Roll-up EDTs (desde actividades)
  const edts = await prisma.cotizacionEdt.findMany({
    where: { cotizacionId },
    include: {
      cotizacionActividad: true
    }
  })

  for (const edt of edts) {
    if (edt.cotizacionActividad.length === 0) continue

    const fechasInicio = edt.cotizacionActividad
      .filter(a => a.fechaInicioComercial)
      .map(a => new Date(a.fechaInicioComercial!))

    const fechasFin = edt.cotizacionActividad
      .filter(a => a.fechaFinComercial)
      .map(a => new Date(a.fechaFinComercial!))

    if (fechasInicio.length > 0 && fechasFin.length > 0) {
      const minInicio = new Date(Math.min(...fechasInicio.map(d => d.getTime())))
      const maxFin = new Date(Math.max(...fechasFin.map(d => d.getTime())))

      await prisma.cotizacionEdt.update({
        where: { id: edt.id },
        data: {
          fechaInicioComercial: minInicio,
          fechaFinComercial: maxFin
        }
      })
    }
  }

  // 3. Roll-up Fases (desde EDTs)
  const fases = await prisma.cotizacionFase.findMany({
    where: { cotizacionId },
    include: {
      cotizacionEdt: true
    }
  })

  for (const fase of fases) {
    if (fase.cotizacionEdt.length === 0) continue

    const fechasInicio = fase.cotizacionEdt
      .filter(e => e.fechaInicioComercial)
      .map(e => new Date(e.fechaInicioComercial!))

    const fechasFin = fase.cotizacionEdt
      .filter(e => e.fechaFinComercial)
      .map(e => new Date(e.fechaFinComercial!))

    if (fechasInicio.length > 0 && fechasFin.length > 0) {
      const minInicio = new Date(Math.min(...fechasInicio.map(d => d.getTime())))
      const maxFin = new Date(Math.max(...fechasFin.map(d => d.getTime())))

      await prisma.cotizacionFase.update({
        where: { id: fase.id },
        data: {
          fechaInicioPlan: minInicio,
          fechaFinPlan: maxFin
        }
      })
    }
  }

  // 4. Actualizar fechaFin de la cotización
  const fasesActualizadas = await prisma.cotizacionFase.findMany({
    where: { cotizacionId },
    orderBy: { fechaFinPlan: 'desc' },
    take: 1
  })

  if (fasesActualizadas.length > 0 && fasesActualizadas[0].fechaFinPlan) {
    await prisma.cotizacion.update({
      where: { id: cotizacionId },
      data: { fechaFin: fasesActualizadas[0].fechaFinPlan }
    })
  }

  console.log('✅ Roll-up de fechas completado')
}
