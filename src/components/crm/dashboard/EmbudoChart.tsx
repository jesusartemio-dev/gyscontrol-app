'use client'

import { motion } from 'framer-motion'
import { Target, CheckCircle, XCircle, Users, ClipboardCheck, DollarSign, FileCheck, Send, Handshake, FolderKanban } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface EmbudoChartProps {
  embudo: Array<{
    estado: string
    cantidad: number
    valor: number
  }>
}

export default function EmbudoChart({ embudo }: EmbudoChartProps) {
  const getEstadoInfo = (estado: string) => {
    switch (estado) {
      case 'inicio':
      case 'prospecto': // Legacy
        return {
          nombre: 'Inicio',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          icon: Target
        }
      case 'contacto_cliente':
      case 'contacto_inicial': // Legacy
        return {
          nombre: 'Contacto Cliente',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: Users
        }
      case 'validacion_tecnica':
        return {
          nombre: 'Validación Técnica',
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50',
          borderColor: 'border-cyan-200',
          icon: ClipboardCheck
        }
      case 'consolidacion_precios':
        return {
          nombre: 'Consolidación Precios',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          icon: DollarSign
        }
      case 'validacion_comercial':
        return {
          nombre: 'Validación Comercial',
          color: 'text-violet-600',
          bgColor: 'bg-violet-50',
          borderColor: 'border-violet-200',
          icon: FileCheck
        }
      case 'seguimiento_cliente':
      case 'propuesta_enviada': // Legacy
        return {
          nombre: 'Seguimiento Cliente',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: Send
        }
      case 'negociacion':
        return {
          nombre: 'Negociación',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: Handshake
        }
      case 'seguimiento_proyecto':
        return {
          nombre: 'Seguimiento Proyecto',
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200',
          icon: FolderKanban
        }
      case 'cerrada_ganada':
        return {
          nombre: 'Cerrada Ganada',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircle
        }
      case 'cerrada_perdida':
        return {
          nombre: 'Cerrada Perdida',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircle
        }
      default:
        return {
          nombre: estado,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: Target
        }
    }
  }

  const totalValor = embudo.reduce((sum, item) => sum + item.valor, 0)
  const totalCantidad = embudo.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Embudo de Ventas
        </CardTitle>
        <CardDescription>
          Distribución de oportunidades por etapa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {embudo.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos del embudo disponibles</p>
          </div>
        ) : (
          embudo.map((stage, index) => {
            const estadoInfo = getEstadoInfo(stage.estado)
            const porcentajeValor = totalValor > 0 ? (stage.valor / totalValor) * 100 : 0
            const porcentajeCantidad = totalCantidad > 0 ? (stage.cantidad / totalCantidad) * 100 : 0

            return (
              <motion.div
                key={stage.estado}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 border rounded-lg ${estadoInfo.borderColor} ${estadoInfo.bgColor}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white`}>
                      <estadoInfo.icon className={`h-4 w-4 ${estadoInfo.color}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{estadoInfo.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stage.cantidad} oportunidades • {formatCurrency(stage.valor)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={estadoInfo.color}>
                    {porcentajeValor.toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Valor en etapa</span>
                    <span>{porcentajeValor.toFixed(1)}% del total</span>
                  </div>
                  <Progress value={porcentajeValor} className="h-2" />
                </div>
              </motion.div>
            )
          })
        )}

        {embudo.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalCantidad}</div>
                <div className="text-sm text-muted-foreground">Total Oportunidades</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValor)}</div>
                <div className="text-sm text-muted-foreground">Valor Total Embudo</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}