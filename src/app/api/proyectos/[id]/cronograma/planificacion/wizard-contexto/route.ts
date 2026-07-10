import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { obtenerEdtsComercialesProyecto } from '@/lib/cronogramaIA/obtenerEdtsComerciales'
import { derivarEdtsSoporte } from '@/lib/cronogramaIA/derivarEdtsSoporte'
import { calcularEdtsPendientesIA } from '@/lib/cronogramaIA/reglasActividades'
import type { ActividadPropuesta, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

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

  const [edts, cronogramaPlanificacion, cotizacionDocumento, edtsComerciales] = await Promise.all([
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
    obtenerEdtsComercialesProyecto(proyectoId),
  ])

  let borrador: {
    id: string
    configuracion: ConfiguracionWizardPaso1
    propuestaActividades: ActividadPropuesta[]
    advertencias: string[]
    edtsPendientesIA: { id: string; nombre: string }[]
    estado: string
  } | null = null
  if (cronogramaPlanificacion) {
    const fila = await prisma.proyectoCronogramaGeneracionIA.findFirst({
      where: { proyectoCronogramaId: cronogramaPlanificacion.id, estado: 'borrador' },
      orderBy: { generadoEn: 'desc' },
      select: { id: true, configuracion: true, propuestaActividades: true, advertencias: true, estado: true },
    })
    if (fila) {
      const configuracion = fila.configuracion as unknown as ConfiguracionWizardPaso1
      const propuestaActividades = (fila.propuestaActividades as unknown as ActividadPropuesta[] | null) ?? []
      borrador = {
        id: fila.id,
        configuracion,
        propuestaActividades,
        advertencias: (fila.advertencias as unknown as string[] | null) ?? [],
        // Recalculado contra la propuesta YA guardada, no asumido en blanco —
        // si el borrador se guardó después de generar con IA, esos EDTs no
        // deben volver a aparecer como pendientes al restaurar.
        edtsPendientesIA: calcularEdtsPendientesIA(
          edts.filter(e => configuracion.edtsSeleccionados.includes(e.id)).map(e => ({ id: e.id, nombre: e.nombre })),
          propuestaActividades
        ),
        estado: fila.estado,
      }
    }
  }

  // La cotización solo resuelve EDTs de ENTREGABLES (lo que se vendió). Los
  // EDTs de SOPORTE (GES/CIE siempre, SEG/PRO por alcance, CMM sugerido) casi
  // nunca son una partida propia — se derivan acá por reglas duras, nunca
  // por IA. Cada uno sigue siendo editable en el Paso 1; solo cambia la
  // preselección y el motivo mostrado al usuario.
  const edtsSugeridosConOrigen = edtsComerciales
    ? derivarEdtsSoporte(
        edtsComerciales,
        edts.map(e => ({ id: e.id, nombre: e.nombre }))
      )
    : null

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
    // EDTs realmente vendidos/contratados en la cotización comercial del
    // proyecto (determinista, cero IA) — null si el proyecto no tiene
    // cotización comercial (ej. proyectos internos). Tiene prioridad sobre
    // cualquier sugerencia de IA para decidir qué EDTs preseleccionar.
    edtsSugeridosComercial: edtsComerciales,
    // Igual que edtsSugeridosComercial pero enriquecido con los EDTs de
    // soporte derivados por regla (ver derivarEdtsSoporte) y el origen de
    // cada uno ('cotizacion' | 'regla-siempre' | 'regla-derivada' |
    // 'regla-sugerencia') — el wizard lo usa para mostrar de dónde salió
    // cada preselección. null si no hay cotización comercial.
    edtsSugeridosConOrigen,
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
