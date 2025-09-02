'use client'

import dynamic from 'next/dynamic'
import CotizacionPDF from './CotizacionPDF'
import type { Cotizacion } from '@/types'

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFViewer })),
  { ssr: false }
)

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
