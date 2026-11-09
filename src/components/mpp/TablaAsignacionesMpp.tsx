'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/responsive/breakpoints'
import { EditarMppTextoDialog } from './EditarMppTextoDialog'

interface MppEppCatalogo {
  id: string
  orden: number
  nombre: string
  riesgo: string
  parteCuerpo: string
  durabilidad: string | null
  asignacionesDefault: string[]
  activo: boolean
}

interface MppItem {
  id: string
  mppId: string
  mppEppCatalogoId: string
  orden: number
  asignaciones: Record<string, boolean>
  observaciones: string | null
  mppEppCatalogo: MppEppCatalogo
}

interface Props {
  proyectoId: string
  items: MppItem[]
  puestos: string[]
  disabled?: boolean
  onItemsChange: (items: MppItem[]) => void
}

const PARTES_CUERPO = [
  'Todos',
  'CABEZA',
  'AUDITIVAS',
  'VISUAL',
  'RESPIRATORIA',
  'FACIAL',
  'MANOS',
  'CALZADO',
  'CORPORAL',
  'ANTICAIDA',
  'RODILLA',
  'HOMBROS',
  'ACCESORIO',
]

export function TablaAsignacionesMpp({ proyectoId, items, puestos, disabled, onItemsChange }: Props) {
  const [filtroParte, setFiltroParte] = useState('Todos')
  const [loadingCell, setLoadingCell] = useState<string | null>(null)
  // Celular: tarjetas por EPP con los puestos como chips (la matriz no entraba).
  const esCelular = useIsMobile()
  const [textoAbierto, setTextoAbierto] = useState(false)

  const itemsFiltrados = useMemo(() => {
    if (filtroParte === 'Todos') return items
    return items.filter(item => item.mppEppCatalogo.parteCuerpo === filtroParte)
  }, [items, filtroParte])

  const handleToggle = async (item: MppItem, puesto: string) => {
    if (disabled || loadingCell) return

    const key = `${item.id}-${puesto}`
    const nuevoValor = !item.asignaciones[puesto]
    const nuevasAsignaciones = { ...item.asignaciones, [puesto]: nuevoValor }

    // Optimistic update
    onItemsChange(items.map(it =>
      it.id === item.id ? { ...it, asignaciones: nuevasAsignaciones } : it
    ))

    setLoadingCell(key)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/mpp/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones: nuevasAsignaciones }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
    } catch {
      // Revert
      onItemsChange(items.map(it =>
        it.id === item.id ? { ...it, asignaciones: item.asignaciones } : it
      ))
      toast.error('Error al actualizar asignación')
    } finally {
      setLoadingCell(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros por parte del cuerpo */}
      <div className="flex flex-wrap gap-1.5">
        {PARTES_CUERPO.map(parte => (
          <button
            key={parte}
            onClick={() => setFiltroParte(parte)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full border transition-colors',
              filtroParte === parte
                ? 'bg-cyan-500 text-white border-cyan-500'
                : 'border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-cyan-600'
            )}
          >
            {parte}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {itemsFiltrados.length} EPPs{filtroParte !== 'Todos' ? ` · ${filtroParte}` : ''}
          {' · '}{puestos.length} puestos
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={disabled || itemsFiltrados.length === 0}
          onClick={() => setTextoAbierto(true)}
          title="Los EPP de este filtro como texto, para revisarlos con una IA"
        >
          <Sparkles className="mr-1 h-3.5 w-3.5 text-indigo-500" />
          Texto / IA{filtroParte !== 'Todos' ? `: ${filtroParte}` : ': todos'}
        </Button>
      </div>

      <EditarMppTextoDialog
        open={textoAbierto}
        onOpenChange={setTextoAbierto}
        proyectoId={proyectoId}
        titulo={filtroParte === 'Todos' ? 'Todos los EPP' : filtroParte}
        itemsParte={itemsFiltrados}
        todosLosItems={items}
        puestos={puestos}
        onAplicado={onItemsChange}
      />

      {esCelular ? (
        <div className="space-y-2">
          {itemsFiltrados.map((item) => {
            const epp = item.mppEppCatalogo
            const usan = puestos.filter((p) => item.asignaciones[p]).length
            return (
              <div key={item.id} className="rounded-lg border bg-white p-2.5">
                <div className="mb-1.5 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-900">{epp.nombre}</p>
                  <span className="shrink-0 rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700">{epp.parteCuerpo}</span>
                </div>
                <p className="mb-1.5 text-[10px] text-muted-foreground">
                  {usan} de {puestos.length} puestos{epp.durabilidad ? ` · ${epp.durabilidad}` : ''}
                  {item.observaciones ? ` · ${item.observaciones}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {puestos.map((puesto) => {
                    const checked = Boolean(item.asignaciones[puesto])
                    const isLoading = loadingCell === `${item.id}-${puesto}`
                    return (
                      <button
                        key={puesto}
                        type="button"
                        onClick={() => handleToggle(item, puesto)}
                        disabled={disabled || !!loadingCell}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors',
                          checked ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-300 bg-white text-gray-600',
                          disabled || loadingCell ? 'opacity-60' : '',
                        )}
                      >
                        {isLoading
                          ? <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                          : checked && <Check className="h-3 w-3" />}
                        {puesto}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      /* Tabla */
      <div className="overflow-x-auto border rounded-lg">
        <table className="text-xs border-collapse" style={{ minWidth: 300 + puestos.length * 44 }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 border-b border-r px-3 py-2 text-left font-semibold text-gray-700 w-[220px] min-w-[220px]">
                EPP / Equipo de Protección Personal
              </th>
              <th className="border-b border-r px-2 py-2 text-left font-semibold text-gray-600 w-[80px] min-w-[80px] text-[11px]">
                Parte
              </th>
              {puestos.map(puesto => (
                <th
                  key={puesto}
                  className="border-b border-r"
                  style={{ height: 130, width: 44, minWidth: 44, verticalAlign: 'bottom', padding: 0 }}
                >
                  <div className="flex items-end justify-center pb-2" style={{ height: 130 }}>
                    <span
                      className="text-[10px] font-medium text-gray-600 leading-tight"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        maxHeight: 120,
                        overflow: 'hidden',
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                      title={puesto}
                    >
                      {puesto}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.map((item, rowIdx) => {
              const epp = item.mppEppCatalogo
              const isEven = rowIdx % 2 === 0
              return (
                <tr key={item.id} className={cn('group', isEven ? '' : 'bg-gray-50/40')}>
                  {/* EPP name */}
                  <td
                    className={cn(
                      'sticky left-0 z-10 border-b border-r px-3 py-1.5 font-medium text-gray-800',
                      isEven ? 'bg-white' : 'bg-gray-50'
                    )}
                  >
                    <div className="line-clamp-2 leading-tight text-[11px]" title={epp.nombre}>
                      {epp.nombre}
                    </div>
                    {epp.durabilidad && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">{epp.durabilidad}</div>
                    )}
                    {item.observaciones && (
                      <div className="mt-0.5 line-clamp-2 text-[9px] text-cyan-700" title={item.observaciones}>{item.observaciones}</div>
                    )}
                  </td>
                  {/* Parte del cuerpo */}
                  <td className="border-b border-r px-2 py-1.5">
                    <span className="text-[10px] text-muted-foreground leading-tight">{epp.parteCuerpo}</span>
                  </td>
                  {/* Checkboxes */}
                  {puestos.map(puesto => {
                    const checked = Boolean(item.asignaciones[puesto])
                    const cellKey = `${item.id}-${puesto}`
                    const isLoading = loadingCell === cellKey
                    return (
                      <td
                        key={puesto}
                        className={cn(
                          'border-b border-r text-center py-1',
                          checked ? 'bg-cyan-50/60' : ''
                        )}
                      >
                        <button
                          onClick={() => handleToggle(item, puesto)}
                          disabled={disabled || !!loadingCell}
                          className={cn(
                            'w-6 h-6 rounded border-2 transition-all flex items-center justify-center mx-auto',
                            checked
                              ? 'bg-cyan-500 border-cyan-500 text-white'
                              : 'border-gray-300 hover:border-cyan-400 bg-white',
                            disabled || loadingCell ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          )}
                          title={`${epp.nombre} — ${puesto}`}
                        >
                          {isLoading ? (
                            <span className="h-2.5 w-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                          ) : checked ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
