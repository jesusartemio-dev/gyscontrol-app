'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import type { PlanHistogramas, PlanHistogramaFila } from '@/types/planTrabajo'

interface Props {
  valor: PlanHistogramas
  onSave: (nuevo: PlanHistogramas) => Promise<void>
  onCancel: () => void
}

export function HistogramasEditor({ valor, onSave, onCancel }: Props) {
  const [datos, setDatos] = useState<PlanHistogramas>({
    meses: valor.meses ?? [],
    equipoTrabajo: valor.equipoTrabajo ?? [],
    horasHombre: valor.horasHombre ?? [],
  })
  const [guardando, setGuardando] = useState(false)
  const [nuevoMes, setNuevoMes] = useState('')

  const agregarMes = () => {
    if (!nuevoMes.trim()) return
    setDatos({
      meses: [...datos.meses, nuevoMes.trim()],
      equipoTrabajo: datos.equipoTrabajo.map(f => ({
        ...f,
        valoresPorMes: [...f.valoresPorMes, 0],
      })),
      horasHombre: datos.horasHombre.map(f => ({
        ...f,
        valoresPorMes: [...f.valoresPorMes, 0],
      })),
    })
    setNuevoMes('')
  }

  const eliminarMes = (idx: number) => {
    setDatos({
      meses: datos.meses.filter((_, i) => i !== idx),
      equipoTrabajo: datos.equipoTrabajo.map(f => {
        const nuevosValores = f.valoresPorMes.filter((_, i) => i !== idx)
        return { ...f, valoresPorMes: nuevosValores, total: nuevosValores.reduce((s, v) => s + v, 0) }
      }),
      horasHombre: datos.horasHombre.map(f => {
        const nuevosValores = f.valoresPorMes.filter((_, i) => i !== idx)
        return { ...f, valoresPorMes: nuevosValores, total: nuevosValores.reduce((s, v) => s + v, 0) }
      }),
    })
  }

  const renderTabla = (campo: 'equipoTrabajo' | 'horasHombre', titulo: string) => {
    const filas = datos[campo]

    const agregarFila = () => {
      const nueva: PlanHistogramaFila = {
        etiqueta: '',
        valoresPorMes: datos.meses.map(() => 0),
        total: 0,
      }
      setDatos({ ...datos, [campo]: [...filas, nueva] })
    }

    const eliminarFila = (idx: number) => {
      setDatos({ ...datos, [campo]: filas.filter((_, i) => i !== idx) })
    }

    const actualizarEtiqueta = (idx: number, val: string) => {
      setDatos({
        ...datos,
        [campo]: filas.map((f, i) => (i === idx ? { ...f, etiqueta: val } : f)),
      })
    }

    const actualizarValor = (idxFila: number, idxMes: number, val: number) => {
      setDatos({
        ...datos,
        [campo]: filas.map((f, i) => {
          if (i !== idxFila) return f
          const nuevosValores = f.valoresPorMes.map((v, j) => (j === idxMes ? val : v))
          return { ...f, valoresPorMes: nuevosValores, total: nuevosValores.reduce((s, v) => s + v, 0) }
        }),
      })
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{titulo}</h4>
          <Button size="sm" variant="outline" onClick={agregarFila} disabled={datos.meses.length === 0}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar fila
          </Button>
        </div>

        {datos.meses.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Agregá meses primero (panel superior).
          </p>
        ) : filas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Sin filas. Click en &quot;Agregar fila&quot; para empezar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-1 text-left">Etiqueta</th>
                  {datos.meses.map((mes, i) => (
                    <th key={i} className="border p-1 text-center w-20">{mes}</th>
                  ))}
                  <th className="border p-1 text-center w-20">Total</th>
                  <th className="border p-1 w-10" />
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, idx) => (
                  <tr key={idx}>
                    <td className="border p-1">
                      <Input
                        value={fila.etiqueta}
                        onChange={e => actualizarEtiqueta(idx, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    {datos.meses.map((_, mIdx) => (
                      <td key={mIdx} className="border p-1">
                        <Input
                          type="number"
                          value={fila.valoresPorMes[mIdx] ?? 0}
                          onChange={e => actualizarValor(idx, mIdx, Number(e.target.value) || 0)}
                          className="h-7 text-xs text-right"
                        />
                      </td>
                    ))}
                    <td className="border p-1 text-right font-medium">{fila.total}</td>
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
        )}
      </div>
    )
  }

  const handleSave = async () => {
    setGuardando(true)
    try {
      const limpio: PlanHistogramas = {
        meses: datos.meses,
        equipoTrabajo: datos.equipoTrabajo.filter(f => f.etiqueta.trim()),
        horasHombre: datos.horasHombre.filter(f => f.etiqueta.trim()),
      }
      await onSave(limpio)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Histogramas</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          <div className="border rounded-lg p-3">
            <h4 className="font-semibold text-sm mb-2">Meses del proyecto</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {datos.meses.map((mes, idx) => (
                <div key={idx} className="bg-muted px-2 py-1 rounded flex items-center gap-1 text-xs">
                  <span>{mes}</span>
                  <button onClick={() => eliminarMes(idx)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {datos.meses.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sin meses agregados.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={nuevoMes}
                onChange={e => setNuevoMes(e.target.value)}
                placeholder="ej: Feb 2026"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && agregarMes()}
              />
              <Button size="sm" onClick={agregarMes}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="equipoTrabajo">
            <TabsList>
              <TabsTrigger value="equipoTrabajo">Equipo de Trabajo</TabsTrigger>
              <TabsTrigger value="horasHombre">Horas Hombre</TabsTrigger>
            </TabsList>
            <TabsContent value="equipoTrabajo" className="mt-4">
              {renderTabla('equipoTrabajo', 'Personas por mes')}
            </TabsContent>
            <TabsContent value="horasHombre" className="mt-4">
              {renderTabla('horasHombre', 'Horas Hombre por mes')}
            </TabsContent>
          </Tabs>
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
