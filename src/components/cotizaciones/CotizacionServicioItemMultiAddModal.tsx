// ===================================================
// 📁 Archivo: CotizacionServicioItemMultiAddModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para agregar múltiples items de servicio desde catálogo a una sección de cotización
//
// 🧠 Uso: Permite seleccionar múltiples servicios del catálogo y agregarlos a una sección de cotización
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-10-03
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Trash2, Package, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getCatalogoServicios } from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import { calcularHoras } from '@/lib/utils/formulas'
import type { CatalogoServicio, Edt, Recurso, UnidadServicio, CotizacionServicioItem, CotizacionServicioItemPayload } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    nombre: string
    edtId?: string
    edt?: { id: string; nombre: string }
  }
  onItemsCreated: (items: CotizacionServicioItem[]) => void
}

interface SelectedServicio {
  servicio: CatalogoServicio
  cantidad: number
  precioInterno: number
  precioCliente: number
  recursoId: string
  unidadServicioId: string
}

export default function CotizacionServicioItemMultiAddModal({
  isOpen,
  onClose,
  servicio,
  onItemsCreated
}: Props) {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [categorias, setCategorias] = useState<Edt[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidadesServicio, setUnidadesServicio] = useState<UnidadServicio[]>([])
  const [filteredServicios, setFilteredServicios] = useState<CatalogoServicio[]>([])
  const [selectedServicios, setSelectedServicios] = useState<SelectedServicio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ Load servicios and related data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // ✅ Filter servicios based on search term and service's EDT
  useEffect(() => {
    let filtered = servicios

    // Filter by service's EDT
    const edtNombre = servicio.edt?.nombre || servicio.nombre
    if (edtNombre) {
      const edtEncontrado = categorias.find(c => c.nombre === edtNombre)
      if (edtEncontrado) {
        filtered = filtered.filter(s => s.categoriaId === edtEncontrado.id)
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(s =>
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredServicios(filtered)
  }, [searchTerm, servicios, categorias, servicio.edt?.nombre, servicio.nombre])

  const loadData = async () => {
    setLoading(true)
    try {
      const [serviciosData, categoriasData, recursosData, unidadesData] = await Promise.all([
        getCatalogoServicios(),
        getEdts(),
        getRecursos(),
        getUnidadesServicio()
      ])

      setServicios(serviciosData)
      setCategorias(categoriasData)
      setRecursos(recursosData)
      setUnidadesServicio(unidadesData)
      setFilteredServicios(serviciosData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Add servicio to selection
  const handleAddServicio = (servicio: CatalogoServicio) => {
    const existingIndex = selectedServicios.findIndex(item => item.servicio.id === servicio.id)

    if (existingIndex >= 0) {
      // If already selected, increase quantity
      const updated = [...selectedServicios]
      updated[existingIndex].cantidad += 1
      setSelectedServicios(updated)
    } else {
      // Add new selection with default values
      const validRecursos = recursos.filter(r => r && r.id)
      const validUnidades = unidadesServicio.filter(u => u && u.id)
      const defaultRecurso = validRecursos.find(r => r.nombre === 'Ingeniero Senior') || validRecursos[0]
      const defaultUnidad = validUnidades.find(u => u.nombre === 'hora') || validUnidades[0]

      // Calculate default prices using the same logic
      const cantidad = 1
      const horaTotal = calcularHoras({
        formula: servicio.formula,
        cantidad,
        horaBase: servicio.horaBase,
        horaRepetido: servicio.horaRepetido,
        horaUnidad: servicio.horaUnidad,
        horaFijo: servicio.horaFijo
      })

      // Get costoHora from servicio.recurso OR look it up from recursos array
      const servicioRecurso = servicio.recurso || validRecursos.find(r => r.id === servicio.recursoId)
      const costoHora = servicioRecurso?.costoHora || defaultRecurso?.costoHora || 0
      const factorSeguridad = 1.0
      const margen = 1.35
      const calculatedCostoInterno = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
      const calculatedPrecioCliente = +(calculatedCostoInterno * margen).toFixed(2)

      const newItem = {
         servicio,
         cantidad: 1,
         precioInterno: calculatedCostoInterno,
         precioCliente: calculatedPrecioCliente,
         recursoId: defaultRecurso?.id || '',
         unidadServicioId: defaultUnidad?.id || ''
       }

      setSelectedServicios(prev => [...prev, newItem])
    }
  }

  // ✅ Update quantity for selected servicio
  const handleUpdateQuantity = (servicioId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSelectedServicios(prev => prev.filter(item => item.servicio.id !== servicioId))
    } else {
      setSelectedServicios(prev => prev.map(item =>
        item.servicio.id === servicioId
          ? { ...item, cantidad: newQuantity }
          : item
      ))
    }
  }

  // ✅ Update unit price for selected servicio
  const handleUpdatePrice = (servicioId: string, field: 'precioInterno' | 'precioCliente', newPrice: number) => {
    setSelectedServicios(prev => prev.map(item =>
      item.servicio.id === servicioId
        ? { ...item, [field]: newPrice }
        : item
    ))
  }

  // ✅ Update resource for selected servicio
  const handleUpdateRecurso = (servicioId: string, recursoId: string) => {
    setSelectedServicios(prev => prev.map(item =>
      item.servicio.id === servicioId
        ? { ...item, recursoId }
        : item
    ))
  }

  // ✅ Update service unit for selected servicio
  const handleUpdateUnidad = (servicioId: string, unidadServicioId: string) => {
    setSelectedServicios(prev => prev.map(item =>
      item.servicio.id === servicioId
        ? { ...item, unidadServicioId }
        : item
    ))
  }

  // ✅ Remove servicio from selection
  const handleRemoveServicio = (servicioId: string) => {
    setSelectedServicios(prev => prev.filter(item => item.servicio.id !== servicioId))
  }

  // ✅ Calculate total amount
  const totalAmount = selectedServicios.reduce((sum, item) =>
    sum + (item.cantidad * item.precioCliente), 0
  )

  // ✅ Save selected servicios as cotizacion servicio items
  const handleSave = async () => {
    if (selectedServicios.length === 0) {
      toast.error('Selecciona al menos un servicio')
      return
    }

    // Validate that all services have required fields
    const invalidItems = selectedServicios.filter(item =>
      !item.recursoId || !item.unidadServicioId
    )

    if (invalidItems.length > 0) {
      toast.error('Todos los servicios deben tener recurso y unidad asignados')
      return
    }

    setLoading(true)
    try {
      const createdItems: CotizacionServicioItem[] = []

      for (const selectedServicio of selectedServicios) {
        const horaTotal = calcularHoras({
          formula: selectedServicio.servicio.formula,
          cantidad: selectedServicio.cantidad,
          horaBase: selectedServicio.servicio.horaBase,
          horaRepetido: selectedServicio.servicio.horaRepetido,
          horaUnidad: selectedServicio.servicio.horaUnidad,
          horaFijo: selectedServicio.servicio.horaFijo
        })

        const payload: CotizacionServicioItemPayload = {
          cotizacionServicioId: servicio.id,
          catalogoServicioId: selectedServicio.servicio.id,
          nombre: selectedServicio.servicio.nombre,
          descripcion: selectedServicio.servicio.descripcion,
          edtId: selectedServicio.servicio.edt?.id || selectedServicio.servicio.categoriaId,
          unidadServicioId: selectedServicio.unidadServicioId,
          unidadServicioNombre: unidadesServicio.find(u => u.id === selectedServicio.unidadServicioId)?.nombre || '',
          recursoId: selectedServicio.recursoId,
          recursoNombre: recursos.find(r => r.id === selectedServicio.recursoId)?.nombre || '',
          formula: 'Escalonada',
          horaBase: selectedServicio.servicio.horaBase,
          horaRepetido: selectedServicio.servicio.horaRepetido,
          horaUnidad: undefined,
          horaFijo: undefined,
          costoHora: selectedServicio.servicio.recurso?.costoHora || 0,
          cantidad: selectedServicio.cantidad,
          horaTotal,
          factorSeguridad: 1.0,
          margen: 1.35,
          costoInterno: selectedServicio.precioInterno,
          costoCliente: selectedServicio.precioCliente
        }

        const createdItem = await createCotizacionServicioItem(payload)
        createdItems.push(createdItem)
      }

      toast.success(`${createdItems.length} servicio(s) agregado(s)`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error saving items:', error)
      toast.error('Error al guardar los servicios')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Close modal and reset state
  const handleClose = () => {
    setSelectedServicios([])
    setSearchTerm('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Agregar Servicios - {servicio.edt?.nombre || servicio.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Búsqueda */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-48">
            <div className="flex items-center justify-center h-10 px-3 bg-blue-50 border border-blue-200 rounded-md">
              <span className="text-sm text-blue-700 font-medium">
                {servicio.edt?.nombre || servicio.nombre}
              </span>
            </div>
          </div>
        </div>

        {/* Layout de Dos Columnas Lado a Lado */}
        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Columna Izquierda - Servicios Disponibles */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium text-gray-900">Servicios Disponibles</h3>
              <Badge variant="outline" className="text-xs">
                {filteredServicios.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando servicios...</span>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredServicios.map(servicio => {
                    const isSelected = selectedServicios.some(item => item.servicio.id === servicio.id)

                    return (
                      <motion.div
                        key={servicio.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          className={`p-3 border rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 opacity-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => !isSelected && handleAddServicio(servicio)}
                        >
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm">{servicio.nombre}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{servicio.descripcion}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{servicio.edt?.nombre || 'Sin EDT'}</span>
                              <span className="text-gray-500">{servicio.formula}</span>
                            </div>
                            {isSelected && (
                              <div className="text-blue-600 text-xs font-medium">
                                ✓ Seleccionado
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}

              {filteredServicios.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No se encontraron servicios</p>
                  <p className="text-xs text-gray-400">Ajusta los filtros de búsqueda</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha - Servicios Seleccionados */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium text-gray-900">Servicios Seleccionados</h3>
              <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                {selectedServicios.length}
              </Badge>
            </div>

            {selectedServicios.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {selectedServicios.map((item) => (
                  <div key={item.servicio.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-medium text-sm text-blue-900">{item.servicio.nombre}</h4>
                        <p className="text-xs text-blue-700 line-clamp-2">{item.servicio.descripcion}</p>

                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium">Cantidad:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateQuantity(item.servicio.id!, parseInt(e.target.value) || 1)}
                                className="w-16 h-7 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium">Precio Int:</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioInterno.toString()}
                                onChange={(e) => handleUpdatePrice(item.servicio.id!, 'precioInterno', parseFloat(e.target.value) || 0)}
                                className="w-24 h-7 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium">Precio Cli:</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioCliente.toString()}
                                onChange={(e) => handleUpdatePrice(item.servicio.id!, 'precioCliente', parseFloat(e.target.value) || 0)}
                                className="w-24 h-7 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-medium text-green-600">
                                Total: {formatCurrency(item.cantidad * item.precioCliente)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Recurso:</Label>
                            <Select
                              value={item.recursoId}
                              onValueChange={(value) => handleUpdateRecurso(item.servicio.id!, value)}
                            >
                              <SelectTrigger className="w-32 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {recursos.filter(r => r && r.id).map(recurso => (
                                  <SelectItem key={recurso.id} value={recurso.id!}>
                                    {recurso.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Unidad:</Label>
                            <Select
                              value={item.unidadServicioId}
                              onValueChange={(value) => handleUpdateUnidad(item.servicio.id!, value)}
                            >
                              <SelectTrigger className="w-24 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unidadesServicio.filter(u => u && u.id).map(unidad => (
                                  <SelectItem key={unidad.id} value={unidad.id!}>
                                    {unidad.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveServicio(item.servicio.id!)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 ml-2 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Selecciona servicios de la lista</p>
                  <p className="text-xs mt-1">Haz clic en cualquier servicio</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center w-full pt-3 border-t bg-white">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              {selectedServicios.length > 0 && `${selectedServicios.length} servicio${selectedServicios.length > 1 ? 's' : ''} seleccionado${selectedServicios.length > 1 ? 's' : ''}`}
            </div>
            {selectedServicios.length > 0 && (
              <div className="text-sm font-bold text-blue-600">
                Total: {formatCurrency(totalAmount)}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="h-9 px-4">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedServicios.length === 0 || loading}
              className="h-9 px-6 bg-blue-600 hover:bg-blue-700 min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-2 h-3 w-3" />
              )}
              {loading ? 'Guardando...' : `Agregar (${selectedServicios.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}