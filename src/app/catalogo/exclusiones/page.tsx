'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getCatalogoExclusiones,
  createCatalogoExclusion,
  updateCatalogoExclusion,
  deleteCatalogoExclusion,
  getCategoriasExclusion,
  type CatalogoExclusion,
  type CatalogoExclusionItem,
  type CategoriaExclusion
} from '@/lib/services/catalogoExclusion'

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, FileText, TrendingUp, Package, Home, Settings, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Search, X } from 'lucide-react'

export default function ExclusionesPage() {
  const [exclusiones, setExclusiones] = useState<CatalogoExclusion[]>([])
  const [categorias, setCategorias] = useState<CategoriaExclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<string>('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExclusion, setEditingExclusion] = useState<CatalogoExclusion | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoriaId: '',
    items: [] as CatalogoExclusionItem[]
  })

  // New item form
  const [newItemText, setNewItemText] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [exclusionesData, categoriasData] = await Promise.all([
        getCatalogoExclusiones({
          search: search || undefined,
          categoriaId: filterCategoria || undefined
        }),
        getCategoriasExclusion()
      ])
      setExclusiones(exclusionesData)
      setCategorias(categoriasData)
    } catch (error) {
      toast.error('Error al cargar datos')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [search, filterCategoria])

  const handleOpenModal = (exclusion?: CatalogoExclusion) => {
    if (exclusion) {
      setEditingExclusion(exclusion)
      setFormData({
        nombre: exclusion.nombre,
        descripcion: exclusion.descripcion || '',
        categoriaId: exclusion.categoriaId || '',
        items: exclusion.items || []
      })
    } else {
      setEditingExclusion(null)
      setFormData({
        nombre: '',
        descripcion: '',
        categoriaId: '',
        items: []
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingExclusion(null)
    setNewItemText('')
  }

  const handleAddItem = () => {
    if (!newItemText.trim()) return
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          descripcion: newItemText.trim(),
          orden: prev.items.length + 1,
          activo: true
        }
      ]
    }))
    setNewItemText('')
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (formData.items.length === 0) {
      toast.error('Debe agregar al menos un item')
      return
    }

    try {
      setSaving(true)
      if (editingExclusion) {
        await updateCatalogoExclusion(editingExclusion.id, formData)
        toast.success('Exclusión actualizada')
      } else {
        await createCatalogoExclusion(formData)
        toast.success('Exclusión creada')
      }
      handleCloseModal()
      cargarDatos()
    } catch (error) {
      toast.error('Error al guardar')
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta exclusión?')) return

    try {
      await deleteCatalogoExclusion(id)
      toast.success('Exclusión eliminada')
      cargarDatos()
    } catch (error) {
      toast.error('Error al eliminar')
      console.error('Error:', error)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalItems = exclusiones.reduce((sum, e) => sum + (e._count?.items || e.items?.length || 0), 0)
  const avgItems = exclusiones.length > 0 ? Math.round(totalItems / exclusiones.length) : 0

  if (loading && exclusiones.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalogo" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Catálogo de Exclusiones
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="h-7 w-7 text-orange-600" />
              Catálogo de Exclusiones
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona exclusiones reutilizables para cotizaciones
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Exclusión
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exclusiones.length}</div>
              <p className="text-xs text-muted-foreground">Grupos de exclusiones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Total de items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgItems}</div>
              <p className="text-xs text-muted-foreground">Items por grupo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorías</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categorias.length}</div>
              <p className="text-xs text-muted-foreground">Categorías activas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exclusiones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {exclusiones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No hay exclusiones registradas.
                  <br />
                  <Button variant="link" onClick={() => handleOpenModal()} className="p-0 h-auto">
                    Crear la primera exclusión
                  </Button>
                </p>
              </CardContent>
            </Card>
          ) : (
            exclusiones.map(exclusion => (
              <Card key={exclusion.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(exclusion.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedItems.has(exclusion.id) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{exclusion.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {exclusion._count?.items || exclusion.items?.length || 0} items
                        </Badge>
                        {exclusion.categoria && (
                          <Badge variant="secondary" className="text-xs">
                            {exclusion.categoria.nombre}
                          </Badge>
                        )}
                      </div>
                      {exclusion.descripcion && (
                        <p className="text-sm text-muted-foreground mt-1">{exclusion.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(exclusion)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(exclusion.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {expandedItems.has(exclusion.id) && exclusion.items && exclusion.items.length > 0 && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <ul className="space-y-2">
                      {exclusion.items.map((item, idx) => (
                        <li key={item.id || idx} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[24px]">{idx + 1}.</span>
                          <span className="flex-1">{item.descripcion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExclusion ? 'Editar Exclusión' : 'Nueva Exclusión'}
            </DialogTitle>
            <DialogDescription>
              {editingExclusion
                ? 'Modifica los datos de la exclusión'
                : 'Crea un nuevo grupo de exclusiones reutilizables'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombre">Nombre del grupo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Exclusiones Técnicas"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional del grupo"
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, categoriaId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Items de exclusión *</Label>

              {/* Add new item */}
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Texto de la exclusión..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                />
                <Button type="button" onClick={handleAddItem} variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Item list */}
              {formData.items.length > 0 && (
                <div className="border rounded-md divide-y">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2">
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                      <span className="flex-1 text-sm">{item.descripcion}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {formData.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay items agregados. Agrega al menos una exclusión.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingExclusion ? 'Guardar cambios' : 'Crear exclusión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
