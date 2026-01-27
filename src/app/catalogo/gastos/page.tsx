'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCatalogoGastos,
  createCatalogoGasto,
  updateCatalogoGasto,
  deleteCatalogoGasto
} from '@/lib/services/catalogoGasto'
import { getCategoriasGasto } from '@/lib/services/categoriaGasto'
import { toast } from 'sonner'
import type { CatalogoGasto, CategoriaGasto } from '@/types'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'

// Icons
import { ChevronRight, Receipt, Plus, Pencil, Search, Filter, DollarSign, Loader2 } from 'lucide-react'

// Animations
import { motion } from 'framer-motion'

// Utils
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(value)
}

export default function CatalogoGastosPage() {
  const router = useRouter()
  const [gastos, setGastos] = useState<CatalogoGasto[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState<CatalogoGasto | null>(null)
  const [saving, setSaving] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<string>('all')

  // Form state
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioInterno, setPrecioInterno] = useState(0)
  const [margen, setMargen] = useState(0.2)
  const [precioVenta, setPrecioVenta] = useState(0)
  const [estado, setEstado] = useState('activo')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [gastosData, categoriasData] = await Promise.all([
        getCatalogoGastos(),
        getCategoriasGasto()
      ])
      setGastos(gastosData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Auto-calculate precioVenta when precioInterno or margen changes
  useEffect(() => {
    const calculado = precioInterno * (1 + margen)
    setPrecioVenta(Math.round(calculado * 100) / 100)
  }, [precioInterno, margen])

  const resetForm = () => {
    setCodigo('')
    setDescripcion('')
    setCategoriaId('')
    setCantidad(1)
    setPrecioInterno(0)
    setMargen(0.2)
    setPrecioVenta(0)
    setEstado('activo')
    setEditingGasto(null)
  }

  const openEditModal = (gasto: CatalogoGasto) => {
    setEditingGasto(gasto)
    setCodigo(gasto.codigo)
    setDescripcion(gasto.descripcion)
    setCategoriaId(gasto.categoriaId)
    setCantidad(gasto.cantidad)
    setPrecioInterno(gasto.precioInterno)
    setMargen(gasto.margen)
    setPrecioVenta(gasto.precioVenta)
    setEstado(gasto.estado)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim() || !descripcion.trim() || !categoriaId) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const payload = {
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        categoriaId,
        cantidad,
        precioInterno,
        margen,
        precioVenta,
        estado
      }

      if (editingGasto) {
        const actualizado = await updateCatalogoGasto(editingGasto.id, payload)
        setGastos(prev => prev.map(g => g.id === actualizado.id ? actualizado : g))
        toast.success('Gasto actualizado')
      } else {
        const nuevo = await createCatalogoGasto(payload)
        setGastos(prev => [nuevo, ...prev])
        toast.success('Gasto creado')
      }
      setModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Error al guardar gasto:', error)
      toast.error(error.message || 'Error al guardar el gasto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCatalogoGasto(id)
      setGastos(prev => prev.filter(g => g.id !== id))
      toast.success('Gasto eliminado')
    } catch (error: any) {
      console.error('Error al eliminar gasto:', error)
      toast.error(error.message || 'Error al eliminar el gasto')
    }
  }

  // Filtered gastos
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(gasto => {
      const matchSearch = searchTerm === '' ||
        gasto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gasto.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategoria = filterCategoria === 'all' || gasto.categoriaId === filterCategoria
      return matchSearch && matchCategoria
    })
  }, [gastos, searchTerm, filterCategoria])

  // Stats
  const totalGastos = gastos.length
  const totalActivos = gastos.filter(g => g.estado === 'activo').length

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb Navigation */}
      <motion.nav
        className="flex items-center space-x-2 text-sm text-muted-foreground"
        variants={itemVariants}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/catalogo')}
          className="h-auto p-0 font-normal"
        >
          Catálogo
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Gastos</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Catálogo de Gastos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los gastos predefinidos para cotizaciones y proyectos
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingGasto ? 'Editar Gasto' : 'Crear Nuevo Gasto'}
              </DialogTitle>
              <DialogDescription>
                {editingGasto
                  ? 'Modifica los datos del gasto'
                  : 'Agrega un nuevo gasto al catálogo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="GASTO-001"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoriaId">Categoría *</Label>
                  <Select value={categoriaId} onValueChange={setCategoriaId} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del gasto..."
                  rows={2}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precioInterno">Precio Interno *</Label>
                  <Input
                    id="precioInterno"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioInterno}
                    onChange={(e) => setPrecioInterno(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margen">Margen (%)</Label>
                  <Input
                    id="margen"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={margen}
                    onChange={(e) => setMargen(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioVenta">Precio Venta (calculado)</Label>
                  <Input
                    id="precioVenta"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={estado} onValueChange={setEstado} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingGasto ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Gastos</p>
                <p className="text-2xl font-bold">{totalGastos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gastos Activos</p>
                <p className="text-2xl font-bold text-green-600">{totalActivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex flex-col sm:flex-row gap-4" variants={itemVariants}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Gastos</span>
              <Badge variant="secondary">
                {gastosFiltrados.length} de {totalGastos}
              </Badge>
            </CardTitle>
            <CardDescription>
              Gastos predefinidos para usar en cotizaciones y proyectos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gastosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {gastos.length === 0 ? 'No hay gastos registrados' : 'No se encontraron resultados'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {gastos.length === 0
                    ? 'Comienza agregando tu primer gasto al catálogo'
                    : 'Intenta con otros términos de búsqueda'}
                </p>
                {gastos.length === 0 && (
                  <Button onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer gasto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">P. Interno</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">P. Venta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastosFiltrados.map((gasto) => (
                      <TableRow key={gasto.id}>
                        <TableCell className="font-mono text-sm">{gasto.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={gasto.descripcion}>
                          {gasto.descripcion}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {gasto.categoria?.nombre || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(gasto.precioInterno)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(gasto.margen * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(gasto.precioVenta)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={gasto.estado === 'activo' ? 'default' : 'secondary'}>
                            {gasto.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(gasto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteAlertDialog
                              onConfirm={() => handleDelete(gasto.id)}
                              title="¿Eliminar gasto?"
                              description={`Se eliminará el gasto "${gasto.codigo}". Esta acción no se puede deshacer.`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
