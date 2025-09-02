'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font
} from '@react-pdf/renderer'
import type { Cotizacion } from '@/types'

// Register professional fonts
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700
    }
  ]
})

interface Props {
  cotizacion: Cotizacion
}

// Professional color palette
const colors = {
  primary: '#1e40af',      // Professional blue
  secondary: '#64748b',    // Slate gray
  accent: '#0ea5e9',       // Sky blue
  success: '#10b981',      // Emerald
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  dark: '#1f2937',         // Dark gray
  light: '#f8fafc',        // Light gray
  white: '#ffffff',
  black: '#000000',
  border: '#e2e8f0'        // Light border
}

const styles = StyleSheet.create({
  // Document and page styles
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Roboto',
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.dark,
    backgroundColor: colors.white
  },
  
  // Professional header with branding
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: `3px solid ${colors.primary}`,
    alignItems: 'flex-start'
  },
  logoSection: {
    flex: 1,
    marginRight: 30
  },
  companyName: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  companyTagline: {
    fontSize: 12,
    fontWeight: 300,
    color: colors.secondary,
    marginBottom: 15
  },
  companyDetails: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.5
  },
  
  // Quote header section
  quoteHeaderContainer: {
    backgroundColor: colors.light,
    padding: 20,
    marginBottom: 25,
    borderRadius: 8,
    border: `1px solid ${colors.border}`
  },
  quoteTitle: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 15,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  quoteMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  quoteNumber: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.dark
  },
  quoteDate: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: 300
  },
  
  // Professional client information table
  clientSection: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  clientTable: {
    border: `1px solid ${colors.border}`,
    borderRadius: 6
  },
  clientRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    minHeight: 35,
    alignItems: 'center'
  },
  clientRowLast: {
    borderBottom: 'none'
  },
  clientLabel: {
    width: 120,
    fontSize: 10,
    fontWeight: 600,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: colors.light,
    borderRight: `1px solid ${colors.border}`,
    color: colors.dark,
    textTransform: 'uppercase'
  },
  clientValue: {
    flex: 1,
    fontSize: 10,
    paddingLeft: 15,
    paddingRight: 15,
    color: colors.dark,
    fontWeight: 400
  },
  
  // Enhanced summary section
  summaryContainer: {
    marginBottom: 30
  },
  summaryHeader: {
    backgroundColor: colors.primary,
    padding: 12,
    marginBottom: 0
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  summaryTable: {
    border: `1px solid ${colors.border}`,
    borderTop: 'none'
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.light,
    borderBottom: `2px solid ${colors.primary}`
  },
  summaryHeaderCell: {
    padding: 12,
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    borderRight: `1px solid ${colors.border}`,
    color: colors.dark,
    textTransform: 'uppercase'
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    minHeight: 40,
    alignItems: 'center'
  },
  summaryRowAlt: {
    backgroundColor: '#fafbfc'
  },
  summaryCell: {
    padding: 12,
    fontSize: 10,
    borderRight: `1px solid ${colors.border}`,
    textAlign: 'center',
    color: colors.dark
  },
  summaryDescCell: {
    flex: 3,
    textAlign: 'left',
    fontWeight: 500
  },
  summaryQtyCell: {
    flex: 1,
    fontWeight: 500
  },
  summaryPriceCell: {
    flex: 2,
    textAlign: 'right',
    fontWeight: 600,
    color: colors.primary
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
    marginTop: 10,
    borderRadius: 6
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
  
  // Professional footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTop: `2px solid ${colors.primary}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLeft: {
    flex: 1
  },
  footerCenter: {
    flex: 1,
    textAlign: 'center'
  },
  footerRight: {
    flex: 1,
    textAlign: 'right'
  },
  footerText: {
    fontSize: 8,
    color: colors.secondary,
    fontWeight: 300
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
  if (isNaN(amount)) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
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
  const currentDate = new Date()
  const validUntilDate = new Date()
  validUntilDate.setDate(currentDate.getDate() + 15)
  
  // Calculate totals
  const equiposTotal = cotizacion.equipos?.reduce((sum, equipo) => sum + (equipo.subtotalCliente || 0), 0) || 0
  const serviciosTotal = cotizacion.servicios?.reduce((sum, servicio) => sum + (servicio.subtotalCliente || 0), 0) || 0
  const gastosTotal = cotizacion.gastos?.reduce((sum, gasto) => sum + (gasto.subtotalCliente || 0), 0) || 0
  const subtotal = equiposTotal + serviciosTotal + gastosTotal
  const igv = subtotal * 0.18
  const total = subtotal + igv

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
        {/* Professional Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.companyTagline}>Soluciones Integrales en Automatización Industrial</Text>
            <Text style={styles.companyDetails}>
              📍 OF. Lima: Calle Los Geranios 486, Urb. San Eugenio Lince, Lima{"\n"}
              📞 T. +51.1. 478 7587 | 📧 info@gyscontrol.com{"\n"}
              📍 OF. Arequipa: Coop. Juan El Bueno E-26 Cercado, Arequipa{"\n"}
              📞 T. +51 54. 277 584 | 🌐 www.gyscontrol.com
            </Text>
          </View>
        </View>

        {/* Quote Header */}
        <View style={styles.quoteHeaderContainer}>
          <Text style={styles.quoteTitle}>Propuesta Económica</Text>
          <View style={styles.quoteMetadata}>
            <Text style={styles.quoteNumber}>N° {safeText(cotizacion.nombre)}</Text>
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
              <Text style={styles.clientValue}>Propuesta de Automatización Industrial</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Moneda</Text>
              <Text style={styles.clientValue}>Dólares Americanos (USD)</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Forma de Pago</Text>
              <Text style={styles.clientValue}>Según términos comerciales acordados</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Tiempo Entrega</Text>
              <Text style={styles.clientValue}>Según cronograma del proyecto</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Validez Oferta</Text>
              <Text style={styles.clientValue}>15 días calendario - Hasta {formatDate(validUntilDate)}</Text>
            </View>
            <View style={[styles.clientRow, styles.clientRowLast]}>
              <Text style={styles.clientLabel}>IGV</Text>
              <Text style={styles.clientValue}>No incluido en los precios mostrados</Text>
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

        {/* Professional Footer */}
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
            <Text style={[styles.footerText, { textAlign: 'right' }]}>
              Página 1 de 4
            </Text>
          </View>
        </View>
      </Page>

      {/* PÁGINA 2: RESUMEN EJECUTIVO */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.companyTagline}>Soluciones Integrales en Automatización Industrial</Text>
          </View>
        </View>

        {/* Summary Table */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
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
                  {formatCurrency(equipo.subtotalCliente || 0)}
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
                    {safeText(servicio.categoria).toUpperCase()}
                  </Text>
                  <Text style={[styles.summaryCell, styles.summaryQtyCell]}>1</Text>
                  <Text style={[styles.summaryCell, styles.summaryPriceCell]}>
                    {formatCurrency(servicio.subtotalCliente || 0)}
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
                    {formatCurrency(gasto.subtotalCliente || 0)}
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
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IGV (18%):</Text>
            <Text style={styles.totalValue}>{formatCurrency(igv)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total General:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
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
            <Text style={[styles.footerText, { textAlign: 'right' }]}>
              Página 2 de 4
            </Text>
          </View>
        </View>
      </Page>

      {/* PÁGINA 3: DETALLE DE EQUIPOS */}
      {cotizacion.equipos && cotizacion.equipos.length > 0 && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoSection}>
              <Text style={styles.companyName}>GYS CONTROL INDUSTRIAL SAC</Text>
              <Text style={styles.companyTagline}>Soluciones Integrales en Automatización Industrial</Text>
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
              <Text style={[styles.footerText, { textAlign: 'right' }]}>
                Página 3 de 4
              </Text>
            </View>
          </View>
        </Page>
      )}

      {/* PÁGINA 4: TÉRMINOS Y CONDICIONES */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>GYS CONTROL INDUSTRIAL SAC</Text>
            <Text style={styles.companyTagline}>Soluciones Integrales en Automatización Industrial</Text>
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
              <Text style={{ fontWeight: 600 }}>Ing. Andrea Ortega</Text>{"\n"}
              Gerente Comercial{"\n"}
              📞 Cel: +51 962 375 309{"\n"}
              📧 andrea.o@gyscontrol.com{"\n"}
              🏢 Calle Los Geranios 486, Urb. San Eugenio Lince, Lima
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
            <Text style={[styles.footerText, { textAlign: 'right' }]}>
              Página 4 de 4
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export const DescargarPDFButton = ({ cotizacion }: Props) => {
  const fileName = `Cotizacion_${safeText(cotizacion.nombre)}_${safeText(cotizacion.cliente?.nombre)}.pdf`
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')

  return (
    <PDFDownloadLink
      document={<CotizacionPDF cotizacion={cotizacion} />}
      fileName={fileName}
      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
    >
      {({ blob, url, loading, error }) => {
        if (loading) {
          return (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando PDF...
            </>
          )
        }
        
        if (error) {
          return (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Error al generar
            </>
          )
        }
        
        return (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </>
        )
      }}
    </PDFDownloadLink>
  )
}

export default CotizacionPDF
