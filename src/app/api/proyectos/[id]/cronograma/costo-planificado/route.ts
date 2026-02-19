import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/proyectos/[id]/cronograma/costo-planificado
// Calcula el costo planificado de servicios desde el cronograma:
// Individual: Σ(horasEstimadas × personasEstimadas × recurso.costoHoraProyecto)
// Cuadrilla:  Σ(horasEstimadas × recurso.costoHoraProyecto) — el costo ya incluye al equipo completo
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

    // Obtener cronograma activo (baseline primero, o el primero disponible)
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id },
      orderBy: { esBaseline: 'desc' }
    })

    if (!cronograma) {
      return NextResponse.json({
        costoPlanificado: 0,
        tareasConRecurso: 0,
        totalTareas: 0
      })
    }

    // Obtener todas las tareas del cronograma activo
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: {
        horasEstimadas: true,
        personasEstimadas: true,
        recursoId: true,
        recurso: {
          select: { tipo: true, costoHoraProyecto: true }
        }
      }
    })

    const tareasConRecurso = tareas.filter(t => t.recursoId !== null)

    const costoPlanificado = tareasConRecurso.reduce((sum, t) => {
      const horas = Number(t.horasEstimadas) || 0
      const costo = t.recurso?.costoHoraProyecto || 0
      // Cuadrilla: costoHoraProyecto ya incluye a todo el equipo, no multiplicar por personas
      // Individual: multiplicar por personasEstimadas
      const multiplicador = t.recurso?.tipo === 'cuadrilla' ? 1 : (t.personasEstimadas || 1)
      return sum + (horas * multiplicador * costo)
    }, 0)

    return NextResponse.json({
      costoPlanificado,
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
