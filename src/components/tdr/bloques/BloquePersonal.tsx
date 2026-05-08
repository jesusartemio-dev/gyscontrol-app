'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TdrBloqueCard } from '../TdrBloqueCard'
import { BloqueAccionesIA } from '../BloqueAccionesIA'
import { TdrEditableTable } from '../TdrEditableTable'
import type { EstadoBloque, PersonalRequerido } from '@/types/tdr'

export interface BloquePersonalDatos {
  personalRequerido?: PersonalRequerido[]
}

interface Props {
  datos: BloquePersonalDatos
  estado: EstadoBloque
  onGuardar: (datos: BloquePersonalDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloquePersonalDatos> | null
  onCerrarPrellenado?: () => void
}

export function BloquePersonal({
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

  const personal = datos.personalRequerido ?? []

  return (
    <>
      <TdrBloqueCard
        numero={4}
        titulo="Personal"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="personal" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
                <Pencil className="mr-1 h-3 w-3" />Editar
              </Button>
            </>
          ) : undefined
        }
      >
        {personal.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sin personal definido</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="pb-1 pr-4 text-left font-medium">Rol</th>
                  <th className="pb-1 pr-4 text-left font-medium">Cant.</th>
                  <th className="pb-1 pr-4 text-left font-medium">Exp.</th>
                  <th className="pb-1 pr-4 text-left font-medium">Certificaciones</th>
                  <th className="pb-1 text-left font-medium">Obligatorio</th>
                </tr>
              </thead>
              <tbody>
                {personal.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{p.rol}</td>
                    <td className="py-1.5 pr-4">{p.cantidad}</td>
                    <td className="py-1.5 pr-4">{p.experienciaAnios != null ? `${p.experienciaAnios}a` : '—'}</td>
                    <td className="py-1.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.certificaciones ?? []).map((c, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">{c}</Badge>
                        ))}
                        {!p.certificaciones?.length && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="py-1.5">{p.obligatorio ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar personal requerido</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <TdrEditableTable<PersonalRequerido>
              data={prellenarConDatos?.personalRequerido ?? datos.personalRequerido ?? []}
              columns={[
                { key: 'rol', label: 'Rol', type: 'text', required: true },
                { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, width: '100px' },
                { key: 'experienciaAnios', label: 'Exp. (años)', type: 'number', width: '120px' },
                { key: 'certificaciones', label: 'Certificaciones', type: 'multiselect', placeholder: 'CIP, OSHA, etc.' },
                { key: 'obligatorio', label: 'Obligatorio', type: 'boolean', width: '100px' },
              ]}
              filaVacia={() => ({ rol: '', cantidad: 1, obligatorio: false, certificaciones: [] })}
              onSave={async filas => {
                await onGuardar({ personalRequerido: filas })
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
