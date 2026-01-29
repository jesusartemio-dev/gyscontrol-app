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
import type { Cotizacion } from '@/types'

// Use built-in Helvetica font for better compatibility
// Font.register({
//   family: 'Helvetica',
//   fonts: [
//     { src: 'Helvetica', fontWeight: 300 },
//     { src: 'Helvetica', fontWeight: 400 },
//     { src: 'Helvetica', fontWeight: 500 },
//     { src: 'Helvetica', fontWeight: 600 },
//     { src: 'Helvetica', fontWeight: 700 }
//   ]
// })

interface Props {
  cotizacion: Cotizacion
}

// Modern Gray Scale Sophistication - Single color palette
const colors = {
  primary: '#374151',      // Gray-700 - Main professional gray
  secondary: '#6b7280',    // Gray-500 - Secondary text
  accent: '#9ca3af',       // Gray-400 - Subtle accents
  success: '#10b981',      // Keep for status indicators
  warning: '#f59e0b',      // Keep for status indicators
  danger: '#ef4444',       // Keep for status indicators
  dark: '#111827',         // Gray-900 - Dark text
  light: '#f9fafb',        // Gray-50 - Light backgrounds
  white: '#ffffff',
  black: '#000000',
  border: '#e5e7eb',       // Gray-200 - Modern borders
  borderLight: '#f3f4f6',  // Gray-100 - Very light borders
  shadow: '#d1d5db'        // Gray-300 - Subtle shadows
}

