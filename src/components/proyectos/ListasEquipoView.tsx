'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  XCircle,
  LayoutGrid,
  LayoutList,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
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

const estadoColors: Record<EstadoListaEquipo, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviada: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  por_revisar: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  por_cotizar: 'bg-blue-50 text-blue-700 border-blue-200',
  por_validar: 'bg-orange-50 text-orange-700 border-orange-200',
  por_aprobar: 'bg-purple-50 text-purple-700 border-purple-200',
  aprobada: 'bg-green-50 text-green-700 border-green-200',
  rechazada: 'bg-red-50 text-red-700 border-red-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const estadoLabels: Record<EstadoListaEquipo, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  por_revisar: 'Por Revisar',
  por_cotizar: 'Por Cotizar',
  por_validar: 'Por Validar',
  por_aprobar: 'Por Aprobar',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  completada: 'Completada'
}

type ViewMode = 'table' | 'cards'

export function ListasEquipoView() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState<string>('todos')
  const [selectedEstado, setSelectedEstado] = useState<string>('todos')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

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
      {/* Stats & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-medium">
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

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs",
              viewMode === 'table' && "bg-white shadow-sm"
            )}
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="h-3.5 w-3.5 mr-1.5" />
            Tabla
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs",
              viewMode === 'cards' && "bg-white shadow-sm"
            )}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Cards
          </Button>
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
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((proyecto) => (
              <SelectItem key={proyecto.id} value={proyecto.id}>
                <span className="font-medium">{proyecto.codigo}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{proyecto.nombre}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="por_revisar">Por Revisar</SelectItem>
            <SelectItem value="por_cotizar">Por Cotizar</SelectItem>
            <SelectItem value="por_validar">Por Validar</SelectItem>
            <SelectItem value="por_aprobar">Por Aprobar</SelectItem>
            <SelectItem value="aprobada">Aprobada</SelectItem>
            <SelectItem value="rechazada">Rechazada</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
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
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-semibold text-gray-700">Lista</TableHead>
                <TableHead className="font-semibold text-gray-700 hidden md:table-cell">Proyecto</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-20">Items</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center hidden sm:table-cell">Fecha</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Estado</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListas.map((lista, idx) => (
                <TableRow
                  key={lista.id}
                  className={cn(
                    "hover:bg-blue-50/50 transition-colors",
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  )}
                >
                  {/* Lista Info */}
                  <TableCell>
                    <div>
                      <Link
                        href={`/proyectos/${lista.proyecto?.id}/equipos/listas/${lista.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {lista.nombre}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">
                        {lista.codigo}
                      </div>
                      {/* Mobile: Show project inline */}
                      <div className="md:hidden text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lista.proyecto?.nombre}
                      </div>
                    </div>
                  </TableCell>

                  {/* Proyecto - Desktop only */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">{lista.proyecto?.nombre}</span>
                    </div>
                  </TableCell>

                  {/* Items Count */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{lista._count?.listaEquipoItem || 0}</span>
                    </div>
                  </TableCell>

                  {/* Fecha */}
                  <TableCell className="text-center hidden sm:table-cell">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lista.createdAt), 'dd MMM yyyy', { locale: es })}
                    </div>
                    {lista.fechaNecesaria && (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-orange-600 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {format(new Date(lista.fechaNecesaria), 'dd MMM', { locale: es })}
                      </div>
                    )}
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-medium", estadoColors[lista.estado])}
                    >
                      {estadoLabels[lista.estado]}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <Link href={`/proyectos/${lista.proyecto?.id}/equipos/listas/${lista.id}`}>
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredListas.map((lista) => (
            <Card key={lista.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{lista.nombre}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{lista.codigo}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-medium shrink-0", estadoColors[lista.estado])}
                  >
                    {estadoLabels[lista.estado]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 pb-3 px-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{lista.proyecto?.nombre}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span className="font-medium">{lista._count?.listaEquipoItem || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(lista.createdAt), 'dd MMM', { locale: es })}
                      </span>
                    </div>
                    {lista.fechaNecesaria && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(lista.fechaNecesaria), 'dd MMM', { locale: es })}
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
