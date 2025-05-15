// ===================================================
// 📁 Archivo: CotizacionProveedorList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Lista de cotizaciones enviadas por proveedor
//
// 🧠 Uso: Se usa dentro de la sección logística de un proyecto,
//         permite ver y filtrar cotizaciones realizadas.
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getCotizacionesProveedor } from '@/lib/services/cotizacionProveedor'
import type { CotizacionProveedor } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function CotizacionProveedorList() {
  const { id: proyectoId } = useParams()
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!proyectoId) return
    const fetchData = async () => {
      try {
        const data = await getCotizacionesProveedor(proyectoId as string)
        setCotizaciones(data || [])
      } catch (err) {
        console.error('Error al obtener cotizaciones:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [proyectoId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📩 Cotizaciones por proveedor</h2>
        <Link href={`/logistica/cotizaciones/nueva?proyectoId=${proyectoId}`}>
          <Button className="bg-green-600 text-white">➕ Nueva cotización</Button>
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : cotizaciones.length === 0 ? (
        <p className="text-gray-500 italic">No hay cotizaciones registradas.</p>
      ) : (
        cotizaciones.map((cotizacion) => (
          <Card key={cotizacion.id}>
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="text-sm text-gray-600">
                📦 <strong>{cotizacion.nombre}</strong> — Estado: <em>{cotizacion.estado}</em>
              </div>
              {cotizacion.contacto && (
                <div className="text-xs text-gray-500">📞 {cotizacion.contacto}</div>
              )}
              <Link
                href={`/logistica/cotizaciones/${cotizacion.id}`}
                className="text-blue-600 hover:underline text-sm mt-1"
              >
                Ver detalles
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
