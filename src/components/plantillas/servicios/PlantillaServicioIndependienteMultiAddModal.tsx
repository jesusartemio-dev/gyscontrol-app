'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Package, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getCatalogoServicios } from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import type { CatalogoServicio, Edt, Recurso, UnidadServicio } from '@/types'

// Define the missing types
interface PlantillaServicioItemIndependiente {
  id: string
  plantillaServicioId: string
  catalogoServicioId?: string
  nombre: string
  descripcion: string
  edtId?: string
  edt?: { id: string; nombre: string }
  unidadServicioNombre: string
  recursoNombre: string
  formula: string
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  plantillaId: string
  edtId?: string // Prop opcional para filtrar por EDT
  onItemsCreated: (items: PlantillaServicioItemIndependiente[]) => void
}

interface SelectedServicio {
  servicio: CatalogoServicio
  cantidad: number
  precioInterno: number
  precioCliente: number
  recursoId: string
  unidadServicioId: string
}

export default function PlantillaServicioIndependienteMultiAddModal({
  isOpen,
  onClose,
  plantillaId,
  edtId,
  onItemsCreated
}: Props) {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [edts, setEdts] = useState<Edt[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidadesServicio, setUnidadesServicio] = useState<UnidadServicio[]>([])
  const [filteredServicios, setFilteredServicios] = useState<CatalogoServicio[]>([])
  const [selectedServicios, setSelectedServicios] = useState<SelectedServicio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [edtFiltro, setEdtFiltro] = useState('todas')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // ✅ Load servicios and related data when modal opens
  useEffect(() => {
    console.log('🛠️ Modal useEffect triggered, isOpen:', isOpen)
    console.log('🛠️ Modal props:', { isOpen, plantillaId, edtId })
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // ✅ Set initial EDT filter when edtId prop changes
  useEffect(() => {
    if (edtId) {
      setEdtFiltro(edtId)
    } else {
      setEdtFiltro('todas')
    }
  }, [edtId])

  // ✅ Filter servicios based on search term and EDT
  useEffect(() => {
    let filtered = servicios

    // Filter by EDT (use edtId prop if provided, otherwise use filter)
    const effectiveEdtFiltro = edtId || edtFiltro
    if (effectiveEdtFiltro !== 'todas') {
      filtered = filtered.filter(servicio => servicio.categoriaId === effectiveEdtFiltro)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(servicio =>
        servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // ✅ Mantener el orden que viene de la API (ya ordenado por orden)
    console.log('🛠️ Servicios filtrados (manteniendo orden de API):', filtered.map(s => ({ nombre: s.nombre, orden: s.orden })))
    setFilteredServicios(filtered)
  }, [searchTerm, edtFiltro, servicios, edtId])

  const loadData = async () => {
    console.log('🛠️ loadData called')
    setLoading(true)
    try {
      const [serviciosData, edtsData, recursosData, unidadesData] = await Promise.all([
        getCatalogoServicios(),
        getEdts(),
        getRecursos(true),
        getUnidadesServicio()
      ])

      console.log('🛠️ Data loaded:')
      console.log('🛠️ serviciosData:', serviciosData)
      console.log('🛠️ edtsData:', edtsData)
      console.log('🛠️ recursosData:', recursosData)
      console.log('🛠️ unidadesData:', unidadesData)

      console.log('🛠️ Servicios desde API:', serviciosData.map(s => ({ nombre: s.nombre, orden: s.orden })))
      setServicios(serviciosData)
      setEdts(edtsData)
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
    console.log('🛠️ handleAddServicio called with servicio:', servicio)
    console.log('🛠️ Current recursos:', recursos)
    console.log('🛠️ Current unidadesServicio:', unidadesServicio)

    const existingIndex = selectedServicios.findIndex(item => item.servicio.id === servicio.id)

    if (existingIndex >= 0) {
      // If already selected, increase quantity
      const updated = [...selectedServicios]
      updated[existingIndex].cantidad += 1
      setSelectedServicios(updated)
      console.log('🛠️ Increased quantity for existing servicio:', updated[existingIndex])
    } else {
      // Add new selection with default values
      const validRecursos = recursos.filter(r => r && r.id)
      const validUnidades = unidadesServicio.filter(u => u && u.id)
      const defaultRecurso = validRecursos.find(r => r.nombre === 'Ingeniero Senior') || validRecursos[0]
      const defaultUnidad = validUnidades.find(u => u.nombre === 'hora') || validUnidades[0]

      // Calculate default prices using the new escalonada formula with difficulty
      const cantidad = 1
      const horasBase = (servicio.horaBase || 0) + Math.max(0, cantidad - 1) * (servicio.horaRepetido || 0);
      const factorDificultad = servicio.nivelDificultad || 1;
      const horaTotal = horasBase * factorDificultad;

      // Get costoHora from servicio.recurso OR look it up from recursos array
      const servicioRecurso = servicio.recurso || validRecursos.find(r => r.id === servicio.recursoId)
      const costoHora = servicioRecurso?.costoHora || defaultRecurso?.costoHora || 0
      const factorSeguridad = 1.0
      const margen = 1.35
      const calculatedCostoInterno = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
      const calculatedPrecioCliente = +(calculatedCostoInterno * margen).toFixed(2)

      console.log('🛠️ Calculated horaTotal:', horaTotal, 'costoInterno:', calculatedCostoInterno, 'precioCliente:', calculatedPrecioCliente)

      const newItem = {
         servicio,
         cantidad: 1,
         precioInterno: calculatedCostoInterno,
         precioCliente: calculatedPrecioCliente,
         recursoId: defaultRecurso?.id || '',
         unidadServicioId: defaultUnidad?.id || ''
       }

      console.log('🛠️ Adding new servicio item with calculated prices:', newItem)
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

  // ✅ Save selected servicios as plantilla items
  const handleSave = async () => {
    console.log('🛠️ handleSave called')
    console.log('🛠️ selectedServicios:', selectedServicios)
    console.log('🛠️ plantillaId:', plantillaId)

    if (selectedServicios.length === 0) {
      console.log('🛠️ No services selected')
      toast.error('Selecciona al menos un servicio')
      return
    }

    // Validate that all services have required fields
    const invalidItems = selectedServicios.filter(item =>
      !item.recursoId || !item.unidadServicioId
    )

    console.log('🛠️ invalidItems:', invalidItems)

    if (invalidItems.length > 0) {
      console.log('🛠️ Some items missing required fields')
      toast.error('Todos los servicios deben tener recurso y unidad asignados')
      return
    }

    try {
      setSaving(true)
      const createdItems: PlantillaServicioItemIndependiente[] = []

      for (const selectedServicio of selectedServicios) {
        console.log('🛠️ Processing selectedServicio:', selectedServicio)

        const requestBody = {
          catalogoServicioId: selectedServicio.servicio.id,
          cantidad: selectedServicio.cantidad,
          precioInterno: selectedServicio.precioInterno,
          precioCliente: selectedServicio.precioCliente,
          recursoId: selectedServicio.recursoId,
          unidadServicioId: selectedServicio.unidadServicioId,
        }

        console.log('🛠️ Sending request to API:', `/api/plantillas/servicios/${plantillaId}/items`)
        console.log('🛠️ Request body:', requestBody)

        const response = await fetch(`/api/plantillas/servicios/${plantillaId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        console.log('🛠️ API response status:', response.status)
        console.log('🛠️ API response ok:', response.ok)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('🛠️ API error response:', errorText)
          throw new Error('Error al crear item')
        }

        const createdItem = await response.json()
        console.log('🛠️ Created item:', createdItem)
        createdItems.push(createdItem)
      }

      console.log('🛠️ All items created successfully:', createdItems)
      toast.success(`Se agregaron ${createdItems.length} servicios exitosamente`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error saving items:', error)
      toast.error('Error al guardar los servicios')
    } finally {
      setSaving(false)
    }
  }

  // ✅ Close modal and reset state
  const handleClose = () => {
    setSelectedServicios([])
    setSearchTerm('')
    setExpandedItemId(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {edtId ? 'Agregar Servicios de la Plantilla' : 'Agregar Múltiples Servicios'}
          </DialogTitle>
        </DialogHeader>

        {/* Búsqueda y Filtros */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          {edtId ? (
            <div className="w-48">
              <div className="flex items-center justify-center h-10 px-3 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-sm text-blue-700 font-medium">
                  {edts.find(e => e.id === edtId)?.nombre || 'EDT filtrado'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-48">
              <Select value={edtFiltro} onValueChange={setEdtFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los EDTs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los EDTs</SelectItem>
                  {edts.filter(e => e && e.id).map(edt => (
                    <SelectItem key={edt.id} value={edt.id!}>
                      {edt.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                              <span className="text-gray-500">Escalonada (Dificultad: {servicio.nivelDificultad || 1})</span>
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
                {selectedServicios.map((item) => {
                  const isExpanded = expandedItemId === item.servicio.id
                  const recursoNombre = recursos.find(r => r.id === item.recursoId)?.nombre || 'Sin recurso'

                  return (
                    <div
                      key={item.servicio.id}
                      className={`border rounded-lg transition-all ${
                        isExpanded ? 'border-blue-400 bg-blue-50' : 'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      {/* Header siempre visible - clickeable para expandir */}
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.servicio.id!)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-blue-900 truncate">
                              {item.servicio.nombre}
                            </h4>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              x{item.cantidad}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="text-gray-500">{recursoNombre}</span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(item.cantidad * item.precioCliente)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveServicio(item.servicio.id!)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-blue-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                      </div>

                      {/* Contenido expandible */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-blue-200">
                          <p className="text-xs text-blue-700 mb-3 mt-2">{item.servicio.descripcion}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-gray-600">Cantidad</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateQuantity(item.servicio.id!, parseInt(e.target.value) || 1)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Recurso</Label>
                              <Select
                                value={item.recursoId}
                                onValueChange={(value) => handleUpdateRecurso(item.servicio.id!, value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
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
                            <div>
                              <Label className="text-xs text-gray-600">Precio Interno</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioInterno.toString()}
                                onChange={(e) => handleUpdatePrice(item.servicio.id!, 'precioInterno', parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Unidad</Label>
                              <Select
                                value={item.unidadServicioId}
                                onValueChange={(value) => handleUpdateUnidad(item.servicio.id!, value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
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
                            <div>
                              <Label className="text-xs text-gray-600">Precio Cliente</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioCliente.toString()}
                                onChange={(e) => handleUpdatePrice(item.servicio.id!, 'precioCliente', parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Total</Label>
                              <div className="h-8 flex items-center font-bold text-blue-600 text-lg">
                                {formatCurrency(item.cantidad * item.precioCliente)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
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
            <Button variant="outline" onClick={handleClose} disabled={saving} className="h-9 px-4">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedServicios.length === 0 || saving}
              className="h-9 px-6 bg-blue-600 hover:bg-blue-700 min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3 w-3" />
                  Agregar ({selectedServicios.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}