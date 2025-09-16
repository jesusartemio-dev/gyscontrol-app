'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Minus, Trash2, Package, DollarSign, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { createPlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import type { CatalogoEquipo, PlantillaEquipoItem, CategoriaEquipo } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  plantillaEquipoId: string
  onItemsCreated: (items: PlantillaEquipoItem[]) => void
}

interface SelectedEquipo {
  equipo: CatalogoEquipo
  cantidad: number
  precioUnitario: number
}

export default function PlantillaEquipoMultiAddModal({
  isOpen,
  onClose,
  plantillaEquipoId,
  onItemsCreated
}: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])  
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])  
  const [marcas, setMarcas] = useState<string[]>([])  
  const [filteredEquipos, setFilteredEquipos] = useState<CatalogoEquipo[]>([])  
  const [selectedEquipos, setSelectedEquipos] = useState<SelectedEquipo[]>([])  
  const [searchTerm, setSearchTerm] = useState('')  
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')  
  const [marcaFiltro, setMarcaFiltro] = useState('todas')  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ✅ Get available brands based on selected category
  const getAvailableBrands = () => {
    if (categoriaFiltro === 'todas') {
      return [...new Set(equipos.map(equipo => equipo.marca).filter(Boolean))]
    }
    return [...new Set(
      equipos
        .filter(equipo => equipo.categoriaId === categoriaFiltro)
        .map(equipo => equipo.marca)
        .filter(Boolean)
    )]
  }

  // ✅ Get available categories based on selected brand
  const getAvailableCategories = () => {
    if (marcaFiltro === 'todas') {
      return categorias
    }
    const availableCategoryIds = [...new Set(
      equipos
        .filter(equipo => equipo.marca === marcaFiltro)
        .map(equipo => equipo.categoriaId)
        .filter(Boolean)
    )]
    return categorias.filter(categoria => availableCategoryIds.includes(categoria.id!))
  }

  // ✅ Load equipos and categorias when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // ✅ Reset brand filter when category changes and selected brand is not available
  useEffect(() => {
    if (categoriaFiltro !== 'todas' && marcaFiltro !== 'todas') {
      const availableBrands = getAvailableBrands()
      if (!availableBrands.includes(marcaFiltro)) {
        setMarcaFiltro('todas')
      }
    }
  }, [categoriaFiltro, equipos])

  // ✅ Reset category filter when brand changes and selected category is not available
  useEffect(() => {
    if (marcaFiltro !== 'todas' && categoriaFiltro !== 'todas') {
      const availableCategories = getAvailableCategories()
      if (!availableCategories.some(cat => cat.id === categoriaFiltro)) {
        setCategoriaFiltro('todas')
      }
    }
  }, [marcaFiltro, equipos])

  // ✅ Filter equipos based on search term, category and brand
  useEffect(() => {
    let filtered = equipos
    
    // Filter by category
    if (categoriaFiltro !== 'todas') {
      filtered = filtered.filter(equipo => equipo.categoriaId === categoriaFiltro)
    }
    
    // Filter by brand
    if (marcaFiltro !== 'todas') {
      filtered = filtered.filter(equipo => equipo.marca === marcaFiltro)
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(equipo => 
        equipo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.marca?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredEquipos(filtered)
  }, [searchTerm, categoriaFiltro, marcaFiltro, equipos])

  const loadData = async () => {
    setLoading(true)
    try {
      const [equiposData, categoriasData] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriasEquipo()
      ])
      setEquipos(equiposData)
      setCategorias(categoriasData)
      setFilteredEquipos(equiposData)
      
      // Extract unique brands
      const uniqueMarcas = [...new Set(equiposData.map(equipo => equipo.marca).filter(Boolean))]
      setMarcas(uniqueMarcas)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Add equipo to selection
  const handleAddEquipo = (equipo: CatalogoEquipo) => {
    const existingIndex = selectedEquipos.findIndex(item => item.equipo.id === equipo.id)
    
    if (existingIndex >= 0) {
      // If already selected, increase quantity
      const updated = [...selectedEquipos]
      updated[existingIndex].cantidad += 1
      setSelectedEquipos(updated)
    } else {
      // Add new selection
      setSelectedEquipos(prev => [...prev, { 
         equipo, 
         cantidad: 1, 
         precioUnitario: equipo.precioVenta || 0 
       }])
    }
  }

  // ✅ Update quantity for selected equipo
  const handleUpdateQuantity = (equipoId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSelectedEquipos(prev => prev.filter(item => item.equipo.id !== equipoId))
    } else {
      setSelectedEquipos(prev => prev.map(item => 
        item.equipo.id === equipoId 
          ? { ...item, cantidad: newQuantity }
          : item
      ))
    }
  }

  // ✅ Update unit price for selected equipo
  const handleUpdatePrice = (equipoId: string, newPrice: number) => {
    setSelectedEquipos(prev => prev.map(item => 
      item.equipo.id === equipoId 
        ? { ...item, precioUnitario: newPrice }
        : item
    ))
  }

  // ✅ Remove equipo from selection
  const handleRemoveEquipo = (equipoId: string) => {
    setSelectedEquipos(prev => prev.filter(item => item.equipo.id !== equipoId))
  }

  // ✅ Calculate total amount
  const totalAmount = selectedEquipos.reduce((sum, item) => 
    sum + (item.cantidad * item.precioUnitario), 0
  )

  // ✅ Save selected equipos as plantilla items
  const handleSave = async () => {
    if (selectedEquipos.length === 0) {
      toast.error('Selecciona al menos un equipo')
      return
    }

    try {
      setSaving(true)
      const createdItems: PlantillaEquipoItem[] = []

      for (const selectedEquipo of selectedEquipos) {
        const itemData = {
          plantillaEquipoId,
          catalogoEquipoId: selectedEquipo.equipo.id!,
          cantidad: selectedEquipo.cantidad,
          precioUnitario: selectedEquipo.precioUnitario,
          observaciones: ''
        }

        const createdItem = await createPlantillaEquipoItem(itemData)
        createdItems.push(createdItem)
      }

      toast.success(`Se agregaron ${createdItems.length} equipos exitosamente`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error saving items:', error)
      toast.error('Error al guardar los equipos')
    } finally {
      setSaving(false)
    }
  }

  // ✅ Close modal and reset state
  const handleClose = () => {
    setSelectedEquipos([])
    setSearchTerm('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Agregar Múltiples Equipos
          </DialogTitle>
        </DialogHeader>

        {/* Búsqueda y Filtros */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar equipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-32">
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Categorías</SelectItem>
                {getAvailableCategories().map(categoria => (
                  <SelectItem key={categoria.id} value={categoria.id!}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={marcaFiltro} onValueChange={setMarcaFiltro}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Marcas</SelectItem>
                {getAvailableBrands().map(marca => (
                  <SelectItem key={marca} value={marca}>
                    {marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout de Dos Columnas Lado a Lado */}
        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Columna Izquierda - Equipos Disponibles */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">              
              <h3 className="font-medium text-gray-900">Equipos Disponibles</h3>
              <Badge variant="outline" className="text-xs">
                {filteredEquipos.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando equipos...</span>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredEquipos.map(equipo => {
                    const isSelected = selectedEquipos.some(item => item.equipo.id === equipo.id)
                    
                    return (
                      <motion.div
                        key={equipo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          className={`p-2 border rounded-lg transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 opacity-50' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => !isSelected && handleAddEquipo(equipo)}
                        >
                          <div className="space-y-0.5">
                            {/* Primera fila: Código */}
                            <div className="flex items-center">
                              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                {equipo.codigo}
                              </span>
                            </div>
                            {/* Segunda fila: Descripción, Marca y Costo */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{equipo.descripcion}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                  <span>{equipo.marca}</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(equipo.precioInterno || 0)}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="ml-3 shrink-0 text-blue-600">
                                  <span className="h-4 w-4">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
              
              {filteredEquipos.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No se encontraron equipos</p>
                  <p className="text-xs text-gray-400">Ajusta los filtros de búsqueda</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha - Equipos Seleccionados */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium text-gray-900">Equipos Seleccionados</h3>
              <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                {selectedEquipos.length}
              </Badge>
            </div>
            
            {selectedEquipos.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {selectedEquipos.map((item) => (
                  <div key={item.equipo.id} className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        {/* Primera fila: Código */}
                        <div className="flex items-center">
                          <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                            {item.equipo.codigo}
                          </span>
                        </div>
                        {/* Segunda fila: Descripción, Marca y Costo */}
                        <div>
                          <h4 className="font-medium text-sm truncate text-blue-900">{item.equipo.descripcion}</h4>
                          <div className="flex items-center gap-3 text-xs text-blue-700 mt-0.5">
                            <span>{item.equipo.marca}</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(item.cantidad * item.precioUnitario)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveEquipo(item.equipo.id!)}
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
                  <p className="text-sm">Selecciona equipos de la lista</p>
                  <p className="text-xs mt-1">Haz clic en cualquier equipo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center w-full pt-3 border-t bg-white">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              {selectedEquipos.length > 0 && `${selectedEquipos.length} equipo${selectedEquipos.length > 1 ? 's' : ''} seleccionado${selectedEquipos.length > 1 ? 's' : ''}`}
            </div>
            {selectedEquipos.length > 0 && (
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
              disabled={selectedEquipos.length === 0 || saving}
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
                  Agregar ({selectedEquipos.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}