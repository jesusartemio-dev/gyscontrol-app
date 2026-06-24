'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  LayoutGrid,
  List,
  User,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  Timer,
  Pause
} from 'lucide-react'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  estado: string
}

interface ProyectoInterno {
  id: string
  codigo: string
  nombre: string
  centroCosto?: { nombre: string } | null
}

interface CargaUsuario {
  usuarioId: string | null
  usuarioNombre: string
  sinAsignar: boolean
  total: number
  activas: number
  enProgreso: number
  pendientes: number
  pausadas: number
  retrasadas: number
  porVencer: number
  completadas: number
  horasPendientes: number
}

interface Props {
  proyectos: Proyecto[]
  proyectosInternos: ProyectoInterno[]
  onVerTareas: (usuarioId: string | null) => void
}

const DIAS_OPTIONS = [
  { value: '3', label: '3 días' },
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' }
]

type SortKey = keyof Omit<CargaUsuario, 'usuarioId' | 'usuarioNombre' | 'sinAsignar'>
type SortDir = 'asc' | 'desc'

function getNivelCarga(item: CargaUsuario): 'alto' | 'medio' | 'normal' {
  if (item.retrasadas >= 3) return 'alto'
  if (item.retrasadas >= 1) return 'medio'
  return 'normal'
}

const NIVEL_ESTILOS = {
  alto: {
    card: 'border-red-300 bg-red-50',
    badge: 'bg-red-100 text-red-700 border-red-200',
    label: 'Carga alta'
  },
  medio: {
    card: 'border-amber-300 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Atención'
  },
  normal: {
    card: 'border-gray-200 bg-white',
    badge: 'bg-green-100 text-green-700 border-green-200',
    label: 'OK'
  }
}

