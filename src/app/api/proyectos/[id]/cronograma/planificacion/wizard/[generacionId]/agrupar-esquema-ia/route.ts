import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { adquirirLockCronogramaIA, liberarLockCronogramaIA } from '@/lib/cronogramaIA/mutex'
import { generarAsignacionConEsquema } from '@/lib/cronogramaIA/generarAsignacionConEsquema'
import { sugerirYAplicarCantidades } from '@/lib/cronogramaIA/generarSugerenciasCantidad'
import { EDTS_ESQUEMA_DOS_ETAPAS } from '@/lib/cronogramaIA/reglasActividades'
import { resolverAliasParaNombres } from '@/lib/cronogramaIA/aliasActividad'
import { FAMILIA_SOPORTES_FABRICADOS, NOMBRE_FAMILIA_OFICIAL_PRO } from '@/lib/cronogramaIA/vocabularioFamiliasPro'
import { EDT_SERVICIOS_ALQUILERES, separarServiciosYAlquileres } from '@/lib/cronogramaIA/separarServiciosAlquileres'
import { agregarEntregaEnObra } from '@/lib/cronogramaIA/entregaEnObraPro'
import { aplicarAprobacionCliente } from '@/lib/cronogramaIA/aprobacionClientePro'
import { normalizarNombreTarea } from '@/lib/cronogramaIA/matchTareaCatalogo'
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1, EsquemaElegido, NombreConAlias } from '@/types/cronogramaIA'
import type { ContextoCotizacionParaPrompt, EquipoRealParaPrompt } from '@/lib/cronogramaIA/prompts'

export const maxDuration = 120

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

interface LineaClasificada {
  descripcion: string
  monto: number
  categoria: 'equipos' | 'servicios' | 'gastos'
}

type EdtConEsquema = 'CON' | 'PRO'

const CATEGORIA_LINEAS_POR_EDT: Record<EdtConEsquema, LineaClasificada['categoria']> = {
  CON: 'servicios',
  PRO: 'equipos',
}
const MAX_LINEAS_CONTEXTO = 15

interface BodyEsperado {
  edtNombre: EdtConEsquema
  nombresActividades: NombreConAlias[]
  indiceOriginal: number | null
  criterioOriginal: string | null
}

/**
 * El alias que llega del cliente ya pasó por la misma validación en el
 * wizard (ver aliasActividad.ts), pero el servidor nunca confía en eso —
 * se vuelve a resolver acá (no vacío, una palabra, único dentro del
 * esquema) antes de usarlo para prefijar tareas.
 */
function validarBody(raw: unknown): BodyEsperado | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (b.edtNombre !== 'CON' && b.edtNombre !== 'PRO') return null
  if (!Array.isArray(b.nombresActividades) || b.nombresActividades.length === 0) return null

  const crudos = b.nombresActividades
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map(n => ({
      nombre: typeof n.nombre === 'string' ? n.nombre.trim() : '',
      aliasPropuesto: typeof n.alias === 'string' ? n.alias : undefined,
    }))
    .filter(n => n.nombre.length > 0)
  if (crudos.length === 0) return null

  const aliasPorNombre = resolverAliasParaNombres(crudos)
  const nombresActividades = crudos.map(n => ({ nombre: n.nombre, alias: aliasPorNombre.get(n.nombre)! }))

  return {
    edtNombre: b.edtNombre,
    nombresActividades,
    indiceOriginal: typeof b.indiceOriginal === 'number' ? b.indiceOriginal : null,
    criterioOriginal: typeof b.criterioOriginal === 'string' ? b.criterioOriginal : null,
  }
}

