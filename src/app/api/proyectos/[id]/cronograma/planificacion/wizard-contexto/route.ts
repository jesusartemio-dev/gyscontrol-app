import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Paso 1 del wizard de generación de cronograma con IA — bootstrap.
 * No requiere que exista un ProyectoCronograma todavía, así que no puede
 * usar validarPermisoCronograma (necesita un cronogramaId real); replica
 * inline el mismo patrón de src/app/api/proyectos/[id]/plan-trabajo/generar-ia/route.ts.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
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

  const [edts, cronogramaPlanificacion, cotizacionDocumento] = await Promise.all([
    prisma.edt.findMany({
      include: { faseDefault: true, _count: { select: { catalogoServicio: true } } },
      orderBy: [{ faseDefault: { orden: 'asc' } }, { nombre: 'asc' }],
    }),
    prisma.proyectoCronograma.findUnique({
      where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
      select: { id: true, bloqueado: true },
    }),
    prisma.proyectoCotizacionDocumento.findUnique({
      where: { proyectoId },
      select: { resumenAlcance: true, exclusiones: true, numeroPropuesta: true, clienteDetectado: true },
    }),
  ])

  let borrador: { id: string; configuracion: unknown; estado: string } | null = null
  if (cronogramaPlanificacion) {
    borrador = await prisma.proyectoCronogramaGeneracionIA.findFirst({
      where: { proyectoCronogramaId: cronogramaPlanificacion.id, estado: 'borrador' },
      orderBy: { generadoEn: 'desc' },
      select: { id: true, configuracion: true, estado: true },
    })
  }

  return NextResponse.json({
    edts: edts.map(e => ({
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion,
      faseNombre: e.faseDefault?.nombre ?? null,
      totalServicios: e._count.catalogoServicio,
    })),
    cronogramaBloqueado: cronogramaPlanificacion?.bloqueado ?? false,
    borrador,
    tieneCotizacionDocumento: !!cotizacionDocumento,
    cotizacionResumen: cotizacionDocumento
      ? {
          numeroPropuesta: cotizacionDocumento.numeroPropuesta,
          clienteDetectado: cotizacionDocumento.clienteDetectado,
          resumenAlcance: (cotizacionDocumento.resumenAlcance as string[] | null) ?? [],
          exclusiones: (cotizacionDocumento.exclusiones as string[] | null) ?? [],
        }
      : null,
  })
}
