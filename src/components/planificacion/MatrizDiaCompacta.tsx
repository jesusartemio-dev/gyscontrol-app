'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Componente de matriz persona × día compacta, con franja vertical de
// departamento y filas coloreadas por área. Unifica el lenguaje visual de
// Planificación con las vistas matriciales de Asistencia (Resumen, Horas por
// día) y Ejecutado. El contenido de cada celda lo decide el consumidor vía
// render-props, porque cada vista muestra datos distintos.

export const DEPT_STYLES = [
  { stripe: '#3b82f6', rowEven: 'bg-blue-50/20', rowOdd: 'bg-blue-50/50' },
  { stripe: '#10b981', rowEven: 'bg-emerald-50/20', rowOdd: 'bg-emerald-50/50' },
  { stripe: '#f59e0b', rowEven: 'bg-amber-50/20', rowOdd: 'bg-amber-50/50' },
  { stripe: '#8b5cf6', rowEven: 'bg-violet-50/20', rowOdd: 'bg-violet-50/50' },
  { stripe: '#ef4444', rowEven: 'bg-rose-50/20', rowOdd: 'bg-rose-50/50' },
]

// Etiqueta de departamento vertical rotada (franja de 12px), reutilizable por
// vistas que no son matriz de días (p. ej. agregación Por Proyecto).
export function FranjaDepartamento({ nombre, color }: { nombre: string; color: string }) {
  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex items-center justify-center overflow-hidden pointer-events-none z-10 rounded-l-lg"
      style={{ width: 12, backgroundColor: color, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
    >
      <span className="text-[7px] font-bold uppercase tracking-widest text-white select-none whitespace-nowrap px-0.5">
        {nombre}
      </span>
    </div>
  )
}

const DIAS_LABEL = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

export interface CeldaCtx {
  isWeekend: boolean
  isSaturday: boolean
  isSunday: boolean
  isHoy: boolean
}

export interface GrupoMatriz<P> {
  dept: string
  personas: P[]
}

interface Props<P> {
  dias: string[]
  grupos: GrupoMatriz<P>[]
  getKey: (p: P) => string
  renderNombre: (p: P) => ReactNode
  renderCelda: (p: P, dStr: string, ctx: CeldaCtx) => ReactNode
  renderTotal?: (p: P) => ReactNode
  totalHeader?: string
  nameColWidthPx?: number
  colWidthPx?: number
  rowMinHeightClass?: string
  /** Sub-cabecera de semanas (solo cuando los días vienen alineados a lunes). */
  weekSubHeader?: { semanaInicio: string; numSemanas: number }
  /** YYYY-MM-DD del día a resaltar. Por defecto, hoy en UTC. */
  hoyKey?: string
}

function diaInfo(dateStr: string, hoyKey: string): CeldaCtx & { label1: string; label2: string } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  return {
    label1: DIAS_LABEL[dow],
    label2: String(d.getUTCDate()).padStart(2, '0'),
    isWeekend: dow === 0 || dow === 6,
    isSaturday: dow === 6,
    isSunday: dow === 0,
    isHoy: dateStr === hoyKey,
  }
}

export function MatrizDiaCompacta<P>({
  dias,
  grupos,
  getKey,
  renderNombre,
  renderCelda,
  renderTotal,
  totalHeader,
  nameColWidthPx = 200,
  colWidthPx = 56,
  rowMinHeightClass = 'min-h-[30px]',
  weekSubHeader,
  hoyKey,
}: Props<P>) {
  const hk = hoyKey ?? new Date().toISOString().slice(0, 10)
  const conTotal = !!totalHeader
  const gridCols = `12px ${nameColWidthPx}px repeat(${dias.length}, minmax(${colWidthPx}px, 1fr))${conTotal ? ' 64px' : ''}`
  const minWidth = 12 + nameColWidthPx + dias.length * colWidthPx + (conTotal ? 64 : 0)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${minWidth}px` }}>
        {/* Sub-cabecera de semanas (solo multi-semana alineado a lunes) */}
        {weekSubHeader && weekSubHeader.numSemanas > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-[10px] font-semibold text-muted-foreground border-b bg-muted/20">
            <div />
            <div />
            {Array.from({ length: weekSubHeader.numSemanas }, (_, wi) => {
              const monday = new Date(weekSubHeader.semanaInicio + 'T00:00:00.000Z')
              monday.setUTCDate(monday.getUTCDate() + wi * 7)
              const sunday = new Date(monday.getTime() + 6 * 86400000)
              const label = `${monday.getUTCDate()} – ${sunday.getUTCDate()} ${sunday.toLocaleDateString('es', { month: 'short', timeZone: 'UTC' })}`
              return (
                <div key={wi} className="col-span-7 text-center py-0.5 border-r last:border-r-0 leading-tight">
                  {label}
                </div>
              )
            })}
            {conTotal && <div />}
          </div>
        )}

        {/* Cabecera de días */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-xs font-medium text-muted-foreground border-b mb-0.5 pb-1">
          <div />
          <div className="px-3">Persona</div>
          {dias.map((dStr) => {
            const di = diaInfo(dStr, hk)
            return (
              <div
                key={dStr}
                className={cn(
                  'text-center px-0.5 rounded truncate font-semibold leading-tight',
                  di.isSaturday && 'text-orange-500 bg-orange-50/60',
                  di.isSunday && 'text-red-500 bg-red-50/60',
                  di.isHoy && 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500',
                )}
              >
                <div>{di.label1}</div>
                <div className="font-mono">{di.label2}</div>
              </div>
            )
          })}
          {conTotal && <div className="text-center">{totalHeader}</div>}
        </div>

        {/* Grupos por departamento */}
        {grupos.map((grupo, gi) => {
          const ds = DEPT_STYLES[gi % DEPT_STYLES.length]
          return (
            <div key={grupo.dept} className="relative">
              {/* Etiqueta vertical de departamento (rotada) */}
              <div
                className="absolute left-0 top-0 bottom-0 flex items-center justify-center overflow-hidden pointer-events-none z-10"
                style={{ width: 12, backgroundColor: ds.stripe, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                <span className="text-[7px] font-bold uppercase tracking-widest text-white select-none whitespace-nowrap px-0.5">
                  {grupo.dept}
                </span>
              </div>

              {grupo.personas.map((p, pi) => (
                <div
                  key={getKey(p)}
                  style={{ display: 'grid', gridTemplateColumns: gridCols }}
                  className={cn(
                    rowMinHeightClass,
                    'border-b items-stretch hover:brightness-95',
                    pi % 2 === 0 ? ds.rowEven : ds.rowOdd,
                  )}
                >
                  {/* Franja de color del departamento */}
                  <div className="self-stretch" style={{ backgroundColor: ds.stripe, opacity: 0.15 }} />

                  {/* Nombre */}
                  <div className="flex items-center px-2 overflow-hidden">{renderNombre(p)}</div>

                  {/* Celdas por día */}
                  {dias.map((dStr) => {
                    const di = diaInfo(dStr, hk)
                    return (
                      <div
                        key={dStr}
                        className={cn(
                          'relative flex items-center justify-center px-0.5 py-0.5',
                          di.isSaturday && 'bg-orange-100/30',
                          di.isSunday && 'bg-red-100/30',
                          di.isHoy && 'border-l-2 border-blue-500',
                        )}
                      >
                        {renderCelda(p, dStr, di)}
                      </div>
                    )
                  })}

                  {/* Total */}
                  {conTotal && (
                    <div className="flex flex-col items-center justify-center leading-none">
                      {renderTotal?.(p)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
