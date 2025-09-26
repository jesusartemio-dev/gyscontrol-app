'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Grid3X3,
  List,
  Search,
  Filter,
  Package,
  DollarSign,
  Trash2,
  Wrench
} from 'lucide-react'
import { toast } from 'sonner'

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
}

type ViewMode = 'table' | 'cards'

export default function PlantillaEquiposView({
  items,
  plantillaId,
  onDeleteItem,
  onRefresh
}: PlantillaEquiposViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')

  // Get unique categories and brands for filters
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.categoria))]
    return uniqueCategories.sort()
  }, [items])

  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(items.map(item => item.marca))]
    return uniqueBrands.sort()
  }, [items])

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marca.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter
      const matchesBrand = brandFilter === 'all' || item.marca === brandFilter

      return matchesSearch && matchesCategory && matchesBrand
    })
  }, [items, searchTerm, categoryFilter, brandFilter])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) return

    try {
      const response = await fetch(`/api/plantillas/equipos/${plantillaId}/items/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar item')

      toast.success('Equipo eliminado exitosamente')
      onDeleteItem(itemId)
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Error al eliminar el equipo')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setBrandFilter('all')
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por código, descripción, categoría o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4 mr-2" />
                Tabla
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cards
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredItems.length} de {items.length} equipos
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {items.length === 0 ? 'No hay equipos' : 'No se encontraron equipos'}
              </h3>
              <p className="text-sm">
                {items.length === 0
                  ? 'Comienza agregando equipos a esta plantilla'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.codigo}</TableCell>
                    <TableCell>{item.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.categoria}</Badge>
                    </TableCell>
                    <TableCell>{item.marca}</TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.precioCliente)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.costoCliente)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    <Badge variant="outline" className="text-xs">
                      {item.categoria}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-sm">{item.descripcion}</p>
                    <p className="text-xs text-muted-foreground">Código: {item.codigo}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Marca:</span>
                    <span className="font-medium">{item.marca}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unidad:</span>
                    <span>{item.unidad}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cantidad:</span>
                    <span className="font-medium">{item.cantidad}</span>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <DollarSign className="h-3 w-3" />
                        Unit.
                      </div>
                      <span className="text-sm">{formatCurrency(item.precioCliente)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-muted-foreground text-xs">Total:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(item.costoCliente)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}