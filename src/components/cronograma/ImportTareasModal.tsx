// ===================================================
// 📁 Archivo: ImportTareasModal.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Modal especializado para importar múltiples tareas desde catálogo de servicios
// ✅ Permite selección múltiple de servicios para crear tareas en una actividad
// ===================================================

'use client'
import { normalizeStr } from '@/lib/utils'

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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, Wrench } from 'lucide-react'
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
  const { toast } = useToast()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([])
      setSearchTerm('')
    }
  }, [isOpen])

  const filteredServicios = servicios.filter(servicio =>
    normalizeStr(servicio.nombre).includes(normalizeStr(searchTerm))
  )

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Importar Tareas — {actividadNombre}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cada servicio seleccionado se crea como tarea. Podrás editar fechas y recursos después.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {/* Search + resumen en una fila */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSelectAll} disabled={filteredServicios.length === 0}>
              {selectedIds.length === filteredServicios.length && filteredServicios.length > 0 ? 'Ninguno' : 'Todos'}
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {selectedIds.length}/{filteredServicios.length}
            </span>
          </div>

          {/* Lista compacta */}
          <ScrollArea className="h-[360px] border rounded-md">
            <div className="divide-y">
              {filteredServicios.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No hay servicios disponibles
                </div>
              ) : (
                filteredServicios.map(servicio => {
                  const isSelected = selectedIds.includes(servicio.id)
                  return (
                    <div
                      key={servicio.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleServicioToggle(servicio.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleServicioToggle(servicio.id)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{servicio.nombre}</span>
                        {servicio.recurso && (
                          <span className="text-[11px] text-muted-foreground">{servicio.recurso}</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={selectedIds.length === 0 || loading}
          >
            {loading ? 'Importando...' : `Importar ${selectedIds.length} tarea${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}