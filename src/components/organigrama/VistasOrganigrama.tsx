'use client'

import React, { useMemo } from 'react'
import { ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgNodoCompleto } from './OrgChart'

/**
 * Vistas alternativas del organigrama, solo para pantalla. La exportación a PDF,
 * PNG y Word sigue usando `OrgChart` y su layout propio: con 15 nodos el árbol
 * vertical se va muy a lo ancho y las tarjetas quedan ilegibles, pero el
 * documento ya resuelve eso con su propia paginación.
 */

export type ModoVista = 'arbol' | 'horizontal' | 'areas' | 'lista'

interface Props {
  nodos: OrgNodoCompleto[]
  modo: ModoVista
  onNodoClick?: (nodo: OrgNodoCompleto) => void
}

/** Orden y etiqueta de las áreas; `otros` recoge lo que no tiene categoría. */
const AREAS: Array<{ clave: string; titulo: string; color: string }> = [
  { clave: 'direccion', titulo: 'Dirección', color: 'border-slate-300 bg-slate-50' },
  { clave: 'gestion', titulo: 'Gestión', color: 'border-blue-200 bg-blue-50' },
  { clave: 'ingenieria', titulo: 'Ingeniería', color: 'border-violet-200 bg-violet-50' },
  { clave: 'campo', titulo: 'Campo', color: 'border-amber-200 bg-amber-50' },
  { clave: 'seguridad', titulo: 'Seguridad', color: 'border-emerald-200 bg-emerald-50' },
  { clave: 'soporte', titulo: 'Soporte', color: 'border-cyan-200 bg-cyan-50' },
  { clave: 'otros', titulo: 'Otros', color: 'border-gray-200 bg-gray-50' },
]

function hijosDe(nodos: OrgNodoCompleto[], parentId: string | null): OrgNodoCompleto[] {
  return nodos
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.orden - b.orden)
}

function Persona({ nodo, onClick, compacto }: { nodo: OrgNodoCompleto; onClick?: () => void; compacto?: boolean }) {
  const vacante = !nodo.user
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border px-3 py-2 transition-colors',
        vacante
          ? 'border-dashed border-red-300 bg-red-50/40 hover:bg-red-50'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 leading-tight">
        {nodo.cargoLabel}
      </p>
      {vacante ? (
        <p className="text-xs italic text-red-500 mt-0.5">Vacante</p>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900 leading-tight mt-0.5">{nodo.user!.name}</p>
          {!compacto && (
            <p className="text-[11px] text-gray-500 truncate">{nodo.user!.email}</p>
          )}
        </>
      )}
    </button>
  )
}

/** Árbol de izquierda a derecha: aprovecha el alto en vez del ancho. */
function Horizontal({ nodos, onNodoClick }: { nodos: OrgNodoCompleto[]; onNodoClick?: Props['onNodoClick'] }) {
  const render = (parentId: string | null, nivel: number): React.ReactNode => {
    const hijos = hijosDe(nodos, parentId)
    if (hijos.length === 0) return null

    return (
      <ul className={cn('space-y-1.5', nivel > 0 && 'ml-5 border-l border-gray-200 pl-4')}>
        {hijos.map((n) => (
          <li key={n.id}>
            <div className="w-64">
              <Persona nodo={n} onClick={() => onNodoClick?.(n)} compacto />
            </div>
            {render(n.id, nivel + 1)}
          </li>
        ))}
      </ul>
    )
  }

  return <div className="p-6 overflow-auto h-full">{render(null, 0)}</div>
}

/** Agrupado por área: más legible para el cliente que la jerarquía estricta. */
function PorAreas({ nodos, onNodoClick }: { nodos: OrgNodoCompleto[]; onNodoClick?: Props['onNodoClick'] }) {
  const grupos = useMemo(() => {
    const porArea = new Map<string, OrgNodoCompleto[]>()
    for (const n of nodos) {
      const clave = n.puesto?.categoria ?? 'otros'
      porArea.set(clave, [...(porArea.get(clave) ?? []), n])
    }
    return AREAS.map((a) => ({ ...a, nodos: porArea.get(a.clave) ?? [] })).filter((a) => a.nodos.length > 0)
  }, [nodos])

  return (
    <div className="p-6 overflow-auto h-full space-y-5">
      {grupos.map((g) => (
        <section key={g.clave}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">{g.titulo}</h3>
            <span className="text-[11px] text-gray-400">{g.nodos.length}</span>
          </div>
          <div className={cn('grid gap-2 rounded-xl border p-3', g.color,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
            {g.nodos.map((n) => (
              <Persona key={n.id} nodo={n} onClick={() => onNodoClick?.(n)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Lista jerárquica: la más densa, útil para revisar de un vistazo. */
function Lista({ nodos, onNodoClick }: { nodos: OrgNodoCompleto[]; onNodoClick?: Props['onNodoClick'] }) {
  const filas: Array<{ nodo: OrgNodoCompleto; nivel: number }> = []
  const recorrer = (parentId: string | null, nivel: number) => {
    for (const n of hijosDe(nodos, parentId)) {
      filas.push({ nodo: n, nivel })
      recorrer(n.id, nivel + 1)
    }
  }
  recorrer(null, 0)

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="rounded-lg border bg-white divide-y max-w-3xl">
        {filas.map(({ nodo, nivel }) => (
          <button
            key={nodo.id}
            onClick={() => onNodoClick?.(nodo)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            style={{ paddingLeft: `${12 + nivel * 18}px` }}
          >
            {nivel > 0 && <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />}
            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 w-52 shrink-0 truncate">
              {nodo.cargoLabel}
            </span>
            {nodo.user ? (
              <span className="text-sm text-gray-900 truncate">{nodo.user.name}</span>
            ) : (
              <span className="text-xs italic text-red-500 flex items-center gap-1">
                <User className="h-3 w-3" /> Vacante
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VistasOrganigrama({ nodos, modo, onNodoClick }: Props) {
  if (modo === 'horizontal') return <Horizontal nodos={nodos} onNodoClick={onNodoClick} />
  if (modo === 'areas') return <PorAreas nodos={nodos} onNodoClick={onNodoClick} />
  return <Lista nodos={nodos} onNodoClick={onNodoClick} />
}
