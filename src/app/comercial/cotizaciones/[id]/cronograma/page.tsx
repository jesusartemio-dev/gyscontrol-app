'use client'

import { CronogramaComercialTab } from '@/components/comercial/cronograma/CronogramaComercialTab'
import { useCotizacionContext } from '../layout'

export default function CotizacionCronogramaPage() {
  const { cotizacion } = useCotizacionContext()

  if (!cotizacion) return null

  // Renderiza directamente el componente - sin breadcrumb ni título duplicados
  // El componente CronogramaComercialTab ya tiene su propio header con controles
  return (
    <CronogramaComercialTab
      cotizacionId={cotizacion.id}
      cotizacionCodigo={cotizacion.codigo || 'Sin código'}
    />
  )
}
