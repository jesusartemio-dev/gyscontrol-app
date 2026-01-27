'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Search,
  Eye,
  Calendar,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  FileEdit,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ListaEquipo, EstadoListaEquipo } from '@/types'

async function fetchListasEquipo(proyectoId?: string, estado?: EstadoListaEquipo | 'todos' | 'all'): Promise<ListaEquipo[]> {
  try {
    const params = new URLSearchParams()
    if (proyectoId && proyectoId !== 'todos') params.append('proyectoId', proyectoId)
    if (estado && estado !== 'todos' && estado !== 'all') params.append('estado', estado)

    const url = `/api/listas-equipo${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error('Error al obtener listas de equipos')
    }

    const result = await response.json()
    return result.data || result || []
  } catch (error) {
    console.error('Error fetching listas:', error)
    toast.error('Error al cargar las listas de equipos')
    return []
  }
}

async function fetchProyectos() {
  try {
    const response = await fetch('/api/proyecto', { cache: 'no-store' })
    if (!response.ok) throw new Error('Error al obtener proyectos')
    return await response.json()
  } catch (error) {
    console.error('Error fetching proyectos:', error)
    return []
  }
}

const estadoBadgeVariant: Record<EstadoListaEquipo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'secondary',
  enviada: 'outline',
  por_revisar: 'default',
  por_cotizar: 'default',
  por_validar: 'default',
  por_aprobar: 'default',
  aprobada: 'default',
  rechazada: 'destructive',
  completada: 'default'
}

const estadoColors: Record<EstadoListaEquipo, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  enviada: 'bg-indigo-100 text-indigo-800',
  por_revisar: 'bg-yellow-100 text-yellow-800',
  por_cotizar: 'bg-blue-100 text-blue-800',
  por_validar: 'bg-orange-100 text-orange-800',
  por_aprobar: 'bg-purple-100 text-purple-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  completada: 'bg-emerald-100 text-emerald-800'
}

export function ListasEquipoView() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState<string>('todos')
  const [selectedEstado, setSelectedEstado] = useState<string>('todos')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [listasData, proyectosData] = await Promise.all([
          fetchListasEquipo(),
          fetchProyectos()
        ])
        setListas(listasData)
        setProyectos(proyectosData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadFilteredData = async () => {
      const filteredListas = await fetchListasEquipo(
        selectedProyecto === 'todos' ? undefined : selectedProyecto,
        selectedEstado === 'todos' ? undefined : selectedEstado as EstadoListaEquipo | 'todos' | 'all'
      )
      setListas(filteredListas)
    }

    loadFilteredData()
  }, [selectedProyecto, selectedEstado])

  const filteredListas = listas.filter(lista =>
    lista.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lista.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lista.proyecto?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats
  const stats = {
    total: filteredListas.length,
    borradores: filteredListas.filter(l => l.estado === 'borrador').length,
    enRevision: filteredListas.filter(l => ['por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar'].includes(l.estado)).length,
    aprobadas: filteredListas.filter(l => ['aprobada', 'completada'].includes(l.estado)).length,
    rechazadas: filteredListas.filter(l => l.estado === 'rechazada').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {stats.total} listas
        </Badge>

        {/* Inline Stats - Desktop */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-500" title="Borradores">
            <FileEdit className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.borradores}</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-600" title="En Revisión">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.enRevision}</span>
          </div>
          <div className="flex items-center gap-1 text-green-600" title="Aprobadas">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="font-medium">{stats.aprobadas}</span>
          </div>
          {stats.rechazadas > 0 && (
            <div className="flex items-center gap-1 text-red-600" title="Rechazadas">
              <XCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.rechazadas}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-600">{stats.borradores}</div>
          <div className="text-[10px] text-gray-700">Borradores</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-600">{stats.enRevision}</div>
          <div className="text-[10px] text-yellow-700">En Revisión</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.aprobadas}</div>
          <div className="text-[10px] text-green-700">Aprobadas</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-red-600">{stats.rechazadas}</div>
          <div className="text-[10px] text-red-700">Rechazadas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, código o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={selectedProyecto} onValueChange={setSelectedProyecto}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((proyecto) => (
              <SelectItem key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="EN_REVISION">En Revisión</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
            <SelectItem value="COMPLETADA">Completada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listas Grid */}
      {filteredListas.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Package className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No se encontraron listas</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedProyecto !== 'todos' || selectedEstado !== 'todos'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'No hay listas de equipos disponibles'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredListas.map((lista) => (
            <Card key={lista.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">{lista.nombre}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{lista.codigo}</span>
                      <span>•</span>
                      <span>{lista.proyecto?.nombre}</span>
                    </div>
                  </div>
                  <Badge
                    variant={estadoBadgeVariant[lista.estado]}
                    className={`${estadoColors[lista.estado]} text-xs`}
                  >
                    {lista.estado.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span>{lista._count?.listaEquipoItem || 0} ítems</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(lista.createdAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    {lista.fechaNecesaria && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>
                          Vence: {format(new Date(lista.fechaNecesaria), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/proyectos/${lista.proyecto?.id}/equipos/listas/${lista.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
