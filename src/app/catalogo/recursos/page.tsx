'use client'

import { useEffect, useState } from 'react'
import { getRecursos, reordenarRecursos } from '@/lib/services/recurso'
import { Recurso } from '@/types'
import RecursoModal from '@/components/catalogo/RecursoModal'
import RecursoTableView from '@/components/catalogo/RecursoTableView'
import RecursoCardView from '@/components/catalogo/RecursoCardView'
import { toast } from 'sonner'
import { exportarRecursosAExcel, generarPlantillaRecursos } from '@/lib/utils/recursoExcel'
import { leerRecursosDesdeExcel, validarRecursos, importarRecursosEnBD, type RecursoImportado } from '@/lib/utils/recursoImportUtils'
import { RecursoImportPreviewModal } from '@/components/catalogo/RecursoImportPreviewModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  Users,
  TrendingUp,
  DollarSign,
  Loader2,
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  FileSpreadsheet,
  Upload,
  Filter,
  User,
  UsersRound,
  Download,
  Power,
  PowerOff,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [recursoEditar, setRecursoEditar] = useState<Recurso | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<'all' | 'individual' | 'cuadrilla'>('all')
  const [filterEstado, setFilterEstado] = useState<'all' | 'activo' | 'inactivo'>('all')

  // Import preview modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importPreviewData, setImportPreviewData] = useState<{
    validos: RecursoImportado[]
    nuevos: number
    actualizaciones: number
    errores: string[]
  } | null>(null)

  const cargarRecursos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRecursos()
      setRecursos(data)
    } catch (err) {
      setError('Error al cargar los recursos')
      toast.error('Error al cargar los recursos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRecursos()
  }, [])

  const openCreateModal = () => {
    setRecursoEditar(null)
    setShowModal(true)
  }

  const openEditModal = (recurso: Recurso) => {
    setRecursoEditar(recurso)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setRecursoEditar(null)
  }

  const handleCreated = (nuevo: Recurso) => {
    setRecursos((prev) => [nuevo, ...prev])
  }

  const handleUpdated = (actualizado: Recurso) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === actualizado.id ? actualizado : r))
    )
  }

  const handleDeleted = (id: string) => {
    setRecursos((prev) => prev.filter((r) => r.id !== id))
  }

  const handleToggleActivo = (actualizado: Recurso) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === actualizado.id ? { ...r, activo: actualizado.activo } : r))
    )
  }

  const handleReorder = async (reordered: Recurso[]) => {
    // Optimistic update
    setRecursos(reordered)
    try {
      await reordenarRecursos(reordered.map(r => ({ id: r.id, orden: r.orden })))
    } catch {
      toast.error('Error al reordenar recursos')
      await cargarRecursos()
    }
  }

  const handleExportar = () => {
    try {
      exportarRecursosAExcel(recursos)
      toast.success('Excel exportado')
    } catch {
      toast.error('Error al exportar')
    }
  }

  const filteredRecursos = recursos.filter(recurso => {
    const matchesSearch = recurso.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'all' || recurso.tipo === filterTipo
    const matchesEstado = filterEstado === 'all' || (filterEstado === 'activo' ? recurso.activo : !recurso.activo)
    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrores([])

    try {
      const datos = await leerRecursosDesdeExcel(file)
      const nombresExistentes = recursos.map(r => r.nombre)
      const validacionResult = validarRecursos(datos, nombresExistentes)

      // Show preview modal instead of direct import
      setImportPreviewData(validacionResult)
      setIsImportModalOpen(true)
    } catch (err) {
      console.error('Error reading Excel:', err)
      toast.error(err instanceof Error ? err.message : 'Error al leer el archivo Excel')
    } finally {
      e.target.value = ''
    }
  }

  const executeImport = async () => {
    if (!importPreviewData || importPreviewData.validos.length === 0) return

    setImportando(true)
    try {
      const result = await importarRecursosEnBD(importPreviewData.validos)
      toast.success(result.message)

      if (result.errores && result.errores.length > 0) {
        setErrores(result.errores)
      }

      await cargarRecursos()
      setIsImportModalOpen(false)
      setImportPreviewData(null)
    } catch (err) {
      console.error('Import error:', err)
      toast.error(err instanceof Error ? err.message : 'Error al importar recursos')
    } finally {
      setImportando(false)
    }
  }

  const handleDescargarPlantilla = () => {
    try {
      generarPlantillaRecursos()
      toast.success('Plantilla descargada')
    } catch {
      toast.error('Error al generar plantilla')
    }
  }

  // Stats
  const stats = {
    total: recursos.length,
    individuales: recursos.filter(r => r.tipo === 'individual' || !r.tipo).length,
    cuadrillas: recursos.filter(r => r.tipo === 'cuadrilla').length,
    promedio: recursos.length > 0
      ? recursos.reduce((sum, r) => sum + r.costoHora, 0) / recursos.length
      : 0,
    maximo: recursos.length > 0
      ? Math.max(...recursos.map(r => r.costoHora))
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Recursos</h1>
          <Badge variant="secondary" className="text-xs">
            {stats.total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats - Desktop */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-blue-600" title="Costo Promedio">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-medium">{formatCurrency(stats.promedio)}/h</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1 text-green-600" title="Costo Máximo">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">{formatCurrency(stats.maximo)}/h</span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 rounded-r-none', viewMode === 'table' && 'bg-gray-100')}
              onClick={() => setViewMode('table')}
              title="Vista tabla"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 rounded-l-none border-l', viewMode === 'cards' && 'bg-gray-100')}
              onClick={() => setViewMode('cards')}
              title="Vista cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8" onClick={handleExportar}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-green-600" />
            Excel
          </Button>

          {/* Template */}
          <Button variant="outline" size="sm" className="h-8" onClick={handleDescargarPlantilla}>
            <Download className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            Plantilla
          </Button>

          {/* Import */}
          <Button variant="outline" size="sm" className="h-8 relative" disabled={importando}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportar}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={importando}
            />
            {importando ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Importar
          </Button>

          {/* New */}
          <Button size="sm" className="h-8" onClick={openCreateModal}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{formatCurrency(stats.promedio)}</div>
          <div className="text-[10px] text-blue-700">Promedio/hora</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{formatCurrency(stats.maximo)}</div>
          <div className="text-[10px] text-green-700">Máximo/hora</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recurso por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as typeof filterTipo)}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>Todos ({stats.total})</span>
              </div>
            </SelectItem>
            <SelectItem value="individual">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>Individual ({stats.individuales})</span>
              </div>
            </SelectItem>
            <SelectItem value="cuadrilla">
              <div className="flex items-center gap-2">
                <UsersRound className="h-3.5 w-3.5 text-purple-600" />
                <span>Cuadrilla ({stats.cuadrillas})</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={(v) => setFilterEstado(v as typeof filterEstado)}>
          <SelectTrigger className="w-[140px] h-9">
            <Power className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span>Todos</span>
            </SelectItem>
            <SelectItem value="activo">
              <div className="flex items-center gap-2">
                <Power className="h-3.5 w-3.5 text-green-600" />
                <span>Activos ({recursos.filter(r => r.activo).length})</span>
              </div>
            </SelectItem>
            <SelectItem value="inactivo">
              <div className="flex items-center gap-2">
                <PowerOff className="h-3.5 w-3.5 text-gray-400" />
                <span>Inactivos ({recursos.filter(r => !r.activo).length})</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || filterTipo !== 'all' || filterEstado !== 'all') && (
          <Badge variant="outline" className="text-xs">
            {filteredRecursos.length} resultado{filteredRecursos.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Errors */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {errores.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {errores.slice(0, 5).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
              {errores.length > 5 && (
                <li>...y {errores.length - 5} errores más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {filteredRecursos.length === 0 && recursos.length > 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium mb-1">Sin resultados</h3>
          <p className="text-sm text-muted-foreground mb-3">
            No hay recursos que coincidan con "{searchTerm}"
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
            Limpiar búsqueda
          </Button>
        </div>
      ) : filteredRecursos.length === 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium mb-1">No hay recursos</h3>
          <p className="text-sm text-muted-foreground">
            Comienza agregando tu primer recurso
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <RecursoTableView
          data={filteredRecursos}
          onEdit={openEditModal}
          onDelete={handleDeleted}
          onToggleActivo={handleToggleActivo}
          onReorder={!searchTerm && filterTipo === 'all' && filterEstado === 'all' ? handleReorder : undefined}
          loading={loading}
          error={error}
        />
      ) : (
        <RecursoCardView
          data={filteredRecursos}
          onEdit={openEditModal}
          onDelete={handleDeleted}
          loading={loading}
          error={error}
        />
      )}

      {/* Modal */}
      <RecursoModal
        isOpen={showModal}
        onClose={closeModal}
        recurso={recursoEditar}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      {/* Import Preview Modal */}
      {importPreviewData && (
        <RecursoImportPreviewModal
          open={isImportModalOpen}
          onOpenChange={(open) => {
            setIsImportModalOpen(open)
            if (!open) setImportPreviewData(null)
          }}
          onConfirm={executeImport}
          datos={importPreviewData}
          isLoading={importando}
        />
      )}
    </div>
  )
}
