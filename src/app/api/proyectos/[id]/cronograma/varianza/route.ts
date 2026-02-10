import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

interface VarianzaEntidad {
  nombre: string
  nivel: 'fase' | 'edt' | 'actividad' | 'tarea'
  faseNombre?: string
  edtNombre?: string
  actividadNombre?: string
  fechaInicioPlan: string | null
  fechaFinPlan: string | null
  fechaInicioReal: string | null
  fechaFinReal: string | null
  deltaIniciosDias: number | null
  deltaFinDias: number | null
  horasPlan: number
  horasReales: number
  deltaHoras: number
  porcentajePlan: number
  porcentajeReal: number
}

interface VarianzaKPIs {
  spiGlobal: number
  porcentajeATiempo: number
  porcentajeRetrasadas: number
  porcentajeAdelantadas: number
  varianzaTotalDias: number
  varianzaTotalHoras: number
  totalEntidades: number
}

function diasEntre(fecha1: Date | null, fecha2: Date | null): number | null {
  if (!fecha1 || !fecha2) return null
  const diffMs = fecha2.getTime() - fecha1.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await context.params

    // Buscar cronograma baseline (planificación marcado como baseline)
    const baseline = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: 'planificacion',
        esBaseline: true
      },
      select: { id: true, nombre: true }
    })

    // Buscar cronograma de ejecución
    const ejecucion = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: 'ejecucion'
      },
      select: { id: true, nombre: true }
    })

    if (!baseline || !ejecucion) {
      return NextResponse.json({
        error: !baseline
          ? 'No existe un cronograma baseline (planificación marcado como línea base)'
          : 'No existe un cronograma de ejecución',
        disponible: false
      }, { status: 404 })
    }

    // Cargar árbol completo de ambos cronogramas
    const [baselineTree, ejecucionTree] = await Promise.all([
      cargarArbol(baseline.id),
      cargarArbol(ejecucion.id)
    ])

    // Matchear y calcular varianza
    const varianzas: VarianzaEntidad[] = []

    // Match por fases
    for (const fasePlan of baselineTree.fases) {
      const faseReal = ejecucionTree.fases.find(f => f.nombre === fasePlan.nombre)

      varianzas.push({
        nombre: fasePlan.nombre,
        nivel: 'fase',
        fechaInicioPlan: fasePlan.fechaInicioPlan?.toISOString() || null,
        fechaFinPlan: fasePlan.fechaFinPlan?.toISOString() || null,
        fechaInicioReal: faseReal?.fechaInicioReal?.toISOString() || faseReal?.fechaInicioPlan?.toISOString() || null,
        fechaFinReal: faseReal?.fechaFinReal?.toISOString() || faseReal?.fechaFinPlan?.toISOString() || null,
        deltaIniciosDias: diasEntre(
          fasePlan.fechaInicioPlan,
          faseReal?.fechaInicioReal || faseReal?.fechaInicioPlan || null
        ),
        deltaFinDias: diasEntre(
          fasePlan.fechaFinPlan,
          faseReal?.fechaFinReal || faseReal?.fechaFinPlan || null
        ),
        horasPlan: 0,
        horasReales: 0,
        deltaHoras: 0,
        porcentajePlan: 100,
        porcentajeReal: faseReal?.porcentajeAvance || 0
      })

      // Match EDTs dentro de la fase
      for (const edtPlan of fasePlan.edts) {
        const edtReal = faseReal?.edts.find(e => e.nombre === edtPlan.nombre)

        const horasPlan = Number(edtPlan.horasPlan || 0)
        const horasReales = Number(edtReal?.horasReales || 0)

        varianzas.push({
          nombre: edtPlan.nombre,
          nivel: 'edt',
          faseNombre: fasePlan.nombre,
          fechaInicioPlan: edtPlan.fechaInicioPlan?.toISOString() || null,
          fechaFinPlan: edtPlan.fechaFinPlan?.toISOString() || null,
          fechaInicioReal: edtReal?.fechaInicioReal?.toISOString() || edtReal?.fechaInicioPlan?.toISOString() || null,
          fechaFinReal: edtReal?.fechaFinReal?.toISOString() || edtReal?.fechaFinPlan?.toISOString() || null,
          deltaIniciosDias: diasEntre(
            edtPlan.fechaInicioPlan,
            edtReal?.fechaInicioReal || edtReal?.fechaInicioPlan || null
          ),
          deltaFinDias: diasEntre(
            edtPlan.fechaFinPlan,
            edtReal?.fechaFinReal || edtReal?.fechaFinPlan || null
          ),
          horasPlan,
          horasReales,
          deltaHoras: horasReales - horasPlan,
          porcentajePlan: 100,
          porcentajeReal: edtReal?.porcentajeAvance || 0
        })

        // Match actividades dentro del EDT
        for (const actPlan of edtPlan.actividades) {
          const actReal = edtReal?.actividades.find(a => a.nombre === actPlan.nombre)

          const actHorasPlan = Number(actPlan.horasPlan || 0)
          const actHorasReales = Number(actReal?.horasReales || 0)

          varianzas.push({
            nombre: actPlan.nombre,
            nivel: 'actividad',
            faseNombre: fasePlan.nombre,
            edtNombre: edtPlan.nombre,
            fechaInicioPlan: actPlan.fechaInicioPlan?.toISOString() || null,
            fechaFinPlan: actPlan.fechaFinPlan?.toISOString() || null,
            fechaInicioReal: actReal?.fechaInicioReal?.toISOString() || actReal?.fechaInicioPlan?.toISOString() || null,
            fechaFinReal: actReal?.fechaFinReal?.toISOString() || actReal?.fechaFinPlan?.toISOString() || null,
            deltaIniciosDias: diasEntre(
              actPlan.fechaInicioPlan,
              actReal?.fechaInicioReal || actReal?.fechaInicioPlan || null
            ),
            deltaFinDias: diasEntre(
              actPlan.fechaFinPlan,
              actReal?.fechaFinReal || actReal?.fechaFinPlan || null
            ),
            horasPlan: actHorasPlan,
            horasReales: actHorasReales,
            deltaHoras: actHorasReales - actHorasPlan,
            porcentajePlan: 100,
            porcentajeReal: actReal?.porcentajeAvance || 0
          })

          // Match tareas dentro de la actividad
          for (const tareaPlan of actPlan.tareas) {
            const tareaReal = actReal?.tareas.find(t => t.nombre === tareaPlan.nombre)

            const tHorasPlan = Number(tareaPlan.horasEstimadas || 0)
            const tHorasReales = Number(tareaReal?.horasReales || 0)

            varianzas.push({
              nombre: tareaPlan.nombre,
              nivel: 'tarea',
              faseNombre: fasePlan.nombre,
              edtNombre: edtPlan.nombre,
              actividadNombre: actPlan.nombre,
              fechaInicioPlan: tareaPlan.fechaInicio?.toISOString() || null,
              fechaFinPlan: tareaPlan.fechaFin?.toISOString() || null,
              fechaInicioReal: tareaReal?.fechaInicioReal?.toISOString() || tareaReal?.fechaInicio?.toISOString() || null,
              fechaFinReal: tareaReal?.fechaFinReal?.toISOString() || tareaReal?.fechaFin?.toISOString() || null,
              deltaIniciosDias: diasEntre(
                tareaPlan.fechaInicio,
                tareaReal?.fechaInicioReal || tareaReal?.fechaInicio || null
              ),
              deltaFinDias: diasEntre(
                tareaPlan.fechaFin,
                tareaReal?.fechaFinReal || tareaReal?.fechaFin || null
              ),
              horasPlan: tHorasPlan,
              horasReales: tHorasReales,
              deltaHoras: tHorasReales - tHorasPlan,
              porcentajePlan: 100,
              porcentajeReal: tareaReal?.porcentajeCompletado || 0
            })
          }
        }

        // También incluir tareas directas del EDT (sin actividad)
        for (const tareaPlan of edtPlan.tareasDirectas) {
          const tareaReal = edtReal?.tareasDirectas.find(t => t.nombre === tareaPlan.nombre)

          const tHorasPlan = Number(tareaPlan.horasEstimadas || 0)
          const tHorasReales = Number(tareaReal?.horasReales || 0)

          varianzas.push({
            nombre: tareaPlan.nombre,
            nivel: 'tarea',
            faseNombre: fasePlan.nombre,
            edtNombre: edtPlan.nombre,
            fechaInicioPlan: tareaPlan.fechaInicio?.toISOString() || null,
            fechaFinPlan: tareaPlan.fechaFin?.toISOString() || null,
            fechaInicioReal: tareaReal?.fechaInicioReal?.toISOString() || tareaReal?.fechaInicio?.toISOString() || null,
            fechaFinReal: tareaReal?.fechaFinReal?.toISOString() || tareaReal?.fechaFin?.toISOString() || null,
            deltaIniciosDias: diasEntre(
              tareaPlan.fechaInicio,
              tareaReal?.fechaInicioReal || tareaReal?.fechaInicio || null
            ),
            deltaFinDias: diasEntre(
              tareaPlan.fechaFin,
              tareaReal?.fechaFinReal || tareaReal?.fechaFin || null
            ),
            horasPlan: tHorasPlan,
            horasReales: tHorasReales,
            deltaHoras: tHorasReales - tHorasPlan,
            porcentajePlan: 100,
            porcentajeReal: tareaReal?.porcentajeCompletado || 0
          })
        }
      }
    }

    // Calcular KPIs
    const edtVarianzas = varianzas.filter(v => v.nivel === 'edt')
    const totalConDelta = edtVarianzas.filter(v => v.deltaFinDias !== null)
    const aTiempo = totalConDelta.filter(v => (v.deltaFinDias || 0) <= 0).length
    const retrasadas = totalConDelta.filter(v => (v.deltaFinDias || 0) > 0).length
    const adelantadas = totalConDelta.filter(v => (v.deltaFinDias || 0) < 0).length

    const totalHorasPlan = edtVarianzas.reduce((s, v) => s + v.horasPlan, 0)
    const totalHorasReales = edtVarianzas.reduce((s, v) => s + v.horasReales, 0)
    const totalDeltaDias = totalConDelta.reduce((s, v) => s + (v.deltaFinDias || 0), 0)

    // SPI = EV / PV (simplificado: progreso real promedio / progreso esperado)
    const progresoRealProm = edtVarianzas.length > 0
      ? edtVarianzas.reduce((s, v) => s + v.porcentajeReal, 0) / edtVarianzas.length
      : 0
    const spiGlobal = progresoRealProm > 0 ? +(progresoRealProm / 100).toFixed(2) : 0

    const kpis: VarianzaKPIs = {
      spiGlobal,
      porcentajeATiempo: totalConDelta.length > 0 ? Math.round((aTiempo / totalConDelta.length) * 100) : 0,
      porcentajeRetrasadas: totalConDelta.length > 0 ? Math.round((retrasadas / totalConDelta.length) * 100) : 0,
      porcentajeAdelantadas: totalConDelta.length > 0 ? Math.round((adelantadas / totalConDelta.length) * 100) : 0,
      varianzaTotalDias: totalDeltaDias,
      varianzaTotalHoras: totalHorasReales - totalHorasPlan,
      totalEntidades: edtVarianzas.length
    }

    return NextResponse.json({
      disponible: true,
      baseline: { id: baseline.id, nombre: baseline.nombre },
      ejecucion: { id: ejecucion.id, nombre: ejecucion.nombre },
      kpis,
      varianzas
    })

  } catch (error) {
    console.error('Error calculando varianza:', error)
    return NextResponse.json(
      { error: 'Error calculando varianza del cronograma' },
      { status: 500 }
    )
  }
}

// Helper para cargar el árbol completo de un cronograma
async function cargarArbol(cronogramaId: string) {
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: cronogramaId },
    orderBy: { orden: 'asc' },
    include: {
      proyectoEdt: {
        orderBy: { orden: 'asc' },
        include: {
          proyectoActividad: {
            orderBy: { orden: 'asc' },
            include: {
              proyectoTarea: {
                orderBy: { orden: 'asc' }
              }
            }
          },
          proyectoTarea: {
            where: { proyectoActividadId: null },
            orderBy: { orden: 'asc' }
          }
        }
      }
    }
  })

  return {
    fases: fases.map(fase => ({
      ...fase,
      edts: fase.proyectoEdt.map(edt => ({
        ...edt,
        actividades: edt.proyectoActividad.map(act => ({
          ...act,
          tareas: act.proyectoTarea
        })),
        tareasDirectas: edt.proyectoTarea
      }))
    }))
  }
}
