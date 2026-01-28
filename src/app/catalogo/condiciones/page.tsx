'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getCatalogoCondiciones,
  getCategoriasCondicion,
  createCatalogoCondicion,
  updateCatalogoCondicion,
  deleteCatalogoCondicion,
  createCategoriaCondicion,
  type CatalogoCondicion,
  type CategoriaCondicion
} from '@/lib/services/catalogoCondicion'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  ArrowLeft,
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  FolderPlus
} from 'lucide-react'

const TIPOS_CONDICION = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'pago', label: 'Pago' },
]

export default function CatalogoCondicionesPage() {
  const router = useRouter()
  const [condiciones, setCondiciones] = useState<CatalogoCondicion[]>([])
  const [categorias, setCategorias] = useState<CategoriaCondicion[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [tipoFiltro, setTipoFiltro] = useState('__ALL__')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [selectedCondicion, setSelectedCondicion] = useState<CatalogoCondicion | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    descripcion: '',
    categoriaId: '',
    tipo: '',
  })
  const [nuevaCategoria, setNuevaCategoria] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [condicionesData, categoriasData] = await Promise.all([
        getCatalogoCondiciones(),
        getCategoriasCondicion()
      ])
      setCondiciones(condicionesData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const condicionesFiltradas = useMemo(() => {
    return condiciones.filter(cond => {
      const matchSearch = searchTerm === '' ||
        cond.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cond.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      const matchCategoria = categoriaFiltro === '__ALL__' || cond.categoriaId === categoriaFiltro
      const matchTipo = tipoFiltro === '__ALL__' || cond.tipo === tipoFiltro

      return matchSearch && matchCategoria && matchTipo
    })
  }, [condiciones, searchTerm, categoriaFiltro, tipoFiltro])

  const handleCreate = async () => {
    if (!formData.descripcion.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }

    setSaving(true)
    try {
      await createCatalogoCondicion({
        descripcion: formData.descripcion,
        categoriaId: formData.categoriaId || undefined,
        tipo: formData.tipo || undefined,
      })
      toast.success('Condición creada correctamente')
      setShowCreateModal(false)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error('Error creando condición:', error)
      toast.error('Error al crear la condición')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedCondicion || !formData.descripcion.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }

    setSaving(true)
    try {
      await updateCatalogoCondicion(selectedCondicion.id, {
        descripcion: formData.descripcion,
        categoriaId: formData.categoriaId || undefined,
        tipo: formData.tipo || undefined,
      })
      toast.success('Condición actualizada correctamente')
      setShowEditModal(false)
      setSelectedCondicion(null)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error('Error actualizando condición:', error)
      toast.error('Error al actualizar la condición')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCondicion) return

    setSaving(true)
    try {
      await deleteCatalogoCondicion(selectedCondicion.id)
      toast.success('Condición eliminada correctamente')
      setShowDeleteDialog(false)
      setSelectedCondicion(null)
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando condición:', error)
      toast.error('Error al eliminar la condición')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }

    setSaving(true)
    try {
      await createCategoriaCondicion({ nombre: nuevaCategoria.trim() })
      toast.success('Categoría creada correctamente')
      setShowCategoriaModal(false)
      setNuevaCategoria('')
      const categoriasData = await getCategoriasCondicion()
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error creando categoría:', error)
      toast.error('Error al crear la categoría')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (condicion: CatalogoCondicion) => {
    setSelectedCondicion(condicion)
    setFormData({
      descripcion: condicion.descripcion,
      categoriaId: condicion.categoriaId || '',
      tipo: condicion.tipo || '',
    })
    setShowEditModal(true)
  }

  const openDeleteDialog = (condicion: CatalogoCondicion) => {
    setSelectedCondicion(condicion)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      descripcion: '',
      categoriaId: '',
      tipo: '',
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Catálogo de Condiciones
            </h1>
            <p className="text-muted-foreground">
              {condiciones.length} condiciones en el catálogo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoriaModal(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateModal(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Condición
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todas las categorías</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todos los tipos</SelectItem>
            {TIPOS_CONDICION.map(tipo => (
              <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[150px]">Categoría</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {condicionesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron condiciones
                </TableCell>
              </TableRow>
            ) : (
              condicionesFiltradas.map(cond => (
                <TableRow key={cond.id}>
                  <TableCell className="font-mono text-sm">{cond.codigo}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2">{cond.descripcion}</p>
                  </TableCell>
                  <TableCell>
                    {cond.categoria ? (
                      <Badge variant="outline">{cond.categoria.nombre}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {cond.tipo ? (
                      <Badge variant="secondary">{cond.tipo}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cond.activo ? 'default' : 'secondary'}>
                      {cond.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(cond)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(cond)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Condición</DialogTitle>
            <DialogDescription>
              Agrega una nueva condición al catálogo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Escribe la condición..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONDICION.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Condición
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Condición</DialogTitle>
            <DialogDescription>
              Modifica los datos de la condición
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Escribe la condición..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONDICION.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar condición?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La condición será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Categoria Modal */}
      <Dialog open={showCategoriaModal} onOpenChange={setShowCategoriaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>
              Crea una nueva categoría para organizar las condiciones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la categoría *</Label>
              <Input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                placeholder="Ej: Comercial, Técnica, Entrega..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoriaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategoria} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
