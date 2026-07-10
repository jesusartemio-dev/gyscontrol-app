import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { edtCorreccionSchema } from '@/lib/validators/cronogramaIA'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Correcciones manuales de EDTs sugeridos para el wizard de cronograma, a
 * nivel PROYECTO — nunca tocan la cotización comercial real (ese es el
 * registro de lo que se vendió, no se edita). Pensado para casos como una
 * partida mal clasificada al armar la cotización (ej. "DESARROLLO DE
 * PLANOS" cargado bajo ING en vez de PLA): en vez de reescribir la
 * cotización, se agrega acá un ajuste puramente aditivo que el wizard
 * combina con lo que venga de la cotización real (ver derivarEdtsSoporte.ts).
 *
 * Mismo patrón de permisos inline que wizard-contexto/route.ts — no requiere
 * que exista un ProyectoCronograma todavía.
 */
async function verificarAcceso(proyectoId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return { ok: false as const, response: NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 }) }
  }

  const { role, id: userId } = session.user
  const esGestorODirectivo =
    proyecto.gestorId === userId || proyecto.supervisorId === userId || proyecto.liderId === userId || proyecto.comercialId === userId

  if (!ROLES_CRONOGRAMA.includes(role as (typeof ROLES_CRONOGRAMA)[number]) && !esGestorODirectivo) {
    return { ok: false as const, response: NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 }) }
  }

  return { ok: true as const, userId }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId)
  if (!acceso.ok) return acceso.response

  const correcciones = await prisma.proyectoCronogramaEdtCorreccion.findMany({
    where: { proyectoId },
    select: {
      id: true,
      edtId: true,
      motivo: true,
      creadoEn: true,
      edt: { select: { nombre: true, descripcion: true } },
      creadoPor: { select: { name: true } },
    },
    orderBy: { creadoEn: 'asc' },
  })

  return NextResponse.json({
    correcciones: correcciones.map(c => ({
      id: c.id,
      edtId: c.edtId,
      edtNombre: c.edt.nombre,
      edtDescripcion: c.edt.descripcion,
      motivo: c.motivo,
      creadoPorNombre: c.creadoPor.name,
      creadoEn: c.creadoEn,
    })),
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId)
  if (!acceso.ok) return acceso.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = edtCorreccionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Corrección inválida', detalles: parsed.error.flatten() }, { status: 400 })
  }

  const edt = await prisma.edt.findUnique({ where: { id: parsed.data.edtId }, select: { id: true, nombre: true, descripcion: true } })
  if (!edt) {
    return NextResponse.json({ error: 'El EDT indicado no existe en el catálogo' }, { status: 404 })
  }

  const correccion = await prisma.proyectoCronogramaEdtCorreccion.upsert({
    where: { proyectoId_edtId: { proyectoId, edtId: parsed.data.edtId } },
    create: { proyectoId, edtId: parsed.data.edtId, motivo: parsed.data.motivo, creadoPorId: acceso.userId },
    update: { motivo: parsed.data.motivo },
    select: { id: true, edtId: true, motivo: true, creadoEn: true },
  })

  return NextResponse.json({
    correccion: { id: correccion.id, edtId: edt.id, edtNombre: edt.nombre, edtDescripcion: edt.descripcion, motivo: correccion.motivo, creadoEn: correccion.creadoEn },
  })
}
