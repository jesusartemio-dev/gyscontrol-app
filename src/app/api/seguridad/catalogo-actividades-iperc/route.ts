import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizarControl } from '@/lib/iperc/riesgoResidual'

export const dynamic = 'force-dynamic'

const ROLES_VER = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'seguridad']
const ROLES_EDITAR = ['admin', 'gerente', 'seguridad']

/**
 * Las actividades que van en todo IPERC y no salen del cronograma:
 * movilización a planta, vigilancia COVID/dengue, orden y limpieza,
 * desplazamiento, izaje, bloqueo de energía y el cierre.
 *
 * Vivían solo en la base desde que se importaron del IPERC de CJM50; esto es
 * la pantalla que faltaba para poder tocarlas.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_VER)) return Response.json({ error: 'Sin acceso' }, { status: 403 })

  const items = await prisma.ipercCatalogoActividadFija.findMany({
    orderBy: { orden: 'asc' },
    include: { _count: { select: { estructuraItems: true } } },
  })
  return Response.json({ items })
}

const CAMPOS_TEXTO = [
  'proceso', 'actividad', 'tarea', 'puestoTrabajo', 'factorRiesgo',
  'condicionActividad', 'peligro', 'riesgo', 'consecuencia',
  'accionesMejora', 'responsables',
] as const

const CAMPOS_CONTROL = [
  'eliminar', 'sustituir', 'controlIngenieria', 'controlAdministrativo', 'controlReceptor',
] as const

/** Lo que llega del formulario, ya limpio y sin los campos que no vinieron. */
function leerCampos(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  for (const c of CAMPOS_TEXTO) {
    if (typeof body[c] === 'string') data[c] = String(body[c]).trim()
  }
  // Los controles se guardan con un ítem por línea, como en las filas del
  // IPERC: el Excel los saca con viñeta a partir de eso.
  for (const c of CAMPOS_CONTROL) {
    if (typeof body[c] === 'string') data[c] = normalizarControl(String(body[c])) || 'NA'
  }
  if (body.severidad != null) {
    const n = Number(body.severidad)
    if (Number.isInteger(n) && n >= 1 && n <= 5) data.severidad = n
  }
  if (typeof body.probabilidad === 'string' && /^[A-E]$/i.test(body.probabilidad)) {
    data.probabilidad = String(body.probabilidad).toUpperCase()
  }
  if (typeof body.activo === 'boolean') data.activo = body.activo
  if (body.orden != null && Number.isInteger(Number(body.orden))) data.orden = Number(body.orden)

  return data
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  try {
    const item = await prisma.ipercCatalogoActividadFija.update({
      where: { id },
      data: { ...leerCampos(body), updatedAt: new Date() },
    })
    return Response.json({ item })
  } catch {
    return Response.json(
      { error: 'No se pudo actualizar: ya hay otra con el mismo proceso, actividad, tarea y peligro' },
      { status: 409 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const campos = leerCampos(body)

  for (const obligatorio of ['proceso', 'actividad', 'tarea', 'peligro'] as const) {
    if (!campos[obligatorio]) {
      return Response.json({ error: `Falta ${obligatorio}` }, { status: 400 })
    }
  }

  const ultima = await prisma.ipercCatalogoActividadFija.findFirst({
    orderBy: { orden: 'desc' }, select: { orden: true },
  })

  try {
    const item = await prisma.ipercCatalogoActividadFija.create({
      data: {
        orden: (ultima?.orden ?? 0) + 1,
        puestoTrabajo: 'Todo el personal de GYS',
        factorRiesgo: 'FÍSICO',
        condicionActividad: 'Rutinaria',
        riesgo: '',
        consecuencia: '',
        severidad: 3,
        probabilidad: 'C',
        ...campos,
        updatedAt: new Date(),
      } as never,
    })
    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json(
      { error: 'Ya hay una con ese proceso, actividad, tarea y peligro' },
      { status: 409 },
    )
  }
}

/**
 * DELETE ?id= — saca una actividad fija del catálogo.
 *
 * No toca los IPERC ya generados: sus filas son copias, no referencias.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const { count } = await prisma.ipercCatalogoActividadFija.deleteMany({ where: { id } })
  if (count === 0) return Response.json({ error: 'No existe' }, { status: 404 })

  return Response.json({ ok: true })
}
