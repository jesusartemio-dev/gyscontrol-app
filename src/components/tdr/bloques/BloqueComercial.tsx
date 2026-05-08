'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { EstadoBloque, PresupuestoEstimado, Penalidad, Garantias } from '@/types/tdr'

export interface BloqueComercialDatos {
  presupuestoEstimado?: PresupuestoEstimado | null
  penalidades?: Penalidad[]
  garantias?: Garantias | null
}

interface Props {
  datos: BloqueComercialDatos
  estado: EstadoBloque
  onGuardar: (datos: BloqueComercialDatos) => Promise<void>
  onExtraerConIA?: () => Promise<void>
  readOnly?: boolean
  prellenarConDatos?: Partial<BloqueComercialDatos> | null
  onCerrarPrellenado?: () => void
}

const TIPO_PENALIDAD_OPTS = [
  { value: 'porcentaje-diario', label: '% diario' },
  { value: 'monto-fijo', label: 'Monto fijo' },
  { value: 'porcentaje-total', label: '% total' },
]

function formatUsd(v?: number | null) {
  if (v == null) return '—'
  return `$${v.toLocaleString()}`
}

export function BloqueComercial({
  datos,
  estado,
  onGuardar,
  onExtraerConIA,
  readOnly = false,
  prellenarConDatos,
  onCerrarPrellenado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [presupuesto, setPresupuesto] = useState<PresupuestoEstimado>(datos.presupuestoEstimado ?? {})
  const [penalidades, setPenalidades] = useState<Penalidad[]>(datos.penalidades ?? [])
  const [garantias, setGarantias] = useState<Garantias>(datos.garantias ?? {})

  useEffect(() => {
    if (prellenarConDatos) {
      if (prellenarConDatos.presupuestoEstimado !== undefined) setPresupuesto(prellenarConDatos.presupuestoEstimado ?? {})
      if (prellenarConDatos.penalidades) setPenalidades(prellenarConDatos.penalidades)
      if (prellenarConDatos.garantias !== undefined) setGarantias(prellenarConDatos.garantias ?? {})
      setEditando(true)
    }
  }, [prellenarConDatos])

  const handleClose = () => {
    setEditando(false)
    onCerrarPrellenado?.()
  }

  const pres = datos.presupuestoEstimado
  const pens = datos.penalidades ?? []
  const gars = datos.garantias

  return (
    <>
      <TdrBloqueCard
        numero={7}
        titulo="Comercial"
        estado={estado}
        acciones={
          !readOnly ? (
            <>
              <BloqueAccionesIA bloque="comercial" disabled={!onExtraerConIA} onExtraerConIA={onExtraerConIA} />
              <Button variant="ghost" size="sm" onClick={() => {
                setPresupuesto(datos.presupuestoEstimado ?? {})
                setPenalidades(datos.penalidades ?? [])
                setGarantias(datos.garantias ?? {})
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
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Presupuesto estimado</p>
            {!pres ? (
              <p className="text-sm italic text-muted-foreground">Sin datos</p>
            ) : (
              <ul className="space-y-0.5 text-sm">
                {pres.equipos != null && <li>Equipos: {formatUsd(pres.equipos)}</li>}
                {pres.servicios != null && <li>Servicios: {formatUsd(pres.servicios)}</li>}
                {pres.gastos != null && <li>Gastos: {formatUsd(pres.gastos)}</li>}
                {pres.total != null && <li className="font-medium">Total: {formatUsd(pres.total)}</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Penalidades ({pens.length})</p>
            {pens.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin penalidades</p>
            ) : (
              <ul className="space-y-0.5">
                {pens.slice(0, 3).map((p, i) => (
                  <li key={i} className="text-sm">• {p.causa}</li>
                ))}
                {pens.length > 3 && <li className="text-xs text-muted-foreground">+{pens.length - 3} más</li>}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Garantías</p>
            {!gars ? (
              <p className="text-sm italic text-muted-foreground">Sin garantías</p>
            ) : (
              <ul className="space-y-0.5 text-sm">
                {gars.fielCumplimiento && <li>Fiel cumpl.: {gars.fielCumplimiento.porcentaje}%</li>}
                {gars.adelanto && <li>Adelanto: {gars.adelanto.porcentaje}%</li>}
                {gars.responsabilidadCivil && <li>Resp. civil: {formatUsd(gars.responsabilidadCivil.monto)}</li>}
                {gars.servicio && <li>Servicio: {gars.servicio.duracionMeses} meses</li>}
                {!gars.fielCumplimiento && !gars.adelanto && !gars.responsabilidadCivil && !gars.servicio && (
                  <li className="italic text-muted-foreground">Sin datos</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </TdrBloqueCard>

      <Sheet open={editando} onOpenChange={open => (open ? setEditando(true) : handleClose())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Editar datos comerciales</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Tabs defaultValue="presupuesto">
              <TabsList>
                <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
                <TabsTrigger value="penalidades">Penalidades ({penalidades.length})</TabsTrigger>
                <TabsTrigger value="garantias">Garantías</TabsTrigger>
              </TabsList>

              <TabsContent value="presupuesto" className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <CampoNumerico
                    label="Equipos (USD)"
                    value={presupuesto.equipos}
                    onChange={v => setPresupuesto(p => ({ ...p, equipos: v }))}
                  />
                  <CampoNumerico
                    label="Servicios (USD)"
                    value={presupuesto.servicios}
                    onChange={v => setPresupuesto(p => ({ ...p, servicios: v }))}
                  />
                  <CampoNumerico
                    label="Gastos generales (USD)"
                    value={presupuesto.gastos}
                    onChange={v => setPresupuesto(p => ({ ...p, gastos: v }))}
                  />
                  <CampoNumerico
                    label="Total estimado (USD)"
                    value={presupuesto.total}
                    onChange={v => setPresupuesto(p => ({ ...p, total: v }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
                  <Button onClick={async () => {
                    await onGuardar({ presupuestoEstimado: presupuesto, penalidades, garantias })
                    handleClose()
                  }}>
                    Guardar presupuesto
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="penalidades" className="pt-3">
                <TdrEditableTable<Penalidad>
                  data={penalidades}
                  columns={[
                    { key: 'causa', label: 'Causa', type: 'text', required: true },
                    { key: 'tipo', label: 'Tipo', type: 'select', required: true, width: '150px', options: TIPO_PENALIDAD_OPTS },
                    { key: 'valor', label: 'Valor', type: 'number', required: true, width: '100px' },
                    { key: 'topeMaximo', label: 'Tope máx.', type: 'number', width: '120px' },
                  ]}
                  filaVacia={() => ({ causa: '', tipo: 'porcentaje-diario', valor: 0 })}
                  onSave={async filas => {
                    setPenalidades(filas)
                    await onGuardar({ presupuestoEstimado: presupuesto, penalidades: filas, garantias })
                    handleClose()
                  }}
                  onCancel={handleClose}
                />
              </TabsContent>

              <TabsContent value="garantias" className="pt-3 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Fiel cumplimiento</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CampoNumerico
                      label="Porcentaje (%)"
                      value={garantias.fielCumplimiento?.porcentaje}
                      onChange={v => setGarantias(g => ({
                        ...g,
                        fielCumplimiento: v != null ? { porcentaje: v, vigencia: g.fielCumplimiento?.vigencia ?? '' } : undefined,
                      }))}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Vigencia</label>
                      <Input
                        placeholder="Ej: 12 meses"
                        value={garantias.fielCumplimiento?.vigencia ?? ''}
                        onChange={e => setGarantias(g => ({
                          ...g,
                          fielCumplimiento: { porcentaje: g.fielCumplimiento?.porcentaje ?? 0, vigencia: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Adelanto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CampoNumerico
                      label="Porcentaje (%)"
                      value={garantias.adelanto?.porcentaje}
                      onChange={v => setGarantias(g => ({
                        ...g,
                        adelanto: v != null ? { porcentaje: v, vigencia: g.adelanto?.vigencia ?? '' } : undefined,
                      }))}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Vigencia</label>
                      <Input
                        placeholder="Ej: hasta liquidación"
                        value={garantias.adelanto?.vigencia ?? ''}
                        onChange={e => setGarantias(g => ({
                          ...g,
                          adelanto: { porcentaje: g.adelanto?.porcentaje ?? 0, vigencia: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Responsabilidad civil</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CampoNumerico
                      label="Monto"
                      value={garantias.responsabilidadCivil?.monto}
                      onChange={v => setGarantias(g => ({
                        ...g,
                        responsabilidadCivil: v != null ? { monto: v, moneda: g.responsabilidadCivil?.moneda ?? 'USD' } : undefined,
                      }))}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Moneda</label>
                      <Input
                        placeholder="USD"
                        value={garantias.responsabilidadCivil?.moneda ?? ''}
                        onChange={e => setGarantias(g => ({
                          ...g,
                          responsabilidadCivil: { monto: g.responsabilidadCivil?.monto ?? 0, moneda: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Garantía de servicio</p>
                  <CampoNumerico
                    label="Duración (meses)"
                    value={garantias.servicio?.duracionMeses}
                    onChange={v => setGarantias(g => ({
                      ...g,
                      servicio: v != null ? { duracionMeses: v } : undefined,
                    }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
                  <Button onClick={async () => {
                    await onGuardar({ presupuestoEstimado: presupuesto, penalidades, garantias })
                    handleClose()
                  }}>
                    Guardar garantías
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function CampoNumerico({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number | null
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  )
}