const styles = StyleSheet.create({
  // Document and page styles - Modern Gray Scale
  page: {
    padding: 45,
    fontSize: 10.5,
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.dark,
    backgroundColor: colors.white
  },
  
  // Modern header with clean lines and subtle gradients
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    position: 'relative'
  },
  headerAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    opacity: 0.8
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 35
  },
  logo: {
    width: 80,
    height: 40,
    marginRight: 20
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: -0.3
  },
  companyTagline: {
    fontSize: 9,
    fontWeight: 400,
    color: colors.secondary,
    marginBottom: 6,
    letterSpacing: 0.1
  },
  companyDetails: {
    fontSize: 7.5,
    color: colors.secondary,
    lineHeight: 1.4,
    fontWeight: 400
  },
  
  // Compact header for interior pages
  compactHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: `2px solid ${colors.primary}`,
    position: 'relative'
  },
  compactCompanyName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2
  },
  compactTagline: {
    fontSize: 8,
    fontWeight: 400,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: 0.1
  },
  
  // Modern quote header section
  quoteHeaderContainer: {
    backgroundColor: colors.light,
    padding: 22,
    marginBottom: 28,
    border: `1px solid ${colors.borderLight}`,
    position: 'relative'
  },
  quoteHeaderAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 18,
    color: colors.primary,
    letterSpacing: 0.5
  },
  quoteMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  quoteNumber: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.dark,
    letterSpacing: 0.2
  },
  quoteDate: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: 400,
    letterSpacing: 0.1
  },
  
  // Modern client information table
  clientSection: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 16,
    letterSpacing: 0.3
  },
  clientTable: {
    border: `1px solid ${colors.border}`,
    overflow: 'hidden'
  },
  clientRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.borderLight}`,
    minHeight: 38,
    alignItems: 'center'
  },
  clientRowLast: {
    borderBottom: 'none'
  },
  clientLabel: {
    width: 125,
    fontSize: 9,
    fontWeight: 600,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: colors.light,
    borderRight: `1px solid ${colors.borderLight}`,
    color: colors.primary,
    letterSpacing: 0.2
  },
  clientValue: {
    flex: 1,
    fontSize: 9,
    paddingLeft: 16,
    paddingRight: 16,
    color: colors.dark,
    fontWeight: 400,
    lineHeight: 1.4
  },
  
  // Modern summary section with gray scale sophistication
  summaryContainer: {
    marginBottom: 32
  },
  summaryHeader: {
    backgroundColor: colors.primary,
    padding: 14,
    marginBottom: 0,
    position: 'relative'
  },
  summaryHeaderAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.3
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 0.3
  },
  summaryTable: {
    border: `1px solid ${colors.border}`,
    borderTop: 'none'
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.light,
    borderBottom: `1px solid ${colors.border}`
  },
  summaryHeaderCell: {
    padding: 13,
    fontSize: 9.5,
    fontWeight: 600,
    textAlign: 'center',
    borderRight: `1px solid ${colors.borderLight}`,
    color: colors.primary,
    letterSpacing: 0.2
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.borderLight}`,
    minHeight: 42,
    alignItems: 'center'
  },
  summaryRowAlt: {
    backgroundColor: colors.white
  },
  summaryCell: {
    padding: 13,
    fontSize: 9,
    borderRight: `1px solid ${colors.borderLight}`,
    textAlign: 'center',
    color: colors.dark
  },
  summaryDescCell: {
    flex: 3,
    textAlign: 'left',
    fontWeight: 500,
    paddingLeft: 16
  },
  summaryQtyCell: {
    flex: 1,
    fontWeight: 500
  },
  summaryPriceCell: {
    flex: 2,
    textAlign: 'right',
    fontWeight: 600,
    color: colors.primary,
    paddingRight: 16
  },
  
  // Professional totals section
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end'
  },
  totalRow: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginBottom: 2,
    borderBottom: `1px solid ${colors.border}`
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: colors.secondary
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.dark
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: 15,
    marginTop: 10
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    textTransform: 'uppercase'
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white
  },
  
  // Enhanced scope and details sections
  contentSection: {
    marginTop: 30,
    marginBottom: 25
  },
  contentHeader: {
    backgroundColor: colors.secondary,
    padding: 12,
    marginBottom: 0
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  contentBody: {
    padding: 20,
    border: `1px solid ${colors.border}`,
    borderTop: 'none',
    backgroundColor: colors.white
  },
  contentText: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 12,
    color: colors.dark,
    textAlign: 'justify'
  },
  contentList: {
    marginLeft: 20,
    marginBottom: 15
  },
  contentListItem: {
    fontSize: 10,
    marginBottom: 6,
    color: colors.dark,
    lineHeight: 1.5
  },
  
  // Professional detail tables
  detailSection: {
    marginTop: 25,
    pageBreakInside: 'avoid'
  },
  detailHeader: {
    backgroundColor: colors.accent,
    padding: 12
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  detailTable: {
    border: `1px solid ${colors.border}`,
    borderTop: 'none'
  },
  detailTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.dark,
    color: colors.white
  },
  detailHeaderCell: {
    padding: 10,
    fontSize: 10,
    fontWeight: 600,
    textAlign: 'center',
    borderRight: `1px solid ${colors.border}`,
    textTransform: 'uppercase'
  },
  detailRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    minHeight: 35,
    alignItems: 'center'
  },
  detailRowAlt: {
    backgroundColor: '#fafbfc'
  },
  detailCell: {
    padding: 8,
    fontSize: 9,
    borderRight: `1px solid ${colors.border}`,
    textAlign: 'left',
    color: colors.dark
  },
  detailItemCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 500
  },
  detailDescCell: {
    flex: 4,
    fontWeight: 400
  },
  detailUnitCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 500
  },
  detailQtyCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 600,
    color: colors.primary
  },
  
  // Modern asymmetric footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 45,
    right: 45,
    paddingTop: 18,
    borderTop: `1px solid ${colors.border}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  footerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.4
  },
  footerLeft: {
    flex: 1,
    paddingTop: 8
  },
  footerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingTop: 8
  },
  footerRight: {
    flex: 1,
    textAlign: 'right',
    paddingTop: 8
  },
  footerText: {
    fontSize: 7.5,
    color: colors.secondary,
    fontWeight: 400,
    lineHeight: 1.3
  },
  footerBold: {
    fontWeight: 600,
    color: colors.primary
  },
  
  // Page numbering
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 40,
    fontSize: 8,
    color: colors.secondary
  },
  
  // Watermark for confidentiality
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#f0f0f0',
    fontWeight: 100,
    zIndex: -1
  }
})

// Enhanced utility functions
const safeText = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (isNaN(amount)) return currency === 'PEN' ? 'S/0.00' : '$0.00'

  if (currency === 'PEN') {
    return `S/${new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}

