import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { adquirirLockCronogramaIA, liberarLockCronogramaIA } from '@/lib/cronogramaIA/mutex'
import { generarPropuestaConIA } from '@/lib/cronogramaIA/generarPropuestaConIA'
import { EDTS_CON_IA } from '@/lib/cronogramaIA/reglasActividades'
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'
import type { ContextoCotizacionParaPrompt } from '@/lib/cronogramaIA/prompts'

export const maxDuration = 120

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

interface LineaClasificada {
  descripcion: string
  monto: number
  categoria: 'equipos' | 'servicios' | 'gastos'
}

const CATEGORIA_LINEAS_POR_EDT: Record<'CON' | 'PRO', LineaClasificada['categoria']> = {
  CON: 'servicios',
  PRO: 'equipos',
}
const MAX_LINEAS_CONTEXTO = 15

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true, configuracion: true, propuestaActividades: true, advertencias: true },
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

  const lock = await adquirirLockCronogramaIA(generacion.proyectoCronogramaId, 'proponer-actividades-ia')
  if (!lock.ok) {
    return NextResponse.json(
      { error: `Ya hay una operación de IA en curso ("${lock.conflicto?.operacion}") para este cronograma.` },
      { status: 409 }
    )
  }

  try {
    const config = generacion.configuracion as unknown as ConfiguracionWizardPaso1

    const edtsIA = await prisma.edt.findMany({
      where: {
        id: { in: config.edtsSeleccionados },
        nombre: { in: [...EDTS_CON_IA] },
      },
      include: { catalogoServicio: { include: { unidadServicio: true, recurso: true }, orderBy: { orden: 'asc' } } },
    })

    if (edtsIA.length === 0) {
      return NextResponse.json({
        generacionId: generacion.id,
        propuestaActividades: generacion.propuestaActividades,
        advertencias: generacion.advertencias ?? [],
        mensaje: 'No hay EDTs de CON/PRO seleccionados en este borrador.',
      })
    }

    const cotizacionDoc = await prisma.proyectoCotizacionDocumento.findUnique({
      where: { proyectoId },
      select: { resumenAlcance: true, exclusiones: true, lineasClasificadas: true },
    })

    const lineasClasificadas = (cotizacionDoc?.lineasClasificadas as LineaClasificada[] | null) ?? []

    function construirContextoCotizacion(edtNombre: 'CON' | 'PRO'): ContextoCotizacionParaPrompt | null {
      if (!cotizacionDoc) return null
      const categoria = CATEGORIA_LINEAS_POR_EDT[edtNombre]
      const lineas = lineasClasificadas
        .filter(l => l.categoria === categoria)
        .sort((a, b) => b.monto - a.monto)
        .slice(0, MAX_LINEAS_CONTEXTO)
      return {
        resumenAlcance: (cotizacionDoc.resumenAlcance as string[] | null) ?? [],
        exclusiones: (cotizacionDoc.exclusiones as string[] | null) ?? [],
        lineas,
      }
    }

    const resultados = await Promise.allSettled(
      edtsIA.map(async edt => {
        const nombre = edt.nombre as 'CON' | 'PRO'
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

        return generarPropuestaConIA({
          edtNombre: nombre,
          serviciosPermitidos,
          alcanceLibre: config.alcanceLibre,
          cotizacion: construirContextoCotizacion(nombre),
          config: { brownfield: config.brownfield, ingenieriaDetalle: config.ingenieriaDetalle },
          userId: session.user.id,
          proyectoId,
        })
      })
    )

    const nuevasActividades: ActividadPropuesta[] = []
    const advertenciasIA: string[] = []
    for (const r of resultados) {
      if (r.status === 'fulfilled') {
        nuevasActividades.push(...r.value.actividades)
        advertenciasIA.push(...r.value.advertencias)
      } else {
        advertenciasIA.push(`Error inesperado generando propuesta de IA: ${r.reason instanceof Error ? r.reason.message : 'desconocido'}`)
      }
    }

    const edtsNombresIA = new Set(edtsIA.map(e => e.nombre))
    const actividadesPrevias = ((generacion.propuestaActividades as unknown as ActividadPropuesta[]) ?? []).filter(
      a => !edtsNombresIA.has(a.edtNombre)
    )
    const propuestaActividades = [...actividadesPrevias, ...nuevasActividades]
    const advertencias = [...((generacion.advertencias as unknown as string[]) ?? []), ...advertenciasIA]

    const actualizado = await prisma.proyectoCronogramaGeneracionIA.update({
      where: { id: generacionId },
      data: { propuestaActividades, advertencias },
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
