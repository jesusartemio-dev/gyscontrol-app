/**
 * 📦 Cotizaciones Proveedores - Logística
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Package,
  Clock,
  CheckCircle,
  FileText,
  RefreshCw,
  Search,
  Filter,
  X,
  TrendingUp
} from 'lucide-react'

import { CotizacionProveedor, Proyecto, Proveedor } from '@/types'
import {
  getCotizacionesProveedor,
  deleteCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'
import { getProyectos } from '@/lib/services/proyecto'
import { getProveedores } from '@/lib/services/proveedor'

import ModalCrearCotizacionProveedor from '@/components/logistica/ModalCrearCotizacionProveedor'
import ModalCrearCotizacionCompleta from '@/components/logistica/ModalCrearCotizacionCompleta'
import LogisticaCotizacionesTable from '@/components/logistica/LogisticaCotizacionesTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ESTADOS_COTIZACION = [
  { value: 'all', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'cotizado', label: 'Cotizado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'seleccionado', label: 'Seleccionado' },
]

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [openModalCompleta, setOpenModalCompleta] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<string>('all')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [cotData, proyData, provData] = await Promise.all([
        getCotizacionesProveedor(),
        getProyectos(),
        getProveedores(),
      ])
      setCotizaciones(cotData || [])
      setProyectos(proyData || [])
      setProveedores(provData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter cotizaciones
  const cotizacionesFiltradas = cotizaciones.filter((cot) => {
    if (search) {
      const s = search.toLowerCase()
      const match =
        cot.codigo?.toLowerCase().includes(s) ||
        cot.proveedor?.nombre?.toLowerCase().includes(s) ||
        cot.proyecto?.nombre?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (estado !== 'all' && cot.estado !== estado) return false
    return true
  })

  // Stats
  const stats = {
    total: cotizaciones.length,
    pendientes: cotizaciones.filter(c => c.estado === 'pendiente').length,
    cotizados: cotizaciones.filter(c => c.estado === 'cotizado').length,
    seleccionados: cotizaciones.filter(c => c.estado === 'seleccionado').length,
  }

  const hasFilters = search || estado !== 'all'

  const clearFilters = () => {
    setSearch('')
    setEstado('all')
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteCotizacionProveedor(id)
    if (ok) {
      toast.success('Cotización eliminada')
      fetchData()
    } else {
      toast.error('Error al eliminar cotización')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header sticky */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Cotizaciones Proveedores</h1>
                <p className="text-[10px] text-muted-foreground">Gestión de solicitudes a proveedores</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>

              <Button
                size="sm"
                onClick={() => setOpenModalCompleta(true)}
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Nueva
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenModal(true)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Rápida
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <FileText className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pendientes</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{stats.pendientes}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cotizados</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-blue-600">{stats.cotizados}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Seleccionados</span>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{stats.seleccionados}</p>
          </div>
        </div>

        {/* Filtros en línea */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar por código, proveedor, proyecto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_COTIZACION.map((e) => (
                  <SelectItem key={e.value} value={e.value} className="text-xs">
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {cotizacionesFiltradas.length} de {cotizaciones.length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <LogisticaCotizacionesTable
            cotizaciones={cotizacionesFiltradas}
            onRefresh={fetchData}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modales */}
      <ModalCrearCotizacionProveedor
        open={openModal}
        onClose={() => setOpenModal(false)}
        proyectos={proyectos}
        proveedores={proveedores}
        onCreated={fetchData}
      />

      <ModalCrearCotizacionCompleta
        open={openModalCompleta}
        onClose={() => setOpenModalCompleta(false)}
        proyectos={proyectos}
        proveedores={proveedores}
        onCreated={fetchData}
      />
    </div>
  )
}
