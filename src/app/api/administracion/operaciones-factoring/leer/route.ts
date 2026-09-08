import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extraerDocumentoCobro, validarArchivo } from '@/lib/services/cobroDocumentoExtractor'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * El "NRO. DOC." de la liquidación son los últimos dígitos de la factura
 * (1719 ↔ E001-1719). No se asume la serie: se busca por sufijo y se exige que
 * el carácter anterior no sea un dígito, para que "1719" no enganche con
 * "E001-11719".
 */
function coincideDocumento(numeroDocumentoCxC: string | null, nroDoc: string): boolean {
  if (!numeroDocumentoCxC) return false
  return new RegExp(`(^|[^0-9])${nroDoc}$`).test(numeroDocumentoCxC.trim())
}

// POST /api/administracion/operaciones-factoring/leer
//
// Lee un Detalle de Liquidación de la financiera y cruza cada fila con su
// Cuenta por Cobrar. Una operación puede cubrir varias facturas, así que
// devuelve una coincidencia por documento, con lo que ya está registrado.
//
// NO escribe nada: es la vista previa. Aplicar es un paso aparte y explícito.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    if (!(await isIAFeatureEnabled('documentosCobroIA'))) {
      return NextResponse.json({ error: 'La lectura automática de documentos está deshabilitada por el administrador.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    const errorArchivo = validarArchivo(file)
    if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 400 })

    const extraccion = await extraerDocumentoCobro(file, 'liquidacion_factoring', session.user.id)
    if (extraccion.tipo !== 'liquidacion_factoring') {
      return NextResponse.json(
        { error: `El documento se reconoció como ${String(extraccion.tipo).replace(/_/g, ' ')}, no como un Detalle de Liquidación` },
        { status: 422 }
      )
    }
    const liq = extraccion.datos
    if (liq.documentos.length === 0) {
      return NextResponse.json({ error: 'No se pudo leer ninguna factura en el documento' }, { status: 422 })
    }

    const coincidencias = await Promise.all(liq.documentos.map(async doc => {
      const base = {
        numeroDocumento: doc.numeroDocumento,
        deudor: doc.deudor,
        montoDocumento: doc.montoDocumento,
        valorAFinanciar: doc.valorAFinanciar,
        excedenteMonto: doc.excedenteMonto,
        interesMonto: doc.interesMonto,
        montoAnticipo: doc.montoAnticipo,
        porcentajeAnticipo: doc.porcentajeAnticipo,
        diasFinanciamiento: doc.diasFinanciamiento,
        fechaVencimiento: doc.fechaVencimiento,
      }
      if (!doc.numeroDocumento) {
        return { ...base, cxc: null, estado: 'sin_numero' as const, detraccionCalculada: null, detraccionPct: null }
      }

      const candidatas = await prisma.cuentaPorCobrar.findMany({
        where: { numeroDocumento: { endsWith: doc.numeroDocumento } },
        select: {
          id: true, numeroDocumento: true, monto: true, moneda: true, estado: true,
          cliente: { select: { nombre: true } },
          proyecto: { select: { codigo: true } },
          valorizacion: { select: { id: true, cobro: { select: { id: true, numeroOperacion: true, estado: true } } } },
        },
      })
      const exactas = candidatas.filter(c => coincideDocumento(c.numeroDocumento, doc.numeroDocumento!))

      if (exactas.length === 0) return { ...base, cxc: null, estado: 'no_encontrada' as const, detraccionCalculada: null, detraccionPct: null }
      if (exactas.length > 1) {
        return {
          ...base, cxc: null, estado: 'ambigua' as const, detraccionCalculada: null, detraccionPct: null,
          candidatas: exactas.map(c => ({ id: c.id, numeroDocumento: c.numeroDocumento, proyecto: c.proyecto?.codigo })),
        }
      }

      const c = exactas[0]
      // El "MONTO DOCUM." de la liquidación es la factura YA NETA de detracción,
      // así que la detracción sale de la resta — y de paso valida el monto de
      // la CxC: si no da un porcentaje redondo, alguno de los dos está mal.
      const detraccionCalculada = doc.montoDocumento != null ? r2(c.monto - doc.montoDocumento) : null
      const detraccionPct = detraccionCalculada != null && c.monto > 0
        ? r2((detraccionCalculada / c.monto) * 100)
        : null

      return {
        ...base,
        cxc: {
          id: c.id, numeroDocumento: c.numeroDocumento, monto: c.monto, moneda: c.moneda,
          estado: c.estado, cliente: c.cliente?.nombre ?? null, proyecto: c.proyecto?.codigo ?? null,
          valorizacionId: c.valorizacion?.id ?? null,
          yaTieneCobro: !!c.valorizacion?.cobro,
          cobroOperacion: c.valorizacion?.cobro?.numeroOperacion ?? null,
        },
        estado: (c.valorizacion?.cobro ? 'ya_registrada' : 'lista') as 'ya_registrada' | 'lista',
        detraccionCalculada,
        detraccionPct,
      }
    }))

    return NextResponse.json({
      extraccion,
      operacion: {
        numeroOperacion: liq.numeroOperacion,
        financiera: liq.financiera,
        fechaDesembolso: liq.fechaDesembolso,
        cantidadDocumentos: liq.cantidadDocumentos ?? liq.documentos.length,
        // Se cobran por la operación completa: hay que repartirlos a mano.
        comisionEstructuracion: liq.comisionEstructuracion,
        gastosAdicionales: liq.gastosAdicionales,
        igvGastos: liq.igvGastos,
        adelantoBanpro: liq.adelantoBanpro,
        saldoAGirar: liq.saldoAGirar,
        aplicaciones: liq.aplicaciones,
      },
      coincidencias,
    })
  } catch (error) {
    console.error('[POST /operaciones-factoring/leer]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: `Error procesando el documento: ${message}` }, { status: 500 })
  }
}
