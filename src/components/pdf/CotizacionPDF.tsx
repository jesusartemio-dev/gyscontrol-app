'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
}

// ── Brand Palette ────────────────────────────────────────────────
const colors = {
  navy:      '#1A1F2E',
  green:     '#2D6A4F',
  green2:    '#40916C',
  greenPale: '#D8F3DC',
  gold:      '#B5881A',
  goldPale:  '#FFF8E1',
  white:     '#FFFFFF',
  black:     '#000000',
  gray900:   '#111827',
  gray700:   '#374151',
  gray600:   '#4B5563',
  gray500:   '#6B7280',
  gray400:   '#9CA3AF',
  gray300:   '#D1D5DB',
  gray200:   '#E5E7EB',
  gray100:   '#F3F4F6',
  gray50:    '#F9FAFB',
  red500:    '#EF4444',
  red100:    '#FEE2E2',
  blue50:    '#EFF6FF',
}

// ── Utility functions ────────────────────────────────────────────
const safeText = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (isNaN(amount)) return currency === 'PEN' ? 'S/0.00' : '$0.00'
  if (currency === 'PEN') {
    return `S/${new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

const formatNumber = (num: number): string =>
  new Intl.NumberFormat('en-US').format(num)

const parseFormaPago = (fp: string): { percent: string; label: string }[] => {
  return fp.split(',').map(part => {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d+%)\s+(.+)$/i)
    if (match) return { percent: match[1], label: match[2].charAt(0).toUpperCase() + match[2].slice(1) }
    return { percent: '', label: trimmed }
  })
}

const getInitials = (name: string): string =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)

// ── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  /* ─── Page ─── */
  page: {
    paddingTop: 58,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.gray900,
    backgroundColor: colors.white,
  },

  /* ─── Header (absolute, all pages) ─── */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 24,
    backgroundColor: colors.green,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
  },
  headerCompany: {
    color: colors.white,
    fontSize: 9.5,
    fontWeight: 600,
    marginLeft: 8,
  },
  headerCode: {
    color: colors.gray400,
    fontSize: 8,
    marginLeft: 8,
  },
  headerGreenAccent: {
    position: 'absolute',
    right: -15,
    top: -12,
    width: 130,
    height: 72,
    backgroundColor: colors.green,
    transform: 'rotate(-8deg)',
  },
  headerDate: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 600,
    zIndex: 2,
    textAlign: 'right',
  },

  /* ─── Footer (absolute, all pages) ─── */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  footerText: {
    color: colors.gray400,
    fontSize: 7,
  },
  footerPageNum: {
    color: colors.green2,
    fontSize: 7.5,
    fontWeight: 600,
  },

  /* ─── Urgency Band (Page 1) ─── */
  urgencyBand: {
    backgroundColor: colors.goldPale,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  urgencyText: {
    color: colors.gold,
    fontSize: 8.5,
    fontWeight: 600,
  },
  igvBadge: {
    backgroundColor: colors.gold,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  igvBadgeText: {
    color: colors.white,
    fontSize: 7,
    fontWeight: 700,
  },

  /* ─── Proposal Title ─── */
  proposalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 2,
  },
  proposalSubtitle: {
    fontSize: 10,
    color: colors.gray500,
    marginBottom: 18,
  },

  /* ─── Client Table ─── */
  clientTable: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    marginBottom: 14,
  },
  clientRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    minHeight: 22,
  },
  clientRowLast: {
    borderBottomWidth: 0,
  },
  clientLabel: {
    width: 110,
    backgroundColor: colors.gray50,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 8,
    fontWeight: 600,
    color: colors.gray600,
    textTransform: 'uppercase' as any,
  },
  clientValue: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 8.5,
    color: colors.gray900,
  },

  /* ─── Hero Block (Page 1 bottom) ─── */
  heroBlock: {
    backgroundColor: colors.green,
    borderRadius: 6,
    flexDirection: 'row',
    padding: 20,
    marginTop: 10,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 15,
  },
  heroRight: {
    width: 160,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  heroProjectName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  heroBullet: {
    color: colors.greenPale,
    fontSize: 8,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  heroTotalLabel: {
    color: colors.greenPale,
    fontSize: 8,
    marginBottom: 2,
  },
  heroTotalAmount: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 700,
  },
  heroDiscount: {
    color: colors.goldPale,
    fontSize: 8,
    fontWeight: 600,
    marginTop: 4,
  },

  /* ─── Section Header (reusable) ─── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 14,
  },
  sectionGreenBar: {
    width: 4,
    height: 18,
    backgroundColor: colors.green,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.navy,
  },

  /* ─── Summary Table (Page 2) ─── */
  summaryHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  summaryHeaderCell: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 700,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  summaryRowAlt: {
    backgroundColor: colors.gray50,
  },
  summaryCell: {
    fontSize: 9,
    color: colors.gray900,
  },
  summaryCellBold: {
    fontSize: 9,
    color: colors.gray900,
    fontWeight: 600,
  },
  summarySubtotalRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: colors.gray300,
    marginTop: 2,
  },
  summaryDiscountRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.goldPale,
  },
  summaryIgvRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  summaryGrandTotalRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: colors.navy,
    borderRadius: 4,
    marginTop: 2,
  },

  /* ─── Scope Section (Page 2) ─── */
  scopeBullet: {
    fontSize: 8.5,
    color: colors.gray700,
    marginBottom: 4,
    paddingLeft: 8,
    lineHeight: 1.5,
  },

  /* ─── Detail Tables (Pages 3-5) ─── */
  detailHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  detailHeaderCell: {
    color: colors.white,
    fontSize: 7.5,
    fontWeight: 700,
  },
  detailGroupRow: {
    flexDirection: 'row',
    backgroundColor: colors.greenPale,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.green2,
    alignItems: 'center',
  },
  detailGroupName: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.green,
  },
  detailGroupTotal: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.green,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray100,
    alignItems: 'center',
  },
  detailRowAlt: {
    backgroundColor: colors.gray50,
  },
  detailRowAltBlue: {
    backgroundColor: colors.blue50,
  },
  detailCell: {
    fontSize: 8,
    color: colors.gray900,
  },
  detailCellBold: {
    fontSize: 8,
    color: colors.gray700,
    fontWeight: 600,
  },
  detailCellRight: {
    fontSize: 8,
    color: colors.gray900,
    textAlign: 'right',
  },

  /* ─── Section Total Box ─── */
  sectionTotalBox: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    width: 220,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTotalLabel: {
    color: colors.gray400,
    fontSize: 9,
    fontWeight: 600,
  },
  sectionTotalAmount: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 700,
  },

  /* ─── Payment Blocks (Page 6) ─── */
  paymentBlocksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    marginTop: 6,
  },
  paymentBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  paymentPercent: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 8,
    color: colors.gray600,
    textAlign: 'center',
  },

  /* ─── Info Cards (Page 6) ─── */
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    marginTop: 6,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderTopWidth: 3,
    borderTopColor: colors.green,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  infoCardTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.green,
    marginBottom: 5,
    textTransform: 'uppercase' as any,
  },
  infoCardValue: {
    fontSize: 8.5,
    color: colors.gray900,
    lineHeight: 1.6,
  },

  /* ─── Conditions List (Page 6) ─── */
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  conditionBullet: {
    color: colors.green2,
    fontSize: 9,
    fontWeight: 700,
    width: 14,
  },
  conditionText: {
    flex: 1,
    fontSize: 8.5,
    color: colors.gray700,
  },
  conditionBadge: {
    backgroundColor: colors.greenPale,
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  conditionBadgeText: {
    fontSize: 6.5,
    color: colors.green,
    fontWeight: 600,
  },

  /* ─── CTA Block (Page 6 bottom) ─── */
  ctaBlock: {
    backgroundColor: colors.navy,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 'auto' as any,
  },
  ctaCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ctaInitials: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 700,
  },
  ctaMessage: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 3,
  },
  ctaContact: {
    color: colors.gray400,
    fontSize: 8,
    lineHeight: 1.5,
  },

  /* ─── Exclusions (Page 7) ─── */
  exclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  exclusionBullet: {
    color: colors.red500,
    fontSize: 9,
    fontWeight: 700,
    width: 14,
  },
  exclusionText: {
    flex: 1,
    fontSize: 8.5,
    color: colors.gray700,
  },

  /* ─── Cronograma (Page 8) ─── */
  cronogramaEdt: {
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    paddingLeft: 10,
  },
  cronogramaEdtTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 4,
  },
  cronogramaDetail: {
    fontSize: 8.5,
    color: colors.gray600,
    marginBottom: 2,
  },
  cronogramaTarea: {
    fontSize: 8,
    color: colors.gray500,
    marginLeft: 10,
    marginBottom: 2,
  },
})

// ── Main Component ───────────────────────────────────────────────
const CotizacionPDF = ({ cotizacion }: Props) => {
  if (!cotizacion || !cotizacion.id) return null

  // ── Data extraction ──
  const now = new Date()
  const validezDias = cotizacion.validezOferta || 15
  const validUntilDate = cotizacion.fechaValidezHasta
    ? new Date(cotizacion.fechaValidezHasta)
    : new Date(now.getTime() + validezDias * 24 * 60 * 60 * 1000)

  const equipos = Array.isArray(cotizacion.equipos) ? cotizacion.equipos : []
  const servicios = Array.isArray(cotizacion.servicios) ? cotizacion.servicios : []
  const gastos = Array.isArray(cotizacion.gastos) ? cotizacion.gastos : []
  const exclusiones = Array.isArray(cotizacion.exclusiones) ? cotizacion.exclusiones : []
  const condiciones = Array.isArray(cotizacion.condiciones) ? cotizacion.condiciones : []
  const cronograma = Array.isArray(cotizacion.cronograma) ? cotizacion.cronograma : []

  const moneda = cotizacion.moneda || 'USD'
  const monedaLabel = moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares Americanos (USD)'
  const incluyeIGV = cotizacion.incluyeIGV ?? false

  const comercial = cotizacion.comercial || (cotizacion as any).user
  const comercialName = (comercial as any)?.name || (comercial as any)?.nombre || 'Departamento Comercial'
  const formaPago = cotizacion.formaPago || '30% adelanto, 40% contra entrega, 30% contra conformidad'
  const referencia = cotizacion.referencia || safeText(cotizacion.nombre)
  const revision = (cotizacion as any).revision || 'R01'

  // ── Totals (client-facing only) ──
  const equiposTotal = equipos.reduce((sum, eq) => sum + (eq.subtotalCliente || 0), 0)
  const serviciosTotal = servicios.reduce((sum, sv) => sum + (sv.subtotalCliente || 0), 0)
  const gastosTotal = gastos.reduce((sum, gs) => sum + (gs.subtotalCliente || 0), 0)
  const subtotal = equiposTotal + serviciosTotal + gastosTotal
  const descuento = cotizacion.descuento || 0
  const descuentoPct = (cotizacion as any).descuentoPorcentaje || 0
  const grandTotal = cotizacion.grandTotal > 0 ? cotizacion.grandTotal : (subtotal - descuento)

  // ── Counts ──
  const totalEquiposItems = equipos.reduce((sum, eq) => sum + (eq.items?.length || 0), 0)
  const totalServiciosItems = servicios.reduce((sum, sv) => sum + (sv.items?.length || 0), 0)
  const totalGastosItems = gastos.reduce((sum, gs) => sum + (gs.items?.length || 0), 0)

  const hasEquipos = equipos.length > 0
  const hasServicios = servicios.length > 0
  const hasGastos = gastos.length > 0
  const hasExclusionesCondiciones = exclusiones.length > 0 || condiciones.length > 0
  const hasCronograma = cronograma.length > 0

  const codeAndRevision = `${safeText(cotizacion.codigo)} ${revision}`

  // ── Reusable header / footer ──
  const renderHeader = () => (
    <View style={s.header} fixed>
      {/* Green diagonal accent on right */}
      <View style={s.headerGreenAccent} />
      <View style={s.headerInner}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>GYS</Text>
          </View>
          <View>
            <Text style={s.headerCompany}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={s.headerCode}>{codeAndRevision}</Text>
          </View>
        </View>
        <Text style={s.headerDate}>{formatDate(now)}</Text>
      </View>
    </View>
  )

  const renderFooter = () => (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Documento Confidencial — GYS Control Industrial SAC</Text>
      <Text
        style={s.footerPageNum}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )

  const renderSectionHeader = (title: string) => (
    <View style={s.sectionHeader}>
      <View style={s.sectionGreenBar} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )

  // ── Render ──
  return (
    <Document
      title={`Cotización ${safeText(cotizacion.nombre)} - ${safeText(cotizacion.cliente?.nombre)}`}
      author="GYS CONTROL INDUSTRIAL SAC"
      subject={`Propuesta Económica para ${safeText(cotizacion.cliente?.nombre)}`}
      keywords="cotización, propuesta, industrial, control, automatización"
      creator="GYS Control Industrial - Sistema de Gestión"
      producer="GYS Control Industrial SAC"
    >
      {/* ═══════════════════════════════════════════════════════════
          PAGE 1 — PORTADA
          ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {renderHeader()}

        {/* Urgency Band */}
        <View style={s.urgencyBand}>
          <Text style={s.urgencyText}>
            Validez de oferta: {validezDias} días — Hasta {formatDate(validUntilDate)}
          </Text>
          <View style={s.igvBadge}>
            <Text style={s.igvBadgeText}>
              {incluyeIGV ? 'IGV INCLUIDO' : 'SIN IGV'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.proposalTitle}>Propuesta Económica</Text>
        <Text style={s.proposalSubtitle}>
          {safeText(cotizacion.nombre)} — {safeText(cotizacion.cliente?.nombre)}
        </Text>

        {/* Client Info Table */}
        <View style={s.clientTable}>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Cliente</Text>
            <Text style={s.clientValue}>{safeText(cotizacion.cliente?.nombre).toUpperCase()}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>RUC</Text>
            <Text style={s.clientValue}>{safeText(cotizacion.cliente?.ruc)}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Dirección</Text>
            <Text style={s.clientValue}>{safeText(cotizacion.cliente?.direccion)}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Contacto</Text>
            <Text style={s.clientValue}>{safeText(cotizacion.cliente?.correo)}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Referencia</Text>
            <Text style={s.clientValue}>{referencia}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Moneda</Text>
            <Text style={s.clientValue}>{monedaLabel}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Forma de Pago</Text>
            <Text style={s.clientValue}>{formaPago}</Text>
          </View>
          <View style={s.clientRow}>
            <Text style={s.clientLabel}>Tiempo Entrega</Text>
            <Text style={s.clientValue}>{(cotizacion as any).tiempoEntrega || 'Según cronograma del proyecto'}</Text>
          </View>
          <View style={[s.clientRow, s.clientRowLast]}>
            <Text style={s.clientLabel}>Validez Oferta</Text>
            <Text style={s.clientValue}>{validezDias} días calendario — Hasta {formatDate(validUntilDate)}</Text>
          </View>
        </View>

        {/* Spacer pushes hero to bottom */}
        <View style={{ flex: 1 }} />

        {/* Hero Block */}
        <View style={s.heroBlock}>
          <View style={s.heroLeft}>
            <Text style={s.heroProjectName}>{safeText(cotizacion.nombre)}</Text>
            {hasEquipos && (
              <Text style={s.heroBullet}>
                • Suministro de {totalEquiposItems} equipo{totalEquiposItems !== 1 ? 's' : ''} en {equipos.length} grupo{equipos.length !== 1 ? 's' : ''}: {equipos.map(e => safeText(e.nombre)).join(', ')}
              </Text>
            )}
            {hasServicios && (
              <Text style={s.heroBullet}>
                • Servicios de ingeniería: {servicios.map(sv => safeText(sv.nombre)).join(', ')}
              </Text>
            )}
            {hasGastos && (
              <Text style={s.heroBullet}>
                • Gastos adicionales: {gastos.map(gs => safeText(gs.nombre)).join(', ')}
              </Text>
            )}
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroTotalLabel}>Total Propuesta ({moneda})</Text>
            <Text style={s.heroTotalAmount}>{formatCurrency(grandTotal, moneda)}</Text>
            {descuentoPct > 0 && (
              <Text style={s.heroDiscount}>Descuento aplicado: {descuentoPct}%</Text>
            )}
          </View>
        </View>

        {renderFooter()}
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 2 — RESUMEN EJECUTIVO
          ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {renderHeader()}

        {renderSectionHeader('Resumen Ejecutivo')}

        {/* Summary Table */}
        <View>
          {/* Header */}
          <View style={s.summaryHeaderRow}>
            <Text style={[s.summaryHeaderCell, { flex: 2.5 }]}>Categoría</Text>
            <Text style={[s.summaryHeaderCell, { flex: 1, textAlign: 'center' }]}>Grupos</Text>
            <Text style={[s.summaryHeaderCell, { flex: 1, textAlign: 'center' }]}>Ítems</Text>
            <Text style={[s.summaryHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Valor Total</Text>
          </View>

          {/* Equipos Row */}
          {hasEquipos && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryCellBold, { flex: 2.5 }]}>Equipos</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{equipos.length}</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{totalEquiposItems}</Text>
              <Text style={[s.summaryCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(equiposTotal, moneda)}</Text>
            </View>
          )}

          {/* Servicios Row */}
          {hasServicios && (
            <View style={[s.summaryRow, hasEquipos ? s.summaryRowAlt : {}]}>
              <Text style={[s.summaryCellBold, { flex: 2.5 }]}>Servicios</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{servicios.length}</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{totalServiciosItems}</Text>
              <Text style={[s.summaryCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(serviciosTotal, moneda)}</Text>
            </View>
          )}

          {/* Gastos Row */}
          {hasGastos && (
            <View style={[s.summaryRow, (hasEquipos && hasServicios) || (!hasEquipos && !hasServicios) ? {} : s.summaryRowAlt]}>
              <Text style={[s.summaryCellBold, { flex: 2.5 }]}>Gastos Adicionales</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{gastos.length}</Text>
              <Text style={[s.summaryCell, { flex: 1, textAlign: 'center' }]}>{totalGastosItems}</Text>
              <Text style={[s.summaryCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(gastosTotal, moneda)}</Text>
            </View>
          )}

          {/* Subtotal */}
          <View style={s.summarySubtotalRow}>
            <Text style={[s.summaryCellBold, { flex: 4.5 }]}>Subtotal</Text>
            <Text style={[s.summaryCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(subtotal, moneda)}</Text>
          </View>

          {/* Discount (conditional) */}
          {descuentoPct > 0 && (
            <View style={s.summaryDiscountRow}>
              <Text style={[{ flex: 4.5, fontSize: 9, fontWeight: 600, color: colors.gold }]}>
                Descuento ({descuentoPct}%)
              </Text>
              <Text style={[{ flex: 1.5, textAlign: 'right', fontSize: 9, fontWeight: 600, color: colors.gold }]}>
                -{formatCurrency(descuento, moneda)}
              </Text>
            </View>
          )}

          {/* IGV Info */}
          <View style={s.summaryIgvRow}>
            <Text style={[{ flex: 4.5, fontSize: 8.5, color: colors.gray500 }]}>IGV</Text>
            <Text style={[{ flex: 1.5, textAlign: 'right', fontSize: 8.5, color: colors.gray500 }]}>
              {incluyeIGV ? 'Incluido en precios' : 'No incluido'}
            </Text>
          </View>

          {/* Grand Total */}
          <View style={s.summaryGrandTotalRow}>
            <Text style={[{ flex: 4.5, fontSize: 11, fontWeight: 700, color: colors.white }]}>TOTAL</Text>
            <Text style={[{ flex: 1.5, textAlign: 'right', fontSize: 11, fontWeight: 700, color: colors.white }]}>
              {formatCurrency(grandTotal, moneda)}
            </Text>
          </View>
        </View>

        {/* Alcance del Proyecto (Dynamic) */}
        {renderSectionHeader('Alcance del Proyecto')}

        <View style={{ marginBottom: 10 }}>
          <Text style={[s.scopeBullet, { fontWeight: 600, marginBottom: 8 }]}>
            El presente proyecto contempla la implementación integral de soluciones de
            automatización industrial, incluyendo:
          </Text>
          {hasEquipos && (
            <Text style={s.scopeBullet}>
              • Suministro de {totalEquiposItems} equipo{totalEquiposItems !== 1 ? 's' : ''} en {equipos.length} grupo{equipos.length !== 1 ? 's' : ''}: {equipos.map(e => safeText(e.nombre)).join(', ')}
            </Text>
          )}
          {hasServicios && (
            <Text style={s.scopeBullet}>
              • Servicios de ingeniería: {servicios.map(sv => safeText(sv.nombre)).join(', ')}
            </Text>
          )}
          {hasGastos && (
            <Text style={s.scopeBullet}>
              • Gastos adicionales: {gastos.map(gs => safeText(gs.nombre)).join(', ')}
            </Text>
          )}
          {exclusiones.length > 0 && (
            <Text style={s.scopeBullet}>
              • {exclusiones.length} exclusión{exclusiones.length !== 1 ? 'es' : ''} detallada{exclusiones.length !== 1 ? 's' : ''} en sección aparte
            </Text>
          )}
          {condiciones.length > 0 && (
            <Text style={s.scopeBullet}>
              • {condiciones.length} condición{condiciones.length !== 1 ? 'es' : ''} y consideracion{condiciones.length !== 1 ? 'es' : ''} especificada{condiciones.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {renderFooter()}
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 3 — DETALLE DE EQUIPOS
          ═══════════════════════════════════════════════════════════ */}
      {hasEquipos && (
        <Page size="A4" style={s.page}>
          {renderHeader()}

          {renderSectionHeader('Detalle Técnico — Equipos')}

          {/* Table Header */}
          <View style={s.detailHeaderRow}>
            <Text style={[s.detailHeaderCell, { flex: 0.4 }]}>#</Text>
            <Text style={[s.detailHeaderCell, { flex: 1.2 }]}>Modelo / Marca</Text>
            <Text style={[s.detailHeaderCell, { flex: 2.2 }]}>Descripción</Text>
            <Text style={[s.detailHeaderCell, { flex: 0.5, textAlign: 'center' }]}>Und.</Text>
            <Text style={[s.detailHeaderCell, { flex: 0.5, textAlign: 'center' }]}>Cant.</Text>
            <Text style={[s.detailHeaderCell, { flex: 1, textAlign: 'right' }]}>P. Unit.</Text>
            <Text style={[s.detailHeaderCell, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
          </View>

          {/* Equipment Groups */}
          {equipos.map((equipo, eqIdx) => (
            <View key={`eq-${equipo.id || eqIdx}`} wrap={false}>
              {/* Group Header */}
              <View style={s.detailGroupRow}>
                <Text style={[s.detailGroupName, { flex: 1 }]}>
                  {eqIdx + 1}. {safeText(equipo.nombre).toUpperCase()}
                </Text>
                <Text style={s.detailGroupTotal}>
                  {formatCurrency(equipo.subtotalCliente || 0, moneda)}
                </Text>
              </View>

              {/* Items */}
              {equipo.items?.map((item, itemIdx) => (
                <View
                  key={`eq-item-${item.id || itemIdx}`}
                  style={[s.detailRow, itemIdx % 2 === 1 ? s.detailRowAlt : {}]}
                >
                  <Text style={[s.detailCell, { flex: 0.4 }]}>
                    {eqIdx + 1}.{itemIdx + 1}
                  </Text>
                  <Text style={[s.detailCellBold, { flex: 1.2 }]}>
                    {safeText(item.codigo)}{'\n'}
                    <Text style={{ fontWeight: 400, color: colors.gray500, fontSize: 7 }}>
                      {safeText(item.marca)}
                    </Text>
                  </Text>
                  <Text style={[s.detailCell, { flex: 2.2 }]}>
                    {safeText(item.descripcion)}
                  </Text>
                  <Text style={[s.detailCell, { flex: 0.5, textAlign: 'center' }]}>
                    {safeText(item.unidad)}
                  </Text>
                  <Text style={[s.detailCell, { flex: 0.5, textAlign: 'center' }]}>
                    {formatNumber(item.cantidad || 0)}
                  </Text>
                  <Text style={[s.detailCellRight, { flex: 1 }]}>
                    {formatCurrency(item.precioCliente || 0, moneda)}
                  </Text>
                  <Text style={[s.detailCellRight, { flex: 1 }]}>
                    {formatCurrency(item.costoCliente || 0, moneda)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Section Total Box */}
          <View style={s.sectionTotalBox}>
            <Text style={s.sectionTotalLabel}>Total Equipos</Text>
            <Text style={s.sectionTotalAmount}>{formatCurrency(equiposTotal, moneda)}</Text>
          </View>

          {renderFooter()}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 4 — DETALLE DE SERVICIOS
          ═══════════════════════════════════════════════════════════ */}
      {hasServicios && (
        <Page size="A4" style={s.page}>
          {renderHeader()}

          {renderSectionHeader('Detalle Técnico — Servicios')}

          {/* Table Header */}
          <View style={s.detailHeaderRow}>
            <Text style={[s.detailHeaderCell, { flex: 0.4 }]}>#</Text>
            <Text style={[s.detailHeaderCell, { flex: 2.5 }]}>Actividad</Text>
            <Text style={[s.detailHeaderCell, { flex: 1.5 }]}>Recurso</Text>
            <Text style={[s.detailHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Horas</Text>
            <Text style={[s.detailHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Valor</Text>
          </View>

          {/* Service Groups */}
          {servicios.map((servicio, svIdx) => {
            const groupHours = (servicio.items || []).reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
            return (
              <View key={`sv-${servicio.id || svIdx}`} wrap={false}>
                {/* Group Header */}
                <View style={s.detailGroupRow}>
                  <Text style={[s.detailGroupName, { flex: 1 }]}>
                    {svIdx + 1}. {safeText(servicio.nombre).toUpperCase()}
                    <Text style={{ fontWeight: 400, fontSize: 7.5, color: colors.green2 }}>
                      {'  '}({formatNumber(groupHours)} hrs)
                    </Text>
                  </Text>
                  <Text style={s.detailGroupTotal}>
                    {formatCurrency(servicio.subtotalCliente || 0, moneda)}
                  </Text>
                </View>

                {/* Items */}
                {servicio.items?.map((item: any, itemIdx: number) => (
                  <View
                    key={`sv-item-${item.id || itemIdx}`}
                    style={[s.detailRow, itemIdx % 2 === 1 ? s.detailRowAltBlue : {}]}
                  >
                    <Text style={[s.detailCell, { flex: 0.4 }]}>
                      {svIdx + 1}.{itemIdx + 1}
                    </Text>
                    <Text style={[s.detailCell, { flex: 2.5 }]}>
                      {safeText(item.nombre || item.descripcion)}
                    </Text>
                    <Text style={[s.detailCellBold, { flex: 1.5, color: colors.gray500 }]}>
                      {safeText(item.recursoNombre)}
                    </Text>
                    <Text style={[s.detailCell, { flex: 0.8, textAlign: 'center' }]}>
                      {formatNumber(item.horaTotal || 0)}
                    </Text>
                    <Text style={[s.detailCellRight, { flex: 1.2 }]}>
                      {formatCurrency(item.costoCliente || 0, moneda)}
                    </Text>
                  </View>
                ))}
              </View>
            )
          })}

          {/* Section Total Box */}
          <View style={s.sectionTotalBox}>
            <Text style={s.sectionTotalLabel}>Total Servicios</Text>
            <Text style={s.sectionTotalAmount}>{formatCurrency(serviciosTotal, moneda)}</Text>
          </View>

          {renderFooter()}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 5 — DETALLE DE GASTOS
          ═══════════════════════════════════════════════════════════ */}
      {hasGastos && (
        <Page size="A4" style={s.page}>
          {renderHeader()}

          {renderSectionHeader('Detalle de Gastos Adicionales')}

          {/* Table Header */}
          <View style={s.detailHeaderRow}>
            <Text style={[s.detailHeaderCell, { flex: 0.4 }]}>#</Text>
            <Text style={[s.detailHeaderCell, { flex: 3 }]}>Descripción</Text>
            <Text style={[s.detailHeaderCell, { flex: 0.6, textAlign: 'center' }]}>Cant.</Text>
            <Text style={[s.detailHeaderCell, { flex: 1, textAlign: 'right' }]}>P. Unit.</Text>
            <Text style={[s.detailHeaderCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>

          {/* Gasto Groups */}
          {gastos.map((gasto, gsIdx) => (
            <View key={`gs-${gasto.id || gsIdx}`} wrap={false}>
              {/* Group Header */}
              <View style={s.detailGroupRow}>
                <Text style={[s.detailGroupName, { flex: 1 }]}>
                  {gsIdx + 1}. {safeText(gasto.nombre).toUpperCase()}
                </Text>
                <Text style={s.detailGroupTotal}>
                  {formatCurrency(gasto.subtotalCliente || 0, moneda)}
                </Text>
              </View>

              {/* Items */}
              {gasto.items?.map((item: any, itemIdx: number) => (
                <View
                  key={`gs-item-${item.id || itemIdx}`}
                  style={[s.detailRow, itemIdx % 2 === 1 ? s.detailRowAlt : {}]}
                >
                  <Text style={[s.detailCell, { flex: 0.4 }]}>
                    {gsIdx + 1}.{itemIdx + 1}
                  </Text>
                  <Text style={[s.detailCell, { flex: 3 }]}>
                    {safeText(item.nombre || item.descripcion)}
                  </Text>
                  <Text style={[s.detailCell, { flex: 0.6, textAlign: 'center' }]}>
                    {formatNumber(item.cantidad || 0)}
                  </Text>
                  <Text style={[s.detailCellRight, { flex: 1 }]}>
                    {formatCurrency(item.precioUnitario || 0, moneda)}
                  </Text>
                  <Text style={[s.detailCellRight, { flex: 1 }]}>
                    {formatCurrency(item.costoCliente || 0, moneda)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Section Total Box */}
          <View style={s.sectionTotalBox}>
            <Text style={s.sectionTotalLabel}>Total Gastos</Text>
            <Text style={s.sectionTotalAmount}>{formatCurrency(gastosTotal, moneda)}</Text>
          </View>

          {renderFooter()}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 6 — TÉRMINOS Y CONDICIONES
          ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {renderHeader()}

        {renderSectionHeader('Términos y Condiciones Comerciales')}

        {/* Payment Blocks */}
        <Text style={{ fontSize: 8.5, fontWeight: 600, color: colors.gray700, marginBottom: 6, marginTop: 4 }}>
          Condiciones de Pago
        </Text>
        <View style={s.paymentBlocksRow}>
          {parseFormaPago(formaPago).map((block, idx) => (
            <View key={`pay-${idx}`} style={s.paymentBlock}>
              <Text style={s.paymentPercent}>{block.percent || '-'}</Text>
              <Text style={s.paymentLabel}>{block.label}</Text>
            </View>
          ))}
        </View>

        {/* Info Cards */}
        <View style={s.infoCardsRow}>
          {/* Tiempo de Entrega */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Tiempo de Entrega</Text>
            <Text style={s.infoCardValue}>
              {cotizacion.fechaInicio && cotizacion.fechaFin
                ? `Inicio: ${formatDate(cotizacion.fechaInicio)}\nFin: ${formatDate(cotizacion.fechaFin)}`
                : 'Según cronograma del proyecto'
              }
            </Text>
          </View>

          {/* Garantías */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Garantías</Text>
            <Text style={s.infoCardValue}>
              Equipos: 12 meses{'\n'}
              Servicios: 6 meses{'\n'}
              Soporte técnico incluido
            </Text>
          </View>

          {/* Validez */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Validez de Oferta</Text>
            <Text style={s.infoCardValue}>
              {validezDias} días calendario{'\n'}
              Hasta: {formatDate(validUntilDate)}{'\n'}
              Moneda: {monedaLabel}
            </Text>
          </View>
        </View>

        {/* Dynamic Conditions */}
        {condiciones.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: colors.gray700, marginBottom: 8 }}>
              Condiciones y Consideraciones
            </Text>
            {condiciones.map((cond, idx) => (
              <View key={`cond-${cond.id || idx}`} style={s.conditionItem}>
                <Text style={s.conditionBullet}>→</Text>
                <Text style={s.conditionText}>{safeText(cond.descripcion)}</Text>
                {cond.tipo && (
                  <View style={s.conditionBadge}>
                    <Text style={s.conditionBadgeText}>{cond.tipo}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* CTA Block */}
        <View style={s.ctaBlock}>
          <View style={s.ctaCircle}>
            <Text style={s.ctaInitials}>{getInitials(comercialName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaMessage}>
              Quedamos a su disposición para cualquier consulta.
            </Text>
            <Text style={s.ctaContact}>
              {comercialName}
              {(comercial as any)?.cargo ? ` — ${(comercial as any).cargo}` : ''}
              {'\n'}
              {(comercial as any)?.email ? `${(comercial as any).email}` : 'info@gyscontrol.com'}
              {(comercial as any)?.telefono ? ` | ${(comercial as any).telefono}` : ''}
              {'\n'}
              Lima: +51 1 478 7587 | Arequipa: +51 54 277 584 | www.gyscontrol.com
            </Text>
          </View>
        </View>

        {renderFooter()}
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 7 — EXCLUSIONES Y CONDICIONES
          ═══════════════════════════════════════════════════════════ */}
      {hasExclusionesCondiciones && (
        <Page size="A4" style={s.page}>
          {renderHeader()}

          {/* Exclusions */}
          {exclusiones.length > 0 && (
            <View>
              {renderSectionHeader('Exclusiones de la Propuesta')}
              <View style={{ marginBottom: 18 }}>
                {exclusiones.map((exc, idx) => (
                  <View key={`exc-${exc.id || idx}`} style={s.exclusionItem}>
                    <Text style={s.exclusionBullet}>✕</Text>
                    <Text style={s.exclusionText}>{safeText(exc.descripcion)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Conditions (if not already shown on page 6, show here as well) */}
          {condiciones.length > 0 && (
            <View>
              {renderSectionHeader('Condiciones y Consideraciones')}
              <View>
                {condiciones.map((cond, idx) => (
                  <View key={`cond-exc-${cond.id || idx}`} style={s.conditionItem}>
                    <Text style={s.conditionBullet}>→</Text>
                    <Text style={s.conditionText}>{safeText(cond.descripcion)}</Text>
                    {cond.tipo && (
                      <View style={s.conditionBadge}>
                        <Text style={s.conditionBadgeText}>{cond.tipo}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {renderFooter()}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 8 — CRONOGRAMA
          ═══════════════════════════════════════════════════════════ */}
      {hasCronograma && (
        <Page size="A4" style={s.page}>
          {renderHeader()}

          {renderSectionHeader('Cronograma de Ejecución')}

          <Text style={{ fontSize: 8.5, color: colors.gray600, marginBottom: 14 }}>
            A continuación se detalla el cronograma estimado de ejecución del proyecto:
          </Text>

          {cronograma.map((edt, idx) => (
            <View key={`cron-${edt.id || idx}`} style={s.cronogramaEdt}>
              <Text style={s.cronogramaEdtTitle}>
                {safeText(edt.edt?.nombre || 'Sin categoría')}
                {edt.zona ? ` — ${safeText(edt.zona)}` : ''}
              </Text>
              <Text style={s.cronogramaDetail}>
                Inicio: {edt.fechaInicioCom ? formatDate(edt.fechaInicioCom) : 'No definida'}
                {'   '}|{'   '}
                Fin: {edt.fechaFinCom ? formatDate(edt.fechaFinCom) : 'No definida'}
                {'   '}|{'   '}
                Horas estimadas: {edt.horasCom || 0}
              </Text>
              {edt.descripcion && (
                <Text style={s.cronogramaDetail}>{safeText(edt.descripcion)}</Text>
              )}
              {edt.tareas && edt.tareas.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {edt.tareas.map((tarea, tIdx) => (
                    <Text key={`tarea-${edt.id}-${tarea.id || tIdx}`} style={s.cronogramaTarea}>
                      — {safeText(tarea.nombre)}: {tarea.fechaInicioCom ? formatDate(tarea.fechaInicioCom) : '?'} → {tarea.fechaFinCom ? formatDate(tarea.fechaFinCom) : '?'}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          {renderFooter()}
        </Page>
      )}
    </Document>
  )
}

// ── Download Button ──────────────────────────────────────────────
export const DescargarPDFButton = ({ cotizacion }: Props) => {
  const pdfKey = `pdf-${cotizacion.id}-${cotizacion.equipos?.length || 0}-${cotizacion.servicios?.length || 0}-${cotizacion.gastos?.length || 0}-${cotizacion.grandTotal || 0}`

  const fileName = `Cotizacion_${safeText(cotizacion.nombre)}_${safeText(cotizacion.cliente?.nombre)}.pdf`
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')

  return (
    <PDFDownloadLink
      key={pdfKey}
      document={<CotizacionPDF cotizacion={cotizacion} />}
      fileName={fileName}
      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm hover:shadow-md h-8 min-w-[120px] justify-center flex-shrink-0"
    >
      {({ loading, error }: { loading: boolean; error: Error | null; blob: Blob | null; url: string | null }) => {
        if (loading) {
          return (
            <>
              <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden sm:inline">Generando PDF...</span>
              <span className="sm:hidden">PDF...</span>
            </>
          )
        }

        if (error) {
          return (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="hidden sm:inline">Error al generar</span>
              <span className="sm:hidden">Error</span>
            </>
          )
        }

        return (
          <>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Descargar PDF</span>
            <span className="sm:hidden">PDF</span>
          </>
        )
      }}
    </PDFDownloadLink>
  )
}

export default CotizacionPDF
