'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Package, Receipt, Loader2, AlertCircle, CheckCircle2, Wand2,
  Paperclip, ExternalLink, FileText, X, Upload, ChevronDown, ChevronRight, Eye, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { HojaDeGastos } from '@/types'

type Comprobante = NonNullable<HojaDeGastos['comprobantes']>[number]

const fmt = (n: number | null | undefined) =>
  n != null ? `S/ ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)}` : '—'

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)

const TIPO_LABELS: Record<string, string> = {
  factura: 'Factura', boleta: 'Boleta', recibo: 'Recibo', ticket: 'Ticket',
}

interface Props {
  hoja: HojaDeGastos
  onChanged: () => void
  canAddComprobante: boolean
}

interface ComprobanteLinea {
  itemId: string
  proyectoId: string
  proyectoCodigo: string
  monto: number
}

export default function RequerimientoItemsCard({ hoja, onChanged, canAddComprobante }: Props) {
  const items = hoja.itemsMateriales || []
  const comprobantes = hoja.comprobantes || []

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este item del requerimiento?')) return
    setDeletingItem(itemId)
    try {
      const res = await fetch(`/api/requerimiento-material-item/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Item eliminado')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingItem(null)
    }
  }
  const [uploadingForComprobante, setUploadingForComprobante] = useState<string | null>(null)
  const adjuntoInputRef = useRef<HTMLInputElement>(null)
  const [expandedComprobantes, setExpandedComprobantes] = useState<Set<string>>(new Set())
  const [previewing, setPreviewing] = useState<Comprobante | null>(null)

  const toggleExpandComprobante = (id: string) =>
    setExpandedComprobantes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Campos del comprobante
  const [tipoComprobante, setTipoComprobante] = useState('factura')
  const [numero, setNumero] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [ruc, setRuc] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [lineas, setLineas] = useState<ComprobanteLinea[]>([])
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Items ya cubiertos = tienen precioReal registrado (lo asigna el API de comprobante)
  const itemsCubiertos = new Set(
    items.filter(i => i.precioReal != null).map(i => i.id)
  )

  // Mapa itemId → comprobante (match por código de item en la descripción de la línea)
  // Las líneas se generan con descripcion = "${item.codigo} — ${item.descripcion}"
  const itemComprobanteMap = new Map<string, { numero: string; tipo: string; id: string }>()
  for (const c of comprobantes) {
    for (const l of c.lineas) {
      for (const item of items) {
        if (l.descripcion.startsWith(item.codigo + ' —') || l.descripcion.startsWith(item.codigo + ' -')) {
          itemComprobanteMap.set(item.id, { id: c.id, tipo: c.tipoComprobante, numero: c.numeroComprobante })
          break
        }
      }
    }
  }

  const openDialog = () => {
    setTipoComprobante('factura')
    setNumero('')
    setProveedor('')
    setRuc('')
    setFecha(new Date().toISOString().split('T')[0])
    setArchivoSeleccionado(null)
    // Solo items no cubiertos arrancan en 0; cubiertos se omiten
    setLineas(
      items
        .filter(item => !itemsCubiertos.has(item.id))
        .map(item => ({
          itemId: item.id,
          proyectoId: item.proyectoId,
          proyectoCodigo: item.proyecto?.codigo || item.proyectoId.slice(0, 8),
          monto: 0,
        }))
    )
    setShowModal(true)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setArchivoSeleccionado(f)
  }

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

      // 1. Crear comprobante
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
              descripcion: (() => {
                const it = items.find(i => i.id === l.itemId)
                return it ? `${it.codigo} — ${it.descripcion}` : l.itemId
              })(),
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
      const comprobante = await res.json()

      // 2. Subir adjunto si hay archivo seleccionado
      if (archivoSeleccionado) {
        setUploadingFile(true)
        const fd = new FormData()
        fd.append('file', archivoSeleccionado)
        fd.append('gastoComprobanteId', comprobante.id)
        const uploadRes = await fetch('/api/gasto-adjunto', { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          toast.warning('Comprobante registrado, pero el archivo no se pudo subir')
        }
        setUploadingFile(false)
      }

      toast.success('Comprobante registrado correctamente')
      setShowModal(false)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar comprobante')
    } finally {
      setSaving(false)
      setUploadingFile(false)
    }
  }

  const handleAdjuntarAComprobante = (comprobanteId: string) => {
    setUploadingForComprobante(comprobanteId)
    adjuntoInputRef.current?.click()
  }

  const handleAdjuntoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingForComprobante) return
    e.target.value = ''
    try {
      setUploadingFile(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('gastoComprobanteId', uploadingForComprobante)
      const res = await fetch('/api/gasto-adjunto', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al subir archivo')
      }
      toast.success('Archivo adjuntado correctamente')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploadingFile(false)
      setUploadingForComprobante(null)
    }
  }

  const totalEstimado = items.reduce((s, i) => s + (i.totalEstimado ?? 0), 0)
  const totalReal = items.reduce((s, i) => s + (i.totalReal ?? 0), 0)
  const itemsConPrecioReal = items.filter(i => i.precioReal != null).length
  const itemsPendientes = items.length - itemsCubiertos.size

  return (
    <>
      {/* Input oculto para adjuntar a comprobante existente */}
      <input
        ref={adjuntoInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleAdjuntoFileChange}
      />

      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Items del Requerimiento
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </CardTitle>
          {canAddComprobante && itemsPendientes > 0 && (
            <Button size="sm" variant="outline" onClick={openDialog} className="h-7 text-xs">
              <Receipt className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Registrar Comprobante
            </Button>
          )}
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <AlertCircle className="h-4 w-4" />
              No hay items registrados.
            </div>
          ) : (
            <>
              {itemsConPrecioReal > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      <th className="text-left pb-2 pr-3 font-medium">Pedido</th>
                      <th className="text-right pb-2 pr-3 font-medium">Cant.</th>
                      <th className="text-right pb-2 pr-3 font-medium">P.U. Est.</th>
                      <th className="text-right pb-2 pr-3 font-medium">P.U. Real</th>
                      <th className="text-right pb-2 font-medium">Total Est.</th>
                      <th className="text-right pb-2 font-medium">Total Real</th>
                      {['borrador', 'depositado'].includes(hoja.estado) && <th className="pb-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(item => (
                      <tr key={item.id} className={`transition-colors ${itemsCubiertos.has(item.id) ? 'bg-green-50/50 dark:bg-green-950/5' : 'hover:bg-muted/30'}`}>
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.codigo}</td>
                        <td className="py-2 pr-3 max-w-[200px]">
                          <span className="line-clamp-2 text-xs">{item.descripcion}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{item.unidad}</span>
                            {itemComprobanteMap.has(item.id) && (() => {
                              const c = itemComprobanteMap.get(item.id)!
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewing(comprobantes.find(x => x.id === c.id) || null)}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0 h-4 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors font-medium leading-none"
                                >
                                  <Receipt className="h-2.5 w-2.5" />
                                  {TIPO_LABELS[c.tipo] || c.tipo} {c.numero}
                                </button>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 font-normal">
                            {item.proyecto?.codigo || item.proyectoId.slice(0, 8)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">
                          {item.pedidoEquipo
                            ? <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4 font-mono font-normal">{item.pedidoEquipo.codigo}</Badge>
                            : <span className="text-muted-foreground/40 text-xs">—</span>}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">{item.cantidadSolicitada}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">{fmt(item.precioEstimado)}</td>
                        <td className="py-2 pr-3 text-right font-mono text-xs">
                          {item.precioReal != null
                            ? <span className="text-green-700 font-medium">{fmt(item.precioReal)}</span>
                            : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="py-2 text-right font-mono text-xs text-muted-foreground">{fmt(item.totalEstimado)}</td>
                        <td className="py-2 text-right font-mono text-xs">
                          {item.totalReal != null
                            ? <span className="text-green-700 font-medium">{fmt(item.totalReal)}</span>
                            : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        {['borrador', 'depositado'].includes(hoja.estado) && (
                          <td className="py-2 pl-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItem === item.id || itemsCubiertos.has(item.id)}
                              className="text-muted-foreground/40 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title={itemsCubiertos.has(item.id) ? 'Tiene comprobante registrado' : 'Item no encontrado — eliminar y liberar'}
                            >
                              {deletingItem === item.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <X className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        )}
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

              {/* Comprobantes registrados */}
              {comprobantes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Comprobantes registrados ({comprobantes.length})
                  </p>
                  {comprobantes.map(c => {
                    const expanded = expandedComprobantes.has(c.id)
                    const adjunto = c.adjuntos[0] || null
                    return (
                      <div key={c.id} className="rounded-lg border bg-muted/20 overflow-hidden">
                        {/* Cabecera del comprobante */}
                        <div className="flex items-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => toggleExpandComprobante(c.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            {expanded
                              ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="text-xs font-semibold">
                              {TIPO_LABELS[c.tipoComprobante] || c.tipoComprobante} {c.numeroComprobante}
                            </span>
                            {c.proveedorNombre && (
                              <span className="text-xs text-muted-foreground truncate">· {c.proveedorNombre}</span>
                            )}
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-semibold text-green-700">
                              {fmt(c.montoTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewing(c)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 hover:border-blue-400 transition-colors"
                              title="Ver detalle y adjunto"
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </button>
                          </div>
                        </div>

                        {/* Meta info compacta */}
                        <div className="flex items-center gap-3 px-3 pb-2 text-xs text-muted-foreground">
                          <span>{new Date(c.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span>{c.lineas.length} item(s)</span>
                          {adjunto ? (
                            <span className="flex items-center gap-1 text-green-600"><Paperclip className="h-3 w-3" />Adjunto</span>
                          ) : canAddComprobante ? (
                            <button
                              type="button"
                              onClick={() => handleAdjuntarAComprobante(c.id)}
                              disabled={uploadingFile && uploadingForComprobante === c.id}
                              className="flex items-center gap-1 text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50"
                            >
                              {uploadingFile && uploadingForComprobante === c.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Plus className="h-3 w-3" />}
                              Adjuntar archivo
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600"><Paperclip className="h-3 w-3" />Sin adjunto</span>
                          )}
                        </div>

                        {/* Líneas expandibles */}
                        {expanded && c.lineas.length > 0 && (
                          <div className="border-t divide-y bg-background/60">
                            {c.lineas.map(l => (
                              <div key={l.id} className="flex items-center justify-between px-4 py-1.5 text-xs">
                                <span className="truncate flex-1 text-muted-foreground">{l.descripcion}</span>
                                <span className="font-mono text-right shrink-0 ml-4 font-medium">{fmt(l.monto)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Vista previa fullscreen del comprobante ──────────────────────────── */}
      {previewing && (() => {
        const adj = previewing.adjuntos[0] || null
        const esPdf = adj && (adj.tipoArchivo?.includes('pdf') || adj.nombreArchivo.toLowerCase().endsWith('.pdf'))
        const esImagen = adj && (adj.tipoArchivo?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(adj.nombreArchivo))
        const previewUrl = adj ? `/api/gasto-adjunto/${adj.id}` : null
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
            className="flex flex-col bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-base">
                  {TIPO_LABELS[previewing.tipoComprobante] || previewing.tipoComprobante} {previewing.numeroComprobante}
                </span>
                <span className="font-mono font-bold text-green-700 text-sm">{fmt(previewing.montoTotal)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Comprobante {comprobantes.findIndex(c => c.id === previewing.id) + 1}/{comprobantes.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewing(null)}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body split */}
            <div className="flex flex-1 min-h-0">
              {/* ── Panel izquierdo: datos + items ── */}
              <div className="w-[55%] shrink-0 border-r flex flex-col overflow-y-auto bg-background">
                <div className="p-5 space-y-4 border-b">
                  {[
                    { label: 'Fecha', value: new Date(previewing.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) },
                    { label: 'Monto', value: fmt(previewing.montoTotal), className: 'font-bold font-mono text-green-700' },
                    { label: 'Tipo comprobante', value: TIPO_LABELS[previewing.tipoComprobante] || previewing.tipoComprobante },
                    { label: 'Nº comprobante', value: previewing.numeroComprobante || '—', className: 'font-mono' },
                    { label: 'Proveedor', value: previewing.proveedorNombre || '—' },
                    { label: 'RUC', value: previewing.proveedorRuc || '—', className: 'font-mono' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{f.label}</p>
                      <p className={`text-sm ${f.className || ''}`}>{f.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-5 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">
                    Items incluidos ({previewing.lineas.length})
                  </p>
                  <div className="space-y-0">
                    {previewing.lineas.map(l => (
                      <div key={l.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                        <span className="text-xs text-foreground/80 flex-1 leading-snug">{l.descripcion}</span>
                        <span className="text-xs font-mono font-semibold text-green-700 shrink-0">{fmt(l.monto)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 text-xs font-bold">
                      <span>Total</span>
                      <span className="font-mono">{fmt(previewing.montoTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t shrink-0">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPreviewing(null)}>
                    Cerrar
                  </Button>
                </div>
              </div>

              {/* ── Panel derecho: documento ── */}
              <div className="flex-1 flex flex-col bg-muted/20 min-w-0">
                {!adj ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText className="h-16 w-16 text-muted-foreground/20" />
                    <p className="text-sm font-medium">Sin documento adjunto</p>
                    {canAddComprobante && (
                      <button
                        type="button"
                        onClick={() => { setPreviewing(null); handleAdjuntarAComprobante(previewing.id) }}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded px-3 py-1.5 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />Adjuntar archivo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />{adj.nombreArchivo}
                      </span>
                      <a href={previewUrl!} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />Abrir en nueva pestaña
                      </a>
                    </div>
                    <div className="flex-1 min-h-0 p-4">
                      {esImagen && (
                        <img src={previewUrl!} alt={adj.nombreArchivo}
                          className="w-full h-full object-contain" />
                      )}
                      {esPdf && (
                        <iframe src={`${previewUrl}#navpanes=0&toolbar=0`} className="w-full h-full border-0" title={adj.nombreArchivo} />
                      )}
                      {!esImagen && !esPdf && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                          <FileText className="h-16 w-16 text-muted-foreground/20" />
                          <p className="text-sm">{adj.nombreArchivo}</p>
                          <a href={previewUrl!} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline text-sm border border-blue-200 rounded px-3 py-1.5">
                            <ExternalLink className="h-4 w-4" />Descargar archivo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dialog: Registrar Comprobante ─────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 flex flex-col max-h-[90vh]">

          {/* Header fijo */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-blue-600" />
              Registrar Comprobante
              {comprobantes.length > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  #{comprobantes.length + 1} de varios
                </Badge>
              )}
            </DialogTitle>

            <div className="mt-4 space-y-3">
              {/* Tipo + Número + Fecha */}
              <div className="flex gap-3">
                <div className="w-32 shrink-0 space-y-1">
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

              {/* Proveedor + RUC */}
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

              {/* Adjunto */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Adjuntar archivo</Label>
                {archivoSeleccionado ? (
                  <div className="flex items-center gap-2 h-8 px-3 rounded-md border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-700 truncate flex-1">{archivoSeleccionado.name}</span>
                    <button
                      type="button"
                      onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-8 w-full px-3 rounded-md border border-dashed text-xs text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    PDF, imagen o foto del comprobante (opcional)
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Distribución — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Distribución por item</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Solo items sin comprobante asignado. Items en S/ 0 serán omitidos.
                </p>
              </div>
              {lineas.some(l => items.find(it => it.id === l.itemId)?.totalEstimado) && (
                <Button type="button" size="sm" variant="outline" onClick={usarTodosEstimados} className="h-7 text-xs shrink-0">
                  <Wand2 className="h-3 w-3 mr-1" />
                  Usar estimados
                </Button>
              )}
            </div>

            {lineas.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                Todos los items ya tienen comprobante registrado.
              </div>
            ) : (
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground shrink-0">{item?.codigo}</span>
                            <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 font-normal shrink-0">
                              {linea.proyectoCodigo}
                            </Badge>
                            {estaCompleto && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          </div>
                          <p className="text-xs mt-0.5 line-clamp-1 text-foreground/80">{item?.descripcion}</p>
                          {item && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.cantidadSolicitada} {item.unidad}
                              {item.totalEstimado != null && (
                                <span className="ml-2">· Est: <span className="font-medium">{fmt(item.totalEstimado)}</span></span>
                              )}
                            </p>
                          )}
                        </div>
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
                              className={`h-8 w-28 text-sm text-right font-mono ${estaCompleto ? 'border-green-300 focus-visible:ring-green-400' : ''}`}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <div className="border-t px-5 py-4 shrink-0 bg-background">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {lineasConMonto} de {lineas.length} item(s) · {archivoSeleccionado ? '1 archivo adjunto' : 'Sin archivo'}
                </p>
                <p className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400">
                  S/ {fmtNum(montoTotal)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving} size="sm">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !numero.trim() || montoTotal === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {(saving || uploadingFile) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {uploadingFile ? 'Subiendo archivo...' : 'Registrar'}
                </Button>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
