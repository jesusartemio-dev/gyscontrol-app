'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProyectoContext } from '../../ProyectoContext'
import { getSolicitudAnticipoById } from '@/lib/services/solicitudAnticipo'
import { getRendicionesGasto } from '@/lib/services/rendicionGasto'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  DollarSign,
  User,
  Calendar,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Banknote,
  Receipt,
  Ban,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import SolicitudAnticipoCard from '@/components/anticipos/SolicitudAnticipoCard'
import SolicitudAnticipoForm from '@/components/anticipos/SolicitudAnticipoForm'
import LiquidacionResumen from '@/components/anticipos/LiquidacionResumen'
import type { SolicitudAnticipo, RendicionGasto } from '@/types'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string; anticipoId: string }>
}

const estadoConfig: Record<string, { icon: any; className: string; label: string }> = {
  borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
  enviado: { icon: Send, className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
  aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
  rechazado: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' },
  pagado: { icon: Banknote, className: 'bg-emerald-100 text-emerald-700', label: 'Pagado' },
  liquidado: { icon: Receipt, className: 'bg-purple-100 text-purple-700', label: 'Liquidado' },
  cancelado: { icon: Ban, className: 'bg-gray-200 text-gray-500', label: 'Cancelado' },
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export default function AnticipoDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { proyecto } = useProyectoContext()
  const [anticipoId, setAnticipoId] = useState('')
  const [anticipo, setAnticipo] = useState<SolicitudAnticipo | null>(null)
  const [rendiciones, setRendiciones] = useState<RendicionGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    params.then(p => setAnticipoId(p.anticipoId))
  }, [params])

  const fetchData = async () => {
    if (!anticipoId) return
    try {
      setLoading(true)
      const [anticipoData, rendicionesData] = await Promise.all([
        getSolicitudAnticipoById(anticipoId),
        getRendicionesGasto({ solicitudAnticipoId: anticipoId }),
      ])
      setAnticipo(anticipoData)
      setRendiciones(rendicionesData)
    } catch (err) {
      console.error('Error fetching detail:', err)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (anticipoId) fetchData()
  }, [anticipoId])

  if (!proyecto) return null
  if (loading) return <DetailSkeleton />
  if (!anticipo) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <h2 className="text-base font-semibold mb-1">Anticipo no encontrado</h2>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="h-7 text-xs mt-2">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Volver
        </Button>
      </div>
    )
  }

  const userRole = session?.user?.role || ''
  const config = estadoConfig[anticipo.estado] || estadoConfig.borrador
  const EstadoIcon = config.icon

  const formatDate = (date?: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  const rendicionEstado: Record<string, { className: string; label: string }> = {
    borrador: { className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
    enviado: { className: 'bg-blue-100 text-blue-700', label: 'Enviado' },
    aprobado: { className: 'bg-green-100 text-green-700', label: 'Aprobado' },
    rechazado: { className: 'bg-red-100 text-red-700', label: 'Rechazado' },
    contabilizado: { className: 'bg-purple-100 text-purple-700', label: 'Contabilizado' },
  }

  return (
    <div className="space-y-4">
      {/* Nav */}
      <Link
        href={`/proyectos/${proyecto.id}/anticipos`}
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Anticipos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">{anticipo.numero}</h1>
            <Badge className={`${config.className} text-[10px] px-1.5 py-0 font-normal`}>
              <EstadoIcon className="h-2.5 w-2.5 mr-0.5" />
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{anticipo.motivo}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-blue-700">{formatCurrency(anticipo.monto)}</p>
        </div>
      </div>

      {/* Anticipo Card with actions */}
      <SolicitudAnticipoCard
        anticipo={anticipo}
        userRole={userRole}
        onUpdated={fetchData}
        onEdit={() => setShowEditForm(true)}
      />

      {/* Liquidación */}
      {['pagado', 'liquidado'].includes(anticipo.estado) && (
        <LiquidacionResumen anticipo={anticipo} />
      )}

      {/* Rendiciones vinculadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-purple-600" />
            Rendiciones Vinculadas
          </h2>
          {['pagado'].includes(anticipo.estado) && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => router.push(`/proyectos/${proyecto.id}/rendiciones/nueva?anticipoId=${anticipo.id}`)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Nueva Rendición
            </Button>
          )}
        </div>

        {rendiciones.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
            No hay rendiciones asociadas a este anticipo
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs">
                  <th className="text-left p-2 font-medium">Número</th>
                  <th className="text-left p-2 font-medium">Empleado</th>
                  <th className="text-right p-2 font-medium">Monto</th>
                  <th className="text-left p-2 font-medium">Estado</th>
                  <th className="text-left p-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {rendiciones.map((r) => {
                  const rConfig = rendicionEstado[r.estado] || rendicionEstado.borrador
                  return (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/proyectos/${proyecto.id}/rendiciones/${r.id}`)}
                    >
                      <td className="p-2 font-mono text-xs text-muted-foreground">{r.numero}</td>
                      <td className="p-2 text-xs truncate">{r.empleado?.name || '-'}</td>
                      <td className="p-2 text-right font-mono text-xs">{formatCurrency(r.montoTotal)}</td>
                      <td className="p-2">
                        <Badge className={`${rConfig.className} text-[10px] px-1.5 py-0 font-normal`}>
                          {rConfig.label}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Form Dialog */}
      <SolicitudAnticipoForm
        proyectoId={proyecto.id}
        solicitanteId={session?.user?.id || ''}
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSaved={fetchData}
        anticipo={anticipo}
      />
    </div>
  )
}
