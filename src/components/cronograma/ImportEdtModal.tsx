// ===================================================
// 📁 Archivo: ImportEdtModal.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Modal especializado para importar EDTs del catálogo
// ✅ Muestra EDTs disponibles con información de fase por defecto
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
import { Search, Download, CheckCircle, AlertCircle, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface ImportableEdt {
  id: string
  nombre: string
  descripcion?: string
  faseDefault?: {
    id: string
    nombre: string
    descripcion?: string
    orden: number
  }
  serviciosCount?: number
  servicios?: any[]
  metadata?: {
    tieneFaseDefault?: boolean
    serviciosDisponibles?: number
  }
  [key: string]: any
}

export interface ImportEdtModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  edts: ImportableEdt[]
  onImport: (selectedIds: string[]) => Promise<void>
  loading?: boolean
}

export function ImportEdtModal({
  isOpen,
  onClose,
  title,
  description,
  edts,
  onImport,
  loading = false
}: ImportEdtModalProps) {

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

  // Filter edts based on search
  const filteredEdts = edts.filter(edt => {
    const matchesSearch = edt.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (edt.descripcion && edt.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEdts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredEdts.map(edt => edt.id))
    }
  }

  const handleItemToggle = (itemId: string, isAlreadyAdded: boolean) => {
    if (isAlreadyAdded) return // Don't allow toggling already added items

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
        description: 'Debe seleccionar al menos un EDT para importar',
        variant: 'destructive'
      })
      return
    }

    try {
      await onImport(selectedIds)
      onClose()
    } catch (error) {
      console.error('Error in ImportEdtModal handleImport:', error)
    }
  }

  const getEdtDisplayInfo = (edt: ImportableEdt) => {
    const info = []

    if (edt.faseDefault) {
      info.push(`Fase: ${edt.faseDefault.nombre}`)
    }

    if (edt.serviciosCount && edt.serviciosCount > 0) {
      info.push(`${edt.serviciosCount} servicios`)
    }

    return info
  }

  const renderEdtList = (edts: ImportableEdt[], title: string, emptyMessage: string) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {edts.length}
        </Badge>
      </div>

      {edts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {edts.map(edt => {
            const displayInfo = getEdtDisplayInfo(edt)
            const isSelected = selectedIds.includes(edt.id)

            return (
              <div
                key={edt.id}
                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleItemToggle(edt.id, false)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleItemToggle(edt.id, false)}
                    className="mt-0.5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{edt.nombre}</h4>
                    {displayInfo.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {displayInfo.map((info, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {info}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {edt.descripcion && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {edt.descripcion}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar EDTs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* EDTs Summary */}
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                <span>Disponibles: {filteredEdts.length}</span>
              </div>
            </div>
            <div className="text-sm text-blue-700 font-medium">
              {selectedIds.length} EDTs seleccionados para importar
            </div>
          </div>

          {/* EDTs List */}
          <ScrollArea className="h-96 border rounded-md">
            <div className="p-4">
              {renderEdtList(
                filteredEdts,
                'EDTs Disponibles',
                'No hay EDTs disponibles que coincidan con la búsqueda'
              )}
            </div>
          </ScrollArea>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información de Importación</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los EDTs seleccionados se importarán como elementos del proyecto</li>
              <li>• Solo se creará la estructura básica del EDT</li>
              <li>• Podrás agregar actividades y tareas manualmente después</li>
              <li>• Los EDTs se asignarán automáticamente a la fase actual</li>
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
            {loading ? 'Importando...' : `Importar ${selectedIds.length} EDT${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}