/** Etapa B del flujo de esquemas — asigna tareas (por id) a los nombres de Actividad ya elegidos/editados por el usuario en la Etapa A. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const body = validarBody(await req.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ error: 'Body inválido — se espera { edtNombre: "CON"|"PRO", nombresActividades: { nombre: string; alias?: string }[] }' }, { status: 400 })
  }

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true, configuracion: true, propuestaActividades: true, advertencias: true, esquemaElegido: true },
  })
  if (!generacion) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }
  if (generacion.estado === 'aplicado') {
    return NextResponse.json({ error: 'Esta generación ya fue aplicada al cronograma y no se puede editar.' }, { status: 409 })
  }

  const validacion = await validarPermisoCronograma(generacion.proyectoCronogramaId)
  if (!validacion.ok) return validacion.response

  if (!(await isIAFeatureEnabled('cronogramaPlanificacionIA'))) {
    return NextResponse.json({ error: 'La generación de cronograma con IA está deshabilitada.' }, { status: 403 })
  }

  const lock = await adquirirLockCronogramaIA(generacion.proyectoCronogramaId, 'agrupar-esquema-ia')
  if (!lock.ok) {
    return NextResponse.json(
      { error: `Ya hay una operación de IA en curso ("${lock.conflicto?.operacion}") para este cronograma.` },
      { status: 409 }
    )
  }

  try {
    const config = generacion.configuracion as unknown as ConfiguracionWizardPaso1

    if (!(EDTS_ESQUEMA_DOS_ETAPAS as readonly string[]).includes(body.edtNombre) || !config.edtsSeleccionados) {
      return NextResponse.json({ error: `${body.edtNombre} no es un EDT de esquema en 2 etapas.` }, { status: 400 })
    }

    const edt = await prisma.edt.findFirst({
      where: { nombre: body.edtNombre, id: { in: config.edtsSeleccionados } },
      include: { catalogoServicio: { include: { unidadServicio: true, recurso: true }, orderBy: { orden: 'asc' } } },
    })
    if (!edt) {
      return NextResponse.json({ error: `${body.edtNombre} no está seleccionado en este borrador.` }, { status: 400 })
    }

    const serviciosPermitidos: CatalogoServicioParaWizard[] = edt.catalogoServicio.map(s => ({
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

    const cotizacionDoc = await prisma.proyectoCotizacionDocumento.findUnique({
      where: { proyectoId },
      select: { resumenAlcance: true, exclusiones: true, lineasClasificadas: true },
    })
    const lineasClasificadas = (cotizacionDoc?.lineasClasificadas as LineaClasificada[] | null) ?? []
    const cotizacion: ContextoCotizacionParaPrompt | null = cotizacionDoc
      ? {
          resumenAlcance: (cotizacionDoc.resumenAlcance as string[] | null) ?? [],
          exclusiones: (cotizacionDoc.exclusiones as string[] | null) ?? [],
          lineas: lineasClasificadas
            .filter(l => l.categoria === CATEGORIA_LINEAS_POR_EDT[body.edtNombre])
            .sort((a, b) => b.monto - a.monto)
            .slice(0, MAX_LINEAS_CONTEXTO),
        }
      : null

    let equiposReales: EquipoRealParaPrompt[] | null = null
    if (body.edtNombre === 'PRO') {
      const equipos = await prisma.proyectoEquipoCotizado.findMany({
        where: { proyectoId },
        select: {
          proyectoEquipoCotizadoItem: {
            select: { codigo: true, descripcion: true, marca: true, cantidad: true, unidad: true, categoria: true },
          },
        },
      })
      equiposReales = equipos.flatMap(g =>
        g.proyectoEquipoCotizadoItem.map(item => ({
          codigo: item.codigo,
          descripcion: item.descripcion,
          marca: item.marca,
          cantidad: item.cantidad,
          unidad: item.unidad,
          categoria: item.categoria,
        }))
      )
    }

    // Anti-duplicado de tareasNuevasPropuestas mira TODO el catálogo real,
    // no solo el filtrado por este EDT — una tarea nueva podría calzar con
    // un servicio de otro EDT.
    const catalogoCompleto = await prisma.catalogoServicio.findMany({ select: { id: true, nombre: true } })

    const resultado = await generarAsignacionConEsquema({
      edtNombre: body.edtNombre,
      nombresActividades: body.nombresActividades,
      serviciosPermitidos,
      catalogoCompleto,
      alcanceLibre: config.alcanceLibre,
      cotizacion,
      equiposReales,
      config: {
        brownfield: config.brownfield,
        ingenieriaDetalle: config.ingenieriaDetalle,
        nPets: config.nPets,
        tableros: config.tableros,
        plcs: config.plcs,
        hmiCantidad: config.hmiCantidad,
      },
      userId: session.user.id,
      proyectoId,
    })

    // Best-effort: sugiere `cantidad` (con IA) solo para servicios con
    // notaCantidad que el mapeo determinístico no pudo resolver — nunca
    // bloquea la generación si falla.
    const sugerenciaCantidad = await sugerirYAplicarCantidades(resultado.actividades, {
      alcanceLibre: config.alcanceLibre,
      cotizacion,
      userId: session.user.id,
      proyectoId,
    })
    resultado.actividades = sugerenciaCantidad.actividades
    resultado.advertencias.push(...sugerenciaCantidad.advertencias)

    // PRO = materiales; las familias de alquiler y subcontrato pasan al EDT SER
    // "Servicios y Alquileres" con sus propios pasos (ver separarServiciosAlquileres.ts).
    if (body.edtNombre === 'PRO') {
      const ser = await prisma.edt.findUnique({
        where: { nombre: EDT_SERVICIOS_ALQUILERES },
        include: { catalogoServicio: { include: { unidadServicio: true, recurso: true }, orderBy: { orden: 'asc' } } },
      })
      if (ser) {
        const serviciosSer: CatalogoServicioParaWizard[] = ser.catalogoServicio.map(s => ({
          id: s.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          edtNombre: ser.nombre,
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
        const aliasPorNombre = new Map(body.nombresActividades.filter(n => n.alias).map(n => [n.nombre, n.alias!]))
        resultado.actividades = separarServiciosYAlquileres(resultado.actividades, serviciosSer, {
          brownfield: config.brownfield,
          ingenieriaDetalle: config.ingenieriaDetalle,
          nPets: config.nPets,
          tableros: config.tableros,
          plcs: config.plcs,
          hmiCantidad: config.hmiCantidad,
        }, aliasPorNombre)
      }
      // Equipos e instrumentos: Recepción de Cotizaciones → Evaluación Técnica → ◆ Aprobación por {cliente} antes de la OC.
      const proyectoCliente = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { cliente: { select: { nombre: true } } } })
      resultado.actividades = aplicarAprobacionCliente(resultado.actividades, serviciosPermitidos, {
        brownfield: config.brownfield,
        ingenieriaDetalle: config.ingenieriaDetalle,
        nPets: config.nPets,
        tableros: config.tableros,
        plcs: config.plcs,
        hmiCantidad: config.hmiCantidad,
      }, proyectoCliente?.cliente?.nombre)
      // Traslados: una actividad final "Seguimiento y Entrega en Obra" en vez de uno por familia.
      resultado.actividades = agregarEntregaEnObra(resultado.actividades)
    }

    // Al re-agrupar PRO también se reemplaza lo que había pasado a SER.
    const edtsReemplazados = new Set<string>(body.edtNombre === 'PRO' ? ['PRO', EDT_SERVICIOS_ALQUILERES] : [body.edtNombre])
    const actividadesPrevias = ((generacion.propuestaActividades as unknown as ActividadPropuesta[]) ?? []).filter(a => !edtsReemplazados.has(a.edtNombre))
    const propuestaActividades = [...actividadesPrevias, ...resultado.actividades]

    // Aviso temprano (antes de aplicar) — "Soportes Fabricados" depende de
    // planos previos de PLA (ver reglasDependencias.ts); el vínculo real se
    // crea recién al aplicar el cronograma, pero el usuario debe poder verlo
    // acá, en el mismo Alert de advertencias del Paso 2.
    const advertenciasSoportesFabricados: string[] = []
    if (body.edtNombre === 'PRO' && body.nombresActividades.some(n => n.nombre === FAMILIA_SOPORTES_FABRICADOS)) {
      const plaEnAlcance = await prisma.edt.findFirst({ where: { nombre: 'PLA', id: { in: config.edtsSeleccionados } }, select: { id: true } })
      if (!plaEnAlcance) {
        advertenciasSoportesFabricados.push('Soportes Fabricados requiere planos previos — verifica quién los elabora.')
      }
    }

    const advertencias = [
      ...((generacion.advertencias as unknown as string[]) ?? []),
      ...resultado.advertencias,
      ...advertenciasSoportesFabricados,
    ]

    const esquemaElegidoPrevio = (generacion.esquemaElegido as Record<string, EsquemaElegido> | null) ?? {}
    const esquemaElegido: Record<string, EsquemaElegido> = {
      ...esquemaElegidoPrevio,
      [body.edtNombre]: {
        nombres: body.nombresActividades,
        criterioOriginal: body.criterioOriginal,
        indiceOriginal: body.indiceOriginal,
      },
    }

    const actualizado = await prisma.proyectoCronogramaGeneracionIA.update({
      where: { id: generacionId },
      data: { propuestaActividades, advertencias, esquemaElegido },
    })

    // Registro PURAMENTE INFORMATIVO (ver CronogramaIASugerenciaAceptada) —
    // nunca escribe en CatalogoServicio. Cualquier familia de PRO confirmada
    // que no esté en el vocabulario oficial queda registrada para el aviso
    // de "usada en N proyectos" de /catalogo/servicios. Best-effort, nunca
    // bloquea la confirmación de la Etapa B.
    if (body.edtNombre === 'PRO') {
      const familiasFueraDeVocabulario = body.nombresActividades.filter(n => !NOMBRE_FAMILIA_OFICIAL_PRO.has(n.nombre))
      if (familiasFueraDeVocabulario.length > 0) {
        try {
          await prisma.cronogramaIASugerenciaAceptada.createMany({
            data: familiasFueraDeVocabulario.map(n => ({
              proyectoId,
              generacionId,
              tipo: 'familia_fuera_vocabulario',
              nombre: n.nombre,
              nombreNormalizado: normalizarNombreTarea(n.nombre),
              edtNombre: body.edtNombre,
              aceptadaPorId: session.user!.id,
            })),
          })
        } catch (e) {
          console.error('No se pudo registrar la sugerencia de familia fuera de vocabulario:', e)
        }
      }
    }

    return NextResponse.json({
      generacionId: actualizado.id,
      propuestaActividades: actualizado.propuestaActividades,
      advertencias: actualizado.advertencias,
    })
  } finally {
    await liberarLockCronogramaIA(generacion.proyectoCronogramaId)
  }
}