function CardUsuario({ item, diasProximos, onVerTareas }: { item: CargaUsuario; diasProximos: string; onVerTareas: Props['onVerTareas'] }) {
  const nivel = item.sinAsignar ? 'normal' : getNivelCarga(item)
  const estilos = NIVEL_ESTILOS[nivel]

  return (
    <Card
      className={`border ${estilos.card} transition-colors hover:shadow-md cursor-pointer`}
      onClick={() => onVerTareas(item.usuarioId)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header usuario */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <span className="font-medium text-sm text-gray-900 truncate">{item.usuarioNombre}</span>
          </div>
          {!item.sinAsignar && (
            <Badge variant="outline" className={`text-xs shrink-0 ${estilos.badge}`}>
              {estilos.label}
            </Badge>
          )}
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-white/70 border border-gray-100 px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-gray-900">{item.activas}</div>
            <div className="text-gray-500">activas</div>
          </div>
          <div className={`rounded-md border px-2 py-1.5 text-center ${item.retrasadas > 0 ? 'bg-red-50 border-red-200' : 'bg-white/70 border-gray-100'}`}>
            <div className={`text-lg font-bold ${item.retrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{item.retrasadas}</div>
            <div className={item.retrasadas > 0 ? 'text-red-500' : 'text-gray-400'}>retrasadas</div>
          </div>
        </div>

        {/* Detalle estados */}
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
              En progreso
            </span>
            <span className="font-medium">{item.enProgreso}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block" />
              Pendientes
            </span>
            <span className="font-medium">{item.pendientes}</span>
          </div>
          {item.pausadas > 0 && (
            <div className="flex items-center justify-between text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
                Pausadas
              </span>
              <span className="font-medium">{item.pausadas}</span>
            </div>
          )}
          {item.porVencer > 0 && (
            <div className="flex items-center justify-between text-amber-600">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Vencen en {diasProximos}d
              </span>
              <span className="font-medium">{item.porVencer}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {item.completadas} completadas
          </span>
          {item.horasPendientes > 0 && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {item.horasPendientes}h pend.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CargaPersonalTab({ proyectos, proyectosInternos, onVerTareas }: Props) {
  const [data, setData] = useState<CargaUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'cards' | 'tabla'>(() => {
    try { return (localStorage.getItem('carga_personal_vista') as 'cards' | 'tabla') || 'cards' } catch { return 'cards' }
  })
  const [filtroProyecto, setFiltroProyecto] = useState<string>(() => {
    try { return localStorage.getItem('carga_personal_proyecto') || '' } catch { return '' }
  })
  const [diasProximos, setDiasProximos] = useState<string>(() => {
    try { return localStorage.getItem('carga_personal_dias') || '7' } catch { return '7' }
  })
  const [sortBy, setSortBy] = useState<SortKey>('retrasadas')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroProyecto) params.set('proyectoId', filtroProyecto)
      params.set('diasProximos', diasProximos)
      const res = await fetch(`/api/supervision/tareas/carga-personal?${params}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) {
      console.error('Error carga personal:', e)
    } finally {
      setLoading(false)
    }
  }, [filtroProyecto, diasProximos])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const handleSetVista = (v: 'cards' | 'tabla') => {
    setVista(v)
    try { localStorage.setItem('carga_personal_vista', v) } catch {}
  }
  const handleSetProyecto = (v: string) => {
    setFiltroProyecto(v)
    try { localStorage.setItem('carga_personal_proyecto', v) } catch {}
  }
  const handleSetDias = (v: string) => {
    setDiasProximos(v)
    try { localStorage.setItem('carga_personal_dias', v) } catch {}
  }

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  const dataSorted = [...data].sort((a, b) => {
    if (a.sinAsignar !== b.sinAsignar) return a.sinAsignar ? 1 : -1
    const va = a[sortBy] as number
    const vb = b[sortBy] as number
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-gray-700" />
      : <ChevronDown className="h-3.5 w-3.5 text-gray-700" />
  }

  const ThSort = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </div>
    </TableHead>
  )

  const totalActivas = data.filter(d => !d.sinAsignar).reduce((s, d) => s + d.activas, 0)
  const totalRetrasadas = data.filter(d => !d.sinAsignar).reduce((s, d) => s + d.retrasadas, 0)
  const totalPorVencer = data.filter(d => !d.sinAsignar).reduce((s, d) => s + d.porVencer, 0)

  return (
    <div className="space-y-4">
      {/* Filtros + Toggle vista */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtroProyecto || 'all'} onValueChange={v => handleSetProyecto(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {proyectos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
            ))}
            {proyectosInternos.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-gray-400 font-medium border-t mt-1 pt-2">Internos (CC)</div>
                {proyectosInternos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Select value={diasProximos} onValueChange={handleSetDias}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>Por vencer en {o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={cargarDatos}
          disabled={loading}
          className="h-9"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        <div className="ml-auto flex items-center border rounded-md overflow-hidden">
          <Button
            variant={vista === 'cards' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3"
            onClick={() => handleSetVista('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={vista === 'tabla' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3"
            onClick={() => handleSetVista('tabla')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumen global */}
      {!loading && data.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="font-normal">
            <Clock className="h-3 w-3 mr-1" />
            {totalActivas} tareas activas
          </Badge>
          {totalRetrasadas > 0 && (
            <Badge variant="outline" className="font-normal text-red-600 border-red-200 bg-red-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {totalRetrasadas} retrasadas
            </Badge>
          )}
          {totalPorVencer > 0 && (
            <Badge variant="outline" className="font-normal text-amber-600 border-amber-200 bg-amber-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              {totalPorVencer} vencen en {diasProximos}d
            </Badge>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Cargando carga de personal...
        </div>
      )}

      {/* Vista Cards */}
      {!loading && vista === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dataSorted.map(item => (
            <CardUsuario
              key={item.usuarioId ?? '__sin_asignar__'}
              item={item}
              diasProximos={diasProximos}
              onVerTareas={onVerTareas}
            />
          ))}
          {dataSorted.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400">
              No hay datos para mostrar
            </div>
          )}
        </div>
      )}

      {/* Vista Tabla */}
      {!loading && vista === 'tabla' && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[200px]">Usuario</TableHead>
                <ThSort col="activas">Activas</ThSort>
                <ThSort col="enProgreso">En progreso</ThSort>
                <ThSort col="pendientes">Pendientes</ThSort>
                <ThSort col="pausadas">Pausadas</ThSort>
                <ThSort col="retrasadas">Retrasadas</ThSort>
                <ThSort col="porVencer">Por vencer</ThSort>
                <ThSort col="completadas">Completadas</ThSort>
                <ThSort col="horasPendientes">Hs. pend.</ThSort>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSorted.map(item => {
                const nivel = item.sinAsignar ? 'normal' : getNivelCarga(item)
                return (
                  <TableRow
                    key={item.usuarioId ?? '__sin_asignar__'}
                    className={`cursor-pointer hover:bg-gray-50 ${nivel === 'alto' ? 'bg-red-50/40' : nivel === 'medio' ? 'bg-amber-50/40' : ''}`}
                    onClick={() => onVerTareas(item.usuarioId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-gray-500" />
                        </div>
                        <span className="font-medium text-sm">{item.usuarioNombre}</span>
                        {!item.sinAsignar && nivel !== 'normal' && (
                          <Badge variant="outline" className={`text-xs ${NIVEL_ESTILOS[nivel].badge}`}>
                            {NIVEL_ESTILOS[nivel].label}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.activas}</TableCell>
                    <TableCell className="text-center">
                      {item.enProgreso > 0 ? (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">{item.enProgreso}</Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.pendientes > 0 ? (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50">{item.pendientes}</Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.pausadas > 0 ? (
                        <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">{item.pausadas}</Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.retrasadas > 0 ? (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50 font-semibold">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          {item.retrasadas}
                        </Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.porVencer > 0 ? (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">{item.porVencer}</Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.completadas > 0 ? (
                        <span className="text-xs text-green-600 font-medium">{item.completadas}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs text-gray-600">
                      {item.horasPendientes > 0 ? `${item.horasPendientes}h` : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onVerTareas(item.usuarioId) }}>
                        Ver tareas
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {dataSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-gray-400">
                    No hay datos para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Clic en un usuario para filtrar sus tareas en la pestaña Tareas.
      </p>
    </div>
  )
}
