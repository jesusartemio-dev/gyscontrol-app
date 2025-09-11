// ===================================================
// 📁 Archivo: ProveedorCardView.tsx
// 📌 Ubicación: src/components/logistica/ProveedorCardView.tsx
// 🔧 Descripción: Vista en cards para proveedores con diseño moderno
// 🧠 Uso: Componente para mostrar proveedores en formato de tarjetas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { motion } from 'framer-motion'
import { Building2, Hash, MapPin, Phone, Mail, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Proveedor } from '@/types'

interface ProveedorCardViewProps {
  proveedores: Proveedor[]
  onEdit?: (proveedor: Proveedor) => void
  onDelete?: (proveedor: Proveedor) => void
  isLoading?: boolean
}

export function ProveedorCardView({
  proveedores,
  onEdit,
  onDelete,
  isLoading = false
}: ProveedorCardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (proveedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay proveedores registrados
        </h3>
        <p className="text-gray-500 max-w-md">
          Comienza agregando tu primer proveedor para gestionar tu base de datos de contactos comerciales.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {proveedores.map((proveedor, index) => (
        <motion.div
          key={proveedor.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-blue-600">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {proveedor.nombre}
                  </h3>
                  {proveedor.ruc && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono">{proveedor.ruc}</span>
                    </div>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(proveedor)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(proveedor)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Contact Information */}
              <div className="space-y-4">
                {/* Dirección */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dirección</p>
                    <p className="text-sm text-gray-900 break-words">
                      {proveedor.direccion || 'No especificada'}
                    </p>
                  </div>
                </div>
                
                {/* Teléfono */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Teléfono</p>
                    <p className="text-sm text-gray-900">
                      {proveedor.telefono || 'No especificado'}
                    </p>
                  </div>
                </div>
                
                {/* Correo */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Correo Electrónico</p>
                    <p className="text-sm text-gray-900 break-all">
                      {proveedor.correo || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Badge 
                  variant={proveedor.ruc ? "default" : "secondary"}
                  className="text-xs"
                >
                  {proveedor.ruc ? 'Con RUC' : 'Sin RUC'}
                </Badge>
                
                {proveedor.createdAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(proveedor.createdAt).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export default ProveedorCardView
