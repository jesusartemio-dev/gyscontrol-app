// ===================================================
// 📁 Archivo: CotizacionServicioItemCreateModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para crear item de servicio manualmente (sin catálogo)
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-28
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wrench, Loader2, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularHoras, TipoFormula } from '@/lib/utils/formulas'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
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

const formulaOptions: { value: TipoFormula; label: string; description: string }[] = [
  { value: 'Fijo', label: 'Fijo', description: 'Horas fijas sin importar cantidad' },
  { value: 'Proporcional', label: 'Proporcional', description: 'HH = cantidad × horas por unidad' },
  { value: 'Escalonada', label: 'Escalonada', description: 'HH = base + (cantidad-1) × repetido' },
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

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [formula, setFormula] = useState<TipoFormula>('Escalonada')
  const [horaBase, setHoraBase] = useState(1)
  const [horaRepetido, setHoraRepetido] = useState(0)
  const [horaUnidad, setHoraUnidad] = useState(0)
  const [horaFijo, setHoraFijo] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [factorSeguridad, setFactorSeguridad] = useState(1.0)
  const [margen, setMargen] = useState(1.35)
  const [nivelDificultad, setNivelDificultad] = useState(1)

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

      // Set defaults
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
    setFormula('Escalonada')
    setHoraBase(1)
    setHoraRepetido(0)
    setHoraUnidad(0)
    setHoraFijo(0)
    setCantidad(1)
    setFactorSeguridad(1.0)
    setMargen(1.35)
    setNivelDificultad(1)
  }

  // Calcular costos en tiempo real
  const calculados = useMemo(() => {
    const recurso = recursos.find(r => r.id === recursoId)
    const costoHora = recurso?.costoHora || 0

    const horaTotal = calcularHoras({
      formula,
      cantidad,
      horaBase,
      horaRepetido,
      horaUnidad,
      horaFijo
    })

    const dificultadMultiplier = (() => {
      switch (nivelDificultad) {
        case 1: return 1.0
        case 2: return 1.2
        case 3: return 1.5
        case 4: return 2.0
        default: return 1.0
      }
    })()

    const costoInterno = horaTotal * costoHora * factorSeguridad * dificultadMultiplier
    const costoCliente = costoInterno * margen

    return { horaTotal, costoHora, costoInterno, costoCliente }
  }, [recursoId, recursos, formula, cantidad, horaBase, horaRepetido, horaUnidad, horaFijo, factorSeguridad, margen, nivelDificultad])

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!recursoId) {
      toast.error('Selecciona un recurso')
      return
    }
    if (!unidadId) {
      toast.error('Selecciona una unidad')
      return
    }

    setSaving(true)
    try {
      const recurso = recursos.find(r => r.id === recursoId)
      const unidad = unidades.find(u => u.id === unidadId)
      const edtId = servicio.edtId || servicio.edt?.id || ''

      const payload: CotizacionServicioItemPayload = {
        cotizacionServicioId: servicio.id,
        // catalogoServicioId: undefined - no vinculado al catálogo
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        edtId,
        recursoId,
        recursoNombre: recurso?.nombre || '',
        unidadServicioId: unidadId,
        unidadServicioNombre: unidad?.nombre || '',
        formula,
        horaBase,
        horaRepetido,
        horaUnidad,
        horaFijo,
        costoHora: calculados.costoHora,
        cantidad,
        horaTotal: calculados.horaTotal,
        factorSeguridad,
        margen,
        costoInterno: +calculados.costoInterno.toFixed(2),
        costoCliente: +calculados.costoCliente.toFixed(2),
        nivelDificultad
      }

      const createdItem = await createCotizacionServicioItem(payload)
      toast.success('Servicio creado exitosamente')
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wrench className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>Nuevo Servicio</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {servicio.edt?.nombre || servicio.nombre}
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del servicio *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Configuración de PLC"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción detallada del servicio..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Recurso *</Label>
                  <Select value={recursoId} onValueChange={setRecursoId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar recurso" />
                    </SelectTrigger>
                    <SelectContent>
                      {recursos.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre} - ${r.costoHora}/h
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Unidad *</Label>
                  <Select value={unidadId} onValueChange={setUnidadId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Configuración de horas */}
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                Configuración de Horas
              </h4>

              <div className="space-y-4">
                <div>
                  <Label>Fórmula de cálculo</Label>
                  <Select value={formula} onValueChange={(v) => setFormula(v as TipoFormula)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formulaOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({opt.description})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {formula === 'Escalonada' && (
                    <>
                      <div>
                        <Label className="text-xs">HH Base</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={horaBase}
                          onChange={(e) => setHoraBase(parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">HH Repetido</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={horaRepetido}
                          onChange={(e) => setHoraRepetido(parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                  {formula === 'Proporcional' && (
                    <div>
                      <Label className="text-xs">HH por Unidad</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={horaUnidad}
                        onChange={(e) => setHoraUnidad(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  {formula === 'Fijo' && (
                    <div>
                      <Label className="text-xs">HH Fijo</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={horaFijo}
                        onChange={(e) => setHoraFijo(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Factores y margen */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Factor Seguridad</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.1}
                  value={factorSeguridad}
                  onChange={(e) => setFactorSeguridad(parseFloat(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Dificultad</Label>
                <Select
                  value={nivelDificultad.toString()}
                  onValueChange={(v) => setNivelDificultad(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Baja (1.0x)</SelectItem>
                    <SelectItem value="2">Media (1.2x)</SelectItem>
                    <SelectItem value="3">Alta (1.5x)</SelectItem>
                    <SelectItem value="4">Crítica (2.0x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Margen</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.05}
                  value={margen}
                  onChange={(e) => setMargen(parseFloat(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Resumen de costos */}
            <div className="border rounded-lg p-4 bg-blue-50/50">
              <h4 className="text-sm font-medium mb-3">Resumen de Costos</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">HH Total</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {calculados.horaTotal.toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Costo/Hora</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatCurrency(calculados.costoHora)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Costo Interno</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatCurrency(calculados.costoInterno)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio Cliente</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(calculados.costoCliente)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Crear Servicio'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
