import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { obtenerEdtsComercialesProyecto, obtenerEvidenciasCotizacion } from '@/lib/cronogramaIA/obtenerEdtsComerciales'
import { derivarEdtsSoporte } from '@/lib/cronogramaIA/derivarEdtsSoporte'
import type { EvidenciaTexto } from '@/lib/cronogramaIA/detectarEdtsPosibles'
import { calcularEdtsPendientesIA } from '@/lib/cronogramaIA/reglasActividades'
import type { ActividadPropuesta, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'
import { configuracionWizardPaso1Schema } from '@/lib/validators/cronogramaIA'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'

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

  const [edts, cronogramaPlanificacion, cotizacionDocumento, edtsComerciales, correcciones, evidenciasCotizacion, orgNodos] = await Promise.all([
    prisma.edt.findMany({
      include: { faseDefault: true, _count: { select: { catalogoServicio: true } } },
      orderBy: [{ faseDefault: { orden: 'asc' } }, { orden: 'asc' }],
    }),
    prisma.proyectoCronograma.findUnique({
      where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
      select: { id: true, bloqueado: true },
    }),
    prisma.proyectoCotizacionDocumento.findUnique({
      where: { proyectoId },
      select: { resumenAlcance: true, exclusiones: true, numeroPropuesta: true, clienteDetectado: true, formaPago: true },
    }),
    obtenerEdtsComercialesProyecto(proyectoId),
    // Correcciones manuales a nivel proyecto (ver ProyectoCronogramaEdtCorreccion)
    // — nunca tocan la cotización real, es un agregado puramente aditivo para
    // casos como una partida mal clasificada al armar la cotización.
    prisma.proyectoCronogramaEdtCorreccion.findMany({
      where: { proyectoId },
      select: { id: true, edtId: true, motivo: true, creadoEn: true, edt: { select: { nombre: true, descripcion: true } } },
      orderBy: { creadoEn: 'asc' },
    }),
    // Evidencia textual de las partidas de la cotización real (nombre real de
    // cada línea + a qué EDT está tageada) para detectarEdtsPosibles — ver
    // abajo. Nunca modifica la cotización, solo la lee.
    obtenerEvidenciasCotizacion(proyectoId),
    // Organigrama del proyecto — base para el badge/advertencia del Paso 1 y
    // para la autoasignación de responsables integrada en la generación.
    prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } },
    }),
  ])

  let borrador: {
    id: string
    configuracion: ConfiguracionWizardPaso1
    propuestaActividades: ActividadPropuesta[]
    advertencias: string[]
    edtsPendientesIA: { id: string; nombre: string }[]
    estado: string
  } | null = null
  // true si se encontró un borrador pero su `configuracion` no pasó la
  // validación (corrupta, vacía o de un schemaVersion/schema anterior) — el
  // cliente lo usa para avisar al usuario en vez de fallar en silencio.
  let borradorDescartado = false
  if (cronogramaPlanificacion) {
    const fila = await prisma.proyectoCronogramaGeneracionIA.findFirst({
      where: { proyectoCronogramaId: cronogramaPlanificacion.id, estado: 'borrador' },
      orderBy: { generadoEn: 'desc' },
      select: { id: true, configuracion: true, propuestaActividades: true, advertencias: true, estado: true },
    })
    if (fila) {
      const parsed = configuracionWizardPaso1Schema.safeParse(fila.configuracion)
      if (!parsed.success) {
        // Nunca se restaura en silencio un borrador corrupto/vacío/desactualizado
        // (bug real: reabrir el wizard mostraba "restaurado" con todos los EDTs
        // destildados). Se descarta de forma no destructiva — queda auditable —
        // y el wizard cae al flujo normal de precarga.
        await prisma.proyectoCronogramaGeneracionIA.update({
          where: { id: fila.id },
          data: { estado: 'descartado' },
        })
        borradorDescartado = true
      } else {
        const configuracion = parsed.data
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
  }

  const correccionesIds = correcciones.map(c => c.edtId)

  // La cotización solo resuelve EDTs de ENTREGABLES (lo que se vendió). Los
  // EDTs de SOPORTE (GES/CIE siempre, SEG/PRO por alcance, CMM sugerido) casi
  // nunca son una partida propia — se derivan acá por reglas duras, nunca
  // por IA. Las correcciones manuales del proyecto (edt-correcciones) se
  // suman a lo que vino de la cotización ANTES de derivar soporte — así una
  // corrección como agregar PLA también puede disparar sus propias reglas
  // aguas abajo si correspondiera. Cada EDT sigue siendo editable en el
  // Paso 1; esto solo decide la preselección y el motivo mostrado.
  const edtsSugeridosConOrigen =
    edtsComerciales || correccionesIds.length > 0
      ? derivarEdtsSoporte(
          edtsComerciales ?? [],
          edts.map(e => ({ id: e.id, nombre: e.nombre })),
          correccionesIds
        )
      : null

  // Evidencia textual para la detección proactiva de posible mal-tageo de
  // EDT (heurística por keywords, sin LLM — ver detectarEdtsPosibles.ts) —
  // ej. una partida "DESARROLLO DE PLANOS" tageada como ING en vez de PLA.
  // Se manda la evidencia cruda (partidas de la cotización + resumen de
  // alcance del PDF) para que el wizard corra la detección en el cliente y
  // la pueda re-evaluar en vivo a medida que el usuario edita la
  // descripción libre del alcance del Paso 1 — una sola fuente de verdad
  // para la heurística, no una copia server-side que se desactualiza.
  const resumenAlcanceEvidencias: EvidenciaTexto[] = (
    (cotizacionDocumento?.resumenAlcance as string[] | null) ?? []
  ).map(bullet => ({ texto: bullet, origen: 'Resumen de alcance de la cotización' }))
  const todasLasEvidencias = [...evidenciasCotizacion, ...resumenAlcanceEvidencias]

  // Resumen del organigrama para el Paso 1 (badge/advertencia, nunca
  // bloqueante) — los responsables se autoasignan desde acá al generar.
  const organigramaResuelto = resolverOrganigramaProyecto(orgNodos)
  const rolesResueltos = Array.from(organigramaResuelto.porRol.entries())
  const organigramaResumen = {
    tieneOrganigrama: orgNodos.some(n => n.userId),
    rolesDetectados: rolesResueltos.filter(([, persona]) => !!persona).length,
    rolesFaltantes: rolesResueltos.filter(([, persona]) => !persona).map(([rol]) => rol),
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
    borradorDescartado,
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
    // Correcciones manuales guardadas para este proyecto (ver
    // ProyectoCronogramaEdtCorreccion) — el wizard las muestra gestionables
    // (agregar/quitar) junto a la lista de EDTs.
    correccionesEdt: correcciones.map(c => ({
      id: c.id,
      edtId: c.edtId,
      edtNombre: c.edt.nombre,
      edtDescripcion: c.edt.descripcion,
      motivo: c.motivo,
      creadoEn: c.creadoEn,
    })),
    // Evidencia cruda (partidas de la cotización + resumen de alcance) para
    // que el wizard corra detectarEdtsPosibles en el cliente y la reevalúe
    // en vivo con la descripción libre del alcance del Paso 1. El wizard
    // muestra los EDTs detectados con badge "Posible según cotización —
    // confirma", sin marcarlos automáticamente.
    evidenciasCotizacion: todasLasEvidencias,
    tieneCotizacionDocumento: !!cotizacionDocumento,
    // Ver comentario arriba — badge/advertencia no bloqueante del Paso 1.
    organigramaResumen,
    cotizacionResumen: cotizacionDocumento
      ? {
          numeroPropuesta: cotizacionDocumento.numeroPropuesta,
          clienteDetectado: cotizacionDocumento.clienteDetectado,
          resumenAlcance: (cotizacionDocumento.resumenAlcance as string[] | null) ?? [],
          exclusiones: (cotizacionDocumento.exclusiones as string[] | null) ?? [],
          formaPago: cotizacionDocumento.formaPago ?? null,
        }
      : null,
  })
}
