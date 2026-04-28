'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer'
import type { OrdenCompra } from '@/types'

interface Props {
  oc: OrdenCompra
}

const colors = {
  primary: '#1a3557',
  secondary: '#6b7280',
  accent: '#9ca3af',
  dark: '#111827',
  light: '#f9fafb',
  white: '#ffffff',
  border: '#d1d5db',
  borderLight: '#e5e7eb',
  orange: '#d97706',
  teal: '#0f766e',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 10,
    lineHeight: 1.4,
    color: colors.dark,
    backgroundColor: colors.white,
  },

  // ── HEADER ──────────────────────────────────────────────────────────────────
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingBottom: 10,
    borderBottom: `2px solid ${colors.primary}`,
  },
  // Lado izquierdo: datos empresa
  companyBlock: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 7.5,
    color: colors.orange,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  companyDetail: {
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.5,
  },
  // Lado derecho: datos proveedor
  supplierBlock: {
    width: '42%',
    alignItems: 'flex-end',
  },
  supplierName: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.dark,
    marginBottom: 2,
    textAlign: 'right',
  },
  supplierDetail: {
    fontSize: 7.5,
    color: colors.secondary,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  supplierRuc: {
    fontSize: 7.5,
    color: colors.orange,
    textAlign: 'right',
    marginTop: 2,
  },

  // ── TÍTULO PRINCIPAL ─────────────────────────────────────────────────────────
  titleSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  titleMain: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.dark,
    letterSpacing: 0.5,
  },

  // ── BLOQUE DE REFERENCIAS ────────────────────────────────────────────────────
  refsContainer: {
    flexDirection: 'row',
    borderTop: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    marginBottom: 14,
  },
  refCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRight: `1px solid ${colors.border}`,
  },
  refCellLast: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refLabel: {
    fontSize: 7,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  refValue: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.dark,
  },

  // ── TABLA ────────────────────────────────────────────────────────────────────
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontWeight: 700,
    color: colors.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  tableRowAlt: {
    backgroundColor: colors.light,
  },
  tableCell: {
    fontSize: 8,
    color: colors.dark,
  },
  tableCellRight: {
    fontSize: 8,
    color: colors.dark,
    textAlign: 'right',
    width: '100%',
  },
  tableCellCenter: {
    fontSize: 8,
    color: colors.dark,
    textAlign: 'center',
    width: '100%',
  },
  // Anchos de columnas
  colNum:     { width: '4%',  flexShrink: 0, overflow: 'hidden' as const },
  colCodigo:  { width: '14%', flexShrink: 0, overflow: 'hidden' as const },
  colDesc:    { width: '34%', flexShrink: 0, overflow: 'hidden' as const },
  colUnd:     { width: '8%',  flexShrink: 0, overflow: 'hidden' as const },
  colCant:    { width: '8%',  flexShrink: 0, overflow: 'hidden' as const, textAlign: 'right' as const },
  colPrecio:  { width: '13%', flexShrink: 0, overflow: 'hidden' as const, textAlign: 'right' as const },
  colDesc_:   { width: '9%',  flexShrink: 0, overflow: 'hidden' as const, textAlign: 'center' as const },
  colTotal:   { width: '12%', flexShrink: 0, overflow: 'hidden' as const, textAlign: 'right' as const },

  // ── TOTALES ──────────────────────────────────────────────────────────────────
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalsBox: {
    width: 200,
    border: `1px solid ${colors.border}`,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
  },
  totalsLabel: { fontSize: 8.5, color: colors.secondary },
  totalsValue: { fontSize: 8.5, fontWeight: 700, color: colors.dark },
  totalsLabelBold: { fontSize: 9.5, fontWeight: 700, color: colors.white },
  totalsValueBold: { fontSize: 9.5, fontWeight: 700, color: colors.white },

  // ── TÉRMINOS ─────────────────────────────────────────────────────────────────
  termsSection: {
    marginBottom: 16,
  },
  termRow: {
    fontSize: 8.5,
    color: colors.teal,
    marginBottom: 3,
  },

  // ── OBSERVACIONES ────────────────────────────────────────────────────────────
  observationsBox: {
    border: `1px solid ${colors.border}`,
    padding: 10,
    marginBottom: 16,
  },
  observationsTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  observationsText: {
    fontSize: 8.5,
    color: colors.secondary,
    lineHeight: 1.5,
  },

  // ── PIE DE PÁGINA ────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: colors.accent,
  },
  footerPage: {
    fontSize: 7,
    color: colors.accent,
  },
})

const safeText = (val: any): string => {
  if (val === null || val === undefined) return '-'
  return String(val)
}

