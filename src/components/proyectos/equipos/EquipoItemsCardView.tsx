// ===================================================
// 📁 Archivo: EquipoItemsCardView.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Vista de cards para los ítems de un equipo específico
//
// 🧠 Uso: Se utiliza en la página de detalle de equipo para mostrar ítems en cards
// ✍️ Autor: Kilo Code
// 📅 Última actualización: 2025-09-27
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, Edit, Package, DollarSign, Hash } from 'lucide-react'

type EquipoWithItems = Omit<ProyectoEquipoCotizado, 'proyecto' | 'responsable'> & {
  items: ProyectoEquipoCotizadoItem[]
}

interface Props {
  equipo: {
    id: string
    nombre: string
    descripcion: string | null
    subtotalInterno: number
    subtotalCliente: number
    subtotalReal: number
    createdAt: Date
    updatedAt: Date
    proyectoId: string
    responsableId: string
    items: any[]
  }
  onItemChange: (items: any[]) => void
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

const EquipoItemsCardView = memo(function EquipoItemsCardView({
  equipo,
  onItemChange
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('todos')

  // ✅ Filtrar ítems
  const filteredItems = useMemo(() => {
    return equipo.items?.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = filterEstado === 'todos' || item.estado === filterEstado

      return matchesSearch && matchesEstado
    }) || []
  }, [equipo.items, searchTerm, filterEstado])

  return (
    <div className="space-y-4">
      {/* 🔍 Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código o descripción..."
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
          {filteredItems.length} de {equipo.items?.length || 0} ítems
        </div>
      </div>

      {/* 📋 Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No se encontraron ítems que coincidan con los filtros
          </div>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-mono text-blue-600">
                      {item.codigo}
                    </CardTitle>
                    <Badge className={getEstadoColor(item.estado)} variant="secondary">
                      {item.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.descripcion}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Unidad:</span>
                  </div>
                  <span className="font-medium">{item.unidad}</span>

                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Cantidad:</span>
                  </div>
                  <span className="font-medium">{item.cantidad}</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Precio Interno:</span>
                    <span className="text-sm font-medium">
                      ${item.precioInterno.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Precio Cliente:</span>
                    <span className="text-sm font-medium">
                      ${item.precioCliente.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Total Cliente:
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      ${(item.cantidad * item.precioCliente).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 📈 Totales */}
      {filteredItems.length > 0 && (
        <div className="flex justify-end">
          <Card className="w-fit">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Ítems:</span>{' '}
                  {filteredItems.reduce((sum, item) => sum + item.cantidad, 0)}
                </div>
                <div>
                  <span className="font-medium">Total Costo:</span>{' '}
                  ${filteredItems.reduce((sum, item) =>
                    sum + (item.cantidad * item.precioCliente), 0
                  ).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
})

export default EquipoItemsCardView