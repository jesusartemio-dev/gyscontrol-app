'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ClipboardList,
  Search,
  RefreshCw,
  CheckCircle2,
  Check,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileText,
  Eye,
  ArrowRight,
  XCircle,
  RotateCcw,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import { flujoEstados, estadoLabels, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'

const estadoConfig: Record<string, { icon: any; className: string }> = {
  borrador:    { icon: FileText,     className: 'bg-gray-100 text-gray-700' },
  enviada:     { icon: ArrowRight,   className: 'bg-blue-50 text-blue-700' },
  por_revisar: { icon: Clock,        className: 'bg-yellow-100 text-yellow-700' },
  por_cotizar: { icon: Clock,        className: 'bg-orange-100 text-orange-700' },
  por_validar: { icon: AlertCircle,  className: 'bg-blue-100 text-blue-700' },
  por_aprobar: { icon: AlertCircle,  className: 'bg-purple-100 text-purple-700' },
  aprobada:    { icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  rechazada:   { icon: XCircle,      className: 'bg-red-100 text-red-700' },
  completada:  { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
}

function getEstadoBadge(estado: string) {
  const config = estadoConfig[estado] || estadoConfig.borrador
  const Icon = config.icon
  return (
    <Badge className={`${config.className} text-xs font-normal`}>
      <Icon className="h-3 w-3 mr-1" />
      {estadoLabels[estado] || estado}
    </Badge>
  )
}

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function SupervisionListasEquipoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = session?.user?.role || ''

  const [listas, setListas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterProyecto, setFilterProyecto] = useState('all')
  const [procesando, setProcesando] = useState<string | null>(null)

  // Reject dialog state
  const [rechazarDialogOpen, setRechazarDialogOpen] = useState(false)
  const [rechazarListaId, setRechazarListaId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  // Advance summary modal state
  const [resumenModalOpen, setResumenModalOpen] = useState(false)
  const [resumenLista, setResumenLista] = useState<any>(null)

  const fetchListas = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/lista-equipo')
      if (!res.ok) throw new Error('Error al cargar listas')
      const data = await res.json()
      setListas(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar las listas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListas()
  }, [])

  // Extract unique projects from loaded data
  const proyectos = useMemo(() => {
    const map = new Map<string, { id: string; codigo: string; nombre: string }>()
    listas.forEach(l => {
      if (l.proyecto && !map.has(l.proyecto.id)) {
        map.set(l.proyecto.id, { id: l.proyecto.id, codigo: l.proyecto.codigo, nombre: l.proyecto.nombre })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [listas])

  // Filter and search
  const filteredListas = useMemo(() => {
    let result = listas

    if (filterEstado !== 'all') {
      result = result.filter(l => l.estado === filterEstado)
    }

    if (filterProyecto !== 'all') {
      result = result.filter(l => l.proyectoId === filterProyecto)
    }

    if (search) {
      const term = search.toLowerCase()
      result = result.filter(l =>
        l.codigo?.toLowerCase().includes(term) ||
        l.nombre?.toLowerCase().includes(term) ||
        l.proyecto?.nombre?.toLowerCase().includes(term) ||
        l.proyecto?.codigo?.toLowerCase().includes(term)
      )
    }

    return result
  }, [listas, filterEstado, filterProyecto, search])

  // Stats by estado
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    listas.forEach(l => {
      counts[l.estado] = (counts[l.estado] || 0) + 1
    })
    return counts
  }, [listas])

  // Actions
  const abrirResumen = (lista: any) => {
    setResumenLista(lista)
    setResumenModalOpen(true)
  }

  const handleAvanzar = async (listaId: string, estado: string) => {
    const flujo = flujoEstados[estado as keyof typeof flujoEstados]
    if (!flujo?.siguiente) return

    setProcesando(listaId)
    try {
      const result = await updateListaEstado(listaId, flujo.siguiente)
      toast.success(`Lista avanzada a "${estadoLabels[flujo.siguiente]}"`)
      fetchListas()
    } catch (error: any) {
      toast.error(error?.message || 'Error al cambiar estado')
    } finally {
      setProcesando(null)
    }
  }

  const handleResetear = async (listaId: string, estado: string) => {
    const flujo = flujoEstados[estado as EstadoListaEquipo]
    if (!flujo?.reset) return

    setProcesando(listaId)
    try {
      const result = await updateListaEstado(listaId, flujo.reset)
      if (result) {
        toast.success(`Lista restaurada a "${estadoLabels[flujo.reset]}"`)
        fetchListas()
      } else {
        toast.error('Error al restaurar')
      }
    } catch {
      toast.error('Error al restaurar')
    } finally {
      setProcesando(null)
    }
  }

  const openRechazarDialog = (listaId: string) => {
    setRechazarListaId(listaId)
    setMotivoRechazo('')
    setRechazarDialogOpen(true)
  }

  const handleConfirmRechazar = async () => {
    if (!rechazarListaId || motivoRechazo.trim().length < 10) return

    setProcesando(rechazarListaId)
    setRechazarDialogOpen(false)
    try {
      const result = await updateListaEstado(rechazarListaId, 'rechazada', motivoRechazo.trim())
      toast.success('Lista rechazada')
      fetchListas()
    } catch (error: any) {
      toast.error(error?.message || 'Error al rechazar')
    } finally {
      setProcesando(null)
      setRechazarListaId(null)
    }
  }

  if (loading && listas.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="border rounded-lg">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3 border-b last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold">Listas de Equipo</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{listas.length} listas</span>
          {Object.entries(stats)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => {
              const order = ['por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'borrador', 'aprobada', 'rechazada', 'completada']
              return order.indexOf(a) - order.indexOf(b)
            })
            .map(([estado, count]) => (
              <span key={estado} className={estadoConfig[estado]?.className.replace('bg-', 'text-').split(' ')[1] || ''}>
                {count} {estadoLabels[estado]?.toLowerCase()}
              </span>
            ))
          }
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o proyecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(estadoLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label} {stats[value] ? `(${stats[value]})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProyecto} onValueChange={setFilterProyecto}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {proyectos.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo} - {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={fetchListas} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredListas.length} de {listas.length}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[120px] text-xs font-medium">Código</TableHead>
              <TableHead className="text-xs font-medium">Lista</TableHead>
              <TableHead className="w-[200px] text-xs font-medium">Proyecto</TableHead>
              <TableHead className="w-[70px] text-right text-xs font-medium">Items</TableHead>
              <TableHead className="w-[130px] text-xs font-medium">Responsable</TableHead>
              <TableHead className="w-[120px] text-xs font-medium">Estado</TableHead>
              <TableHead className="w-[90px] text-xs font-medium">Fecha</TableHead>
              <TableHead className="w-[140px] text-xs font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' || filterProyecto !== 'all'
                    ? 'No se encontraron listas con los filtros aplicados'
                    : 'No hay listas de equipos'}
                </TableCell>
              </TableRow>
            ) : (
              filteredListas.map((lista) => {
                const flujo = flujoEstados[lista.estado as EstadoListaEquipo] || {}
                const puedeAvanzar = !!flujo.siguiente && flujo.roles?.includes(userRole)
                const puedeRechazar = !!flujo.rechazar && flujo.roles?.includes(userRole)
                const puedeResetear = !!flujo.reset && flujo.roles?.includes(userRole)
                const esProcesando = procesando === lista.id

                return (
                  <TableRow key={lista.id} className="group hover:bg-muted/50">
                    <TableCell className="py-2">
                      <button
                        onClick={() => router.push(`/proyectos/${lista.proyectoId}/equipos/listas/${lista.id}`)}
                        className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {lista.codigo || '-'}
                      </button>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-medium line-clamp-1">{lista.nombre}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">{lista.proyecto?.codigo}</span>
                        <span className="text-xs text-muted-foreground block line-clamp-1">{lista.proyecto?.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <span className="font-mono text-sm">{lista.items?.length || 0}</span>
                      {lista.items?.length > 0 && (() => {
                        const total = lista.items.length
                        const verif = lista.items.filter((i: any) => i.verificado).length
                        return (
                          <span className={`block text-[10px] ${verif === total ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {verif}/{total} verif.
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 line-clamp-1">
                      {lista.responsable?.name || '-'}
                    </TableCell>
                    <TableCell className="py-2">
                      {getEstadoBadge(lista.estado)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {formatDate(lista.createdAt)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => router.push(`/proyectos/${lista.proyectoId}/equipos/listas/${lista.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {puedeAvanzar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                            onClick={() => abrirResumen(lista)}
                            disabled={esProcesando}
                          >
                            {esProcesando ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Avanzar
                              </>
                            )}
                          </Button>
                        )}

                        {puedeRechazar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRechazarDialog(lista.id)}
                            disabled={esProcesando}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rechazar
                          </Button>
                        )}

                        {puedeResetear && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleResetear(lista.id, lista.estado)}
                            disabled={esProcesando}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary modal before advancing */}
      <Dialog open={resumenModalOpen} onOpenChange={setResumenModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          {resumenLista && (() => {
            const items = resumenLista.items || []
            const totalItems = items.length
            const verificados = items.filter((i: any) => i.verificado).length
            const faltanVerificar = totalItems > 0 && verificados < totalItems
            const flujo = flujoEstados[resumenLista.estado as EstadoListaEquipo] || {}
            const siguienteLabel = estadoLabels[flujo.siguiente || ''] || ''

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4 text-orange-600" />
                    {resumenLista.nombre}
                    {resumenLista.codigo && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                        {resumenLista.codigo}
                      </Badge>
                    )}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{resumenLista.proyecto?.codigo} - {resumenLista.proyecto?.nombre}</span>
                    <span className="text-gray-300">|</span>
                    {getEstadoBadge(resumenLista.estado)}
                    <ArrowRight className="h-3 w-3" />
                    {getEstadoBadge(flujo.siguiente || '')}
                  </div>
                </DialogHeader>

                {/* Warning if unverified */}
                {faltanVerificar && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Hay {totalItems - verificados} de {totalItems} items sin verificar</span>
                  </div>
                )}

                {/* Items table */}
                <div className="border rounded-lg overflow-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[30px] text-xs"></TableHead>
                        <TableHead className="w-[90px] text-xs font-medium">Código</TableHead>
                        <TableHead className="text-xs font-medium">Descripción</TableHead>
                        <TableHead className="w-[100px] text-xs font-medium">Categoría</TableHead>
                        <TableHead className="w-[50px] text-right text-xs font-medium">Cant.</TableHead>
                        <TableHead className="w-[50px] text-xs font-medium">Und.</TableHead>
                        <TableHead className="w-[80px] text-xs font-medium">Origen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                            Sin items
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item: any) => (
                          <TableRow key={item.id} className={!item.verificado ? 'bg-amber-50/50' : ''}>
                            <TableCell className="py-1.5 text-center">
                              {item.verificado ? (
                                <Check className="h-3.5 w-3.5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-gray-300 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px] font-mono text-muted-foreground">
                              {item.codigo || '-'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <span className="text-xs line-clamp-1">{item.descripcion || '-'}</span>
                              {item.comentarioRevision && (
                                <span className="block text-[10px] text-blue-600 line-clamp-1 mt-0.5">
                                  {item.comentarioRevision}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px] text-muted-foreground line-clamp-1">
                              {item.categoria || '-'}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-right font-mono">
                              {item.cantidad || 0}
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px] text-muted-foreground">
                              {item.unidad || '-'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                                item.origen === 'nuevo' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                item.origen === 'reemplazo' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                'text-gray-500'
                              }`}>
                                {item.origen === 'cotizado' ? 'cotizado' : item.origen === 'nuevo' ? 'no cotizado' : item.origen || '-'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer with stats and actions */}
                <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
                  <span className={`text-xs font-medium ${verificados === totalItems ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {verificados}/{totalItems} verificados
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setResumenModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={procesando === resumenLista.id}
                      onClick={() => {
                        handleAvanzar(resumenLista.id, resumenLista.estado)
                        setResumenModalOpen(false)
                        setResumenLista(null)
                      }}
                    >
                      {procesando === resumenLista.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <ArrowRight className="h-3 w-3 mr-1" />
                      )}
                      Avanzar a {siguienteLabel}
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <AlertDialog open={rechazarDialogOpen} onOpenChange={setRechazarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Lista
            </AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo del rechazo. La lista volverá al estado &quot;Borrador&quot; para correcciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            className="min-h-[80px]"
          />
          {motivoRechazo.length > 0 && motivoRechazo.length < 10 && (
            <p className="text-xs text-red-500">Mínimo 10 caracteres ({motivoRechazo.length}/10)</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRechazar}
              disabled={motivoRechazo.trim().length < 10}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
