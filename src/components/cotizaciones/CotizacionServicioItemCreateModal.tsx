// ===================================================
// 📁 Archivo: CotizacionServicioItemCreateModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para crear item de servicio manualmente (sin catálogo)
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-29
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wrench, Loader2, Calculator, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import { cn } from '@/lib/utils'
import type { Recurso, UnidadServicio, CotizacionServicioItem, CotizacionServicioItemPayload } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    nombre: string
    edtId?: string
    edt?: { id: string; nombre: string }
  }
  onItemCreated: (item: CotizacionServicioItem) => void
}

const dificultadOptions = [
  { value: 1, label: 'Baja', multiplier: 1.0 },
  { value: 2, label: 'Media', multiplier: 1.2 },
  { value: 3, label: 'Alta', multiplier: 1.5 },
  { value: 4, label: 'Crítica', multiplier: 2.0 },
]

export default function CotizacionServicioItemCreateModal({
  isOpen,
  onClose,
  servicio,
  onItemCreated
}: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modo de cálculo: normal (horas → precio) o inverso (precio → horas)
  const [modoInverso, setModoInverso] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [horaBase, setHoraBase] = useState(1)
  const [horaRepetido, setHoraRepetido] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [factorSeguridad, setFactorSeguridad] = useState(1.0)
  const [margen, setMargen] = useState(1.35)
  const [nivelDificultad, setNivelDificultad] = useState(1)

  // Para modo inverso
  const [precioClienteInput, setPrecioClienteInput] = useState(0)

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recursosData, unidadesData] = await Promise.all([
        getRecursos(),
        getUnidadesServicio()
      ])
      setRecursos(recursosData)
      setUnidades(unidadesData)

      const defaultRecurso = recursosData.find(r => r.nombre === 'Ingeniero Senior') || recursosData[0]
      const defaultUnidad = unidadesData.find(u => u.nombre === 'hora') || unidadesData[0]
      if (defaultRecurso) setRecursoId(defaultRecurso.id)
      if (defaultUnidad) setUnidadId(defaultUnidad.id)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNombre('')
    setDescripcion('')
    setHoraBase(1)
    setHoraRepetido(0)
    setCantidad(1)
    setFactorSeguridad(1.0)
    setMargen(1.35)
    setNivelDificultad(1)
    setModoInverso(false)
    setPrecioClienteInput(0)
  }

  // Obtener multiplicador de dificultad
  const dificultadMultiplier = dificultadOptions.find(d => d.value === nivelDificultad)?.multiplier || 1.0

  // Calcular costos en tiempo real
  const calculados = useMemo(() => {
    const recurso = recursos.find(r => r.id === recursoId)
    const costoHora = recurso?.costoHora || 0

    if (modoInverso && precioClienteInput > 0) {
      // MODO INVERSO: Precio Cliente → Horas
      // costoCliente = horaTotal × costoHora × factorSeguridad × dificultadMultiplier
      // horaTotal = costoCliente / (costoHora × factorSeguridad × dificultadMultiplier)
      const divisor = costoHora * factorSeguridad * dificultadMultiplier
      const horaTotal = divisor > 0 ? precioClienteInput / divisor : 0
      // costoInterno se deriva del margen
      const costoInterno = precioClienteInput / margen

      return {
        horaTotal: +horaTotal.toFixed(2),
        costoHora,
        costoInterno: +costoInterno.toFixed(2),
        costoCliente: precioClienteInput
      }
    } else {
      // MODO NORMAL: Horas → Precio
      // Fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
      const horasBase = horaBase + Math.max(0, cantidad - 1) * horaRepetido
      const horaTotal = horasBase * dificultadMultiplier
      // Nueva fórmula: costoCliente es el cálculo directo
      const costoCliente = horaTotal * costoHora * factorSeguridad
      // costoInterno se deriva del margen
      const costoInterno = costoCliente / margen

      return {
        horaTotal: +horaTotal.toFixed(2),
        costoHora,
        costoInterno: +costoInterno.toFixed(2),
        costoCliente: +costoCliente.toFixed(2)
      }
    }
  }, [recursoId, recursos, cantidad, horaBase, horaRepetido, factorSeguridad, margen, nivelDificultad, dificultadMultiplier, modoInverso, precioClienteInput])

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!recursoId || !unidadId) {
      toast.error('Selecciona recurso y unidad')
      return
    }

    setSaving(true)
    try {
      const recurso = recursos.find(r => r.id === recursoId)
      const unidad = unidades.find(u => u.id === unidadId)
      const edtId = servicio.edtId || servicio.edt?.id || ''

      const payload: CotizacionServicioItemPayload = {
        cotizacionServicioId: servicio.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        edtId,
        recursoId,
        recursoNombre: recurso?.nombre || '',
        unidadServicioId: unidadId,
        unidadServicioNombre: unidad?.nombre || '',
        formula: 'Escalonada',
        horaBase: modoInverso ? calculados.horaTotal : horaBase,
        horaRepetido: modoInverso ? 0 : horaRepetido,
        costoHora: calculados.costoHora,
        cantidad: modoInverso ? 1 : cantidad,
        horaTotal: calculados.horaTotal,
        factorSeguridad,
        margen,
        costoInterno: calculados.costoInterno,
        costoCliente: calculados.costoCliente,
        nivelDificultad
      }

      const createdItem = await createCotizacionServicioItem(payload)
      toast.success('Servicio creado')
      onItemCreated(createdItem)
      handleClose()
    } catch (error) {
      console.error('Error creating item:', error)
      toast.error('Error al crear el servicio')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Wrench className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Nuevo Servicio</DialogTitle>
              <p className="text-xs text-muted-foreground">{servicio.edt?.nombre || servicio.nombre}</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Nombre y descripción */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Configuración de PLC"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Opcional..."
                  rows={1}
                  className="text-sm min-h-[32px] resize-none"
                />
              </div>
            </div>

            {/* Recurso y Unidad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recurso *</Label>
                <Select value={recursoId} onValueChange={setRecursoId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {recursos.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-sm">
                        {r.nombre} - ${r.costoHora}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Unidad *</Label>
                <Select value={unidadId} onValueChange={setUnidadId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-sm">
                        {u.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggle modo de cálculo */}
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium">Modo de cálculo</p>
                  <p className="text-[10px] text-muted-foreground">
                    {modoInverso ? 'Precio → Horas' : 'Horas → Precio'}
                  </p>
                </div>
              </div>
              <Switch checked={modoInverso} onCheckedChange={setModoInverso} />
            </div>

            {/* Configuración según modo */}
            <div className="border rounded-lg p-3 bg-white">
              <div className="flex items-center gap-1.5 mb-3">
                <Calculator className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium">
                  {modoInverso ? 'Ingresa el precio deseado' : 'Configura las horas'}
                </span>
              </div>

              {modoInverso ? (
                /* MODO INVERSO: Precio → Horas */
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Precio Cliente Deseado ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={precioClienteInput || ''}
                      onChange={(e) => setPrecioClienteInput(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Factor Seg.</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.1}
                        value={factorSeguridad}
                        onChange={(e) => setFactorSeguridad(parseFloat(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Dificultad</Label>
                      <Select
                        value={nivelDificultad.toString()}
                        onValueChange={(v) => setNivelDificultad(parseInt(v))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dificultadOptions.map(d => (
                            <SelectItem key={d.value} value={d.value.toString()} className="text-xs">
                              {d.label} ({d.multiplier}x)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Margen</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.05}
                        value={margen}
                        onChange={(e) => setMargen(parseFloat(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MODO NORMAL: Horas → Precio */
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">HH Base</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={horaBase}
                        onChange={(e) => setHoraBase(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">HH Repetido</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={horaRepetido}
                        onChange={(e) => setHoraRepetido(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Factor Seg.</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.1}
                        value={factorSeguridad}
                        onChange={(e) => setFactorSeguridad(parseFloat(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Dificultad</Label>
                      <Select
                        value={nivelDificultad.toString()}
                        onValueChange={(v) => setNivelDificultad(parseInt(v))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dificultadOptions.map(d => (
                            <SelectItem key={d.value} value={d.value.toString()} className="text-xs">
                              {d.label} ({d.multiplier}x)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Margen</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.05}
                        value={margen}
                        onChange={(e) => setMargen(parseFloat(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resumen de costos */}
            <div className={cn(
              "grid grid-cols-4 gap-2 p-3 rounded-lg border",
              modoInverso ? "bg-blue-50/50 border-blue-200" : "bg-green-50/50 border-green-200"
            )}>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">HH Total</p>
                <p className={cn(
                  "text-sm font-bold",
                  modoInverso ? "text-blue-600" : "text-purple-600"
                )}>
                  {calculados.horaTotal}h
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">$/Hora</p>
                <p className="text-sm font-semibold text-gray-700">
                  ${calculados.costoHora}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Interno</p>
                <p className="text-sm font-semibold text-gray-700">
                  {formatCurrency(calculados.costoInterno)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Cliente</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(calculados.costoCliente)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !nombre.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Crear Servicio'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
