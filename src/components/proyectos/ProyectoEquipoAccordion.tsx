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

export default function ProyectoEquipoAccordion({
  equipo,
  modoRevision = false,
  onUpdatedItem
}: Props) {
  const [abierto, setAbierto] = useState(true)

  const presupuestoTotal = equipo.items.reduce((acc, item) => acc + item.costoInterno, 0)
  const costoRealTotal = equipo.items.reduce((acc, item) => acc + item.costoReal, 0)

  return (
    <Card className="border border-gray-200 shadow-sm rounded-xl">
      <CardHeader
        onClick={() => setAbierto(!abierto)}
        className="cursor-pointer px-6 py-3 bg-gray-50 border-b flex flex-col gap-1"
      >
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold text-gray-800">
            {equipo.nombre || 'Grupo sin nombre'}
          </CardTitle>
          <Button size="icon" variant="ghost" className="text-gray-600 hover:text-black">
            {abierto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
        </div>

        <div className="text-sm text-gray-600 flex gap-6 pt-1 flex-wrap">
          <span>
            💸 <strong className="text-gray-700">Presupuesto:</strong>{' '}
            <span className="text-blue-700">${presupuestoTotal.toFixed(2)}</span>
          </span>
          <span>
            📦 <strong className="text-gray-700">Costo Real:</strong>{' '}
            <span className="text-green-700">${costoRealTotal.toFixed(2)}</span>
          </span>
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
