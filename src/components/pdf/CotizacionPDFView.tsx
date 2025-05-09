'use client'

import { PDFViewer } from '@react-pdf/renderer'
import CotizacionPDF from './CotizacionPDF'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
}

export default function CotizacionPDFView({ cotizacion }: Props) {
  return (
    <div className="h-screen">
      <PDFViewer style={{ width: '100%', height: '100%' }}>
        <CotizacionPDF cotizacion={cotizacion} />
      </PDFViewer>
    </div>
  )
}
