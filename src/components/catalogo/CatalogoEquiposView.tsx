'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import CatalogoEquipoForm from '@/components/catalogo/CatalogoEquipoForm'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { exportarEquiposAExcel, importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import { importarEquiposDesdeExcelValidado } from '@/lib/utils/equiposImportUtils'
import { recalcularCatalogoEquipo } from '@/lib/utils/recalculoCatalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { getCatalogoEquipos, createCatalogoEquipo, updateCatalogoEquipo, deleteCatalogoEquipo } from '@/lib/services/catalogoEquipo'
import { getVistaConfig, getCatalogoEquiposVista, type Vista, type VistaConfig } from '@/lib/services/catalogoEquipoVista'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus, Search, Package, Pencil, Trash2, X, Loader2, AlertCircle
} from 'lucide-react'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

const VISTA_LABELS: Record<Vista, string> = {
  admin: 'Catálogo Equipos',
  comercial: 'Catálogo Equipos',
  logistica: 'Catálogo Equipos',
  proyectos: 'Catálogo Equipos',
}

const ALL_COLUMNS = [
  { key: 'codigo', label: 'Código / Descripción', align: 'left' as const },
  { key: 'categoria', label: 'Categoría', align: 'left' as const },
  { key: 'unidad', label: 'Unidad', align: 'left' as const },
  { key: 'marca', label: 'Marca', align: 'left' as const },
  { key: 'uso', label: 'Uso', align: 'center' as const },
  { key: 'precioLogistica', label: 'Precio\nLogística', align: 'right' as const },
  { key: 'precioReal', label: 'Precio\nReal', align: 'right' as const },
  { key: 'precioLista', label: 'Precio\nLista', align: 'right' as const },
  { key: 'factorCosto', label: 'Factor\nCosto', align: 'center' as const },
  { key: 'factorVenta', label: 'Factor\nVenta', align: 'center' as const },
  { key: 'precioInterno', label: 'Precio\nInterno', align: 'right' as const },
  { key: 'precioVenta', label: 'Precio\nVenta', align: 'right' as const },
  { key: 'estado', label: 'Estado', align: 'left' as const },
  { key: 'updatedAt', label: 'Actualización', align: 'left' as const },
  { key: 'updatedBy', label: 'Editado\nPor', align: 'left' as const },
] as const

type ColumnKey = typeof ALL_COLUMNS[number]['key']

const formatCurrency = (amount: number | undefined): string => {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(amount)
}

interface CatalogoEquiposViewProps {
  vista: Vista
}

