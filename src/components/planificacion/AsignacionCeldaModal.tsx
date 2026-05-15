'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { X, Save, Trash2, Loader2 } from 'lucide-react'
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

interface CeldaEntry {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  proyecto?: { id: string; codigo: string; nombre: string; color: string }
  esExcepcional: boolean
  notas: string | null
}

interface ProyectoActivo {
  id: string
  codigo: string
  nombre: string
  color: string
  estado: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  userId: string
  userName: string
  fecha: string
  celdaExistente?: CeldaEntry
}

const FormSchema = z.object({
  proyectoId: z.string().min(1, 'Seleccione un proyecto'),
  turno: z.enum(['dia_completo', 'turno_a', 'turno_b', 'turno_c', 'turno_noche']),
  esExcepcional: z.boolean(),
  notas: z.string().max(200).optional(),
})

type FormValues = z.infer<typeof FormSchema>

const TURNO_LABELS: Record<string, string> = {
  dia_completo: 'Día completo',
  turno_a: 'Turno A',
  turno_b: 'Turno B',
  turno_c: 'Turno C',
  turno_noche: 'Turno Noche',
}

export default function AsignacionCeldaModal({ open, onClose, onSaved, userId, userName, fecha, celdaExistente }: Props) {
  const [proyectos, setProyectos] = useState<ProyectoActivo[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fechaDate = new Date(fecha + 'T00:00:00.000Z')
  const isWeekend = fechaDate.getUTCDay() === 0 || fechaDate.getUTCDay() === 6
  const fechaLabel = format(fechaDate, "EEEE d 'de' MMMM yyyy", { locale: es })

  const isEditing = Boolean(celdaExistente)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isWeekend
        ? FormSchema.refine((d) => d.esExcepcional === true, {
            message: 'Debe marcar como excepcional para asignar en fin de semana',
            path: ['esExcepcional'],
          })
        : FormSchema
    ),
    defaultValues: {
      proyectoId: celdaExistente?.proyecto?.id ?? '',
      turno: (celdaExistente?.turno as FormValues['turno']) ?? 'dia_completo',
      esExcepcional: celdaExistente?.esExcepcional ?? isWeekend,
      notas: celdaExistente?.notas ?? '',
    },
  })

  const proyectoId = watch('proyectoId')
  const esExcepcional = watch('esExcepcional')

  useEffect(() => {
    if (!open) return
    fetch('/api/planificacion/proyectos-activos')
      .then((r) => r.json())
      .then(setProyectos)
      .catch(() => toast.error('No se pudieron cargar los proyectos'))
  }, [open])

  useEffect(() => {
    if (!open) return
    reset({
      proyectoId: celdaExistente?.proyecto?.id ?? '',
      turno: (celdaExistente?.turno as FormValues['turno']) ?? 'dia_completo',
      esExcepcional: celdaExistente?.esExcepcional ?? isWeekend,
      notas: celdaExistente?.notas ?? '',
    })
  }, [open, celdaExistente, isWeekend, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const res = await fetch('/api/planificacion/dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fecha,
          turno: values.turno,
          proyectoId: values.proyectoId,
          esExcepcional: values.esExcepcional,
          notas: values.notas || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error?.mensaje ?? 'Error al guardar la asignación')
        return
      }

      if (data.warnings && data.warnings.length > 0) {
        const w = data.warnings[0]
        if (w.codigo === 'persona_no_en_proyecto') {
          toast.warning('La persona no está asignada oficialmente a este proyecto')
        } else {
          toast.warning(w.mensaje)
        }
      } else {
        toast.success(data.accion === 'creada' ? 'Asignación creada' : 'Asignación actualizada')
      }

      onSaved()
      onClose()
    } catch {
      toast.error('Error al guardar la asignación')
    } finally {
      setSaving(false)
    }
  })

  const onEliminar = async () => {
    if (!celdaExistente) return
    if (!window.confirm('¿Eliminar esta asignación?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/planificacion/dia/${celdaExistente.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Error al eliminar')
        return
      }
      toast.success('Asignación eliminada')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al eliminar la asignación')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">
            {isEditing ? 'Editar asignación' : 'Asignar'} · {userName} · <span className="capitalize">{fechaLabel}</span>
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-1.5">
              <Label>Proyecto <span className="text-destructive">*</span></Label>
              <Select value={proyectoId} onValueChange={(v) => setValue('proyectoId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        [{p.codigo}] {p.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.proyectoId && (
                <p className="text-xs text-destructive">{errors.proyectoId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Turno</Label>
              <Select value={watch('turno')} onValueChange={(v) => setValue('turno', v as FormValues['turno'])}>
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

            {isWeekend && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="esExcepcional"
                  checked={esExcepcional}
                  onChange={(e) => setValue('esExcepcional', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="esExcepcional" className="cursor-pointer">
                  Marcar como día excepcional (fin de semana)
                </Label>
              </div>
            )}
            {errors.esExcepcional && (
              <p className="text-xs text-destructive">{(errors.esExcepcional as any).message}</p>
            )}

            <div className="space-y-1.5">
              <Label>Notas <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea
                placeholder="Observaciones sobre esta asignación..."
                rows={2}
                {...register('notas')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onEliminar}
                  disabled={deleting || saving}
                >
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving || deleting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || deleting}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
