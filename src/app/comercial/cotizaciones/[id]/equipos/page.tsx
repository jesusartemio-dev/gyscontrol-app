'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { toast } from 'sonner'

import { updateCotizacion } from '@/lib/services/cotizacion'
import { deleteCotizacionEquipo, updateCotizacionEquipo } from '@/lib/services/cotizacionEquipo'
import { updateCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import { Button } from '@/components/ui/button'
import CotizacionEquipoAccordion from '@/components/cotizaciones/CotizacionEquipoAccordion'
import CotizacionEquipoModal from '@/components/cotizaciones/CotizacionEquipoModal'
import ImportarPlantillaModal from '@/components/cotizaciones/ImportarPlantillaModal'

import { useCotizacionContext } from '../layout'
import type { CotizacionEquipoItem } from '@/types'

export default function CotizacionEquiposPage() {
  const { cotizacion, setCotizacion, refreshCotizacion, isLocked } = useCotizacionContext()
  const [showEquipoModal, setShowEquipoModal] = useState(false)
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

  const actualizarEquipo = (equipoId: string, callback: (items: CotizacionEquipoItem[]) => CotizacionEquipoItem[]) => {
    if (!cotizacion) return
    const equipos = cotizacion.equipos.map(e =>
      e.id === equipoId ? { ...e, items: callback(e.items), ...calcularSubtotal(callback(e.items)) } : e
    )
    const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, equipos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
  }

  const handleEliminarGrupoEquipo = async (id: string) => {
    if (!cotizacion) return
    try {
      await deleteCotizacionEquipo(id)
      const equipos = cotizacion.equipos.filter(e => e.id !== id)
      const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
      setCotizacion({ ...cotizacion, equipos, ...nuevosTotales })
      await updateCotizacion(cotizacion.id, nuevosTotales)
      toast.success('Sección de equipos eliminada')
    } catch (error) {
      console.error('Error al eliminar grupo de equipos:', error)
      toast.error('Error al eliminar la sección')
    }
  }

  const handleActualizarNombreEquipo = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    try {
      await updateCotizacionEquipo(id, { nombre: nuevo })
      setCotizacion({
        ...cotizacion,
        equipos: cotizacion.equipos.map(e => e.id === id ? { ...e, nombre: nuevo } : e)
      })
    } catch (error) {
      console.error('Error al actualizar nombre de equipo:', error)
      toast.error('Error al actualizar el nombre')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Package className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Equipos</h2>
        <span className="text-sm text-muted-foreground">({cotizacion.equipos?.length || 0} grupos)</span>
        <div className="flex-1" />
        {!isLocked && (
          <>
            <Button onClick={() => setShowEquipoModal(true)} size="sm" variant="outline">
              <Package className="h-4 w-4 mr-1" />
              Agregar
            </Button>
            <Button onClick={() => setShowImportModal(true)} size="sm" variant="ghost">
              Importar
            </Button>
          </>
        )}
      </div>

      {/* Contenido */}
      <div key={`equipos-${refreshKey}`} className="space-y-3">
        {cotizacion.equipos.length === 0 ? (
          <div className="flex items-center justify-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No hay equipos en esta cotización</p>
              <p className="text-sm text-muted-foreground">Usa "Agregar" o "Importar" para comenzar.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacion.equipos.map((e) => (
              <CotizacionEquipoAccordion
                key={`${e.id}-${e.items?.length || 0}`}
                equipo={e}
                onCreated={i => actualizarEquipo(e.id, items => [...items, i])}
                onMultipleCreated={newItems => actualizarEquipo(e.id, items => [...items, ...newItems])}
                onUpdated={async (item) => {
                  try {
                    await updateCotizacionEquipoItem(item.id, {
                      cantidad: item.cantidad,
                      costoInterno: item.costoInterno,
                      costoCliente: item.costoCliente
                    })
                    actualizarEquipo(e.id, items => items.map(i => i.id === item.id ? item : i))
                  } catch (error) {
                    console.error('Error al actualizar item de equipo:', error)
                    toast.error('Error al actualizar el item')
                  }
                }}
                onDeleted={id => actualizarEquipo(e.id, items => items.filter(i => i.id !== id))}
                onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)}
                onUpdatedNombre={nuevo => handleActualizarNombreEquipo(e.id, nuevo)}
                isLocked={isLocked}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear nueva sección de equipo */}
      <CotizacionEquipoModal
        open={showEquipoModal}
        onOpenChange={setShowEquipoModal}
        cotizacionId={cotizacion.id}
        onCreated={(nuevoEquipo) => {
          setCotizacion({
            ...cotizacion,
            equipos: [...cotizacion.equipos, { ...nuevoEquipo, items: [] }]
          })
          setShowEquipoModal(false)
        }}
      />

      {/* Modal para importar plantillas */}
      <ImportarPlantillaModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        cotizacionId={cotizacion.id}
        tipo="equipos"
        onSuccess={async () => {
          await refreshCotizacion()
          setRefreshKey(prev => prev + 1)
          setShowImportModal(false)
        }}
      />
    </div>
  )
}
