// ===================================================
// 📁 Archivo: EquiposCardView.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Vista de cards para la lista de equipos (grupos)
//
// 🧠 Uso: Se utiliza en la página de lista de equipos para mostrar equipos en cards
// ✍️ Autor: Kilo Code
// 📅 Última actualización: 2025-09-27
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import type { ProyectoEquipoCotizado } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Eye, Edit, Trash2, User, Package, DollarSign, TrendingUp, List } from 'lucide-react'
import Link from 'next/link'

interface Props {
  equipos: ProyectoEquipoCotizado[]
  proyectoId: string
  onEquipoChange?: (equipoId: string, changes: Partial<ProyectoEquipoCotizado>) => void
  onEquipoDelete?: (equipoId: string) => void
  onCreateList?: (equipo: ProyectoEquipoCotizado) => void
}

const EquiposCardView = memo(function EquiposCardView({
  equipos,
  proyectoId,
  onEquipoChange,
  onEquipoDelete,
  onCreateList
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  // ✅ Filtrar equipos
  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
      const matchesSearch = searchTerm === '' ||
        equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.responsable?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (equipo.descripcion && equipo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesSearch
    })
  }, [equipos, searchTerm])

  // ✅ Calcular estadísticas de un equipo
  const getEquipoStats = (equipo: ProyectoEquipoCotizado) => {
    const totalItems = equipo.items?.length || 0
    const totalCost = equipo.items?.reduce((sum, item) =>
      sum + (item.precioCliente * item.cantidad), 0
    ) || 0
    const completedItems = equipo.items?.filter(item =>
      item.estado === 'en_lista' || item.estado === 'reemplazado' || item.listaId
    ).length || 0
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    const hasListsCreated = completedItems > 0

    return { totalItems, totalCost, completedItems, progress, hasListsCreated }
  }

  return (
    <div className="space-y-4">
      {/* 🔍 Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, responsable o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredEquipos.length} de {equipos.length} equipos
        </div>
      </div>

      {/* 📋 Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipos.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No se encontraron equipos que coincidan con la búsqueda
          </div>
        ) : (
          filteredEquipos.map((equipo) => {
            const stats = getEquipoStats(equipo)
            return (
              <Card key={equipo.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold text-blue-600">
                        {equipo.nombre}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {equipo.responsable?.name || 'Sin asignar'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/proyectos/${proyectoId}/equipos/detalle/${equipo.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEquipoChange?.(equipo.id, {})}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEquipoDelete?.(equipo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {equipo.descripcion && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {equipo.descripcion}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-600">Ítems</div>
                        <div className="font-semibold">{stats.totalItems}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-600">Costo</div>
                        <div className="font-semibold">
                          ${stats.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        Progreso
                      </span>
                      <span className="font-medium">{stats.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 text-center">
                      {stats.completedItems} de {stats.totalItems} ítems completados
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/proyectos/${proyectoId}/equipos/${equipo.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
})

export default EquiposCardView