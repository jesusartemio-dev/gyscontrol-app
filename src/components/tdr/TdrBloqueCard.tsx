import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EstadoBloqueBadge } from './EstadoBloqueBadge'
import type { EstadoBloque } from '@/types/tdr'

interface Props {
  numero: number
  titulo: string
  estado: EstadoBloque
  modoEdicion?: boolean
  children: React.ReactNode
  acciones?: React.ReactNode
}

const bordeSegunEstado: Record<EstadoBloque, string> = {
  completo: 'border-emerald-200',
  parcial: 'border-amber-200',
  vacio: 'border-gray-200',
}

export function TdrBloqueCard({
  numero,
  titulo,
  estado,
  modoEdicion = false,
  children,
  acciones,
}: Props) {
  return (
    <Card
      className={`${bordeSegunEstado[estado]} ${
        modoEdicion ? 'ring-2 ring-primary/20' : ''
      } transition`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
            {numero}
          </span>
          <h3 className="text-base font-semibold">{titulo}</h3>
          <EstadoBloqueBadge estado={estado} />
        </div>
        {acciones && <div className="flex items-center gap-2">{acciones}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
