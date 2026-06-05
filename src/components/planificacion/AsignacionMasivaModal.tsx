'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TURNO_HORA_DEFAULT } from '@/lib/planificacion/turnos'
import { resumenOmisiones } from '@/lib/planificacion/omisiones'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProyectoActivo {
  id: string
  codigo: string
  nombre: string
  color: string
}

export interface CeldaMasiva {
  userId: string
  fecha: string
}

interface Props {
  open: boolean
  onClose: () => void
  onDone: () => void
  celdas: CeldaMasiva[]
}

type TurnoVal = 'turno_a' | 'turno_b' | 'turno_c'
const TURNO_LABELS: Record<TurnoVal, string> = {
  turno_a: 'Turno A · Día',
  turno_b: 'Turno B · Tarde/Noche',
  turno_c: 'Turno C · Noche',
}
const TURNOS: TurnoVal[] = ['turno_a', 'turno_b', 'turno_c']

export default function AsignacionMasivaModal({ open, onClose, onDone, celdas }: Props) {
  const [proyectoId, setProyectoId] = useState('')
  const [turno, setTurno] = useState<TurnoVal>('turno_a')
  const [horaIngreso, setHoraIngreso] = useState(TURNO_HORA_DEFAULT.turno_a.ingreso)
  const [horaSalida, setHoraSalida] = useState(TURNO_HORA_DEFAULT.turno_a.salida)
  const [notas, setNotas] = useState('')

  // Al cambiar de turno, prellenar con su horario por defecto.
  const cambiarTurno = (t: TurnoVal) => {
    setTurno(t)
    setHoraIngreso(TURNO_HORA_DEFAULT[t].ingreso)
    setHoraSalida(TURNO_HORA_DEFAULT[t].salida)
  }
  const [esExcepcional, setEsExcepcional] = useState(false)
  const [saving, setSaving] = useState(false)
  const [proyectos, setProyectos] = useState<ProyectoActivo[]>([])
  const [cargandoProyectos, setCargandoProyectos] = useState(false)

  const tieneFinDeSemana = celdas.some(({ fecha }) => {
    const dow = new Date(fecha + 'T00:00:00.000Z').getUTCDay()
    return dow === 0 || dow === 6
  })

  const numPersonas = new Set(celdas.map((c) => c.userId)).size
  const numDias = new Set(celdas.map((c) => c.fecha)).size

  useEffect(() => {
    if (!open) {
      setProyectoId('')
      setTurno('turno_a')
      setHoraIngreso(TURNO_HORA_DEFAULT.turno_a.ingreso)
      setHoraSalida(TURNO_HORA_DEFAULT.turno_a.salida)
      setNotas('')
      setEsExcepcional(false)
      return
    }
    // Pre-marcar excepcional cuando la selección ya incluye fines de semana
    setEsExcepcional(tieneFinDeSemana)
    setCargandoProyectos(true)
    fetch('/api/planificacion/proyectos-activos')
      .then((r) => r.json())
      .then(setProyectos)
      .catch(() => {})
      .finally(() => setCargandoProyectos(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleConfirm = async () => {
    if (!proyectoId) return
    setSaving(true)
    try {
      const asignaciones = celdas.map(({ userId, fecha }) => {
        const dow = new Date(fecha + 'T00:00:00.000Z').getUTCDay()
        const isWeekend = dow === 0 || dow === 6
        return {
          userId,
          fecha,
          turno,
          proyectoId,
          esExcepcional: isWeekend ? esExcepcional : false,
          notas: notas.trim() || null,
        }
      })

      const res = await fetch('/api/planificacion/dia/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones }),
      })
      const result = await res.json()

      if (!res.ok && res.status !== 207) {
        toast.error(result?.error ?? 'Error al asignar celdas')
        return
      }

      // Guardar el horario del turno para cada día de la selección.
      if (horaIngreso) {
        const fechas = [...new Set(celdas.map((c) => c.fecha))]
        await Promise.all(
          fechas.map((f) =>
            fetch('/api/planificacion/turno-hora', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fecha: f, turno, horaIngreso, horaSalida: horaSalida || undefined }),
            }).catch(() => {}),
          ),
        )
      }

      const msgs: string[] = []
      if (result.creadas > 0)
        msgs.push(`✓ ${result.creadas} celda${result.creadas !== 1 ? 's' : ''} asignada${result.creadas !== 1 ? 's' : ''}`)
      if (result.actualizadas > 0)
        msgs.push(`✓ ${result.actualizadas} actualizada${result.actualizadas !== 1 ? 's' : ''}`)

      const omitidas: Array<{ razon: string }> = result.omitidas ?? []
      msgs.push(...resumenOmisiones(omitidas))

      toast.success(msgs.join(' · ') || 'Sin cambios')
      onDone()
      onClose()
    } catch {
      toast.error('Error al asignar celdas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignación masiva</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Vas a asignar{' '}
          <strong>
            {celdas.length} celda{celdas.length !== 1 ? 's' : ''}
          </strong>{' '}
          distribuidas en{' '}
          <strong>
            {numPersonas} persona{numPersonas !== 1 ? 's' : ''}
          </strong>{' '}
          y{' '}
          <strong>
            {numDias} día{numDias !== 1 ? 's' : ''}
          </strong>
          .
        </p>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Turno</Label>
            <Select value={turno} onValueChange={(v) => cambiarTurno(v as TurnoVal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TURNOS.map((t) => (
                  <SelectItem key={t} value={t}>{TURNO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Horario del turno{' '}
              <span className="font-normal text-muted-foreground">(se usa para compartir la programación)</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <span className="block text-[11px] text-muted-foreground">Ingreso</span>
                <Input type="time" value={horaIngreso} onChange={(e) => setHoraIngreso(e.target.value)} className="h-8" />
              </div>
              <div className="flex-1">
                <span className="block text-[11px] text-muted-foreground">Salida</span>
                <Input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} className="h-8" />
              </div>
            </div>
            {horaIngreso && horaSalida && horaSalida <= horaIngreso && (
              <p className="text-[11px] text-amber-600">La salida es al día siguiente.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Proyecto <span className="text-destructive">*</span>
            </Label>
            <Select value={proyectoId} onValueChange={setProyectoId} disabled={cargandoProyectos}>
              <SelectTrigger>
                <SelectValue placeholder={cargandoProyectos ? 'Cargando proyectos...' : 'Seleccionar proyecto...'} />
              </SelectTrigger>
              <SelectContent>
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      [{p.codigo}] {p.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Notas{' '}
              <span className="text-muted-foreground font-normal">(opcional, se aplican a todas)</span>
            </Label>
            <Textarea
              placeholder="Observaciones sobre esta asignación..."
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={200}
            />
          </div>

          {tieneFinDeSemana && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <input
                type="checkbox"
                id="masivo-excepcional"
                checked={esExcepcional}
                onChange={(e) => setEsExcepcional(e.target.checked)}
                className="h-4 w-4 rounded border-border flex-shrink-0"
              />
              <Label htmlFor="masivo-excepcional" className="cursor-pointer text-sm text-amber-800 dark:text-amber-200">
                Marcar como días excepcionales (la selección incluye fines de semana)
              </Label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!proyectoId || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar {celdas.length} celda{celdas.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
