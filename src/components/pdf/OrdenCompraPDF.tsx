'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image
} from '@react-pdf/renderer'
import type { OrdenCompra } from '@/types'

interface Props {
  oc: OrdenCompra
}

const colors = {
  primary: '#374151',
  secondary: '#6b7280',
  accent: '#9ca3af',
  dark: '#111827',
  light: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  orange: '#ea580c',
}

const styles = StyleSheet.create({
  page: {
    padding: 45,
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 10,
    borderBottom: `2px solid ${colors.primary}`,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 35,
  },
  logo: {
    width: 80,
    height: 40,
    marginRight: 20,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 9,
    color: colors.secondary,
    marginBottom: 6,
  },
  companyDetails: {
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.4,
  },
  // Title
  titleContainer: {
    backgroundColor: colors.light,
    padding: 16,
    marginBottom: 20,
    marginTop: 15,
    border: `1px solid ${colors.borderLight}`,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.orange,
  },
  titleNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.dark,
  },
  titleDate: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 4,
  },
  // Info sections
  infoRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  infoCard: {
    flex: 1,
    border: `1px solid ${colors.border}`,
    padding: 12,
  },
  infoTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoLabel: {
    fontSize: 8,
    color: colors.secondary,
  },
  infoValue: {
    fontSize: 9.5,
    color: colors.dark,
    marginBottom: 3,
  },
  // Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
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
    fontSize: 9,
    color: colors.dark,
  },
  tableCellRight: {
    fontSize: 9,
    color: colors.dark,
    textAlign: 'right',
  },
  // Columns widths
  colNum: { width: '6%' },
  colCodigo: { width: '12%' },
  colDesc: { width: '32%' },
  colUnd: { width: '8%' },
  colCant: { width: '10%', textAlign: 'right' as const },
  colPrecio: { width: '16%', textAlign: 'right' as const },
  colTotal: { width: '16%', textAlign: 'right' as const },
  // Totals
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: 220,
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
  totalsLabel: {
    fontSize: 9,
    color: colors.secondary,
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.dark,
  },
  totalsLabelBold: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
  },
  totalsValueBold: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
  },
  // Observations
  observationsBox: {
    border: `1px solid ${colors.border}`,
    padding: 12,
    marginBottom: 20,
  },
  observationsTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  observationsText: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 45,
    right: 45,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: colors.accent,
  },
  // Signatures
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    paddingTop: 10,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 180,
  },
  signatureLine: {
    width: 160,
    borderBottom: `1px solid ${colors.dark}`,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.dark,
  },
  signatureRole: {
    fontSize: 8,
    color: colors.secondary,
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
  return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

const condicionLabel: Record<string, string> = {
  contado: 'Contado',
  credito_15: 'Crédito 15 días',
  credito_30: 'Crédito 30 días',
  credito_60: 'Crédito 60 días',
}

function OrdenCompraPDF({ oc }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <View>
              <Text style={styles.companyName}>GYS CONTROL</Text>
              <Text style={styles.companyTagline}>Ingeniería, Montaje y Mantenimiento Industrial</Text>
              <Text style={styles.companyDetails}>RUC: 20610000000</Text>
              <Text style={styles.companyDetails}>contacto@gyscontrol.com</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>ORDEN DE COMPRA</Text>
            <Text style={styles.titleNumber}>{oc.numero}</Text>
          </View>
          <Text style={styles.titleDate}>
            Fecha de emisión: {formatDate(oc.fechaEmision)} | Moneda: {oc.moneda} | Condición: {condicionLabel[oc.condicionPago] || oc.condicionPago}
          </Text>
        </View>

        {/* Proveedor & Entrega */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Proveedor</Text>
            <Text style={styles.infoValue}>{safeText(oc.proveedor?.nombre)}</Text>
            {oc.proveedor?.ruc && <Text style={styles.infoLabel}>RUC: {oc.proveedor.ruc}</Text>}
            {oc.proveedor?.direccion && <Text style={styles.infoLabel}>{oc.proveedor.direccion}</Text>}
            {oc.proveedor?.contactoNombre && <Text style={styles.infoLabel}>Contacto: {oc.proveedor.contactoNombre}</Text>}
            {oc.proveedor?.contactoTelefono && <Text style={styles.infoLabel}>Tel: {oc.proveedor.contactoTelefono}</Text>}
            {oc.proveedor?.correo && <Text style={styles.infoLabel}>{oc.proveedor.correo}</Text>}
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Datos de Entrega</Text>
            {oc.lugarEntrega && <Text style={styles.infoValue}>{oc.lugarEntrega}</Text>}
            {oc.contactoEntrega && <Text style={styles.infoLabel}>Contacto: {oc.contactoEntrega}</Text>}
            {oc.fechaEntregaEstimada && <Text style={styles.infoLabel}>Fecha estimada: {formatDate(oc.fechaEntregaEstimada)}</Text>}
            {oc.centroCosto && <Text style={styles.infoLabel}>Centro de Costo: {oc.centroCosto.nombre}</Text>}
            {oc.proyecto && <Text style={styles.infoLabel}>Proyecto: {oc.proyecto.codigo} - {oc.proyecto.nombre}</Text>}
            {!oc.lugarEntrega && !oc.contactoEntrega && !oc.fechaEntregaEstimada && (
              <Text style={styles.infoLabel}>No especificado</Text>
            )}
          </View>
        </View>

        {/* Datos bancarios */}
        {oc.proveedor?.banco && (
          <View style={[styles.infoCard, { marginBottom: 15 }]}>
            <Text style={styles.infoTitle}>Datos Bancarios del Proveedor</Text>
            <Text style={styles.infoLabel}>
              Banco: {oc.proveedor.banco} | Cuenta: {oc.proveedor.numeroCuenta || '-'} | CCI: {oc.proveedor.cci || '-'} | Tipo: {oc.proveedor.tipoCuenta || '-'}
            </Text>
          </View>
        )}

        {/* Items Table - Equipos y Materiales */}
        {(() => {
          const allItems = oc.items || []
          const equiposYMateriales = allItems.filter((i: any) => (i.tipoItem || 'equipo') !== 'servicio')
          const servicios = allItems.filter((i: any) => (i.tipoItem || 'equipo') === 'servicio')
          return (
            <>
              {equiposYMateriales.length > 0 && (
                <View style={styles.table}>
                  {servicios.length > 0 && (
                    <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4, color: colors.primary }}>Equipos y Materiales</Text>
                  )}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colNum]}>N°</Text>
                    <Text style={[styles.tableHeaderText, styles.colCodigo]}>Código</Text>
                    <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
                    <Text style={[styles.tableHeaderText, styles.colUnd]}>Und.</Text>
                    <Text style={[styles.tableHeaderText, styles.colCant]}>Cant.</Text>
                    <Text style={[styles.tableHeaderText, styles.colPrecio]}>P. Unit.</Text>
                    <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
                  </View>
                  {equiposYMateriales.map((item, i) => (
                    <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                      <Text style={[styles.tableCell, styles.colNum]}>{i + 1}</Text>
                      <Text style={[styles.tableCell, styles.colCodigo]}>{item.codigo}</Text>
                      <Text style={[styles.tableCell, styles.colDesc]}>{item.descripcion}</Text>
                      <Text style={[styles.tableCell, styles.colUnd]}>{item.unidad}</Text>
                      <Text style={[styles.tableCellRight, styles.colCant]}>{item.cantidad}</Text>
                      <Text style={[styles.tableCellRight, styles.colPrecio]}>{formatCurrency(item.precioUnitario, oc.moneda)}</Text>
                      <Text style={[styles.tableCellRight, styles.colTotal]}>{formatCurrency(item.costoTotal, oc.moneda)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {servicios.length > 0 && (
                <View style={styles.table}>
                  <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4, color: '#7c3aed' }}>Servicios</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colNum]}>N°</Text>
                    <Text style={[styles.tableHeaderText, styles.colCodigo]}>Código</Text>
                    <Text style={[styles.tableHeaderText, { width: '48%' }]}>Descripción</Text>
                    <Text style={[styles.tableHeaderText, styles.colPrecio]}>P. Unit.</Text>
                    <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
                  </View>
                  {servicios.map((item, i) => (
                    <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                      <Text style={[styles.tableCell, styles.colNum]}>{i + 1}</Text>
                      <Text style={[styles.tableCell, styles.colCodigo]}>{item.codigo}</Text>
                      <Text style={[styles.tableCell, { width: '48%' }]}>{item.descripcion}</Text>
                      <Text style={[styles.tableCellRight, styles.colPrecio]}>{formatCurrency(item.precioUnitario, oc.moneda)}</Text>
                      <Text style={[styles.tableCellRight, styles.colTotal]}>{formatCurrency(item.costoTotal, oc.moneda)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )
        })()}

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(oc.subtotal, oc.moneda)}</Text>
            </View>
            {oc.moneda !== 'USD' && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>IGV (18%)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(oc.igv, oc.moneda)}</Text>
              </View>
            )}
            <View style={styles.totalsRowTotal}>
              <Text style={styles.totalsLabelBold}>TOTAL</Text>
              <Text style={styles.totalsValueBold}>{formatCurrency(oc.total, oc.moneda)}</Text>
            </View>
          </View>
        </View>

        {/* Observations */}
        {oc.observaciones && (
          <View style={styles.observationsBox}>
            <Text style={styles.observationsTitle}>Observaciones</Text>
            <Text style={styles.observationsText}>{oc.observaciones}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{safeText(oc.solicitante?.name)}</Text>
            <Text style={styles.signatureRole}>Solicitante</Text>
          </View>
          {oc.aprobador && (
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{safeText(oc.aprobador.name)}</Text>
              <Text style={styles.signatureRole}>Aprobado por</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GYS Control - Orden de Compra {oc.numero}</Text>
          <Text style={styles.footerText}>Generado: {new Date().toLocaleDateString('es-PE')}</Text>
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
