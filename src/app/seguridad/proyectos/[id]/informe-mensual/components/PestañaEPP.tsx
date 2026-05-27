'use client'

import { Badge } from '@/components/ui/badge'
import { TablaExportable } from './TablaExportable'
import type { InformeMensualAgregado, EntregaInforme } from '@/lib/services/informeMensualSeguridad'
import { cn } from '@/lib/utils'

const ESTADO_COLOR: Record<string, string> = {
  vigente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  devuelto: 'bg-blue-100 text-blue-700 border-blue-200',
  baja: 'bg-red-100 text-red-700 border-red-200',
}

const COLUMNS = [
  {
    header: 'Fecha',
    accessor: (e: EntregaInforme) =>
      new Date(e.fechaEntrega).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  },
  {
    header: 'N° entrega',
    accessor: (e: EntregaInforme) => e.numero,
  },
  {
    header: 'Empleado',
    accessor: (e: EntregaInforme) =>
      e.empleado.user.name ?? e.empleado.user.email,
  },
  {
    header: 'Cargo',
    accessor: (e: EntregaInforme) => e.empleado.cargo?.nombre ?? '—',
  },
  {
    header: 'Ítems',
    accessor: (e: EntregaInforme) => e.items.length,
  },
  {
    header: 'Entregado por',
    accessor: (e: EntregaInforme) => e.entregadoPor.name ?? '—',
  },
  {
    header: 'Firma',
    accessor: (e: EntregaInforme) => (e.firmaUrl ? 'Sí' : '—'),
  },
  {
    header: 'Estado',
    accessor: (e: EntregaInforme) => e.estado,
  },
]

export function PestañaEPP({ data }: { data: InformeMensualAgregado }) {
  const { entregasEpp, kpis, proyecto, periodo } = data
  const filename = `${proyecto.codigo}_epp_${periodo.mes}`

  const totalItems = entregasEpp.reduce((s, e) => s + e.items.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{kpis.entregasEppCount}</strong> entregas
        </span>
        <span>
          <strong className="text-foreground">{totalItems}</strong> ítems entregados
        </span>
      </div>

      <TablaExportable
        columns={COLUMNS}
        rows={entregasEpp}
        filename={filename}
        emptyMessage="No hay entregas de EPP registradas para este mes."
      >
        {(entrega) => (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Estado:</span>
              <Badge
                className={cn(
                  'text-[10px] border',
                  ESTADO_COLOR[entrega.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200',
                )}
              >
                {entrega.estado}
              </Badge>
              {entrega.observaciones && (
                <span className="italic">{entrega.observaciones}</span>
              )}
            </div>
            {entrega.items.length > 0 && (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Código</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Subcategoría</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Cantidad</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Talla</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrega.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-mono">{item.catalogoEpp.codigo}</td>
                        <td className="px-3 py-1.5">{item.catalogoEpp.descripcion}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {item.catalogoEpp.subcategoria ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{item.cantidad}</td>
                        <td className="px-3 py-1.5">{item.talla ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </TablaExportable>
    </div>
  )
}
