import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extraerDocumentoCobro, validarArchivo } from '@/lib/services/cobroDocumentoExtractor'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
const r2 = (n: number) => Math.round(n * 100) / 100

/** Mismo criterio que el Detalle de Liquidación: sufijo, sin asumir la serie. */
function coincideDocumento(numeroDocumentoCxC: string | null, nroDoc: string): boolean {
  if (!numeroDocumentoCxC) return false
  return new RegExp(`(^|[^0-9])${nroDoc}$`).test(numeroDocumentoCxC.trim())
}

// POST /api/administracion/operaciones-factoring/leer-excedentes
//
// Lee un Informe de Excedentes y cruza cada fila con su Cuenta por Cobrar.
//
// El informe llega al día siguiente de que el cliente paga y liquida el
// excedente por FACTURA, no por operación: una misma operación aparece en
// informes distintos según cuándo se cobró cada factura. Por eso el cruce es
// por operación + N° de documento, nunca solo por operación.
//
// No escribe nada: es la vista previa.
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

    const extraccion = await extraerDocumentoCobro(file, 'informe_excedentes', session.user.id)
    if (extraccion.tipo !== 'informe_excedentes') {
      return NextResponse.json(
        { error: `El documento se reconoció como ${String(extraccion.tipo).replace(/_/g, ' ')}, no como un Informe de Excedentes` },
        { status: 422 }
      )
    }
    if (extraccion.datos.filas.length === 0) {
      return NextResponse.json({ error: 'No se pudo leer ninguna fila del informe' }, { status: 422 })
    }

    const coincidencias = await Promise.all(extraccion.datos.filas.map(async fila => {
      // La suma tiene que dar el total de la fila: si no, se leyó mal algo.
      const sumado = r2((fila.montoExcedente ?? 0) + (fila.mora ?? 0) + (fila.comisionInteres ?? 0) + (fila.diferencia ?? 0) + (fila.otros ?? 0))
      const cuadraTotal = fila.total == null || Math.abs(sumado - fila.total) <= 0.02

      const base = { ...fila, sumado, cuadraTotal }
      if (!fila.numeroDocumento) {
        return { ...base, cxc: null, estado: 'sin_numero' as const, operacionRegistrada: null }
      }

      const candidatas = await prisma.cuentaPorCobrar.findMany({
        where: { numeroDocumento: { endsWith: fila.numeroDocumento } },
        select: {
          id: true, numeroDocumento: true, monto: true, moneda: true, estado: true,
          cliente: { select: { nombre: true } },
          proyecto: { select: { codigo: true } },
          valorizacion: {
            select: {
              id: true,
              cobro: { select: { id: true, numeroOperacion: true, excedenteMonto: true, mora: true, estado: true } },
            },
          },
        },
      })
      const exactas = candidatas.filter(c => coincideDocumento(c.numeroDocumento, fila.numeroDocumento!))

      if (exactas.length === 0) return { ...base, cxc: null, estado: 'no_encontrada' as const, operacionRegistrada: null }
      if (exactas.length > 1) return { ...base, cxc: null, estado: 'ambigua' as const, operacionRegistrada: null }

      const c = exactas[0]
      const cobro = c.valorizacion?.cobro
      const datos = {
        ...base,
        cxc: {
          id: c.id, numeroDocumento: c.numeroDocumento, monto: c.monto, moneda: c.moneda,
          cliente: c.cliente?.nombre ?? null, proyecto: c.proyecto?.codigo ?? null,
        },
        operacionRegistrada: cobro?.numeroOperacion ?? null,
        cobroId: cobro?.id ?? null,
        excedenteEsperado: cobro?.excedenteMonto ?? null,
      }

      // Sin factoring registrado no hay dónde guardar el cierre.
      if (!cobro) return { ...datos, estado: 'sin_cobro' as const }
      // El informe trae la operación: si no es la registrada, algo no calza y
      // no se toca nada.
      if (fila.numeroOperacion && cobro.numeroOperacion && fila.numeroOperacion !== cobro.numeroOperacion) {
        return { ...datos, estado: 'operacion_distinta' as const }
      }
      if (cobro.mora != null) return { ...datos, estado: 'ya_cerrada' as const }
      return { ...datos, estado: 'lista' as const }
    }))

    return NextResponse.json({
      informe: {
        financiera: extraccion.datos.financiera,
        fechaInforme: extraccion.datos.fechaInforme,
        totalGeneral: extraccion.datos.totalGeneral,
        filas: extraccion.datos.filas.length,
      },
      observaciones: extraccion.observaciones,
      coincidencias,
    })
  } catch (error) {
    console.error('[POST /operaciones-factoring/leer-excedentes]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: `Error procesando el documento: ${message}` }, { status: 500 })
  }
}
