'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft, Loader2, CreditCard, Package, Search, ChevronDown, ChevronRight, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { createHojaDeGastos } from '@/lib/services/hojaDeGastos'
import {
  getItemsParaRequerimiento,
  type ProyectoParaRequerimiento,
  type ItemParaRequerimiento,
} from '@/lib/services/hojaDeGastos'
import SelectorAsignacion, { type AsignacionValue } from '@/components/shared/SelectorAsignacion'

// ─── Tipo de requerimiento ───────────────────────────────────────────────────
type TipoRequerimiento = 'gastos_viaticos' | 'compra_materiales'

const CATEGORIAS = [
  { value: 'gastos', label: 'Gastos' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
]

// ─── Estado por item seleccionado ────────────────────────────────────────────
interface ItemSeleccionado {
  item: ItemParaRequerimiento
  cantidad: number
  precioEstimado: number | null
}

// ─── Formateo ────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n != null ? new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n) : '—'

export default function NuevoRequerimientoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [tipo, setTipo] = useState<TipoRequerimiento>('gastos_viaticos')

  // ── Campos comunes ──
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [requiereAnticipo, setRequiereAnticipo] = useState(false)
  const [montoAnticipo, setMontoAnticipo] = useState('')

  // ── Campos gastos/viáticos ──
  const [asignacion, setAsignacion] = useState<AsignacionValue>({ proyectoId: null, centroCostoId: null })
  const [categoriaCosto, setCategoriaCosto] = useState('gastos')

  // ── Campos materiales ──
  const [justificacion, setJustificacion] = useState('')
  const [proyectos, setProyectos] = useState<ProyectoParaRequerimiento[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [seleccionados, setSeleccionados] = useState<Map<string, ItemSeleccionado>>(new Map())

  // Cargar items al cambiar a materiales
  useEffect(() => {
    if (tipo === 'compra_materiales') {
      loadItems()
    }
  }, [tipo])

  const loadItems = useCallback(async (q?: string) => {
    setLoadingItems(true)
    try {
      const data = await getItemsParaRequerimiento(q)
      setProyectos(data)
      // Expandir todos los proyectos por defecto
      setExpandidos(new Set(data.map(p => p.id)))
    } catch {
      toast.error('Error al cargar items de pedidos')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    if (tipo !== 'compra_materiales') return
    const t = setTimeout(() => loadItems(busqueda || undefined), 300)
    return () => clearTimeout(t)
  }, [busqueda, tipo, loadItems])

  const toggleExpansion = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleItem = (item: ItemParaRequerimiento, checked: boolean) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      if (checked) {
        next.set(item.id, {
          item,
          cantidad: item.cantidadDisponible,
          precioEstimado: item.precioUnitario,
        })
      } else {
        next.delete(item.id)
      }
      return next
    })
  }

  const updateCantidad = (itemId: string, cantidad: number) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      const entry = next.get(itemId)
      if (entry) next.set(itemId, { ...entry, cantidad: Math.max(0.01, cantidad) })
      return next
    })
  }

  const updatePrecio = (itemId: string, precio: number | null) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      const entry = next.get(itemId)
      if (entry) next.set(itemId, { ...entry, precioEstimado: precio })
      return next
    })
  }

  // Total estimado
  const totalEstimado = Array.from(seleccionados.values()).reduce((sum, s) => {
    return sum + s.cantidad * (s.precioEstimado ?? 0)
  }, 0)

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!motivo.trim()) {
      toast.error('El motivo es requerido')
      return
    }

    if (tipo === 'gastos_viaticos') {
      const hasAsignacion = !!(asignacion.proyectoId || asignacion.centroCostoId)
      if (!hasAsignacion) {
        toast.error('Selecciona un proyecto o centro de costo')
        return
      }
      try {
        setSaving(true)
        const hoja = await createHojaDeGastos({
          proyectoId: asignacion.proyectoId || undefined,
          centroCostoId: asignacion.centroCostoId || undefined,
          categoriaCosto: categoriaCosto as 'equipos' | 'servicios' | 'gastos',
          motivo: motivo.trim(),
          observaciones: observaciones.trim() || undefined,
          requiereAnticipo,
          montoAnticipo: requiereAnticipo ? parseFloat(montoAnticipo) || 0 : 0,
        })
        toast.success(`Requerimiento ${hoja.numero} creado`)
        router.push(`/gastos/mis-requerimientos/${hoja.id}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento')
      } finally {
        setSaving(false)
      }
      return
    }

    // compra_materiales
    if (seleccionados.size === 0) {
      toast.error('Selecciona al menos un item del pedido')
      return
    }

    try {
      setSaving(true)
      const items = Array.from(seleccionados.values()).map(s => ({
        pedidoEquipoItemId: s.item.id,
        pedidoId: s.item.pedidoEquipo.id,
        proyectoId: s.item.pedidoEquipo.proyectoId,
        codigo: s.item.codigo,
        descripcion: s.item.descripcion,
        unidad: s.item.unidad,
        cantidadSolicitada: s.cantidad,
        precioEstimado: s.precioEstimado,
      }))

      const hoja = await createHojaDeGastos({
        tipoProposito: 'compra_materiales',
        motivo: motivo.trim(),
        justificacionMateriales: justificacion.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        requiereAnticipo: requiereAnticipo !== false,
        montoAnticipo: parseFloat(montoAnticipo) || totalEstimado || 0,
        items,
      })
      toast.success(`Requerimiento de materiales ${hoja.numero} creado`)
      router.push(`/gastos/mis-requerimientos/${hoja.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento')
    } finally {
      setSaving(false)
    }
  }

  const hasAsignacion = !!(asignacion.proyectoId || asignacion.centroCostoId)
  const canSubmit = tipo === 'gastos_viaticos'
    ? (hasAsignacion && !!motivo.trim())
    : (seleccionados.size > 0 && !!motivo.trim())

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/gastos/mis-requerimientos')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          Nuevo Requerimiento de Dinero
        </h1>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setTipo('gastos_viaticos')}
          className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
            tipo === 'gastos_viaticos'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <CreditCard className={`h-5 w-5 mb-1.5 ${tipo === 'gastos_viaticos' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          <span className="font-semibold text-sm">Gastos / Viáticos</span>
          <span className="text-xs text-muted-foreground mt-0.5">Viáticos, servicios, gastos de campo</span>
        </button>
        <button
          type="button"
          onClick={() => setTipo('compra_materiales')}
          className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
            tipo === 'compra_materiales'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <Package className={`h-5 w-5 mb-1.5 ${tipo === 'compra_materiales' ? 'text-blue-600' : 'text-muted-foreground'}`} />
          <span className="font-semibold text-sm">Equipos y Materiales</span>
          <span className="text-xs text-muted-foreground mt-0.5">Compra de items de pedidos aprobados</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">

            {/* ── Gastos / Viáticos ────────────────────────────── */}
            {tipo === 'gastos_viaticos' && (
              <>
                <div className="space-y-1.5">
                  <Label>Asignar a <span className="text-red-500">*</span></Label>
                  <SelectorAsignacion
                    value={asignacion}
                    onChange={setAsignacion}
                    disabled={saving}
                    placeholder="Seleccionar proyecto o centro de costo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={categoriaCosto} onValueChange={setCategoriaCosto} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── Materiales: info CC ──────────────────────────── */}
            {tipo === 'compra_materiales' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300">
                  Se imputará automáticamente a <strong>CC GYS.LOG</strong>. Los items se asocian a sus respectivos proyectos.
                </span>
              </div>
            )}

            {/* ── Campos comunes ───────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Motivo <span className="text-red-500">*</span></Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={tipo === 'compra_materiales'
                  ? 'Ej: Compra de materiales para proyecto ABC'
                  : 'Ej: Gastos de movilidad proyecto XYZ'}
                disabled={saving}
              />
            </div>

            {tipo === 'compra_materiales' && (
              <div className="space-y-1.5">
                <Label>Justificación</Label>
                <Textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Descripción del por qué se requieren estos materiales (opcional)"
                  rows={2}
                  disabled={saving}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales (opcional)"
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Requiere anticipo de dinero</Label>
                <p className="text-xs text-muted-foreground">
                  {tipo === 'compra_materiales'
                    ? 'Dinero para efectuar la compra'
                    : 'Marcar si necesitas recibir dinero antes de los gastos'}
                </p>
              </div>
              <Switch
                checked={requiereAnticipo}
                onCheckedChange={setRequiereAnticipo}
                disabled={saving}
              />
            </div>

            {requiereAnticipo && (
              <div className="space-y-1.5">
                <Label>
                  Monto de anticipo (PEN)
                  {tipo === 'compra_materiales' && totalEstimado > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (estimado: S/ {fmt(totalEstimado)})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoAnticipo}
                  onChange={(e) => setMontoAnticipo(e.target.value)}
                  placeholder={tipo === 'compra_materiales' ? fmt(totalEstimado) || '0.00' : '0.00'}
                  disabled={saving}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Selector de items (solo materiales) ─────────────────────── */}
        {tipo === 'compra_materiales' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Items a comprar
                {seleccionados.size > 0 && (
                  <Badge variant="secondary">{seleccionados.size} seleccionado(s)</Badge>
                )}
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por código, descripción o proyecto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  disabled={saving}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingItems ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Cargando items disponibles...
                </div>
              ) : proyectos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay items de pedidos disponibles para requerimiento.
                  <br />
                  <span className="text-xs">Los pedidos deben estar en estado &quot;enviado&quot; o &quot;parcial&quot; y sin OC activa.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {proyectos.map(proyecto => (
                    <div key={proyecto.id} className="border rounded-lg overflow-hidden">
                      {/* Proyecto header */}
                      <button
                        type="button"
                        onClick={() => toggleExpansion(proyecto.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                      >
                        {expandidos.has(proyecto.id)
                          ? <ChevronDown className="h-4 w-4 shrink-0" />
                          : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <span className="font-semibold text-sm">{proyecto.codigo}</span>
                        <span className="text-sm text-muted-foreground">— {proyecto.nombre}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {proyecto.pedidos.reduce((s, p) => s + p.items.length, 0)} item(s)
                        </span>
                      </button>

                      {/* Pedidos */}
                      {expandidos.has(proyecto.id) && proyecto.pedidos.map(pedido => (
                        <div key={pedido.id}>
                          <div className="px-4 py-1.5 bg-muted/20 border-t text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-foreground">{pedido.codigo}</span>
                            <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                              {pedido.estado}
                            </Badge>
                          </div>
                          <div className="divide-y">
                            {pedido.items.map(item => {
                              const sel = seleccionados.get(item.id)
                              const isChecked = !!sel
                              return (
                                <div key={item.id} className={`px-4 py-2.5 transition-colors ${isChecked ? 'bg-blue-50 dark:bg-blue-950/10' : 'hover:bg-muted/20'}`}>
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(v) => toggleItem(item, !!v)}
                                      disabled={saving}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-xs font-mono text-muted-foreground">{item.codigo}</span>
                                        <span className="text-sm font-medium truncate">{item.descripcion}</span>
                                        <span className="text-xs text-muted-foreground">({item.unidad})</span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                        <span>Disponible: <strong>{item.cantidadDisponible}</strong></span>
                                        {item.precioUnitario != null && (
                                          <span>P.U.: S/ {fmt(item.precioUnitario)}</span>
                                        )}
                                      </div>

                                      {/* Inputs solo si está seleccionado */}
                                      {isChecked && sel && (
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                          <div className="flex items-center gap-1.5">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Cantidad:</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0.01"
                                              max={item.cantidadDisponible}
                                              value={sel.cantidad}
                                              onChange={(e) => updateCantidad(item.id, parseFloat(e.target.value) || 0)}
                                              className="h-7 w-24 text-sm"
                                              disabled={saving}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap">P.U. estimado:</Label>
                                            <div className="relative">
                                              <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">S/</span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={sel.precioEstimado ?? ''}
                                                onChange={(e) => updatePrecio(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                                                className="h-7 w-28 pl-6 text-sm"
                                                placeholder="0.00"
                                                disabled={saving}
                                              />
                                            </div>
                                          </div>
                                          {sel.precioEstimado != null && (
                                            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                              = S/ {fmt(sel.cantidad * sel.precioEstimado)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Total estimado */}
              {seleccionados.size > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">Total estimado ({seleccionados.size} item(s)):</span>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                      S/ {fmt(totalEstimado)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || !canSubmit}
            className={tipo === 'compra_materiales' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {tipo === 'compra_materiales' ? 'Crear Req. de Materiales' : 'Crear Requerimiento'}
          </Button>
        </div>
      </form>
    </div>
  )
}
