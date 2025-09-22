'use client'

import { motion } from 'framer-motion'
import { Building2, Phone, Mail, MapPin, Eye, Edit3, Trash2, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

interface Cliente {
  id: string
  nombre: string
  ruc?: string
  correo?: string
  telefono?: string
  direccion?: string
  sector?: string
  estadoRelacion?: string
  calificacion?: number
}

interface ClienteGridViewProps {
  clientes: Cliente[]
  onEdit: (cliente: Cliente) => void
  onViewDetail: (cliente: Cliente) => void
  loading?: boolean
}

const getEstadoBadgeVariant = (estado?: string) => {
  switch (estado) {
    case 'cliente_activo': return 'default'
    case 'prospecto': return 'secondary'
    case 'cliente_inactivo': return 'outline'
    default: return 'outline'
  }
}

const getEstadoLabel = (estado?: string) => {
  switch (estado) {
    case 'cliente_activo': return 'Cliente Activo'
    case 'prospecto': return 'Prospecto'
    case 'cliente_inactivo': return 'Inactivo'
    default: return 'Sin Estado'
  }
}

const renderStars = (rating?: number) => {
  if (!rating) return null
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
    >
      ★
    </span>
  ))
}

const ClienteGridSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default function ClienteGridView({
  clientes,
  onEdit,
  onViewDetail,
  loading = false
}: ClienteGridViewProps) {
  if (loading) {
    return <ClienteGridSkeleton />
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay clientes para mostrar</h3>
        <p className="text-muted-foreground">
          No se encontraron clientes que coincidan con los filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {clientes.map((cliente, index) => (
        <motion.div
          key={cliente.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ y: -2 }}
          className="group"
        >
          <Card className="hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 group">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 ring-2 ring-blue-100 group-hover:ring-blue-200 transition-colors">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-semibold">
                        {cliente.nombre.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {cliente.calificacion && (
                      <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                        <span className="text-xs font-bold text-yellow-800">★</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors leading-tight">
                      {cliente.nombre}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      {cliente.ruc || 'Sin RUC'}
                    </p>
                    {cliente.sector && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        🏭 {cliente.sector}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any}
                    className="font-medium"
                  >
                    {getEstadoLabel(cliente.estadoRelacion)}
                  </Badge>
                  {cliente.calificacion && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">Calificación:</span>
                      <div className="flex items-center gap-1">
                        {renderStars(cliente.calificacion)}
                        <span className="font-semibold text-yellow-600 ml-1">
                          {cliente.calificacion}/5
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white/60 rounded-lg p-3 mb-4 border border-blue-100">
                <div className="grid grid-cols-1 gap-2">
                  {cliente.correo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="truncate text-gray-700">{cliente.correo}</span>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="text-gray-700">{cliente.telefono}</span>
                    </div>
                  )}
                  {cliente.direccion && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="truncate text-gray-700">{cliente.direccion}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetail(cliente)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-blue-200 hover:bg-blue-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(cliente)
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}