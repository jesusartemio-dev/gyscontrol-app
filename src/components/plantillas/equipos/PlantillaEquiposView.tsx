'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import {
  Search,
  Package,
  Trash2,
  Edit,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PlantillaEquipoItemIndependiente {
  id: string
  plantillaEquipoId: string
  catalogoEquipoId?: string
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
  catalogoEquipo?: {
    id: string
    codigo: string
    descripcion: string
    marca: string
    precioVenta: number
  }
}

interface PlantillaEquiposViewProps {
  items: PlantillaEquipoItemIndependiente[]
  plantillaId: string
  onDeleteItem: (itemId: string) => void
  onRefresh: () => void
  onUpdateItem: (itemId: string, updates: Partial<PlantillaEquipoItemIndependiente>) => void
}

export default function PlantillaEquiposView({
  items,
  plantillaId,
  onDeleteItem,
  onRefresh,
  onUpdateItem
}: PlantillaEquiposViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<PlantillaEquipoItemIndependiente | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(1)
  const [showEditModal, setShowEditModal] = useState(false)

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.categoria))]
    return uniqueCategories.sort()
  }, [items])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marca.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [items, searchTerm, categoryFilter])

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = amount ?? 0
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(safeAmount)
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/plantillas/equipos/${plantillaId}/items/${itemId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar item')
      toast.success('Equipo eliminado')
      onDeleteItem(itemId)
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Error al eliminar el equipo')
    }
  }

  const openEditModal = (item: PlantillaEquipoItemIndependiente) => {
    setEditingItem(item)
    setEditQuantity(item.cantidad)
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || editQuantity < 1) {
      toast.error('Cantidad debe ser al menos 1')
      return
    }

    try {
      const response = await fetch(`/api/plantillas/equipos/${plantillaId}/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: editQuantity })
      })
      if (!response.ok) throw new Error('Error al actualizar item')
      toast.success('Cantidad actualizada')
      setShowEditModal(false)
      onUpdateItem(editingItem.id, {
        cantidad: editQuantity,
        costoInterno: editQuantity * editingItem.precioInterno,
        costoCliente: editQuantity * editingItem.precioCliente
      })
      setEditingItem(null)
    } catch (err) {
      console.error('Error updating item:', err)
      toast.error('Error al actualizar')
    }
  }

  const hasFilters = searchTerm || categoryFilter !== 'all'

  return (
    <div className="space-y-3">
      {/* Toolbar compacto */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchTerm(''); setCategoryFilter('all') }}
              className="h-8 px-2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Count */}
        <span className="text-xs text-muted-foreground">
          {filteredItems.length} de {items.length}
        </span>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-gray-50/50">
          <Package className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'Sin equipos' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">Código</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Descripción</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-28">Categoría</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">Marca</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Cant.</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 w-24">P.Unit</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 w-24">Total</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-blue-50/50 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-gray-700">{item.codigo}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="line-clamp-1" title={item.descripcion}>
                        {item.descripcion}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {item.categoria}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {item.marca}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-medium">{item.cantidad}</span>
                      <span className="text-gray-400 ml-1">{item.unidad}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600">
                      {formatCurrency(item.precioCliente)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-green-600">
                      {formatCurrency(item.costoCliente)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                        >
                          <Edit className="h-3 w-3 text-gray-500" />
                        </Button>
                        <DeleteAlertDialog
                          onConfirm={() => handleDeleteItem(item.id)}
                          title="Eliminar equipo"
                          description={`¿Eliminar "${item.descripcion}" de la plantilla?`}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-gray-500" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer con totales */}
              <tfoot>
                <tr className="bg-gray-100/80 border-t-2">
                  <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-700">
                    Total ({filteredItems.length} items):
                  </td>
                  <td className="px-3 py-2 text-center font-medium">
                    {filteredItems.reduce((sum, item) => sum + item.cantidad, 0)}
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-green-700">
                    {formatCurrency(filteredItems.reduce((sum, item) => sum + item.costoCliente, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Cantidad</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity" className="text-sm">Cantidad</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                className="h-9"
              />
              {editingItem && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {editingItem.descripcion}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
