'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getCatalogoCondiciones,
  createCatalogoCondicion,
  updateCatalogoCondicion,
  deleteCatalogoCondicion,
  getCategoriasCondicion,
  createCategoriaCondicion,
  type CatalogoCondicion,
  type CatalogoCondicionItem,
  type CategoriaCondicion
} from '@/lib/services/catalogoCondicion'

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, FileCheck, TrendingUp, Package, Home, Settings, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Search, X } from 'lucide-react'

const TIPOS_CONDICION = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'legal', label: 'Legal' },
  { value: 'operativa', label: 'Operativa' },
  { value: 'financiera', label: 'Financiera' },
]

export default function CondicionesPage() {
  const [condiciones, setCondiciones] = useState<CatalogoCondicion[]>([])
  const [categorias, setCategorias] = useState<CategoriaCondicion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<string>('')
  const [filterTipo, setFilterTipo] = useState<string>('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCondicion, setEditingCondicion] = useState<CatalogoCondicion | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoriaId: '',
    tipo: '',
    items: [] as CatalogoCondicionItem[]
  })

  // New item form
  const [newItemText, setNewItemText] = useState('')
  const [newItemTipo, setNewItemTipo] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [condicionesData, categoriasData] = await Promise.all([
        getCatalogoCondiciones({
          search: search || undefined,
          categoriaId: filterCategoria || undefined,
          tipo: filterTipo || undefined
        }),
        getCategoriasCondicion()
      ])
      setCondiciones(condicionesData)
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
  }, [search, filterCategoria, filterTipo])

  const handleOpenModal = (condicion?: CatalogoCondicion) => {
    if (condicion) {
      setEditingCondicion(condicion)
      setFormData({
        nombre: condicion.nombre,
        descripcion: condicion.descripcion || '',
        categoriaId: condicion.categoriaId || '',
        tipo: condicion.tipo || '',
        items: condicion.items || []
      })
    } else {
      setEditingCondicion(null)
      setFormData({
        nombre: '',
        descripcion: '',
        categoriaId: '',
        tipo: '',
        items: []
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCondicion(null)
    setNewItemText('')
    setNewItemTipo('')
  }

  const handleAddItem = () => {
    if (!newItemText.trim()) return
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          descripcion: newItemText.trim(),
          tipo: newItemTipo || undefined,
          orden: prev.items.length + 1,
          activo: true
        }
      ]
    }))
    setNewItemText('')
    setNewItemTipo('')
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
      if (editingCondicion) {
        await updateCatalogoCondicion(editingCondicion.id, formData)
        toast.success('Condición actualizada')
      } else {
        await createCatalogoCondicion(formData)
        toast.success('Condición creada')
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
    if (!confirm('¿Estás seguro de eliminar esta condición?')) return

    try {
      await deleteCatalogoCondicion(id)
      toast.success('Condición eliminada')
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

  const totalItems = condiciones.reduce((sum, c) => sum + (c._count?.items || c.items?.length || 0), 0)
  const avgItems = condiciones.length > 0 ? Math.round(totalItems / condiciones.length) : 0

  if (loading && condiciones.length === 0) {
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
                <FileCheck className="h-4 w-4" />
                Catálogo de Condiciones
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <FileCheck className="h-7 w-7 text-blue-600" />
              Catálogo de Condiciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona condiciones reutilizables para cotizaciones
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Condición
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
              <div className="text-2xl font-bold">{condiciones.length}</div>
              <p className="text-xs text-muted-foreground">Grupos de condiciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
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
              placeholder="Buscar condiciones..."
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
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS_CONDICION.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {condiciones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No hay condiciones registradas.
                  <br />
                  <Button variant="link" onClick={() => handleOpenModal()} className="p-0 h-auto">
                    Crear la primera condición
                  </Button>
                </p>
              </CardContent>
            </Card>
          ) : (
            condiciones.map(condicion => (
              <Card key={condicion.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(condicion.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedItems.has(condicion.id) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{condicion.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {condicion._count?.items || condicion.items?.length || 0} items
                        </Badge>
                        {condicion.categoria && (
                          <Badge variant="secondary" className="text-xs">
                            {condicion.categoria.nombre}
                          </Badge>
                        )}
                        {condicion.tipo && (
                          <Badge className="text-xs">
                            {condicion.tipo}
                          </Badge>
                        )}
                      </div>
                      {condicion.descripcion && (
                        <p className="text-sm text-muted-foreground mt-1">{condicion.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(condicion)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(condicion.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {expandedItems.has(condicion.id) && condicion.items && condicion.items.length > 0 && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <ul className="space-y-2">
                      {condicion.items.map((item, idx) => (
                        <li key={item.id || idx} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[24px]">{idx + 1}.</span>
                          <span className="flex-1">{item.descripcion}</span>
                          {item.tipo && (
                            <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                          )}
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
              {editingCondicion ? 'Editar Condición' : 'Nueva Condición'}
            </DialogTitle>
            <DialogDescription>
              {editingCondicion
                ? 'Modifica los datos de la condición'
                : 'Crea un nuevo grupo de condiciones reutilizables'}
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
                  placeholder="Ej: Condiciones de Pago"
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

              <div>
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

              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, tipo: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONDICION.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Items de condición *</Label>

              {/* Add new item */}
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Texto de la condición..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                />
                <Select value={newItemTipo} onValueChange={setNewItemTipo}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONDICION.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      {item.tipo && (
                        <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                      )}
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
                  No hay items agregados. Agrega al menos una condición.
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
              {editingCondicion ? 'Guardar cambios' : 'Crear condición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
