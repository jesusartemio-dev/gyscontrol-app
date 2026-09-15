'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { getCotizacionesPaginated } from '@/lib/services/cotizacion'

interface ClienteOption {
  id: string
  nombre: string
  ruc?: string | null
}

export interface CotizacionDestino {
  id: string
  codigo: string
  nombre: string
}

interface ComercialOption {
  id: string
  nombre: string
  email?: string | null
}

interface Props {
  nombreCotizacion: string
  clienteId: string
  comercialId: string
  moneda: string
  notas: string
  codigoManual: string
  fechaManual: string
  destino: CotizacionDestino | null
  clientes: ClienteOption[]
  comerciales: ComercialOption[]
  clienteSugerido: { id: string; nombre: string } | null
  comercialSugerido: { id: string; nombre: string } | null
  onNombreChange: (v: string) => void
  onClienteChange: (v: string) => void
  onComercialChange: (v: string) => void
  onMonedaChange: (v: string) => void
  onNotasChange: (v: string) => void
  onCodigoManualChange: (v: string) => void
  onFechaManualChange: (v: string) => void
  onDestinoChange: (v: CotizacionDestino | null) => void
}

export function ConfigStep({
  nombreCotizacion,
  clienteId,
  comercialId,
  moneda,
  notas,
  codigoManual,
  fechaManual,
  destino,
  clientes,
  comerciales,
  clienteSugerido,
  comercialSugerido,
  onNombreChange,
  onClienteChange,
  onComercialChange,
  onMonedaChange,
  onNotasChange,
  onCodigoManualChange,
  onFechaManualChange,
  onDestinoChange,
}: Props) {
  const [modo, setModo] = useState<'nueva' | 'existente'>(destino ? 'existente' : 'nueva')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<CotizacionDestino[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (modo !== 'existente' || busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await getCotizacionesPaginated({
          search: busqueda.trim(),
          anio: 'todos',
          limit: 10,
        })
        if (cancelado) return
        setResultados(
          res.data.map((c) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre }))
        )
      } catch {
        if (!cancelado) setResultados([])
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 350)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [busqueda, modo])

  const cambiarModo = (nuevo: 'nueva' | 'existente') => {
    setModo(nuevo)
    if (nuevo === 'nueva') onDestinoChange(null)
  }

  return (
    <div className="space-y-4">
      {/* Destino de la importación */}
      <div className="rounded-lg border bg-gray-50 p-3">
        <p className="mb-2 text-xs font-medium text-gray-700">Destino</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={modo === 'nueva'}
              onChange={() => cambiarModo('nueva')}
            />
            Crear cotización nueva
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={modo === 'existente'}
              onChange={() => cambiarModo('existente')}
            />
            Agregar a una existente
          </label>
        </div>
        {modo === 'existente' && (
          <p className="mt-2 text-xs text-gray-500">
            Los equipos, servicios y gastos de este Excel se agregan como grupos
            adicionales a la cotización elegida. Útil cuando varias propuestas
            (POS10, POS20, …) terminaron en una sola orden de compra.
          </p>
        )}
      </div>

      {modo === 'existente' ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Cotización destino <span className="text-red-500">*</span>
          </label>

          {destino ? (
            <div className="flex items-center justify-between rounded-md border bg-blue-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-blue-900">
                  {destino.codigo}
                </p>
                <p className="truncate text-xs text-blue-700">{destino.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => onDestinoChange(null)}
                className="shrink-0 text-xs text-blue-600 hover:text-blue-800"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded-md border py-2 pl-8 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  placeholder="Buscar por código o nombre (ej: GYS-3621-19)"
                />
                {buscando && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {resultados.length > 0 && (
                <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border divide-y">
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onDestinoChange(c)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="block text-sm font-medium text-gray-800">
                          {c.codigo}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {c.nombre}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!buscando && busqueda.trim().length >= 2 && resultados.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">Sin resultados.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Nombre de la cotización <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreCotizacion}
              onChange={(e) => onNombreChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Ej: Sistema SCADA Planta Concentradora"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            {clienteSugerido && !clienteId && (
              <p className="mb-1 text-xs text-blue-600">
                Sugerido: {clienteSugerido.nombre}
              </p>
            )}
            <select
              value={clienteId}
              onChange={(e) => onClienteChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="">— Seleccionar cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.ruc ? `(${c.ruc})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Comercial */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Comercial</label>
            {comercialSugerido && (
              <p className="mb-1 text-xs text-blue-600">
                Detectado en el PDF: {comercialSugerido.nombre}
              </p>
            )}
            <select
              value={comercialId}
              onChange={(e) => onComercialChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="">— Yo (quien importa) —</option>
              {comerciales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Quien vendió la cotización, no quien la está cargando.
            </p>
          </div>

          {/* Moneda */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Moneda</label>
            <select
              value={moneda}
              onChange={(e) => onMonedaChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="USD">USD - Dólares Americanos</option>
              <option value="PEN">PEN - Soles</option>
            </select>
          </div>

          {/* Importación histórica */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-amber-900">
                Cotización histórica <span className="font-normal">(opcional)</span>
              </p>
              <p className="text-xs text-amber-700">
                Si subiste el PDF de la propuesta, se autocompletan con el código y la fecha
                impresos en él. Déjalo vacío para que el sistema asigne el correlativo y la
                fecha de hoy.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Código real
                </label>
                <input
                  type="text"
                  value={codigoManual}
                  onChange={(e) => onCodigoManualChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  placeholder="Ej: GYS-3621-19"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Fecha real
                </label>
                <input
                  type="date"
                  value={fechaManual}
                  onChange={(e) => onFechaManualChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Notas <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => onNotasChange(e.target.value)}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Ej: OC-2019-045 del cliente cubre POS10, POS20 y POS30"
            />
          </div>
        </>
      )}
    </div>
  )
}
