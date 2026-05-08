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
import type { EstadoBloque, EquipoIdentificado, ServicioIdentificado } from '@/types/tdr'

export interface BloqueSuministrosDatos {
  equiposIdentificados?: EquipoIdentificado[]
  serviciosIdentificados?: ServicioIdentificado[]
}

interface Props {
  datos: BloqueSuministrosDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueSuministrosDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueSuministrosDatos> | null
  onCerrarPrellenado?: () => void
}

const SUMINISTRA_OPTS = [
  { value: 'contratista', label: 'Contratista' },
  { value: 'cliente', label: 'Cliente' },
]

export function BloqueSuministros({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [equipos, setEquipos] = useState<EquipoIdentificado[]>(datos.equiposIdentificados ?? [])
  const [servicios, setServicios] = useState<ServicioIdentificado[]>(datos.serviciosIdentificados ?? [])

  useEffect(() => {
    if (prellenarConDatos) {
      if (prellenarConDatos.equiposIdentificados) setEquipos(prellenarConDatos.equiposIdentificados)
      if (prellenarConDatos.serviciosIdentificados) setServicios(prellenarConDatos.serviciosIdentificados)
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const eqs = datos.equiposIdentificados ?? []
  const svcs = datos.serviciosIdentificados ?? []

  return (
    <>
      <TdrBloqueCard
        numero={3}
        titulo="Suministros"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="suministros" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => {
                setEquipos(datos.equiposIdentificados ?? [])
                setServicios(datos.serviciosIdentificados ?? [])
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
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
              Equipos ({eqs.length})
            </p>
            {eqs.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin equipos</p>
            ) : (
              <ul className="space-y-0.5">
                {eqs.slice(0, 4).map((e, i) => (
                  <li key={i} className="text-sm truncate">• {e.nombre}{e.cantidad ? ` (×${e.cantidad})` : ''}</li>
                ))}
                {eqs.length > 4 && <li className="text-xs text-muted-foreground">+{eqs.length - 4} más</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
              Servicios ({svcs.length})
            </p>
            {svcs.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin servicios</p>
            ) : (
              <ul className="space-y-0.5">
                {svcs.slice(0, 4).map((s, i) => (
                  <li key={i} className="text-sm truncate">• {s.nombre}</li>
                ))}
                {svcs.length > 4 && <li className="text-xs text-muted-foreground">+{svcs.length - 4} más</li>}
              </ul>
            )}
          </div>
        </div>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar suministros</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Tabs defaultValue="equipos">
              <TabsList>
                <TabsTrigger value="equipos">Equipos ({equipos.length})</TabsTrigger>
                <TabsTrigger value="servicios">Servicios ({servicios.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="equipos" className="pt-3">
                <TdrEditableTable<EquipoIdentificado>
                  data={equipos}
                  columns={[
                    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { key: 'cantidad', label: 'Cantidad', type: 'number', width: '100px' },
                    { key: 'especificacion', label: 'Especificación', type: 'text' },
                    { key: 'estimadoUsd', label: 'Estimado USD', type: 'number', width: '120px' },
                    { key: 'suministra', label: 'Suministra', type: 'select', width: '140px', options: SUMINISTRA_OPTS },
                    { key: 'marcaSugerida', label: 'Marca', type: 'text' },
                  ]}
                  filaVacia={() => ({ nombre: '' })}
                  onSave={async filas => {
                    setEquipos(filas)
                    await onGuardar({ equiposIdentificados: filas, serviciosIdentificados: servicios })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>
              <TabsContent value="servicios" className="pt-3">
                <TdrEditableTable<ServicioIdentificado>
                  data={servicios}
                  columns={[
                    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { key: 'descripcion', label: 'Descripción', type: 'text' },
                    { key: 'horasEstimadas', label: 'Horas est.', type: 'number', width: '120px' },
                  ]}
                  filaVacia={() => ({ nombre: '' })}
                  onSave={async filas => {
                    setServicios(filas)
                    await onGuardar({ equiposIdentificados: equipos, serviciosIdentificados: filas })
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
