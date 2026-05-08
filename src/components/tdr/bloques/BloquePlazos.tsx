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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TdrBloqueCard } from '../TdrBloqueCard'
import { BloqueAccionesIA } from '../BloqueAccionesIA'
import { TdrEditableTable } from '../TdrEditableTable'
import type { EstadoBloque, FaseCronograma, HitoContractual } from '@/types/tdr'

export interface BloquePlazOsDatos {
  cronogramaEstimado?: FaseCronograma[]
  hitosContractuales?: HitoContractual[]
}

interface Props {
  datos: BloquePlazOsDatos
  estado: EstadoBloque
  onGuardar: (datos: BloquePlazOsDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloquePlazOsDatos> | null
  onCerrarPrellenado?: () => void
}

const TIPO_HITO_OPTS = [
  { value: 'kom', label: 'KOM' },
  { value: 'fat', label: 'FAT' },
  { value: 'sat', label: 'SAT' },
  { value: 'comisionamiento', label: 'Comisionamiento' },
  { value: 'as-built', label: 'As-Built' },
  { value: 'otro', label: 'Otro' },
]

export function BloquePlazos({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [cronograma, setCronograma] = useState<FaseCronograma[]>(datos.cronogramaEstimado ?? [])
  const [hitos, setHitos] = useState<HitoContractual[]>(datos.hitosContractuales ?? [])

  useEffect(() => {
    if (prellenarConDatos) {
      if (prellenarConDatos.cronogramaEstimado) setCronograma(prellenarConDatos.cronogramaEstimado)
      if (prellenarConDatos.hitosContractuales) setHitos(prellenarConDatos.hitosContractuales)
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const crono = datos.cronogramaEstimado ?? []
  const hitosData = datos.hitosContractuales ?? []

  return (
    <>
      <TdrBloqueCard
        numero={5}
        titulo="Plazos"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="plazos" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => {
                setCronograma(datos.cronogramaEstimado ?? [])
                setHitos(datos.hitosContractuales ?? [])
                setEditando(true)
              }}>
                <Pencil className="mr-1 h-3 w-3" />Editar
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Cronograma ({crono.length} fases)</p>
            {crono.length === 0 ? <p className="text-sm italic text-muted-foreground">Sin cronograma</p> : (
              <ul className="space-y-0.5">
                {crono.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-sm">• {f.fase}{f.duracion ? ` — ${f.duracion}` : ''}</li>
                ))}
                {crono.length > 4 && <li className="text-xs text-muted-foreground">+{crono.length - 4} más</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Hitos ({hitosData.length})</p>
            {hitosData.length === 0 ? <p className="text-sm italic text-muted-foreground">Sin hitos</p> : (
              <ul className="space-y-0.5">
                {hitosData.slice(0, 4).map((h, i) => (
                  <li key={i} className="text-sm">• {h.nombre} <span className="text-xs text-muted-foreground">({h.tipo.toUpperCase()})</span></li>
                ))}
                {hitosData.length > 4 && <li className="text-xs text-muted-foreground">+{hitosData.length - 4} más</li>}
              </ul>
            )}
          </div>
        </div>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar plazos e hitos</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Tabs defaultValue="cronograma">
              <TabsList>
                <TabsTrigger value="cronograma">Cronograma ({cronograma.length})</TabsTrigger>
                <TabsTrigger value="hitos">Hitos contractuales ({hitos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="cronograma" className="pt-3">
                <TdrEditableTable<FaseCronograma>
                  data={cronograma}
                  columns={[
                    { key: 'fase', label: 'Fase', type: 'text', required: true },
                    { key: 'duracion', label: 'Duración', type: 'text', placeholder: 'Ej: 2 semanas', width: '160px' },
                    { key: 'observaciones', label: 'Observaciones', type: 'text' },
                  ]}
                  filaVacia={() => ({ fase: '' })}
                  onSave={async filas => {
                    setCronograma(filas)
                    await onGuardar({ cronogramaEstimado: filas, hitosContractuales: hitos })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>
              <TabsContent value="hitos" className="pt-3">
                <TdrEditableTable<HitoContractual>
                  data={hitos}
                  columns={[
                    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { key: 'tipo', label: 'Tipo', type: 'select', required: true, width: '160px', options: TIPO_HITO_OPTS },
                    { key: 'fechaEstimada', label: 'Fecha estimada', type: 'text', placeholder: 'YYYY-MM-DD', width: '140px' },
                    { key: 'diasDesdeInicio', label: 'Días desde inicio', type: 'number', width: '120px' },
                  ]}
                  filaVacia={() => ({ nombre: '', tipo: 'otro' })}
                  onSave={async filas => {
                    setHitos(filas)
                    await onGuardar({ cronogramaEstimado: cronograma, hitosContractuales: filas })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
