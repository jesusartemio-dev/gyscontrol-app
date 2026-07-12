import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { adquirirLockCronogramaIA, liberarLockCronogramaIA } from '@/lib/cronogramaIA/mutex'
import { generarAsignacionConEsquema } from '@/lib/cronogramaIA/generarAsignacionConEsquema'
import { EDTS_ESQUEMA_DOS_ETAPAS } from '@/lib/cronogramaIA/reglasActividades'
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1, EsquemaElegido } from '@/types/cronogramaIA'
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
  nombresActividades: string[]
  indiceOriginal: number | null
  criterioOriginal: string | null
}

function validarBody(raw: unknown): BodyEsperado | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (b.edtNombre !== 'CON' && b.edtNombre !== 'PRO') return null
  if (!Array.isArray(b.nombresActividades) || b.nombresActividades.length === 0) return null
  const nombresActividades = b.nombresActividades.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
  if (nombresActividades.length === 0) return null
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
    return NextResponse.json({ error: 'Body inválido — se espera { edtNombre: "CON"|"PRO", nombresActividades: string[] }' }, { status: 400 })
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

    const resultado = await generarAsignacionConEsquema({
      edtNombre: body.edtNombre,
      nombresActividades: body.nombresActividades,
      serviciosPermitidos,
      alcanceLibre: config.alcanceLibre,
      cotizacion,
      equiposReales,
      config: { brownfield: config.brownfield, ingenieriaDetalle: config.ingenieriaDetalle },
      userId: session.user.id,
      proyectoId,
    })

    const actividadesPrevias = ((generacion.propuestaActividades as unknown as ActividadPropuesta[]) ?? []).filter(a => a.edtNombre !== body.edtNombre)
    const propuestaActividades = [...actividadesPrevias, ...resultado.actividades]
    const advertencias = [...((generacion.advertencias as unknown as string[]) ?? []), ...resultado.advertencias]

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

    return NextResponse.json({
      generacionId: actualizado.id,
      propuestaActividades: actualizado.propuestaActividades,
      advertencias: actualizado.advertencias,
    })
  } finally {
    await liberarLockCronogramaIA(generacion.proyectoCronogramaId)
  }
}
