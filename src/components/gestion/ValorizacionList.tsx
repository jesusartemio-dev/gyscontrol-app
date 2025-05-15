// ===================================================
// 📁 Archivo: ValorizacionList.tsx
// 📌 Ubicación: src/components/gestion/
// 🔧 Descripción: Lista de valorizaciones por proyecto
// 🧠 Uso: Se muestra en la vista de gestión financiera de proyectos
// ===================================================

'use client'

import { Valorizacion } from '@/types'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  data: Valorizacion[]
  onEdit?: (item: Valorizacion) => void
  onDelete?: (id: string) => void
}

export default function ValorizacionList({ data, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-4">
      {data.map((val) => (
        <div
          key={val.id}
          className="flex justify-between items-center border p-4 rounded-xl shadow-sm"
        >
          <div>
            <h4 className="font-semibold">{val.nombre}</h4>
            <p className="text-sm text-muted-foreground">{val.descripcion}</p>
            <p className="text-sm">
              Periodo: {format(new Date(val.periodoInicio), 'dd/MM/yyyy')} –{' '}
              {format(new Date(val.periodoFin), 'dd/MM/yyyy')}
            </p>
            <p className="text-sm text-gray-600">Monto: S/ {val.montoTotal.toFixed(2)}</p>
          </div>
          <div className="flex gap-3 items-center">
            <Badge variant="outline">{val.estado}</Badge>
            {onEdit && (
              <Button size="icon" variant="outline" onClick={() => onEdit(val)}>
                <Pencil size={16} />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(val.id)}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
