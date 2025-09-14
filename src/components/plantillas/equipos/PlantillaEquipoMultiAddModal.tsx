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
  const [filteredEquipos, setFilteredEquipos] = useState<CatalogoEquipo[]>([])
  const [selectedEquipos, setSelectedEquipos] = useState<SelectedEquipo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ✅ Load equipos and categorias when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEquipos()
      loadCategorias()
    }
  }, [isOpen])

  // ✅ Filter equipos based on search term and category
  useEffect(() => {
    let filtered = equipos
    
    // Filter by category
    if (categoriaFiltro !== 'todas') {
      filtered = filtered.filter(equipo => equipo.categoriaId === categoriaFiltro)
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
  }, [searchTerm, categoriaFiltro, equipos])

  const loadEquipos = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoEquipos()
      setEquipos(data)
      setFilteredEquipos(data)
    } catch (error) {
      console.error('Error loading equipos:', error)
      toast.error('Error al cargar los equipos')
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await getCategoriasEquipo()
      setCategorias(data)
    } catch (error) {
      console.error('Error loading categorias:', error)
      toast.error('Error al cargar categorías')
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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Agregar Múltiples Equipos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* ✅ Left Panel - Equipment Catalog */}
          <div className="space-y-4">
            <div className="space-y-4">
              <Label>Buscar y Filtrar Equipos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, código o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categorias.map(categoria => (
                      <SelectItem key={categoria.id} value={categoria.id!}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando equipos...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredEquipos.map(equipo => (
                      <motion.div
                        key={equipo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
                              onClick={() => handleAddEquipo(equipo)}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {equipo.codigo}
                                </Badge>
                                {equipo.categoria && (
                                  <Badge variant="secondary" className="text-xs">
                                    {equipo.categoria.nombre}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1">{equipo.descripcion}</h4>
                              {equipo.marca && (
                                <p className="text-xs text-gray-600 mb-2">Marca: {equipo.marca}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-600">
                                  Interno: {formatCurrency(equipo.precioInterno || 0)}
                                </span>
                                <span className="font-medium text-green-600"> 
                                   Cliente: {formatCurrency(equipo.precioVenta || 0)} 
                                 </span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {filteredEquipos.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron equipos' : 'No hay equipos disponibles'}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ✅ Right Panel - Selected Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Equipos Seleccionados ({selectedEquipos.length})</Label>
              <div className="text-sm text-gray-600">
                Total: {formatCurrency(totalAmount)}
              </div>
            </div>

            <ScrollArea className="h-96">
              {selectedEquipos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Selecciona equipos del catálogo
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {selectedEquipos.map(item => (
                      <motion.div
                        key={item.equipo.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.equipo.codigo}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-sm">{item.equipo.descripcion}</h4>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveEquipo(item.equipo.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Cantidad</Label>
                                <div className="flex items-center gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleUpdateQuantity(item.equipo.id!, item.cantidad - 1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.cantidad}
                                    onChange={(e) => handleUpdateQuantity(item.equipo.id!, parseInt(e.target.value) || 0)}
                                    className="h-8 text-center text-sm"
                                    min="1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleUpdateQuantity(item.equipo.id!, item.cantidad + 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Precio Unitario</Label>
                                <div className="relative mt-1">
                                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                  <Input
                                    type="number"
                                    value={item.precioUnitario}
                                    onChange={(e) => handleUpdatePrice(item.equipo.id!, parseFloat(e.target.value) || 0)}
                                    className="h-8 pl-7 text-sm"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium">
                                {formatCurrency(item.cantidad * item.precioUnitario)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-gray-600">
              {selectedEquipos.length > 0 && (
                <span>Total: <strong>{formatCurrency(totalAmount)}</strong></span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={selectedEquipos.length === 0 || saving}
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  `Agregar ${selectedEquipos.length} Equipos`
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}