'use client'

import { useEffect, useState } from 'react'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { getEdts } from '@/lib/services/edt'
import type { CatalogoServicio } from '@/types'

// UI Components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// Icons
import {
  Pencil,
  Trash2,
  Search,
  Calculator,
  Clock,
  AlertCircle,
  Check,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react'

interface Props {
  data: CatalogoServicio[]
  onUpdate: (servicio: CatalogoServicio) => void
  onDelete: (id: string) => void
}

export default function CatalogoServicioTable({ data, onUpdate, onDelete }: Props) {
  const [servicios, setServicios] = useState(data)
  const [unidades, setUnidades] = useState<any[]>([])
  const [recursos, setRecursos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [filtroUnidad, setFiltroUnidad] = useState('__ALL__')
  const [filtroRecurso, setFiltroRecurso] = useState('__ALL__')
  const [filtroTexto, setFiltroTexto] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CatalogoServicio>>({})
  const [guardando, setGuardando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogoServicio | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [formulaOpen, setFormulaOpen] = useState(false)

  useEffect(() => {
    setServicios(data)
  }, [data])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [unidadesData, recursosData, categoriasData] = await Promise.all([
          getUnidadesServicio(),
          getRecursos(),
          getEdts()
        ])
        setUnidades(unidadesData)
        setRecursos(recursosData)
        setCategorias(categoriasData)
      } catch (err) {
        setError('Error al cargar los datos.')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const serviciosFiltrados = servicios
    .filter((s) =>
      (filtroCategoria !== '__ALL__' ? s.categoriaId === filtroCategoria : true) &&
      (filtroUnidad !== '__ALL__' ? s.unidadServicioId === filtroUnidad : true) &&
      (filtroRecurso !== '__ALL__' ? s.recursoId === filtroRecurso : true) &&
      (`${s.nombre} ${s.descripcion}`.toLowerCase().includes(filtroTexto.toLowerCase()))
    )
    .sort((a, b) => {
      const edtA = a.edt?.nombre || ''
      const edtB = b.edt?.nombre || ''
      if (edtA !== edtB) return edtA.localeCompare(edtB)
      return (a.orden || 0) - (b.orden || 0)
    })

  const handleSave = async (id: string) => {
    const original = servicios.find(s => s.id === id)
    if (!original) return

    // Check if there are actual changes
    const hasChanges = Object.keys(editData).some(key => {
      const k = key as keyof CatalogoServicio
      return editData[k] !== original[k]
    })

    if (!hasChanges) {
      cancelarEdicion()
      return
    }

    setGuardando(true)
    const updated = { ...original, ...editData }
    onUpdate(updated)
    setGuardando(false)
    cancelarEdicion()
  }

  const cancelarEdicion = () => {
    setEditingId(null)
    setEditData({})
  }

  const calcularHoras = (cantidad: number, data: Partial<CatalogoServicio>) => {
    const horasBase = (data.horaBase ?? 0) + Math.max(0, cantidad - 1) * (data.horaRepetido ?? 0)
    const factorDificultad = data.nivelDificultad ?? 1
    return horasBase * factorDificultad
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setEliminando(true)
    onDelete(deleteTarget.id)
    setEliminando(false)
    setDeleteTarget(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave(id)
    } else if (e.key === 'Escape') {
      cancelarEdicion()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filtros compactos */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {filtroTexto && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setFiltroTexto('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue>
                {filtroCategoria === '__ALL__' ? 'EDT: Todos' : categorias.find(c => c.id === filtroCategoria)?.nombre || 'EDT'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los EDTs</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue>
                {filtroUnidad === '__ALL__' ? 'Unidad: Todas' : unidades.find(u => u.id === filtroUnidad)?.nombre || 'Unidad'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas las unidades</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroRecurso} onValueChange={setFiltroRecurso}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue>
                {filtroRecurso === '__ALL__' ? 'Recurso: Todos' : recursos.find(r => r.id === filtroRecurso)?.nombre || 'Recurso'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los recursos</SelectItem>
              {recursos.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filtroTexto || filtroCategoria !== '__ALL__' || filtroUnidad !== '__ALL__' || filtroRecurso !== '__ALL__') && (
            <span className="text-sm text-muted-foreground">
              {serviciosFiltrados.length} de {servicios.length}
            </span>
          )}
        </div>

        {/* Card de fórmula compacta y colapsable */}
        <Collapsible open={formulaOpen} onOpenChange={setFormulaOpen}>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Cálculo de Horas Hombre</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${formulaOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-3 mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                  Escalonada
                </Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  HH = HH_base + (cantidad - 1) × HH_repetido
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                  Dificultad
                </Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  HH_total = HH × factor_dificultad
                </code>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            {serviciosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No hay servicios que coincidan con los filtros
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroTexto('')
                    setFiltroCategoria('__ALL__')
                    setFiltroUnidad('__ALL__')
                    setFiltroRecurso('__ALL__')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[250px]">
                        Servicio
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        EDT
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                        Orden
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Recurso
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Unidad
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                        Cant.
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                        Dif.
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider" title="HH Base / HH Repetido">
                        HH B/R
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                        HH Total
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        $/Hora
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Costo
                      </th>
                      <th className="w-20 py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {serviciosFiltrados.map((item) => {
                      const isEditing = editingId === item.id
                      const recursoId = editData.recursoId ?? item.recursoId
                      const cantidadUsar = editData.cantidad ?? item.cantidad ?? 1
                      const horasCalculadas = calcularHoras(cantidadUsar, { ...item, ...editData })
                      const costoHora = recursos.find(r => r.id === recursoId)?.costoHora ?? item.recurso?.costoHora ?? 0
                      const costoTotal = horasCalculadas * costoHora

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3">
                            <div>
                              <div className="font-medium text-sm line-clamp-2" title={item.nombre}>
                                {item.nombre}
                              </div>
                              {item.descripcion && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5" title={item.descripcion}>
                                  {item.descripcion}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {item.edt?.nombre || '—'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={(editData.orden ?? item.orden) ?? 0}
                                onChange={(e) => setEditData(d => ({ ...d, orden: parseInt(e.target.value) }))}
                                onKeyDown={(e) => handleKeyDown(e, item.id)}
                                className="w-14 h-7 text-center text-xs"
                                min="0"
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">{item.orden ?? 0}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <Select value={recursoId} onValueChange={(v) => setEditData(d => ({ ...d, recursoId: v }))}>
                                <SelectTrigger className="h-7 text-xs w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {recursos.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground">{item.recurso?.nombre || '—'}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <Select value={editData.unidadServicioId ?? item.unidadServicioId} onValueChange={(v) => setEditData(d => ({ ...d, unidadServicioId: v }))}>
                                <SelectTrigger className="h-7 text-xs w-[80px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {unidades.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground">{item.unidadServicio?.nombre || '—'}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={(editData.cantidad ?? item.cantidad) ?? 1}
                                onChange={(e) => setEditData(d => ({ ...d, cantidad: parseInt(e.target.value) }))}
                                onKeyDown={(e) => handleKeyDown(e, item.id)}
                                className="w-14 h-7 text-center text-xs"
                                min="1"
                              />
                            ) : (
                              <span className="text-sm">{item.cantidad ?? 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <Select value={(editData.nivelDificultad ?? item.nivelDificultad ?? 1).toString()} onValueChange={(v) => setEditData(d => ({ ...d, nivelDificultad: parseInt(v) }))}>
                                <SelectTrigger className="h-7 text-xs w-14">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(level => (
                                    <SelectItem key={level} value={level.toString()}>{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground">{item.nivelDificultad ?? 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="number"
                                  value={(editData.horaBase ?? item.horaBase) ?? 0}
                                  onChange={(e) => setEditData(d => ({ ...d, horaBase: parseFloat(e.target.value) }))}
                                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                                  className="w-12 h-7 text-center text-xs"
                                  step="0.1"
                                  min="0"
                                  title="HH Base"
                                />
                                <span className="text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  value={(editData.horaRepetido ?? item.horaRepetido) ?? 0}
                                  onChange={(e) => setEditData(d => ({ ...d, horaRepetido: parseFloat(e.target.value) }))}
                                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                                  className="w-12 h-7 text-center text-xs"
                                  step="0.1"
                                  min="0"
                                  title="HH Repetido"
                                />
                              </div>
                            ) : (
                              <span className="text-sm" title={`Base: ${(item.horaBase ?? 0).toFixed(1)} / Rep: ${(item.horaRepetido ?? 0).toFixed(1)}`}>
                                {(item.horaBase ?? 0).toFixed(1)}<span className="text-muted-foreground mx-0.5">/</span>{(item.horaRepetido ?? 0).toFixed(1)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                {horasCalculadas.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-sm text-muted-foreground">
                            {formatCurrency(costoHora)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-sm font-medium text-emerald-600">
                            {formatCurrency(costoTotal)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              {isEditing ? (
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
                                        onClick={() => handleSave(item.id)}
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
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          setEditingId(item.id)
                                          setEditData({})
                                        }}
                                        disabled={editingId !== null}
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
                                        onClick={() => setDeleteTarget(item)}
                                        disabled={editingId !== null}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el servicio "{deleteTarget?.nombre}". Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
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
