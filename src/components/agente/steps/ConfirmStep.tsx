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
  codigoManual: string
  fechaManual: string
  destinoCodigo: string | null
  totalImportable: number
  totalReferencia: number | null
  origenReferencia: 'PDF' | 'Excel' | null
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
  codigoManual,
  fechaManual,
  destinoCodigo,
  totalImportable,
  totalReferencia,
  origenReferencia,
}: Props) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })

  // El Excel de costeo trae hojas de otros alcances; si la suma de lo que se va a
  // importar no cuadra con el documento de referencia, hay grupos de más o de menos.
  const diferencia = totalReferencia !== null ? totalImportable - totalReferencia : 0
  const descuadra = totalReferencia !== null && Math.abs(diferencia) >= 0.5

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

        {destinoCodigo ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-500">Se agrega a:</div>
            <div className="font-medium">{destinoCodigo}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-500">Nombre:</div>
            <div className="font-medium">{nombreCotizacion}</div>
            <div className="text-gray-500">Cliente:</div>
            <div className="font-medium">{clienteNombre}</div>
            <div className="text-gray-500">Moneda:</div>
            <div className="font-medium">{moneda}</div>
            {codigoManual && (
              <>
                <div className="text-gray-500">Código:</div>
                <div className="font-medium">{codigoManual}</div>
              </>
            )}
            {fechaManual && (
              <>
                <div className="text-gray-500">Fecha:</div>
                <div className="font-medium">{fechaManual}</div>
              </>
            )}
          </div>
        )}

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
          {totalReferencia !== null && (
            <>
              <div className="text-gray-500">Según {origenReferencia}:</div>
              <div className="font-medium">{moneda} {fmt(totalReferencia)}</div>
            </>
          )}
          <div className="text-gray-500">Suma de lo que se importa:</div>
          <div className={descuadra ? 'font-bold text-red-700' : 'font-bold text-green-700'}>
            {moneda} {fmt(totalImportable)}
          </div>
        </div>
      </div>

      {descuadra && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div className="text-xs text-red-700">
            <p className="font-semibold">
              Descuadre de {moneda} {fmt(Math.abs(diferencia))} contra el {origenReferencia}
            </p>
            <p className="mt-0.5">
              {diferencia > 0
                ? 'Se van a importar ítems de más. El Excel de costeo suele traer hojas de otros alcances que no forman parte de esta propuesta.'
                : 'Falta monto por importar. Puede haber grupos excluidos, o servicios cuyo EDT o recurso quedó sin mapear.'}{' '}
              Vuelve al paso Preview y ajusta qué grupos entran.
            </p>
          </div>
        </div>
      )}

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
        {destinoCodigo
          ? `Los grupos se agregarán a ${destinoCodigo}. Los totales se recalcularán automáticamente.`
          : codigoManual
            ? `Se creará la cotización con el código ${codigoManual}. Los totales se recalcularán automáticamente.`
            : 'Se creará una cotización con código auto-generado (GYS-XXXX-XX). Los totales se recalcularán automáticamente.'}
      </div>
    </div>
  )
}
