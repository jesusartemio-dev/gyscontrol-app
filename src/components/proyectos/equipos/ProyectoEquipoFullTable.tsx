// ===================================================
// 📁 Archivo: ProyectoEquipoFullTable.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Tabla completa que muestra todos los ítems de equipos de un proyecto
//
// 🧠 Uso: Utilizado en la vista de tabla completa de equipos del proyecto
// ✍️ Autor: Kilo Code
// 📅 Última actualización: 2025-09-27
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react'

interface Props {
  equipos: ProyectoEquipo[]
  onItemChange: (equipoId: string, items: ProyectoEquipoItem[]) => void
  onUpdatedNombre: (equipoId: string, nuevoNombre: string) => void
  onDeletedGrupo: (equipoId: string) => void
  onChange: (equipoId: string, changes: Partial<ProyectoEquipo>) => void
}

// Tipo para ítem con información del grupo
interface ItemWithGroup extends ProyectoEquipoItem {
  grupoId: string
  grupoNombre: string
  grupoResponsable?: string
}

const ProyectoEquipoFullTable = memo(function ProyectoEquipoFullTable({
  equipos,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('grupoNombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterEstado, setFilterEstado] = useState<string>('todos')

  // ✅ Preparar datos: aplanar todos los ítems con info del grupo
  const allItems: ItemWithGroup[] = useMemo(() => {
    return equipos.flatMap(equipo =>
      equipo.items.map(item => ({
        ...item,
        grupoId: equipo.id,
        grupoNombre: equipo.nombre,
        grupoResponsable: equipo.responsable?.name || 'Sin asignar'
      }))
    )
  }, [equipos])

  // ✅ Filtrar ítems
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.grupoNombre.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = filterEstado === 'todos' || item.estado === filterEstado

      return matchesSearch && matchesEstado
    })
  }, [allItems, searchTerm, filterEstado])

  // ✅ Ordenar ítems (primero por grupo, luego por campo seleccionado)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // Primero ordenar por grupo (siempre ascendente para mantener consistencia)
      if (a.grupoNombre !== b.grupoNombre) {
        return a.grupoNombre.localeCompare(b.grupoNombre)
      }

      // Dentro del mismo grupo, ordenar por el campo seleccionado
      let aValue: any = a[sortField as keyof ItemWithGroup]
      let bValue: any = b[sortField as keyof ItemWithGroup]

      // Manejar campos especiales
      if (sortField === 'costoInterno') {
        aValue = a.cantidad * a.precioInterno
        bValue = b.cantidad * b.precioInterno
      } else if (sortField === 'costoCliente') {
        aValue = a.cantidad * a.precioCliente
        bValue = b.cantidad * b.precioCliente
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredItems, sortField, sortDirection])

  // ✅ Función para manejar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // ✅ Función para obtener ícono de ordenamiento
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  // ✅ Función para obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'en_lista': return 'bg-green-100 text-green-800'
      case 'reemplazado': return 'bg-blue-100 text-blue-800'
      case 'descartado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // ✅ Calcular totales
  const totales = useMemo(() => {
    return sortedItems.reduce((acc, item) => ({
      cantidad: acc.cantidad + item.cantidad,
      costoInterno: acc.costoInterno + (item.cantidad * item.precioInterno),
      costoCliente: acc.costoCliente + (item.cantidad * item.precioCliente)
    }), { cantidad: 0, costoInterno: 0, costoCliente: 0 })
  }, [sortedItems])

  return (
    <div className="space-y-4">
      {/* 🔍 Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, descripción o grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_lista">En Lista</SelectItem>
              <SelectItem value="reemplazado">Reemplazado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          {sortedItems.length} de {allItems.length} ítems
        </div>
      </div>

      {/* 📊 Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('grupoNombre')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Grupo {getSortIcon('grupoNombre')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('codigo')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Código {getSortIcon('codigo')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('descripcion')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Descripción {getSortIcon('descripcion')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Unidad</TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('cantidad')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Cantidad {getSortIcon('cantidad')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('precioInterno')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Precio Interno {getSortIcon('precioInterno')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('precioCliente')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Precio Cliente {getSortIcon('precioCliente')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('costoInterno')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Costo Interno {getSortIcon('costoInterno')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('costoCliente')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Costo Cliente {getSortIcon('costoCliente')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    No se encontraron ítems que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={`${item.grupoId}-${item.id}`} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold text-blue-600">{item.grupoNombre}</div>
                        <div className="text-xs text-gray-500">{item.grupoResponsable}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.descripcion}>
                        {item.descripcion}
                      </div>
                    </TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono">{item.cantidad}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${item.precioInterno.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${item.precioCliente.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${(item.cantidad * item.precioInterno).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${(item.cantidad * item.precioCliente).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(item.estado)}>
                        {item.estado.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 📈 Totales */}
      {sortedItems.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Ítems:</span> {totales.cantidad}
              </div>
              <div>
                <span className="font-medium">Total Costo Interno:</span> ${totales.costoInterno.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Total Costo Cliente:</span> ${totales.costoCliente.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default ProyectoEquipoFullTable