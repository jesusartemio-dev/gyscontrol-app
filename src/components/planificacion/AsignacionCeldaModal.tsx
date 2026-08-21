'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, Save, Trash2, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TURNO_HORA_DEFAULT } from '@/lib/planificacion/turnos'
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
  edt?: { id: string; codigo: string }
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

interface ProyectoEdtOption {
  id: string
  nombre: string
  categoriaNombre: string
}

type TurnoVal = 'turno_a' | 'turno_b' | 'turno_c'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  userId: string
  userName: string
  fecha: string
  /** Celdas de proyecto ya asignadas ese día (uno por turno). */
  celdasDia?: CeldaEntry[]
  /** Turno a preseleccionar al abrir. */
  turnoInicial?: TurnoVal
  /** Horarios por defecto por turno (configurables en /configuracion/general). */
  turnoHoraDefault?: Record<TurnoVal, { ingreso: string; salida: string }>
}

const FormSchema = z.object({
  proyectoId: z.string().min(1, 'Seleccione un proyecto'),
  proyectoEdtId: z.string().optional(),
  turno: z.enum(['turno_a', 'turno_b', 'turno_c']),
  esExcepcional: z.boolean(),
  notas: z.string().max(200).optional(),
})

type FormValues = z.infer<typeof FormSchema>

const TURNO_LABELS: Record<TurnoVal, string> = {
  turno_a: 'Turno A · Día',
  turno_b: 'Turno B · Tarde/Noche',
  turno_c: 'Turno C · Noche',
}
const TURNOS: TurnoVal[] = ['turno_a', 'turno_b', 'turno_c']
const SIN_EDT = '__sin_edt__'

