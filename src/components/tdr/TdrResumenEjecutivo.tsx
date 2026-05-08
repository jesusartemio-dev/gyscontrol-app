'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, FileText } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { TdrEditableTable } from './TdrEditableTable'
import type { ResumenEjecutivoPunto } from '@/types/tdr'

interface Props {
  narrativa?: string | null
  puntos?: ResumenEjecutivoPunto[] | null
  onGuardar: (datos: {
    resumenEjecutivoNarrativa: string | null
    resumenEjecutivoPuntos: ResumenEjecutivoPunto[]
  }) => Promise<void>
  readOnly?: boolean
}

export function TdrResumenEjecutivo({
  narrativa,
  puntos,
  onGuardar,
  readOnly = false,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [narrativaLocal, setNarrativaLocal] = useState(narrativa ?? '')
  const [guardando, setGuardando] = useState(false)

  const hayContenido =
    (narrativa && narrativa.trim().length > 0) || (puntos && puntos.length > 0)

  const handleGuardarTabla = async (filas: ResumenEjecutivoPunto[]) => {
    setGuardando(true)
    try {
      await onGuardar({
        resumenEjecutivoNarrativa: narrativaLocal.trim() || null,
        resumenEjecutivoPuntos: filas,
      })
      setEditando(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Resumen ejecutivo</h3>
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNarrativaLocal(narrativa ?? '')
                setEditando(true)
              }}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!hayContenido && (
            <p className="text-sm text-muted-foreground">
              Sin resumen ejecutivo.{!readOnly && ' Click en Editar para agregarlo.'}
            </p>
          )}
          {narrativa && (
            <p className="whitespace-pre-line text-sm leading-relaxed">{narrativa}</p>
          )}
          {puntos && puntos.length > 0 && (
            <ul className="space-y-1.5 pt-2">
              {puntos.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">·</span>
                  <span>
                    <span className="text-xs uppercase text-muted-foreground">
                      [{p.categoria}]
                    </span>{' '}
                    {p.texto}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Sheet open={editando} onOpenChange={setEditando}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Editar resumen ejecutivo</SheetTitle>
            <SheetDescription>
              Narrativa + puntos clave que describen el alcance del cliente.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Narrativa</label>
              <Textarea
                rows={6}
                value={narrativaLocal}
                onChange={e => setNarrativaLocal(e.target.value)}
                placeholder="2-3 párrafos describiendo el alcance del cliente…"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Puntos clave</label>
              <TdrEditableTable<ResumenEjecutivoPunto>
                data={puntos ?? []}
                columns={[
                  {
                    key: 'categoria',
                    label: 'Categoría',
                    type: 'select',
                    required: true,
                    width: '160px',
                    options: [
                      { value: 'entregable', label: 'Entregable' },
                      { value: 'ubicacion', label: 'Ubicación' },
                      { value: 'plazo', label: 'Plazo' },
                      { value: 'condicion', label: 'Condición' },
                      { value: 'otro', label: 'Otro' },
                    ],
                  },
                  {
                    key: 'texto',
                    label: 'Texto',
                    type: 'text',
                    required: true,
                    placeholder: 'Punto clave',
                  },
                ]}
                filaVacia={() => ({ categoria: 'otro', texto: '' })}
                onSave={handleGuardarTabla}
                onCancel={() => setEditando(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