const CotizacionPDF = ({ cotizacion }: Props) => {
  // Early return if cotizacion is not properly loaded
  if (!cotizacion || !cotizacion.id) {
    return null
  }

  const currentDate = new Date()

  // Use dynamic validez or default to 15 days
  const validezDias = (cotizacion as any).validezOferta || 15
  const validUntilDate = (cotizacion as any).fechaValidezHasta
    ? new Date((cotizacion as any).fechaValidezHasta)
    : new Date(currentDate.getTime() + validezDias * 24 * 60 * 60 * 1000)

  // Safe data access with defaults
  const equipos = Array.isArray(cotizacion.equipos) ? cotizacion.equipos : []
  const servicios = Array.isArray(cotizacion.servicios) ? cotizacion.servicios : []
  const gastos = Array.isArray(cotizacion.gastos) ? cotizacion.gastos : []
  const exclusiones = Array.isArray(cotizacion.exclusiones) ? cotizacion.exclusiones : []
  const condiciones = Array.isArray(cotizacion.condiciones) ? cotizacion.condiciones : []
  const cronograma = Array.isArray(cotizacion.cronograma) ? cotizacion.cronograma : []

  // Dynamic currency
  const moneda = (cotizacion as any).moneda || 'USD'
  const monedaLabel = moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares Americanos (USD)'

  // Dynamic IGV handling
  const incluyeIGV = (cotizacion as any).incluyeIGV ?? false
  const igvRate = 0.18

  // Calculate totals with safe access
  const equiposTotal = equipos.reduce((sum, equipo) => sum + (equipo.subtotalCliente || 0), 0)
  const serviciosTotal = servicios.reduce((sum, servicio) => sum + (servicio.subtotalCliente || 0), 0)
  const gastosTotal = gastos.reduce((sum, gasto) => sum + (gasto.subtotalCliente || 0), 0)
  const subtotal = equiposTotal + serviciosTotal + gastosTotal
  const igv = incluyeIGV ? 0 : subtotal * igvRate
  const total = subtotal + igv

  // Determine which sections have content
  const hasEquipos = equipos.length > 0
  const hasServicios = servicios.length > 0
  const hasGastos = gastos.length > 0
  const hasExclusionesCondiciones = exclusiones.length > 0 || condiciones.length > 0
  const hasCronograma = cronograma.length > 0

  // Get comercial info for contact
  const comercial = (cotizacion as any).user || (cotizacion as any).comercial

  // Dynamic forma de pago
  const formaPago = (cotizacion as any).formaPago || '30% adelanto, 40% contra entrega, 30% contra conformidad'

  // Dynamic referencia
  const referencia = (cotizacion as any).referencia || safeText(cotizacion.nombre)

  return (
    <Document
      title={`Cotización ${safeText(cotizacion.nombre)} - ${safeText(cotizacion.cliente?.nombre)}`}
      author="GYS CONTROL INDUSTRIAL SAC"
      subject={`Propuesta Económica para ${safeText(cotizacion.cliente?.nombre)}`}
      keywords="cotización, propuesta, industrial, control, automatización"
      creator="GYS Control Industrial - Sistema de Gestión"
      producer="GYS Control Industrial SAC"
    >
      {/* PÁGINA 1: PORTADA Y INFORMACIÓN GENERAL */}
      <Page size="A4" style={styles.page}>
        {/* Modern Header */}
        <View style={styles.headerContainer}>
          <Image style={styles.logo} src="/logo.png" />
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.companyName, { textAlign: 'center', marginBottom: 4 }]}>GYS CONTROL SAC</Text>
            <Text style={[styles.companyTagline, { textAlign: 'center' }]}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        {/* Contact Details */}
        <View style={{ alignItems: 'center', marginBottom: 10, marginTop: 5 }}>
          <Text style={[styles.companyDetails, { textAlign: 'center' }]}>
            Lima: Calle Los Geranios 486 - Tel: +51 1 478 7587 - Email: info@gyscontrol.com{"\n"}
            Arequipa: Coop. Juan El Bueno E-26 - Tel: +51 54 277 584 - Web: www.gyscontrol.com
          </Text>
        </View>

        {/* Modern Quote Header */}
        <View style={styles.quoteHeaderContainer}>
          <View style={styles.quoteHeaderAccent} />
          <Text style={styles.quoteTitle}>Propuesta Económica</Text>
          <View style={styles.quoteMetadata}>
            <Text style={styles.quoteNumber}>N° {safeText(cotizacion.codigo)}</Text>
            <Text style={styles.quoteDate}>{formatDate(currentDate)}</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.clientSection}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          <View style={styles.clientTable}>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Cliente</Text>
              <Text style={styles.clientValue}>{safeText(cotizacion.cliente?.nombre).toUpperCase()}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>RUC</Text>
              <Text style={styles.clientValue}>{safeText(cotizacion.cliente?.ruc)}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Dirección</Text>
              <Text style={styles.clientValue}>{safeText(cotizacion.cliente?.direccion)}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Contacto</Text>
              <Text style={styles.clientValue}>{safeText(cotizacion.cliente?.correo)}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Referencia</Text>
              <Text style={styles.clientValue}>{referencia}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Moneda</Text>
              <Text style={styles.clientValue}>{monedaLabel}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Forma de Pago</Text>
              <Text style={styles.clientValue}>{formaPago}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Tiempo Entrega</Text>
              <Text style={styles.clientValue}>{(cotizacion as any).tiempoEntrega || 'Según cronograma del proyecto'}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Validez Oferta</Text>
              <Text style={styles.clientValue}>{validezDias} días calendario - Hasta {formatDate(validUntilDate)}</Text>
            </View>
            <View style={[styles.clientRow, styles.clientRowLast]}>
              <Text style={styles.clientLabel}>IGV</Text>
              <Text style={styles.clientValue}>{incluyeIGV ? 'Incluido en los precios' : 'No incluido en los precios mostrados'}</Text>
            </View>
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Introducción</Text>
          </View>
          <View style={styles.contentBody}>
            <Text style={styles.contentText}>
              En atención a su amable solicitud, GYS CONTROL INDUSTRIAL SAC tiene el agrado de presentar 
              nuestra propuesta técnico-económica para el proyecto de automatización industrial solicitado.
            </Text>
            <Text style={styles.contentText}>
              Nuestra propuesta ha sido desarrollada considerando los más altos estándares de calidad, 
              cumplimiento normativo y las mejores prácticas de la industria, garantizando una solución 
              integral y confiable para sus necesidades.
            </Text>
          </View>
        </View>

        {/* Modern Footer */}
        <View style={styles.footer}>
          <View style={styles.footerAccent} />
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
              RUC: 20545610672
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={[styles.footerText, { textAlign: 'center' }]}>
              Documento Confidencial - Uso Exclusivo del Cliente
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={[styles.footerText, { textAlign: 'right' }]}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </View>
      </Page>

      {/* PÁGINA 2: RESUMEN EJECUTIVO */}
      <Page size="A4" style={styles.page}>
        {/* Compact Header for Interior Pages */}
        <View style={styles.compactHeaderContainer}>
          <View>
            <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
        </View>

        {/* Modern Summary Table */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderAccent} />
            <Text style={styles.summaryTitle}>Resumen Ejecutivo</Text>
          </View>
          <View style={styles.summaryTable}>
            {/* Table Header */}
            <View style={styles.summaryTableHeader}>
              <Text style={[styles.summaryHeaderCell, { flex: 1 }]}>Item</Text>
              <Text style={[styles.summaryHeaderCell, styles.summaryDescCell]}>Descripción</Text>
              <Text style={[styles.summaryHeaderCell, styles.summaryQtyCell]}>Cant.</Text>
              <Text style={[styles.summaryHeaderCell, styles.summaryPriceCell]}>Valor Total</Text>
            </View>
            
            {/* Equipment Rows */}
            {cotizacion.equipos?.map((equipo, index) => (
              <View key={`equipo-${equipo.id || index}`} style={[styles.summaryRow, ...(index % 2 === 1 ? [styles.summaryRowAlt] : [])]}>
                <Text style={[styles.summaryCell, { flex: 1 }]}>{index + 1}</Text>
                <Text style={[styles.summaryCell, styles.summaryDescCell]}>
                  {safeText(equipo.nombre).toUpperCase()}
                </Text>
                <Text style={[styles.summaryCell, styles.summaryQtyCell]}>1</Text>
                <Text style={[styles.summaryCell, styles.summaryPriceCell]}>
                  {formatCurrency(equipo.subtotalCliente || 0, moneda)}
                </Text>
              </View>
            ))}
            
            {/* Services Rows */}
            {cotizacion.servicios?.map((servicio, index) => {
              const equiposLength = cotizacion.equipos?.length || 0
              const rowIndex = equiposLength + index
              return (
                <View key={`servicio-${servicio.id || index}`} style={[styles.summaryRow, ...(rowIndex % 2 === 1 ? [styles.summaryRowAlt] : [])]}>
                  <Text style={[styles.summaryCell, { flex: 1 }]}>{rowIndex + 1}</Text>
                  <Text style={[styles.summaryCell, styles.summaryDescCell]}>
                    {safeText(servicio.edt?.nombre || servicio.nombre).toUpperCase()}
                  </Text>
                  <Text style={[styles.summaryCell, styles.summaryQtyCell]}>1</Text>
                  <Text style={[styles.summaryCell, styles.summaryPriceCell]}>
                    {formatCurrency(servicio.subtotalCliente || 0, moneda)}
                  </Text>
                </View>
              )
            })}
            
            {/* Expenses Rows */}
            {cotizacion.gastos?.map((gasto, index) => {
              const prevLength = (cotizacion.equipos?.length || 0) + (cotizacion.servicios?.length || 0)
              const rowIndex = prevLength + index
              return (
                <View key={`gasto-${gasto.id || index}`} style={[styles.summaryRow, ...(rowIndex % 2 === 1 ? [styles.summaryRowAlt] : [])]}>
                  <Text style={[styles.summaryCell, { flex: 1 }]}>{rowIndex + 1}</Text>
                  <Text style={[styles.summaryCell, styles.summaryDescCell]}>
                    {safeText(gasto.nombre).toUpperCase()}
                  </Text>
                  <Text style={[styles.summaryCell, styles.summaryQtyCell]}>1</Text>
                  <Text style={[styles.summaryCell, styles.summaryPriceCell]}>
                    {formatCurrency(gasto.subtotalCliente || 0, moneda)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Professional Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, moneda)}</Text>
          </View>
          {!incluyeIGV && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGV (18%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(igv, moneda)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{incluyeIGV ? 'Total (inc. IGV):' : 'Total General:'}</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total, moneda)}</Text>
          </View>
        </View>

        {/* Scope of Work */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Alcance del Proyecto</Text>
          </View>
          <View style={styles.contentBody}>
            <Text style={styles.contentText}>
              El presente proyecto contempla la implementación integral de soluciones de automatización 
              industrial, incluyendo:
            </Text>
            <View style={styles.contentList}>
              <Text style={styles.contentListItem}>• Suministro e instalación de equipos especializados</Text>
              <Text style={styles.contentListItem}>• Servicios de ingeniería y consultoría técnica</Text>
              <Text style={styles.contentListItem}>• Programación y configuración de sistemas</Text>
              <Text style={styles.contentListItem}>• Pruebas, puesta en marcha y comisionado</Text>
              <Text style={styles.contentListItem}>• Capacitación del personal operativo</Text>
              <Text style={styles.contentListItem}>• Documentación técnica completa</Text>
              <Text style={styles.contentListItem}>• Soporte técnico y garantía</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
              RUC: 20545610672
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={[styles.footerText, { textAlign: 'center' }]}>
              Documento Confidencial - Uso Exclusivo del Cliente
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={[styles.footerText, { textAlign: 'right' }]}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </View>
      </Page>

      {/* PÁGINA 3: DETALLE DE EQUIPOS */}
      {cotizacion.equipos && cotizacion.equipos.length > 0 && (
        <Page size="A4" style={styles.page}>
          {/* Compact Header for Interior Pages */}
          <View style={styles.compactHeaderContainer}>
            <View>
              <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
              <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
            </View>
          </View>

          {/* Equipment Details */}
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Detalle Técnico - Equipos</Text>
            </View>
            <View style={styles.detailTable}>
              {/* Table Header */}
              <View style={styles.detailTableHeader}>
                <Text style={[styles.detailHeaderCell, styles.detailItemCell]}>Item</Text>
                <Text style={[styles.detailHeaderCell, styles.detailDescCell]}>Descripción Técnica</Text>
                <Text style={[styles.detailHeaderCell, styles.detailUnitCell]}>Unidad</Text>
                <Text style={[styles.detailHeaderCell, styles.detailQtyCell]}>Cantidad</Text>
              </View>
              
              {/* Equipment Rows */}
              {cotizacion.equipos.map((equipo, equipoIndex) => (
                <View key={equipo.id || equipoIndex}>
                  {/* Equipment Category Header */}
                  <View style={[styles.detailRow, { backgroundColor: colors.accent, minHeight: 40 }]}>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {equipoIndex + 1}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 4, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {safeText(equipo.nombre).toUpperCase()}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'center' }]}>-</Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'center' }]}>-</Text>
                  </View>
                  
                  {/* Equipment Items */}
                  {equipo.items?.map((item, itemIndex) => (
                    <View key={item.id || itemIndex} style={[styles.detailRow, ...(itemIndex % 2 === 1 ? [styles.detailRowAlt] : [])]}>
                      <Text style={[styles.detailCell, styles.detailItemCell]}>
                        {equipoIndex + 1}.{itemIndex + 1}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailDescCell]}>
                        <Text style={{ fontWeight: 600 }}>{safeText(item.codigo)}</Text>{"\n"}
                        {safeText(item.descripcion)}
                        {item.descripcion && item.descripcion.length > 50 && (
                          <Text style={{ fontSize: 8, color: colors.secondary }}>
                            {"\n"}Detalles adicionales disponibles
                          </Text>
                        )}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailUnitCell]}>
                        {safeText(item.unidad)}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailQtyCell]}>
                        {formatNumber(item.cantidad || 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Technical Notes */}
          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>Notas Técnicas</Text>
            </View>
            <View style={styles.contentBody}>
              <Text style={styles.contentText}>
                • Todos los equipos cumplen con estándares internacionales de calidad y seguridad
              </Text>
              <Text style={styles.contentText}>
                • Se incluye documentación técnica completa en español e inglés
              </Text>
              <Text style={styles.contentText}>
                • Garantía de fábrica según especificaciones del fabricante
              </Text>
              <Text style={styles.contentText}>
                • Soporte técnico especializado durante la implementación
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>
                <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
                RUC: 20545610672
              </Text>
            </View>
            <View style={styles.footerCenter}>
              <Text style={[styles.footerText, { textAlign: 'center' }]}>
                Documento Confidencial - Uso Exclusivo del Cliente
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text
                style={[styles.footerText, { textAlign: 'right' }]}
                render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
              />
            </View>
          </View>
        </Page>
      )}

      {/* PÁGINA: DETALLE DE SERVICIOS */}
      {hasServicios && (
        <Page size="A4" style={styles.page}>
          {/* Compact Header */}
          <View style={styles.compactHeaderContainer}>
            <View>
              <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
              <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
            </View>
          </View>

          {/* Services Details */}
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Detalle Técnico - Servicios</Text>
            </View>
            <View style={styles.detailTable}>
              {/* Table Header */}
              <View style={styles.detailTableHeader}>
                <Text style={[styles.detailHeaderCell, styles.detailItemCell]}>Item</Text>
                <Text style={[styles.detailHeaderCell, styles.detailDescCell]}>Descripción del Servicio</Text>
                <Text style={[styles.detailHeaderCell, styles.detailUnitCell]}>Horas</Text>
                <Text style={[styles.detailHeaderCell, styles.detailQtyCell]}>Valor</Text>
              </View>

              {/* Services Rows */}
              {servicios.map((servicio, servicioIndex) => (
                <View key={servicio.id || servicioIndex}>
                  {/* Service Category Header */}
                  <View style={[styles.detailRow, { backgroundColor: colors.accent, minHeight: 40 }]}>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {servicioIndex + 1}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 4, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {safeText(servicio.edt?.nombre || servicio.nombre).toUpperCase()}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'center' }]}>
                      {(servicio as any).horas || '-'}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'right', paddingRight: 10 }]}>
                      {formatCurrency(servicio.subtotalCliente || 0, moneda)}
                    </Text>
                  </View>

                  {/* Service Items/Tasks */}
                  {servicio.items?.map((item: any, itemIndex: number) => (
                    <View key={item.id || itemIndex} style={[styles.detailRow, ...(itemIndex % 2 === 1 ? [styles.detailRowAlt] : [])]}>
                      <Text style={[styles.detailCell, styles.detailItemCell]}>
                        {servicioIndex + 1}.{itemIndex + 1}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailDescCell]}>
                        {safeText(item.descripcion || item.nombre)}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailUnitCell]}>
                        {item.horas || item.cantidad || '-'}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailQtyCell]}>
                        {item.precioCliente ? formatCurrency(item.precioCliente, moneda) : '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Services Notes */}
          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>Notas de Servicios</Text>
            </View>
            <View style={styles.contentBody}>
              <Text style={styles.contentText}>
                • Los servicios incluyen mano de obra calificada y herramientas especializadas
              </Text>
              <Text style={styles.contentText}>
                • Las horas indicadas son estimadas y pueden variar según condiciones de sitio
              </Text>
              <Text style={styles.contentText}>
                • Incluye supervisión técnica durante la ejecución de los trabajos
              </Text>
              <Text style={styles.contentText}>
                • Capacitación al personal operativo del cliente
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>
                <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
                RUC: 20545610672
              </Text>
            </View>
            <View style={styles.footerCenter}>
              <Text style={[styles.footerText, { textAlign: 'center' }]}>
                Documento Confidencial - Uso Exclusivo del Cliente
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text
                style={[styles.footerText, { textAlign: 'right' }]}
                render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
              />
            </View>
          </View>
        </Page>
      )}

      {/* PÁGINA: DETALLE DE GASTOS */}
      {hasGastos && (
        <Page size="A4" style={styles.page}>
          {/* Compact Header */}
          <View style={styles.compactHeaderContainer}>
            <View>
              <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
              <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
            </View>
          </View>

          {/* Expenses Details */}
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Detalle de Gastos Adicionales</Text>
            </View>
            <View style={styles.detailTable}>
              {/* Table Header */}
              <View style={styles.detailTableHeader}>
                <Text style={[styles.detailHeaderCell, styles.detailItemCell]}>Item</Text>
                <Text style={[styles.detailHeaderCell, styles.detailDescCell]}>Descripción del Gasto</Text>
                <Text style={[styles.detailHeaderCell, styles.detailUnitCell]}>Cant.</Text>
                <Text style={[styles.detailHeaderCell, styles.detailQtyCell]}>Valor</Text>
              </View>

              {/* Gastos Rows */}
              {gastos.map((gasto, gastoIndex) => (
                <View key={gasto.id || gastoIndex}>
                  {/* Gasto Category Header */}
                  <View style={[styles.detailRow, { backgroundColor: colors.accent, minHeight: 40 }]}>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {gastoIndex + 1}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 4, color: colors.white, fontWeight: 600, fontSize: 11 }]}>
                      {safeText(gasto.nombre).toUpperCase()}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'center' }]}>
                      {(gasto as any).cantidad || 1}
                    </Text>
                    <Text style={[styles.detailCell, { flex: 1, color: colors.white, textAlign: 'right', paddingRight: 10 }]}>
                      {formatCurrency(gasto.subtotalCliente || 0, moneda)}
                    </Text>
                  </View>

                  {/* Gasto Items if any */}
                  {gasto.items?.map((item: any, itemIndex: number) => (
                    <View key={item.id || itemIndex} style={[styles.detailRow, ...(itemIndex % 2 === 1 ? [styles.detailRowAlt] : [])]}>
                      <Text style={[styles.detailCell, styles.detailItemCell]}>
                        {gastoIndex + 1}.{itemIndex + 1}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailDescCell]}>
                        {safeText(item.descripcion || item.nombre)}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailUnitCell]}>
                        {item.cantidad || 1}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailQtyCell]}>
                        {item.precioCliente ? formatCurrency(item.precioCliente, moneda) : '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Expenses Notes */}
          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>Notas sobre Gastos</Text>
            </View>
            <View style={styles.contentBody}>
              <Text style={styles.contentText}>
                • Los gastos de viáticos incluyen transporte, alimentación y hospedaje del personal técnico
              </Text>
              <Text style={styles.contentText}>
                • Los fletes se calculan según distancia y volumen de equipos a transportar
              </Text>
              <Text style={styles.contentText}>
                • Los valores están sujetos a cambio según condiciones del proyecto
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>
                <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
                RUC: 20545610672
              </Text>
            </View>
            <View style={styles.footerCenter}>
              <Text style={[styles.footerText, { textAlign: 'center' }]}>
                Documento Confidencial - Uso Exclusivo del Cliente
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text
                style={[styles.footerText, { textAlign: 'right' }]}
                render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
              />
            </View>
          </View>
        </Page>
      )}

      {/* PÁGINA: TÉRMINOS Y CONDICIONES */}
      <Page size="A4" style={styles.page}>
        {/* Compact Header for Interior Pages */}
        <View style={styles.compactHeaderContainer}>
          <View>
            <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Términos y Condiciones Comerciales</Text>
          </View>
          <View style={styles.contentBody}>
            <Text style={[styles.contentText, { fontWeight: 600, marginBottom: 15 }]}>1. CONDICIONES DE PAGO</Text>
            <Text style={styles.contentText}>
              • 30% de adelanto contra orden de compra{"\n"}
              • 40% contra entrega de equipos en almacén del cliente{"\n"}
              • 30% contra conformidad de servicios y puesta en marcha
            </Text>
            
            <Text style={[styles.contentText, { fontWeight: 600, marginBottom: 15, marginTop: 20 }]}>2. TIEMPO DE ENTREGA</Text>
            <Text style={styles.contentText}>
              • Equipos: 8-12 semanas desde la orden de compra{"\n"}
              • Servicios: Según cronograma acordado{"\n"}
              • Los tiempos pueden variar según disponibilidad del fabricante
            </Text>
            
            <Text style={[styles.contentText, { fontWeight: 600, marginBottom: 15, marginTop: 20 }]}>3. GARANTÍAS</Text>
            <Text style={styles.contentText}>
              • Equipos: 12 meses contra defectos de fabricación{"\n"}
              • Servicios: 6 meses contra defectos de mano de obra{"\n"}
              • Soporte técnico telefónico sin costo durante el período de garantía
            </Text>
            
            <Text style={[styles.contentText, { fontWeight: 600, marginBottom: 15, marginTop: 20 }]}>4. EXCLUSIONES</Text>
            <Text style={styles.contentText}>
              • Obras civiles y adecuaciones de infraestructura{"\n"}
              • Permisos municipales y licencias{"\n"}
              • Seguros de transporte y almacenaje{"\n"}
              • Gastos de alimentación y hospedaje del personal técnico
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Información de Contacto</Text>
          </View>
          <View style={styles.contentBody}>
            <Text style={styles.contentText}>
              <Text style={{ fontWeight: 600 }}>{comercial?.name || 'Departamento Comercial'}</Text>{"\n"}
              {comercial?.cargo || 'Ejecutivo Comercial'}{"\n"}
              {comercial?.telefono && `Cel: ${comercial.telefono}\n`}
              {comercial?.email && `Email: ${comercial.email}\n`}
              Calle Los Geranios 486, Urb. San Eugenio Lince, Lima
            </Text>
          </View>
        </View>

        {/* Acceptance */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Aceptación de Propuesta</Text>
          </View>
          <View style={styles.contentBody}>
            <Text style={styles.contentText}>
              Agradecemos la oportunidad de presentar nuestra propuesta y esperamos contar con su 
              preferencia. Para proceder con la ejecución del proyecto, solicitamos la confirmación 
              por escrito de la aceptación de esta propuesta.
            </Text>
            <Text style={[styles.contentText, { marginTop: 30, textAlign: 'center', fontWeight: 600 }]}>
              ¡Gracias por confiar en GYS Control Industrial SAC!
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
              RUC: 20545610672
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={[styles.footerText, { textAlign: 'center' }]}>
              Documento Confidencial - Uso Exclusivo del Cliente
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={[styles.footerText, { textAlign: 'right' }]}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </View>
      </Page>

      {/* PÁGINA: EXCLUSIONES Y CONDICIONES */}
      {hasExclusionesCondiciones && (
      <Page size="A4" style={styles.page}>
        {/* Compact Header for Interior Pages */}
        <View style={styles.compactHeaderContainer}>
          <View>
            <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
        </View>

        {/* Exclusiones */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Exclusiones de la Propuesta</Text>
          </View>
          <View style={styles.contentBody}>
            {cotizacion.exclusiones && cotizacion.exclusiones.length > 0 ? (
              <View style={styles.contentList}>
                {cotizacion.exclusiones.map((exclusion, index) => (
                  <Text key={exclusion.id || index} style={styles.contentListItem}>
                    • {exclusion.descripcion}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.contentText}>
                No se han definido exclusiones específicas para esta propuesta.
              </Text>
            )}
          </View>
        </View>

        {/* Condiciones */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Condiciones y Consideraciones</Text>
          </View>
          <View style={styles.contentBody}>
            {cotizacion.condiciones && cotizacion.condiciones.length > 0 ? (
              <View style={styles.contentList}>
                {cotizacion.condiciones.map((condicion, index) => (
                  <Text key={condicion.id || index} style={styles.contentListItem}>
                    • {condicion.descripcion}
                    {condicion.tipo && (
                      <Text style={{ fontWeight: 600 }}> ({condicion.tipo})</Text>
                    )}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.contentText}>
                No se han definido condiciones específicas adicionales para esta propuesta.
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
              RUC: 20545610672
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={[styles.footerText, { textAlign: 'center' }]}>
              Documento Confidencial - Uso Exclusivo del Cliente
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={[styles.footerText, { textAlign: 'right' }]}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </View>
      </Page>
      )}

      {/* PÁGINA: CRONOGRAMA COMERCIAL */}
      {hasCronograma && (
      <Page size="A4" style={styles.page}>
        {/* Compact Header for Interior Pages */}
        <View style={styles.compactHeaderContainer}>
          <View>
            <Text style={styles.compactCompanyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.compactTagline}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
        </View>

        {/* Cronograma Comercial */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Cronograma de Ejecución</Text>
          </View>
          <View style={styles.contentBody}>
            {cotizacion.cronograma && cotizacion.cronograma.length > 0 ? (
              <View>
                <Text style={styles.contentText}>
                  A continuación se detalla el cronograma estimado de ejecución del proyecto:
                </Text>
                <View style={{ marginTop: 15 }}>
                  {cotizacion.cronograma.map((edt, index) => (
                    <View key={edt.id || index} style={{ marginBottom: 15 }}>
                      <Text style={[styles.contentText, { fontWeight: 600, marginBottom: 8 }]}>
                        {edt.edt?.nombre || 'Sin categoría'} - {edt.zona || 'Sin zona'}
                      </Text>
                      <Text style={styles.contentText}>
                        • Fecha Inicio: {edt.fechaInicioCom ? formatDate(edt.fechaInicioCom) : 'No definida'}
                      </Text>
                      <Text style={styles.contentText}>
                        • Fecha Fin: {edt.fechaFinCom ? formatDate(edt.fechaFinCom) : 'No definida'}
                      </Text>
                      <Text style={styles.contentText}>
                        • Horas Estimadas: {edt.horasCom || 0} horas
                      </Text>
                      {edt.descripcion && (
                        <Text style={styles.contentText}>
                          • Descripción: {edt.descripcion}
                        </Text>
                      )}
                      {edt.tareas && edt.tareas.length > 0 && (
                        <View style={{ marginLeft: 20, marginTop: 8 }}>
                          <Text style={[styles.contentText, { fontWeight: 500 }]}>
                            Tareas programadas:
                          </Text>
                          {edt.tareas.map((tarea, tareaIndex) => (
                            <Text key={tarea.id || tareaIndex} style={[styles.contentText, { marginLeft: 10 }]}>
                              - {tarea.nombre}: {tarea.fechaInicioCom ? formatDate(tarea.fechaInicioCom) : 'No definida'} - {tarea.fechaFinCom ? formatDate(tarea.fechaFinCom) : 'No definida'}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.contentText}>
                No se ha definido un cronograma específico para esta propuesta.
                Los tiempos de entrega se detallan en las secciones correspondientes.
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>GYS Control Industrial SAC</Text>{"\n"}
              RUC: 20545610672
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={[styles.footerText, { textAlign: 'center' }]}>
              Documento Confidencial - Uso Exclusivo del Cliente
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={[styles.footerText, { textAlign: 'right' }]}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </View>
      </Page>
      )}
    </Document>
  )
}

export const DescargarPDFButton = ({ cotizacion }: Props) => {
  // Generate a stable key based on cotizacion content to force remount when data changes
  // This prevents @react-pdf reconciler errors when trying to update an existing PDF
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
      {({ blob, url, loading, error }) => {
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
