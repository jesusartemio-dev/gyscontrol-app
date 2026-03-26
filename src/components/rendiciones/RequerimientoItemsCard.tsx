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
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Receipt, Loader2, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type { HojaDeGastos } from '@/types'

type ItemMaterial = NonNullable<HojaDeGastos['itemsMateriales']>[number]

const fmt = (n: number | null | undefined) =>
  n != null ? `S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)}` : '—'

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)

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

  const [tipoComprobante, setTipoComprobante] = useState('factura')
  const [numero, setNumero] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [ruc, setRuc] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [lineas, setLineas] = useState<ComprobanteLinea[]>([])

  const openDialog = () => {
    setTipoComprobante('factura')
    setNumero('')
    setProveedor('')
    setRuc('')
    setFecha(new Date().toISOString().split('T')[0])
    setLineas(
      items.map(item => ({
        itemId: item.id,
        descripcion: `${item.codigo} — ${item.descripcion}`,
        proyectoId: item.proyectoId,
        proyectoCodigo: item.proyecto?.codigo || item.proyectoId.slice(0, 8),
        monto: 0,
      }))
    )
    setShowComprobante(true)
  }

  const updateLinea = (itemId: string, monto: number) =>
    setLineas(prev => prev.map(l => l.itemId === itemId ? { ...l, monto } : l))

  const usarEstimado = (itemId: string) => {
    const item = items.find(it => it.id === itemId)
    if (item?.totalEstimado != null) updateLinea(itemId, item.totalEstimado)
  }

  const usarTodosEstimados = () =>
    setLineas(prev => prev.map(l => {
      const item = items.find(it => it.id === l.itemId)
      return { ...l, monto: item?.totalEstimado ?? l.monto }
    }))

  const montoTotal = lineas.reduce((s, l) => s + (l.monto || 0), 0)
  const lineasConMonto = lineas.filter(l => l.monto > 0).length

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
            .map(l => ({
              descripcion: l.descripcion,
              monto: l.monto,
              proyectoId: l.proyectoId,
              categoriaCosto: 'equipos',
              requerimientoMaterialItemId: l.itemId,
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
              {itemsConPrecioReal > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>{itemsConPrecioReal} de {items.length} item(s) con precio real registrado</span>
                </div>
              )}
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

      {/* ── Dialog: Registrar Comprobante ─────────────────────────────────────── */}
      <Dialog open={showComprobante} onOpenChange={setShowComprobante}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 flex flex-col max-h-[90vh]">

          {/* Header fijo */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-blue-600" />
              Registrar Comprobante
            </DialogTitle>

            {/* Campos del comprobante en grid compacto */}
            <div className="mt-4 space-y-3">
              {/* Fila 1: Tipo + Número */}
              <div className="flex gap-3">
                <div className="w-36 shrink-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
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
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Número <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="F001-00123456"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Fecha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    className="h-8 text-sm w-36"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                  />
                </div>
              </div>

              {/* Fila 2: Proveedor + RUC */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <Input
                    className="h-8 text-sm"
                    value={proveedor}
                    onChange={e => setProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="w-36 shrink-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">RUC</Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    value={ruc}
                    onChange={e => setRuc(e.target.value)}
                    placeholder="20123456789"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Sección distribución — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Distribución por item
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Asigna el monto de la factura a cada item. Items en S/ 0 serán omitidos.
                </p>
              </div>
              {items.some(it => it.totalEstimado != null && it.totalEstimado > 0) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={usarTodosEstimados}
                  className="h-7 text-xs shrink-0"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Usar estimados
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {lineas.map((linea) => {
                const item = items.find(it => it.id === linea.itemId)
                const tieneEstimado = item?.totalEstimado != null && item.totalEstimado > 0
                const estaCompleto = linea.monto > 0
                return (
                  <div
                    key={linea.itemId}
                    className={`rounded-lg border p-3 transition-colors ${
                      estaCompleto
                        ? 'bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-900'
                        : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Info del item */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            {item?.codigo}
                          </span>
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 font-normal shrink-0">
                            {linea.proyectoCodigo}
                          </Badge>
                          {estaCompleto && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-1 text-foreground/80">
                          {item?.descripcion}
                        </p>
                        {item && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.cantidadSolicitada} {item.unidad}
                            {item.totalEstimado != null && (
                              <span className="ml-2">· Est: <span className="font-medium">{fmt(item.totalEstimado)}</span></span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Input de monto */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tieneEstimado && !estaCompleto && (
                          <button
                            type="button"
                            onClick={() => usarEstimado(linea.itemId)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap"
                          >
                            ≈ est.
                          </button>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">S/</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={linea.monto || ''}
                            onChange={e => updateLinea(linea.itemId, parseFloat(e.target.value) || 0)}
                            className={`h-8 w-28 text-sm text-right font-mono ${
                              estaCompleto ? 'border-green-300 focus-visible:ring-green-400' : ''
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer fijo: total + botones */}
          <div className="border-t px-5 py-4 shrink-0 bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {lineasConMonto} de {lineas.length} item(s) con monto
                  </p>
                  <p className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400">
                    S/ {fmtNum(montoTotal)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowComprobante(false)}
                  disabled={saving}
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !numero.trim() || montoTotal === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
