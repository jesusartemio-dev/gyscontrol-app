// ===================================================
// 📁 Archivo: PlantillaServicioItemsModal.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Descripción: Modal para agregar items desde catálogo a una sección de servicios
// 🧠 Uso: Reemplaza la página de selección, mostrando items de la categoría del servicio
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'
import { createPlantillaServicioItem } from '@/lib/services/plantillaServicioItem'
import { recalcularPlantillaDesdeAPI } from '@/lib/services/plantilla'
import { calcularHoras } from '@/lib/utils/formulas'
import type { CatalogoServicio, PlantillaServicioItem } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Package } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  plantillaId: string
  plantillaServicioId: string
  categoriaNombre: string
  onCreated: (items: PlantillaServicioItem[]) => void // ✅ Changed to accept array of items
}

export default function PlantillaServicioItemsModal({
  open,
  onClose,
  plantillaId,
  plantillaServicioId,
  categoriaNombre,
  onCreated
}: Props) {
  const [catalogo, setCatalogo] = useState<CatalogoServicio[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  // ✅ Load catalog items when modal opens
  useEffect(() => {
    if (open && categoriaNombre) {
      const loadCatalogo = async () => {
        try {
          setLoading(true)
          
          // Get all categories to find the ID by name
          const categorias = await getEdts()
          const categoria = categorias.find(c => c.nombre === categoriaNombre)
          
          if (!categoria) {
            throw new Error(`Categoría '${categoriaNombre}' no encontrada`)
          }
          
          // Get catalog items by category ID
          const items = await getCatalogoServiciosByCategoriaId(categoria.id)
          setCatalogo(items)
        } catch (error) {
          console.error('❌ Error loading catalog items:', error)
          toast.error('Error al cargar servicios del catálogo')
          setCatalogo([])
        } finally {
          setLoading(false)
        }
      }
      
      loadCatalogo()
    }
  }, [open, categoriaNombre])

  // ✅ Handle item selection toggle
  const handleToggleSelection = (servicioId: string) => {
    setSeleccionados(prev => ({
      ...prev,
      [servicioId]: !prev[servicioId]
    }))
    
    // 🔁 Set default quantity when selecting
    if (!seleccionados[servicioId]) {
      setCantidades(prev => ({
        ...prev,
        [servicioId]: prev[servicioId] || 1
      }))
    }
  }

  // ✅ Handle quantity change
  const handleQuantityChange = (servicioId: string, cantidad: number) => {
    setCantidades(prev => ({
      ...prev,
      [servicioId]: Math.max(1, cantidad)
    }))
  }

  // ✅ Handle adding selected items
  const handleAgregar = async () => {
    const itemsSeleccionados = catalogo.filter(s => seleccionados[s.id])
    
    if (itemsSeleccionados.length === 0) {
      toast.error('Selecciona al menos un servicio')
      return
    }

    setSubmitting(true)
    
    try {
      const nuevosItems: PlantillaServicioItem[] = []
      
      for (const servicio of itemsSeleccionados) {
        const cantidad = cantidades[servicio.id] || 1
        const horas = calcularHoras({
          formula: servicio.formula,
          cantidad,
          horaBase: servicio.horaBase,
          horaRepetido: servicio.horaRepetido,
          horaUnidad: servicio.horaUnidad,
          horaFijo: servicio.horaFijo
        })

        const payload = {
          plantillaServicioId,
          catalogoServicioId: servicio.id,
          unidadServicioId: servicio.unidadServicio.id,
          recursoId: servicio.recurso.id,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          categoria: servicio.categoria.nombre,
          formula: servicio.formula,
          horaBase: servicio.horaBase,
          horaRepetido: servicio.horaRepetido,
          horaUnidad: servicio.horaUnidad,
          horaFijo: servicio.horaFijo,
          unidadServicioNombre: servicio.unidadServicio.nombre,
          recursoNombre: servicio.recurso.nombre,
          costoHora: servicio.recurso.costoHora,
          cantidad,
          horaTotal: horas,
          factorSeguridad: 1.0,
          costoInterno: horas * servicio.recurso.costoHora,
          margen: 1.35,
          costoCliente: horas * servicio.recurso.costoHora * 1.35
        }

        const nuevoItem = await createPlantillaServicioItem(payload)
        nuevosItems.push(nuevoItem)
      }

      // 📡 Recalculate template totals
      await recalcularPlantillaDesdeAPI(plantillaId)
      
      // 🔁 Notify parent components - Pass all items at once for batch update
      onCreated(nuevosItems)
      
      toast.success(`${nuevosItems.length} servicio${nuevosItems.length !== 1 ? 's' : ''} agregado${nuevosItems.length !== 1 ? 's' : ''} correctamente ✅`)
      onClose()
      
    } catch (error) {
      console.error('❌ Error adding services:', error)
      toast.error('Error al agregar servicios')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCount = Object.values(seleccionados).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Items desde Catálogo
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{categoriaNombre}</Badge>
              <span>•</span>
              <span>{catalogo.length} servicios disponibles</span>
              {selectedCount > 0 && (
                <>
                  <span>•</span>
                  <Badge variant="secondary">{selectedCount} seleccionados</Badge>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-muted-foreground">Cargando servicios...</span>
            </div>
          ) : catalogo.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay servicios disponibles
              </h3>
              <p className="text-muted-foreground">
                No se encontraron servicios en la categoría {categoriaNombre}
              </p>
            </div>
          ) : (
            <>
              {/* Services Table with Scroll */}
              <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-700">Seleccionar</th>
                      <th className="p-3 text-left font-medium text-gray-700">Servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogo.map((servicio) => {
                      const isSelected = seleccionados[servicio.id] || false
                      const cantidad = cantidades[servicio.id] || 1
                      
                      return (
                        <tr 
                          key={servicio.id} 
                          className={`border-b hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelection(servicio.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{servicio.nombre}</div>
                              <div className="text-sm text-gray-600 leading-relaxed">
                                {servicio.descripcion || 'Sin descripción'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons - Always Visible */}
              <div className="flex justify-between items-center pt-4 border-t bg-white flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  {selectedCount > 0 ? (
                    `${selectedCount} servicio${selectedCount !== 1 ? 's' : ''} seleccionado${selectedCount !== 1 ? 's' : ''}`
                  ) : (
                    'Selecciona los servicios que deseas agregar'
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAgregar} 
                    disabled={selectedCount === 0 || submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Agregando...
                      </>
                    ) : (
                      `Agregar ${selectedCount > 0 ? selectedCount : ''} Servicio${selectedCount !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>
    )
}