const formatCurrency = (amount: number, moneda = 'PEN') => {
  const symbol = moneda === 'USD' ? 'US$' : 'S/'
  return `${symbol} ${amount.toFixed(2)}`
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-'
  const str = typeof date === 'string' ? date : new Date(date).toISOString()
  const [y, m, d] = str.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function displayCondicionPago(condicionPago: string, formaPago: string | null | undefined, diasCredito?: number | null): string {
  // Importación local para evitar problemas de bundling con react-pdf
  const labelCond: Record<string, string> = { contado: 'Contado', credito: 'Crédito', adelanto: 'Adelanto' }
  const labelForma: Record<string, string> = {
    transferencia: 'Transferencia bancaria',
    factura: 'Factura',
    cheque: 'Cheque',
    letra: 'Letra',
    factura_negociable: 'Factura negociable',
    otro: 'Otro',
  }
  const cond = labelCond[condicionPago] ?? condicionPago
  const fma = formaPago ? (labelForma[formaPago] ?? formaPago) : ''
  // Compatibilidad con datos legacy (string compuesto)
  if (!labelCond[condicionPago]) {
    if (condicionPago.startsWith('credito_')) return `Crédito ${condicionPago.split('_')[1]} días`
    return condicionPago
  }
  if (condicionPago === 'credito' && diasCredito) {
    return fma ? `Crédito ${diasCredito} días vía ${fma}` : `Crédito ${diasCredito} días`
  }
  return fma ? `${cond} vía ${fma}` : cond
}

function OrdenCompraPDF({ oc }: Props) {
  const allItems = oc.items || []
  const equipos = allItems.filter((i: any) => (i.tipoItem || 'equipo') !== 'servicio')
  const servicios = allItems.filter((i: any) => (i.tipoItem || 'equipo') === 'servicio')

  // Referencia(s) de cotización derivadas de los ítems
  const cotizacionCodigos = [...new Set(
    allItems
      .map((i: any) => i.listaEquipoItem?.cotizacionSeleccionada?.cotizacionProveedor?.codigo)
      .filter(Boolean)
  )]

  const renderItemsTable = (items: any[], label?: string) => (
    <View style={styles.table}>
      {label && (
        <Text style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 4, color: colors.primary }}>{label}</Text>
      )}
      <View style={styles.tableHeader}>
        <View style={styles.colNum}><Text style={styles.tableHeaderText}>N°</Text></View>
        <View style={styles.colCodigo}><Text style={styles.tableHeaderText}>Código</Text></View>
        <View style={styles.colDesc}><Text style={styles.tableHeaderText}>Descripción</Text></View>
        <View style={styles.colUnd}><Text style={styles.tableHeaderText}>Und.</Text></View>
        <View style={styles.colCant}><Text style={styles.tableHeaderText}>Cant.</Text></View>
        <View style={styles.colPrecio}><Text style={styles.tableHeaderText}>P. Unidad</Text></View>
        <View style={styles.colDesc_}><Text style={styles.tableHeaderText}>Desc.%</Text></View>
        <View style={styles.colTotal}><Text style={styles.tableHeaderText}>P. Neto</Text></View>
      </View>
      {items.map((item, i) => (
        <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
          <View style={styles.colNum}><Text style={styles.tableCell}>{i + 1}</Text></View>
          <View style={styles.colCodigo}><Text style={styles.tableCell}>{item.codigo}</Text></View>
          <View style={styles.colDesc}><Text style={styles.tableCell}>{item.descripcion}</Text></View>
          <View style={styles.colUnd}><Text style={styles.tableCell}>{item.unidad}</Text></View>
          <View style={styles.colCant}><Text style={styles.tableCellRight}>{Number(item.cantidad).toFixed(2)}</Text></View>
          <View style={styles.colPrecio}><Text style={styles.tableCellRight}>{Number(item.precioUnitario).toFixed(2)}</Text></View>
          <View style={styles.colDesc_}><Text style={styles.tableCellCenter}>{Number(item.descuento ?? 0).toFixed(2)}</Text></View>
          <View style={styles.colTotal}><Text style={styles.tableCellRight}>{formatCurrency(item.costoTotal, oc.moneda)}</Text></View>
        </View>
      ))}
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── CABECERA ── */}
        <View style={styles.headerContainer}>
          {/* Empresa emisora — izquierda */}
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.companyDetail}>Av. Aurelio Garcia y Garcia 1178, Lima - Perú</Text>
            <Text style={styles.companyDetail}>RUC: 20545610672</Text>
            <Text style={{ ...styles.companyTagline, marginTop: 4 }}>
              Innovación continua en tecnologías aplicadas a mejorar su producción.
            </Text>
          </View>

          {/* Proveedor — derecha */}
          <View style={styles.supplierBlock}>
            <Text style={styles.supplierName}>{safeText(oc.proveedor?.nombre)}</Text>
            {oc.proveedor?.direccion && (
              <Text style={styles.supplierDetail}>{oc.proveedor.direccion}</Text>
            )}
            {oc.proveedor?.ruc && (
              <Text style={styles.supplierRuc}>RUC: {oc.proveedor.ruc}</Text>
            )}
            {oc.proveedor?.contactoNombre && (
              <Text style={styles.supplierDetail}>Contacto: {oc.proveedor.contactoNombre}</Text>
            )}
            {oc.proveedor?.contactoTelefono && (
              <Text style={styles.supplierDetail}>Tel: {oc.proveedor.contactoTelefono}</Text>
            )}
          </View>
        </View>

        {/* ── TÍTULO ── */}
        <View style={styles.titleSection}>
          <Text style={styles.titleMain}>Orden de compra N°  {oc.numero}</Text>
        </View>

        {/* ── REFERENCIAS ── */}
        <View style={styles.refsContainer}>
          <View style={styles.refCell}>
            <Text style={styles.refLabel}>Ref. de nuestra orden</Text>
            <Text style={styles.refValue}>{oc.numero}</Text>
          </View>
          {cotizacionCodigos.length > 0 && (
            <View style={styles.refCell}>
              <Text style={styles.refLabel}>Ref. de su orden</Text>
              <Text style={styles.refValue}>{cotizacionCodigos.join(', ')}</Text>
            </View>
          )}
          <View style={styles.refCell}>
            <Text style={styles.refLabel}>Moneda</Text>
            <Text style={styles.refValue}>{oc.moneda}</Text>
          </View>
          <View style={styles.refCell}>
            <Text style={styles.refLabel}>Condición de pago</Text>
            <Text style={styles.refValue}>{displayCondicionPago(oc.condicionPago, (oc as any).formaPago, oc.diasCredito)}</Text>
          </View>
          <View style={styles.refCellLast}>
            <Text style={styles.refLabel}>Fecha orden</Text>
            <Text style={styles.refValue}>{formatDate(oc.fechaEmision)}</Text>
          </View>
        </View>

        {/* ── ITEMS ── */}
        {equipos.length > 0 && renderItemsTable(equipos, servicios.length > 0 ? 'Equipos y Materiales' : undefined)}
        {servicios.length > 0 && renderItemsTable(servicios, 'Servicios')}

        {/* ── TOTALES ── */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total base</Text>
              <Text style={styles.totalsValue}>{formatCurrency(oc.subtotal, oc.moneda)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Impuestos (IGV 18%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(oc.igv, oc.moneda)}</Text>
            </View>
            <View style={styles.totalsRowTotal}>
              <Text style={styles.totalsLabelBold}>Total</Text>
              <Text style={styles.totalsValueBold}>{formatCurrency(oc.total, oc.moneda)}</Text>
            </View>
          </View>
        </View>

        {/* ── TÉRMINOS DE ENTREGA ── */}
        <View style={styles.termsSection}>
          <Text style={styles.termRow}>Términos de pago: {displayCondicionPago(oc.condicionPago, (oc as any).formaPago, oc.diasCredito)}</Text>
          {(oc as any).tiempoEntrega && (
            <Text style={styles.termRow}>Tiempo de entrega: {(oc as any).tiempoEntrega}</Text>
          )}
          {oc.fechaEntregaEstimada && (
            <Text style={styles.termRow}>Fecha de entrega estimada: {formatDate(oc.fechaEntregaEstimada)}</Text>
          )}
          {oc.lugarEntrega && (
            <Text style={styles.termRow}>Lugar de entrega: {oc.lugarEntrega}</Text>
          )}
          {oc.contactoEntrega && (
            <Text style={styles.termRow}>Contacto entrega: {oc.contactoEntrega}</Text>
          )}
          {oc.centroCosto && (
            <Text style={styles.termRow}>Centro de costo: {oc.centroCosto.nombre}</Text>
          )}
        </View>

        {/* ── OBSERVACIONES ── */}
        {oc.observaciones && (
          <View style={styles.observationsBox}>
            <Text style={styles.observationsTitle}>Observaciones</Text>
            <Text style={styles.observationsText}>{oc.observaciones}</Text>
          </View>
        )}

        {/* ── PIE DE PÁGINA ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Teléfono: +51 1 4787587  •  Sitio web: http://www.gyscontrol.com</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Página: ${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}

export const DescargarOCPDFButton = ({ oc }: Props) => {
  const pdfKey = `oc-pdf-${oc.id}-${oc.items?.length || 0}-${oc.total}`
  const fileName = `OC_${oc.numero}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_')

  return (
    <PDFDownloadLink
      key={pdfKey}
      document={<OrdenCompraPDF oc={oc} />}
      fileName={fileName}
      className="inline-flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors h-8"
    >
      {({ loading, error }) => {
        if (loading) return 'Generando PDF...'
        if (error) return 'Error al generar'
        return (
          <>
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </>
        )
      }}
    </PDFDownloadLink>
  )
}

export default OrdenCompraPDF
