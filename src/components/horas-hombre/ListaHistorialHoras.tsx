'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Search, Filter, Download, Clock, User, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RegistroHoras {
  id: string
  fecha: Date
  horas: number
  descripcion: string
  nivel: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  elementoNombre: string
  proyectoNombre: string
  aprobado: boolean
}

interface ListaHistorialHorasProps {
  registros?: RegistroHoras[]
  loading?: boolean
  onExport?: () => void
}

export function ListaHistorialHoras({ 
  registros = [], 
  loading = false,
  onExport 
}: ListaHistorialHorasProps) {
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')

  // Filtrar registros
  const registrosFiltrados = registros.filter(registro => {
    const cumpleFecha = !filtroFecha || format(registro.fecha, 'yyyy-MM') === filtroFecha
    const cumpleProyecto = !filtroProyecto || registro.proyectoNombre.toLowerCase().includes(filtroProyecto.toLowerCase())
    const cumpleNivel = !filtroNivel || filtroNivel === 'todos' || registro.nivel === filtroNivel
    return cumpleFecha && cumpleProyecto && cumpleNivel
  })

  // Calcular totales
  const totalHoras = registrosFiltrados.reduce((sum, reg) => sum + reg.horas, 0)
  const registrosAprobados = registrosFiltrados.filter(reg => reg.aprobado).length
  const registrosPendientes = registrosFiltrados.filter(reg => !reg.aprobado).length

  const exportarCSV = () => {
    const csvContent = [
      ['Fecha', 'Proyecto', 'Elemento', 'Nivel', 'Horas', 'Descripción', 'Estado'].join(','),
      ...registrosFiltrados.map(reg => [
        format(reg.fecha, 'dd/MM/yyyy'),
        `"${reg.proyectoNombre}"`,
        `"${reg.elementoNombre}"`,
        reg.nivel,
        reg.horas,
        `"${reg.descripcion}"`,
        reg.aprobado ? 'Aprobado' : 'Pendiente'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial-horas-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    
    onExport?.()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3">Cargando historial...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalHoras}h</p>
                <p className="text-sm text-gray-600">Total Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{registrosFiltrados.length}</p>
                <p className="text-sm text-gray-600">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{registrosAprobados}</p>
                <p className="text-sm text-gray-600">Aprobados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{registrosPendientes}</p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input
                type="month"
                placeholder="Filtrar por mes"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por proyecto..."
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filtroNivel} onValueChange={setFiltroNivel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  <SelectItem value="proyecto">Proyecto</SelectItem>
                  <SelectItem value="fase">Fase</SelectItem>
                  <SelectItem value="edt">EDT</SelectItem>
                  <SelectItem value="actividad">Actividad</SelectItem>
                  <SelectItem value="tarea">Tarea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de registros */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registros de Horas</CardTitle>
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Elemento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(registro.fecha, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.proyectoNombre}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.elementoNombre}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {registro.nivel.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      {registro.horas}h
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {registro.descripcion}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge
                        variant={registro.aprobado ? 'default' : 'secondary'}
                        className={registro.aprobado ? 'bg-green-100 text-green-800' : ''}
                      >
                        {registro.aprobado ? 'Aprobado' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {registrosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron registros
              </h3>
              <p className="text-gray-600">
                No hay registros de horas que coincidan con los filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}