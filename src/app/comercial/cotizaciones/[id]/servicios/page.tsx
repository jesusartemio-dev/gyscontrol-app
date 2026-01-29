'use client'

import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { updateCotizacion } from '@/lib/services/cotizacion'
import { deleteCotizacionServicio, updateCotizacionServicio } from '@/lib/services/cotizacionServicio'
import { deleteCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import { Button } from '@/components/ui/button'
import CotizacionServicioAccordion from '@/components/cotizaciones/CotizacionServicioAccordion'
import CotizacionServicioCreateModal from '@/components/cotizaciones/CotizacionServicioCreateModal'
import ImportarPlantillaModal from '@/components/cotizaciones/ImportarPlantillaModal'

import { useCotizacionContext } from '../layout'
import type { CotizacionServicioItem } from '@/types'

export default function CotizacionServiciosPage() {
  const { cotizacion, setCotizacion, refreshCotizacion } = useCotizacionContext()
  const [showServicioModal, setShowServicioModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (!cotizacion) return null

  const actualizarTotalesParciales = (equipos: any[], servicios: any[], gastos: any[]) => {
    const subtotalesEquipos = calcularTotal({ equipos, servicios: [], gastos: [] })
    const subtotalesServicios = calcularTotal({ equipos: [], servicios, gastos: [] })
    const subtotalesGastos = calcularTotal({ equipos: [], servicios: [], gastos })

    const totalInterno = subtotalesEquipos.totalInterno + subtotalesServicios.totalInterno + subtotalesGastos.totalInterno
    const totalCliente = subtotalesEquipos.totalCliente + subtotalesServicios.totalCliente + subtotalesGastos.totalCliente

    return {
      totalEquiposInterno: subtotalesEquipos.totalInterno,
      totalEquiposCliente: subtotalesEquipos.totalCliente,
      totalServiciosInterno: subtotalesServicios.totalInterno,
      totalServiciosCliente: subtotalesServicios.totalCliente,
      totalGastosInterno: subtotalesGastos.totalInterno,
      totalGastosCliente: subtotalesGastos.totalCliente,
      totalInterno,
      totalCliente,
      descuento: cotizacion?.descuento ?? 0,
      grandTotal: totalCliente - (cotizacion?.descuento ?? 0)
    }
  }

  const actualizarServicio = (servicioId: string, callback: (items: CotizacionServicioItem[]) => CotizacionServicioItem[]) => {
    if (!cotizacion) return
    const servicios = cotizacion.servicios.map(s => {
      if (s.id !== servicioId) return s
      const newItems = callback(s.items)
      return { ...s, items: newItems, ...calcularSubtotal(newItems) }
    })
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, servicios, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!cotizacion) return
    try {
      await deleteCotizacionServicio(id)
      const servicios = cotizacion.servicios.filter(s => s.id !== id)
      const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
      setCotizacion({ ...cotizacion, servicios, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de servicios eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de servicios:', error)
      toast.error('Error al eliminar la sección')
    }
  }

  const handleActualizarNombreServicio = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionServicio(id, { nombre: nuevo })
      setCotizacion({
        ...cotizacion,
        servicios: cotizacion.servicios.map(s => s.id === id ? { ...s, nombre: nuevo } : s)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de servicio:', error)
      toast.error('Error al actualizar el nombre')
    }
  }

  const handleEliminarItem = async (servicioId: string, itemId: string) => {
    if (!cotizacion) return
    try {
      await deleteCotizacionServicioItem(itemId)
      actualizarServicio(servicioId, items => items.filter(i => i.id !== itemId))
      toast.success('Item eliminado')
    } catch (error) {
      console.error('Error al eliminar item:', error)
      toast.error('Error al eliminar el item')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Wrench className="h-5 w-5 text-green-500" />
        <h2 className="text-lg font-semibold">Servicios</h2>
        <span className="text-sm text-muted-foreground">({cotizacion.servicios?.length || 0} grupos)</span>
        <div className="flex-1" />
        <Button onClick={() => setShowServicioModal(true)} size="sm" variant="outline">
          <Wrench className="h-4 w-4 mr-1" />
          Agregar
        </Button>
        <Button onClick={() => setShowImportModal(true)} size="sm" variant="ghost">
          Importar
        </Button>
      </div>

      {/* Contenido */}
      <div key={`servicios-${refreshKey}`} className="space-y-3">
        {cotizacion.servicios.length === 0 ? (
          <div className="flex items-center justify-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
            <div className="text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No hay servicios en esta cotización</p>
              <p className="text-sm text-muted-foreground">Usa "Agregar" o "Importar" para comenzar.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacion.servicios.map((s) => (
              <CotizacionServicioAccordion
                key={s.id}
                servicio={s}
                onCreated={i => actualizarServicio(s.id, items => [...items, i])}
                onMultipleCreated={newItems => actualizarServicio(s.id, items => [...items, ...newItems])}
                onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))}
                onDeleted={itemId => handleEliminarItem(s.id, itemId)}
                onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)}
                onUpdatedNombre={nuevo => handleActualizarNombreServicio(s.id, nuevo)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear nueva sección de servicio */}
      <CotizacionServicioCreateModal
        cotizacionId={cotizacion.id}
        isOpen={showServicioModal}
        onClose={() => setShowServicioModal(false)}
        onCreated={(servicio) => {
          setCotizacion({
            ...cotizacion,
            servicios: [...cotizacion.servicios, { ...servicio, items: [] }]
          })
          setShowServicioModal(false)
        }}
      />

      {/* Modal para importar plantillas */}
      <ImportarPlantillaModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        cotizacionId={cotizacion.id}
        tipo="servicios"
        onSuccess={async () => {
          await refreshCotizacion()
          setRefreshKey(prev => prev + 1)
          setShowImportModal(false)
        }}
      />
    </div>
  )
}
