'use client'

import { CheckCircle2, Package, Wrench, Receipt, FileText, AlertCircle, BookMarked } from 'lucide-react'
import type { ExcelExtraido } from '@/lib/agente/excelExtractor'

interface Props {
  data: ExcelExtraido
  nombreCotizacion: string
  clienteNombre: string
  moneda: string
  catalogItemCount: number
  totalEquipoItems: number
  recursosMapeados: number
  recursosTotal: number
  edtsMapeados: number
  edtsTotal: number
  condicionesCount: number
  exclusionesCount: number
}

export function ConfirmStep({
  data,
  nombreCotizacion,
  clienteNombre,
  moneda,
  catalogItemCount,
  totalEquipoItems,
  recursosMapeados,
  recursosTotal,
  edtsMapeados,
  edtsTotal,
  condicionesCount,
  exclusionesCount,
}: Props) {
  const equipoCount = data.equipos.reduce((s, g) => s + g.items.length, 0)
  const servicioCount = data.servicios.reduce((s, g) => s + g.actividades.length, 0)
  const gastoCount = data.gastos.reduce((s, g) => s + g.items.length, 0)

  const warnings: string[] = []
  if (recursosTotal > 0 && recursosMapeados < recursosTotal) {
    warnings.push(
      `${recursosTotal - recursosMapeados} recurso(s) sin mapear — sus items de servicio se omitirán`
    )
  }
  if (edtsTotal > 0 && edtsMapeados < edtsTotal) {
    warnings.push(
      `${edtsTotal - edtsMapeados} EDT(s) sin mapear — sus grupos de servicio se omitirán`
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Resumen de importación</h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-500">Nombre:</div>
          <div className="font-medium">{nombreCotizacion}</div>
          <div className="text-gray-500">Cliente:</div>
          <div className="font-medium">{clienteNombre}</div>
          <div className="text-gray-500">Moneda:</div>
          <div className="font-medium">{moneda}</div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Package className="h-3.5 w-3.5 text-blue-500" />
            <span>
              <strong>{equipoCount}</strong> equipos en {data.equipos.length} grupo(s)
            </span>
          </div>
          {catalogItemCount > 0 && (
            <div className="flex items-center gap-2 text-xs ml-5">
              <BookMarked className="h-3 w-3 text-blue-400" />
              <span className="text-blue-600">
                {catalogItemCount}/{totalEquipoItems} se agregarán al catálogo permanente
              </span>
            </div>
          )}
          {catalogItemCount === 0 && totalEquipoItems > 0 && (
            <div className="flex items-center gap-2 text-xs ml-5">
              <BookMarked className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500">
                Ningún equipo se agregará al catálogo (solo en cotización)
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <Wrench className="h-3.5 w-3.5 text-purple-500" />
            <span>
              <strong>{servicioCount}</strong> servicios en {data.servicios.length} grupo(s)
            </span>
            <span className="text-gray-400">
              ({recursosMapeados}/{recursosTotal} recursos, {edtsMapeados}/{edtsTotal} EDTs)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Receipt className="h-3.5 w-3.5 text-amber-500" />
            <span>
              <strong>{gastoCount}</strong> gastos en {data.gastos.length} grupo(s)
            </span>
          </div>
          {(condicionesCount > 0 || exclusionesCount > 0) && (
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-green-500" />
              <span>
                {condicionesCount} condiciones, {exclusionesCount} exclusiones (del PDF)
              </span>
            </div>
          )}
        </div>

        {/* Totales */}
        <div className="border-t pt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-500">Total Interno:</div>
          <div className="font-medium">
            {moneda} {data.resumen.totalInterno.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-gray-500">Total Cliente:</div>
          <div className="font-bold text-green-700">
            {moneda} {data.resumen.totalCliente.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Ready */}
      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Se creará una cotización con código auto-generado (GYS-XXXX-XX).
        Los totales se recalcularán automáticamente.
      </div>
    </div>
  )
}
