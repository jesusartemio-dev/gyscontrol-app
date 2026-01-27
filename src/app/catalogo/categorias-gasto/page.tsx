'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCategoriasGasto,
  createCategoriaGasto,
  updateCategoriaGasto,
  deleteCategoriaGasto
} from '@/lib/services/categoriaGasto'
import { toast } from 'sonner'
import type { CategoriaGasto } from '@/types'

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
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'

// Icons
import { ChevronRight, Receipt, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

// Animations
import { motion } from 'framer-motion'

export default function CategoriasGastoPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaGasto | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

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

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoriaGasto(id)
      setCategorias(prev => prev.filter(c => c.id !== id))
      toast.success('Categoría eliminada')
    } catch (error: any) {
      console.error('Error al eliminar categoría:', error)
      toast.error(error.message || 'Error al eliminar la categoría')
    }
  }

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
        <span className="font-medium text-foreground">Categorías de Gastos</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            Categorías de Gastos
          </h1>
          <p className="text-muted-foreground">
            Gestiona las categorías para organizar tus gastos de proyectos
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
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
      </motion.div>

      {/* Stats Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Categorías</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Categorías</span>
              <Badge variant="secondary">
                {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Administra las categorías de gastos para tus cotizaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay categorías registradas</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primera categoría de gasto
                </p>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera categoría
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoria.descripcion || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(categoria)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DeleteAlertDialog
                            onConfirm={() => handleDelete(categoria.id)}
                            title="¿Eliminar categoría?"
                            description={`Se eliminará la categoría "${categoria.nombre}". Esta acción no se puede deshacer.`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
