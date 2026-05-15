'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { X, Save, Send, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import type { DateRange } from 'react-day-picker'

// ── Zod schema ────────────────────────────────────────────────────────────────

const TurnoDia = z.enum(['dia_completo', 'am', 'pm'])

const FormSchema = z.object({
  tipoAusenciaId: z.string().min(1, 'Seleccione un tipo de ausencia'),
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  motivo: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof FormSchema>

// ── Types ─────────────────────────────────────────────────────────────────────

interface TipoAusencia {
  id: string
  codigo: string
  nombre: string
  color: string
  descuentaSaldo: boolean
  requiereDocumento: boolean
}

interface SaldoInfo {
  diasAsignados: number
  diasGozados: number
  diasDisponibles: number
  tipoAusencia: { id: string; nombre: string }
}

interface SolicitudAusencia {
  id: string
  tipoAusenciaId: string
  fechaInicio: string
  fechaFin: string
  turnoInicio: string
  turnoFin: string
  motivo: string | null
  estado: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  solicitudExistente?: SolicitudAusencia
}

const TURNO_LABELS: Record<string, string> = {
  dia_completo: 'Día completo',
  am: 'Solo mañana (AM)',
  pm: 'Solo tarde (PM)',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SolicitudFormModal({ open, onClose, onSaved, solicitudExistente }: Props) {
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [saldos, setSaldos] = useState<SaldoInfo[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [saving, setSaving] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const isEditing = Boolean(solicitudExistente)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tipoAusenciaId: '',
      turnoInicio: 'dia_completo',
      turnoFin: 'dia_completo',
      motivo: '',
    },
  })

  const tipoSeleccionado = watch('tipoAusenciaId')
  const saldoActual = saldos.find((s) => s.tipoAusencia.id === tipoSeleccionado)
  const tipoInfo = tipos.find((t) => t.id === tipoSeleccionado)
  // Tipos con requiereDocumento solo pueden enviarse desde el detalle tras adjuntar
  const bloqueadoPorDocumento = Boolean(tipoInfo?.requiereDocumento) && !isEditing

  // Load tipos and saldos on mount
  useEffect(() => {
    if (!open) return
    fetch('/api/tipos-ausencia')
      .then((r) => r.json())
      .then(setTipos)
      .catch(() => toast.error('No se pudieron cargar los tipos de ausencia'))

    fetch('/api/ausencias/mis-saldos')
      .then((r) => r.json())
      .then(setSaldos)
      .catch(() => {})
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (!open) return
    if (solicitudExistente) {
      reset({
        tipoAusenciaId: solicitudExistente.tipoAusenciaId,
        turnoInicio: solicitudExistente.turnoInicio as any,
        turnoFin: solicitudExistente.turnoFin as any,
        motivo: solicitudExistente.motivo ?? '',
      })
      setDateRange({
        from: new Date(solicitudExistente.fechaInicio),
        to: new Date(solicitudExistente.fechaFin),
      })
    } else {
      reset({ tipoAusenciaId: '', turnoInicio: 'dia_completo', turnoFin: 'dia_completo', motivo: '' })
      setDateRange(undefined)
    }
  }, [open, solicitudExistente, reset])

  const buildPayload = (values: FormValues) => {
    if (!dateRange?.from) return null
    const from = dateRange.from
    const to = dateRange.to ?? dateRange.from
    return {
      tipoAusenciaId: values.tipoAusenciaId,
      fechaInicio: format(from, 'yyyy-MM-dd'),
      fechaFin: format(to, 'yyyy-MM-dd'),
      turnoInicio: values.turnoInicio,
      turnoFin: values.turnoFin,
      motivo: values.motivo ?? undefined,
    }
  }

  const onGuardar = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (!payload) { toast.error('Seleccione un rango de fechas'); return }
    setSaving(true)
    try {
      const url = isEditing ? `/api/ausencias/${solicitudExistente!.id}` : '/api/ausencias'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      toast.success(isEditing ? 'Solicitud actualizada' : 'Borrador guardado')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  })

  const onEnviar = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (!payload) { toast.error('Seleccione un rango de fechas'); return }
    setEnviando(true)
    try {
      // If new solicitud: create then enviar
      let solicitudId = solicitudExistente?.id
      if (!solicitudId) {
        const createRes = await fetch('/api/ausencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const createData = await createRes.json()
        if (!createRes.ok) throw new Error(createData.error ?? 'Error al crear')
        solicitudId = createData.id
      } else {
        const putRes = await fetch(`/api/ausencias/${solicitudId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const putData = await putRes.json()
        if (!putRes.ok) throw new Error(putData.error ?? 'Error al actualizar')
      }

      const enviarRes = await fetch(`/api/ausencias/${solicitudId}/enviar`, { method: 'PATCH' })
      const enviarData = await enviarRes.json()
      if (!enviarRes.ok) throw new Error(enviarData.error ?? 'Error al enviar')
      toast.success('Solicitud enviada para aprobación')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setEnviando(false)
    }
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Editar solicitud de ausencia' : 'Nueva solicitud de ausencia'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Tipo de ausencia */}
          <div className="space-y-1.5">
            <Label>Tipo de ausencia <span className="text-destructive">*</span></Label>
            <Select value={tipoSeleccionado} onValueChange={(v) => setValue('tipoAusenciaId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: t.color }}
                      />
                      {t.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoAusenciaId && (
              <p className="text-xs text-destructive">{errors.tipoAusenciaId.message}</p>
            )}
          </div>

          {/* Saldo disponible */}
          {saldoActual && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">{saldoActual.tipoAusencia.nombre}</p>
              <div className="mt-1 flex gap-4 text-muted-foreground">
                <span>Asignados: <strong className="text-foreground">{saldoActual.diasAsignados}d</strong></span>
                <span>Gozados: <strong className="text-foreground">{saldoActual.diasGozados}d</strong></span>
                <span>Disponibles: <strong className="text-foreground">{saldoActual.diasDisponibles}d</strong></span>
              </div>
            </div>
          )}

          {/* Rango de fechas */}
          <div className="space-y-1.5">
            <Label>Rango de fechas <span className="text-destructive">*</span></Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} placeholder="Seleccionar fechas" />
          </div>

          {/* Turnos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Turno inicio</Label>
              <Select
                value={watch('turnoInicio')}
                onValueChange={(v) => setValue('turnoInicio', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TURNO_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Turno fin</Label>
              <Select
                value={watch('turnoFin')}
                onValueChange={(v) => setValue('turnoFin', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TURNO_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aviso documento requerido */}
          {bloqueadoPorDocumento && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Este tipo requiere documento adjunto</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Guarda como borrador, adjunta el documento desde el detalle de la solicitud y luego envía.
                </p>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label>Motivo <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              placeholder="Describe el motivo de la ausencia..."
              rows={3}
              {...register('motivo')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving || enviando}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={onGuardar} disabled={saving || enviando}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar borrador
          </Button>
          <Button onClick={onEnviar} disabled={saving || enviando || bloqueadoPorDocumento} title={bloqueadoPorDocumento ? 'Adjunta el documento desde el detalle antes de enviar' : undefined}>
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar solicitud
          </Button>
        </div>
      </div>
    </div>
  )
}
