/**
 * 📋 CotizacionCard Component
 * 
 * Componente de tarjeta para mostrar resumen de cotizaciones en la lista.
 * Diseñado siguiendo las mejores prácticas de UX/UI del sistema GYS.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  Building2, 
  Calendar, 
  FileText, 
  Eye, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'

import { CotizacionProveedor } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Props {
  cotizacion: CotizacionProveedor
  index?: number
}

// ✅ Función para obtener variante del badge según estado
const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'secondary' as const
    case 'cotizado':
      return 'default' as const
    case 'seleccionado':
      return 'outline' as const
    case 'rechazado':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

// ✅ Función para obtener icono según estado
const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return <Clock className="h-4 w-4" />
    case 'cotizado':
      return <FileText className="h-4 w-4" />
    case 'seleccionado':
      return <CheckCircle className="h-4 w-4" />
    case 'rechazado':
      return <XCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

// ✅ Función para obtener color del estado
const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'text-orange-600'
    case 'cotizado':
      return 'text-blue-600'
    case 'seleccionado':
      return 'text-green-600'
    case 'rechazado':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export default function CotizacionCard({ cotizacion, index = 0 }: Props) {
  const router = useRouter()

  // 📡 Navegar al detalle de la cotización
  const handleVerDetalle = () => {
    router.push(`/logistica/cotizaciones/${cotizacion.id}`)
  }

  // 🔁 Calcular estadísticas de items
  const totalItems = cotizacion.items?.length || 0
  const itemsCotizados = cotizacion.items?.filter(item => item.estado === 'cotizado').length || 0
  const itemsPendientes = cotizacion.items?.filter(item => item.estado === 'pendiente').length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 group-hover:border-l-blue-600">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              {/* 📋 Código y Proveedor */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                    {cotizacion.codigo}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{cotizacion.proveedor?.nombre || 'Proveedor no especificado'}</span>
                  </div>
                </div>
              </div>

              {/* 🏗️ Proyecto */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Proyecto:</span>
                <span>{cotizacion.proyecto?.nombre || 'No especificado'}</span>
              </div>
            </div>

            {/* 🎯 Estado */}
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant={getEstadoBadgeVariant(cotizacion.estado)}
                className="flex items-center gap-1"
              >
                <span className={getEstadoColor(cotizacion.estado)}>
                  {getEstadoIcon(cotizacion.estado)}
                </span>
                {cotizacion.estado}
              </Badge>
              
              {/* 📅 Fecha de creación */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {new Date(cotizacion.createdAt).toLocaleDateString('es-PE')}
              </div>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* 📊 Estadísticas de Items */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
                <div className="text-xs text-gray-500">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{itemsCotizados}</div>
                <div className="text-xs text-gray-500">Cotizados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{itemsPendientes}</div>
                <div className="text-xs text-gray-500">Pendientes</div>
              </div>
            </div>

            {/* 🔘 Botón de acción */}
            <div className="flex justify-end">
              <Button
                onClick={handleVerDetalle}
                variant="outline"
                size="sm"
                className="group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-700 transition-all duration-200"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
