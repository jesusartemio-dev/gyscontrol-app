'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, ShoppingCart, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createPedidoInterno } from '@/lib/services/pedidoInterno'
import { getCentrosCosto } from '@/lib/services/centroCosto'
import type { CentroCosto } from '@/types'

interface ItemLibre {
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  precioUnitario: number
}

const UNIDADES = ['und', 'par', 'm', 'm²', 'm³', 'kg', 'lt', 'caja', 'bolsa', 'rollo', 'juego', 'set']

export default function NuevoPedidoInternoPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCentros, setLoadingCentros] = useState(true)

  // Form fields
  const [centroCostoId, setCentroCostoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media')
  const [esUrgente, setEsUrgente] = useState(false)
  const [items, setItems] = useState<ItemLibre[]>([
    { codigo: '', descripcion: '', unidad: 'und', cantidadPedida: 1, precioUnitario: 0 },
  ])

  useEffect(() => {
    getCentrosCosto({ activo: true })
      .then(setCentros)
      .catch(() => toast.error('Error al cargar centros de costo'))
      .finally(() => setLoadingCentros(false))
  }, [])

  const addItem = () => {
    setItems(prev => [...prev, { codigo: '', descripcion: '', unidad: 'und', cantidadPedida: 1, precioUnitario: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemLibre, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const totalPresupuesto = items.reduce((sum, item) => sum + (item.cantidadPedida * item.precioUnitario), 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!centroCostoId) return toast.error('Selecciona un centro de costo')
    if (!fechaNecesaria) return toast.error('Indica la fecha necesaria')
    if (items.some(item => !item.descripcion.trim())) return toast.error('Todos los ítems deben tener descripción')
    if (items.some(item => item.cantidadPedida <= 0)) return toast.error('La cantidad debe ser mayor a 0')

    try {
      setLoading(true)
      const pedido = await createPedidoInterno({
        centroCostoId,
        responsableId: session!.user!.id,
        nombre: nombre.trim() || null,
        observacion: observacion.trim() || '',
        fechaNecesaria,
        prioridad,
        esUrgente,
        itemsLibres: items.map((item, i) => ({
          codigo: item.codigo.trim() || `ITEM-${String(i + 1).padStart(3, '0')}`,
          descripcion: item.descripcion.trim(),
          unidad: item.unidad,
          cantidadPedida: item.cantidadPedida,
          precioUnitario: item.precioUnitario || undefined,
        })),
      })
      toast.success(`Pedido ${pedido.codigo} creado`)
      router.push(`/gastos/mis-pedidos/${pedido.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Nuevo Pedido Interno
          </h1>
          <p className="text-xs text-muted-foreground">Pedido a un centro de costo (EPPs, oficina, etc.)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos generales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="centroCosto">Centro de costo *</Label>
                {loadingCentros ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                  </div>
                ) : (
                  <Select value={centroCostoId} onValueChange={setCentroCostoId}>
                    <SelectTrigger id="centroCosto">
                      <SelectValue placeholder="Seleccionar centro de costo" />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          <span className="font-medium">{cc.nombre}</span>
                          <span className="text-xs text-muted-foreground ml-1 capitalize">({cc.tipo})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre del pedido</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: EPPs mensual, Materiales de oficina..."
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fechaNecesaria">Fecha necesaria *</Label>
                <Input
                  id="fechaNecesaria"
                  type="date"
                  value={fechaNecesaria}
                  onChange={e => setFechaNecesaria(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as typeof prioridad)}>
                  <SelectTrigger id="prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacion">Observaciones / Justificación</Label>
              <Textarea
                id="observacion"
                placeholder="¿Para qué se necesita este pedido?"
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={esUrgente}
                onChange={e => setEsUrgente(e.target.checked)}
                className="rounded"
              />
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Marcar como urgente
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Ítems del pedido</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Agregar ítem
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Ítem {index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Código (opcional)</Label>
                    <Input
                      placeholder="Ej: EPP-001"
                      value={item.codigo}
                      onChange={e => updateItem(index, 'codigo', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidad</Label>
                    <Select value={item.unidad} onValueChange={v => updateItem(index, 'unidad', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descripción *</Label>
                  <Input
                    placeholder="Descripción del ítem"
                    value={item.descripcion}
                    onChange={e => updateItem(index, 'descripcion', e.target.value)}
                    className="h-8 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidadPedida}
                      onChange={e => updateItem(index, 'cantidadPedida', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio estimado (S/)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precioUnitario || ''}
                      onChange={e => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {item.precioUnitario > 0 && item.cantidadPedida > 0 && (
                  <p className="text-xs text-right text-muted-foreground">
                    Subtotal: <span className="font-medium text-gray-800">{formatCurrency(item.cantidadPedida * item.precioUnitario)}</span>
                  </p>
                )}
              </div>
            ))}

            {totalPresupuesto > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <span className="text-sm font-semibold">
                  Total estimado: <span className="text-blue-700">{formatCurrency(totalPresupuesto)}</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
            Crear Pedido
          </Button>
        </div>
      </form>
    </div>
  )
}
