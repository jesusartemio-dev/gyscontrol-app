'use client'

import { useEffect, useState } from 'react'
import {
  getCategoriasGasto,
  createCategoriaGasto,
  updateCategoriaGasto,
  deleteCategoriaGasto
} from '@/lib/services/categoriaGasto'
import { toast } from 'sonner'
import type { CategoriaGasto } from '@/types'
import { exportarCategoriasGastoAExcel } from '@/lib/utils/categoriaGastoExcel'
import { leerCategoriasGastoDesdeExcel, validarCategoriasGasto } from '@/lib/utils/categoriaGastoImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Icons
import { Receipt, Plus, Pencil, Trash2, Loader2, Search, X } from 'lucide-react'

export default function CategoriasGastoPage() {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaGasto | null>(null)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaGasto | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Filtrar categorías
  const categoriasFiltradas = categorias.filter(cat => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const nombreMatch = cat.nombre.toLowerCase().includes(term)
    const descripcionMatch = cat.descripcion?.toLowerCase().includes(term) || false
    return nombreMatch || descripcionMatch
  })

  const cargarCategorias = async () => {
    try {
      setLoading(true)
      const data = await getCategoriasGasto()
      setCategorias(data)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      toast.error('Error al cargar las categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const resetForm = () => {
    setNombre('')
    setDescripcion('')
    setEditingCategoria(null)
  }

  const openEditModal = (categoria: CategoriaGasto) => {
    setEditingCategoria(categoria)
    setNombre(categoria.nombre)
    setDescripcion(categoria.descripcion || '')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      if (editingCategoria) {
        const actualizada = await updateCategoriaGasto(editingCategoria.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null
        })
        setCategorias(prev => prev.map(c => c.id === actualizada.id ? actualizada : c))
        toast.success('Categoría actualizada')
      } else {
        const nueva = await createCategoriaGasto({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null
        })
        setCategorias(prev => [nueva, ...prev])
        toast.success('Categoría creada')
      }
      setModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar categoría:', error)
      toast.error('Error al guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmarEliminar = (categoria: CategoriaGasto) => {
    setCategoriaAEliminar(categoria)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!categoriaAEliminar) return
    setEliminando(true)
    try {
      await deleteCategoriaGasto(categoriaAEliminar.id)
      setCategorias(prev => prev.filter(c => c.id !== categoriaAEliminar.id))
      toast.success('Categoría eliminada')
      setDeleteDialogOpen(false)
      setCategoriaAEliminar(null)
    } catch (error: any) {
      console.error('Error al eliminar categoría:', error)
      toast.error(error.message || 'Error al eliminar la categoría')
    } finally {
      setEliminando(false)
    }
  }

  const handleExportar = () => {
    try {
      exportarCategoriasGastoAExcel(categorias)
      toast.success('Categorías exportadas exitosamente')
    } catch (err) {
      toast.error('Error al exportar categorías')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)

    try {
      const datos = await leerCategoriasGastoDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores, duplicados } = validarCategoriasGasto(datos, nombresExistentes)

      if (errores.length > 0) {
        toast.error(`Errores: ${errores.join(', ')}`)
        return
      }

      if (duplicados.length > 0) {
        toast.warning(`Categorías duplicadas omitidas: ${duplicados.join(', ')}`)
      }

      if (nuevas.length === 0) {
        toast.info('No hay categorías nuevas para importar')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaGasto({
        nombre: c.nombre,
        descripcion: c.descripcion || null
      })))
      toast.success(`${nuevas.length} categorías importadas correctamente`)
      cargarCategorias()
    } catch (err) {
      console.error('Error al importar categorías:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Categorías de Gastos</h1>
            </div>
            <Badge variant="secondary" className="font-normal">
              {categorias.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={modalOpen} onOpenChange={(open) => {
              setModalOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategoria ? 'Editar Categoría' : 'Crear Nueva Categoría'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategoria
                      ? 'Modifica los datos de la categoría'
                      : 'Agrega una nueva categoría de gasto al catálogo'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Transporte, Viáticos, EPPs..."
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción opcional de la categoría"
                      rows={3}
                      disabled={saving}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingCategoria ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <BotonesImportExport
              onExportar={handleExportar}
              onImportar={handleImportar}
              importando={importando}
            />
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {searchTerm && categoriasFiltradas.length !== categorias.length && (
            <span className="text-sm text-muted-foreground">
              {categoriasFiltradas.length} de {categorias.length}
            </span>
          )}
        </div>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            {categorias.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay categorías registradas</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primera categoría de gasto
                </p>
                <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear categoría
                </Button>
              </div>
            ) : categoriasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground mb-4">
                  No se encontraron categorías que coincidan con "{searchTerm}"
                </p>
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar búsqueda
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="w-20 py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categoriasFiltradas.map((categoria) => (
                      <tr key={categoria.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3">
                          <span className="text-sm font-medium">{categoria.nombre}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-sm text-muted-foreground">
                            {categoria.descripcion || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => openEditModal(categoria)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleConfirmarEliminar(categoria)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmación de eliminación */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la categoría "{categoriaAEliminar?.nombre}". Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={eliminando}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
