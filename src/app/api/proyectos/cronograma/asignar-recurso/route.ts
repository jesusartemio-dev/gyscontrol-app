import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

const asignarRecursoSchema = z.object({
  edtId: z.string(),
  recursoId: z.string().nullable(),
})

// PUT — Asignar recurso a todas las tareas de una EDT
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = asignarRecursoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { edtId, recursoId } = parsed.data

    // Verificar que la EDT existe
    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: edtId },
      select: { id: true, nombre: true, proyectoCronogramaId: true },
    })
    if (!edt) {
      return NextResponse.json({ error: 'EDT no encontrada' }, { status: 404 })
    }

    let personasEstimadas = 1

    if (recursoId) {
      // Verificar recurso existe y está activo
      const recurso = await prisma.recurso.findUnique({
        where: { id: recursoId },
        select: { id: true, nombre: true, tipo: true, activo: true },
      })
      if (!recurso || !recurso.activo) {
        return NextResponse.json({ error: 'Recurso no encontrado o inactivo' }, { status: 404 })
      }

      // Si es cuadrilla, calcular personasEstimadas desde composiciones
      if (recurso.tipo === 'cuadrilla') {
        const composiciones = await prisma.recursoComposicion.aggregate({
          where: { recursoId, activo: true },
          _sum: { cantidad: true },
        })
        personasEstimadas = composiciones._sum.cantidad || 1
      }
    }

    // Actualizar todas las tareas de la EDT
    const result = await prisma.proyectoTarea.updateMany({
      where: { proyectoEdtId: edtId },
      data: {
        recursoId,
        personasEstimadas: recursoId ? personasEstimadas : 1,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      tareasActualizadas: result.count,
      edtNombre: edt.nombre,
      message: recursoId
        ? `Recurso asignado a ${result.count} tarea(s) en "${edt.nombre}"`
        : `Recurso removido de ${result.count} tarea(s) en "${edt.nombre}"`,
    })
  } catch (error) {
    console.error('Error al asignar recurso:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// GET — Listar EDTs del cronograma con resumen de recursos asignados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')
    if (!cronogramaId) {
      return NextResponse.json({ error: 'cronogramaId requerido' }, { status: 400 })
    }

    // Cargar EDTs con tareas y recurso info
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: cronogramaId },
      select: {
        id: true,
        nombre: true,
        orden: true,
        proyectoTarea: {
          select: {
            id: true,
            recursoId: true,
            recurso: { select: { id: true, nombre: true, tipo: true } },
          },
        },
      },
      orderBy: { orden: 'asc' },
    })

    // Cargar recursos activos
    const recursos = await prisma.recurso.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, costoHora: true },
      orderBy: { nombre: 'asc' },
    })

    // Procesar EDTs
    const edtsConResumen = edts.map(edt => {
      const totalTareas = edt.proyectoTarea.length
      const tareasConRecurso = edt.proyectoTarea.filter(t => t.recursoId).length

      // Determinar recurso actual: si todas las tareas tienen el mismo recurso
      let recursoActualId: string | null = null
      let recursoActualNombre: string | null = null
      let mixto = false

      if (totalTareas > 0 && tareasConRecurso > 0) {
        const primerRecursoId = edt.proyectoTarea.find(t => t.recursoId)?.recursoId || null
        const todosIguales = edt.proyectoTarea.every(
          t => t.recursoId === primerRecursoId || t.recursoId === null
        )
        if (todosIguales && primerRecursoId) {
          recursoActualId = primerRecursoId
          recursoActualNombre = edt.proyectoTarea.find(t => t.recursoId)?.recurso?.nombre || null
        } else if (tareasConRecurso > 0) {
          mixto = true
        }
      }

      return {
        id: edt.id,
        nombre: edt.nombre,
        orden: edt.orden,
        totalTareas,
        tareasConRecurso,
        recursoActualId,
        recursoActualNombre,
        mixto,
      }
    })

    return NextResponse.json({ edts: edtsConResumen, recursos })
  } catch (error) {
    console.error('Error al listar EDTs para recurso:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
