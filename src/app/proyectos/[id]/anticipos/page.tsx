'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProyectoContext } from '../ProyectoContext'
import { getSolicitudesAnticipo } from '@/lib/services/solicitudAnticipo'
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
  DollarSign,
  Plus,
  Search,
  RefreshCw,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Banknote,
  Receipt,
  Ban,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import SolicitudAnticipoForm from '@/components/anticipos/SolicitudAnticipoForm'
import type { SolicitudAnticipo } from '@/types'

const estadoConfig: Record<string, { icon: any; className: string; label: string }> = {
  borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
  enviado: { icon: Send, className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
  aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
  rechazado: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' },
  pagado: { icon: Banknote, className: 'bg-emerald-100 text-emerald-700', label: 'Pagado' },
  liquidado: { icon: Receipt, className: 'bg-purple-100 text-purple-700', label: 'Liquidado' },
  cancelado: { icon: Ban, className: 'bg-gray-200 text-gray-500', label: 'Cancelado' },
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

export default function AnticiposPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { proyecto } = useProyectoContext()
  const [anticipos, setAnticipos] = useState<SolicitudAnticipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showForm, setShowForm] = useState(false)
  const [editAnticipo, setEditAnticipo] = useState<SolicitudAnticipo | null>(null)

  const fetchData = async () => {
    if (!proyecto) return
    try {
      setLoading(true)
      const data = await getSolicitudesAnticipo(proyecto.id)
      setAnticipos(data)
    } catch (err) {
      console.error('Error fetching anticipos:', err)
      toast.error('Error al cargar los anticipos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (proyecto) fetchData()
  }, [proyecto])

  const filtered = useMemo(() => {
    let result = anticipos
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(a =>
        a.numero.toLowerCase().includes(term) ||
        a.motivo.toLowerCase().includes(term) ||
        a.solicitante?.name?.toLowerCase().includes(term)
      )
    }
    if (filterEstado !== 'all') {
      result = result.filter(a => a.estado === filterEstado)
    }
    return result
  }, [anticipos, search, filterEstado])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = (a as any)[sortField]
      let bVal: any = (b as any)[sortField]
      if (sortField === 'createdAt' || sortField === 'fechaSolicitud') {
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
  if (loading && anticipos.length === 0) return <LoadingSkeleton />

  const totalMonto = anticipos.reduce((sum, a) => sum + a.monto, 0)
  const pendientes = anticipos.filter(a => a.estado === 'enviado').length
  const pagados = anticipos.filter(a => ['pagado', 'liquidado'].includes(a.estado)).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Anticipos</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{anticipos.length} solicitudes</span>
            {pendientes > 0 && <span className="text-blue-600">{pendientes} pendientes</span>}
            <span className="text-green-600">{pagados} pagados</span>
            <span className="font-mono">{formatCurrency(totalMonto)}</span>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 bg-blue-600 hover:bg-blue-700"
          onClick={() => { setEditAnticipo(null); setShowForm(true) }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Anticipo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar anticipo..."
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
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="liquidado">Liquidado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} de {anticipos.length}
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
              <TableHead>
                <button onClick={() => handleSort('motivo')} className="flex items-center text-xs font-medium">
                  Motivo<SortIcon field="motivo" />
                </button>
              </TableHead>
              <TableHead className="w-[120px] text-xs font-medium">Solicitante</TableHead>
              <TableHead className="w-[100px] text-right">
                <button onClick={() => handleSort('monto')} className="flex items-center justify-end w-full text-xs font-medium">
                  Monto<SortIcon field="monto" />
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' ? 'No se encontraron anticipos' : 'Sin solicitudes de anticipo'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((anticipo) => (
                <TableRow
                  key={anticipo.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/proyectos/${proyecto.id}/anticipos/${anticipo.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground py-2">
                    {anticipo.numero}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm line-clamp-1">{anticipo.motivo}</span>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground truncate max-w-[120px]">
                    {anticipo.solicitante?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm py-2">
                    {formatCurrency(anticipo.monto)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(anticipo.fechaSolicitud)}
                  </TableCell>
                  <TableCell className="py-2">
                    {getEstadoBadge(anticipo.estado)}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push(`/proyectos/${proyecto.id}/anticipos/${anticipo.id}`)}
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

      {/* Form Dialog */}
      <SolicitudAnticipoForm
        proyectoId={proyecto.id}
        solicitanteId={session?.user?.id || ''}
        open={showForm}
        onOpenChange={setShowForm}
        onSaved={fetchData}
        anticipo={editAnticipo}
      />
    </div>
  )
}
