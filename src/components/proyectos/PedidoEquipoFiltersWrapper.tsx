'use client'

import { useRouter } from 'next/navigation'
import { PedidoEquipoFilters } from '@/components/finanzas/aprovisionamiento/PedidoEquipoFilters'
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento'

interface PedidoEquipoFiltersWrapperProps {
  filtros: FiltrosPedidoEquipo
}

export function PedidoEquipoFiltersWrapper({ filtros }: PedidoEquipoFiltersWrapperProps) {
  const router = useRouter()

  const handleFiltrosChange = (newFiltros: FiltrosPedidoEquipo) => {
    // 📡 Construir nueva URL con filtros para proyectos/equipos
    const params = new URLSearchParams()
    if (newFiltros.proyectoId) params.set('proyecto', newFiltros.proyectoId)
    if (newFiltros.proveedorId) params.set('proveedor', newFiltros.proveedorId)
    if (newFiltros.estado) params.set('estado', newFiltros.estado)
    if (newFiltros.fechaCreacion?.from) params.set('fechaInicio', newFiltros.fechaCreacion.from.toISOString().split('T')[0])
    if (newFiltros.fechaCreacion?.to) params.set('fechaFin', newFiltros.fechaCreacion.to.toISOString().split('T')[0])
    if (newFiltros.montoMinimo) params.set('montoMin', newFiltros.montoMinimo.toString())
    if (newFiltros.montoMaximo) params.set('montoMax', newFiltros.montoMaximo.toString())
    if (newFiltros.coherenciaMinima) params.set('coherencia', 'true')
    
    // 🔁 Navegar con nuevos parámetros a la página de proyectos/equipos
    router.push(`/proyectos/equipos?${params.toString()}`)
  }

  return (
    <PedidoEquipoFilters
      filtros={filtros}
      onFiltrosChange={handleFiltrosChange}
    />
  )
}
