'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getProyectos, deleteProyecto, createProyecto } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoPayload } from '@/types'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Users, 
  Building2, 
  Trash2, 
  Eye,
  FolderOpen,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

// Roles permitidos para acceder a la página de Proyectos
const ALLOWED_ROLES = [
  'proyectos',
  'coordinador',
  'gestor',
  'gerente',
  'admin',
]

type ViewMode = 'cards' | 'table'
type FilterStatus = 'all' | 'activo' | 'pausado' | 'completado' | 'cancelado'
type SortOption = 'nombre' | 'codigo' | 'fecha' | 'total'

export default function ProyectosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [filteredProyectos, setFilteredProyectos] = useState<Proyecto[]>([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortOption>('fecha')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; proyecto?: Proyecto }>({
    show: false
  })

  // 🔐 Protección de ruta por rol
  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user.role
    if (!role || !ALLOWED_ROLES.includes(role)) {
      router.replace('/denied')
    }
  }, [session, status, router])

  // 🔄 Cargar proyectos
  useEffect(() => {
    getProyectos()
      .then(setProyectos)
      .catch(() => toast.error('Error al cargar proyectos.'))
  }, [])

  // 🔍 Filtrar y ordenar proyectos
  useEffect(() => {
    let filtered = [...proyectos]

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.estado === filterStatus)
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre)
        case 'codigo':
          return a.codigo.localeCompare(b.codigo)
        case 'fecha':
          return new Date(b.fechaInicio || 0).getTime() - new Date(a.fechaInicio || 0).getTime()
        case 'total':
          return b.totalCliente - a.totalCliente
        default:
          return 0
      }
    })

    setFilteredProyectos(filtered)
  }, [proyectos, searchTerm, filterStatus, sortBy])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload: ProyectoPayload = {
        clienteId: '',
        comercialId: '',
        gestorId: '',
        nombre,
        codigo,
        totalCliente: 0,
        totalInterno: 0,
        totalEquiposInterno: 0,
        totalServiciosInterno: 0,
        totalGastosInterno: 0,
        descuento: 0,
        grandTotal: 0,
        estado: 'activo',
        fechaInicio: new Date().toISOString(),
      }

      const nuevo = await createProyecto(payload)
      if (nuevo) {
        setProyectos([...proyectos, nuevo])
        setNombre('')
        setCodigo('')
        setShowCreateForm(false)
        toast.success('✅ Proyecto creado exitosamente')
      }
    } catch {
      toast.error('❌ Error al crear proyecto.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (proyecto: Proyecto) => {
    try {
      await deleteProyecto(proyecto.id)
      setProyectos((prev) => prev.filter((p) => p.id !== proyecto.id))
      toast.success('🗑️ Proyecto eliminado correctamente')
      setDeleteConfirm({ show: false })
    } catch {
      toast.error('❌ Error al eliminar proyecto.')
    }
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'activo': return 'default'
      case 'pausado': return 'outline'
      case 'completado': return 'outline'
      case 'cancelado': return 'outline'
      default: return 'outline'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'text-green-600'
      case 'pausado': return 'text-yellow-600'
      case 'completado': return 'text-blue-600'
      case 'cancelado': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  // 📊 Estadísticas
  const stats = {
    total: proyectos.length,
    activos: proyectos.filter(p => p.estado === 'activo').length,
    completados: proyectos.filter(p => p.estado === 'completado').length,
    totalValor: proyectos.reduce((sum, p) => sum + p.totalCliente, 0)
  }

  return (
    <div className="space-y-6">
      {/* 📊 Header con estadísticas */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Gestión de Proyectos
          </h1>
          <p className="text-gray-600 mt-1">
            Administra y supervisa todos los proyectos de la empresa
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Total Proyectos</p>
                <p className="font-bold text-lg">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Activos</p>
                <p className="font-bold text-lg text-green-600">{stats.activos}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Valor Total</p>
                <p className="font-bold text-lg">$ {stats.totalValor.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 🔧 Controles y filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Búsqueda */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar proyectos, códigos o clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtros */}
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="pausado">Pausados</SelectItem>
                  <SelectItem value="completado">Completados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fecha">Por Fecha</SelectItem>
                  <SelectItem value="nombre">Por Nombre</SelectItem>
                  <SelectItem value="codigo">Por Código</SelectItem>
                  <SelectItem value="total">Por Valor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Controles de vista */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabla
              </Button>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="ml-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proyecto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📝 Formulario de creación */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Crear Nuevo Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Proyecto</label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ingresa el nombre del proyecto"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Código</label>
                  <Input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Código único del proyecto"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false)
                    setError(null)
                    setNombre('')
                    setCodigo('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 📋 Lista de proyectos */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProyectos.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {searchTerm || filterStatus !== 'all' ? 'No se encontraron proyectos' : 'No hay proyectos registrados'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'Comienza creando tu primer proyecto'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Proyecto
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredProyectos.map((proyecto) => (
              <Card key={proyecto.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {proyecto.nombre}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-mono">{proyecto.codigo}</p>
                    </div>
                    <Badge variant={getEstadoBadgeVariant(proyecto.estado)}>
                      {proyecto.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>{proyecto.cliente?.nombre || 'Sin cliente asignado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{proyecto.comercial?.name || 'Sin comercial asignado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString() : 'Sin fecha'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Valor Total</span>
                      <span className="text-lg font-bold text-green-600">
                        $ {proyecto.totalCliente.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setDeleteConfirm({ show: true, proyecto })}
                      >
                        <Trash2 className="h-4 w-4" />
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold">Código</th>
                    <th className="text-left p-4 font-semibold">Nombre</th>
                    <th className="text-left p-4 font-semibold">Cliente</th>
                    <th className="text-left p-4 font-semibold">Comercial</th>
                    <th className="text-left p-4 font-semibold">Estado</th>
                    <th className="text-left p-4 font-semibold">Inicio</th>
                    <th className="text-right p-4 font-semibold">Total Cliente</th>
                    <th className="text-center p-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProyectos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500">
                        <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-semibold mb-2">
                          {searchTerm || filterStatus !== 'all' ? 'No se encontraron proyectos' : 'No hay proyectos registrados'}
                        </p>
                        <p className="text-sm">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Comienza creando tu primer proyecto'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProyectos.map((proyecto) => (
                      <tr key={proyecto.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-sm">{proyecto.codigo}</td>
                        <td className="p-4">
                          <button
                            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline text-left"
                            onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                          >
                            {proyecto.nombre}
                          </button>
                        </td>
                        <td className="p-4 text-sm">{proyecto.cliente?.nombre || '—'}</td>
                        <td className="p-4 text-sm">{proyecto.comercial?.name || '—'}</td>
                        <td className="p-4">
                          <Badge variant={getEstadoBadgeVariant(proyecto.estado)}>
                            {proyecto.estado}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right font-semibold">
                          $ {proyecto.totalCliente.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setDeleteConfirm({ show: true, proyecto })}
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* 🗑️ Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => setDeleteConfirm({ show: open })}
        title="Eliminar Proyecto"
        description={`¿Estás seguro de que deseas eliminar el proyecto "${deleteConfirm.proyecto?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteConfirm.proyecto && handleDelete(deleteConfirm.proyecto)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}
