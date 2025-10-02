'use client'

// ===================================================
// 📁 Archivo: VistaTablaDual.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaTablaDual.tsx
// 🔧 Descripción: Vista de tabla comparativa dual para equipos
//
// 🎨 Mejoras UX/UI aplicadas:
// - Tabla responsiva con scroll horizontal
// - Colores diferenciados por tipo de cambio
// - Badges informativos
// - Hover effects y animaciones
// ===================================================

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Package,
  DollarSign
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProyectoEquipoCotizadoItem, ListaEquipoItem } from '@/types'

// 🎯 Tipos para el componente
interface ComparisonData {
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  category: string
  pei: ProyectoEquipoCotizadoItem | null
  lei: ListaEquipoItem | null
  grupo: string
  costoPEI: number
  costoLEI: number
  diferencia: number
  estado: string
  trazabilidad?: {
    original: ProyectoEquipoCotizadoItem
    reemplazo: ListaEquipoItem
    motivo: string
  }
}

interface Summary {
  mantenidos: number
  reemplazados: number
  agregados: number
  descartados: number
  totalItems: number
  impactoFinanciero: number
  porcentajeCambio: number
}

interface Props {
  comparisons: ComparisonData[]
  summary: Summary
  className?: string
}

// 🎨 Utilidades para estilos y colores
const getTypeColor = (type: string) => {
  switch (type) {
    case 'mantenido': return 'bg-green-100 text-green-800 border-green-200'
    case 'reemplazado': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'agregado': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'descartado': return 'bg-red-100 text-red-800 border-red-200'
    case 'no_incluido': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'mantenido': return <CheckCircle className="w-4 h-4" />
    case 'reemplazado': return <ArrowLeftRight className="w-4 h-4" />
    case 'agregado': return <Package className="w-4 h-4" />
    case 'descartado': return <XCircle className="w-4 h-4" />
    case 'no_incluido': return <AlertTriangle className="w-4 h-4" />
    default: return <Info className="w-4 h-4" />
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'mantenido': return 'Mantenido'
    case 'reemplazado': return 'Reemplazado'
    case 'agregado': return 'Agregado'
    case 'descartado': return 'Descartado'
    case 'no_incluido': return 'No Incluido'
    default: return 'Desconocido'
  }
}

const getDifferenceColor = (diferencia: number) => {
  if (diferencia > 0) return 'text-red-600'
  if (diferencia < 0) return 'text-green-600'
  return 'text-gray-600'
}

const getDifferenceIcon = (diferencia: number) => {
  if (diferencia > 0) return <TrendingUp className="w-4 h-4 text-red-600" />
  if (diferencia < 0) return <TrendingDown className="w-4 h-4 text-green-600" />
  return null
}

const getRowBgColor = (type: string) => {
  switch (type) {
    case 'mantenido': return 'hover:bg-green-50'
    case 'reemplazado': return 'hover:bg-blue-50'
    case 'agregado': return 'hover:bg-purple-50'
    case 'descartado': return 'hover:bg-red-50'
    case 'no_incluido': return 'hover:bg-gray-50'
    default: return 'hover:bg-gray-50'
  }
}

