'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CotizacionServicioItemTable from './CotizacionServicioItemTable'
import CotizacionServicioItemMultiAddModal from './CotizacionServicioItemMultiAddModal'
import CotizacionServicioItemCreateModal from './CotizacionServicioItemCreateModal'
import type { CotizacionServicio, CotizacionServicioItem } from '@/types'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { cn } from '@/lib/utils'
import {
  Pencil,
  Trash2,
  Wrench,
  TrendingUp,
  ChevronRight,
  Plus,
  Clock,
  Download
} from 'lucide-react'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface Props {
  servicio: CotizacionServicio
  onCreated: (item: CotizacionServicioItem) => void
  onMultipleCreated?: (items: CotizacionServicioItem[]) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionServicioItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function CotizacionServicioAccordion({
  servicio,
  onCreated,
  onMultipleCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(servicio.nombre)
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    setNuevoNombre(servicio.nombre)
  }, [servicio.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== servicio.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setNuevoNombre(servicio.nombre)
      setEditando(false)
    }
  }

  const margen = servicio.subtotalInterno > 0
    ? servicio.subtotalCliente - servicio.subtotalInterno
    : 0
  const margenPct = servicio.subtotalInterno > 0
    ? ((servicio.subtotalCliente - servicio.subtotalInterno) / servicio.subtotalInterno) * 100
    : 0
  const totalHoras = servicio.items?.reduce((sum, item) => sum + (item.horaTotal ?? 0), 0) || 0

  const handleItemsCreated = (items: CotizacionServicioItem[]) => {
    if (items.length > 0) {
      if (onMultipleCreated) {
        onMultipleCreated(items)
      } else {
        items.forEach(item => onCreated(item))
      }
    }
    setModalImportarAbierto(false)
  }

  const handleItemCreated = (item: CotizacionServicioItem) => {
    onCreated(item)
    setModalNuevoAbierto(false)
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          'border rounded-lg transition-all',
          isOpen ? 'border-blue-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
        )}>
          {/* Header Compacto */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none group">
              {/* Icono + Chevron */}
              <ChevronRight className={cn(
                'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
                isOpen && 'rotate-90'
              )} />
              <Wrench className={cn(
                'h-4 w-4 flex-shrink-0',
                isOpen ? 'text-blue-600' : 'text-gray-400'
              )} />

              {/* Nombre editable */}
              <div className="flex-1 min-w-0">
                {editando ? (
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyPress}
                    autoFocus
                    className="text-sm font-medium bg-transparent border-b border-blue-400 focus:outline-none w-full max-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900 truncate block">
                    {servicio.nombre}
                  </span>
                )}
              </div>

              {/* Stats inline */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  {servicio.items.length} items
                </Badge>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3 text-purple-500" />
                  <span className="font-mono text-purple-600">{totalHoras.toFixed(2)}h</span>
                </span>
                <span className="text-gray-300">|</span>
                <span className="font-mono">{formatCurrency(servicio.subtotalInterno)}</span>
                <span className="text-gray-300">→</span>
                <span className="font-mono text-green-600 font-medium">{formatCurrency(servicio.subtotalCliente)}</span>
                {margenPct > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className={cn(
                      'flex items-center gap-0.5 font-medium',
                      margenPct >= 20 ? 'text-emerald-600' : margenPct >= 10 ? 'text-amber-600' : 'text-red-500'
                    )}>
                      <TrendingUp className="h-3 w-3" />
                      {margenPct.toFixed(0)}%
                    </span>
                  </>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditando(true)
                  }}
                >
                  <Pencil className="h-3 w-3 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-gray-500" />
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Móvil stats cuando cerrado */}
          {!isOpen && (
            <div className="sm:hidden px-3 pb-2 pt-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{servicio.items.length} items • {totalHoras.toFixed(2)}h</span>
                <span className="font-mono text-green-600 font-medium">{formatCurrency(servicio.subtotalCliente)}</span>
              </div>
            </div>
          )}

          {/* Contenido Expandido */}
          <CollapsibleContent>
            <div className="border-t bg-gray-50/50">
              {/* Toolbar Items */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-100/50">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Items del grupo
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => setModalNuevoAbierto(true)}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nuevo
                  </Button>
                  <Button
                    onClick={() => setModalImportarAbierto(true)}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Importar
                  </Button>
                </div>
              </div>

              {/* Lista de Items */}
              <div className="p-2">
                {servicio.items.length === 0 ? (
                  <div className="text-center py-6">
                    <Wrench className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">Sin servicios en este grupo</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => setModalNuevoAbierto(true)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Crear nuevo
                      </Button>
                      <Button
                        onClick={() => setModalImportarAbierto(true)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Importar de catálogo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CotizacionServicioItemTable
                    items={servicio.items}
                    onDeleted={onDeleted}
                    onUpdated={onUpdated}
                  />
                )}
              </div>

              {/* Footer móvil con totales */}
              {servicio.items.length > 0 && (
                <div className="sm:hidden px-3 py-2 border-t bg-gray-100/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-600">{totalHoras.toFixed(2)}h</span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono">{formatCurrency(servicio.subtotalInterno)}</span>
                      <span className="text-gray-300">→</span>
                      <span className="font-mono text-green-600 font-medium">{formatCurrency(servicio.subtotalCliente)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Modal para importar items desde catálogo */}
      <CotizacionServicioItemMultiAddModal
        isOpen={modalImportarAbierto}
        onClose={() => setModalImportarAbierto(false)}
        servicio={servicio}
        onItemsCreated={handleItemsCreated}
        existingItemIds={servicio.items.map(i => i.catalogoServicioId).filter(Boolean) as string[]}
      />

      {/* Modal para crear item nuevo */}
      <CotizacionServicioItemCreateModal
        isOpen={modalNuevoAbierto}
        onClose={() => setModalNuevoAbierto(false)}
        servicio={servicio}
        onItemCreated={handleItemCreated}
      />

      {/* Delete confirmation dialog */}
      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDeletedGrupo()
          setShowDeleteDialog(false)
        }}
        title="¿Eliminar grupo de servicios?"
        description="Esta acción eliminará permanentemente el grupo y todos sus items."
      />
    </>
  )
}
