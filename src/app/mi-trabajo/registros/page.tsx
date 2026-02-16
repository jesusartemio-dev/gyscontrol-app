'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  List,
  Clock,
  FileText,
  Briefcase,
  CalendarDays,
  Search,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { useToast } from '@/components/ui/use-toast'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

interface Registro {
  id: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion: string | null
  categoria: string
  nombreServicio: string
  costoHora: number | null
  origen: string | null
  aprobado: boolean
  proyecto: { id: string; nombre: string; codigo: string } | null
  edt: { id: string; nombre: string } | null
  proyectoTarea: { id: string; nombre: string } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface Resumen {
  totalHoras: number
  totalRegistros: number
  promedioHoras: number
}

export default function MisRegistrosPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Data
  const [registros, setRegistros] = useState<Registro[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [resumen, setResumen] = useState<Resumen>({ totalHoras: 0, totalRegistros: 0, promedioHoras: 0 })
  const [proyectosDistintos, setProyectosDistintos] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [proyectoFiltro, setProyectoFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // UI
  const [showWizard, setShowWizard] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Project list for filter
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; codigo: string }[]>([])

  const cargarProyectos = useCallback(async () => {
    try {
      const res = await fetch('/api/proyectos')
      if (res.ok) {
        const data = await res.json()
        const lista = (data.data || data || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
        }))
        setProyectos(lista)
      }
    } catch { /* silent */ }
  }, [])

  const cargarRegistros = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (proyectoFiltro) params.set('proyectoId', proyectoFiltro)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)

      const res = await fetch(`/api/registro-horas?${params}`)
      if (!res.ok) throw new Error('Error cargando registros')
      const data = await res.json()

      if (data.success) {
        let regs = data.data || []

        // Sort
        regs.sort((a: Registro, b: Registro) => {
          const da = new Date(a.fechaTrabajo).getTime()
          const db = new Date(b.fechaTrabajo).getTime()
          return sortOrder === 'desc' ? db - da : da - db
        })

        setRegistros(regs)
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 })
        setResumen(data.resumen || { totalHoras: 0, totalRegistros: 0, promedioHoras: 0 })

        // Count distinct projects
        const proyIds = new Set(regs.map((r: Registro) => r.proyecto?.id).filter(Boolean))
        setProyectosDistintos(proyIds.size)
      }
    } catch {
      toast({ title: 'Error al cargar registros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, proyectoFiltro, fechaDesde, fechaHasta, sortOrder, toast])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return
    cargarProyectos()
  }, [status, session, cargarProyectos])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return
    cargarRegistros()
  }, [status, session, cargarRegistros])

  // Client-side text filter
  const registrosFiltrados = busqueda
    ? registros.filter(r => {
        const texto = busqueda.toLowerCase()
        return (
          r.proyecto?.nombre?.toLowerCase().includes(texto) ||
          r.proyecto?.codigo?.toLowerCase().includes(texto) ||
          r.edt?.nombre?.toLowerCase().includes(texto) ||
          r.proyectoTarea?.nombre?.toLowerCase().includes(texto) ||
          r.descripcion?.toLowerCase().includes(texto) ||
          r.categoria?.toLowerCase().includes(texto)
        )
      })
    : registros

  const handleEliminar = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/registro-horas?id=${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error eliminando')
      }
      toast({ title: 'Registro eliminado' })
      cargarRegistros()
    } catch (e: any) {
      toast({ title: e.message || 'Error al eliminar', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setProyectoFiltro('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

  const tieneFiltros = busqueda || proyectoFiltro || fechaDesde || fechaHasta

  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) {
      toast({ title: 'No hay datos para exportar', variant: 'destructive' })
      return
    }

    const headers = 'Fecha,Proyecto,EDT,Tarea,Horas,Descripción,Costo Hora (PEN),Origen'
    const rows = registrosFiltrados.map(r => {
      const fecha = format(new Date(r.fechaTrabajo), 'dd/MM/yyyy')
      const proyecto = r.proyecto ? `${r.proyecto.codigo} - ${r.proyecto.nombre}` : ''
      const edt = r.edt?.nombre || ''
      const tarea = r.proyectoTarea?.nombre || ''
      const horas = r.horasTrabajadas
      const desc = (r.descripcion || '').replace(/"/g, '""')
      const costo = r.costoHora ? r.costoHora.toFixed(2) : ''
      const origen = r.origen || ''
      return `"${fecha}","${proyecto}","${edt}","${tarea}",${horas},"${desc}",${costo},"${origen}"`
    })

    const BOM = '\uFEFF'
    const csv = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mis-registros-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast({ title: 'CSV exportado' })
  }

  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), 'dd MMM yyyy', { locale: es })
    } catch {
      return fecha
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <List className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mis Registros</h1>
            <p className="text-xs text-gray-500">Historial de horas registradas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{resumen.totalHoras.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Total Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-bold">{resumen.totalRegistros}</p>
                <p className="text-xs text-muted-foreground">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold">{proyectosDistintos}</p>
                <p className="text-xs text-muted-foreground">Proyectos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{resumen.promedioHoras.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Promedio/Registro</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyecto, EDT, tarea, descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={proyectoFiltro}
          onChange={e => { setProyectoFiltro(e.target.value); setPage(1) }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
          ))}
        </select>
        <Input
          type="date"
          value={fechaDesde}
          onChange={e => { setFechaDesde(e.target.value); setPage(1) }}
          className="h-9 w-[140px] text-sm"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={fechaHasta}
          onChange={e => { setFechaHasta(e.target.value); setPage(1) }}
          className="h-9 w-[140px] text-sm"
          placeholder="Hasta"
        />
        {tieneFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1">
                    Fecha
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>EDT</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Costo/h</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : registrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {tieneFiltros ? 'No se encontraron registros con los filtros aplicados' : 'No hay registros de horas'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                registrosFiltrados.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="py-2 whitespace-nowrap text-sm">
                      {formatFecha(r.fechaTrabajo)}
                    </TableCell>
                    <TableCell className="py-2 text-sm">
                      <span className="font-medium">{r.proyecto?.codigo}</span>
                      <span className="text-muted-foreground hidden sm:inline"> - {r.proyecto?.nombre}</span>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {r.edt?.nombre || '-'}
                    </TableCell>
                    <TableCell className="py-2 text-sm">
                      {r.proyectoTarea?.nombre || '-'}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right font-medium">
                      {r.horasTrabajadas}h
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {r.descripcion || '-'}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right text-muted-foreground hidden lg:table-cell">
                      {r.costoHora ? `S/${r.costoHora.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="h-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <DeleteAlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar registro de horas?"
        description="Se eliminará el registro y se recalcularán las horas del EDT asociado. Esta acción no se puede deshacer."
        onConfirm={handleEliminar}
      />

      {/* Wizard */}
      <RegistroHorasWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={() => {
          setShowWizard(false)
          cargarRegistros()
        }}
      />
    </div>
  )
}
