/**
 * Cuántos de cuántos, con una barra para leerlo sin contar.
 *
 * Se usa en las tablas de listas (ítems cotizados) y de pedidos (ítems
 * entregados). Antes esas tablas solo mostraban el total de ítems, así que
 * una lista a medio cotizar y una terminada se veían igual: de 92 listas
 * abiertas, 26 están a medio cotizar, y de 97 pedidos, 29 a medio entregar.
 *
 * El color no es decorativo: verde solo cuando está completo, ámbar mientras
 * falta algo y gris cuando no empezó. Es lo que permite barrer la columna de
 * arriba abajo buscando lo que está a medias.
 */
interface Props {
  hechos: number
  total: number
  /** Para el tooltip, ej. "cotizados" o "entregados". */
  concepto: string
  className?: string
}

export function BarraAvance({ hechos, total, concepto, className = '' }: Props) {
  if (total === 0) {
    return <span className={`text-xs text-muted-foreground ${className}`}>—</span>
  }

  const completo = hechos >= total
  const sinEmpezar = hechos === 0
  const porcentaje = Math.round((hechos / total) * 100)

  const colorBarra = completo ? 'bg-green-500' : sinEmpezar ? 'bg-gray-200' : 'bg-amber-500'
  const colorTexto = completo ? 'text-green-700' : sinEmpezar ? 'text-muted-foreground' : 'text-amber-700'

  return (
    <div
      className={`flex items-center justify-end gap-1.5 ${className}`}
      title={`${hechos} de ${total} ${concepto} (${porcentaje}%)`}
    >
      <div className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${colorBarra}`} style={{ width: `${porcentaje}%` }} />
      </div>
      <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${colorTexto}`}>
        {hechos}/{total}
      </span>
    </div>
  )
}
