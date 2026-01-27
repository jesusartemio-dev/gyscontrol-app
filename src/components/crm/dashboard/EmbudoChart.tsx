'use client'

import { useRouter } from 'next/navigation'
import { Target, CheckCircle, XCircle, Users, ClipboardCheck, FileCheck, Handshake, FolderKanban, MessageSquareWarning } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface EmbudoChartProps {
  embudo: Array<{
    estado: string
    cantidad: number
    valor: number
  }>
  onStageClick?: (estado: string) => void
}

export default function EmbudoChart({ embudo, onStageClick }: EmbudoChartProps) {
  const router = useRouter()

  const handleStageClick = (estado: string) => {
    if (onStageClick) {
      onStageClick(estado)
    } else {
      router.push(`/crm/oportunidades?estado=${estado}`)
    }
  }

  const getEstadoInfo = (estado: string) => {
    const estados: Record<string, { nombre: string; color: string; icon: typeof Target }> = {
      inicio: { nombre: 'Inicio', color: 'text-purple-600', icon: Target },
      prospecto: { nombre: 'Inicio', color: 'text-purple-600', icon: Target },
      contacto_cliente: { nombre: 'Contacto', color: 'text-blue-600', icon: Users },
      contacto_inicial: { nombre: 'Contacto', color: 'text-blue-600', icon: Users },
      validacion_tecnica: { nombre: 'V. Técnica', color: 'text-cyan-600', icon: ClipboardCheck },
      validacion_comercial: { nombre: 'V. Comercial', color: 'text-violet-600', icon: FileCheck },
      negociacion: { nombre: 'Negociación', color: 'text-orange-600', icon: Handshake },
      seguimiento_proyecto: { nombre: 'Seg. Proyecto', color: 'text-teal-600', icon: FolderKanban },
      cerrada_ganada: { nombre: 'Ganada', color: 'text-green-600', icon: CheckCircle },
      cerrada_perdida: { nombre: 'Perdida', color: 'text-red-600', icon: XCircle },
      feedback_mejora: { nombre: 'Feedback', color: 'text-red-600', icon: MessageSquareWarning }
    }
    return estados[estado] || { nombre: estado, color: 'text-gray-600', icon: Target }
  }

  const totalValor = embudo.reduce((sum, item) => sum + item.valor, 0)
  const totalCantidad = embudo.reduce((sum, item) => sum + item.cantidad, 0)

  // Filtrar etapas con datos
  const embudoConDatos = embudo.filter(e => e.cantidad > 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Embudo de Ventas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {embudoConDatos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin oportunidades</p>
        ) : (
          embudoConDatos.map((stage) => {
            const info = getEstadoInfo(stage.estado)
            const porcentaje = totalValor > 0 ? (stage.valor / totalValor) * 100 : 0

            return (
              <div
                key={stage.estado}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleStageClick(stage.estado)}
              >
                <info.icon className={`h-4 w-4 ${info.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium truncate">{info.nombre}</span>
                    <span className="text-muted-foreground ml-2">{stage.cantidad}</span>
                  </div>
                  <Progress value={porcentaje} className="h-1.5 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {formatCurrency(stage.valor)}
                </span>
              </div>
            )
          })
        )}

        {embudoConDatos.length > 0 && (
          <div className="flex justify-between pt-2 mt-2 border-t text-sm">
            <span className="text-muted-foreground">Total: {totalCantidad} oportunidades</span>
            <span className="font-semibold text-green-600">{formatCurrency(totalValor)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
