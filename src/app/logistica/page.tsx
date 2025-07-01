import Link from 'next/link'

export default function LogisticaPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🚚 Panel de Logística</h1>
      <p className="text-gray-700">
        Bienvenido al módulo de logística. Selecciona una sección para gestionar.
      </p>

      <div className="space-y-4">
        <Link
          href="/logistica/cotizaciones"
          className="block p-4 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
        >
          📦 Gestionar Cotizaciones de Proveedores
        </Link>

        {/* Si luego creas /logistica/listas, descomenta esta parte */}
        {/* <Link
          href="/logistica/listas"
          className="block p-4 bg-green-100 rounded-lg hover:bg-green-200 transition"
        >
          📝 Ver Listas Logísticas
        </Link> */}
      </div>
    </div>
  )
}
