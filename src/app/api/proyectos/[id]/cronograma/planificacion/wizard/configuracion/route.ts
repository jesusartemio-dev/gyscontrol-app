import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { configuracionWizardPaso1Schema } from '@/lib/validators/cronogramaIA'
import { generarActividadesDeterministas, calcularEdtsPendientesIA, type EdtParaGenerar } from '@/lib/cronogramaIA/reglasActividades'
import type { CatalogoServicioParaWizard } from '@/types/cronogramaIA'

type Ctx = { params: Promise<{ id: string }> }

const NOMBRE_CRONOGRAMA_PLANIFICACION = 'Línea Base'

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role, id: userId } = session.user
  const esGestorODirectivo =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId

  if (!ROLES_CRONOGRAMA.includes(role as (typeof ROLES_CRONOGRAMA)[number]) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = configuracionWizardPaso1Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Configuración inválida', detalles: parsed.error.flatten() }, { status: 400 })
  }
  const config = parsed.data

  let cronograma = await prisma.proyectoCronograma.findUnique({
    where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
    select: { id: true, bloqueado: true },
  })

  if (cronograma?.bloqueado) {
    return NextResponse.json({ error: 'El cronograma de planificación está bloqueado. Desbloquéelo antes de generar.' }, { status: 403 })
  }

  if (!cronograma) {
    cronograma = await prisma.proyectoCronograma.create({
      data: {
        id: randomUUID(),
        proyectoId,
        tipo: 'planificacion',
        nombre: NOMBRE_CRONOGRAMA_PLANIFICACION,
        updatedAt: new Date(),
      },
      select: { id: true, bloqueado: true },
    })
  }

  const edtsSeleccionados = await prisma.edt.findMany({
    where: { id: { in: config.edtsSeleccionados } },
    include: {
      catalogoServicio: { include: { unidadServicio: true, recurso: true }, orderBy: { orden: 'asc' } },
    },
  })

  const edtsParaGenerar: EdtParaGenerar[] = edtsSeleccionados.map(edt => {
    const servicios: CatalogoServicioParaWizard[] = edt.catalogoServicio.map(s => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      edtNombre: edt.nombre,
      actividadTag: s.actividadTag,
      filtroAlcance: s.filtroAlcance,
      notaCantidad: s.notaCantidad,
      horaBase: s.horaBase,
      horaRepetido: s.horaRepetido,
      cantidad: s.cantidad,
      nivelDificultad: s.nivelDificultad,
      orden: s.orden,
      unidadNombre: s.unidadServicio.nombre,
      recursoNombre: s.recurso.nombre,
    }))
    return { nombre: edt.nombre, descripcion: edt.descripcion, servicios }
  })

  // TDR — señal DÉBIL adicional para los triggers textuales de sub-alcance
  // (neumática/proceso/control/instrumentos/protocolos): la solicitud
  // original del cliente puede mencionar trabajo que se redujo en la
  // negociación comercial. Solo afecta qué tarea queda pre-marcada dentro de
  // un EDT ya elegido — nunca qué EDTs se seleccionan (eso ya pasó, arriba).
  const tdrDoc = await prisma.proyectoTdrAnalisis.findUnique({
    where: { proyectoId },
    select: { resumenTdr: true, alcanceDetectado: true },
  })
  const textoTdr = [tdrDoc?.alcanceDetectado, tdrDoc?.resumenTdr].filter(Boolean).join('\n')

  const { actividades, advertencias } = generarActividadesDeterministas(edtsParaGenerar, config, textoTdr)

  const generacion = await prisma.proyectoCronogramaGeneracionIA.create({
    data: {
      proyectoCronogramaId: cronograma.id,
      configuracion: config,
      propuestaActividades: actividades,
      advertencias,
      estado: 'borrador',
      generadoPorId: userId,
    },
  })

  return NextResponse.json({
    generacionId: generacion.id,
    proyectoCronogramaId: cronograma.id,
    propuestaActividades: actividades,
    advertencias,
    edtsPendientesIA: calcularEdtsPendientesIA(
      edtsSeleccionados.map(e => ({ id: e.id, nombre: e.nombre })),
      []
    ),
  })
}
