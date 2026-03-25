'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Receipt, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { HojaDeGastos } from '@/types'

type ItemMaterial = NonNullable<HojaDeGastos['itemsMateriales']>[number]

const fmt = (n: number | null | undefined) =>
  n != null ? `S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)}` : '—'

interface Props {
  hoja: HojaDeGastos
  onChanged: () => void
  canAddComprobante: boolean
}

interface ComprobanteLinea {
  itemId: string
  descripcion: string
  proyectoId: string
  proyectoCodigo: string
  monto: number
}

export default function RequerimientoItemsCard({ hoja, onChanged, canAddComprobante }: Props) {
  const items = hoja.itemsMateriales || []
  const [showComprobante, setShowComprobante] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form del comprobante
  const [tipoComprobante, setTipoComprobante] = useState('factura')
  const [numero, setNumero] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [ruc, setRuc] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [lineas, setLineas] = useState<ComprobanteLinea[]>([])

  const openDialog = () => {
    // Prefill líneas con los items del requerimiento
    setLineas(
      items.map(item => ({
        itemId: item.id,
        descripcion: `${item.codigo} — ${item.descripcion}`,
        proyectoId: item.proyectoId,
        proyectoCodigo: item.proyecto?.codigo || item.proyectoId,
        monto: item.totalEstimado ?? 0,
      }))
    )
    setShowComprobante(true)
  }

  const updateLinea = (itemId: string, monto: number) => {
    setLineas(prev => prev.map(l => l.itemId === itemId ? { ...l, monto } : l))
  }

  const montoTotal = lineas.reduce((s, l) => s + (l.monto || 0), 0)

  const handleSubmit = async () => {
    if (!numero.trim() || !fecha) {
      toast.error('Número de comprobante y fecha son requeridos')
      return
    }
    if (lineas.every(l => !l.monto)) {
      toast.error('Ingresa el monto para al menos una línea')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/gasto-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hojaDeGastosId: hoja.id,
          tipoComprobante,
          numeroComprobante: numero.trim(),
          proveedorNombre: proveedor.trim() || null,
          proveedorRuc: ruc.trim() || null,
          montoTotal,
          fecha,
          lineas: lineas
            .filter(l => l.monto > 0)
            .map((l, i) => ({
              descripcion: l.descripcion,
              monto: l.monto,
              proyectoId: l.proyectoId,
              categoriaCosto: 'equipos',
              requerimientoMaterialItemId: items[i]?.id,
              cantidad: items.find(it => it.id === l.itemId)?.cantidadSolicitada,
            })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar comprobante')
      }
      toast.success('Comprobante registrado correctamente')
      setShowComprobante(false)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar comprobante')
    } finally {
      setSaving(false)
    }
  }

  const totalEstimado = items.reduce((s, i) => s + (i.totalEstimado ?? 0), 0)
  const totalReal = items.reduce((s, i) => s + (i.totalReal ?? 0), 0)
  const itemsConPrecioReal = items.filter(i => i.precioReal != null).length

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Items del Requerimiento
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </CardTitle>
          {canAddComprobante && (
            <Button size="sm" variant="outline" onClick={openDialog} className="h-7 text-xs">
              <Receipt className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Registrar Comprobante
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {items.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <AlertCircle className="h-4 w-4" />
              No hay items registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Progress */}
              {itemsConPrecioReal > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>{itemsConPrecioReal} de {items.length} item(s) con precio real registrado</span>
                </div>
              )}

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left pb-2 pr-3 font-medium">Código</th>
                      <th className="text-left pb-2 pr-3 font-medium">Descripción</th>
                      <th className="text-left pb-2 pr-3 font-medium">Proyecto</th>
                      <th className="text-right pb-2 pr-3 font-medium">Cant.</th>
                      <th className="text-right pb-2 pr-3 font-medium">P.U. Est.</th>
                      <th className="text-right pb-2 pr-3 font-medium">P.U. Real</th>
                      <th className="text-right pb-2 font-medium">Total Est.</th>
                      <th className="text-right pb-2 font-medium">Total Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.codigo}</td>
                        <td className="py-2 pr-3 max-w-[200px]">
                          <span className="line-clamp-2 text-xs">{item.descripcion}</span>
                          <span className="text-xs text-muted-foreground">{item.unidad}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 font-normal">
                            {item.proyecto?.codigo || item.proyectoId.slice(0, 8)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">{item.cantidadSolicitada}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">
                          {fmt(item.precioEstimado)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {item.precioReal != null
                            ? <span className="text-green-700 font-medium">{fmt(item.precioReal)}</span>
                            : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="py-2 text-right font-mono text-xs text-muted-foreground">
                          {fmt(item.totalEstimado)}
                        </td>
                        <td className="py-2 text-right font-mono text-xs">
                          {item.totalReal != null
                            ? <span className="text-green-700 font-medium">{fmt(item.totalReal)}</span>
                            : <span className="text-muted-foreground/50">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />
              <div className="flex justify-end items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Estimado</p>
                  <p className="font-mono font-medium">{fmt(totalEstimado)}</p>
                </div>
                {totalReal > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Real</p>
                    <p className="font-mono font-bold text-green-700">{fmt(totalReal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Registrar Comprobante */}
      <Dialog open={showComprobante} onOpenChange={setShowComprobante}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Registrar Comprobante
            </DialogTitle>
            <DialogDescription>
              Registra la factura/boleta de compra. Distribuye el monto entre los items del requerimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Header del comprobante */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo <span className="text-red-500">*</span></Label>
                <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factura">Factura</SelectItem>
                    <SelectItem value="boleta">Boleta</SelectItem>
                    <SelectItem value="recibo">Recibo</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número <span className="text-red-500">*</span></Label>
                <Input
                  className="h-8 text-sm"
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                  placeholder="F001-123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Proveedor</Label>
                <Input
                  className="h-8 text-sm"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RUC</Label>
                <Input
                  className="h-8 text-sm"
                  value={ruc}
                  onChange={e => setRuc(e.target.value)}
                  placeholder="20123456789"
                  maxLength={11}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Fecha del comprobante <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Distribución por item */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Distribución por item
              </Label>
              <p className="text-xs text-muted-foreground mb-3 mt-1">
                Ingresa el monto de la factura que corresponde a cada item. Items en S/ 0 serán omitidos.
              </p>
              <div className="space-y-2">
                {lineas.map((linea) => {
                  const item = items.find(it => it.id === linea.itemId)
                  return (
                    <div key={linea.itemId} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{linea.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          Proyecto: <span className="font-medium">{linea.proyectoCodigo}</span>
                          {item && <span className="ml-2">Est: {fmt(item.totalEstimado)}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={linea.monto || ''}
                          onChange={e => updateLinea(linea.itemId, parseFloat(e.target.value) || 0)}
                          className="h-7 w-28 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <span className="text-sm font-medium">Total del comprobante:</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-400 font-mono">
                S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(montoTotal)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComprobante(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !numero.trim()} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
