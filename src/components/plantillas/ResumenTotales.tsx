// ===================================================
// 📁 Archivo: CotizacionPDF.tsx
// 📌 Ubicación: src/components/pdf/
// 🔧 Descripción: Componente PDF para mostrar una cotización completa
// 🧠 Uso: Exportación en PDF de cotizaciones con estructura detallada
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

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
    lineHeight: 1.4
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #000',
    paddingBottom: 10
  },
  empresa: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a202c'
  },
  datosCotizacion: {
    marginBottom: 20
  },
  seccionTitulo: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
    paddingBottom: 4
  },
  tabla: {
    marginBottom: 12
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottom: '0.5px solid #eee'
  },
  bold: {
    fontWeight: 'bold'
  },
  total: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right'
  },
  condiciones: {
    marginTop: 25,
    fontSize: 10,
    color: '#555'
  },
  footer: {
    marginTop: 30,
    fontSize: 10,
    textAlign: 'center',
    color: '#888'
  }
})

const CotizacionPDF = ({ cotizacion }: Props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.empresa}>GYS Control Industrial</Text>
        <Text>RUC: 12345678901</Text>
        <Text>Dirección: Lima, Perú</Text>
        <Text>Teléfono: +51 999 999 999</Text>
      </View>

      {/* Datos generales */}
      <View style={styles.datosCotizacion}>
        <Text style={styles.bold}>Cotización: {cotizacion.nombre}</Text>
        <Text>Cliente: {cotizacion.cliente?.nombre ?? '-'}</Text>
        <Text>Fecha: {new Date(cotizacion.createdAt).toLocaleDateString()}</Text>
      </View>

      {/* Equipos */}
      <Text style={styles.seccionTitulo}>🧰 Equipos</Text>
      {cotizacion.equipos.map(e => (
        <View key={e.id} style={styles.tabla}>
          <Text style={styles.bold}>{e.nombre}</Text>
          {e.items.map(i => (
            <View key={i.id} style={styles.fila}>
              <Text>{i.nombre}</Text>
              <Text>S/ {i.costoCliente.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Servicios */}
      <Text style={styles.seccionTitulo}>🛠️ Servicios</Text>
      {cotizacion.servicios.map(s => (
        <View key={s.id} style={styles.tabla}>
          <Text style={styles.bold}>{s.categoria}</Text>
          {s.items.map(i => (
            <View key={i.id} style={styles.fila}>
              <Text>{i.nombre} • {i.descripcion}</Text>
              <Text>S/ {i.costoCliente.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Total */}
      <Text style={styles.total}>
        Total Cliente: S/ {cotizacion.totalCliente.toFixed(2)}
      </Text>

      {/* Condiciones */}
      <View style={styles.condiciones}>
        <Text style={styles.bold}>Términos y Condiciones:</Text>
        <Text>• Esta cotización tiene una validez de 15 días.</Text>
        <Text>• Los precios están sujetos a disponibilidad de stock.</Text>
        <Text>• El tiempo de entrega se confirmará al emitir la orden de compra.</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Gracias por confiar en nosotros.
      </Text>
    </Page>
  </Document>
)

export const DescargarPDFButton = ({ cotizacion }: Props) => (
  <div className="flex gap-4">
    <PDFDownloadLink
      document={<CotizacionPDF cotizacion={cotizacion} />}
      fileName={`cotizacion-${cotizacion.id}.pdf`}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '📄 Descargar Cotización')}
    </PDFDownloadLink>
  </div>
)

export default CotizacionPDF
