// ===================================================
// 📁 Archivo: PedidoEquipoEstadoLogistico.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Componente para gestión del estado logístico de pedidos
// 🧠 Uso: Permite actualizar estados logísticos y programar entregas
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  PedidoEquipo,
  EstadoPedidoLogistico,
  PedidoEquipoUpdatePayload
} from '@/types'
import {
  Truck,
  Calendar as CalendarIcon,
  MapPin,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Save,
  X,
  FileText,
  Cog
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  pedido: PedidoEquipo
  onUpdate: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onClose?: () => void
}

// Estados logísticos optimizados con colores y descripciones
const ESTADOS_LOGICOS: Record<EstadoPedidoLogistico, {
  label: string
  color: string
  icon: any
  descripcion: string
}> = {
  solicitado: {
    label: 'Solicitado',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    descripcion: 'Pedido solicitado por área de proyectos'
  },
  oc_emitida: {
    label: 'OC Emitida',
    color: 'bg-blue-100 text-blue-800',
    icon: FileText,
    descripcion: 'Orden de compra emitida por logística'
  },
  en_fabricacion: {
    label: 'En Fabricación',
    color: 'bg-orange-100 text-orange-800',
    icon: Cog,
    descripcion: 'Proveedor fabricando/produciendo'
  },
  en_transito: {
    label: 'En Tránsito',
    color: 'bg-blue-100 text-blue-800',
    icon: Truck,
    descripcion: 'En tránsito (puede demorar 2-4 semanas)'
  },
  recibido_almacen: {
    label: 'En Almacén',
    color: 'bg-green-100 text-green-800',
    icon: Package,
    descripcion: 'Recibido completo en almacén'
  },
  entrega_parcial: {
    label: 'Entrega Parcial',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle,
    descripcion: 'Algunos items recibidos, otros pendientes'
  },
  listo_entrega: {
    label: 'Listo para Entrega',
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
    descripcion: 'Preparado para entrega al proyecto'
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    descripcion: 'Entregado y confirmado por proyecto'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: X,
    descripcion: 'Pedido cancelado'
  }
}

