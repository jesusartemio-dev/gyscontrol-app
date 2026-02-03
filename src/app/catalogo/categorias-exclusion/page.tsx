'use client'

import { useEffect, useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Plus,
  FolderOpen,
  Loader2,
  Search,
  X
} from 'lucide-react'

export default function CategoriasExclusionPage() {
  const [categorias, setCategorias] = useState<CategoriaExclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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

  const filteredCategorias = categorias.filter(cat =>
    cat.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-[250px]" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Categorías de Exclusión</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {categorias.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva
          </Button>
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
          />
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorías..."
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

        {searchTerm && (
          <span className="text-sm text-muted-foreground">
            {filteredCategorias.length} de {categorias.length}
          </span>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {filteredCategorias.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {categorias.length === 0 ? 'No hay categorías' : 'Sin resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {categorias.length === 0
                  ? 'Comienza agregando tu primera categoría de exclusión'
                  : `No hay categorías que coincidan con "${searchTerm}"`}
              </p>
              {categorias.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva categoría
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar búsqueda
                </Button>
              )}
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
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                      Exclusiones
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCategorias.map(cat => (
                    <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3">
                        <span className="font-medium text-sm">{cat.nombre}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-muted-foreground">
                          {cat.descripcion || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {cat._count?.catalogoExclusiones || 0}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={cat.activo ? 'default' : 'secondary'} className="text-xs">
                          {cat.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>
              Crea una nueva categoría para organizar las exclusiones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Técnica, Comercial..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
