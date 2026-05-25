'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
  proyectoId?: string
  proyectoNombre?: string
  redirectBase?: string
}

export default function ModalPedidoUrgente({ isOpen, onClose, onCreated, proyectoId: proyectoIdProp, proyectoNombre, redirectBase }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loadingProyectos, setLoadingProyectos] = useState(false)

  const [proyectoId, setProyectoId] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(new Date().toISOString().split('T')[0])
  const [motivoUrgencia, setMotivoUrgencia] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProyectoId(proyectoIdProp || '')
      setFechaNecesaria(new Date().toISOString().split('T')[0])
      setMotivoUrgencia('')

      if (!proyectoIdProp) {
        setLoadingProyectos(true)
        fetch('/api/proyecto')
          .then(r => r.json())
          .then((data: Proyecto[]) => setProyectos(data))
          .catch(() => toast.error('Error cargando proyectos'))
          .finally(() => setLoadingProyectos(false))
      }
    }
  }, [isOpen, proyectoIdProp])

  const canSubmit = proyectoId && fechaNecesaria && motivoUrgencia.trim()

  const handleSubmit = async () => {
    if (!session?.user) return
    const userId = (session.user as any).id

    setLoading(true)
    try {
      const res = await fetch('/api/pedido-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId,
          responsableId: userId,
          listaId: null,
          esUrgente: true,
          prioridad: 'critica',
          fechaNecesaria,
          observacion: motivoUrgencia,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear pedido')
      }

      const data = await res.json()
      const pedidoId = data.pedido?.id || data.id

      toast.success('Pedido urgente creado — ahora agrega los ítems')
      onClose()
      onCreated?.()
      router.push(`${redirectBase || '/logistica/pedidos'}/${pedidoId}`)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear pedido urgente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-600" />
            <DialogTitle className="text-sm font-semibold">Pedido Urgente</DialogTitle>
            <Badge variant="destructive" className="text-[9px] h-4 px-1">SIN LISTA</Badge>
          </div>
          <DialogDescription className="sr-only">Crear pedido urgente sin lista técnica</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            Este pedido se creará sin lista técnica previa y pasará directamente a estado <strong>Enviado</strong>.
            Podrás agregar los ítems desde el detalle del pedido.
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Proyecto *</label>
            {proyectoIdProp ? (
              <div className="h-9 flex items-center px-3 text-xs bg-gray-50 border rounded-md text-gray-700 font-medium">
                {proyectoNombre || proyectoIdProp}
              </div>
            ) : (
              <Select value={proyectoId} onValueChange={setProyectoId} disabled={loadingProyectos}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={loadingProyectos ? 'Cargando...' : 'Seleccionar proyecto'} />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.codigo} — {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Fecha necesaria *</label>
            <Input
              type="date"
              value={fechaNecesaria}
              onChange={(e) => setFechaNecesaria(e.target.value)}
              className="h-9 text-xs w-48"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Motivo de urgencia *</label>
            <Textarea
              value={motivoUrgencia}
              onChange={(e) => setMotivoUrgencia(e.target.value)}
              placeholder="Explica por qué este pedido es urgente y no puede esperar lista técnica..."
              className="text-xs min-h-[80px]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="h-8 text-xs bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Creando...</>
              ) : (
                <><Zap className="h-3 w-3 mr-1" /> Crear Pedido Urgente</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
