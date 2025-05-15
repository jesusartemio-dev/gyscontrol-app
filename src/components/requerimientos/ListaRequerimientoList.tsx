// ===================================================
// 📁 Archivo: ListaRequerimientoList.tsx
// 📌 Ubicación: src/components/requerimientos/
// 🔧 Descripción: Lista de requerimientos agrupados por proyecto.
// 🧠 Uso: Visualiza todas las listas de requerimientos creadas.
// ===================================================

'use client'

import { ListaRequerimiento } from '@/types'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  data: ListaRequerimiento[]
  onSelect?: (lista: ListaRequerimiento) => void
  onDelete?: (id: string) => void
}

export default function ListaRequerimientoList({ data, onSelect, onDelete }: Props) {
  return (
    <div className="grid gap-4">
      {data.map((lista) => (
        <Card key={lista.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{lista.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                {lista.descripcion || 'Sin descripción'}
              </p>
              <p className="text-sm mt-1 text-gray-500">
                Fecha aprobación:{' '}
                {lista.fechaAprobacion
                  ? format(new Date(lista.fechaAprobacion), 'dd/MM/yyyy')
                  : '—'}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline">{lista.estado}</Badge>
              {onSelect && (
                <Button variant="secondary" onClick={() => onSelect(lista)}>
                  Ver Detalle
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" onClick={() => onDelete(lista.id)}>
                  Eliminar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
