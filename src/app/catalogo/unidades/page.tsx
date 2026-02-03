'use client'

import { useEffect, useState } from 'react'
import UnidadModal from '@/components/catalogo/UnidadModal'
import UnidadTableView from '@/components/catalogo/UnidadTableView'
import { Unidad } from '@/types'
import { getUnidades, createUnidad } from '@/lib/services/unidad'
import { toast } from 'sonner'
import { exportarUnidadesAExcel } from '@/lib/utils/unidadExcel'
import {
  leerUnidadesDesdeExcel,
  validarUnidades
} from '@/lib/utils/unidadImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Ruler, Loader2, Plus, Search, X, AlertCircle } from 'lucide-react'

export default function Page() {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const cargarUnidades = async () => {
    try {
      setLoading(true)
      const data = await getUnidades()
      setUnidades(data)
    } catch (err) {
      toast.error('Error al cargar las unidades')
      console.error('Error loading unidades:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUnidades()
  }, [])

  const handleCreated = (nueva: Unidad) => {
    setUnidades((prev) => [nueva, ...prev])
    toast.success('Unidad creada')
  }

  const handleUpdated = (actualizada: Unidad) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === actualizada.id ? actualizada : u))
    )
  }

  const handleDeleted = (id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id))
  }

  const handleExportar = async () => {
    try {
      exportarUnidadesAExcel(unidades)
      toast.success('Unidades exportadas')
    } catch (err) {
      toast.error('Error al exportar unidades')
    }
  }

  const filteredUnidades = unidades.filter(unidad =>
    unidad.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerUnidadesDesdeExcel(file)
      const nombresExistentes = unidades.map(u => u.nombre)
      const { nuevas, errores: erroresImport } = validarUnidades(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(u => createUnidad({ nombre: u.nombre })))
      toast.success(`${nuevas.length} unidades importadas`)
      cargarUnidades()
    } catch (err) {
      console.error('Error al importar unidades:', err)
      toast.error('Error en la importación')
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
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-[250px]" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-7 w-20" />
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
            <Ruler className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Unidades</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {unidades.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva
          </Button>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </div>

      {/* Import Status */}
      {importando && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importando unidades...
        </div>
      )}

      {/* Import Errors */}
      {errores.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            Errores de importación:
          </div>
          <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
            {errores.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
            {errores.length > 5 && <li>... y {errores.length - 5} más</li>}
          </ul>
        </div>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar unidades..."
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
            {filteredUnidades.length} de {unidades.length}
          </span>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {filteredUnidades.length === 0 ? (
            <div className="text-center py-12">
              <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {unidades.length === 0 ? 'No hay unidades' : 'Sin resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {unidades.length === 0
                  ? 'Comienza agregando tu primera unidad'
                  : `No hay unidades que coincidan con "${searchTerm}"`}
              </p>
              {unidades.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear unidad
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <UnidadTableView
              data={filteredUnidades}
              onUpdate={handleUpdated}
              onDelete={handleDeleted}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal para crear unidades */}
      <UnidadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
