'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, Plus, Trash2, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
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

interface UrgentItem {
  tempId: string
  tipoItem: 'equipo' | 'consumible' | 'servicio'
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioEstimado: string
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

const UNIDADES = ['unidad', 'metro', 'kg', 'rollo', 'caja', 'bolsa', 'juego', 'global']

function newItem(): UrgentItem {
  return {
    tempId: `tmp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    tipoItem: 'equipo',
    codigo: '',
    descripcion: '',
    unidad: 'unidad',
    cantidad: 1,
    precioEstimado: '',
  }
}

export default function ModalPedidoUrgente({ isOpen, onClose, onCreated }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loadingProyectos, setLoadingProyectos] = useState(false)

  // Step 1
  const [proyectoId, setProyectoId] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(new Date().toISOString().split('T')[0])
  const [motivoUrgencia, setMotivoUrgencia] = useState('')

  // Step 2
  const [items, setItems] = useState<UrgentItem[]>([newItem()])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setProyectoId('')
      setFechaNecesaria(new Date().toISOString().split('T')[0])
      setMotivoUrgencia('')
      setItems([newItem()])

      setLoadingProyectos(true)
      fetch('/api/proyecto')
        .then(r => r.json())
        .then((data: Proyecto[]) => setProyectos(data))
        .catch(() => toast.error('Error cargando proyectos'))
        .finally(() => setLoadingProyectos(false))
    }
  }, [isOpen])

  const updateItem = (tempId: string, field: keyof UrgentItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item
      const updated = { ...item, [field]: value }
      // Default servicio values
      if (field === 'tipoItem' && value === 'servicio') {
        updated.unidad = 'global'
        updated.cantidad = 1
      }
      return updated
    }))
  }

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  const addItem = () => {
    setItems(prev => [...prev, newItem()])
  }

  const canProceedStep1 = proyectoId && fechaNecesaria && motivoUrgencia.trim()

  // Validation with per-row error details
  const itemErrors = useMemo(() => {
    return items.map((item, idx) => {
      const missing: string[] = []
      if (!item.codigo.trim()) missing.push('código')
      if (!item.descripcion.trim()) missing.push('descripción')
      if (!item.cantidad || item.cantidad <= 0) missing.push('cantidad')
      return missing.length > 0 ? { fila: idx + 1, missing } : null
    }).filter(Boolean) as { fila: number; missing: string[] }[]
  }, [items])

  const canSubmit = items.length > 0 && itemErrors.length === 0

  const handleSubmit = async () => {
    if (!session?.user) return
    const userId = (session.user as any).id

    setLoading(true)
    try {
      // 1. Create pedido
      const pedidoRes = await fetch('/api/pedido-equipo', {
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

      if (!pedidoRes.ok) {
        const err = await pedidoRes.json()
        throw new Error(err.error || 'Error al crear pedido')
      }

      const pedidoData = await pedidoRes.json()
      const pedidoId = pedidoData.pedido?.id || pedidoData.id

      // 2. Create items
      for (const item of items) {
        const itemRes = await fetch('/api/pedido-equipo-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedidoId,
            codigo: item.codigo.trim(),
            descripcion: item.descripcion.trim(),
            unidad: item.unidad,
            cantidadPedida: item.cantidad,
            tipoItem: item.tipoItem,
            precioUnitario: item.precioEstimado ? parseFloat(item.precioEstimado) : undefined,
          }),
        })

        if (!itemRes.ok) {
          console.error('Error creando item:', await itemRes.text())
        }
      }

      toast.success(`Pedido urgente creado con ${items.length} items`)
      onClose()
      onCreated?.()
      router.push(`/logistica/pedidos/${pedidoId}`)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear pedido urgente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-600" />
            <DialogTitle className="text-sm font-semibold">Pedido Urgente</DialogTitle>
            <Badge variant="destructive" className="text-[9px] h-4 px-1">SIN LISTA</Badge>
            <span className="text-xs text-muted-foreground ml-auto">Paso {step} de 2</span>
          </div>
          <DialogDescription className="sr-only">Crear pedido urgente sin lista técnica</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              Este pedido se creara sin lista tecnica previa y pasara directamente a estado <strong>Enviado</strong>.
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Proyecto *</label>
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
                placeholder="Explica por que este pedido es urgente y no puede esperar lista tecnica..."
                className="text-xs min-h-[80px]"
              />
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="h-7 text-xs bg-red-600 hover:bg-red-700"
              >
                Siguiente <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0 mt-2">
            <div className="text-xs text-muted-foreground mb-2">
              Agrega los items que necesitas. Puedes mezclar equipos, consumibles y servicios.
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {items.map((item, idx) => (
                <div key={item.tempId} className="px-3 py-2.5 space-y-2 hover:bg-gray-50/50">
                  {/* Línea 1: Tipo + Código + Descripción */}
                  <div className="flex items-end gap-2">
                    <div className="w-[130px] shrink-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Tipo</label>
                      <Select value={item.tipoItem} onValueChange={(v) => updateItem(item.tempId, 'tipoItem', v)}>
                        <SelectTrigger className="h-7 text-[10px] w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equipo" className="text-xs">Equipo</SelectItem>
                          <SelectItem value="consumible" className="text-xs">Consumible</SelectItem>
                          <SelectItem value="servicio" className="text-xs">Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[130px] shrink-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Código *</label>
                      <Input
                        value={item.codigo}
                        onChange={(e) => updateItem(item.tempId, 'codigo', e.target.value)}
                        placeholder="COD-001"
                        className={`h-7 text-[10px] w-full ${!item.codigo.trim() ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Descripción *</label>
                      <Input
                        value={item.descripcion}
                        onChange={(e) => updateItem(item.tempId, 'descripcion', e.target.value)}
                        placeholder="Descripcion del item..."
                        className={`h-7 text-[10px] w-full ${!item.descripcion.trim() ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                      />
                    </div>
                  </div>
                  {/* Línea 2: Unidad + Cantidad + Precio + Eliminar */}
                  <div className="flex items-end gap-2">
                    <div className="w-[110px] shrink-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Unidad</label>
                      <Select value={item.unidad} onValueChange={(v) => updateItem(item.tempId, 'unidad', v)}>
                        <SelectTrigger className="h-7 text-[10px] w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map(u => (
                            <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[80px] shrink-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Cantidad *</label>
                      <Input
                        type="number"
                        min={0}
                        value={item.cantidad || ''}
                        onChange={(e) => updateItem(item.tempId, 'cantidad', parseFloat(e.target.value) || 0)}
                        className={`h-7 text-[10px] w-full text-center ${!item.cantidad || item.cantidad <= 0 ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                      />
                    </div>
                    <div className="w-[100px] shrink-0">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">Precio est.</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.precioEstimado}
                        onChange={(e) => updateItem(item.tempId, 'precioEstimado', e.target.value)}
                        placeholder="—"
                        className="h-7 text-[10px] w-full text-center"
                      />
                    </div>
                    <div className="w-[36px] shrink-0 flex items-center justify-center">
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.tempId)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1" />
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-7 text-xs mt-2 w-fit"
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar fila
            </Button>

            {!canSubmit && itemErrors.length > 0 && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[10px] text-red-600 space-y-0.5">
                <span className="font-medium">Completa los campos requeridos:</span>
                {itemErrors.map(err => (
                  <div key={err.fila}>· Fila {err.fila}: falta {err.missing.join(', ')}</div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={loading} className="h-7 text-xs">
                <ArrowLeft className="h-3 w-3 mr-1" /> Atras
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={loading || !canSubmit}
                  className="h-7 text-xs bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Creando...</>
                  ) : (
                    <><Zap className="h-3 w-3 mr-1" /> Crear Pedido Urgente</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
