'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Calculator, ArrowRightLeft, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { updateCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularHoras } from '@/lib/utils/formulas'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import { cn } from '@/lib/utils'
import type { CotizacionServicioItem, Recurso, UnidadServicio, TipoFormula } from '@/types'

interface Props {
  item: CotizacionServicioItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (item: CotizacionServicioItem) => void
}

const dificultadOptions = [
  { value: 1, label: 'Baja', multiplier: 1.0 },
  { value: 2, label: 'Media', multiplier: 1.2 },
  { value: 3, label: 'Alta', multiplier: 1.5 },
  { value: 4, label: 'Crítica', multiplier: 2.0 },
]

export default function CotizacionServicioItemModal({
  item,
  isOpen,
  onClose,
  onSave
}: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modo de cálculo
  const [modoInverso, setModoInverso] = useState(false)

  // Form state
  const [formula, setFormula] = useState<TipoFormula>('Escalonada')
  const [recursoId, setRecursoId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [horaBase, setHoraBase] = useState(0)
  const [horaRepetido, setHoraRepetido] = useState(0)
  const [horaUnidad, setHoraUnidad] = useState(0)
  const [horaFijo, setHoraFijo] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [factorSeguridad, setFactorSeguridad] = useState(1.0)
  const [margen, setMargen] = useState(1.35)
  const [nivelDificultad, setNivelDificultad] = useState(1)

  // Para modo inverso
  const [precioClienteInput, setPrecioClienteInput] = useState(0)

  useEffect(() => {
    if (isOpen && item) {
      loadData()
      populateForm(item)
    }
  }, [isOpen, item])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recursosData, unidadesData] = await Promise.all([
        getRecursos(),
        getUnidadesServicio()
      ])
      setRecursos(recursosData)
      setUnidades(unidadesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const populateForm = (item: CotizacionServicioItem) => {
    setFormula(item.formula as TipoFormula)
    setRecursoId(item.recursoId)
    setUnidadId(item.unidadServicioId)
    setHoraBase(item.horaBase ?? 0)
    setHoraRepetido(item.horaRepetido ?? 0)
    setHoraUnidad(item.horaUnidad ?? 0)
    setHoraFijo(item.horaFijo ?? 0)
    setCantidad(item.cantidad ?? 1)
    setFactorSeguridad(item.factorSeguridad ?? 1)
    setMargen(item.margen ?? 1.35)
    setNivelDificultad(item.nivelDificultad ?? 1)
    setModoInverso(item.modoCalculo === 'inverso')
    setPrecioClienteInput(item.costoCliente ?? 0)
  }

  const dificultadMultiplier = dificultadOptions.find(d => d.value === nivelDificultad)?.multiplier || 1.0

  const calculados = useMemo(() => {
    const recurso = recursos.find(r => r.id === recursoId)
    const costoHora = recurso?.costoHora ?? item?.costoHora ?? 0

    if (modoInverso && precioClienteInput > 0) {
      const divisor = costoHora * factorSeguridad * dificultadMultiplier
      const horaTotal = divisor > 0 ? precioClienteInput / divisor : 0
      const costoInterno = precioClienteInput / margen

      return {
        horaTotal: +horaTotal.toFixed(2),
        costoHora,
        costoInterno: +costoInterno.toFixed(2),
        costoCliente: precioClienteInput
      }
    } else {
      const horas = calcularHoras({
        formula,
        cantidad,
        horaBase,
        horaRepetido,
        horaUnidad,
        horaFijo
      })

      const costoCliente = horas * costoHora * factorSeguridad * dificultadMultiplier
      const costoInterno = costoCliente / margen

      return {
        horaTotal: +horas.toFixed(2),
        costoHora,
        costoInterno: +costoInterno.toFixed(2),
        costoCliente: +costoCliente.toFixed(2)
      }
    }
  }, [recursoId, recursos, item, formula, cantidad, horaBase, horaRepetido, horaUnidad, horaFijo, factorSeguridad, margen, nivelDificultad, dificultadMultiplier, modoInverso, precioClienteInput])

  const handleSave = async () => {
    if (!item) return

    setSaving(true)
    try {
      const recurso = recursos.find(r => r.id === recursoId)
      const unidad = unidades.find(u => u.id === unidadId)

      const updatedItem = await updateCotizacionServicioItem(item.id, {
        recursoId,
        recursoNombre: recurso?.nombre ?? item.recursoNombre,
        unidadServicioId: unidadId,
        unidadServicioNombre: unidad?.nombre ?? item.unidadServicioNombre,
        formula,
        horaBase: modoInverso ? calculados.horaTotal : horaBase,
        horaRepetido: modoInverso ? 0 : horaRepetido,
        horaUnidad: modoInverso ? 0 : horaUnidad,
        horaFijo: modoInverso ? 0 : horaFijo,
        cantidad: modoInverso ? 1 : cantidad,
        factorSeguridad,
        margen,
        nivelDificultad,
        costoHora: calculados.costoHora,
        horaTotal: calculados.horaTotal,
        costoInterno: calculados.costoInterno,
        costoCliente: calculados.costoCliente,
        modoCalculo: modoInverso ? 'inverso' : 'normal',
      })

      toast.success('Servicio actualizado')
      onSave({ ...item, ...updatedItem })
      onClose()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Error al actualizar el servicio')
    } finally {
      setSaving(false)
    }
  }

  // Campos de hora a mostrar según tipo de fórmula
  const showHoraFields = () => {
    switch (formula) {
      case 'Fijo':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">HH Fijo</Label>
              <Input
                type="number" min={0} step={0.5}
                value={horaFijo}
                onChange={(e) => setHoraFijo(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-end">
              <p className="text-[10px] text-muted-foreground italic pb-1.5">
                Horas fijas, cantidad no afecta
              </p>
            </div>
          </div>
        )
      case 'Proporcional':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">HH por Unidad</Label>
              <Input
                type="number" min={0} step={0.5}
                value={horaUnidad}
                onChange={(e) => setHoraUnidad(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
              <Input
                type="number" min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                onFocus={(e) => e.target.select()}
                className="h-7 text-xs"
              />
            </div>
          </div>
        )
      case 'Escalonada':
      default:
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">HH Base</Label>
                <Input
                  type="number" min={0} step={0.5}
                  value={horaBase}
                  onChange={(e) => setHoraBase(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">HH Repetido</Label>
                <Input
                  type="number" min={0} step={0.5}
                  value={horaRepetido}
                  onChange={(e) => setHoraRepetido(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                <Input
                  type="number" min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  onFocus={(e) => e.target.select()}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">HH por Unidad</Label>
                <Input
                  type="number" min={0} step={0.5}
                  value={horaUnidad}
                  onChange={(e) => setHoraUnidad(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">HH Fijo</Label>
                <Input
                  type="number" min={0} step={0.5}
                  value={horaFijo}
                  onChange={(e) => setHoraFijo(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Edit className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base truncate">{item?.nombre}</DialogTitle>
              {item?.descripcion && (
                <p className="text-xs text-muted-foreground truncate">{item.descripcion}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recurso y Unidad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recurso</Label>
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
                <Label className="text-xs">Unidad</Label>
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
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Precio Cliente Deseado ($)</Label>
                    <Input
                      type="number" min={0} step={10}
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
                        type="number" min={1} step={0.1}
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
                        type="number" min={1} step={0.05}
                        value={margen}
                        onChange={(e) => setMargen(parseFloat(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Tipo de fórmula */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Tipo de Fórmula</Label>
                    <Select value={formula} onValueChange={(v) => setFormula(v as TipoFormula)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fijo" className="text-xs">Fijo (horas fijas)</SelectItem>
                        <SelectItem value="Proporcional" className="text-xs">Proporcional (HH × cantidad)</SelectItem>
                        <SelectItem value="Escalonada" className="text-xs">Escalonada (base + repetido)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parámetros de hora según fórmula */}
                  {showHoraFields()}

                  {/* Factores */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Factor Seg.</Label>
                      <Input
                        type="number" min={1} step={0.1}
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
                        type="number" min={1} step={0.05}
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
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
