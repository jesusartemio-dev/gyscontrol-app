// ===================================================
// 📁 Archivo: PaqueteCompraList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Muestra todos los paquetes de compra por proyecto.
// 🧠 Uso: Se usa en la sección logística para visualizar las órdenes por paquete
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { getPaquetesCompraByProyecto } from '@/lib/services/paqueteCompra'
import { PaqueteCompra } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface Props {
  proyectoId: string
}

export default function PaqueteCompraList({ proyectoId }: Props) {
  const [data, setData] = useState<PaqueteCompra[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const result = await getPaquetesCompraByProyecto(proyectoId)
      setData(result || [])
      setLoading(false)
    }
    fetchData()
  }, [proyectoId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {data?.map((paquete) => (
        <Link key={paquete.id} href={`/logistica/paquetes/${paquete.id}`}>
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{paquete.nombre}</h2>
                <Badge variant="outline">{paquete.estado}</Badge>
              </div>
              <p className="text-sm text-gray-600">{paquete.descripcion || 'Sin descripción'}</p>
              {paquete.fechaEntregaEstimada && (
                <span className="text-xs text-muted-foreground">
                  Entrega estimada: {format(new Date(paquete.fechaEntregaEstimada), 'dd/MM/yyyy')}
                </span>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
