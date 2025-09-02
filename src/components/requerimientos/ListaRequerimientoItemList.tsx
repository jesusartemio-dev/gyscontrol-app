// ===================================================
// 📁 Archivo: ListaRequerimientoItemList.tsx
// 📌 Ubicación: src/components/requerimientos/
// 🔧 Descripción: Lista de ítems de requerimiento con estado, cantidad y fecha requerida.
// 🧠 Uso: Visualiza y gestiona los ítems incluidos en una ListaRequerimiento.
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { ListaRequerimientoItem } from '@/types'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getListaRequerimientoById } from '@/lib/services/listaRequerimiento'
import { toast } from 'sonner'

interface Props {
  listaId: string
  editable?: boolean
  onUpdated?: () => void
  onAprobar?: (id: string) => void
}

export default function ListaRequerimientoItemList({
  listaId,
  editable = false,
  onUpdated,
  onAprobar
}: Props) {
  const [items, setItems] = useState<ListaRequerimientoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getListaRequerimientoById(listaId)
        if (data) setItems(data.items)
      } catch (err) {
        toast.error('Error al cargar los ítems')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [listaId])

  if (loading) return <p className="text-gray-500 text-sm">Cargando ítems...</p>

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center border p-4 rounded-lg shadow-sm"
        >
          <div>
            <h4 className="font-medium">{item.descripcion}</h4>
            <p className="text-sm text-muted-foreground">
              Código: {item.codigo} • {item.unidad} • Cant: {item.cantidad}
            </p>
            {item.fechaRequerida && (
              <p className="text-sm text-gray-500">
                Requiere: {format(new Date(item.fechaRequerida), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <Badge variant="outline">{item.estado}</Badge>
            <span className="text-sm font-medium">
              Cant: {item.cantidad}
            </span>
            {editable && onUpdated && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => onUpdated()}
                title="Editar"
              >
                <Pencil size={16} />
              </Button>
            )}
            {editable && onAprobar && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onAprobar(item.id)}
                title="Aprobar"
              >
                <Trash2 size={16} className="text-green-600" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
