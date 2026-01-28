'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getCatalogoExclusiones,
  getCategoriasExclusion,
  createCatalogoExclusion,
  updateCatalogoExclusion,
  deleteCatalogoExclusion,
  createCategoriaExclusion,
  type CatalogoExclusion,
  type CategoriaExclusion
} from '@/lib/services/catalogoExclusion'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import {
  exportarExclusionesAExcel,
  importarExclusionesDesdeExcel,
  validarExclusionesImportadas
} from '@/lib/utils/exclusionesExcel'

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
  FileX,
  Pencil,
  Trash2,
  Loader2,
  FolderPlus,
  AlertCircle
} from 'lucide-react'

export default function CatalogoExclusionesPage() {
  const router = useRouter()
  const [exclusiones, setExclusiones] = useState<CatalogoExclusion[]>([])
  const [categorias, setCategorias] = useState<CategoriaExclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [erroresImport, setErroresImport] = useState<string[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [selectedExclusion, setSelectedExclusion] = useState<CatalogoExclusion | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    descripcion: '',
    categoriaId: '',
  })
  const [nuevaCategoria, setNuevaCategoria] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [exclusionesData, categoriasData] = await Promise.all([
        getCatalogoExclusiones(),
        getCategoriasExclusion()
      ])
      setExclusiones(exclusionesData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const exclusionesFiltradas = useMemo(() => {
    return exclusiones.filter(excl => {
      const matchSearch = searchTerm === '' ||
        excl.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        excl.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      const matchCategoria = categoriaFiltro === '__ALL__' || excl.categoriaId === categoriaFiltro

      return matchSearch && matchCategoria
    })
  }, [exclusiones, searchTerm, categoriaFiltro])

  const handleCreate = async () => {
    if (!formData.descripcion.trim()) {
      toast.error('La descripcion es obligatoria')
      return
    }

    setSaving(true)
    try {
      await createCatalogoExclusion({
        descripcion: formData.descripcion,
        categoriaId: formData.categoriaId || undefined,
      })
      toast.success('Exclusion creada correctamente')
      setShowCreateModal(false)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error('Error creando exclusion:', error)
      toast.error('Error al crear la exclusion')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedExclusion || !formData.descripcion.trim()) {
      toast.error('La descripcion es obligatoria')
      return
    }

    setSaving(true)
    try {
      await updateCatalogoExclusion(selectedExclusion.id, {
        descripcion: formData.descripcion,
        categoriaId: formData.categoriaId || undefined,
      })
      toast.success('Exclusion actualizada correctamente')
      setShowEditModal(false)
      setSelectedExclusion(null)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error('Error actualizando exclusion:', error)
      toast.error('Error al actualizar la exclusion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedExclusion) return

    setSaving(true)
    try {
      await deleteCatalogoExclusion(selectedExclusion.id)
      toast.success('Exclusion eliminada correctamente')
      setShowDeleteDialog(false)
      setSelectedExclusion(null)
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando exclusion:', error)
      toast.error('Error al eliminar la exclusion')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      toast.error('El nombre de la categoria es obligatorio')
      return
    }

    setSaving(true)
    try {
      await createCategoriaExclusion({ nombre: nuevaCategoria.trim() })
      toast.success('Categoria creada correctamente')
      setShowCategoriaModal(false)
      setNuevaCategoria('')
      const categoriasData = await getCategoriasExclusion()
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error creando categoria:', error)
      toast.error('Error al crear la categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleExportar = () => {
    try {
      exportarExclusionesAExcel(exclusiones)
      toast.success('Exclusiones exportadas a Excel')
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    setErroresImport([])

    try {
      const datos = await importarExclusionesDesdeExcel(file)
      const codigosExistentes = exclusiones.map(c => c.codigo)

      const { exclusionesValidas, errores } = validarExclusionesImportadas(
        datos,
        categorias,
        codigosExistentes
      )

      if (errores.length > 0) {
        setErroresImport(errores)
        toast.error('Hay errores en el archivo')
        return
      }

      if (exclusionesValidas.length === 0) {
        toast.error('No hay exclusiones validas para importar')
        return
      }

      // Procesar nuevas y actualizaciones
      let creadas = 0
      let actualizadas = 0

      for (const excl of exclusionesValidas) {
        if (excl.esNueva) {
          await createCatalogoExclusion({
            descripcion: excl.descripcion,
            categoriaId: excl.categoriaId
          })
          creadas++
        } else if (excl.codigo) {
          const existente = exclusiones.find(c => c.codigo === excl.codigo)
          if (existente) {
            await updateCatalogoExclusion(existente.id, {
              descripcion: excl.descripcion,
              categoriaId: excl.categoriaId
            })
            actualizadas++
          }
        }
      }

      await cargarDatos()

      const mensaje = []
      if (creadas > 0) mensaje.push(`${creadas} creadas`)
      if (actualizadas > 0) mensaje.push(`${actualizadas} actualizadas`)
      toast.success(`Exclusiones importadas: ${mensaje.join(', ')}`)
    } catch (error) {
      console.error('Error importando:', error)
      toast.error('Error al importar el archivo')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const openEditModal = (exclusion: CatalogoExclusion) => {
    setSelectedExclusion(exclusion)
    setFormData({
      descripcion: exclusion.descripcion,
      categoriaId: exclusion.categoriaId || '',
    })
    setShowEditModal(true)
  }

  const openDeleteDialog = (exclusion: CatalogoExclusion) => {
    setSelectedExclusion(exclusion)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      descripcion: '',
      categoriaId: '',
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
              <FileX className="h-6 w-6" />
              Catalogo de Exclusiones
            </h1>
            <p className="text-muted-foreground">
              {exclusiones.length} exclusiones en el catalogo
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
          />
          <Button variant="outline" onClick={() => setShowCategoriaModal(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nueva Categoria
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateModal(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Exclusion
          </Button>
        </div>
      </div>

      {/* Errores de importacion */}
      {erroresImport.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            Errores de importacion:
          </div>
          <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
            {erroresImport.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
            {erroresImport.length > 10 && <li>... y {erroresImport.length - 10} mas</li>}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErroresImport([])}
            className="mt-2 text-red-600 hover:text-red-700"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por codigo o descripcion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todas las categorias</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Codigo</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead className="w-[150px]">Categoria</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exclusionesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No se encontraron exclusiones
                </TableCell>
              </TableRow>
            ) : (
              exclusionesFiltradas.map(excl => (
                <TableRow key={excl.id}>
                  <TableCell className="font-mono text-sm">{excl.codigo}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2">{excl.descripcion}</p>
                  </TableCell>
                  <TableCell>
                    {excl.categoria ? (
                      <Badge variant="outline">{excl.categoria.nombre}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={excl.activo ? 'default' : 'secondary'}>
                      {excl.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(excl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(excl)}>
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
            <DialogTitle>Nueva Exclusion</DialogTitle>
            <DialogDescription>
              Agrega una nueva exclusion al catalogo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripcion *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Escribe la exclusion..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Exclusion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Exclusion</DialogTitle>
            <DialogDescription>
              Modifica los datos de la exclusion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripcion *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Escribe la exclusion..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
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
            <AlertDialogTitle>Eliminar exclusion?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La exclusion sera eliminada permanentemente.
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
            <DialogTitle>Nueva Categoria</DialogTitle>
            <DialogDescription>
              Crea una nueva categoria para organizar las exclusiones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la categoria *</Label>
              <Input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                placeholder="Ej: Tecnica, Comercial..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoriaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategoria} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
