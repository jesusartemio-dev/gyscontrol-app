'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getProyectos, deleteProyecto, createProyecto } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoPayload } from '@/types'
import { getMonedaSymbol } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Calendar,
  DollarSign,
  Users,
  UserCog,
  Building2,
  Trash2,
  Eye,
  FolderOpen,
  TrendingUp,
  CheckCircle2,
  Loader2,
  List,
  LayoutGrid,
  HardHat,
  Settings
} from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { buildApiUrl } from '@/lib/utils'

const ALLOWED_ROLES = ['proyectos', 'coordinador', 'gestor', 'gerente', 'admin']

type ViewMode = 'cards' | 'table'
type FilterStatus = 'all' | 'activo' | 'pausado' | 'cerrado' | 'cancelado'

interface ClienteOption { id: string; nombre: string; codigo: string }
interface UsuarioOption { id: string; name: string; email: string; role: string }

export default function ProyectosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [filteredProyectos, setFilteredProyectos] = useState<Proyecto[]>([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [comercialId, setComercialId] = useState('')
  const [gestorId, setGestorId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; proyecto?: Proyecto }>({ show: false })

  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user.role
    if (!role || !ALLOWED_ROLES.includes(role)) {
      router.replace('/denied')
    }
  }, [session, status, router])

  useEffect(() => {
    getProyectos()
      .then(setProyectos)
      .catch(() => toast.error('Error al cargar proyectos.'))
      .finally(() => setPageLoading(false))
  }, [])

  // Cargar clientes y usuarios cuando se abre el dialog
  useEffect(() => {
    if (!showCreateDialog) return
    const loadOptions = async () => {
      try {
        const [clientesRes, usuariosRes] = await Promise.all([
          fetch(buildApiUrl('/api/clientes')),
          fetch(buildApiUrl('/api/admin/usuarios'))
        ])
        if (clientesRes.ok) {
          const data = await clientesRes.json()
          setClientes(Array.isArray(data) ? data : [])
        }
        if (usuariosRes.ok) {
          const data = await usuariosRes.json()
          setUsuarios(Array.isArray(data) ? data : data.data || [])
        }
      } catch (err) {
        console.error('Error cargando opciones:', err)
      }
    }
    loadOptions()
  }, [showCreateDialog])

  useEffect(() => {
    let filtered = [...proyectos]
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.estado === filterStatus)
    }
    filtered.sort((a, b) => new Date(b.fechaInicio || 0).getTime() - new Date(a.fechaInicio || 0).getTime())
    setFilteredProyectos(filtered)
  }, [proyectos, searchTerm, filterStatus])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim() || !clienteId || !comercialId || !gestorId || !fechaInicio) {
      setError('Todos los campos obligatorios deben ser completados.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload: ProyectoPayload = {
        clienteId,
        comercialId,
        gestorId,
        nombre,
        codigo,
        totalCliente: 0,
        totalInterno: 0,
        totalEquiposInterno: 0,
        totalServiciosInterno: 0,
        totalGastosInterno: 0,
        descuento: 0,
        grandTotal: 0,
        estado: 'creado',
        fechaInicio: new Date(fechaInicio).toISOString(),
      }
      const nuevo = await createProyecto(payload)
      if (nuevo) {
        setProyectos([...proyectos, nuevo])
        setNombre('')
        setCodigo('')
        setClienteId('')
        setComercialId('')
        setGestorId('')
        setFechaInicio('')
        setShowCreateDialog(false)
        toast.success('Proyecto creado exitosamente')
      }
    } catch {
      toast.error('Error al crear proyecto.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (proyecto: Proyecto) => {
    try {
      await deleteProyecto(proyecto.id)
      setProyectos((prev) => prev.filter((p) => p.id !== proyecto.id))
      toast.success('Proyecto eliminado')
      setDeleteConfirm({ show: false })
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar proyecto'
      toast.error(mensaje)
    }
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'activo': return 'default'
      default: return 'outline'
    }
  }

  // Stats
  const stats = {
    total: proyectos.length,
    activos: proyectos.filter(p => p.estado === 'activo').length,
    cerrados: proyectos.filter(p => p.estado === 'cerrado').length,
    // Consolidate all projects to USD for KPI totals
    totalValor: proyectos.reduce((sum, p) => {
      const monto = p.totalCliente || 0
      if (p.moneda === 'PEN' && p.tipoCambio) return sum + monto / p.tipoCambio
      return sum + monto
    }, 0)
  }

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Proyectos</h1>
          <Badge variant="secondary" className="text-xs">
            {stats.total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-green-600" title="Activos">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.activos}</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600" title="Cerrados">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.cerrados}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1 text-emerald-600" title="Valor Total">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{formatCurrency(stats.totalValor)}</span>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">Nombre *</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del proyecto"
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Código *</Label>
                    <Input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ej: PRY-001"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Fecha Inicio *</Label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Cliente *</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-mono text-xs text-gray-500 mr-1">{c.codigo}</span>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Comercial *</Label>
                    <Select value={comercialId} onValueChange={setComercialId}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Gestor *</Label>
                    <Select value={gestorId} onValueChange={setGestorId}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Proyecto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.activos}</div>
          <div className="text-[10px] text-green-700">Activos</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{stats.cerrados}</div>
          <div className="text-[10px] text-emerald-700">Cerrados</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalValor)}</div>
          <div className="text-[10px] text-emerald-700">Total</div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="pausado">Pausados</SelectItem>
            <SelectItem value="cerrado">Cerrados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-8 rounded-r-none px-2"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 rounded-l-none px-2"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredProyectos.length} de {proyectos.length}
        </span>
      </div>

      {/* Projects List */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProyectos.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {searchTerm || filterStatus !== 'all' ? 'No se encontraron proyectos' : 'No hay proyectos'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Ajusta los filtros de búsqueda'
                      : 'Comienza creando tu primer proyecto'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button onClick={() => setShowCreateDialog(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Proyecto
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredProyectos.map((proyecto) => (
              <Card key={proyecto.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{proyecto.nombre}</h3>
                      <p className="text-xs text-gray-500 font-mono">{proyecto.codigo}</p>
                    </div>
                    <Badge variant={getEstadoBadgeVariant(proyecto.estado)} className="text-[10px] ml-2">
                      {proyecto.estado}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{proyecto.cliente?.nombre || 'Sin cliente'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <div className="flex items-center gap-1" title="Comercial">
                        <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{proyecto.comercial?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Gestor">
                        <UserCog className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{proyecto.gestor?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Supervisor">
                        <HardHat className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{(proyecto as any).supervisor?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Líder">
                        <Settings className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{(proyecto as any).lider?.name || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span>{proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString() : 'Sin fecha'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm font-bold text-green-600">
                      {getMonedaSymbol(proyecto.moneda)} {proyecto.totalCliente.toLocaleString()}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteConfirm({ show: true, proyecto })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 font-medium w-20">Código</th>
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium hidden md:table-cell">Cliente</th>
                    <th className="text-left p-2 font-medium hidden lg:table-cell">Comercial</th>
                    <th className="text-left p-2 font-medium hidden md:table-cell">Gestor</th>
                    <th className="text-left p-2 font-medium hidden xl:table-cell">Supervisor</th>
                    <th className="text-left p-2 font-medium hidden xl:table-cell">Líder</th>
                    <th className="text-left p-2 font-medium w-20">Estado</th>
                    <th className="text-right p-2 font-medium w-20">Total</th>
                    <th className="text-center p-2 font-medium w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProyectos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <p>No se encontraron proyectos</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProyectos.map((proyecto) => (
                      <tr key={proyecto.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-[10px] text-gray-500">{proyecto.codigo}</td>
                        <td className="p-2">
                          <button
                            className="text-blue-600 hover:underline font-medium text-left line-clamp-2 leading-tight"
                            onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                            title={proyecto.nombre}
                          >
                            {proyecto.nombre}
                          </button>
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[100px] hidden md:table-cell" title={proyecto.cliente?.nombre}>
                          {proyecto.cliente?.nombre || '—'}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[80px] hidden lg:table-cell" title={proyecto.comercial?.name ?? undefined}>
                          {proyecto.comercial?.name || '—'}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[80px] hidden md:table-cell" title={proyecto.gestor?.name ?? undefined}>
                          {proyecto.gestor?.name || '—'}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[80px] hidden xl:table-cell" title={(proyecto as any).supervisor?.name}>
                          {(proyecto as any).supervisor?.name || '—'}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-[80px] hidden xl:table-cell" title={(proyecto as any).lider?.name}>
                          {(proyecto as any).lider?.name || '—'}
                        </td>
                        <td className="p-2">
                          <Badge variant={getEstadoBadgeVariant(proyecto.estado)} className="text-[9px] px-1.5">
                            {proyecto.estado}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-medium text-green-600 whitespace-nowrap">
                          {getMonedaSymbol(proyecto.moneda)} {proyecto.totalCliente.toLocaleString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-0.5 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteConfirm({ show: true, proyecto })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => setDeleteConfirm({ show: open })}
        title="Eliminar Proyecto"
        description={`¿Eliminar "${deleteConfirm.proyecto?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteConfirm.proyecto && handleDelete(deleteConfirm.proyecto)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}
