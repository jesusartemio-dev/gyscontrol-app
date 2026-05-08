'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { TdrBloqueCard } from '../TdrBloqueCard'
import { BloqueAccionesIA } from '../BloqueAccionesIA'
import { TdrEditableTable } from '../TdrEditableTable'
import type { EstadoBloque, Requerimiento } from '@/types/tdr'

export interface BloqueAlcanceDatos {
  resumenTdr?: string | null
  alcanceDetectado?: string | null
  requerimientos?: Requerimiento[]
}

interface Props {
  datos: BloqueAlcanceDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueAlcanceDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueAlcanceDatos> | null
  onCerrarPrellenado?: () => void
}

const CRITICIDAD_OPTS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

const CRITICIDAD_COLOR: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-gray-100 text-gray-600',
}

export function BloqueAlcance({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [resumen, setResumen] = useState(datos.resumenTdr ?? '')
  const [alcance, setAlcance] = useState(datos.alcanceDetectado ?? '')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (prellenarConDatos) {
      if (prellenarConDatos.resumenTdr !== undefined) setResumen(prellenarConDatos.resumenTdr ?? '')
      if (prellenarConDatos.alcanceDetectado !== undefined) setAlcance(prellenarConDatos.alcanceDetectado ?? '')
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const handleGuardarTabla = async (filas: Requerimiento[]) => {
    setGuardando(true)
    try {
      await onGuardar({
        resumenTdr: resumen.trim() || null,
        alcanceDetectado: alcance.trim() || null,
        requerimientos: filas,
      })
      handleClose()
    } finally {
      setGuardando(false)
    }
  }

  const reqs = datos.requerimientos ?? []

  return (
    <>
      <TdrBloqueCard
        numero={2}
        titulo="Alcance"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="alcance" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => {
                setResumen(datos.resumenTdr ?? '')
                setAlcance(datos.alcanceDetectado ?? '')
                setEditando(true)
              }}>
                <Pencil className="mr-1 h-3 w-3" />Editar
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {datos.alcanceDetectado ? (
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {datos.alcanceDetectado}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Sin alcance definido</p>
          )}
          {reqs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {reqs.length} requerimiento{reqs.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {reqs.slice(0, 5).map((r, i) => (
                  <Badge key={i} variant="outline" className={`text-xs ${r.criticidad ? CRITICIDAD_COLOR[r.criticidad] : ''}`}>
                    {r.descripcion.length > 40 ? r.descripcion.slice(0, 40) + '…' : r.descripcion}
                  </Badge>
                ))}
                {reqs.length > 5 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{reqs.length - 5} más
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Editar alcance</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resumen TDR</label>
              <Textarea rows={4} value={resumen} onChange={e => setResumen(e.target.value)} placeholder="Resumen ejecutivo del TDR…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alcance detallado</label>
              <Textarea rows={4} value={alcance} onChange={e => setAlcance(e.target.value)} placeholder="Descripción detallada del alcance…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Requerimientos</label>
              <TdrEditableTable<Requerimiento>
                data={datos.requerimientos ?? []}
                columns={[
                  { key: 'descripcion', label: 'Descripción', type: 'text', required: true, placeholder: 'Descripción del requerimiento' },
                  { key: 'cantidad', label: 'Cantidad', type: 'number', width: '100px' },
                  { key: 'especificacion', label: 'Especificación', type: 'text', placeholder: 'Detalles técnicos' },
                  { key: 'criticidad', label: 'Criticidad', type: 'select', width: '120px', options: CRITICIDAD_OPTS },
                ]}
                filaVacia={() => ({ descripcion: '', criticidad: 'media' })}
                onSave={handleGuardarTabla}
                onCancel={handleClose}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={handleClose} disabled={guardando}>Cancelar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
