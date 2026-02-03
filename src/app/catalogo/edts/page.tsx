'use client'

import { useEffect, useState } from 'react'
import EdtModal from '@/components/catalogo/EdtModal'
import EdtTableView from '@/components/catalogo/EdtTableView'
import EdtCardView from '@/components/catalogo/EdtCardView'
import { getEdts, createEdt } from '@/lib/services/edt'
import { toast } from 'sonner'
import { exportarEdtsAExcel } from '@/lib/utils/edtExcel'
import {
  leerEdtsDesdeExcel,
  validarEdts
} from '@/lib/utils/edtImportUtils'
import type { Edt } from '@/types'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  FolderOpen,
  Plus,
  AlertCircle,
  Loader2,
  Search,
  X
} from 'lucide-react'

export default function Page() {
  const [edts, setEdts] = useState<Edt[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar EDTs
  const edtsFiltrados = edts.filter(edt => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const nombreMatch = edt.nombre.toLowerCase().includes(term)
    const descripcionMatch = edt.descripcion?.toLowerCase().includes(term) || false
    return nombreMatch || descripcionMatch
  })

  const cargarEdts = async () => {
    try {
      setLoading(true)
      const data = await getEdts()
      setEdts(data)
    } catch (error) {
      console.error('Error al cargar EDTs:', error)
      toast.error('Error al cargar los EDTs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEdts()
  }, [])

  const handleCreated = (nueva: Edt) => {
    setEdts((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: Edt) => {
    setEdts((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setEdts((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarEdtsAExcel(edts)
      toast.success('EDTs exportados exitosamente')
    } catch (err) {
      toast.error('Error al exportar EDTs')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerEdtsDesdeExcel(file)
      const nombresExistentes = edts.map(c => c.nombre)
      const { nuevos, errores: erroresImport } = validarEdts(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      const encontrarFasePorNombre = async (nombreFase: string): Promise<string | undefined> => {
        if (!nombreFase) return undefined
        try {
          const response = await fetch('/api/configuracion/fases-default')
          if (response.ok) {
            const data = await response.json()
            const fase = data.data?.find((f: any) => f.nombre.toLowerCase() === nombreFase.toLowerCase())
            return fase?.id
          }
        } catch (error) {
          console.error('Error buscando fase por defecto:', error)
        }
        return undefined
      }

      await Promise.all(nuevos.map(async (c) => {
        const faseDefaultId = c.fasePorDefecto ? await encontrarFasePorNombre(c.fasePorDefecto) : undefined
        return createEdt({
          nombre: c.nombre,
          descripcion: c.descripcion,
          faseDefaultId
        })
      }))
      toast.success(`${nuevos.length} EDTs importados correctamente`)
      cargarEdts()
    } catch (err) {
      console.error('Error al importar EDTs:', err)
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
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
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
            <FolderOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">EDTs</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {edts.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </div>

      {/* Import Status */}
      {importando && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Importando EDTs, por favor espera...
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

      {/* Create Modal */}
      <EdtModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

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
          {searchTerm && edtsFiltrados.length !== edts.length && (
            <span className="text-sm text-muted-foreground">
              {edtsFiltrados.length} de {edts.length}
            </span>
          )}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'cards')}>
            <TabsList className="h-9">
              <TabsTrigger value="table" className="text-xs px-3">Tabla</TabsTrigger>
              <TabsTrigger value="cards" className="text-xs px-3">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {edts.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay EDTs registrados</h3>
              <p className="text-muted-foreground mb-4">
                Comienza creando tu primer EDT para organizar el catálogo
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear EDT
              </Button>
            </div>
          ) : edtsFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
              <p className="text-muted-foreground mb-4">
                No se encontraron EDTs que coincidan con "{searchTerm}"
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                <X className="h-4 w-4 mr-2" />
                Limpiar búsqueda
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            <EdtTableView
              data={edtsFiltrados}
              onUpdate={handleUpdated}
              onDelete={handleDeleted}
            />
          ) : (
            <EdtCardView
              data={edtsFiltrados}
              onUpdate={handleUpdated}
              onDelete={handleDeleted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
