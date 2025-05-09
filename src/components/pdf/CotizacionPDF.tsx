'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink
} from '@react-pdf/renderer'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5
  },
  header: { marginBottom: 20, textAlign: 'center' },
  empresa: { fontSize: 18, fontWeight: 'bold', color: '#1a202c' },
  subHeader: { fontSize: 12, marginTop: 4 },
  seccionTitulo: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
    paddingBottom: 4
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    paddingVertical: 4,
    fontWeight: 'bold'
  },
  tablaRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: '0.5px solid #ccc'
  },
  celda: { flex: 1, paddingHorizontal: 4 },
  total: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right'
  },
  condiciones: { marginTop: 25, fontSize: 10, color: '#555' },
  footer: { marginTop: 30, fontSize: 10, textAlign: 'center', color: '#888' }
})

const safeText = (value: any) => {
  if (value === null || value === undefined) return '-'
  return String(value)
}

const CotizacionPDF = ({ cotizacion }: Props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.empresa}>GYS Control Industrial</Text>
        <Text style={styles.subHeader}>Cotización: {safeText(cotizacion.nombre)}</Text>
        <Text style={styles.subHeader}>Cliente: {safeText(cotizacion.cliente?.nombre)}</Text>
        <Text style={styles.subHeader}>Fecha: {new Date(cotizacion.createdAt).toLocaleDateString()}</Text>
      </View>

      <Text style={styles.seccionTitulo}>Resumen Económico</Text>
      <View style={styles.tablaHeader}>
        <Text style={[styles.celda, { flex: 3 }]}>Descripción</Text>
        <Text style={styles.celda}>Cantidad</Text>
        <Text style={styles.celda}>Total (S/)</Text>
      </View>

      {cotizacion.equipos?.flatMap(equipo =>
        equipo.items.map(item => (
          <View key={item.id} style={styles.tablaRow}>
            <Text style={[styles.celda, { flex: 3 }]}>
              {safeText(item.codigo)} - {safeText(item.descripcion)}
            </Text>
            <Text style={styles.celda}>{item.cantidad ?? 1}</Text>
            <Text style={styles.celda}>{item.costoCliente?.toFixed(2) ?? '0.00'}</Text>
          </View>
        ))
      )}

      {cotizacion.servicios?.flatMap(servicio =>
        servicio.items.map(item => (
          <View key={item.id} style={styles.tablaRow}>
            <Text style={[styles.celda, { flex: 3 }]}>
              {safeText(item.nombre)} - {safeText(item.descripcion)}
            </Text>
            <Text style={styles.celda}>{item.cantidad ?? 1}</Text>
            <Text style={styles.celda}>{item.costoCliente?.toFixed(2) ?? '0.00'}</Text>
          </View>
        ))
      )}

      <Text style={styles.total}>
        Total Cliente: S/ {cotizacion.totalCliente?.toFixed(2) ?? '0.00'}
      </Text>

      <Text style={styles.seccionTitulo}>Condiciones Comerciales</Text>
      <View style={styles.condiciones}>
        <Text>• Forma de Pago: Por confirmar.</Text>
        <Text>• Tiempo de Entrega: Según stock.</Text>
        <Text>• Validez de la oferta: 15 días.</Text>
        <Text>• Precios no incluyen IGV.</Text>
      </View>

      <Text style={styles.seccionTitulo}>Propuesta Técnica / Alcances</Text>
      <View style={{ fontSize: 10, color: '#333' }}>
        <Text>- Suministro de materiales y servicios indicados.</Text>
        <Text>- Asesoría técnica básica para instalación.</Text>
      </View>

      <Text style={styles.seccionTitulo}>Exclusiones y Consideraciones</Text>
      <View style={{ fontSize: 10, color: '#333' }}>
        <Text>• No incluye instalación.</Text>
        <Text>• No incluye servicios no descritos.</Text>
        <Text>• No se incluyen licencias especiales.</Text>
      </View>

      <Text style={styles.footer}>
        Gracias por confiar en GYS Control Industrial.
      </Text>
    </Page>
  </Document>
)

export const DescargarPDFButton = ({ cotizacion }: Props) => {
  const puedeGenerarPDF =
    cotizacion &&
    cotizacion.cliente &&
    Array.isArray(cotizacion.equipos) &&
    Array.isArray(cotizacion.servicios) &&
    cotizacion.equipos.every(e => Array.isArray(e.items)) &&
    cotizacion.servicios.every(s => Array.isArray(s.items))

  if (!puedeGenerarPDF) return null

  return (
    <PDFDownloadLink
      document={<CotizacionPDF cotizacion={cotizacion} />}
      fileName={`cotizacion-${cotizacion.id}.pdf`}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '📄 Descargar Cotización')}
    </PDFDownloadLink>
  )
}

export default CotizacionPDF
