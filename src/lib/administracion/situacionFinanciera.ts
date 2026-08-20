// Agregados del tablero "Situación Financiera" (empresa, no por proyecto).
//
// Ver diseño aprobado (project_situacion_financiera.md). Punto más delicado:
// "Cobrado real" NO puede leerse de CuentaPorCobrar.montoPagado — ese campo
// suma TODOS los PagoCobro no anulados, incluyendo costo de financiamiento y
// ajuste de mora (que no son dinero recibido). Acá se va siempre por
// PagoCobro directo, filtrando esos 2 flags.
//
// DSO/DPO usan SIEMPRE una ventana trailing de 365 días como denominador,
// independiente del rango de fecha pedido — con facturación tan dispareja
// (meses con 0-4 facturas), un denominador de un solo mes hace que el
// indicador salte sin que la cartera haya cambiado. Confirmado con datos
// reales de producción antes de implementar (ver conversación de diseño).

import { prisma } from '@/lib/prisma'

const MONEDAS = ['PEN', 'USD', 'EUR'] as const
type Moneda = (typeof MONEDAS)[number]

const ESTADOS_VALORIZADO = ['aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada'] as const
const ESTADOS_CXC_PENDIENTE = ['pendiente', 'parcial', 'vencida'] as const
const ESTADOS_CXP_PENDIENTE = ['pendiente', 'parcial', 'vencida'] as const

const DIAS_TRAILING_DSO_DPO = 365
const MS_DIA = 24 * 60 * 60 * 1000

export interface ParametrosSituacionFinanciera {
  desde: Date
  hasta: Date
  clienteId?: string
  moneda?: Moneda
}

export interface BucketAging {
  corriente: number
  d0_30: number
  d31_60: number
  d61_90: number
  d90mas: number
}

export interface AgingClienteRow {
  clienteId: string
  clienteNombre: string
  corriente: number
  d0_30: number
  d31_60: number
  d61_90: number
  d90mas: number
  total: number
}

export interface SituacionFinancieraMoneda {
  moneda: Moneda
  valorizado: { periodo: number; acumulado: number }
  facturado: { periodo: number; acumulado: number }
  cobradoReal: { periodo: number; acumulado: number }
  brechas: { valorizadoAFacturado: number; facturadoACobrado: number }
  costoFinanciamiento: { interesComision: number; ajusteMora: number; total: number }
  dso: number | null
  dpo: number | null
  cxp: { debido: number; pagadoPeriodo: number }
  agingCxC: { buckets: BucketAging; porCliente: AgingClienteRow[] }
}

export interface SituacionFinanciera {
  periodo: { desde: string; hasta: string; dias: number }
  porMoneda: SituacionFinancieraMoneda[]
}

function sumar(v: number | null | undefined): number {
  return v ?? 0
}

async function calcularValorizado(moneda: Moneda, clienteId: string | undefined, desde: Date, hasta: Date) {
  const whereBase = {
    moneda,
    estado: { in: [...ESTADOS_VALORIZADO] },
    ...(clienteId && { proyecto: { clienteId } }),
  }
  const [periodo, acumulado] = await Promise.all([
    prisma.valorizacion.aggregate({ where: { ...whereBase, fechaAprobacion: { gte: desde, lt: hasta } }, _sum: { montoValorizacion: true } }),
    prisma.valorizacion.aggregate({ where: whereBase, _sum: { montoValorizacion: true } }),
  ])
  return { periodo: sumar(periodo._sum.montoValorizacion), acumulado: sumar(acumulado._sum.montoValorizacion) }
}

async function calcularFacturado(moneda: Moneda, clienteId: string | undefined, desde: Date, hasta: Date) {
  const whereBase = { moneda, estado: { not: 'anulada' as const }, ...(clienteId && { clienteId }) }
  const [periodo, acumulado] = await Promise.all([
    prisma.cuentaPorCobrar.aggregate({ where: { ...whereBase, fechaEmision: { gte: desde, lt: hasta } }, _sum: { monto: true } }),
    prisma.cuentaPorCobrar.aggregate({ where: whereBase, _sum: { monto: true } }),
  ])
  return { periodo: sumar(periodo._sum.monto), acumulado: sumar(acumulado._sum.monto) }
}

