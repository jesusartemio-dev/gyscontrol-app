// ===================================================
// 📁 Archivo: ProyectoEquipoSeleccionModal.tsx
// 📌 Descripción: Modal para seleccionar ProyectoEquipoItems no vinculados
// 🧠 Uso: Se usa en ListaEquiposPage para asociar equipos a una lista
// ✍️ Autor: Asistente IA GYS
// 📅 Creado: 2025-05-10
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import type { ProyectoEquipoItem } from '@/types'
import { getProyectoEquipoItemsDisponibles } from '@/lib/services/proyectoEquipoItem'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  proyectoId: string
  open: boolean
  onClose: () => void
  onSelected: (items: ProyectoEquipoItem[]) => void
}

export default function ProyectoEquipoSeleccionModal({ proyectoId, open, onClose, onSelected }: Props) {
  const [items, setItems] = useState<ProyectoEquipoItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const fetch = async () => {
      const data = await getProyectoEquipoItemsDisponibles(proyectoId)
      setItems(data)
      setSelectedIds(new Set())
    }
    fetch()
  }, [open, proyectoId])

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const copy = new Set(prev)
      copy.has(id) ? copy.delete(id) : copy.add(id)
      return copy
    })
  }

  const handleConfirm = () => {
    const seleccionados = items.filter(i => selectedIds.has(i.id))
    onSelected(seleccionados)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>📦 Selecciona Equipos Técnicos para la Lista</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-80 mt-2">
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between border rounded p-2 hover:bg-gray-50"
              >
                <div>
                  <div className="font-semibold">{item.codigo}</div>
                  <div className="text-sm text-gray-500">{item.descripcion}</div>
                </div>
                <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => handleToggle(item.id)} />
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Agregar a la Lista ({selectedIds.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
