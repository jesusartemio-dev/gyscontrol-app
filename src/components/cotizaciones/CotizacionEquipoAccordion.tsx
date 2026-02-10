'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CotizacionEquipoItemTable from './CotizacionEquipoItemTable'
import CotizacionEquipoMultiAddModal from './CotizacionEquipoMultiAddModal'
import CotizacionEquipoItemImportExcelModal from './CotizacionEquipoItemImportExcelModal'
import CotizacionEquipoItemCreateModal from './CotizacionEquipoItemCreateModal'
import type { CotizacionEquipo, CotizacionEquipoItem } from '@/types'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { cn } from '@/lib/utils'
import { exportarCotizacionEquipoItemsAExcel } from '@/lib/utils/cotizacionEquipoItemExcel'
import { toast } from 'sonner'
import {
  Pencil,
  Trash2,
  Package,
  TrendingUp,
  ChevronRight,
  Plus,
  Upload,
  FileDown,
  BookOpen
} from 'lucide-react'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface Props {
  equipo: CotizacionEquipo
  cotizacionId?: string
  cotizacionCodigo?: string
  onCreated: (item: CotizacionEquipoItem) => void
  onMultipleCreated?: (items: CotizacionEquipoItem[]) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionEquipoItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
  onRefresh?: () => Promise<void>
  isLocked?: boolean
  moneda?: string
}

