'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getCategoriasExclusion,
  createCategoriaExclusion,
  type CategoriaExclusion
} from '@/lib/services/catalogoExclusion'
import { exportarCategoriasExclusionAExcel } from '@/lib/utils/categoriaExclusionExcel'
import { leerCategoriasExclusionDesdeExcel, validarCategoriasExclusion } from '@/lib/utils/categoriaExclusionImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft,
  Plus,
  FolderOpen,
  Loader2,
  FileX
} from 'lucide-react'

export default function CategoriasExclusionPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<CategoriaExclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const data = await getCategoriasExclusion()
      setCategorias(data)
    } catch (error) {
      console.error('Error cargando categorias:', error)
      toast.error('Error al cargar las categorias')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      await createCategoriaExclusion({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined
      })
      toast.success('Categoria creada correctamente')
      setShowModal(false)
      setFormData({ nombre: '', descripcion: '' })
      cargarDatos()
    } catch (error) {
      console.error('Error creando categoria:', error)
      toast.error('Error al crear la categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleExportar = () => {
    try {
      exportarCategoriasExclusionAExcel(categorias)
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
      const datos = await leerCategoriasExclusionDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores, duplicados } = validarCategoriasExclusion(datos, nombresExistentes)

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

      await Promise.all(nuevas.map(c => createCategoriaExclusion({
        nombre: c.nombre,
        descripcion: c.descripcion || undefined
      })))
      toast.success(`${nuevas.length} categorías importadas correctamente`)
      cargarDatos()
    } catch (err) {
      console.error('Error al importar categorías:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const totalExclusiones = categorias.reduce(
    (sum, cat) => sum + (cat._count?.catalogoExclusiones || 0),
    0
  )

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/catalogo/exclusiones')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              Categorias de Exclusiones
            </h1>
            <p className="text-muted-foreground">
              Organiza las exclusiones del catalogo por categorias
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoria
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Categorias</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileX className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Exclusiones</p>
                <p className="text-2xl font-bold text-orange-600">{totalExclusiones}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileX className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Promedio por Categoria</p>
                <p className="text-2xl font-bold text-blue-600">
                  {categorias.length > 0 ? Math.round(totalExclusiones / categorias.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
          <CardDescription>
            {categorias.length} categorias registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categorias.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay categorias registradas</h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando tu primera categoria
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoria
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-center">Exclusiones</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.descripcion || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {cat._count?.catalogoExclusiones || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.activo ? 'default' : 'secondary'}>
                        {cat.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoria</DialogTitle>
            <DialogDescription>
              Crea una nueva categoria para organizar las exclusiones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Tecnica, Comercial..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripcion opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
