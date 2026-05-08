'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TdrBloqueCard } from '../TdrBloqueCard'
import { BloqueAccionesIA } from '../BloqueAccionesIA'
import type { EstadoBloque } from '@/types/tdr'

export interface BloqueIdentificacionDatos {
  clienteDetectado?: string | null
  proyectoDetectado?: string | null
  ubicacionDetectada?: string | null
}

interface Props {
  datos: BloqueIdentificacionDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueIdentificacionDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueIdentificacionDatos> | null
  onCerrarPrellenado?: () => void
}

export function BloqueIdentificacion({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<BloqueIdentificacionDatos>(datos)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (prellenarConDatos) {
      setForm(prev => ({ ...prev, ...prellenarConDatos }))
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const handleSave = async () => {
    setGuardando(true)
    try {
      await onGuardar(form)
      handleClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <TdrBloqueCard
        numero={1}
        titulo="Identificación"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA
                bloque="identificacion"
                disabled={!onExtraerConIA}
                onExtraerConIA={onExtraerConIA}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setForm(datos); setEditando(true) }}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Editar
              </Button>
            </>
          ) : undefined
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoLectura label="Cliente" valor={datos.clienteDetectado} />
          <CampoLectura label="Proyecto" valor={datos.proyectoDetectado} />
          <CampoLectura label="Ubicación" valor={datos.ubicacionDetectada} />
        </dl>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar identificación</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <CampoEdicion
              label="Cliente"
              value={form.clienteDetectado ?? ''}
              onChange={v => setForm(p => ({ ...p, clienteDetectado: v || null }))}
            />
            <CampoEdicion
              label="Proyecto"
              value={form.proyectoDetectado ?? ''}
              onChange={v => setForm(p => ({ ...p, proyectoDetectado: v || null }))}
            />
            <CampoEdicion
              label="Ubicación"
              value={form.ubicacionDetectada ?? ''}
              onChange={v => setForm(p => ({ ...p, ubicacionDetectada: v || null }))}
            />
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={handleClose} disabled={guardando}>Cancelar</Button>
            <Button onClick={handleSave} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

function CampoLectura({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        {valor || <span className="italic text-muted-foreground">No definido</span>}
      </dd>
    </div>
  )
}

function CampoEdicion({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
