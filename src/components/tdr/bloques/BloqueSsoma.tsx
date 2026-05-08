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
import type { EstadoBloque, NormaAplicable, DocumentoPrevio, RiesgoCritico } from '@/types/tdr'

export interface BloqueSsomaDatos {
  normasAplicables?: NormaAplicable[]
  documentosPrevios?: DocumentoPrevio[]
  riesgosCriticos?: RiesgoCritico[]
}

interface Props {
  datos: BloqueSsomaDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueSsomaDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueSsomaDatos> | null
  onCerrarPrellenado?: () => void
}

const CATEGORIA_NORMA_OPTS = [
  { value: 'electrica', label: 'Eléctrica' },
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'ssoma', label: 'SSOMA' },
  { value: 'calidad', label: 'Calidad' },
  { value: 'otro', label: 'Otro' },
]

const RESPONSABLE_OPTS = [
  { value: 'contratista', label: 'Contratista' },
  { value: 'cliente', label: 'Cliente' },
]

const CRITICIDAD_OPTS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

export function BloqueSsoma({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [normas, setNormas] = useState<NormaAplicable[]>(datos.normasAplicables ?? [])
  const [docs, setDocs] = useState<DocumentoPrevio[]>(datos.documentosPrevios ?? [])
  const [riesgos, setRiesgos] = useState<RiesgoCritico[]>(datos.riesgosCriticos ?? [])

  useEffect(() => {
    if (prellenarConDatos) {
      if (prellenarConDatos.normasAplicables) setNormas(prellenarConDatos.normasAplicables)
      if (prellenarConDatos.documentosPrevios) setDocs(prellenarConDatos.documentosPrevios)
      if (prellenarConDatos.riesgosCriticos) setRiesgos(prellenarConDatos.riesgosCriticos)
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const normasData = datos.normasAplicables ?? []
  const docsData = datos.documentosPrevios ?? []
  const riesgosData = datos.riesgosCriticos ?? []

  return (
    <>
      <TdrBloqueCard
        numero={6}
        titulo="SSOMA"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="ssoma" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => {
                setNormas(datos.normasAplicables ?? [])
                setDocs(datos.documentosPrevios ?? [])
                setRiesgos(datos.riesgosCriticos ?? [])
                setEditando(true)
              }}>
                <Pencil className="mr-1 h-3 w-3" />Editar
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Normas ({normasData.length})</p>
            {normasData.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin normas</p>
            ) : (
              <ul className="space-y-0.5">
                {normasData.slice(0, 3).map((n, i) => (
                  <li key={i} className="text-sm">• <span className="font-medium">{n.codigo}</span> {n.nombre}</li>
                ))}
                {normasData.length > 3 && <li className="text-xs text-muted-foreground">+{normasData.length - 3} más</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Docs previos ({docsData.length})</p>
            {docsData.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin documentos</p>
            ) : (
              <ul className="space-y-0.5">
                {docsData.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-sm">• {d.nombre}{d.obligatorio ? ' *' : ''}</li>
                ))}
                {docsData.length > 3 && <li className="text-xs text-muted-foreground">+{docsData.length - 3} más</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Riesgos ({riesgosData.length})</p>
            {riesgosData.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin riesgos</p>
            ) : (
              <ul className="space-y-0.5">
                {riesgosData.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-sm">• {r.riesgo}{r.probabilidad ? ` (${r.probabilidad})` : ''}</li>
                ))}
                {riesgosData.length > 3 && <li className="text-xs text-muted-foreground">+{riesgosData.length - 3} más</li>}
              </ul>
            )}
          </div>
        </div>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar SSOMA</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Tabs defaultValue="normas">
              <TabsList>
                <TabsTrigger value="normas">Normas ({normas.length})</TabsTrigger>
                <TabsTrigger value="documentos">Docs. previos ({docs.length})</TabsTrigger>
                <TabsTrigger value="riesgos">Riesgos ({riesgos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="normas" className="pt-3">
                <TdrEditableTable<NormaAplicable>
                  data={normas}
                  columns={[
                    { key: 'codigo', label: 'Código', type: 'text', required: true, width: '140px' },
                    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { key: 'categoria', label: 'Categoría', type: 'select', width: '140px', options: CATEGORIA_NORMA_OPTS },
                  ]}
                  filaVacia={() => ({ codigo: '', nombre: '' })}
                  onSave={async filas => {
                    setNormas(filas)
                    await onGuardar({ normasAplicables: filas, documentosPrevios: docs, riesgosCriticos: riesgos })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>
              <TabsContent value="documentos" className="pt-3">
                <TdrEditableTable<DocumentoPrevio>
                  data={docs}
                  columns={[
                    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { key: 'diasAnticipacion', label: 'Días anticip.', type: 'number', width: '120px' },
                    { key: 'responsable', label: 'Responsable', type: 'select', width: '140px', options: RESPONSABLE_OPTS },
                    { key: 'obligatorio', label: 'Obligatorio', type: 'boolean', width: '100px' },
                  ]}
                  filaVacia={() => ({ nombre: '', obligatorio: false })}
                  onSave={async filas => {
                    setDocs(filas)
                    await onGuardar({ normasAplicables: normas, documentosPrevios: filas, riesgosCriticos: riesgos })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>
              <TabsContent value="riesgos" className="pt-3">
                <TdrEditableTable<RiesgoCritico>
                  data={riesgos}
                  columns={[
                    { key: 'riesgo', label: 'Riesgo', type: 'text', required: true },
                    { key: 'probabilidad', label: 'Probabilidad', type: 'select', width: '130px', options: CRITICIDAD_OPTS },
                    { key: 'impacto', label: 'Impacto', type: 'select', width: '130px', options: CRITICIDAD_OPTS },
                    { key: 'mitigacion', label: 'Mitigación', type: 'text' },
                  ]}
                  filaVacia={() => ({ riesgo: '' })}
                  onSave={async filas => {
                    setRiesgos(filas)
                    await onGuardar({ normasAplicables: normas, documentosPrevios: docs, riesgosCriticos: filas })
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
