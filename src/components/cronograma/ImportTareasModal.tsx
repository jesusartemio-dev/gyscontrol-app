// ===================================================
// 📁 Archivo: ImportTareasModal.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Modal especializado para importar múltiples tareas desde catálogo de servicios
// ✅ Permite selección múltiple de servicios para crear tareas en una actividad
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
import { Separator } from '@/components/ui/separator'
import { Search, Download, CheckCircle, AlertCircle, Plus, Clock, Users, Wrench } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface ServicioItem {
  id: string
  nombre: string
  descripcion?: string
  categoria: string
  recurso: string
  unidadServicio: string
  cantidad: number
  horaBase: number
  horaRepetido: number
  costoHora: number
  orden: number
  nivelDificultad: string
  horasEstimadas: number
  metadata?: {
    tipo?: string
    origen?: string
  }
}

export interface ImportTareasModalProps {
  isOpen: boolean
  onClose: () => void
  actividadNombre: string
  servicios: ServicioItem[]
  onImport: (selectedIds: string[]) => Promise<void>
  loading?: boolean
}

export function ImportTareasModal({
  isOpen,
  onClose,
  actividadNombre,
  servicios,
  onImport,
  loading = false
}: ImportTareasModalProps) {

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const { toast } = useToast()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([])
      setSearchTerm('')
      setCategoryFilter('')
      setShowOnlyAvailable(false)
    }
  }, [isOpen])

  // Filter servicios based on search, category, and availability
  const filteredServicios = servicios.filter(servicio => {
    const matchesSearch = servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (servicio.descripcion && servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !categoryFilter || servicio.categoria === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories for filter
  const categories = [...new Set(servicios.map(servicio => servicio.categoria).filter(Boolean))]

  const handleSelectAll = () => {
    if (selectedIds.length === filteredServicios.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredServicios.map(servicio => servicio.id))
    }
  }

  const handleServicioToggle = (servicioId: string) => {
    setSelectedIds(prev =>
      prev.includes(servicioId)
        ? prev.filter(id => id !== servicioId)
        : [...prev, servicioId]
    )
  }

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Selección requerida',
        description: 'Debe seleccionar al menos un servicio para importar como tarea',
        variant: 'destructive'
      })
      return
    }

    try {
      await onImport(selectedIds)
      onClose()
    } catch (error) {
      console.error('Error in ImportTareasModal handleImport:', error)
    }
  }

  const getServicioDisplayInfo = (servicio: ServicioItem) => {
    const info = []

    if (servicio.categoria) {
      info.push(`Categoría: ${servicio.categoria}`)
    }

    if (servicio.horasEstimadas) {
      info.push(`${servicio.horasEstimadas}h estimadas`)
    }

    if (servicio.recurso) {
      info.push(`Recurso: ${servicio.recurso}`)
    }

    if (servicio.cantidad) {
      info.push(`Cant: ${servicio.cantidad}`)
    }

    if (servicio.nivelDificultad) {
      info.push(`Dificultad: ${servicio.nivelDificultad}`)
    }

    return info
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Importar Tareas desde Catálogo de Servicios
          </DialogTitle>
          <DialogDescription>
            Selecciona los servicios del catálogo que deseas importar como tareas para la actividad "{actividadNombre}".
            Cada servicio seleccionado se convertirá en una tarea independiente dentro de esta actividad.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-4">
              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Categoría:</Label>
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-only-available"
                  checked={showOnlyAvailable}
                  onCheckedChange={(checked) => setShowOnlyAvailable(checked === true)}
                />
                <Label htmlFor="show-only-available" className="text-sm">
                  Mostrar solo disponibles
                </Label>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                <span>Servicios disponibles: {filteredServicios.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span>Horas totales estimadas: {filteredServicios.reduce((sum, s) => sum + s.horasEstimadas, 0)}h</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredServicios.length === 0}
              >
                {selectedIds.length === filteredServicios.length && filteredServicios.length > 0
                  ? 'Deseleccionar todo'
                  : 'Seleccionar todos'
                }
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} seleccionados
              </span>
            </div>
          </div>

          {/* Servicios List */}
          <ScrollArea className="h-96 border rounded-md">
            <div className="p-4 space-y-3">
              {filteredServicios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No hay servicios que coincidan con los filtros</p>
                </div>
              ) : (
                filteredServicios.map(servicio => {
                  const displayInfo = getServicioDisplayInfo(servicio)
                  const isSelected = selectedIds.includes(servicio.id)

                  return (
                    <div
                      key={servicio.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleServicioToggle(servicio.id)}
                    >
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleServicioToggle(servicio.id)}
                          className="mt-0.5"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm truncate">{servicio.nombre}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {servicio.categoria}
                          </Badge>
                        </div>

                        {servicio.descripcion && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {servicio.descripcion}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {displayInfo.slice(0, 3).map((info, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {info}
                            </Badge>
                          ))}
                        </div>

                        {displayInfo.length > 3 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {displayInfo.slice(3).map((info, index) => (
                              <Badge key={index + 3} variant="secondary" className="text-xs">
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

          {/* Info Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Información de Importación
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Cada servicio seleccionado se convertirá en una tarea independiente</li>
              <li>• Las fechas se calcularán automáticamente basándose en la actividad padre</li>
              <li>• Las horas estimadas se mantendrán del servicio original</li>
              <li>• Podrás editar las tareas después de importarlas</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.length === 0 || loading}
          >
            {loading ? 'Importando...' : `Importar ${selectedIds.length} Tarea${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}