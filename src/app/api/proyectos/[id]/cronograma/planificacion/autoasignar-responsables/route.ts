import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { construirPersonalResoluble } from '@/lib/matrizComunicacion/utils'
import { emparejarFilaConEdt, elegirResponsableDeFila, type EdtParaMatching, type CeldaMatriz } from '@/lib/matrizComunicacion/autoasignarResponsables'

type Ctx = { params: Promise<{ id: string }> }

interface PropuestaResponsableEdt {
  proyectoEdtId: string
  edtCodigo: string
  edtNombre: string
  matrizFilaId: string | null
  matrizInformacion: string | null
  responsable: { userId: string; nombre: string; siglas: string; codigoOrigen: 'R' | 'E' } | null
  totalTareas: number
  advertencia: string | null
}

/**
 * Calcula (sin escribir nada) qué Responsable le correspondería a cada EDT
 * del cronograma según la Matriz de Comunicaciones del proyecto — usada
 * tanto por el preview (GET) como por el apply (POST), que SIEMPRE
 * recalcula en vez de confiar en lo que el cliente devolvió del preview
 * (mismo criterio que el resto del wizard: nunca confiar en estado
 * server-derivado que viajó al cliente y volvió).
 */
async function calcularPropuesta(
  proyectoId: string,
  proyectoCronogramaId: string
): Promise<{ sinMatriz: true } | { sinMatriz: false; propuestas: PropuestaResponsableEdt[] }> {
  const matriz = await prisma.matrizComunicacion.findUnique({
    where: { proyectoId },
    include: { filas: true },
  })
  if (!matriz) return { sinMatriz: true }

  const proyectoEdts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId },
    include: { edt: { select: { nombre: true } } },
    orderBy: { orden: 'asc' },
  })
  const edtsParaMatching: EdtParaMatching[] = proyectoEdts.map(pe => ({
    proyectoEdtId: pe.id,
    nombre: pe.nombre,
    codigo: pe.edt.nombre,
  }))

  // Una fila de la matriz -> el EDT real que matchea (si hay). Primera fila
  // que matchea gana si hubiera más de una apuntando al mismo EDT (raro).
  const filaPorEdtId = new Map<string, (typeof matriz.filas)[number]>()
  for (const fila of matriz.filas) {
    const match = emparejarFilaConEdt(fila.informacion, edtsParaMatching)
    if (match && !filaPorEdtId.has(match.proyectoEdtId)) {
      filaPorEdtId.set(match.proyectoEdtId, fila)
    }
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      orgNodos: {
        orderBy: { orden: 'asc' },
        select: { id: true, parentId: true, userId: true, user: { select: { name: true } } },
      },
    },
  })
  const contactosCliente = await prisma.proyectoContactoCliente.findMany({
    where: { proyectoId },
    include: { crmContacto: { select: { nombre: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const personal = construirPersonalResoluble(proyecto?.orgNodos ?? [], contactosCliente)

  const userIds = Array.from(new Set(personal.filter(p => p.userId).map(p => p.userId!)))
  const usuarios = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
  const nombrePorUserId = new Map(usuarios.map(u => [u.id, u.name ?? '(sin nombre)']))

  const conteos = await prisma.proyectoTarea.groupBy({
    by: ['proyectoEdtId'],
    where: { proyectoEdtId: { in: edtsParaMatching.map(e => e.proyectoEdtId) } },
    _count: { id: true },
  })
  const totalTareasPorEdt = new Map(conteos.map(c => [c.proyectoEdtId, c._count.id]))

  const propuestas: PropuestaResponsableEdt[] = edtsParaMatching.map(edt => {
    const totalTareas = totalTareasPorEdt.get(edt.proyectoEdtId) ?? 0
    const fila = filaPorEdtId.get(edt.proyectoEdtId)

    if (!fila) {
      return {
        proyectoEdtId: edt.proyectoEdtId,
        edtCodigo: edt.codigo,
        edtNombre: edt.nombre,
        matrizFilaId: null,
        matrizInformacion: null,
        responsable: null,
        totalTareas,
        advertencia: 'Sin fila que coincida con este EDT en la Matriz de Comunicaciones.',
      }
    }

    let celdas: CeldaMatriz[] = []
    try {
      const parsed = JSON.parse(fila.receptores)
      if (Array.isArray(parsed)) celdas = parsed
    } catch {
      // receptores corrupto — se trata como fila sin celdas, no revienta.
    }

    const eleccion = elegirResponsableDeFila(celdas, personal)
    const responsable =
      eleccion.userId && eleccion.codigoOrigen
        ? {
            userId: eleccion.userId,
            nombre: nombrePorUserId.get(eleccion.userId) ?? '(usuario no encontrado)',
            siglas: personal.find(p => p.userId === eleccion.userId)?.siglas ?? '',
            codigoOrigen: eleccion.codigoOrigen,
          }
        : null

    return {
      proyectoEdtId: edt.proyectoEdtId,
      edtCodigo: edt.codigo,
      edtNombre: edt.nombre,
      matrizFilaId: fila.id,
      matrizInformacion: fila.informacion,
      responsable,
      totalTareas,
      advertencia: eleccion.advertencia,
    }
  })

  return { sinMatriz: false, propuestas }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id: proyectoId } = await params
  const cronogramaId = req.nextUrl.searchParams.get('cronogramaId')
  if (!cronogramaId) {
    return NextResponse.json({ error: 'Se requiere cronogramaId' }, { status: 400 })
  }

  const validacion = await validarPermisoCronograma(cronogramaId, { ignoreBloqueo: true })
  if (!validacion.ok) return validacion.response

  const resultado = await calcularPropuesta(proyectoId, cronogramaId)
  return NextResponse.json(resultado)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const body = await req.json().catch(() => ({}))
  const cronogramaId: string | undefined = body.cronogramaId
  if (!cronogramaId) {
    return NextResponse.json({ error: 'Se requiere cronogramaId' }, { status: 400 })
  }

  const validacion = await validarPermisoCronograma(cronogramaId)
  if (!validacion.ok) return validacion.response

  const resultado = await calcularPropuesta(proyectoId, cronogramaId)
  if (resultado.sinMatriz) {
    return NextResponse.json({ error: 'Este proyecto no tiene una Matriz de Comunicaciones.' }, { status: 409 })
  }

  const asignables = resultado.propuestas.filter(p => p.responsable && p.totalTareas > 0)
  if (asignables.length === 0) {
    return NextResponse.json({ propuestas: resultado.propuestas, edtsAsignados: 0, tareasActualizadas: 0 })
  }

  const tareasPorEdt = await prisma.proyectoTarea.findMany({
    where: { proyectoEdtId: { in: asignables.map(p => p.proyectoEdtId) } },
    select: { id: true, proyectoEdtId: true },
  })

  await prisma.$transaction([
    ...asignables.map(p =>
      prisma.proyectoTarea.updateMany({
        where: { proyectoEdtId: p.proyectoEdtId },
        data: { responsableId: p.responsable!.userId, updatedAt: new Date() },
      })
    ),
    prisma.proyectoTareaResponsableAsignacion.createMany({
      data: tareasPorEdt.flatMap(t => {
        const propuesta = asignables.find(p => p.proyectoEdtId === t.proyectoEdtId)
        if (!propuesta?.responsable) return []
        return [
          {
            id: randomUUID(),
            proyectoTareaId: t.id,
            proyectoId,
            matrizFilaId: propuesta.matrizFilaId,
            edtCodigo: propuesta.edtCodigo,
            responsableIdAsignado: propuesta.responsable.userId,
            codigoOrigen: propuesta.responsable.codigoOrigen,
            asignadoPorId: session.user.id,
          },
        ]
      }),
    }),
  ])

  return NextResponse.json({
    propuestas: resultado.propuestas,
    edtsAsignados: asignables.length,
    tareasActualizadas: tareasPorEdt.length,
  })
}
