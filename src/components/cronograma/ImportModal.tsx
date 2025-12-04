// ===================================================
// 📁 Archivo: ImportModal.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Modal genérico para importar elementos al cronograma
// ✅ Selección múltiple, filtros, confirmación
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Download, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface ImportableItem {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  totalHoras?: number
  totalItems?: number
  servicioNombre?: string
  recursoNombre?: string
  cantidad?: number
  horaTotal?: number
  [key: string]: any
}

export interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  items: ImportableItem[]
  onImport: (selectedIds: string[]) => Promise<void>
  loading?: boolean
  itemType: 'fases' | 'edts' | 'actividades' | 'tareas'
  showCategories?: boolean
  showHours?: boolean
  showItems?: boolean
}

export function ImportModal({
  isOpen,
  onClose,
  title,
  description,
  items,
  onImport,
  loading = false,
  itemType,
  showCategories = false,
  showHours = false,
  showItems = false
}: ImportModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const { toast } = useToast()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([])
      setSearchTerm('')
      setCategoryFilter('')
    }
  }, [isOpen])

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !categoryFilter || item.categoria === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories for filter
  const categories = [...new Set(items.map(item => item.categoria).filter(Boolean))]

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map(item => item.id))
    }
  }

  const handleItemToggle = (itemId: string) => {
    setSelectedIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleImport = async () => {
   if (selectedIds.length === 0) {
     toast({
       title: 'Selección requerida',
       description: `Debe seleccionar al menos un ${itemType.slice(0, -1)} para importar`,
       variant: 'destructive'
     })
     return
   }

   try {
     await onImport(selectedIds)
     // El toast de éxito se muestra en handleExecuteImport
     onClose()
   } catch (error) {
     // El manejo de errores se hace en handleExecuteImport para evitar duplicación
     console.error('Error in ImportModal handleImport:', error)
     // No mostrar toast aquí para evitar duplicación
   }
 }

  const getItemDisplayInfo = (item: ImportableItem) => {
    const info = []

    if (showCategories && item.categoria) {
      info.push(`Categoría: ${item.categoria}`)
    }

    if (showHours && item.totalHoras) {
      info.push(`${item.totalHoras}h totales`)
    }

    if (showItems && item.totalItems) {
      info.push(`${item.totalItems} items`)
    }

    if (item.servicioNombre) {
      info.push(`Servicio: ${item.servicioNombre}`)
    }

    if (item.recursoNombre) {
      info.push(`Recurso: ${item.recursoNombre}`)
    }

    if (item.cantidad) {
      info.push(`Cant: ${item.cantidad}`)
    }

    if (item.horaTotal) {
      info.push(`${item.horaTotal}h`)
    }

    return info
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${itemType}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {showCategories && categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Filtrar por categoría:</Label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredItems.length === 0}
              >
                {selectedIds.length === filteredItems.length && filteredItems.length > 0
                  ? 'Deseleccionar todo'
                  : 'Seleccionar todo'
                }
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} de {filteredItems.length} seleccionados
              </span>
            </div>
          </div>

          {/* Items List */}
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-4 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron {itemType} que coincidan con los filtros
                  </p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const displayInfo = getItemDisplayInfo(item)
                  const isSelected = selectedIds.includes(item.id)

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleItemToggle(item.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleItemToggle(item.id)}
                        className="mt-0.5"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{item.nombre}</h4>
                          {displayInfo.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {displayInfo.slice(0, 2).map((info, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {info}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {item.descripcion && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {item.descripcion}
                          </p>
                        )}

                        {displayInfo.length > 2 && (
                          <div className="flex flex-wrap gap-1">
                            {displayInfo.slice(2).map((info, index) => (
                              <Badge key={index + 2} variant="outline" className="text-xs">
                                {info}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.length === 0 || loading}
          >
            {loading ? 'Importando...' : `Importar ${selectedIds.length} ${itemType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}