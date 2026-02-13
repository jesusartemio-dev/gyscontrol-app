'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Send,
  CheckCircle2,
  XCircle,
  Banknote,
  Edit,
  Trash2,
  Loader2,
  User,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  Ban,
  Receipt,
} from 'lucide-react'
import {
  enviarSolicitudAnticipo,
  aprobarSolicitudAnticipo,
  rechazarSolicitudAnticipo,
  pagarSolicitudAnticipo,
  deleteSolicitudAnticipo,
} from '@/lib/services/solicitudAnticipo'
import type { SolicitudAnticipo } from '@/types'

const estadoConfig: Record<string, { icon: any; className: string; label: string }> = {
  borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
  enviado: { icon: Send, className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
  aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
  rechazado: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' },
  pagado: { icon: Banknote, className: 'bg-emerald-100 text-emerald-700', label: 'Pagado' },
  liquidado: { icon: Receipt, className: 'bg-purple-100 text-purple-700', label: 'Liquidado' },
  cancelado: { icon: Ban, className: 'bg-gray-200 text-gray-500', label: 'Cancelado' },
}

interface SolicitudAnticipoCardProps {
  anticipo: SolicitudAnticipo
  userRole: string
  onUpdated: () => void
  onEdit: (anticipo: SolicitudAnticipo) => void
}

export default function SolicitudAnticipoCard({
  anticipo,
  userRole,
  onUpdated,
  onEdit,
}: SolicitudAnticipoCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [comentarioRechazo, setComentarioRechazo] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const config = estadoConfig[anticipo.estado] || estadoConfig.borrador
  const EstadoIcon = config.icon

  const canEdit = ['borrador', 'rechazado'].includes(anticipo.estado)
  const canSend = ['borrador', 'rechazado'].includes(anticipo.estado)
  const canApprove = anticipo.estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador'].includes(userRole)
  const canReject = anticipo.estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador'].includes(userRole)
  const canPay = anticipo.estado === 'aprobado' && ['admin', 'gerente'].includes(userRole)
  const canDelete = anticipo.estado === 'borrador'

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    try {
      setLoading(action)
      await fn()
      toast.success(`Anticipo ${action === 'enviar' ? 'enviado' : action === 'aprobar' ? 'aprobado' : action === 'pagar' ? 'pagado' : action === 'eliminar' ? 'eliminado' : action}`)
      onUpdated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error al ${action}`)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    try {
      setLoading('rechazar')
      await rechazarSolicitudAnticipo(anticipo.id, comentarioRechazo || 'Rechazado')
      toast.success('Anticipo rechazado')
      setShowRejectDialog(false)
      setComentarioRechazo('')
      onUpdated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al rechazar')
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{anticipo.numero}</span>
                <Badge className={`${config.className} text-[10px] px-1.5 py-0 font-normal`}>
                  <EstadoIcon className="h-2.5 w-2.5 mr-0.5" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm font-medium line-clamp-2">{anticipo.motivo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-blue-700">{formatCurrency(anticipo.monto)}</p>
              <p className="text-[10px] text-muted-foreground">{anticipo.moneda}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Info rows */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="truncate">{anticipo.solicitante?.name || 'Sin asignar'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(anticipo.fechaSolicitud)}</span>
            </div>
            {anticipo.fechaInicio && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{formatDate(anticipo.fechaInicio)} - {formatDate(anticipo.fechaFin)}</span>
              </div>
            )}
            {anticipo.aprobador && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="truncate">{anticipo.aprobador.name}</span>
              </div>
            )}
          </div>

          {/* Liquidación info */}
          {['pagado', 'liquidado'].includes(anticipo.estado) && (
            <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anticipo:</span>
                <span className="font-mono">{formatCurrency(anticipo.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rendido:</span>
                <span className="font-mono">{formatCurrency(anticipo.montoLiquidado)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Pendiente:</span>
                <span className={`font-mono ${anticipo.montoPendiente > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(anticipo.montoPendiente)}
                </span>
              </div>
            </div>
          )}

          {/* Comentario rechazo */}
          {anticipo.estado === 'rechazado' && anticipo.comentarioRechazo && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 shrink-0" />
                <p className="text-red-700">{anticipo.comentarioRechazo}</p>
              </div>
            </div>
          )}

          {/* Rendiciones count */}
          {anticipo.rendiciones && anticipo.rendiciones.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" />
              <span>{anticipo.rendiciones.length} rendición(es) asociada(s)</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onEdit(anticipo)}
                disabled={!!loading}
              >
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </Button>
            )}
            {canSend && (
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAction('enviar', () => enviarSolicitudAnticipo(anticipo.id))}
                disabled={!!loading}
              >
                {loading === 'enviar' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                Enviar
              </Button>
            )}
            {canApprove && (
              <Button
                size="sm"
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => handleAction('aprobar', () => aprobarSolicitudAnticipo(anticipo.id))}
                disabled={!!loading}
              >
                {loading === 'aprobar' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Aprobar
              </Button>
            )}
            {canReject && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectDialog(true)}
                disabled={!!loading}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Rechazar
              </Button>
            )}
            {canPay && (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction('pagar', () => pagarSolicitudAnticipo(anticipo.id))}
                disabled={!!loading}
              >
                {loading === 'pagar' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Banknote className="h-3 w-3 mr-1" />}
                Marcar Pagado
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                onClick={() => setShowDeleteDialog(true)}
                disabled={!!loading}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Anticipo
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>¿Estás seguro de rechazar el anticipo <strong>{anticipo.numero}</strong>?</p>
                <div className="space-y-1.5">
                  <Label className="text-sm">Motivo del rechazo</Label>
                  <Textarea
                    value={comentarioRechazo}
                    onChange={(e) => setComentarioRechazo(e.target.value)}
                    placeholder="Indica el motivo del rechazo..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading === 'rechazar'}
            >
              {loading === 'rechazar' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar Anticipo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el anticipo <strong>{anticipo.numero}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction('eliminar', () => deleteSolicitudAnticipo(anticipo.id))}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