export default function CatalogoEquiposView({ vista }: CatalogoEquiposViewProps) {
  const [equipos, setEquipos] = useState<Partial<CatalogoEquipo>[]>([])
  const [loading, setLoading] = useState(true)
  const [vistaConfig, setVistaConfig] = useState<VistaConfig | null>(null)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [equiposNuevos, setEquiposNuevos] = useState<CatalogoEquipoPayload[]>([])
  const [equiposDuplicados, setEquiposDuplicados] = useState<CatalogoEquipoConId[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [estadoFiltro, setEstadoFiltro] = useState('__ALL__')
  const [usoFiltro, setUsoFiltro] = useState('__ALL__')

  // Edit state
  const [editTarget, setEditTarget] = useState<Partial<CatalogoEquipo> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Partial<CatalogoEquipo> | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const hasCol = (key: ColumnKey) => vistaConfig?.columnas.includes(key) ?? false
  const canCreate = vistaConfig?.permisos.canCreate ?? false
  const canEdit = vistaConfig?.permisos.canEdit ?? false
  const canDelete = vistaConfig?.permisos.canDelete ?? false
  const canImport = vistaConfig?.permisos.canImport ?? false
  const canExport = vistaConfig?.permisos.canExport ?? false
  const showActionsColumn = canEdit || canDelete

  const visibleColumns = useMemo(() =>
    ALL_COLUMNS.filter(col => {
      // Always visible columns
      if (col.key === 'updatedAt' || col.key === 'updatedBy') return true
      // codigo column merges descripcion — show if either is in config
      if (col.key === 'codigo') return vistaConfig?.columnas.includes('codigo') || vistaConfig?.columnas.includes('descripcion')
      return vistaConfig?.columnas.includes(col.key)
    }),
    [vistaConfig]
  )

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [config, data] = await Promise.all([
        getVistaConfig(vista),
        getCatalogoEquiposVista(vista),
      ])
      setVistaConfig(config)
      setEquipos(data)
    } catch (err) {
      console.error('Error al cargar datos:', err)
      toast.error('Error al cargar equipos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [vista])

  // Memoized filter values
  const categorias = useMemo(() =>
    [...new Set(equipos.map(eq => eq.categoriaEquipo?.nombre).filter(Boolean))] as string[],
    [equipos]
  )

  const equiposFiltrados = useMemo(() => {
    return equipos.filter(eq => {
      const tieneUso = ((eq as any)._count?.cotizacionEquipoItem || 0) + ((eq as any)._count?.proyectoEquipoCotizadoItem || 0) + ((eq as any)._count?.listaEquipoItem || 0) > 0
      return (
        (categoriaFiltro === '__ALL__' || eq.categoriaEquipo?.nombre === categoriaFiltro) &&
        (estadoFiltro === '__ALL__' || eq.estado === estadoFiltro) &&
        (usoFiltro === '__ALL__' || (usoFiltro === 'con_uso' ? tieneUso : !tieneUso)) &&
        (searchTerm === '' ||
          `${eq.codigo || ''} ${eq.descripcion || ''} ${eq.marca || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })
  }, [equipos, categoriaFiltro, estadoFiltro, usoFiltro, searchTerm])

  const handleCreated = () => {
    cargarDatos()
    setShowCreateModal(false)
  }

  const handleExportar = async () => {
    try {
      await exportarEquiposAExcel(equipos as CatalogoEquipo[])
      toast.success('Equipos exportados')
    } catch { toast.error('Error al exportar') }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])
    try {
      const datos = await importarEquiposDesdeExcel(file)
      const [cats, units, existingEquipos] = await Promise.all([
        getCategoriasEquipo(), getUnidades(), getCatalogoEquipos()
      ])
      const codigosExistentes = existingEquipos.map(eq => eq.codigo)
      const idPorCodigo: Record<string, string> = existingEquipos.reduce((acc, eq) => {
        acc[eq.codigo] = eq.id; return acc
      }, {} as Record<string, string>)

      const { equiposValidos, errores } = await importarEquiposDesdeExcelValidado(datos, cats, units, codigosExistentes)
      if (errores.length > 0) { setErrores(errores); toast.error('Errores en la importación'); return }

      const nuevos: CatalogoEquipoPayload[] = []
      const duplicados: CatalogoEquipoConId[] = []
      for (const eq of equiposValidos) {
        const payload: CatalogoEquipoPayload = {
          codigo: eq.codigo, descripcion: eq.descripcion, marca: eq.marca,
          precioLista: eq.precioLista, precioInterno: eq.precioInterno,
          factorCosto: eq.factorCosto, factorVenta: eq.factorVenta,
          precioVenta: eq.precioVenta, categoriaId: eq.categoriaId,
          unidadId: eq.unidadId, estado: eq.estado,
        }
        if (codigosExistentes.includes(eq.codigo)) {
          duplicados.push({ ...payload, id: idPorCodigo[eq.codigo] })
        } else { nuevos.push(payload) }
      }
      setEquiposNuevos(nuevos)
      setEquiposDuplicados(duplicados)
      if (duplicados.length > 0) { setMostrarModal(true) }
      else if (nuevos.length > 0) { await crearEquiposNuevos(nuevos) }
      else { toast('No hay equipos nuevos para importar') }
    } catch { toast.error('Error en la importación') }
    finally { setImportando(false); e.target.value = '' }
  }

  const sobrescribirDuplicados = async () => {
    try {
      if (equiposNuevos.length > 0) await crearEquiposNuevos(equiposNuevos)
      if (equiposDuplicados.length > 0) {
        await Promise.all(equiposDuplicados.map(eq => {
          const { id, ...data } = eq
          return updateCatalogoEquipo(id, recalcularCatalogoEquipo(data))
        }))
      }
      toast.success('Equipos procesados')
      setMostrarModal(false)
      setEquiposNuevos([])
      setEquiposDuplicados([])
      cargarDatos()
    } catch { toast.error('Error al procesar') }
  }

  const crearEquiposNuevos = async (nuevos: CatalogoEquipoPayload[]) => {
    const equiposParaCrear = nuevos.map(eq => recalcularCatalogoEquipo(eq))
    const creados = await Promise.all(equiposParaCrear.map(eq => createCatalogoEquipo(eq)))
    setEquipos(prev => [...prev, ...creados])
    toast.success(`${creados.length} equipos importados`)
  }

  const handleUpdated = (actualizado: any) => {
    setEquipos(prev => prev.map(eq => eq.id === actualizado.id ? actualizado : eq))
    setEditTarget(null)
  }

  const handleEditField = async (id: string, field: string, value: string | number) => {
    try {
      const updated = await updateCatalogoEquipo(id, { [field]: value })
      setEquipos(prev => prev.map(eq => eq.id === id ? updated : eq))
    } catch { toast.error('Error al actualizar') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    setEliminando(true)
    try {
      await deleteCatalogoEquipo(deleteTarget.id)
      setEquipos(prev => prev.filter(eq => eq.id !== deleteTarget.id))
      toast.success('Equipo eliminado')
      setDeleteTarget(null)
    } catch { toast.error('Error al eliminar') }
    finally { setEliminando(false) }
  }

  // --- Render helpers ---
  const renderUsageCell = (eq: Partial<CatalogoEquipo>) => {
    const counts = (eq as any)._count
    const c = counts?.cotizacionEquipoItem || 0
    const p = counts?.proyectoEquipoCotizadoItem || 0
    const l = counts?.listaEquipoItem || 0
    if (c + p + l === 0) return <span className="text-muted-foreground text-xs">—</span>
    return (
      <div className="flex items-center justify-center gap-1">
        {c > 0 && (
          <Tooltip><TooltipTrigger asChild>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">{c}C</span>
          </TooltipTrigger><TooltipContent>{c} cotizaci{c === 1 ? 'ón' : 'ones'}</TooltipContent></Tooltip>
        )}
        {p > 0 && (
          <Tooltip><TooltipTrigger asChild>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">{p}P</span>
          </TooltipTrigger><TooltipContent>{p} proyecto{p === 1 ? '' : 's'}</TooltipContent></Tooltip>
        )}
        {l > 0 && (
          <Tooltip><TooltipTrigger asChild>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">{l}L</span>
          </TooltipTrigger><TooltipContent>{l} lista{l === 1 ? '' : 's'}</TooltipContent></Tooltip>
        )}
      </div>
    )
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '—'
    const d = new Date(date)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const renderCell = (eq: Partial<CatalogoEquipo>, colKey: ColumnKey) => {
    switch (colKey) {
      case 'codigo':
        return (
          <div className="min-w-[200px]">
            <span className="font-mono text-xs font-medium">{eq.codigo}</span>
            {eq.descripcion && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{eq.descripcion}</p>
            )}
          </div>
        )
      case 'categoria':
        return <Badge variant="secondary" className="text-xs font-normal">{eq.categoriaEquipo?.nombre || '—'}</Badge>
      case 'unidad':
        return <Badge variant="secondary" className="text-xs font-normal">{eq.unidad?.nombre || '—'}</Badge>
      case 'marca':
        return <span className="text-sm text-muted-foreground">{eq.marca || '—'}</span>
      case 'uso':
        return renderUsageCell(eq)
      case 'precioLogistica':
        return <span className="font-mono text-sm text-muted-foreground">{formatCurrency(eq.precioLogistica)}</span>
      case 'precioReal':
        return <span className="font-mono text-sm text-muted-foreground">{formatCurrency(eq.precioReal)}</span>
      case 'precioLista':
        return <span className="text-muted-foreground font-mono text-sm">{formatCurrency(eq.precioLista)}</span>
      case 'factorCosto':
        return <span className="text-xs text-muted-foreground font-mono">{(eq.factorCosto ?? 1.00).toFixed(2)}</span>
      case 'factorVenta':
        return <span className="text-xs text-muted-foreground">{(eq.factorVenta ?? 1.15).toFixed(2)} ({(((eq.factorVenta ?? 1.15) - 1) * 100).toFixed(0)}%)</span>
      case 'precioInterno':
        return <span className="font-mono text-sm text-muted-foreground">{formatCurrency(eq.precioInterno)}</span>
      case 'precioVenta':
        return <span className="font-mono text-sm font-medium text-emerald-600">{formatCurrency(eq.precioVenta)}</span>
      case 'estado':
        if (canEdit) {
          return (
            <Select value={eq.estado} onValueChange={(value) => eq.id && handleEditField(eq.id, 'estado', value)}>
              <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          )
        }
        return <Badge variant="outline" className="text-xs">{eq.estado}</Badge>
      case 'updatedAt':
        return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(eq.updatedAt)}</span>
      case 'updatedBy':
        return <span className="text-xs text-muted-foreground whitespace-nowrap">{eq.updatedByUser?.name || '—'}</span>
      default:
        return null
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-20" /></div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Card><CardContent className="p-0"><div className="divide-y">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-20" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div></CardContent></Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{VISTA_LABELS[vista]}</h1>
            </div>
            <Badge variant="secondary" className="font-normal">{equipos.length}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nuevo Equipo</DialogTitle>
                    <DialogDescription>Agrega un equipo al catálogo</DialogDescription>
                  </DialogHeader>
                  <CatalogoEquipoForm onCreated={handleCreated} onCancel={() => setShowCreateModal(false)} />
                </DialogContent>
              </Dialog>
            )}
            {(canImport || canExport) && (
              <BotonesImportExport
                onExportar={canExport ? handleExportar : undefined}
                onImportar={canImport ? handleImportar : undefined}
              />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código, descripción o marca..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-9 h-9" />
            {searchTerm && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>
            )}
          </div>

          {hasCol('categoria') && (
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue>{categoriaFiltro === '__ALL__' ? 'Categoría: Todas' : categoriaFiltro}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas las categorías</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {hasCol('estado') && (
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue>{estadoFiltro === '__ALL__' ? 'Estado: Todos' : `Estado: ${estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1)}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos los estados</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          )}

          {hasCol('uso') && (
            <Select value={usoFiltro} onValueChange={setUsoFiltro}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue>{usoFiltro === '__ALL__' ? 'Uso: Todos' : usoFiltro === 'con_uso' ? 'Con uso' : 'Sin uso'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                <SelectItem value="con_uso">Con uso</SelectItem>
                <SelectItem value="sin_uso">Sin uso</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(searchTerm || categoriaFiltro !== '__ALL__' || estadoFiltro !== '__ALL__' || usoFiltro !== '__ALL__') && (
            <span className="text-sm text-muted-foreground">{equiposFiltrados.length} de {equipos.length}</span>
          )}
        </div>

        {/* Import loading */}
        {importando && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />Importando equipos...
          </div>
        )}

        {/* Import errors */}
        {errores.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
              <AlertCircle className="h-4 w-4" />Errores de importación:
            </div>
            <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
              {errores.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {errores.length > 5 && <li>... y {errores.length - 5} más</li>}
            </ul>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {equiposFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {equipos.length === 0 ? 'No hay equipos' : 'Sin resultados'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {equipos.length === 0 ? 'Comienza agregando equipos al catálogo' : 'Ajusta los filtros para encontrar equipos'}
                </p>
                {equipos.length === 0 && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />Crear equipo
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {visibleColumns.map(col => (
                        <th key={col.key} className={`py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-pre-line leading-tight ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.key === 'codigo' ? 'min-w-[200px]' : ''}`}>
                          {col.label}
                        </th>
                      ))}
                      {showActionsColumn && (
                        <th className="w-24 py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {equiposFiltrados.map(eq => (
                      <tr key={eq.id} className="hover:bg-muted/30 transition-colors">
                        {visibleColumns.map(col => (
                          <td key={col.key} className={`py-2 px-3 align-top ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}>
                            {renderCell(eq, col.key)}
                          </td>
                        ))}
                        {showActionsColumn && (
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              {canEdit && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                    onClick={() => setEditTarget(eq)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeleteTarget(eq)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger><TooltipContent>Eliminar</TooltipContent></Tooltip>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            {(() => {
              const counts = (deleteTarget as any)?._count
              const c = counts?.cotizacionEquipoItem || 0
              const p = counts?.proyectoEquipoCotizadoItem || 0
              const l = counts?.listaEquipoItem || 0
              const tieneUso = c + p + l > 0
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tieneUso ? 'No se puede eliminar' : '¿Eliminar equipo?'}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        {tieneUso ? (
                          <div className="space-y-3">
                            <p>El equipo <span className="font-mono font-medium text-foreground">{deleteTarget?.codigo}</span> está siendo usado en:</p>
                            <div className="flex flex-wrap gap-2">
                              {c > 0 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200">{c} cotizaci{c === 1 ? 'ón' : 'ones'}</span>}
                              {p > 0 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-amber-50 text-amber-700 border border-amber-200">{p} proyecto{p === 1 ? '' : 's'}</span>}
                              {l > 0 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">{l} lista{l === 1 ? '' : 's'}</span>}
                            </div>
                            <p className="text-sm">Debes desvincular el equipo de estos registros antes de poder eliminarlo.</p>
                          </div>
                        ) : (
                          <p>Se eliminará el equipo &quot;{deleteTarget?.codigo}&quot;. Esta acción no se puede deshacer.</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={eliminando}>{tieneUso ? 'Cerrar' : 'Cancelar'}</AlertDialogCancel>
                    {!tieneUso && (
                      <AlertDialogAction onClick={confirmDelete} disabled={eliminando}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {eliminando ? 'Eliminando...' : 'Eliminar'}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </>
              )
            })()}
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit modal */}
        <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Equipo</DialogTitle>
              <DialogDescription>Modifica los datos del equipo <span className="font-mono font-medium">{editTarget?.codigo}</span></DialogDescription>
            </DialogHeader>
            {editTarget && (
              <CatalogoEquipoForm key={editTarget.id} equipo={editTarget} onUpdated={handleUpdated} onCancel={() => setEditTarget(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* Duplicate modal */}
        <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />Equipos duplicados
              </DialogTitle>
              <DialogDescription>Se encontraron {equiposDuplicados.length} códigos existentes. ¿Sobrescribir?</DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {equiposDuplicados.map((eq, i) => <Badge key={i} variant="outline" className="text-xs font-mono">{eq.codigo}</Badge>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={sobrescribirDuplicados} className="flex-1">Sobrescribir</Button>
              <Button variant="outline" onClick={() => { setMostrarModal(false); setEquiposNuevos([]); setEquiposDuplicados([]) }} className="flex-1">Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
