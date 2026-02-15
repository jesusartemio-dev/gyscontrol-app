'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createOrdenCompra } from '@/lib/services/ordenCompra'
import { getProveedores } from '@/lib/services/proveedor'
import type { Proveedor, CentroCosto, OrdenCompraItemPayload } from '@/types'

const CONDICIONES_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'credito_15', label: 'Crédito 15 días' },
  { value: 'credito_30', label: 'Crédito 30 días' },
  { value: 'credito_60', label: 'Crédito 60 días' },
]

const MONEDAS = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
]

interface ItemForm {
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

const emptyItem: ItemForm = { codigo: '', descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0 }

export default function NuevaOrdenCompraPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [proveedorId, setProveedorId] = useState('')
  const [centroCostoId, setCentroCostoId] = useState('')
  const [condicionPago, setCondicionPago] = useState('contado')
  const [moneda, setMoneda] = useState('PEN')
  const [lugarEntrega, setLugarEntrega] = useState('')
  const [contactoEntrega, setContactoEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }])

  useEffect(() => {
    Promise.all([
      getProveedores(),
      fetch('/api/centro-costo').then(r => r.json()),
    ]).then(([provs, cc]) => {
      setProveedores(provs)
      setCentrosCosto(Array.isArray(cc) ? cc : cc.data || [])
    }).catch(() => {
      toast.error('Error al cargar datos')
    }).finally(() => setLoadingData(false))
  }, [])

  const updateItem = (index: number, field: keyof ItemForm, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }])

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
  const igv = moneda === 'USD' ? 0 : subtotal * 0.18
  const total = subtotal + igv

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

  const handleSubmit = async () => {
    if (!proveedorId) return toast.error('Selecciona un proveedor')
    const validItems = items.filter(i => i.codigo && i.descripcion && i.cantidad > 0 && i.precioUnitario > 0)
    if (validItems.length === 0) return toast.error('Agrega al menos un item válido')

    try {
      setSaving(true)
      const payload = {
        proveedorId,
        centroCostoId: centroCostoId || undefined,
        condicionPago,
        moneda,
        lugarEntrega: lugarEntrega || undefined,
        contactoEntrega: contactoEntrega || undefined,
        observaciones: observaciones || undefined,
        items: validItems.map((item): OrdenCompraItemPayload => ({
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
      }
      const created = await createOrdenCompra(payload)
      toast.success(`OC ${created.numero} creada exitosamente`)
      router.push(`/logistica/ordenes-compra/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear OC')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nueva Orden de Compra</h1>
          <p className="text-sm text-muted-foreground">Crear OC manual para proveedor</p>
        </div>
      </div>

      {/* Proveedor & Centro de Costo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} {p.ruc ? `(${p.ruc})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Centro de Costo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={centroCostoId} onValueChange={setCentroCostoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar centro (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {centrosCosto.filter((c: CentroCosto) => c.activo).map((c: CentroCosto) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Condiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Condición de Pago</Label>
              <Select value={condicionPago} onValueChange={setCondicionPago}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES_PAGO.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lugar de Entrega</Label>
              <Input value={lugarEntrega} onChange={e => setLugarEntrega(e.target.value)} placeholder="Dirección" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Contacto de Entrega</Label>
              <Input value={contactoEntrega} onChange={e => setContactoEntrega(e.target.value)} placeholder="Nombre / teléfono" className="h-9" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[80px]">Unidad</TableHead>
                <TableHead className="w-[80px] text-right">Cant.</TableHead>
                <TableHead className="w-[120px] text-right">P. Unit.</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input value={item.codigo} onChange={e => updateItem(index, 'codigo', e.target.value)} placeholder="COD" className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input value={item.descripcion} onChange={e => updateItem(index, 'descripcion', e.target.value)} placeholder="Descripción del item" className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input value={item.unidad} onChange={e => updateItem(index, 'unidad', e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.cantidad} onChange={e => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" min={0} step={1} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.precioUnitario} onChange={e => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" min={0} step={0.01} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(item.cantidad * item.precioUnitario)}
                  </TableCell>
                  <TableCell>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)} className="p-1 rounded hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals & Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          {moneda !== 'USD' && (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">IGV (18%):</span>
              <span className="font-mono">{formatCurrency(igv)}</span>
            </div>
          )}
          <div className="flex justify-between gap-8 font-bold text-base">
            <span>Total:</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Crear Orden de Compra
        </Button>
      </div>
    </div>
  )
}
