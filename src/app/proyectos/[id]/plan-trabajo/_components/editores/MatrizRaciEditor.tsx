'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import type { PlanRaci, PlanRaciRol, PlanPersonal } from '@/types/planTrabajo'

interface Props {
  valor: PlanRaci
  personal: PlanPersonal[]
  onSave: (nuevo: PlanRaci) => Promise<void>
  onCancel: () => void
}

const ROLES: { value: PlanRaciRol | ''; label: string }[] = [
  { value: '', label: '—' },
  { value: 'R', label: 'R' },
  { value: 'A', label: 'A' },
  { value: 'C', label: 'C' },
  { value: 'I', label: 'I' },
]

function calcularSiglas(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0]?.toUpperCase() ?? '')
    .slice(0, 3)
    .join('')
}

export function MatrizRaciEditor({ valor, personal, onSave, onCancel }: Props) {
  const [datos, setDatos] = useState<PlanRaci>(valor ?? { filas: [] })
  const [guardando, setGuardando] = useState(false)

  const siglasDisponibles = useMemo(() => {
    return (personal ?? [])
      .map(p => ({
        siglas: p.siglas?.trim() || calcularSiglas(p.nombre),
        nombre: p.nombre,
        cargo: p.cargo,
      }))
      .filter(s => s.siglas)
  }, [personal])

  const obtenerRol = (filaIdx: number, siglas: string): PlanRaciRol | '' => {
    const fila = datos.filas[filaIdx]
    if (!fila) return ''
    return fila.asignaciones.find(a => a.siglas === siglas)?.rol ?? ''
  }

  const setRol = (filaIdx: number, siglas: string, rol: PlanRaciRol | '') => {
    setDatos({
      filas: datos.filas.map((f, i) => {
        if (i !== filaIdx) return f
        const sinEsta = f.asignaciones.filter(a => a.siglas !== siglas)
        return {
          ...f,
          asignaciones: rol !== '' ? [...sinEsta, { siglas, rol }] : sinEsta,
        }
      }),
    })
  }

  const setEdt = (filaIdx: number, edt: string) => {
    setDatos({
      filas: datos.filas.map((f, i) => (i === filaIdx ? { ...f, edt } : f)),
    })
  }

  const agregarFila = () => {
    setDatos({ filas: [...datos.filas, { edt: '', asignaciones: [] }] })
  }

  const eliminarFila = (idx: number) => {
    setDatos({ filas: datos.filas.filter((_, i) => i !== idx) })
  }

  const handleSave = async () => {
    setGuardando(true)
    try {
      await onSave({ filas: datos.filas.filter(f => f.edt.trim()) })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (siglasDisponibles.length === 0) {
    return (
      <Sheet open onOpenChange={(open) => !open && onCancel()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Editar Matriz RACI</SheetTitle>
          </SheetHeader>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-900">
              No hay personal asignado al plan. Para crear la matriz RACI,
              primero agregá personas en la sección &quot;Personal Asignado&quot;.
            </p>
          </div>
          <SheetFooter className="mt-4">
            <Button onClick={onCancel}>Cerrar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Matriz RACI</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            <strong>Leyenda:</strong> R = Responsable / A = Aprobador / C = Consultado / I = Informado / — = Sin asignación
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-1 text-left min-w-[200px]">EDT / Actividad</th>
                  {siglasDisponibles.map(s => (
                    <th
                      key={s.siglas}
                      className="border p-1 text-center w-16"
                      title={`${s.nombre} — ${s.cargo}`}
                    >
                      {s.siglas}
                    </th>
                  ))}
                  <th className="border p-1 w-10" />
                </tr>
              </thead>
              <tbody>
                {datos.filas.length === 0 && (
                  <tr>
                    <td
                      colSpan={siglasDisponibles.length + 2}
                      className="border p-3 text-center text-muted-foreground italic"
                    >
                      Sin filas. Click en &quot;Agregar fila EDT&quot; para empezar.
                    </td>
                  </tr>
                )}
                {datos.filas.map((fila, idx) => (
                  <tr key={idx}>
                    <td className="border p-1">
                      <Input
                        value={fila.edt}
                        onChange={e => setEdt(idx, e.target.value)}
                        placeholder="ej: HMI, PLC, CAD"
                        className="h-7 text-xs"
                      />
                    </td>
                    {siglasDisponibles.map(s => (
                      <td key={s.siglas} className="border p-1">
                        <select
                          value={obtenerRol(idx, s.siglas)}
                          onChange={e => setRol(idx, s.siglas, e.target.value as PlanRaciRol | '')}
                          className="w-full h-7 text-xs text-center bg-background border rounded"
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className="border p-1 text-center">
                      <Button size="sm" variant="ghost" onClick={() => eliminarFila(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button size="sm" variant="outline" onClick={agregarFila}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar fila EDT
          </Button>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