export default function CotizacionEquipoAccordion({
  equipo,
  cotizacionId,
  cotizacionCodigo,
  onCreated,
  onMultipleCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre,
  onRefresh,
  isLocked = false,
  moneda
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre)
  const [showMultiAddModal, setShowMultiAddModal] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CotizacionEquipoItem | undefined>(undefined)

  useEffect(() => {
    setNuevoNombre(equipo.nombre)
  }, [equipo.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== equipo.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setNuevoNombre(equipo.nombre)
      setEditando(false)
    }
  }

  const margen = equipo.subtotalInterno > 0
    ? equipo.subtotalCliente - equipo.subtotalInterno
    : 0
  const margenPct = equipo.subtotalInterno > 0
    ? ((equipo.subtotalCliente - equipo.subtotalInterno) / equipo.subtotalInterno) * 100
    : 0

  const handleMultipleItemsCreated = (items: CotizacionEquipoItem[]) => {
    if (items.length > 0) {
      if (onMultipleCreated) {
        onMultipleCreated(items)
      } else {
        items.forEach(item => onCreated(item))
      }
    }
    setShowMultiAddModal(false)
  }

  const handleExcelItemsCreated = async (items: CotizacionEquipoItem[]) => {
    setShowExcelModal(false)
    if (onRefresh) {
      await onRefresh()
    } else if (items.length > 0) {
      if (onMultipleCreated) {
        onMultipleCreated(items)
      } else {
        items.forEach(item => onCreated(item))
      }
    }
  }

  const handleExportExcel = async () => {
    if (equipo.items.length === 0) {
      toast.error('No hay items para exportar')
      return
    }
    try {
      const prefix = (cotizacionCodigo || cotizacionId) ? `${cotizacionCodigo || cotizacionId}_` : ''
      await exportarCotizacionEquipoItemsAExcel(equipo.items, `${prefix}Equipos_${equipo.nombre}`)
      toast.success('Excel exportado')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error al exportar')
    }
  }

  const handleOpenCreateModal = () => {
    setEditingItem(undefined)
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (item: CotizacionEquipoItem) => {
    setEditingItem(item)
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setEditingItem(undefined)
  }

  const handleItemCreated = (item: CotizacionEquipoItem) => {
    onCreated(item)
    handleCloseCreateModal()
  }

  const handleItemUpdated = (item: CotizacionEquipoItem) => {
    onUpdated(item)
    handleCloseCreateModal()
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          'border rounded-lg transition-all',
          isOpen ? 'border-orange-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
        )}>
          {/* Header Compacto */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none group">
              {/* Icono + Chevron */}
              <ChevronRight className={cn(
                'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
                isOpen && 'rotate-90'
              )} />
              <Package className={cn(
                'h-4 w-4 flex-shrink-0',
                isOpen ? 'text-orange-600' : 'text-gray-400'
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
                    className="text-sm font-medium bg-transparent border-b border-orange-400 focus:outline-none w-full max-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900 truncate block">
                    {equipo.nombre}
                  </span>
                )}
              </div>

              {/* Stats inline */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  {equipo.items.length} items
                </Badge>
                <span className="text-gray-300">|</span>
                <span className="font-mono">{formatCurrency(equipo.subtotalInterno)}</span>
                <span className="text-gray-300">→</span>
                <span className="font-mono text-green-600 font-medium">{formatCurrency(equipo.subtotalCliente)}</span>
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
              {!isLocked && (
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
              )}
            </div>
          </CollapsibleTrigger>

          {/* Móvil stats cuando cerrado */}
          {!isOpen && (
            <div className="sm:hidden px-3 pb-2 pt-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{equipo.items.length} items</span>
                <span className="font-mono text-green-600 font-medium">{formatCurrency(equipo.subtotalCliente)}</span>
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
                  {!isLocked && (
                    <>
                      <Button
                        onClick={handleOpenCreateModal}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Nuevo
                      </Button>
                      <Button
                        onClick={() => setShowMultiAddModal(true)}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        Catálogo
                      </Button>
                      <Button
                        onClick={() => setShowExcelModal(true)}
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Excel
                      </Button>
                    </>
                  )}
                  {equipo.items.length > 0 && (
                    <Button
                      onClick={handleExportExcel}
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      title="Exportar a Excel"
                    >
                      <FileDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista de Items */}
              <div className="p-2">
                {equipo.items.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">Sin equipos en este grupo</p>
                    {!isLocked && (
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <Button
                          onClick={handleOpenCreateModal}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Nuevo
                        </Button>
                        <Button
                          onClick={() => setShowMultiAddModal(true)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Catálogo
                        </Button>
                        <Button
                          onClick={() => setShowExcelModal(true)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Importar Excel
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <CotizacionEquipoItemTable
                    items={equipo.items}
                    onDeleted={onDeleted}
                    onUpdated={onUpdated}
                    onEdit={handleOpenEditModal}
                    isLocked={isLocked}
                    moneda={moneda}
                  />
                )}
              </div>

              {/* Footer móvil con totales */}
              {equipo.items.length > 0 && (
                <div className="sm:hidden px-3 py-2 border-t bg-gray-100/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatCurrency(equipo.subtotalInterno)}</span>
                      <span className="text-gray-300">→</span>
                      <span className="font-mono text-green-600 font-medium">{formatCurrency(equipo.subtotalCliente)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Modal para agregar múltiples items */}
      <CotizacionEquipoMultiAddModal
        isOpen={showMultiAddModal}
        onClose={() => setShowMultiAddModal(false)}
        cotizacionEquipoId={equipo.id}
        onItemsCreated={handleMultipleItemsCreated}
      />

      {/* Modal para importar desde Excel */}
      <CotizacionEquipoItemImportExcelModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        equipo={equipo}
        cotizacionId={cotizacionId}
        cotizacionCodigo={cotizacionCodigo}
        onItemsCreated={handleExcelItemsCreated}
      />

      {/* Modal para crear/editar item manualmente */}
      <CotizacionEquipoItemCreateModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        equipo={{ id: equipo.id, nombre: equipo.nombre }}
        item={editingItem}
        onItemCreated={handleItemCreated}
        onItemUpdated={handleItemUpdated}
      />

      {/* Delete confirmation dialog */}
      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDeletedGrupo()
          setShowDeleteDialog(false)
        }}
        title="¿Eliminar grupo de equipos?"
        description="Esta acción eliminará permanentemente el grupo y todos sus items."
      />
    </>
  )
}