const VistaTablaDual = memo(function VistaTablaDual({ comparisons, summary, className = '' }: Props) {
  // 🔄 Filtrar datos por tipo con memoización
  const { mantenidos, reemplazados, agregados, descartados } = useMemo(() => ({
    mantenidos: comparisons.filter(c => c.type === 'mantenido'),
    reemplazados: comparisons.filter(c => c.type === 'reemplazado'),
    agregados: comparisons.filter(c => c.type === 'agregado'),
    descartados: comparisons.filter(c => c.type === 'descartado')
  }), [comparisons])

  return (
    <Card className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span>Tabla Comparativa: Comercial vs Proyectos</span>
          <Badge variant="outline" className="ml-2">
            {comparisons.length} comparaciones
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[120px] font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Grupo</TableHead>
                <TableHead className="font-semibold">Comercial (PEI)</TableHead>
                <TableHead className="font-semibold">Proyectos (LEI)</TableHead>
                <TableHead className="w-[140px] font-semibold text-right">Costo Comercial</TableHead>
                <TableHead className="w-[140px] font-semibold text-right">Costo Proyectos</TableHead>
                <TableHead className="w-[140px] font-semibold text-right">Diferencia</TableHead>
                <TableHead className="w-[100px] font-semibold text-center">Impacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comparison, index) => {
                const { type, pei, lei, grupo, costoPEI, costoLEI, diferencia, trazabilidad } = comparison
                
                return (
                  <motion.tr
                    key={`${pei?.id || 'new'}-${lei?.id || 'none'}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`transition-colors duration-200 ${getRowBgColor(type)}`}
                  >
                    {/* Estado */}
                    <TableCell>
                      <Badge className={`${getTypeColor(type)} flex items-center space-x-1 text-xs`}>
                        {getTypeIcon(type)}
                        <span>{getTypeLabel(type)}</span>
                      </Badge>
                    </TableCell>

                    {/* Grupo */}
                    <TableCell className="font-medium text-gray-900">
                      {grupo || 'Sin grupo'}
                    </TableCell>

                    {/* Comercial (PEI) */}
                    <TableCell>
                      {pei ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {pei.descripcion}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pei.marca} | Cant: {pei.cantidad}
                          </div>
                          {pei.motivoCambio && (
                            <div className="text-xs text-blue-600 italic">
                              {pei.motivoCambio}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No disponible</span>
                      )}
                    </TableCell>

                    {/* Proyectos (LEI) */}
                    <TableCell>
                      {lei ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {lei.descripcion}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lei.catalogoEquipo?.marca || 'Sin marca'} | Cant: {lei.cantidad}
                          </div>
                          {lei.comentarioRevision && (
                            <div className="text-xs text-green-600 italic">
                              {lei.comentarioRevision}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No disponible</span>
                      )}
                    </TableCell>

                    {/* Costo Comercial */}
                    <TableCell className="text-right font-mono">
                      {costoPEI > 0 ? (
                        <span className="text-blue-700 font-semibold">
                          {formatCurrency(costoPEI)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* Costo Proyectos */}
                    <TableCell className="text-right font-mono">
                      {costoLEI > 0 ? (
                        <span className="text-green-700 font-semibold">
                          {formatCurrency(costoLEI)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* Diferencia */}
                    <TableCell className="text-right font-mono">
                      <div className="flex items-center justify-end space-x-1">
                        {getDifferenceIcon(diferencia)}
                        <span className={`font-semibold ${getDifferenceColor(diferencia)}`}>
                          {diferencia !== 0 ? (
                            `${diferencia > 0 ? '+' : ''}${formatCurrency(diferencia)}`
                          ) : (
                            '±0.00'
                          )}
                        </span>
                      </div>
                    </TableCell>

                    {/* Impacto */}
                    <TableCell className="text-center">
                      {Math.abs(diferencia) > 1000 ? (
                        <Badge variant="default" className="text-xs bg-red-100 text-red-800">
                          Alto
                        </Badge>
                      ) : Math.abs(diferencia) > 500 ? (
                        <Badge variant="secondary" className="text-xs">
                          Medio
                        </Badge>
                      ) : diferencia !== 0 ? (
                        <Badge variant="outline" className="text-xs">
                          Bajo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Neutro
                        </Badge>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* 📊 Resumen al final de la tabla */}
        <div className="border-t bg-gray-50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {mantenidos.length}
              </div>
              <div className="text-green-600">Mantenidos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {reemplazados.length}
              </div>
              <div className="text-blue-600">Reemplazados</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {agregados.length}
              </div>
              <div className="text-purple-600">Agregados</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {descartados.length}
              </div>
              <div className="text-red-600">Descartados</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default VistaTablaDual
