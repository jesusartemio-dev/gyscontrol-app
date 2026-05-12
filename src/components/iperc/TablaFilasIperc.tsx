'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pencil, Trash2, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { badgeNivelRiesgo } from '@/lib/iperc/colorRiesgo'
import { evaluarRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'
import type { IpercFila } from '@/types/iperc'

const COLS = [
  { key: '#',         label: '#',           w: 40  },
  { key: 'proceso',   label: 'Proceso',     w: 110 },
  { key: 'actividad', label: 'Actividad',   w: 110 },
  { key: 'tarea',     label: 'Tarea',       w: 110 },
  { key: 'puesto',    label: 'Puesto',      w: 100 },
  { key: 'factor',    label: 'Factor',      w: 90  },
  { key: 'condicion', label: 'Condición',   w: 80  },
  { key: 'peligro',   label: 'Peligro',     w: 130 },
  { key: 'riesgo',    label: 'Riesgo',      w: 130 },
  { key: 'sev',       label: 'Sev',         w: 44  },
  { key: 'prob',      label: 'Prob',        w: 44  },
  { key: 'nivel',     label: 'Nivel',       w: 72  },
  { key: 'controles', label: 'Controles',   w: 80  },
  { key: 'sevR',      label: 'SevR',        w: 44  },
  { key: 'probR',     label: 'ProbR',       w: 50  },
  { key: 'nivelR',    label: 'Nivel R',     w: 72  },
  { key: 'acciones',  label: 'Acciones',    w: 72  },
]

const totalW = COLS.reduce((s, c) => s + c.w, 0)

interface Props {
  filas: IpercFila[]
  onEdit: (fila: IpercFila) => void
  onDelete: (filaId: string) => void
}

function ControlesPopover({ fila }: { fila: IpercFila }) {
  const partes = [
    fila.eliminar && `Eliminar: ${fila.eliminar}`,
    fila.sustituir && `Sustituir: ${fila.sustituir}`,
    fila.controlIngenieria && `Ingeniería: ${fila.controlIngenieria}`,
    fila.controlAdministrativo && `Administrativo: ${fila.controlAdministrativo}`,
    fila.controlReceptor && `Receptor: ${fila.controlReceptor}`,
  ].filter(Boolean)

  if (partes.length === 0) return <span className="text-muted-foreground text-xs">—</span>

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
          Ver <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs space-y-1 p-3" side="left">
        {partes.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {fila.accionesMejora && (
          <p className="pt-1 border-t mt-1">
            <span className="font-medium">Plan: </span>{fila.accionesMejora}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NivelBadge({ severidad, probabilidad }: { severidad: number; probabilidad: string }) {
  const ev = evaluarRiesgo(severidad, probabilidad)
  if (!ev) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge className={`text-[10px] px-1.5 py-0 ${badgeNivelRiesgo(ev.nivel)}`}>
      {ev.nivel}
    </Badge>
  )
}

function Cell({ children, w }: { children: React.ReactNode; w: number }) {
  return (
    <div
      className="flex items-center px-1.5 shrink-0 overflow-hidden"
      style={{ width: w, minWidth: w }}
    >
      <span className="truncate text-xs">{children}</span>
    </div>
  )
}

export function TablaFilasIperc({ filas, onEdit, onDelete }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: filas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  })

  if (filas.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground border rounded-md">
        Sin filas. Generá con IA o agregá manualmente.
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/60 border-b text-xs font-medium sticky top-0 z-10 overflow-x-auto">
        {COLS.map(col => (
          <div
            key={col.key}
            className="px-1.5 py-2 shrink-0 text-muted-foreground"
            style={{ width: col.w, minWidth: col.w }}
          >
            {col.label}
          </div>
        ))}
        <div className="px-1.5 py-2 w-16 shrink-0 text-muted-foreground">Editar</div>
      </div>

      {/* Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(filas.length * 44, 600) }}
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', minWidth: totalW + 64 }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const fila = filas[virtualRow.index]
            return (
              <div
                key={fila.id}
                className="absolute top-0 left-0 w-full flex items-center border-b hover:bg-muted/30 transition-colors"
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Cell w={COLS[0].w}>{fila.numero}</Cell>
                <Cell w={COLS[1].w}>{fila.proceso}</Cell>
                <Cell w={COLS[2].w}>{fila.actividad}</Cell>
                <Cell w={COLS[3].w}>{fila.tarea}</Cell>
                <Cell w={COLS[4].w}>{fila.puestoTrabajo}</Cell>
                <Cell w={COLS[5].w}>{fila.factorRiesgo}</Cell>
                <Cell w={COLS[6].w}>{fila.condicionActividad}</Cell>
                <Cell w={COLS[7].w}>{fila.peligro}</Cell>
                <Cell w={COLS[8].w}>{fila.riesgo}</Cell>
                <Cell w={COLS[9].w}>{fila.severidad}</Cell>
                <Cell w={COLS[10].w}>{fila.probabilidad}</Cell>
                <div className="flex items-center px-1 shrink-0" style={{ width: COLS[11].w, minWidth: COLS[11].w }}>
                  <NivelBadge severidad={fila.severidad} probabilidad={fila.probabilidad} />
                </div>
                <div className="flex items-center px-1 shrink-0" style={{ width: COLS[12].w, minWidth: COLS[12].w }}>
                  <ControlesPopover fila={fila} />
                </div>
                <Cell w={COLS[13].w}>{fila.severidadResidual}</Cell>
                <Cell w={COLS[14].w}>{fila.probabilidadResidual}</Cell>
                <div className="flex items-center px-1 shrink-0" style={{ width: COLS[15].w, minWidth: COLS[15].w }}>
                  <NivelBadge severidad={fila.severidadResidual} probabilidad={fila.probabilidadResidual} />
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 px-1 shrink-0 w-16">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onEdit(fila)}
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDelete(fila.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