async function calcularCobradoReal(moneda: Moneda, clienteId: string | undefined, desde: Date, hasta: Date) {
  const whereBase = {
    anulado: false,
    esCostoFinanciamiento: false,
    esAjusteMora: false,
    cuentaPorCobrar: { moneda, ...(clienteId && { clienteId }) },
  }
  const [periodo, acumulado] = await Promise.all([
    prisma.pagoCobro.aggregate({ where: { ...whereBase, fechaPago: { gte: desde, lt: hasta } }, _sum: { monto: true } }),
    prisma.pagoCobro.aggregate({ where: whereBase, _sum: { monto: true } }),
  ])
  return { periodo: sumar(periodo._sum.monto), acumulado: sumar(acumulado._sum.monto) }
}

async function calcularCostoFinanciamiento(moneda: Moneda, clienteId: string | undefined, desde: Date, hasta: Date) {
  const cuentaFiltro = { moneda, ...(clienteId && { clienteId }) }
  const [interesComision, ajusteMora] = await Promise.all([
    prisma.pagoCobro.aggregate({
      where: { anulado: false, esCostoFinanciamiento: true, fechaPago: { gte: desde, lt: hasta }, cuentaPorCobrar: cuentaFiltro },
      _sum: { monto: true },
    }),
    prisma.pagoCobro.aggregate({
      where: { anulado: false, esAjusteMora: true, fechaPago: { gte: desde, lt: hasta }, cuentaPorCobrar: cuentaFiltro },
      _sum: { monto: true },
    }),
  ])
  const ic = sumar(interesComision._sum.monto)
  const am = sumar(ajusteMora._sum.monto)
  return { interesComision: ic, ajusteMora: am, total: ic + am }
}

async function calcularDsoDpo(moneda: Moneda, clienteId: string | undefined) {
  const hoy = new Date()
  const desdeTrailing = new Date(hoy.getTime() - DIAS_TRAILING_DSO_DPO * MS_DIA)

  const [cxcPendiente, facturado365, cxpPendiente, comprado365] = await Promise.all([
    prisma.cuentaPorCobrar.aggregate({
      where: { moneda, estado: { in: [...ESTADOS_CXC_PENDIENTE] }, ...(clienteId && { clienteId }) },
      _sum: { saldoPendiente: true },
    }),
    prisma.cuentaPorCobrar.aggregate({
      where: { moneda, estado: { not: 'anulada' }, fechaEmision: { gte: desdeTrailing, lt: hoy }, ...(clienteId && { clienteId }) },
      _sum: { monto: true },
    }),
    // DPO no se filtra por cliente (es de proveedores, sin relación con el filtro de cliente de CxC).
    prisma.cuentaPorPagar.aggregate({
      where: { moneda, estado: { in: [...ESTADOS_CXP_PENDIENTE] } },
      _sum: { saldoPendiente: true },
    }),
    prisma.cuentaPorPagar.aggregate({
      where: { moneda, estado: { not: 'anulada' }, fechaRecepcion: { gte: desdeTrailing, lt: hoy } },
      _sum: { monto: true },
    }),
  ])

  const facturadoMonto = sumar(facturado365._sum.monto)
  const compradoMonto = sumar(comprado365._sum.monto)

  return {
    dso: facturadoMonto > 0 ? (sumar(cxcPendiente._sum.saldoPendiente) / facturadoMonto) * DIAS_TRAILING_DSO_DPO : null,
    dpo: compradoMonto > 0 ? (sumar(cxpPendiente._sum.saldoPendiente) / compradoMonto) * DIAS_TRAILING_DSO_DPO : null,
  }
}

