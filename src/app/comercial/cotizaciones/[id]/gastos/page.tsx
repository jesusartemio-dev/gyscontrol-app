'use client'

import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { toast } from 'sonner'

import { updateCotizacion } from '@/lib/services/cotizacion'
import { deleteCotizacionGasto, updateCotizacionGasto } from '@/lib/services/cotizacionGasto'
import { deleteCotizacionGastoItem, updateCotizacionGastoItem } from '@/lib/services/cotizacionGastoItem'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import { Button } from '@/components/ui/button'
import CotizacionGastoAccordion from '@/components/cotizaciones/CotizacionGastoAccordion'
import CotizacionGastoModal from '@/components/cotizaciones/CotizacionGastoModal'
import ImportarPlantillaModal from '@/components/cotizaciones/ImportarPlantillaModal'

import { useCotizacionContext } from '../cotizacion-context'
import type { CotizacionGastoItem } from '@/types'

export default function CotizacionGastosPage() {
  const { cotizacion, setCotizacion, refreshCotizacion, isLocked } = useCotizacionContext()
  const [showGastoModal, setShowGastoModal] = useState(false)
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

  const actualizarGasto = (gastoId: string, callback: (items: CotizacionGastoItem[]) => CotizacionGastoItem[]) => {
    if (!cotizacion) return
    const gastos = cotizacion.gastos.map(g =>
      g.id === gastoId ? { ...g, items: callback(g.items), ...calcularSubtotal(callback(g.items)) } : g
    )
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
    setCotizacion({ ...cotizacion, gastos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!cotizacion) return
    try {
      await deleteCotizacionGasto(id)
      const gastos = cotizacion.gastos.filter(g => g.id !== id)
      const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
      setCotizacion({ ...cotizacion, gastos, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de gastos eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de gastos:', error)
      toast.error('Error al eliminar la sección')
    }
  }

  const handleActualizarNombreGasto = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionGasto(id, { nombre: nuevo })
      setCotizacion({
        ...cotizacion,
        gastos: cotizacion.gastos.map(g => g.id === id ? { ...g, nombre: nuevo } : g)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de gasto:', error)
      toast.error('Error al actualizar el nombre')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Receipt className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Gastos</h2>
        <span className="text-sm text-muted-foreground">({cotizacion.gastos?.length || 0} grupos)</span>
        <div className="flex-1" />
        {!isLocked && (
          <>
            <Button onClick={() => setShowGastoModal(true)} size="sm" variant="outline">
              <Receipt className="h-4 w-4 mr-1" />
              Agregar
            </Button>
            <Button onClick={() => setShowImportModal(true)} size="sm" variant="ghost">
              Importar
            </Button>
          </>
        )}
      </div>

      {/* Contenido */}
      <div key={`gastos-${refreshKey}`} className="space-y-3">
        {cotizacion.gastos.length === 0 ? (
          <div className="flex items-center justify-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No hay gastos en esta cotización</p>
              <p className="text-sm text-muted-foreground">Usa "Agregar" o "Importar" para comenzar.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacion.gastos.map((g) => (
              <CotizacionGastoAccordion
                key={g.id}
                gasto={g}
                onCreated={i => actualizarGasto(g.id, items => [...items, i])}
                onUpdated={async (item) => {
                  try {
                    await updateCotizacionGastoItem(item.id, {
                      nombre: item.nombre,
                      descripcion: item.descripcion || '',
                      cantidad: item.cantidad,
                      precioUnitario: item.precioUnitario,
                      factorSeguridad: item.factorSeguridad,
                      margen: item.margen,
                      costoInterno: item.costoInterno,
                      costoCliente: item.costoCliente,
                    })
                    actualizarGasto(g.id, items => items.map(i => i.id === item.id ? item : i))
                  } catch (error) {
                    console.error('Error al actualizar item de gasto:', error)
                    toast.error('Error al actualizar el item')
                  }
                }}
                onDeleted={async (id) => {
                  try {
                    await deleteCotizacionGastoItem(id)
                    actualizarGasto(g.id, items => items.filter(i => i.id !== id))
                  } catch (error) {
                    console.error('Error al eliminar item de gasto:', error)
                    toast.error('Error al eliminar el item')
                  }
                }}
                onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)}
                onUpdatedNombre={nuevo => handleActualizarNombreGasto(g.id, nuevo)}
                isLocked={isLocked}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear nueva sección de gasto */}
      <CotizacionGastoModal
        open={showGastoModal}
        onOpenChange={setShowGastoModal}
        cotizacionId={cotizacion.id}
        onCreated={(nuevoGasto) => {
          setCotizacion({
            ...cotizacion,
            gastos: [...cotizacion.gastos, { ...nuevoGasto, items: [] }]
          })
          setShowGastoModal(false)
        }}
      />

      {/* Modal para importar plantillas */}
      <ImportarPlantillaModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        cotizacionId={cotizacion.id}
        tipo="gastos"
        onSuccess={async () => {
          await refreshCotizacion()
          setRefreshKey(prev => prev + 1)
          setShowImportModal(false)
        }}
      />
    </div>
  )
}
