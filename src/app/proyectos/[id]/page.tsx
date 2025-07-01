'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import ProyectoEquipoAccordion from '@/components/proyectos/ProyectoEquipoAccordion'

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getProyectoById(id as string)
      .then((data) => {
        if (!data) {
          toast.error('No se encontró el proyecto')
          return
        }
        setProyecto(data)
      })
      .catch(() => toast.error('Error al obtener el proyecto'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />
  if (!proyecto) return <p className="text-gray-500">No se encontró el proyecto</p>

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">{proyecto.nombre}</h1>
      <p className="text-gray-600 text-sm">🧱 Equipos Técnicos del Proyecto</p>

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        {/* Datos generales */}
        <div className="text-sm text-gray-700 space-y-1">
          <p><span className="font-semibold">Cliente:</span> {proyecto.cliente?.nombre ?? '—'}</p>
          <p><span className="font-semibold">Comercial:</span> {proyecto.comercial?.name ?? '—'}</p>
          <p><span className="font-semibold">Gestor:</span> {proyecto.gestor?.name ?? '—'}</p>
          <p><span className="font-semibold">Código:</span> {proyecto.codigo}</p>
          <p><span className="font-semibold">Estado:</span> {proyecto.estado}</p>
          <p><span className="font-semibold">Inicio:</span> {new Date(proyecto.fechaInicio).toLocaleDateString()}</p>
        </div>

        {/* Resumen de costos */}
        <Card className="w-full max-w-md bg-white border rounded-xl shadow-sm text-sm">
          <CardContent className="p-4 space-y-3 text-gray-800">

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🧩 <strong>Equipos:</strong>
              </span>
              <span className="text-gray-700">${proyecto.totalEquiposInterno.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                ⚙️ <strong>Servicios:</strong>
              </span>
              <span className="text-gray-700">${proyecto.totalServiciosInterno.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🧾 <strong>Gastos:</strong>
              </span>
              <span className="text-gray-700">${proyecto.totalGastosInterno.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                💰 <strong>Total Cliente:</strong>
              </span>
              <span className="font-medium text-gray-900">${proyecto.totalCliente.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🔻 <strong>Descuento:</strong>
              </span>
              <span>{proyecto.descuento}%</span>
            </div>

            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span className="flex items-center gap-2">
                📊 <strong>Gran Total:</strong>
              </span>
              <span className="text-green-700">${proyecto.grandTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipos */}
      <div className="space-y-4">
        {proyecto.equipos.map((equipo) => (
          <ProyectoEquipoAccordion
            key={equipo.id}
            equipo={equipo}
            modoRevision={true}
            onUpdatedItem={() => toast.success('Ítem actualizado')}
          />
        ))}
      </div>
    </div>
  )
}
