'use client'

import type { BloqueComo } from '@/lib/validators/pets'

interface Props {
  bloques: BloqueComo[]
  nivel?: number
}

export function BloqueComoRenderer({ bloques, nivel = 0 }: Props) {
  const ml = nivel * 16

  return (
    <div className="space-y-1.5">
      {bloques.map((bloque, i) => {
        switch (bloque.tipo) {
          case 'parrafo':
            return (
              <p key={i} className="text-sm text-gray-700 leading-relaxed" style={{ marginLeft: ml }}>
                {bloque.texto}
              </p>
            )

          case 'lista':
            return (
              <div key={i} style={{ marginLeft: ml }}>
                {bloque.titulo && (
                  <p className="text-sm font-medium text-gray-800 mb-1">{bloque.titulo}</p>
                )}
                <ul className="space-y-0.5">
                  {bloque.items.map((item, j) => (
                    <li key={j} className="text-sm text-gray-700 flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )

          case 'subseccion':
            return (
              <div key={i} style={{ marginLeft: ml }}>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1 mb-1">
                  <span className="text-blue-600">▸</span>
                  {bloque.titulo}
                </p>
                <BloqueComoRenderer bloques={bloque.bloques} nivel={nivel + 1} />
              </div>
            )

          case 'tabla':
            return (
              <div key={i} style={{ marginLeft: ml }} className="overflow-x-auto">
                {bloque.titulo && (
                  <p className="text-sm font-medium text-gray-800 mb-1">{bloque.titulo}</p>
                )}
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      {bloque.headers.map((h, j) => (
                        <th key={j} className="border border-gray-200 px-2 py-1 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.filas.map((fila, j) => (
                      <tr key={j} className={j % 2 !== 0 ? 'bg-gray-50' : ''}>
                        {fila.map((cel, k) => (
                          <td key={k} className="border border-gray-200 px-2 py-1">
                            {cel}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          case 'ilustracion':
            return (
              <div
                key={i}
                style={{ marginLeft: ml }}
                className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-center"
              >
                <p className="text-xs text-gray-500">
                  [ Ilustración {bloque.numero}: {bloque.titulo} ]
                </p>
              </div>
            )

          case 'referencia':
            return (
              <div
                key={i}
                style={{ marginLeft: ml }}
                className="rounded bg-blue-50 border border-blue-100 px-3 py-1.5"
              >
                <p className="text-xs text-blue-700">
                  Ver:{' '}
                  <span className="font-mono font-medium">{bloque.codigo}</span>
                  {' — '}
                  {bloque.documento}
                  {bloque.nota && <span className="text-blue-500"> ({bloque.nota})</span>}
                </p>
              </div>
            )

          case 'restriccion':
            return (
              <div
                key={i}
                style={{ marginLeft: ml }}
                className="rounded bg-red-50 border border-red-100 p-2"
              >
                {bloque.titulo && (
                  <p className="text-xs font-semibold text-red-700 mb-1">{bloque.titulo}</p>
                )}
                <ul className="space-y-0.5">
                  {bloque.prohibiciones.map((p, j) => (
                    <li key={j} className="text-xs text-red-700 flex items-start gap-1.5">
                      <span className="flex-shrink-0">✗</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
