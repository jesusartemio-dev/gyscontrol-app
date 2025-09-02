'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCotizacionById } from '@/lib/services/cotizacion'
import dynamic from 'next/dynamic'
import type { Cotizacion } from '@/types'

// 📦 Cargar dinámicamente el visor y el PDF (evita errores de SSR)
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFViewer })),
  { ssr: false }
)

const CotizacionPDF = dynamic(
  () => import('@/components/pdf/CotizacionPDF').then(mod => mod.default),
  { ssr: false }
)

export default function CotizacionPDFPage() {
  const { id } = useParams()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof id === 'string') {
      getCotizacionById(id)
        .then(setCotizacion)
        .catch(() => setError('Error al cargar cotización'))
    }
  }, [id])

  if (error) return <p className="text-red-500">{error}</p>
  if (!cotizacion) return <p className="text-gray-500">Cargando cotización...</p>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Vista previa del PDF</h1>
      <div className="border rounded shadow overflow-hidden h-[85vh]">
        <PDFViewer width="100%" height="100%">
          <CotizacionPDF cotizacion={cotizacion} />
        </PDFViewer>
      </div>
    </div>
  )
}
