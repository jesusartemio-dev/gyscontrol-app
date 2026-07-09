'use client'

import { useParams } from 'next/navigation'
import CotizacionDocumentoPanel from './_components/CotizacionDocumentoPanel'

export default function CotizacionProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Cotización</h1>
        <p className="text-muted-foreground text-sm">
          Propuesta económica origen del proyecto y verificación de totales contra los costos reales.
        </p>
      </div>

      <CotizacionDocumentoPanel proyectoId={proyectoId} />
    </div>
  )
}
