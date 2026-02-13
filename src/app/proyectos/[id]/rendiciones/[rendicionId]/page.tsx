'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProyectoContext } from '../../ProyectoContext'
import { getRendicionGastoById, enviarRendicionGasto, aprobarRendicionGasto, rechazarRendicionGasto, deleteRendicionGasto } from '@/lib/services/rendicionGasto'
import { getCategoriasGasto } from '@/lib/services/categoriaGasto'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import {
  ArrowLeft,
  Receipt,
  User,
  Calendar,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  BookCheck,
  AlertCircle,
  Loader2,
  Trash2,
  DollarSign,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import GastoLineaTable from '@/components/rendiciones/GastoLineaTable'
import LiquidacionResumen from '@/components/anticipos/LiquidacionResumen'
import type { RendicionGasto, CategoriaGasto } from '@/types'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string; rendicionId: string }>
}

const estadoConfig: Record<string, { icon: any; className: string; label: string }> = {
  borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
  enviado: { icon: Send, className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
  aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
  rechazado: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' },
  contabilizado: { icon: BookCheck, className: 'bg-purple-100 text-purple-700', label: 'Contabilizado' },
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function RendicionDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { proyecto } = useProyectoContext()
  const [rendicionId, setRendicionId] = useState('')
  const [rendicion, setRendicion] = useState<RendicionGasto | null>(null)
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [comentarioRechazo, setComentarioRechazo] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    params.then(p => setRendicionId(p.rendicionId))
  }, [params])

  const fetchData = async () => {
    if (!rendicionId) return
    try {
      setLoading(true)
      const [rendicionData, categoriasData] = await Promise.all([
        getRendicionGastoById(rendicionId),
        getCategoriasGasto(),
      ])
      setRendicion(rendicionData)
      setCategorias(categoriasData)
    } catch (err) {
      console.error('Error fetching rendicion:', err)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (rendicionId) fetchData()
  }, [rendicionId])

  if (!proyecto) return null
  if (loading) return <DetailSkeleton />
  if (!rendicion) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <h2 className="text-base font-semibold mb-1">Rendición no encontrada</h2>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="h-7 text-xs mt-2">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Volver
        </Button>
      </div>
    )
  }

  const userRole = session?.user?.role || ''
  const config = estadoConfig[rendicion.estado] || estadoConfig.borrador
  const EstadoIcon = config.icon
  const editable = ['borrador', 'rechazado'].includes(rendicion.estado)
  const canSend = editable && (rendicion.lineas?.length || 0) > 0
  const canApprove = rendicion.estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador'].includes(userRole)
  const canReject = rendicion.estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador'].includes(userRole)
  const canDelete = rendicion.estado === 'borrador'

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    try {
      setActionLoading(action)
      await fn()
      toast.success(`Rendición ${action === 'enviar' ? 'enviada' : action === 'aprobar' ? 'aprobada' : 'procesada'}`)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error al ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    try {
      setActionLoading('rechazar')
      await rechazarRendicionGasto(rendicion.id, comentarioRechazo || 'Rechazado')
      toast.success('Rendición rechazada')
      setShowRejectDialog(false)
      setComentarioRechazo('')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al rechazar')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteRendicionGasto(rendicion.id)
      toast.success('Rendición eliminada')
      router.push(`/proyectos/${proyecto.id}/rendiciones`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  return (
    <div className="space-y-4">
      {/* Nav */}
      <Link
        href={`/proyectos/${proyecto.id}/rendiciones`}
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Rendiciones
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            <h1 className="text-lg font-semibold">{rendicion.numero}</h1>
            <Badge className={`${config.className} text-[10px] px-1.5 py-0 font-normal`}>
              <EstadoIcon className="h-2.5 w-2.5 mr-0.5" />
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {rendicion.empleado?.name || '-'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(rendicion.createdAt)}
            </span>
            {rendicion.solicitudAnticipo && (
              <Link
                href={`/proyectos/${proyecto.id}/anticipos/${rendicion.solicitudAnticipoId}`}
                className="flex items-center gap-1 text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 className="h-3 w-3" />
                {rendicion.solicitudAnticipo.numero}
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-orange-700">{formatCurrency(rendicion.montoTotal)}</p>
          <p className="text-[10px] text-muted-foreground">{rendicion.lineas?.length || 0} líneas</p>
        </div>
      </div>

      {/* Comentario rechazo */}
      {rendicion.estado === 'rechazado' && rendicion.comentarioRechazo && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-700">Motivo del rechazo:</p>
              <p className="text-red-600 mt-0.5">{rendicion.comentarioRechazo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones */}
      {rendicion.observaciones && (
        <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">Observaciones:</p>
          {rendicion.observaciones}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={() => handleAction('enviar', () => enviarRendicionGasto(rendicion.id))}
            disabled={!!actionLoading}
          >
            {actionLoading === 'enviar' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Enviar para Aprobación
          </Button>
        )}
        {canApprove && (
          <Button
            size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('aprobar', () => aprobarRendicionGasto(rendicion.id))}
            disabled={!!actionLoading}
          >
            {actionLoading === 'aprobar' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Aprobar
          </Button>
        )}
        {canReject && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowRejectDialog(true)}
            disabled={!!actionLoading}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rechazar
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!!actionLoading}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Eliminar
          </Button>
        )}
      </div>

      {/* Líneas de gasto */}
      <GastoLineaTable
        rendicionGastoId={rendicion.id}
        lineas={rendicion.lineas || []}
        categorias={categorias}
        editable={editable}
        onChanged={fetchData}
      />

      {/* Liquidación del anticipo vinculado */}
      {rendicion.solicitudAnticipo && ['pagado', 'liquidado'].includes(rendicion.solicitudAnticipo.estado || '') && (
        <LiquidacionResumen anticipo={rendicion.solicitudAnticipo as any} />
      )}

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Rendición
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>¿Rechazar la rendición <strong>{rendicion.numero}</strong>?</p>
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
              disabled={actionLoading === 'rechazar'}
            >
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
              Eliminar Rendición
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la rendición <strong>{rendicion.numero}</strong>? Se eliminarán todas las líneas de gasto asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-9 bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
