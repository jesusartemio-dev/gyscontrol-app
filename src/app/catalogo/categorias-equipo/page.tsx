'use client'

import { useEffect, useState } from 'react'
import {
  getCategoriasEquipo,
  createCategoriaEquipo
} from '@/lib/services/categoriaEquipo'
import { toast } from 'sonner'
import { exportarCategoriasEquipoAExcel } from '@/lib/utils/categoriaEquipoExcel'
import {
  leerCategoriasEquipoDesdeExcel,
  validarCategoriasEquipo
} from '@/lib/utils/categoriaEquipoImportUtils'
import type { CategoriaEquipo } from '@/types'
import CategoriaEquipoForm from '@/components/catalogo/CategoriaEquipoForm'
import CategoriaEquipoList from '@/components/catalogo/CategoriaEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

// Icons
import {
  Package,
  AlertCircle,
  Loader2,
  Search,
  X,
  Plus
} from 'lucide-react'

export default function CategoriasEquipoPage() {
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar categorías por nombre y descripción
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
      const data = await getCategoriasEquipo()
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

  const handleCreated = (nueva: CategoriaEquipo) => {
    setCategorias((prev) => [nueva, ...prev])
    setModalOpen(false)
  }

  const handleUpdated = (actualizada: CategoriaEquipo) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarCategoriasEquipoAExcel(categorias)
      toast.success('Categorías exportadas exitosamente')
    } catch (err) {
      toast.error('Error al exportar categorías')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerCategoriasEquipoDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores: erroresImport } = validarCategoriasEquipo(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaEquipo({
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
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* Search Skeleton */}
        <Skeleton className="h-10 w-full max-w-sm" />
        {/* Table Skeleton */}
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
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Categorías de Equipos</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {categorias.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Agrega una nueva categoría de equipo al catálogo
                </DialogDescription>
              </DialogHeader>
              <CategoriaEquipoForm onCreated={handleCreated} />
            </DialogContent>
          </Dialog>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </div>

      {/* Import Status */}
      {importando && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Importando categorías, por favor espera...
          </AlertDescription>
        </Alert>
      )}

      {/* Import Errors */}
      {errores.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Errores encontrados durante la importación:</p>
              <ul className="list-disc pl-5 space-y-1">
                {errores.map((err, idx) => (
                  <li key={idx} className="text-sm">{err}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de búsqueda y controles */}
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

        <div className="flex items-center gap-2">
          {searchTerm && categoriasFiltradas.length !== categorias.length && (
            <span className="text-sm text-muted-foreground">
              {categoriasFiltradas.length} de {categorias.length}
            </span>
          )}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'card')}>
            <TabsList className="h-9">
              <TabsTrigger value="table" className="text-xs px-3">Tabla</TabsTrigger>
              <TabsTrigger value="card" className="text-xs px-3">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {categorias.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay categorías registradas</h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando tu primera categoría de equipo
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
            <CategoriaEquipoList
              data={categoriasFiltradas}
              onUpdate={handleUpdated}
              onDelete={handleDeleted}
              onRefresh={cargarCategorias}
              viewMode={viewMode}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
