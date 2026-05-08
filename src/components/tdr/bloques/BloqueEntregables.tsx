'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TdrBloqueCard } from '../TdrBloqueCard'
import { BloqueAccionesIA } from '../BloqueAccionesIA'
import { TdrEditableTable } from '../TdrEditableTable'
import type { EstadoBloque, EntregableDossier } from '@/types/tdr'

export interface BloqueEntregablesDatos {
  entregablesDossier?: EntregableDossier[]
}

interface Props {
  datos: BloqueEntregablesDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueEntregablesDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueEntregablesDatos> | null
  onCerrarPrellenado?: () => void
}

const FORMATO_OPTS = [
  { value: 'fisico', label: 'Físico' },
  { value: 'digital', label: 'Digital' },
  { value: 'ambos', label: 'Ambos' },
]

const FASE_OPTS = [
  { value: 'ingenieria', label: 'Ingeniería' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'cierre', label: 'Cierre' },
]

const FASE_LABELS: Record<string, string> = {
  ingenieria: 'Ingeniería',
  construccion: 'Construcción',
  cierre: 'Cierre',
}

export function BloqueEntregables({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    if (prellenarConDatos) setEditando(true)
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const entregables = datos.entregablesDossier ?? []
  const porFase = (fase: string) => entregables.filter(e => e.fase === fase)

  return (
    <>
      <TdrBloqueCard
        numero={8}
        titulo="Entregables"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="entregables" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
                <Pencil className="mr-1 h-3 w-3" />Editar
              </Button>
            </>
          ) : undefined
        }
      >
        {entregables.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sin entregables definidos</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(['ingenieria', 'construccion', 'cierre'] as const).map(fase => {
              const items = porFase(fase)
              if (items.length === 0) return null
              return (
                <div key={fase}>
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                    {FASE_LABELS[fase]} ({items.length})
                  </p>
                  <ul className="space-y-0.5">
                    {items.slice(0, 4).map((e, i) => (
                      <li key={i} className="text-sm truncate">
                        • {e.nombre}{e.formato ? ` (${e.formato})` : ''}
                      </li>
                    ))}
                    {items.length > 4 && (
                      <li className="text-xs text-muted-foreground">+{items.length - 4} más</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar entregables del dossier</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <TdrEditableTable<EntregableDossier>
              data={prellenarConDatos?.entregablesDossier ?? entregables}
              columns={[
                { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                { key: 'fase', label: 'Fase', type: 'select', required: true, width: '140px', options: FASE_OPTS },
                { key: 'formato', label: 'Formato', type: 'select', width: '120px', options: FORMATO_OPTS },
              ]}
              filaVacia={() => ({ nombre: '', fase: 'ingenieria' })}
              onSave={async filas => {
                await onGuardar({ entregablesDossier: filas })
                handleClose()
              }}
              onCancel={handleClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
