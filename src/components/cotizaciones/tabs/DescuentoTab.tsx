'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Percent,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  User,
  MessageSquare,
  Lock,
  DollarSign
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { descuentoAction } from '@/lib/services/cotizacion'
import { formatDisplayCurrency } from '@/lib/utils/currency'
import type { Cotizacion } from '@/types'

interface DescuentoTabProps {
  cotizacion: Cotizacion
  onUpdated: (updatedCotizacion: Cotizacion) => void
  isLocked?: boolean
}

export function DescuentoTab({ cotizacion, onUpdated, isLocked = false }: DescuentoTabProps) {
  const formatCurrency = (amount: number) => formatDisplayCurrency(amount, cotizacion.moneda, cotizacion.tipoCambio)
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for proposing
  const [porcentaje, setPorcentaje] = useState<number>(cotizacion.descuentoPorcentaje || 0)
  const [monto, setMonto] = useState<number>(
    cotizacion.descuentoPorcentaje
      ? (cotizacion.totalCliente * (cotizacion.descuentoPorcentaje || 0)) / 100
      : 0
  )
  const [motivo, setMotivo] = useState(cotizacion.descuentoMotivo || '')
  const [comentario, setComentario] = useState('')

  const userRole = (session?.user as any)?.role
  const canApprove = ['admin', 'gerente'].includes(userRole)
  const estado = cotizacion.descuentoEstado

  const totalFinal = cotizacion.totalCliente - monto

  const handlePorcentajeChange = (value: number) => {
    setPorcentaje(value)
    setMonto(+((cotizacion.totalCliente * value) / 100).toFixed(2))
  }

  const handleMontoChange = (value: number) => {
    setMonto(value)
    setPorcentaje(
      cotizacion.totalCliente > 0
        ? +((value / cotizacion.totalCliente) * 100).toFixed(4)
        : 0
    )
  }

  const monedaSymbol = cotizacion.moneda === 'PEN' ? 'S/.' : '$'

  const handleAction = async (action: string, extra?: Record<string, any>) => {
    setLoading(true)
    setError(null)
    try {
      await descuentoAction(cotizacion.id, { action, ...extra })
      const res = await fetch(`/api/cotizacion/${cotizacion.id}`, { credentials: 'include' })
      if (res.ok) {
        const updated = await res.json()
        onUpdated(updated)
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la acción')
    } finally {
      setLoading(false)
    }
  }

  // Shared discount form used in both "new" and "re-propose" sections
  const renderDiscountForm = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Porcentaje
          </Label>
          <Input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={porcentaje || ''}
            onChange={(e) => handlePorcentajeChange(parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            placeholder="Ej: 6"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Monto ({monedaSymbol})
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={monto || ''}
            onChange={(e) => handleMontoChange(parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            placeholder="Ej: 500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Descuento</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-mono text-red-600">
            {monto > 0 ? (
              <>
                -{formatCurrency(monto)}
                <span className="text-muted-foreground ml-2">
                  ({porcentaje}%)
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Total Final</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-green-50 border-green-200 text-sm font-mono font-semibold text-green-700">
            {monto > 0 ? (
              formatCurrency(totalFinal)
            ) : (
              <span className="text-muted-foreground font-normal">{formatCurrency(cotizacion.totalCliente)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Motivo del Descuento
        </Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Cliente estratégico, proyecto recurrente, competencia..."
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => handleAction('proponer', { porcentaje, monto, motivo })}
          disabled={loading || monto <= 0}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Proponer Descuento
        </Button>
      </div>
    </>
  )

  // No discount proposed yet
  if (!estado || estado === 'sin_descuento') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Descuento Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLocked && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                <Lock className="h-4 w-4 flex-shrink-0" />
                Esta cotización está aprobada. No se pueden realizar cambios.
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isLocked && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Proponga un descuento ingresando porcentaje o monto. Requiere aprobación de gerencia.
                </p>
                {renderDiscountForm()}
              </div>
            )}

            {isLocked && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay descuento aplicado a esta cotización.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Discount proposed - show details and approval controls
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Descuento Comercial
            {estado === 'propuesto' && (
              <Badge variant="outline" className="ml-2 text-amber-700 border-amber-300 bg-amber-50">
                <Clock className="h-3 w-3 mr-1" />
                Pendiente de Aprobación
              </Badge>
            )}
            {estado === 'aprobado' && (
              <Badge variant="outline" className="ml-2 text-green-700 border-green-300 bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aprobado
              </Badge>
            )}
            {estado === 'rechazado' && (
              <Badge variant="outline" className="ml-2 text-red-700 border-red-300 bg-red-50">
                <XCircle className="h-3 w-3 mr-1" />
                Rechazado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Discount details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Porcentaje</span>
              <p className="text-lg font-bold text-primary">{cotizacion.descuentoPorcentaje}%</p>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Monto Descuento</span>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(cotizacion.descuento)}</p>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Final</span>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(estado === 'aprobado' ? cotizacion.grandTotal : cotizacion.totalCliente - cotizacion.descuento)}
              </p>
            </div>
          </div>

          {/* Motivo */}
          {cotizacion.descuentoMotivo && (
            <div className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Motivo
              </span>
              <p className="text-sm">{cotizacion.descuentoMotivo}</p>
            </div>
          )}

          {/* Audit trail */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {cotizacion.descuentoSolicitadoPor && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Solicitado por: <strong>{cotizacion.descuentoSolicitadoPor.name}</strong>
              </span>
            )}
            {cotizacion.descuentoAprobadoPor && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {estado === 'aprobado' ? 'Aprobado' : 'Rechazado'} por: <strong>{cotizacion.descuentoAprobadoPor.name}</strong>
              </span>
            )}
            {cotizacion.descuentoFechaRespuesta && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(cotizacion.descuentoFechaRespuesta).toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            )}
          </div>

          {/* Rejection comment */}
          {estado === 'rechazado' && cotizacion.descuentoComentario && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              <span className="text-xs text-red-600 uppercase tracking-wide">Motivo del rechazo</span>
              <p className="text-sm text-red-800">{cotizacion.descuentoComentario}</p>
            </div>
          )}

          {/* Approval comment */}
          {estado === 'aprobado' && cotizacion.descuentoComentario && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
              <span className="text-xs text-green-600 uppercase tracking-wide">Comentario de aprobación</span>
              <p className="text-sm text-green-800">{cotizacion.descuentoComentario}</p>
            </div>
          )}

          {/* Actions for pending state */}
          {estado === 'propuesto' && !isLocked && (
            <div className="space-y-3 pt-2 border-t">
              {canApprove && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="comentarioAprobacion" className="text-sm">
                      Comentario (opcional)
                    </Label>
                    <Textarea
                      id="comentarioAprobacion"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Agregar comentario..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleAction('rechazar', { comentario })}
                      disabled={loading}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => handleAction('aprobar', { comentario })}
                      disabled={loading}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprobar Descuento
                    </Button>
                  </div>
                </>
              )}
              {!canApprove && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  El descuento está pendiente de aprobación por gerencia.
                </p>
              )}
            </div>
          )}

          {/* Delete action - available when not locked */}
          {!isLocked && estado !== 'propuesto' && (
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => handleAction('eliminar')}
                disabled={loading}
                className="gap-2 text-muted-foreground hover:text-red-600"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar Descuento
              </Button>
            </div>
          )}

          {/* Re-propose after rejection */}
          {estado === 'rechazado' && !isLocked && (
            <div className="space-y-4 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Puede proponer un nuevo descuento con un porcentaje o monto diferente.
              </p>
              {renderDiscountForm()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
