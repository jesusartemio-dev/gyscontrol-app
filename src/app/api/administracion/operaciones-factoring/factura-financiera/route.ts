import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extraerDocumentoCobro, validarArchivo } from '@/lib/services/cobroDocumentoExtractor'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

function coincideDocumento(numeroDocumentoCxC: string | null, nroDoc: string): boolean {
  if (!numeroDocumentoCxC) return false
  return new RegExp(`(^|[^0-9])${nroDoc}$`).test(numeroDocumentoCxC.trim())
}

/**
 * Cada concepto que factura la financiera cae en su propio par de campos. La
 * reliquidación además lleva monto, porque es un cargo nuevo; el interés y los
 * gastos ya están en la liquidación y acá solo se les agrega la referencia de
 * la factura.
 */
const CAMPOS_POR_CONCEPTO: Record<string, { numero: string; fecha: string; monto?: string; etiqueta: string }> = {
  reliquidacion: { numero: 'numeroFacturaReliquidacion', fecha: 'fechaFacturaReliquidacion', monto: 'interesReliquidacion', etiqueta: 'Interés Reliquidación' },
  mora:          { numero: 'numeroFacturaMora',          fecha: 'fechaFacturaMora',                                        etiqueta: 'Mora' },
  interes:       { numero: 'numeroFacturaInteres',       fecha: 'fechaFacturaInteres',                                     etiqueta: 'Interés' },
  gastos:        { numero: 'numeroFacturaGastos',        fecha: 'fechaFacturaGastos',                                      etiqueta: 'Comisión / Gastos' },
}

// POST /api/administracion/operaciones-factoring/factura-financiera
//
// Lee una factura que la financiera le emite a GYS por un cargo de la
// operación (reliquidación, mora, interés o gastos) y la atribuye a la factura
// concreta que nombra el documento.
//
// Con ?aplicar=1 y el cuerpo JSON, guarda el cargo en el par de campos que le
// corresponde según el concepto. Sin eso, solo lee y devuelve la vista previa.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const aplicar = new URL(request.url).searchParams.get('aplicar') === '1'

    // ── Aplicar ──
    if (aplicar) {
      const Schema = z.object({
        cobroId: z.string().min(1),
        concepto: z.enum(['reliquidacion', 'mora', 'interes', 'gastos']),
        numeroFactura: z.string().max(100).nullable().optional(),
        fechaEmision: z.string().nullable().optional(),
        monto: z.number().nullable().optional(),
      })
      const data = Schema.parse(await request.json())
      const campos = CAMPOS_POR_CONCEPTO[data.concepto]

      const cobro = await prisma.cobroValorizacion.findUnique({ where: { id: data.cobroId }, select: { id: true, tipo: true } })
      if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
      if (cobro.tipo !== 'factoring') return NextResponse.json({ error: 'Solo aplica a operaciones de factoring' }, { status: 400 })

      const update: Record<string, unknown> = {
        [campos.numero]: data.numeroFactura ?? null,
        [campos.fecha]: data.fechaEmision ? new Date(data.fechaEmision) : null,
      }
      // El interés y los gastos ya vienen de la liquidación: acá solo se les
      // agrega la referencia, no se pisa su monto.
      if (campos.monto && data.monto != null) update[campos.monto] = data.monto

      await prisma.cobroValorizacion.update({ where: { id: data.cobroId }, data: update })
      return NextResponse.json({ aplicado: campos.etiqueta, campos: Object.keys(update) })
    }

    // ── Leer ──
    if (!(await isIAFeatureEnabled('documentosCobroIA'))) {
      return NextResponse.json({ error: 'La lectura automática de documentos está deshabilitada por el administrador.' }, { status: 403 })
    }
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    const errorArchivo = validarArchivo(file)
    if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 400 })

    const extraccion = await extraerDocumentoCobro(file, 'factura_financiera', session.user.id)
    if (extraccion.tipo !== 'factura_financiera') {
      return NextResponse.json(
        { error: `El documento se reconoció como ${String(extraccion.tipo).replace(/_/g, ' ')}, no como una factura de la financiera` },
        { status: 422 }
      )
    }
    const d = extraccion.datos

    // Sin el N° de documento el cargo no se puede atribuir a una factura.
    let cxc = null
    let estado: 'lista' | 'sin_documento' | 'no_encontrada' | 'ambigua' | 'sin_cobro' | 'operacion_distinta' | 'concepto_desconocido' = 'lista'
    if (!d.numeroDocumento) {
      estado = 'sin_documento'
    } else {
      const candidatas = await prisma.cuentaPorCobrar.findMany({
        where: { numeroDocumento: { endsWith: d.numeroDocumento } },
        select: {
          id: true, numeroDocumento: true, moneda: true,
          cliente: { select: { nombre: true } }, proyecto: { select: { codigo: true } },
          valorizacion: { select: { cobro: { select: { id: true, numeroOperacion: true } } } },
        },
      })
      const exactas = candidatas.filter(c => coincideDocumento(c.numeroDocumento, d.numeroDocumento!))
      if (exactas.length === 0) estado = 'no_encontrada'
      else if (exactas.length > 1) estado = 'ambigua'
      else {
        const c = exactas[0]
        const cobro = c.valorizacion?.cobro
        cxc = {
          id: c.id, numeroDocumento: c.numeroDocumento, moneda: c.moneda,
          cliente: c.cliente?.nombre ?? null, proyecto: c.proyecto?.codigo ?? null,
          cobroId: cobro?.id ?? null, operacionRegistrada: cobro?.numeroOperacion ?? null,
        }
        if (!cobro) estado = 'sin_cobro'
        else if (d.numeroOperacion && cobro.numeroOperacion && d.numeroOperacion !== cobro.numeroOperacion) estado = 'operacion_distinta'
      }
    }
    if (estado === 'lista' && (!d.concepto || !CAMPOS_POR_CONCEPTO[d.concepto])) estado = 'concepto_desconocido'

    return NextResponse.json({
      extraccion: d,
      observaciones: extraccion.observaciones,
      destino: d.concepto ? CAMPOS_POR_CONCEPTO[d.concepto]?.etiqueta ?? null : null,
      cxc,
      estado,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalle: error.issues }, { status: 400 })
    }
    console.error('[POST /operaciones-factoring/factura-financiera]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
