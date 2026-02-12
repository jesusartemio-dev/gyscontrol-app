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
import { createCatalogoEquipo, updateCatalogoEquipo, deleteCatalogoEquipo, getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogTrigger
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Search,
  Package,
  Pencil,
  Check,
  Trash2,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function CatalogoEquipoPage() {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(true)
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
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoPrecioLista, setNuevoPrecioLista] = useState<number | null>(null)
  const [nuevoFactorCosto, setNuevoFactorCosto] = useState<number | null>(null)
  const [nuevoFactorVenta, setNuevoFactorVenta] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogoEquipo | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargarEquipos = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoEquipos()
      setEquipos(data)
    } catch (err) {
      console.error('Error al cargar equipos:', err)
      toast.error('Error al cargar equipos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  // Memoized values
  const categorias = useMemo(() =>
    [...new Set(equipos.map(eq => eq.categoriaEquipo?.nombre).filter(Boolean))] as string[],
    [equipos]
  )

  const equiposFiltrados = useMemo(() => {
    return equipos.filter(eq => {
      const tieneUso = (eq._count?.cotizacionEquipoItem || 0) + (eq._count?.proyectoEquipoCotizadoItem || 0) + (eq._count?.listaEquipoItem || 0) > 0
      return (
        (categoriaFiltro === '__ALL__' || eq.categoriaEquipo?.nombre === categoriaFiltro) &&
        (estadoFiltro === '__ALL__' || eq.estado === estadoFiltro) &&
        (usoFiltro === '__ALL__' || (usoFiltro === 'con_uso' ? tieneUso : !tieneUso)) &&
        (searchTerm === '' ||
          `${eq.codigo} ${eq.descripcion} ${eq.marca}`.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })
  }, [equipos, categoriaFiltro, estadoFiltro, usoFiltro, searchTerm])

  const handleCreated = () => {
    cargarEquipos()
    setShowCreateModal(false)
  }

  const handleExportar = async () => {
    try {
      await exportarEquiposAExcel(equipos)
      toast.success('Equipos exportados')
    } catch (err) {
      toast.error('Error al exportar')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await importarEquiposDesdeExcel(file)
      const [categorias, unidades, equiposExistentes] = await Promise.all([
        getCategoriasEquipo(),
        getUnidades(),
        getCatalogoEquipos()
      ])

      const codigosExistentes = equiposExistentes.map(eq => eq.codigo)
      const idPorCodigo: Record<string, string> = equiposExistentes.reduce((acc, eq) => {
        acc[eq.codigo] = eq.id
        return acc
      }, {} as Record<string, string>)

      const { equiposValidos, errores } = await importarEquiposDesdeExcelValidado(
        datos, categorias, unidades, codigosExistentes
      )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores en la importación')
        return
      }

      const nuevos: CatalogoEquipoPayload[] = []
      const duplicados: CatalogoEquipoConId[] = []

      for (const eq of equiposValidos) {
        const payload: CatalogoEquipoPayload = {
          codigo: eq.codigo,
          descripcion: eq.descripcion,
          marca: eq.marca,
          precioLista: eq.precioLista,
          precioInterno: eq.precioInterno,
          factorCosto: eq.factorCosto,
          factorVenta: eq.factorVenta,
          precioVenta: eq.precioVenta,
          categoriaId: eq.categoriaId,
          unidadId: eq.unidadId,
          estado: eq.estado,
        }

        if (codigosExistentes.includes(eq.codigo)) {
          duplicados.push({ ...payload, id: idPorCodigo[eq.codigo] })
        } else {
          nuevos.push(payload)
        }
      }

      setEquiposNuevos(nuevos)
      setEquiposDuplicados(duplicados)

      if (duplicados.length > 0) {
        setMostrarModal(true)
      } else if (nuevos.length > 0) {
        await crearEquiposNuevos(nuevos)
      } else {
        toast('No hay equipos nuevos para importar')
      }
    } catch (err) {
      toast.error('Error en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      if (equiposNuevos.length > 0) {
        await crearEquiposNuevos(equiposNuevos)
      }
      if (equiposDuplicados.length > 0) {
        const actualizados = await Promise.all(
          equiposDuplicados.map(eq => {
            const { id, ...data } = eq
            return updateCatalogoEquipo(id, recalcularCatalogoEquipo(data))
          })
        )
        setEquipos(prev => {
          const actualizadosIds = new Set(actualizados.map(e => e.id))
          return [...prev.filter(e => !actualizadosIds.has(e.id)), ...actualizados]
        })
      }
      toast.success('Equipos procesados')
      setMostrarModal(false)
      setEquiposNuevos([])
      setEquiposDuplicados([])
    } catch (err) {
      toast.error('Error al procesar')
    }
  }

  const crearEquiposNuevos = async (nuevos: CatalogoEquipoPayload[]) => {
    const equiposParaCrear = nuevos.map(eq => recalcularCatalogoEquipo(eq))
    const creados = await Promise.all(equiposParaCrear.map(eq => createCatalogoEquipo(eq)))
    setEquipos(prev => [...prev, ...creados])
    toast.success(`${creados.length} equipos importados`)
  }

  const guardarEdicion = async (equipo: CatalogoEquipo) => {
    if (nuevoPrecioLista === null || nuevoFactorCosto === null || nuevoFactorVenta === null) return
    if (nuevoPrecioLista === equipo.precioLista && nuevoFactorCosto === equipo.factorCosto && nuevoFactorVenta === equipo.factorVenta) {
      cancelarEdicion()
      return
    }
    setGuardando(true)
    const precioInterno = parseFloat((nuevoPrecioLista * nuevoFactorCosto).toFixed(2))
    const precioVenta = parseFloat((precioInterno * nuevoFactorVenta).toFixed(2))
    try {
      const actualizado = await updateCatalogoEquipo(equipo.id, {
        precioLista: nuevoPrecioLista,
        precioInterno,
        factorCosto: nuevoFactorCosto,
        factorVenta: nuevoFactorVenta,
        precioVenta,
      })
      setEquipos(prev => prev.map(eq => eq.id === equipo.id ? actualizado : eq))
      toast.success('Equipo actualizado')
      cancelarEdicion()
    } catch (err) {
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevoPrecioLista(null)
    setNuevoFactorCosto(null)
    setNuevoFactorVenta(null)
  }

  const handleEditField = async (id: string, field: keyof CatalogoEquipo, value: string | number) => {
    try {
      const updated = await updateCatalogoEquipo(id, { [field]: value })
      setEquipos(prev => prev.map(eq => eq.id === id ? updated : eq))
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setEliminando(true)
    try {
      await deleteCatalogoEquipo(deleteTarget.id)
      setEquipos(prev => prev.filter(eq => eq.id !== deleteTarget.id))
      toast.success('Equipo eliminado')
      setDeleteTarget(null)
    } catch (err) {
      toast.error('Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, equipo: CatalogoEquipo) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      guardarEdicion(equipo)
    } else if (e.key === 'Escape') {
      cancelarEdicion()
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
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
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
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Equipos</h1>
            </div>
            <Badge variant="secondary" className="font-normal">
              {equipos.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Equipo</DialogTitle>
                  <DialogDescription>
                    Agrega un equipo al catálogo
                  </DialogDescription>
                </DialogHeader>
                <CatalogoEquipoForm onCreated={handleCreated} />
              </DialogContent>
            </Dialog>
            <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descripción o marca..."
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

          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue>
                {categoriaFiltro === '__ALL__' ? 'Categoría: Todas' : categoriaFiltro}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas las categorías</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue>
                {estadoFiltro === '__ALL__' ? 'Estado: Todos' : `Estado: ${estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1)}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los estados</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={usoFiltro} onValueChange={setUsoFiltro}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue>
                {usoFiltro === '__ALL__' ? 'Uso: Todos' : usoFiltro === 'con_uso' ? 'Con uso' : 'Sin uso'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos</SelectItem>
              <SelectItem value="con_uso">Con uso</SelectItem>
              <SelectItem value="sin_uso">Sin uso</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || categoriaFiltro !== '__ALL__' || estadoFiltro !== '__ALL__' || usoFiltro !== '__ALL__') && (
            <span className="text-sm text-muted-foreground">
              {equiposFiltrados.length} de {equipos.length}
            </span>
          )}
        </div>

        {/* Loading de importación */}
        {importando && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importando equipos...
          </div>
        )}

        {/* Errores */}
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

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            {equiposFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {equipos.length === 0 ? 'No hay equipos' : 'Sin resultados'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {equipos.length === 0
                    ? 'Comienza agregando equipos al catálogo'
                    : 'Ajusta los filtros para encontrar equipos'}
                </p>
                {equipos.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear equipo
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
                        Código
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                        Descripción
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Uso
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        P. Lista
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        F. Costo
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        F. Venta
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        P. Interno
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        P. Venta
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="w-24 py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {equiposFiltrados.map((eq) => (
                      <tr key={eq.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-xs">
                          {eq.codigo}
                        </td>
                        <td className="py-2 px-3">
                          <div className="max-w-[250px] truncate text-sm" title={eq.descripcion}>
                            {eq.descripcion}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {eq.categoriaEquipo?.nombre || '—'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">
                          {eq.marca || '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {(() => {
                            const c = eq._count?.cotizacionEquipoItem || 0
                            const p = eq._count?.proyectoEquipoCotizadoItem || 0
                            const l = eq._count?.listaEquipoItem || 0
                            if (c + p + l === 0) return <span className="text-muted-foreground text-xs">—</span>
                            return (
                              <div className="flex items-center justify-center gap-1">
                                {c > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                        {c}C
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{c} cotizaci{c === 1 ? 'ón' : 'ones'}</TooltipContent>
                                  </Tooltip>
                                )}
                                {p > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                        {p}P
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{p} proyecto{p === 1 ? '' : 's'}</TooltipContent>
                                  </Tooltip>
                                )}
                                {l > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                        {l}L
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{l} lista{l === 1 ? '' : 's'}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm">
                          {editandoId === eq.id ? (
                            <Input
                              type="number"
                              value={nuevoPrecioLista ?? ''}
                              onChange={e => setNuevoPrecioLista(parseFloat(e.target.value))}
                              onKeyDown={(e) => handleKeyDown(e, eq)}
                              className="w-24 h-7 text-right text-xs"
                              step="0.01"
                              autoFocus
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              {formatCurrency(eq.precioLista)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {editandoId === eq.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={nuevoFactorCosto ?? ''}
                              onChange={e => setNuevoFactorCosto(parseFloat(e.target.value))}
                              onKeyDown={(e) => handleKeyDown(e, eq)}
                              className="w-16 h-7 text-center text-xs"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">
                              {(eq.factorCosto ?? 1.00).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {editandoId === eq.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={nuevoFactorVenta ?? ''}
                              onChange={e => setNuevoFactorVenta(parseFloat(e.target.value))}
                              onKeyDown={(e) => handleKeyDown(e, eq)}
                              className="w-16 h-7 text-center text-xs"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {(eq.factorVenta ?? 1.15).toFixed(2)} ({(((eq.factorVenta ?? 1.15) - 1) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(eq.precioInterno)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm font-medium text-emerald-600">
                          {formatCurrency(eq.precioVenta)}
                        </td>
                        <td className="py-2 px-3">
                          <Select
                            value={eq.estado}
                            onValueChange={(value) => handleEditField(eq.id, 'estado', value)}
                          >
                            <SelectTrigger className="h-7 w-[90px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="aprobado">Aprobado</SelectItem>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="rechazado">Rechazado</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            {editandoId === eq.id ? (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={cancelarEdicion}
                                      disabled={guardando}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancelar (Esc)</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => guardarEdicion(eq)}
                                      disabled={guardando}
                                    >
                                      {guardando ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Guardar (Enter)</TooltipContent>
                                </Tooltip>
                              </>
                            ) : (
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditandoId(eq.id)
                                        setNuevoPrecioLista(eq.precioLista)
                                        setNuevoFactorCosto(eq.factorCosto ?? 1.00)
                                        setNuevoFactorVenta(eq.factorVenta ?? 1.15)
                                      }}
                                      disabled={editandoId !== null}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar precios</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteTarget(eq)}
                                      disabled={editandoId !== null}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
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

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            {(() => {
              const c = deleteTarget?._count?.cotizacionEquipoItem || 0
              const p = deleteTarget?._count?.proyectoEquipoCotizadoItem || 0
              const l = deleteTarget?._count?.listaEquipoItem || 0
              const tieneUso = c + p + l > 0
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tieneUso ? 'No se puede eliminar' : '¿Eliminar equipo?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        {tieneUso ? (
                          <div className="space-y-3">
                            <p>
                              El equipo <span className="font-mono font-medium text-foreground">{deleteTarget?.codigo}</span> está siendo usado en:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {c > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200">
                                  {c} cotizaci{c === 1 ? 'ón' : 'ones'}
                                </span>
                              )}
                              {p > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-amber-50 text-amber-700 border border-amber-200">
                                  {p} proyecto{p === 1 ? '' : 's'}
                                </span>
                              )}
                              {l > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {l} lista{l === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">
                              Debes desvincular el equipo de estos registros antes de poder eliminarlo.
                            </p>
                          </div>
                        ) : (
                          <p>Se eliminará el equipo &quot;{deleteTarget?.codigo}&quot;. Esta acción no se puede deshacer.</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={eliminando}>
                      {tieneUso ? 'Cerrar' : 'Cancelar'}
                    </AlertDialogCancel>
                    {!tieneUso && (
                      <AlertDialogAction
                        onClick={confirmDelete}
                        disabled={eliminando}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {eliminando ? 'Eliminando...' : 'Eliminar'}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </>
              )
            })()}
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate modal */}
        <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Equipos duplicados
              </DialogTitle>
              <DialogDescription>
                Se encontraron {equiposDuplicados.length} códigos existentes. ¿Sobrescribir?
              </DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {equiposDuplicados.map((eq, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {eq.codigo}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={sobrescribirDuplicados} className="flex-1">
                Sobrescribir
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMostrarModal(false)
                  setEquiposNuevos([])
                  setEquiposDuplicados([])
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