async function calcularCxP(moneda: Moneda, desde: Date, hasta: Date) {
  const [debido, pagadoPeriodo] = await Promise.all([
    prisma.cuentaPorPagar.aggregate({ where: { moneda, estado: { in: [...ESTADOS_CXP_PENDIENTE] } }, _sum: { saldoPendiente: true } }),
    prisma.pagoPagar.aggregate({ where: { fechaPago: { gte: desde, lt: hasta }, cuentaPorPagar: { moneda } }, _sum: { monto: true } }),
  ])
  return { debido: sumar(debido._sum.saldoPendiente), pagadoPeriodo: sumar(pagadoPeriodo._sum.monto) }
}

function bucketDe(diasVencido: number): keyof BucketAging {
  if (diasVencido <= 0) return 'corriente'
  if (diasVencido <= 30) return 'd0_30'
  if (diasVencido <= 60) return 'd31_60'
  if (diasVencido <= 90) return 'd61_90'
  return 'd90mas'
}

async function calcularAgingCxC(moneda: Moneda, clienteId: string | undefined) {
  const hoy = new Date()
  const filas = await prisma.cuentaPorCobrar.findMany({
    where: { moneda, estado: { in: [...ESTADOS_CXC_PENDIENTE] }, ...(clienteId && { clienteId }) },
    select: { saldoPendiente: true, fechaVencimiento: true, clienteId: true, cliente: { select: { nombre: true } } },
  })

  const buckets: BucketAging = { corriente: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90mas: 0 }
  const porClienteMap = new Map<string, AgingClienteRow>()

  for (const f of filas) {
    const diasVencido = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / MS_DIA)
    const bucket = bucketDe(diasVencido)
    buckets[bucket] += f.saldoPendiente

    if (!porClienteMap.has(f.clienteId)) {
      porClienteMap.set(f.clienteId, {
        clienteId: f.clienteId, clienteNombre: f.cliente.nombre,
        corriente: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90mas: 0, total: 0,
      })
    }
    const row = porClienteMap.get(f.clienteId)!
    row[bucket] += f.saldoPendiente
    row.total += f.saldoPendiente
  }

  // Prioriza +90d (donde está el problema real), no el total vencido general.
  const porCliente = Array.from(porClienteMap.values()).sort((a, b) => b.d90mas - a.d90mas || b.total - a.total)

  return { buckets, porCliente }
}

export async function calcularSituacionFinanciera(params: ParametrosSituacionFinanciera): Promise<SituacionFinanciera> {
  const { desde, hasta, clienteId, moneda } = params
  const monedas = moneda ? [moneda] : MONEDAS

  const porMoneda = await Promise.all(
    monedas.map(async (m): Promise<SituacionFinancieraMoneda> => {
      const [valorizado, facturado, cobradoReal, costoFinanciamiento, dsoDpo, cxp, agingCxC] = await Promise.all([
        calcularValorizado(m, clienteId, desde, hasta),
        calcularFacturado(m, clienteId, desde, hasta),
        calcularCobradoReal(m, clienteId, desde, hasta),
        calcularCostoFinanciamiento(m, clienteId, desde, hasta),
        calcularDsoDpo(m, clienteId),
        calcularCxP(m, desde, hasta),
        calcularAgingCxC(m, clienteId),
      ])

      return {
        moneda: m,
        valorizado,
        facturado,
        cobradoReal,
        brechas: {
          valorizadoAFacturado: valorizado.acumulado - facturado.acumulado,
          facturadoACobrado: facturado.acumulado - cobradoReal.acumulado,
        },
        costoFinanciamiento,
        dso: dsoDpo.dso,
        dpo: dsoDpo.dpo,
        cxp,
        agingCxC,
      }
    })
  )

  const dias = Math.round((hasta.getTime() - desde.getTime()) / MS_DIA)
  return { periodo: { desde: desde.toISOString(), hasta: hasta.toISOString(), dias }, porMoneda }
}
