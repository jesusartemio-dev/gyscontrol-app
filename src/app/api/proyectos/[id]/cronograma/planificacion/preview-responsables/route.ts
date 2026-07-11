import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { previsualizarResponsablesDesdeNombres } from '@/lib/cronogramaResponsables/asignarResponsablesEstructura'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Preview (dry-run, sin escribir nada) de qué responsable le correspondería
 * a cada EDT del borrador del Paso 2 del wizard — antes de aplicar el
 * cronograma. Misma resolución EDT->rol + organigrama que se aplica de
 * verdad en /wizard/[generacionId]/generar, así que lo que se muestra acá
 * es exactamente lo que quedará asignado al confirmar.
 */
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

  const body = await req.json().catch(() => ({}))
  const actividades: ActividadPropuesta[] = Array.isArray(body.actividades) ? body.actividades : []

  const [orgNodos, edtsCatalogo] = await Promise.all([
    prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } },
    }),
    prisma.edt.findMany({ select: { nombre: true, descripcion: true } }),
  ])

  const organigramaResuelto = resolverOrganigramaProyecto(orgNodos)
  const edtDescripcionPorCodigo = new Map(edtsCatalogo.map(e => [e.nombre, e.descripcion || e.nombre]))

  const resultado = previsualizarResponsablesDesdeNombres(actividades, organigramaResuelto.porRol, edtDescripcionPorCodigo)

  return NextResponse.json(resultado)
}
