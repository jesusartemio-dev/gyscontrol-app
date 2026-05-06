'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, ImageIcon, Loader2, MapPin, Pencil, Trash2, User, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { GaleriaFotosSortable } from '@/components/seguridad/registros/GaleriaFotosSortable'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface RegistroDetalle {
  id: string
  tipo: TipoRegistroSeguridad
  descripcion: string
  asistentes: number | null
  observaciones: string | null
  createdAt: string
  updatedAt: string
  ingenieroId: string
  evidencia: {
    id: string
    estado: 'abierta' | 'cerrada'
    jornada: {
      id: string
      fechaTrabajo: string
      estado: string
      proyecto: { id: string; codigo: string; nombre: string }
      supervisor: { id: string; name: string | null }
    }
  }
  ingeniero: { id: string; name: string | null; email: string | null }
  fotos: Array<{
    id: string
    nombreArchivo: string
    urlArchivo: string
    orden: number
    tipoArchivo: string | null
    tamano: number | null
  }>
}

const TIPO_COLOR: Record<TipoRegistroSeguridad, string> = {
  charla: 'bg-blue-100 text-blue-700 border-blue-200',
  inspeccion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  observacion: 'bg-amber-100 text-amber-700 border-amber-200',
  incidente: 'bg-red-100 text-red-700 border-red-200',
  actividad_general: 'bg-gray-100 text-gray-700 border-gray-200',
  riesgo_critico: 'bg-rose-100 text-rose-700 border-rose-200',
  medio_ambiente: 'bg-teal-100 text-teal-700 border-teal-200',
  prevencion_salud: 'bg-violet-100 text-violet-700 border-violet-200',
}

const formatFechaLarga = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

export default function DetalleRegistroSeguridadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const query = useQuery<RegistroDetalle>({
    queryKey: ['seguridad', 'registro', id],
    queryFn: async () => {
      const res = await fetch(`/api/seguridad/registros/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/registros/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo eliminar')
      }
    },
    onSuccess: () => {
      toast.success('Registro eliminado')
      const evidenciaId = query.data?.evidencia.id
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registros'] })
      if (evidenciaId) {
        queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencia', evidenciaId] })
        router.push(`/seguridad/evidencias/${evidenciaId}`)
      } else {
        router.push('/seguridad/evidencias')
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    },
  })

  if (query.isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-3 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Link href="/seguridad/registros">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el registro.
        </div>
      </div>
    )
  }

  const r = query.data

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href={`/seguridad/evidencias/${r.evidencia.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Detalle de registro</h1>
          <p className="text-xs text-muted-foreground">{r.evidencia.jornada.proyecto.codigo}</p>
        </div>
        <Link href={`/seguridad/registros/${id}/editar`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={() => setConfirmDelete(true)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={cn('text-xs capitalize border', TIPO_COLOR[r.tipo])}>
              {TIPO_REGISTRO_LABELS[r.tipo]}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">{formatFechaLarga(r.evidencia.jornada.fechaTrabajo)}</span>
          </div>

          <div>
            <h2 className="font-semibold leading-tight">{r.evidencia.jornada.proyecto.nombre}</h2>
            <p className="text-xs font-mono text-muted-foreground">{r.evidencia.jornada.proyecto.codigo}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ingeniero:</span>
              <span className="font-medium">{r.ingeniero.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Supervisor:</span>
              <span className="font-medium">{r.evidencia.jornada.supervisor.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estado jornada:</span>
              <span className="font-medium capitalize">{r.evidencia.jornada.estado}</span>
            </div>
            {r.asistentes != null && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Asistentes:</span>
                <span className="font-medium">{r.asistentes}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</span>
            <p className="text-sm whitespace-pre-wrap">{r.descripcion}</p>
          </div>

          {r.observaciones && (
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Observaciones</span>
              <p className="text-sm whitespace-pre-wrap">{r.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-orange-600" />
              Fotos ({r.fotos.length})
            </h3>
          </div>
          <GaleriaFotosSortable
            registroId={r.id}
            fotos={r.fotos}
            editable={
              !!session?.user &&
              (['admin', 'gerente', 'gestor'].includes(session.user.role) || session.user.id === r.ingenieroId)
            }
          />
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. También se eliminarán las {r.fotos.length} foto{r.fotos.length === 1 ? '' : 's'} asociada{r.fotos.length === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Eliminando…</>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
