'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProyectoContext } from '../../ProyectoContext'
import { getSolicitudesAnticipo } from '@/lib/services/solicitudAnticipo'
import { createRendicionGasto } from '@/lib/services/rendicionGasto'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Receipt, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { SolicitudAnticipo } from '@/types'

export default function NuevaRendicionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { proyecto } = useProyectoContext()
  const [anticipos, setAnticipos] = useState<SolicitudAnticipo[]>([])
  const [selectedAnticipoId, setSelectedAnticipoId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const anticipoId = searchParams.get('anticipoId')
    if (anticipoId) setSelectedAnticipoId(anticipoId)
  }, [searchParams])

  useEffect(() => {
    if (!proyecto) return
    getSolicitudesAnticipo(proyecto.id).then(data => {
      // Solo mostrar anticipos pagados para vincular
      setAnticipos(data.filter(a => ['pagado', 'liquidado'].includes(a.estado)))
    })
  }, [proyecto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proyecto || !session?.user?.id) return

    try {
      setLoading(true)
      const rendicion = await createRendicionGasto({
        proyectoId: proyecto.id,
        empleadoId: session.user.id,
        solicitudAnticipoId: selectedAnticipoId || undefined,
        observaciones: observaciones.trim() || undefined,
      })
      toast.success('Rendición creada')
      router.push(`/proyectos/${proyecto.id}/rendiciones/${rendicion.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear rendición')
    } finally {
      setLoading(false)
    }
  }

  if (!proyecto) return null

  return (
    <div className="space-y-4 max-w-lg">
      {/* Nav */}
      <Link
        href={`/proyectos/${proyecto.id}/rendiciones`}
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Rendiciones
      </Link>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-orange-600" />
        <h1 className="text-lg font-semibold">Nueva Rendición de Gasto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vincular a anticipo */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Vincular a anticipo <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Select value={selectedAnticipoId} onValueChange={setSelectedAnticipoId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Sin anticipo vinculado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin anticipo</SelectItem>
              {anticipos.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.numero} - S/ {a.monto.toFixed(2)} ({a.motivo?.substring(0, 40)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Vincule esta rendición a un anticipo pagado para liquidar automáticamente.
          </p>
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Observaciones <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas sobre esta rendición..."
            className="min-h-[60px]"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="h-9 bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Crear y Agregar Gastos
          </Button>
        </div>
      </form>
    </div>
  )
}
