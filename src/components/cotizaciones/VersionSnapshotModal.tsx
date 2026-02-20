'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight, Package, Wrench, Receipt, FileText, Building } from 'lucide-react'
import { formatDisplayCurrency } from '@/lib/utils/currency'

interface VersionSnapshotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionNumber: number
  versionNombre: string
  snapshot: string
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, icon, count, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {icon}
        <span className="font-medium text-sm">{title}</span>
        {count != null && <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export default function VersionSnapshotModal({
  open, onOpenChange, versionNumber, versionNombre, snapshot
}: VersionSnapshotModalProps) {
  let data: any = {}
  try { data = JSON.parse(snapshot) } catch { /* invalid snapshot */ }

  const equipos = data.equipos || []
  const servicios = data.servicios || []
  const gastos = data.gastos || []
  const condiciones = data.condiciones || []
  const exclusiones = data.exclusiones || []

  const totalEquipoItems = equipos.reduce((acc: number, g: any) => acc + (g.items?.length || 0), 0)
  const totalServicioItems = servicios.reduce((acc: number, g: any) => acc + (g.items?.length || 0), 0)
  const totalGastoItems = gastos.reduce((acc: number, g: any) => acc + (g.items?.length || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versión v{versionNumber} — {versionNombre}</DialogTitle>
          <DialogDescription>Snapshot de la cotización al momento de crear esta versión</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <CollapsibleSection title="Resumen" icon={<Building className="h-4 w-4 text-blue-600" />} defaultOpen>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{data.nombre}</span></div>
              <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{data.cliente?.nombre || '—'}</span></div>
              <div><span className="text-muted-foreground">Comercial:</span> <span className="font-medium">{data.comercial?.nombre || '—'}</span></div>
              <div><span className="text-muted-foreground">Moneda:</span> {data.moneda || 'USD'}</div>
              <div><span className="text-muted-foreground">Revisión:</span> {data.revision || '—'}</div>
              <div><span className="text-muted-foreground">Estado:</span> <Badge variant="outline" className="text-xs">{data.estado}</Badge></div>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Equipos</div>
                <div className="font-mono font-medium">{formatDisplayCurrency(data.totalEquiposCliente)}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Servicios</div>
                <div className="font-mono font-medium">{formatDisplayCurrency(data.totalServiciosCliente)}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Gastos</div>
                <div className="font-mono font-medium">{formatDisplayCurrency(data.totalGastosCliente)}</div>
              </div>
              <div className="p-2 bg-primary/10 rounded">
                <div className="text-muted-foreground text-xs">Gran Total</div>
                <div className="font-mono font-bold">{formatDisplayCurrency(data.grandTotal)}</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Equipos */}
          <CollapsibleSection title="Equipos" icon={<Package className="h-4 w-4 text-amber-600" />} count={totalEquipoItems}>
            {equipos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin equipos</p>
            ) : equipos.map((grupo: any, gi: number) => (
              <div key={gi} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{grupo.nombre}</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatDisplayCurrency(grupo.subtotalCliente)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-1 px-2">Código</th>
                        <th className="text-left py-1 px-2">Descripción</th>
                        <th className="text-left py-1 px-2">Marca</th>
                        <th className="text-right py-1 px-2">Cant</th>
                        <th className="text-right py-1 px-2">P.Lista</th>
                        <th className="text-center py-1 px-2">F.C</th>
                        <th className="text-center py-1 px-2">F.V</th>
                        <th className="text-right py-1 px-2">T.Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grupo.items || []).map((item: any, ii: number) => (
                        <tr key={ii} className="border-b">
                          <td className="py-1 px-2 font-mono">{item.codigo}</td>
                          <td className="py-1 px-2 max-w-[200px] truncate">{item.descripcion}</td>
                          <td className="py-1 px-2">{item.marca}</td>
                          <td className="py-1 px-2 text-right">{item.cantidad}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatDisplayCurrency(item.precioLista)}</td>
                          <td className="py-1 px-2 text-center">{(item.factorCosto ?? 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-center">{(item.factorVenta ?? 1.15).toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatDisplayCurrency(item.costoCliente)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* Servicios */}
          <CollapsibleSection title="Servicios" icon={<Wrench className="h-4 w-4 text-blue-600" />} count={totalServicioItems}>
            {servicios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin servicios</p>
            ) : servicios.map((grupo: any, gi: number) => (
              <div key={gi} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{grupo.nombre}</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatDisplayCurrency(grupo.subtotalCliente)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-1 px-2">Nombre</th>
                        <th className="text-left py-1 px-2">Recurso</th>
                        <th className="text-left py-1 px-2">Unidad</th>
                        <th className="text-right py-1 px-2">Cant</th>
                        <th className="text-right py-1 px-2">HH Total</th>
                        <th className="text-center py-1 px-2">F.Seg</th>
                        <th className="text-center py-1 px-2">Margen</th>
                        <th className="text-right py-1 px-2">C.Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grupo.items || []).map((item: any, ii: number) => (
                        <tr key={ii} className="border-b">
                          <td className="py-1 px-2 max-w-[200px] truncate">{item.nombre}</td>
                          <td className="py-1 px-2">{item.recursoNombre}</td>
                          <td className="py-1 px-2">{item.unidadServicioNombre}</td>
                          <td className="py-1 px-2 text-right">{item.cantidad}</td>
                          <td className="py-1 px-2 text-right">{item.horaTotal?.toFixed(1)}</td>
                          <td className="py-1 px-2 text-center">{(item.factorSeguridad ?? 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-center">{(item.margen ?? 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatDisplayCurrency(item.costoCliente)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* Gastos */}
          <CollapsibleSection title="Gastos" icon={<Receipt className="h-4 w-4 text-green-600" />} count={totalGastoItems}>
            {gastos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos</p>
            ) : gastos.map((grupo: any, gi: number) => (
              <div key={gi} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{grupo.nombre}</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatDisplayCurrency(grupo.subtotalCliente)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-1 px-2">Nombre</th>
                        <th className="text-left py-1 px-2">Descripción</th>
                        <th className="text-right py-1 px-2">Cant</th>
                        <th className="text-right py-1 px-2">P.Unit</th>
                        <th className="text-center py-1 px-2">F.Seg</th>
                        <th className="text-center py-1 px-2">Margen</th>
                        <th className="text-right py-1 px-2">C.Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grupo.items || []).map((item: any, ii: number) => (
                        <tr key={ii} className="border-b">
                          <td className="py-1 px-2">{item.nombre}</td>
                          <td className="py-1 px-2 max-w-[200px] truncate">{item.descripcion || '—'}</td>
                          <td className="py-1 px-2 text-right">{item.cantidad}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatDisplayCurrency(item.precioUnitario)}</td>
                          <td className="py-1 px-2 text-center">{(item.factorSeguridad ?? 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-center">{(item.margen ?? 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatDisplayCurrency(item.costoCliente)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* Condiciones & Exclusiones */}
          <CollapsibleSection title="Condiciones y Exclusiones" icon={<FileText className="h-4 w-4 text-purple-600" />} count={condiciones.length + exclusiones.length}>
            {condiciones.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-medium mb-1">Condiciones Comerciales</h5>
                <ul className="text-xs space-y-1">
                  {condiciones.map((c: any, i: number) => (
                    <li key={i} className="flex gap-2">
                      {c.tipo && <Badge variant="outline" className="text-[10px] shrink-0">{c.tipo}</Badge>}
                      <span>{c.descripcion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {exclusiones.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-1">Exclusiones</h5>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {exclusiones.map((e: any, i: number) => (
                    <li key={i}>{e.descripcion}</li>
                  ))}
                </ul>
              </div>
            )}
            {condiciones.length === 0 && exclusiones.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin condiciones ni exclusiones</p>
            )}
          </CollapsibleSection>
        </div>
      </DialogContent>
    </Dialog>
  )
}