export default function AsignacionCeldaModal({ open, onClose, onSaved, userId, userName, fecha, celdasDia, turnoInicial, turnoHoraDefault = TURNO_HORA_DEFAULT }: Props) {
  const [proyectos, setProyectos] = useState<ProyectoActivo[]>([])
  const [proyectoEdts, setProyectoEdts] = useState<ProyectoEdtOption[]>([])
  const [cargandoEdts, setCargandoEdts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Si al cambiar de turno el destino está vacío, por defecto se "mueve" la
  // asignación original (se elimina) en vez de dejar duplicada la del turno de origen.
  const [moverDesdeOriginal, setMoverDesdeOriginal] = useState(true)

  // Horario (ingreso/salida) por turno de este día, para compartir la programación.
  const [horarios, setHorarios] = useState<Record<string, { ingreso: string; salida: string }>>({})
  const horarioDe = (t: string) => horarios[t] ?? turnoHoraDefault[t as TurnoVal] ?? { ingreso: '', salida: '' }
  const setHorario = (t: string, campo: 'ingreso' | 'salida', val: string) =>
    setHorarios((prev) => ({ ...prev, [t]: { ...horarioDe(t), [campo]: val } }))

  const fechaDate = new Date(fecha + 'T00:00:00.000Z')
  const isWeekend = fechaDate.getUTCDay() === 0 || fechaDate.getUTCDay() === 6
  // Formatear en UTC para que coincida con el día real (fecha es @db.Date).
  const fechaLabel = fechaDate.toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })

  // Solo las celdas de proyecto (las ausencias se editan en otro modal).
  const celdasProyecto = (celdasDia ?? []).filter((c) => c.tipo === 'proyecto')
  const celdaDeTurno = (t: string) => celdasProyecto.find((c) => c.turno === t)

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
      proyectoId: '',
      proyectoEdtId: '',
      turno: turnoInicial ?? 'turno_a',
      esExcepcional: isWeekend,
      notas: '',
    },
  })

  const proyectoId = watch('proyectoId')
  const proyectoEdtId = watch('proyectoEdtId')
  const esExcepcional = watch('esExcepcional')
  const turnoSel = watch('turno')
  const celdaExistente = celdaDeTurno(turnoSel)
  const isEditing = Boolean(celdaExistente)

  // Turno con el que se abrió el modal (el que se estaba editando originalmente).
  const turnoOrigen = turnoInicial ?? 'turno_a'
  const celdaOrigen = celdaDeTurno(turnoOrigen)
  // Se muestra la opción de "mover" solo cuando: había una asignación en el turno
  // de origen, el usuario cambió a OTRO turno, y ese destino está vacío (si el
  // destino ya tiene su propia asignación, no hay nada que "mover": es solo edición).
  const mostrarMover = Boolean(celdaOrigen) && turnoSel !== turnoOrigen && !celdaExistente

  // Datos a precargar para el turno `t`: los propios si ya tiene una asignación,
  // o si no, los del turno de origen (para "mover" sin perder lo ya cargado).
  const celdaBaseParaTurno = (t: TurnoVal) => celdaDeTurno(t) ?? (t !== turnoOrigen ? celdaOrigen : undefined)

  useEffect(() => {
    if (!open) return
    // Sembrar de inmediato con los proyectos ya asignados ese día, para que el
    // Select tenga la opción correspondiente desde el primer render (si no, al
    // fijar el valor antes de que cargue la lista, Radix se queda en placeholder).
    const seed: ProyectoActivo[] = celdasProyecto
      .filter((c) => c.proyecto)
      .map((c) => ({ id: c.proyecto!.id, codigo: c.proyecto!.codigo, nombre: c.proyecto!.nombre, color: c.proyecto!.color, estado: 'activo' }))
    if (seed.length > 0) setProyectos(seed)
    fetch('/api/planificacion/proyectos-activos')
      .then((r) => r.json())
      .then((lista: ProyectoActivo[]) => {
        // Conservar los proyectos asignados que no estén en la lista activa
        // (p. ej. proyectos ya cerrados), para que sigan siendo seleccionables.
        const ids = new Set(lista.map((p) => p.id))
        const faltantes = seed.filter((p) => !ids.has(p.id))
        setProyectos([...lista, ...faltantes])
      })
      .catch(() => toast.error('No se pudieron cargar los proyectos'))

    // Horarios por turno ya guardados para este día (si los hay).
    fetch(`/api/planificacion/turno-hora?inicio=${fecha}&fin=${fecha}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: { turno: string; horaIngreso: string; horaSalida: string | null }[]) => {
        const h: Record<string, { ingreso: string; salida: string }> = {}
        for (const x of arr) {
          h[x.turno] = {
            ingreso: x.horaIngreso,
            salida: x.horaSalida || turnoHoraDefault[x.turno as TurnoVal]?.salida || '',
          }
        }
        setHorarios(h)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Al abrir, cargar el turno inicial y su celda (si existe).
  useEffect(() => {
    if (!open) return
    const t = turnoInicial ?? 'turno_a'
    const existente = celdaDeTurno(t)
    reset({
      proyectoId: existente?.proyecto?.id ?? '',
      proyectoEdtId: existente?.edt?.id ?? '',
      turno: t,
      esExcepcional: existente?.esExcepcional ?? isWeekend,
      notas: existente?.notas ?? '',
    })
    setMoverDesdeOriginal(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, turnoInicial, fecha])

  // Re-aplicar el proyecto del turno cuando ya cargaron las opciones: el Select de
  // Radix puede quedar en placeholder si el valor se fijó antes de montar la opción.
  useEffect(() => {
    if (!open) return
    const existente = celdaBaseParaTurno(turnoSel)
    if (existente?.proyecto?.id && proyectoId !== existente.proyecto.id) {
      setValue('proyectoId', existente.proyecto.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, turnoSel, proyectos])

  // EDT del proyecto seleccionado (opcional). Se recarga cada vez que cambia el proyecto.
  useEffect(() => {
    if (!open) return
    if (!proyectoId) {
      setProyectoEdts([])
      return
    }
    // Sembrar con el EDT ya asignado en este turno (si aplica), para evitar el
    // placeholder de Radix mientras carga la lista real.
    const existente = celdaBaseParaTurno(turnoSel)
    const seed: ProyectoEdtOption[] =
      existente?.proyecto?.id === proyectoId && existente.edt
        ? [{ id: existente.edt.id, nombre: existente.edt.codigo, categoriaNombre: existente.edt.codigo }]
        : []
    if (seed.length > 0) setProyectoEdts(seed)
    setCargandoEdts(true)
    fetch(`/api/edts-proyecto-simple?proyectoId=${proyectoId}`)
      .then((r) => r.json())
      .then((data: { edts?: ProyectoEdtOption[] }) => {
        const lista = data.edts ?? []
        const ids = new Set(lista.map((e) => e.id))
        const faltantes = seed.filter((e) => !ids.has(e.id))
        setProyectoEdts([...lista, ...faltantes])
      })
      .catch(() => {})
      .finally(() => setCargandoEdts(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyectoId])

  // Re-aplicar el EDT del turno cuando ya cargaron las opciones.
  useEffect(() => {
    if (!open) return
    const existente = celdaBaseParaTurno(turnoSel)
    if (existente?.edt?.id && proyectoEdtId !== existente.edt.id) {
      setValue('proyectoEdtId', existente.edt.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, turnoSel, proyectoEdts])

  // Cambiar de turno carga la asignación de ese turno; si está vacío pero se venía
  // editando una asignación en otro turno, se precarga con esos mismos datos (se
  // asume que la intención es moverla, no perderla).
  const cambiarTurno = (t: TurnoVal) => {
    const base = celdaBaseParaTurno(t)
    setValue('turno', t)
    setValue('proyectoId', base?.proyecto?.id ?? '')
    setValue('proyectoEdtId', base?.edt?.id ?? '')
    setValue('esExcepcional', base?.esExcepcional ?? isWeekend)
    setValue('notas', base?.notas ?? '')
  }

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
          proyectoEdtId: values.proyectoEdtId || null,
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
      } else if (mostrarMover && moverDesdeOriginal) {
        toast.success(`Movida de ${TURNO_LABELS[turnoOrigen]} a ${TURNO_LABELS[values.turno]}`)
      } else {
        toast.success(data.accion === 'creada' ? 'Asignación creada' : 'Asignación actualizada')
      }

      // Si se cambió de turno respecto al original y se eligió "mover", eliminar
      // la asignación del turno de origen para no dejarla duplicada.
      if (mostrarMover && moverDesdeOriginal && celdaOrigen) {
        const delRes = await fetch(`/api/planificacion/dia/${celdaOrigen.id}`, { method: 'DELETE' })
        if (!delRes.ok) {
          toast.warning(
            `Se guardó en ${TURNO_LABELS[values.turno]}, pero no se pudo eliminar la asignación original de ${TURNO_LABELS[turnoOrigen]}`,
          )
        }
      }

      // Guardar el horario del turno para este día (ingreso/salida).
      const hor = horarioDe(values.turno)
      if (hor.ingreso) {
        await fetch('/api/planificacion/turno-hora', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha, turno: values.turno, horaIngreso: hor.ingreso, horaSalida: hor.salida || undefined }),
        }).catch(() => {})
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
              <Label>Turno</Label>
              <Select value={turnoSel} onValueChange={(v) => cambiarTurno(v as TurnoVal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        {TURNO_LABELS[t]}
                        {celdaDeTurno(t) && <Check className="h-3 w-3 text-emerald-600" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Una persona puede tener un proyecto por turno el mismo día. ✓ = turno ya asignado.
              </p>
              {mostrarMover && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-2.5 mt-1">
                  <input
                    type="checkbox"
                    id="mover-turno"
                    checked={moverDesdeOriginal}
                    onChange={(e) => setMoverDesdeOriginal(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-border flex-shrink-0"
                  />
                  <Label htmlFor="mover-turno" className="cursor-pointer text-xs font-normal text-amber-800 dark:text-amber-200">
                    Mover esta asignación desde {TURNO_LABELS[turnoOrigen]} (se eliminará de ahí). Desmarca esta opción si en realidad quieres agregar un turno adicional ese día.
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Horario del turno{' '}
                <span className="font-normal text-muted-foreground">(se usa para compartir la programación)</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="block text-[11px] text-muted-foreground">Ingreso</span>
                  <Input
                    type="time"
                    value={horarioDe(turnoSel).ingreso}
                    onChange={(e) => setHorario(turnoSel, 'ingreso', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex-1">
                  <span className="block text-[11px] text-muted-foreground">Salida</span>
                  <Input
                    type="time"
                    value={horarioDe(turnoSel).salida}
                    onChange={(e) => setHorario(turnoSel, 'salida', e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              {horarioDe(turnoSel).ingreso && horarioDe(turnoSel).salida &&
                horarioDe(turnoSel).salida <= horarioDe(turnoSel).ingreso && (
                  <p className="text-[11px] text-amber-600">La salida es al día siguiente.</p>
                )}
            </div>

            <div className="space-y-1.5">
              <Label>Proyecto <span className="text-destructive">*</span></Label>
              <Select
                value={proyectoId}
                onValueChange={(v) => {
                  setValue('proyectoId', v)
                  setValue('proyectoEdtId', '')
                }}
              >
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
              <Label>EDT <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select
                value={proyectoEdtId || SIN_EDT}
                onValueChange={(v) => setValue('proyectoEdtId', v === SIN_EDT ? '' : v)}
                disabled={!proyectoId || cargandoEdts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={cargandoEdts ? 'Cargando EDT...' : 'Sin EDT'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_EDT}>Sin EDT</SelectItem>
                  {proyectoEdts.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre && e.nombre !== e.categoriaNombre
                        ? `${e.categoriaNombre} — ${e.nombre}`
                        : e.categoriaNombre}
                    </SelectItem>
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
