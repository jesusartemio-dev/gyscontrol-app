/**
 * 📄 Ejemplo de Uso del Componente de Paginación
 * 
 * Demuestra la integración del componente DataPagination
 * con las APIs paginadas del sistema GYS.
 * 
 * @author Sistema GYS
 * @version 1.0.0
 */

'use client'

import React from 'react'
import { DataPagination, usePagination } from '@/components/ui/data-pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Package, Users, FileText } from 'lucide-react'
import type { PaginationMeta } from '@/types/payloads'

// 🎨 Interfaces de ejemplo
interface ExampleItem {
  id: string
  nombre: string
  estado: string
  fecha: string
  tipo: string
}

interface PaginatedResponse {
  items: ExampleItem[]
  pagination: PaginationMeta
}

// 🔧 Componente de ejemplo con cotizaciones
export const CotizacionesPaginationExample: React.FC = () => {
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(1, 25)
  const [data, setData] = React.useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // 📡 Simular llamada a API de cotizaciones
  const fetchCotizaciones = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 🔄 Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 📊 Datos simulados
      const totalItems = 247
      const totalPages = Math.ceil(totalItems / limit)
      const startIndex = (page - 1) * limit
      
      const mockItems: ExampleItem[] = Array.from({ length: Math.min(limit, totalItems - startIndex) }, (_, i) => ({
        id: `COT-${String(startIndex + i + 1).padStart(4, '0')}`,
        nombre: `Cotización ${startIndex + i + 1}`,
        estado: ['Borrador', 'Enviada', 'Aprobada', 'Rechazada'][Math.floor(Math.random() * 4)],
        fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        tipo: ['Equipos', 'Servicios', 'Mixta'][Math.floor(Math.random() * 3)]
      }))
      
      const mockResponse: PaginatedResponse = {
        items: mockItems,
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
      
      setData(mockResponse)
    } catch (err) {
      setError('Error al cargar las cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [page, limit])
  
  // 🔄 Efecto para cargar datos
  React.useEffect(() => {
    fetchCotizaciones()
  }, [fetchCotizaciones])
  
  // 🎨 Función para obtener color del badge según estado
  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'Aprobada': return 'default'
      case 'Enviada': return 'secondary'
      case 'Borrador': return 'outline'
      case 'Rechazada': return 'destructive'
      default: return 'outline'
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cotizaciones - Ejemplo de Paginación
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 📊 Lista de items */}
        <div className="space-y-4">
          {loading ? (
            // 💀 Skeleton loader
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))
          ) : error ? (
            // ❌ Estado de error
            <div className="flex items-center justify-center p-8 text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : data?.items.length === 0 ? (
            // 📭 Estado vacío
            <div className="flex items-center justify-center p-8 text-gray-500">
              <Package className="h-8 w-8 mr-2" />
              No se encontraron cotizaciones
            </div>
          ) : (
            // ✅ Lista de items
            data?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-medium">{item.nombre}</h3>
                  <p className="text-sm text-gray-600">{item.fecha} • {item.tipo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getEstadoBadgeVariant(item.estado)}>
                    {item.estado}
                  </Badge>
                  <span className="text-sm text-gray-500">{item.id}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* 🔄 Componente de paginación */}
        {data && (
          <DataPagination
            pagination={data.pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            limitOptions={[10, 25, 50, 100]}
            showLimitSelector={true}
            showItemsInfo={true}
            showPageJump={true}
            showQuickNavigation={true}
            itemsLabel="cotizaciones"
            className="mt-6"
          />
        )}
      </CardContent>
    </Card>
  )
}

// 🔧 Componente de ejemplo con pedidos de equipo
export const PedidosEquipoPaginationExample: React.FC = () => {
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(1, 10)
  const [data, setData] = React.useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  
  // 📡 Simular llamada a API de pedidos de equipo
  const fetchPedidos = React.useCallback(async () => {
    try {
      setLoading(true)
      
      // 🔄 Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 📊 Datos simulados
      const totalItems = 89
      const totalPages = Math.ceil(totalItems / limit)
      const startIndex = (page - 1) * limit
      
      const mockItems: ExampleItem[] = Array.from({ length: Math.min(limit, totalItems - startIndex) }, (_, i) => ({
        id: `PED-${String(startIndex + i + 1).padStart(4, '0')}`,
        nombre: `Pedido de Equipo ${startIndex + i + 1}`,
        estado: ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'][Math.floor(Math.random() * 4)],
        fecha: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        tipo: ['Urgente', 'Normal', 'Programado'][Math.floor(Math.random() * 3)]
      }))
      
      const mockResponse: PaginatedResponse = {
        items: mockItems,
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
      
      setData(mockResponse)
    } catch (err) {
      console.error('Error al cargar pedidos:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit])
  
  // 🔄 Efecto para cargar datos
  React.useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pedidos de Equipo - Paginación Compacta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 📊 Lista compacta */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : (
            data?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="font-medium text-sm">{item.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2">{item.fecha}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.estado}
                </Badge>
              </div>
            ))
          )}
        </div>
        
        {/* 🔄 Paginación compacta */}
        {data && (
          <DataPagination
            pagination={data.pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            limitOptions={[5, 10, 20]}
            showLimitSelector={true}
            showItemsInfo={true}
            showPageJump={false}
            showQuickNavigation={false}
            itemsLabel="pedidos"
            size="sm"
            className="mt-4"
          />
        )}
      </CardContent>
    </Card>
  )
}

// 📄 Componente principal de ejemplos
export const PaginationExamples: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Ejemplos de Paginación</h1>
        <p className="text-gray-600">
          Demostración del componente DataPagination integrado con APIs del sistema GYS.
        </p>
      </div>
      
      <CotizacionesPaginationExample />
      <PedidosEquipoPaginationExample />
    </div>
  )
}

export default PaginationExamples