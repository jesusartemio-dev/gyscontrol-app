import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { adquirirLockCronogramaIA, liberarLockCronogramaIA } from '@/lib/cronogramaIA/mutex'
import { generarEsquemasConIA } from '@/lib/cronogramaIA/generarEsquemasConIA'
import { EDTS_ESQUEMA_DOS_ETAPAS } from '@/lib/cronogramaIA/reglasActividades'
import type { ConfiguracionWizardPaso1, EsquemaAgrupacionPropuesto } from '@/types/cronogramaIA'
import type { ContextoCotizacionParaPrompt, ContextoTdrParaPrompt, EquipoRealParaPrompt } from '@/lib/cronogramaIA/prompts'

export const maxDuration = 60

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
/** Tope de caracteres del resumen del TDR embebido en el prompt — es señal débil de contexto, no hace falta el texto completo. */
const MAX_RESUMEN_TDR = 1200

/** Etapa A del flujo de esquemas — propone 2-3 esquemas alternativos (solo nombres) para CON/PRO, sin asignar ninguna tarea todavía. */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true, configuracion: true, esquemasPropuestos: true },
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

  const lock = await adquirirLockCronogramaIA(generacion.proyectoCronogramaId, 'proponer-esquemas-ia')
  if (!lock.ok) {
    return NextResponse.json(
      { error: `Ya hay una operación de IA en curso ("${lock.conflicto?.operacion}") para este cronograma.` },
      { status: 409 }
    )
  }

  try {
    const config = generacion.configuracion as unknown as ConfiguracionWizardPaso1

    const edtsEsquema = await prisma.edt.findMany({
      where: { id: { in: config.edtsSeleccionados }, nombre: { in: [...EDTS_ESQUEMA_DOS_ETAPAS] } },
      select: { id: true, nombre: true, _count: { select: { catalogoServicio: true } } },
    })

    if (edtsEsquema.length === 0) {
      return NextResponse.json({
        generacionId: generacion.id,
        esquemasPorEdt: generacion.esquemasPropuestos ?? {},
        advertencias: [],
        mensaje: 'No hay EDTs de CON/PRO seleccionados en este borrador.',
      })
    }

    const cotizacionDoc = await prisma.proyectoCotizacionDocumento.findUnique({
      where: { proyectoId },
      select: { resumenAlcance: true, exclusiones: true, lineasClasificadas: true },
    })
    const lineasClasificadas = (cotizacionDoc?.lineasClasificadas as LineaClasificada[] | null) ?? []

    function construirContextoCotizacion(edtNombre: EdtConEsquema): ContextoCotizacionParaPrompt | null {
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

    // TDR — señal DÉBIL de contexto (ver bloqueContextoTdr en prompts.ts): la
    // solicitud original del cliente puede describir alcance que se redujo
    // en la negociación comercial. Solo alimenta el nombrado de zonas/
    // familias acá — nunca la selección de EDTs ni tareas fuera de catálogo.
    const tdrDoc = await prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
      select: {
        resumenTdr: true,
        alcanceDetectado: true,
        resumenEjecutivoNarrativa: true,
        resumenEjecutivoPuntos: true,
        equiposIdentificados: true,
        serviciosIdentificados: true,
      },
    })
    const tdr: ContextoTdrParaPrompt | null = tdrDoc
      ? {
          resumen: (tdrDoc.resumenEjecutivoNarrativa || tdrDoc.alcanceDetectado || tdrDoc.resumenTdr || '').slice(0, MAX_RESUMEN_TDR),
          puntos: ((tdrDoc.resumenEjecutivoPuntos as { texto: string }[] | null) ?? []).map(p => p.texto),
          equiposIdentificados: ((tdrDoc.equiposIdentificados as { nombre: string }[] | null) ?? []).map(e => e.nombre),
          serviciosIdentificados: ((tdrDoc.serviciosIdentificados as { nombre: string }[] | null) ?? []).map(s => s.nombre),
        }
      : null

    let equiposReales: EquipoRealParaPrompt[] | null = null
    if (edtsEsquema.length > 0) {
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

    const resultados = await Promise.allSettled(
      edtsEsquema.map(async edt => {
        const nombre = edt.nombre as EdtConEsquema
        const resultado = await generarEsquemasConIA({
          edtNombre: nombre,
          tieneTareasCandidatas: edt._count.catalogoServicio > 0,
          alcanceLibre: config.alcanceLibre,
          cotizacion: construirContextoCotizacion(nombre),
          equiposReales,
          tdr,
          userId: session.user!.id,
          proyectoId,
        })
        return { edtNombre: nombre, ...resultado }
      })
    )

    const esquemasPorEdt: Record<string, EsquemaAgrupacionPropuesto[]> = {
      ...((generacion.esquemasPropuestos as Record<string, EsquemaAgrupacionPropuesto[]> | null) ?? {}),
    }
    const advertencias: string[] = []
    for (const r of resultados) {
      if (r.status === 'fulfilled') {
        esquemasPorEdt[r.value.edtNombre] = r.value.esquemas
        advertencias.push(...r.value.advertencias)
      } else {
        advertencias.push(`Error inesperado proponiendo esquemas de IA: ${r.reason instanceof Error ? r.reason.message : 'desconocido'}`)
      }
    }

    await prisma.proyectoCronogramaGeneracionIA.update({
      where: { id: generacionId },
      data: { esquemasPropuestos: esquemasPorEdt },
    })

    return NextResponse.json({ generacionId: generacion.id, esquemasPorEdt, advertencias })
  } finally {
    await liberarLockCronogramaIA(generacion.proyectoCronogramaId)
  }
}
