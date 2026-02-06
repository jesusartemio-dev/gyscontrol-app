'use client'

/**
 * ListaJornadas - Tabla/Lista de jornadas del supervisor
 *
 * Muestra las jornadas con sus estados y estadísticas
 * Permite filtrar por estado y fecha
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Building,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutList,
  LayoutGrid,
  Filter
} from 'lucide-react'

type EstadoJornada = 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado'
type ViewMode = 'table' | 'cards'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface Edt {
  id: string
  nombre: string
}

interface JornadaResumen {
  id: string
  proyecto: Proyecto
  proyectoEdt?: Edt | null
  fechaTrabajo: string
  estado: EstadoJornada
  objetivosDia?: string | null
  avanceDia?: string | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
  motivoRechazo?: string | null
  createdAt: string
}

interface ListaJornadasProps {
  jornadas: JornadaResumen[]
  onVerDetalle: (jornadaId: string) => void
  loading?: boolean
}

export function ListaJornadas({
  jornadas,
  onVerDetalle,
  loading = false
}: ListaJornadasProps) {
  // Default to cards on mobile
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getEstadoBadge = (estado: EstadoJornada) => {
    switch (estado) {
      case 'iniciado':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><Clock className="h-3 w-3 mr-1" />En curso</Badge>
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  // Filtrar jornadas
  const jornadasFiltradas = jornadas.filter(j => {
    // Filtro por estado
    if (estadoFilter !== 'todos' && j.estado !== estadoFilter) {
      return false
    }

    // Filtro por búsqueda
    if (busqueda) {
      const term = busqueda.toLowerCase()
      return (
        j.proyecto.codigo.toLowerCase().includes(term) ||
        j.proyecto.nombre.toLowerCase().includes(term) ||
        j.objetivosDia?.toLowerCase().includes(term) ||
        false
      )
    }

    return true
  })

  // Separar jornadas iniciadas del resto
  const jornadasIniciadas = jornadasFiltradas.filter(j => j.estado === 'iniciado')
  const otrasJornadas = jornadasFiltradas.filter(j => j.estado !== 'iniciado')

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Cargando jornadas...
        </CardContent>
      </Card>
    )
  }

  if (jornadas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No tienes jornadas registradas aún
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="space-y-3">
          {/* Title + View Toggle (desktop) */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Mis Jornadas</CardTitle>

            {/* Toggle de vista - solo desktop */}
            <div className="hidden sm:flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtros - Mobile optimized */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Búsqueda */}
            <Input
              placeholder="Buscar proyecto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="h-10 sm:h-9 sm:w-40"
            />

            {/* Filtro de estado */}
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="h-10 sm:h-9 sm:w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="iniciado">En curso</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {jornadasFiltradas.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No se encontraron jornadas con los filtros seleccionados
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Fecha</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="text-center w-20">Tareas</TableHead>
                  <TableHead className="text-center w-20">Personas</TableHead>
                  <TableHead className="text-center w-20">Horas</TableHead>
                  <TableHead className="text-right w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadasFiltradas.map(jornada => (
                  <TableRow key={jornada.id}>
                    <TableCell className="font-medium">
                      {formatFecha(jornada.fechaTrabajo)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{jornada.proyecto.codigo}</div>
                      {jornada.proyectoEdt && (
                        <div className="text-xs text-gray-500">{jornada.proyectoEdt.nombre}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(jornada.estado)}
                    </TableCell>
                    <TableCell className="text-center">
                      {jornada.cantidadTareas}
                    </TableCell>
                    <TableCell className="text-center">
                      {jornada.cantidadMiembros}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {jornada.totalHoras}h
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerDetalle(jornada.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {jornadasFiltradas.map(jornada => (
              <div
                key={jornada.id}
                className={`cursor-pointer transition-all active:scale-[0.98] rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3 ${
                  jornada.estado === 'rechazado' ? 'border-red-200 bg-red-50/30' :
                  jornada.estado === 'aprobado' ? 'border-blue-200 bg-blue-50/30' :
                  jornada.estado === 'pendiente' ? 'border-amber-200 bg-amber-50/30' :
                  jornada.estado === 'iniciado' ? 'border-green-200 bg-green-50/30' :
                  'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onVerDetalle(jornada.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base truncate">{jornada.proyecto.codigo}</div>
                    <div className="text-xs text-gray-500">
                      {formatFecha(jornada.fechaTrabajo)}
                    </div>
                  </div>
                  {getEstadoBadge(jornada.estado)}
                </div>

                {/* Objetivos - truncated */}
                {jornada.objetivosDia && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {jornada.objetivosDia}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    {jornada.cantidadTareas}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    {jornada.cantidadMiembros}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                    {jornada.totalHoras}h
                  </span>
                </div>

                {/* Motivo rechazo */}
                {jornada.motivoRechazo && (
                  <div className="text-xs text-red-600 bg-red-50 rounded p-2">
                    <strong>Rechazo:</strong> {jornada.motivoRechazo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
