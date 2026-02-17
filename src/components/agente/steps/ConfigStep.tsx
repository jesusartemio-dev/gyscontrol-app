'use client'

interface ClienteOption {
  id: string
  nombre: string
  ruc?: string | null
}

interface Props {
  nombreCotizacion: string
  clienteId: string
  moneda: string
  notas: string
  clientes: ClienteOption[]
  clienteSugerido: { id: string; nombre: string } | null
  onNombreChange: (v: string) => void
  onClienteChange: (v: string) => void
  onMonedaChange: (v: string) => void
  onNotasChange: (v: string) => void
}

export function ConfigStep({
  nombreCotizacion,
  clienteId,
  moneda,
  notas,
  clientes,
  clienteSugerido,
  onNombreChange,
  onClienteChange,
  onMonedaChange,
  onNotasChange,
}: Props) {
  return (
    <div className="space-y-4">
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
          placeholder="Notas adicionales para esta cotización importada..."
        />
      </div>
    </div>
  )
}
