// ===================================================
// 📁 Archivo: ProductoList.tsx
// 📌 Ubicación: src/components/catalogo/productos/
// 🔧 Descripción: Lista de productos con filtros, búsqueda y acciones CRUD
// 🎨 Mejoras UX/UI: Framer Motion, Shadcn/UI, Estados de carga
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ProductoService } from '@/lib/services/producto'
import type { Producto } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Package,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Tag,
  DollarSign
} from 'lucide-react'

// 📋 Props del componente
interface ProductoListProps {
  onEdit?: (producto: Producto) => void
  onView?: (producto: Producto) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  selectable?: boolean
  onSelect?: (productos: Producto[]) => void
}

// 🎨 Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

/**
 * 📦 Componente ProductoList
 * Lista de productos con funcionalidades completas
 */
export default function ProductoList({
  onEdit,
  onView,
  onDelete,
  showActions = true,
  selectable = false,
  onSelect
}: ProductoListProps) {
  // 🔄 Estados del componente
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProductos, setSelectedProductos] = useState<Producto[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productoToDelete, setProductoToDelete] = useState<string | null>(null)
  
  // 🔍 Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all')
  const [activoFilter, setActivoFilter] = useState<string>('all')
  const [categorias, setCategorias] = useState<string[]>([])
  
  // 📊 Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProductos, setTotalProductos] = useState(0)
  const itemsPerPage = 10

  // 🚀 Cargar productos
  const loadProductos = async () => {
    try {
      setLoading(true)
      const filters = {
        search: searchTerm || undefined,
        categoria: categoriaFilter !== 'all' ? categoriaFilter : undefined,
        activo: activoFilter !== 'all' ? activoFilter === 'true' : undefined,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'nombre',
        sortOrder: 'asc' as const
      }
      
      const result = await ProductoService.getProductos(filters)
      setProductos(result.productos)
      setTotalPages(result.pagination.pages)
      setTotalProductos(result.pagination.total)
      
      // 📈 Obtener categorías únicas
      if (result.categorias) {
        setCategorias(result.categorias)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Efectos
  useEffect(() => {
    loadProductos()
  }, [searchTerm, categoriaFilter, activoFilter, currentPage])

  // 🗑️ Manejar eliminación
  const handleDelete = async () => {
    if (!productoToDelete) return
    
    try {
      await ProductoService.deleteProducto(productoToDelete)
      toast.success('Producto eliminado exitosamente')
      loadProductos()
      onDelete?.(productoToDelete)
    } catch (error) {
      console.error('Error eliminando producto:', error)
      toast.error('Error al eliminar producto')
    } finally {
      setDeleteDialogOpen(false)
      setProductoToDelete(null)
    }
  }

  // ✅ Manejar selección
  const handleSelect = (producto: Producto, checked: boolean) => {
    let newSelected: Producto[]
    if (checked) {
      newSelected = [...selectedProductos, producto]
    } else {
      newSelected = selectedProductos.filter(p => p.id !== producto.id)
    }
    setSelectedProductos(newSelected)
    onSelect?.(newSelected)
  }

  // 🎨 Obtener badge de estado
  const getEstadoBadge = (activo: boolean) => {
    return activo ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Inactivo
      </Badge>
    )
  }

  // 🎨 Renderizado
  return (
    <div className="space-y-6">
      {/* 📊 Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Productos</h2>
          </div>
          <Badge variant="outline">
            {totalProductos} productos
          </Badge>
        </div>
        
        <Button onClick={loadProductos} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* 🔍 Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 🔍 Búsqueda */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </label>
              <Input
                placeholder="Código, nombre, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 📂 Categoría */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categoría
              </label>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={activoFilter} onValueChange={setActivoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 🔄 Acciones */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Acciones</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setCategoriaFilter('all')
                    setActivoFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Tabla de productos */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando productos...</span>
            </div>
          ) : productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay productos</h3>
              <p className="text-sm">No se encontraron productos con los filtros aplicados.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectable && <TableHead className="w-12">Sel.</TableHead>}
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Estado</TableHead>
                    {showActions && <TableHead className="w-20">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {productos.map((producto) => (
                      <motion.tr
                        key={producto.id}
                        variants={itemVariants}
                        className="group hover:bg-muted/50"
                      >
                        {selectable && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProductos.some(p => p.id === producto.id)}
                              onChange={(e) => handleSelect(producto, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-sm">
                          {producto.codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                          {producto.nombre}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {producto.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {producto.precio.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>{producto.unidad}</TableCell>
                        <TableCell>{getEstadoBadge(producto.activo)}</TableCell>
                        {showActions && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onView && (
                                  <DropdownMenuItem onClick={() => onView(producto)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver
                                  </DropdownMenuItem>
                                )}
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(producto)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setProductoToDelete(producto.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* 📄 Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({totalProductos} productos)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* 🗑️ Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}