// ===================================================
// 📁 Archivo: ListaEquipoTimeline.tsx
// 📍 Ubicación: src/components/equipos/
// 🔧 Descripción: Componente timeline para mostrar fechas de seguimiento de ListaEquipo
//
// 🎨 Mejoras UX/UI aplicadas:
// - Timeline visual con estados completados/pendientes
// - Indicadores de tiempo crítico/urgente/normal
// - Animaciones suaves con Framer Motion
// - Responsive design
// ===================================================

'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Send,
  FileCheck,
  ThumbsUp,
  Truck,
  Calculator,
  DollarSign,
  Target
} from 'lucide-react'
import { ListaEquipo } from '@/types'
import { getTimelineFechas, calcularDiasRestantes, getEstadoTiempo } from '@/lib/services/listaEquipo'
import { formatDate, cn } from '@/lib/utils'

interface Props {
  lista: ListaEquipo | null | undefined
  className?: string
}

const iconMap = {
  creado: Calendar,
  enviado_revision: Send,
  por_aprobar: FileCheck,
  aprobado: ThumbsUp,
  enviado_logistica: Truck,
  en_cotizacion: Calculator,
  cotizado: DollarSign,
  aprobado_final: CheckCircle,
  fecha_limite: Target
}

const estadoColorMap = {
  critico: 'bg-red-500 border-red-600',
  urgente: 'bg-orange-500 border-orange-600',
  normal: 'bg-green-500 border-green-600'
}

export default function ListaEquipoTimeline({ lista, className }: Props) {
  // ✅ Validación temprana si lista es null/undefined
  if (!lista) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Seguimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay información de timeline disponible
          </p>
        </CardContent>
      </Card>
    )
  }
  
  const timeline = getTimelineFechas(lista)
  const diasRestantes = calcularDiasRestantes(lista.fechaNecesaria || null)
  const estadoTiempo = getEstadoTiempo(diasRestantes)

  if (timeline.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Seguimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No hay fechas de seguimiento registradas.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Seguimiento
          </CardTitle>
          {diasRestantes !== null && estadoTiempo && (
            <Badge 
              variant={estadoTiempo === 'critico' ? 'destructive' : estadoTiempo === 'urgente' ? 'secondary' : 'default'}
              className="flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {diasRestantes < 0 
                ? `${Math.abs(diasRestantes)} días vencido` 
                : `${diasRestantes} días restantes`
              }
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-6">
            {timeline.map((item, index) => {
              const Icon = iconMap[item.estado as keyof typeof iconMap] || Calendar
              const isLast = index === timeline.length - 1
              const isLimit = item.esLimite
              
              return (
                <motion.div
                  key={`${item.estado}-${item.fecha}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex items-start gap-4"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                    item.completado 
                      ? 'bg-green-500 border-green-600 text-white'
                      : isLimit && estadoTiempo
                        ? `${estadoColorMap[estadoTiempo]} text-white`
                        : 'bg-gray-200 border-gray-300 text-gray-500'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={cn(
                          'text-sm font-medium',
                          item.completado ? 'text-gray-900' : 'text-gray-500'
                        )}>
                          {item.descripcion}
                        </h4>
                        <p className={cn(
                          'text-xs mt-1',
                          item.completado ? 'text-gray-600' : 'text-gray-400'
                        )}>
                          {formatDate(item.fecha)}
                        </p>
                      </div>
                      
                      {item.completado && (
                        <Badge variant="outline" className="text-xs">
                          Completado
                        </Badge>
                      )}
                      
                      {isLimit && !item.completado && (
                        <Badge 
                          variant={estadoTiempo === 'critico' ? 'destructive' : estadoTiempo === 'urgente' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          Fecha Límite
                        </Badge>
                      )}
                    </div>
                    
                    {/* Additional info for limit dates */}
                    {isLimit && diasRestantes !== null && (
                      <div className="mt-2 text-xs text-gray-500">
                        {diasRestantes < 0 
                          ? `⚠️ Vencido hace ${Math.abs(diasRestantes)} días`
                          : diasRestantes === 0
                            ? '🎯 Vence hoy'
                            : `⏰ Faltan ${diasRestantes} días`
                        }
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
        
        {/* Summary */}
        <Separator className="my-4" />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {timeline.filter(item => item.completado).length} de {timeline.length} hitos completados
          </span>
          {lista.fechaNecesaria && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Fecha objetivo: {formatDate(lista.fechaNecesaria)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}