/**
 * agingUtils.ts — Utilidades puras para el reporte de Aging de CxC
 *
 * Clasifica cuentas por cobrar en buckets de antigüedad,
 * agrupa por cliente y calcula totales para tabla y gráfico.
 */

// ─── Tipos ───

export type AgingBucket = 'vigente' | '1-30' | '31-60' | '61-90' | '90+'

export const BUCKETS: AgingBucket[] = ['vigente', '1-30', '31-60', '61-90', '90+']

export const BUCKET_LABELS: Record<AgingBucket, string> = {
  vigente: 'Vigente',
  '1-30': '1-30 días',
  '31-60': '31-60 días',
  '61-90': '61-90 días',
  '90+': '+90 días',
}

export interface AgingDocumento {
  id: string
  numeroDocumento: string | null
  descripcion: string | null
  proyectoNombre: string
  proyectoCodigo: string
  moneda: string
  monto: number
  saldoPendiente: number
  fechaEmision: string
  fechaVencimiento: string
  diasVencido: number
  bucket: AgingBucket
  estado: string
}

export interface AgingRow {
  clienteId: string
  clienteNombre: string
  PEN: Record<AgingBucket, number>
  USD: Record<AgingBucket, number>
  totalPEN: number
  totalUSD: number
  documentos: AgingDocumento[]
}

export interface AgingResumen {
  filas: AgingRow[]
  totales: {
    PEN: Record<AgingBucket, number> & { total: number }
    USD: Record<AgingBucket, number> & { total: number }
  }
  grafico: Array<{
    bucket: string
    PEN: number
    USD: number
    USDenPEN: number
  }>
  fechaCorte: string
  totalClientes: number
  totalDocumentos: number
}

/** Datos crudos de la DB con relaciones incluidas */
export interface CxCConRelaciones {
  id: string
  clienteId: string
  cliente: { id: string; nombre: string; ruc: string | null }
  proyecto: { id: string; codigo: string; nombre: string }
  numeroDocumento: string | null
  descripcion: string | null
  moneda: string
  monto: number
  saldoPendiente: number
  fechaEmision: Date
  fechaVencimiento: Date
  estado: string
}

// ─── Funciones ───

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000)
}

export function clasificarBucket(fechaVencimiento: Date, hoy: Date): AgingBucket {
  const dias = differenceInDays(hoy, fechaVencimiento)
  if (dias <= 0) return 'vigente'
  if (dias <= 30) return '1-30'
  if (dias <= 60) return '31-60'
  if (dias <= 90) return '61-90'
  return '90+'
}

function emptyBuckets(): Record<AgingBucket, number> {
  return { vigente: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
}

export function calcularAging(
  cxcs: CxCConRelaciones[],
  hoy: Date,
  tcDefault: number = 3.75,
): AgingResumen {
  // Filtrar solo documentos con saldo pendiente > 0
  const activos = cxcs.filter(c => c.saldoPendiente > 0)

  // Agrupar por clienteId
  const porCliente = new Map<string, AgingRow>()

  for (const cxc of activos) {
    const bucket = clasificarBucket(cxc.fechaVencimiento, hoy)
    const moneda = cxc.moneda as 'PEN' | 'USD'
    const saldo = cxc.saldoPendiente
    const dias = differenceInDays(hoy, cxc.fechaVencimiento)

    if (!porCliente.has(cxc.clienteId)) {
      porCliente.set(cxc.clienteId, {
        clienteId: cxc.clienteId,
        clienteNombre: cxc.cliente.nombre,
        PEN: emptyBuckets(),
        USD: emptyBuckets(),
        totalPEN: 0,
        totalUSD: 0,
        documentos: [],
      })
    }

    const fila = porCliente.get(cxc.clienteId)!

    if (moneda === 'PEN' || moneda === 'USD') {
      fila[moneda][bucket] += saldo
      if (moneda === 'PEN') fila.totalPEN += saldo
      else fila.totalUSD += saldo
    }

    fila.documentos.push({
      id: cxc.id,
      numeroDocumento: cxc.numeroDocumento,
      descripcion: cxc.descripcion,
      proyectoNombre: cxc.proyecto.nombre,
      proyectoCodigo: cxc.proyecto.codigo,
      moneda: cxc.moneda,
      monto: cxc.monto,
      saldoPendiente: saldo,
      fechaEmision: cxc.fechaEmision.toISOString(),
      fechaVencimiento: cxc.fechaVencimiento.toISOString(),
      diasVencido: dias,
      bucket,
      estado: cxc.estado,
    })
  }

  // Ordenar filas por mayor deuda total (normalizada a PEN)
  const filas = [...porCliente.values()].sort(
    (a, b) =>
      b.totalPEN + b.totalUSD * tcDefault - (a.totalPEN + a.totalUSD * tcDefault),
  )

  // Ordenar documentos dentro de cada fila por fechaVencimiento ASC
  for (const fila of filas) {
    fila.documentos.sort(
      (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime(),
    )
  }

  // Calcular totales globales
  const totales = {
    PEN: { ...emptyBuckets(), total: 0 } as Record<AgingBucket, number> & { total: number },
    USD: { ...emptyBuckets(), total: 0 } as Record<AgingBucket, number> & { total: number },
  }
  for (const fila of filas) {
    for (const b of BUCKETS) {
      totales.PEN[b] += fila.PEN[b]
      totales.USD[b] += fila.USD[b]
    }
    totales.PEN.total += fila.totalPEN
    totales.USD.total += fila.totalUSD
  }

  // Datos para gráfico stacked bar
  const grafico = BUCKETS.map(b => ({
    bucket: BUCKET_LABELS[b],
    PEN: Math.round(totales.PEN[b] * 100) / 100,
    USD: Math.round(totales.USD[b] * 100) / 100,
    USDenPEN: Math.round(totales.USD[b] * tcDefault * 100) / 100,
  }))

  return {
    filas,
    totales,
    grafico,
    fechaCorte: hoy.toISOString(),
    totalClientes: filas.length,
    totalDocumentos: activos.length,
  }
}
