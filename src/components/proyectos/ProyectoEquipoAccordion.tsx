'use client'

import { useState } from 'react'
import type { ProyectoEquipo } from '@/types'
import ProyectoEquipoItemTabla from './ProyectoEquipoItemTabla'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  equipo: ProyectoEquipo
  modoRevision?: boolean
  onUpdatedItem?: () => void
}

export default function ProyectoEquipoAccordion({ equipo, modoRevision = false, onUpdatedItem }: Props) {
  const [abierto, setAbierto] = useState(true)

  const presupuestoTotal = equipo.items.reduce((acc, item) => acc + item.costoInterno, 0)
  const costoRealTotal = equipo.items.reduce((acc, item) => acc + item.costoReal, 0)

  return (
    <Card className="border shadow">
      <CardHeader
        onClick={() => setAbierto(!abierto)}
        className="cursor-pointer flex flex-col gap-1 bg-gray-50 px-4 py-2 border-b"
      >
        <div className="flex justify-between items-center w-full">
          <CardTitle className="text-lg">
            {equipo.nombre || 'Grupo sin nombre'}
          </CardTitle>
          <Button size="icon" variant="ghost">
            {abierto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
        </div>
        <div className="text-sm text-gray-600 flex gap-6 pt-1">
          <span><strong>Presupuesto:</strong> S/. {presupuestoTotal.toFixed(2)}</span>
          <span><strong>Costo Real:</strong> S/. {costoRealTotal.toFixed(2)}</span>
        </div>
      </CardHeader>

      {abierto && (
        <CardContent className="p-4">
          <ProyectoEquipoItemTabla items={equipo.items} onUpdated={onUpdatedItem} />
        </CardContent>
      )}
    </Card>
  )
}