export default function PedidoEquipoEstadoLogistico({ pedido, onUpdate, onClose }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    estadoLogistico: pedido.estadoLogistico || 'solicitado' as EstadoPedidoLogistico,
    responsableLogisticoId: pedido.responsableLogisticoId || '',
    fechaEnvioProveedor: pedido.fechaEnvioProveedor || '',
    fechaRecepcionProveedor: pedido.fechaRecepcionProveedor || '',
    fechaEnvioAlmacen: pedido.fechaEnvioAlmacen || '',
    fechaRecepcionAlmacen: pedido.fechaRecepcionAlmacen || '',
    fechaProgramadaEntrega: pedido.fechaProgramadaEntrega || '',
    fechaEntregaProyecto: pedido.fechaEntregaProyecto || '',
    fechaConfirmacionProyecto: pedido.fechaConfirmacionProyecto || '',
    ubicacionActual: pedido.ubicacionActual || '',
    numeroGuia: pedido.numeroGuia || '',
    observacionesLogisticas: pedido.observacionesLogisticas || ''
  })

  const [updating, setUpdating] = useState(false)

  const handleSave = async () => {
    try {
      setUpdating(true)
      await onUpdate(pedido.id, formData)
      toast.success('Estado logístico actualizado correctamente')
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating logistics status:', error)
      toast.error('Error al actualizar estado logístico')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      estadoLogistico: pedido.estadoLogistico || 'solicitado',
      responsableLogisticoId: pedido.responsableLogisticoId || '',
      fechaEnvioProveedor: pedido.fechaEnvioProveedor || '',
      fechaRecepcionProveedor: pedido.fechaRecepcionProveedor || '',
      fechaEnvioAlmacen: pedido.fechaEnvioAlmacen || '',
      fechaRecepcionAlmacen: pedido.fechaRecepcionAlmacen || '',
      fechaProgramadaEntrega: pedido.fechaProgramadaEntrega || '',
      fechaEntregaProyecto: pedido.fechaEntregaProyecto || '',
      fechaConfirmacionProyecto: pedido.fechaConfirmacionProyecto || '',
      ubicacionActual: pedido.ubicacionActual || '',
      numeroGuia: pedido.numeroGuia || '',
      observacionesLogisticas: pedido.observacionesLogisticas || ''
    })
    setIsEditing(false)
  }

  const currentEstado = ESTADOS_LOGICOS[formData.estadoLogistico]
  const EstadoIcon = currentEstado.icon

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EstadoIcon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Estado Logístico</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestión del proceso de entrega y logística
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Truck className="h-4 w-4 mr-2" />
                Gestionar Entrega
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updating}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Estado Actual */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium">Estado Actual</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={currentEstado.color}>
                {currentEstado.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentEstado.descripcion}
              </span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estado Logístico */}
            <div className="space-y-2">
              <Label htmlFor="estadoLogistico">Estado Logístico</Label>
              <Select
                value={formData.estadoLogistico}
                onValueChange={(value: EstadoPedidoLogistico) =>
                  setFormData(prev => ({ ...prev, estadoLogistico: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADOS_LOGICOS).map(([key, estado]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <estado.icon className="h-4 w-4" />
                        {estado.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ubicación Actual */}
            <div className="space-y-2">
              <Label htmlFor="ubicacionActual">Ubicación Actual</Label>
              <Input
                id="ubicacionActual"
                value={formData.ubicacionActual}
                onChange={(e) => setFormData(prev => ({ ...prev, ubicacionActual: e.target.value }))}
                placeholder="Ej: Almacén Central, En tránsito..."
              />
            </div>

            {/* Fechas importantes */}
            <div className="space-y-2">
              <Label>Fecha Entrega Estimada</Label>
              <Input
                type="date"
                value={formData.fechaProgramadaEntrega}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaProgramadaEntrega: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Entrega Real</Label>
              <Input
                type="date"
                value={formData.fechaEntregaProyecto}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaEntregaProyecto: e.target.value }))}
                disabled={!['listo_entrega', 'entregado'].includes(formData.estadoLogistico)}
              />
              {formData.estadoLogistico !== 'listo_entrega' && formData.estadoLogistico !== 'entregado' && (
                <p className="text-xs text-muted-foreground">
                  Solo disponible cuando el pedido esté listo para entrega o entregado
                </p>
              )}
            </div>


            {/* Observaciones */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacionesLogisticas">Observaciones Logísticas</Label>
              <Textarea
                id="observacionesLogisticas"
                value={formData.observacionesLogisticas}
                onChange={(e) => setFormData(prev => ({ ...prev, observacionesLogisticas: e.target.value }))}
                placeholder="Observaciones específicas del proceso logístico..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          /* Vista de solo lectura */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ubicación Actual</Label>
                <p className="text-sm mt-1">
                  {formData.ubicacionActual || 'No especificada'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fecha Entrega Estimada</Label>
                <p className="text-sm mt-1">
                  {formData.fechaProgramadaEntrega
                    ? format(new Date(formData.fechaProgramadaEntrega), 'dd/MM/yyyy', { locale: es })
                    : 'No programada'
                  }
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fecha Entrega Real</Label>
                <p className="text-sm mt-1">
                  {formData.fechaEntregaProyecto
                    ? format(new Date(formData.fechaEntregaProyecto), 'dd/MM/yyyy', { locale: es })
                    : 'Pendiente'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Número de Guía</Label>
                <p className="text-sm mt-1">
                  {formData.numeroGuia || 'No disponible'}
                </p>
              </div>
            </div>

            {formData.observacionesLogisticas && (
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Observaciones</Label>
                <p className="text-sm mt-1 bg-muted p-3 rounded">
                  {formData.observacionesLogisticas}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}