// ===================================================
// 📁 Archivo: RegistroHorasList.tsx
// 📌 Ubicación: src/components/gestion/
// 🔧 Descripción: Lista de registros de horas por proyecto
// 🧠 Uso: Vista para el área de gestión técnica y supervisión
// ===================================================

'use client'

import { RegistroHoras } from '@/types'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  data: RegistroHoras[]
  onEdit?: (item: RegistroHoras) => void
  onDelete?: (id: string) => void
}

export default function RegistroHorasList({ data, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-4">
      {data.map((registro) => (
        <div
          key={registro.id}
          className="flex justify-between items-center border p-4 rounded-xl shadow-sm"
        >
          <div className="space-y-1">
            <h4 className="font-semibold">
              {registro.nombreServicio} - {registro.recursoNombre}
            </h4>
            <p className="text-sm">
              Categoría: <span className="font-medium">{registro.categoria}</span>
            </p>
            <p className="text-sm">
              Fecha: {format(new Date(registro.fechaTrabajo), 'dd/MM/yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              Horas trabajadas: {registro.horasTrabajadas.toFixed(2)}
            </p>
            {registro.descripcion && (
              <p className="text-sm italic">"{registro.descripcion}"</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={registro.aprobado ? 'default' : 'outline'}>
              {registro.aprobado ? 'Aprobado' : 'Pendiente'}
            </Badge>
            {onEdit && (
              <Button size="icon" variant="outline" onClick={() => onEdit(registro)}>
                <Pencil size={16} />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(registro.id)}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
