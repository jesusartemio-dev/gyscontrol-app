/**
 * 📦 Listas Técnicas - Logística
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Package, FileText, Building2, Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import LogisticaListasTable from '@/components/logistica/LogisticaListasTable'
import { buildApiUrl } from '@/lib/utils'
import type { ListaEquipo, Proyecto, EstadoListaEquipo } from '@/types'

const ESTADOS_LISTA: { value: EstadoListaEquipo | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'por_revisar', label: 'Por Revisar' },
  { value: 'por_cotizar', label: 'Por Cotizar' },
  { value: 'por_validar', label: 'Por Validar' },
  { value: 'por_aprobar', label: 'Por Aprobar' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
]

export default function LogisticaListasPage() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [proyectoId, setProyectoId] = useState<string>('all')
  const [estado, setEstado] = useState<string>('all')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [listasRes, proyectosRes] = await Promise.all([
        fetch(buildApiUrl('/api/lista-equipo')),
        fetch(buildApiUrl('/api/proyecto')),
      ])

      const listasData = await listasRes.json()
      const proyectosData = await proyectosRes.json()

      setListas(listasData)
      setProyectos(proyectosData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter listas
  const listasFiltradas = listas.filter((lista) => {
    if (search) {
      const s = search.toLowerCase()
      const match =
        lista.nombre?.toLowerCase().includes(s) ||
        lista.codigo?.toLowerCase().includes(s) ||
        lista.proyecto?.nombre?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (proyectoId !== 'all' && lista.proyectoId !== proyectoId) return false
    if (estado !== 'all' && lista.estado !== estado) return false
    return true
  })

  // Stats
  const stats = {
    total: listas.length,
    items: listas.reduce((sum, l) => sum + (l.listaEquipoItem?.length || 0), 0),
    proyectos: new Set(listas.map((l) => l.proyectoId)).size,
    porCotizar: listas.filter((l) => l.estado === 'por_cotizar').length,
  }

  const hasFilters = search || proyectoId !== 'all' || estado !== 'all'

  const clearFilters = () => {
    setSearch('')
    setProyectoId('all')
    setEstado('all')
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
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Listas Técnicas</h1>
                <p className="text-[10px] text-muted-foreground">Gestión de equipos por proyecto</p>
              </div>
            </div>

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
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Listas</span>
              <FileText className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Items</span>
              <Package className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.items}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Proyectos</span>
              <Building2 className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.proyectos}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Por Cotizar</span>
              <Badge variant="secondary" className="text-[10px] h-5">{stats.porCotizar}</Badge>
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{stats.porCotizar}</p>
          </div>
        </div>

        {/* Filtros en línea */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, código o proyecto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <Building2 className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los proyectos</SelectItem>
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_LISTA.map((e) => (
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
              {listasFiltradas.length} de {listas.length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <LogisticaListasTable
            listas={listasFiltradas}
            proyectos={proyectos}
            onRefresh={fetchData}
          />
        </div>
      </div>
    </div>
  )
}
