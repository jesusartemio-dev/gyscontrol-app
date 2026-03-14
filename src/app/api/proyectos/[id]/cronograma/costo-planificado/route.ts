import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/proyectos/[id]/cronograma/costo-planificado
// Calcula el costo planificado de servicios desde el cronograma:
// Individual: Σ(horasEstimadas × personasEstimadas × recurso.costoHoraProyecto)
// Cuadrilla:  Σ(horasEstimadas × recurso.costoHoraProyecto) — el costo ya incluye al equipo completo
// También devuelve desglose por EDT para comparación con costos cotizados
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Priorizar: ejecución > planificación > comercial
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'ejecucion' }
    }) || await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'planificacion' }
    }) || await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id }
    })

    if (!cronograma) {
      return NextResponse.json({
        costoPlanificado: 0,
        costoPorEdt: {},
        tareasConRecurso: 0,
        totalTareas: 0
      })
    }

    // Obtener todas las tareas del cronograma activo con su EDT
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: {
        horasEstimadas: true,
        personasEstimadas: true,
        recursoId: true,
        recurso: {
          select: { tipo: true, costoHoraProyecto: true }
        },
        proyectoEdt: {
          select: {
            edtId: true,
            edt: { select: { id: true, nombre: true } }
          }
        }
      }
    })

    const tareasConRecurso = tareas.filter(t => t.recursoId !== null)

    // Calcular costo total y desglose por EDT
    let costoPlanificado = 0
    const costoPorEdt: Record<string, { edtNombre: string; costo: number; tareas: number; tareasConRecurso: number }> = {}

    // Inicializar conteo de tareas totales por EDT
    for (const t of tareas) {
      const edtId = t.proyectoEdt?.edtId || 'sin-edt'
      if (!costoPorEdt[edtId]) {
        costoPorEdt[edtId] = {
          edtNombre: t.proyectoEdt?.edt?.nombre || 'Sin EDT',
          costo: 0,
          tareas: 0,
          tareasConRecurso: 0
        }
      }
      costoPorEdt[edtId].tareas++
    }

    // Calcular costos de tareas con recurso
    for (const t of tareasConRecurso) {
      const horas = Number(t.horasEstimadas) || 0
      const costo = t.recurso?.costoHoraProyecto || 0
      // Cuadrilla: costoHoraProyecto ya incluye a todo el equipo, no multiplicar por personas
      // Individual: multiplicar por personasEstimadas
      const multiplicador = t.recurso?.tipo === 'cuadrilla' ? 1 : (t.personasEstimadas || 1)
      const costoTarea = horas * multiplicador * costo

      costoPlanificado += costoTarea

      const edtId = t.proyectoEdt?.edtId || 'sin-edt'
      costoPorEdt[edtId].costo += costoTarea
      costoPorEdt[edtId].tareasConRecurso++
    }

    return NextResponse.json({
      costoPlanificado,
      costoPorEdt,
      tareasConRecurso: tareasConRecurso.length,
      totalTareas: tareas.length
    })

  } catch (error) {
    console.error('Error al calcular costo planificado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
