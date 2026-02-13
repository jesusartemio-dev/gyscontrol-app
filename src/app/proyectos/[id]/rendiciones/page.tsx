'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProyectoContext } from '../ProyectoContext'
import { getRendicionesGasto } from '@/lib/services/rendicionGasto'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  BookCheck,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import type { RendicionGasto } from '@/types'

const estadoConfig: Record<string, { icon: any; className: string; label: string }> = {
  borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
  enviado: { icon: Send, className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
  aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
  rechazado: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' },
  contabilizado: { icon: BookCheck, className: 'bg-purple-100 text-purple-700', label: 'Contabilizado' },
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RendicionesPage() {
  const router = useRouter()
  const { proyecto } = useProyectoContext()
  const [rendiciones, setRendiciones] = useState<RendicionGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchData = async () => {
    if (!proyecto) return
    try {
      setLoading(true)
      const data = await getRendicionesGasto({ proyectoId: proyecto.id })
      setRendiciones(data)
    } catch (err) {
      console.error('Error fetching rendiciones:', err)
      toast.error('Error al cargar las rendiciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (proyecto) fetchData()
  }, [proyecto])

  const filtered = useMemo(() => {
    let result = rendiciones
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(r =>
        r.numero.toLowerCase().includes(term) ||
        r.empleado?.name?.toLowerCase().includes(term) ||
        r.observaciones?.toLowerCase().includes(term)
      )
    }
    if (filterEstado !== 'all') {
      result = result.filter(r => r.estado === filterEstado)
    }
    return result
  }, [rendiciones, search, filterEstado])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = (a as any)[sortField]
      let bVal: any = (b as any)[sortField]
      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      if (aVal == null || bVal == null) return 0
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const getEstadoBadge = (estado: string) => {
    const config = estadoConfig[estado] || estadoConfig.borrador
    const Icon = config.icon
    return (
      <Badge className={`${config.className} text-[10px] px-1.5 py-0 font-normal`}>
        <Icon className="h-2.5 w-2.5 mr-0.5" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  if (!proyecto) return null
  if (loading && rendiciones.length === 0) return <LoadingSkeleton />

  const totalMonto = rendiciones.reduce((sum, r) => sum + r.montoTotal, 0)
  const pendientes = rendiciones.filter(r => r.estado === 'enviado').length
  const aprobadas = rendiciones.filter(r => r.estado === 'aprobado').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            <h1 className="text-lg font-semibold">Rendiciones de Gasto</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{rendiciones.length} rendiciones</span>
            {pendientes > 0 && <span className="text-blue-600">{pendientes} por aprobar</span>}
            <span className="text-green-600">{aprobadas} aprobadas</span>
            <span className="font-mono">{formatCurrency(totalMonto)}</span>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 bg-orange-600 hover:bg-orange-700"
          onClick={() => router.push(`/proyectos/${proyecto.id}/rendiciones/nueva`)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva Rendición
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rendición..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="contabilizado">Contabilizado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} de {rendiciones.length}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[130px]">
                <button onClick={() => handleSort('numero')} className="flex items-center text-xs font-medium">
                  Número<SortIcon field="numero" />
                </button>
              </TableHead>
              <TableHead className="text-xs font-medium">Anticipo</TableHead>
              <TableHead className="w-[120px] text-xs font-medium">Empleado</TableHead>
              <TableHead className="w-[60px] text-right text-xs font-medium">Líneas</TableHead>
              <TableHead className="w-[100px] text-right">
                <button onClick={() => handleSort('montoTotal')} className="flex items-center justify-end w-full text-xs font-medium">
                  Monto<SortIcon field="montoTotal" />
                </button>
              </TableHead>
              <TableHead className="w-[90px]">
                <button onClick={() => handleSort('createdAt')} className="flex items-center text-xs font-medium">
                  Fecha<SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="w-[100px] text-xs font-medium">Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' ? 'No se encontraron rendiciones' : 'Sin rendiciones de gasto'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((rendicion) => (
                <TableRow
                  key={rendicion.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/proyectos/${proyecto.id}/rendiciones/${rendicion.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground py-2">
                    {rendicion.numero}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {rendicion.solicitudAnticipo?.numero || '-'}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground truncate max-w-[120px]">
                    {rendicion.empleado?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs py-2">
                    {rendicion.lineas?.length || 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm py-2">
                    {formatCurrency(rendicion.montoTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(rendicion.createdAt)}
                  </TableCell>
                  <TableCell className="py-2">
                    {getEstadoBadge(rendicion.estado)}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push(`/proyectos/${proyecto.id}/rendiciones/${rendicion.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
