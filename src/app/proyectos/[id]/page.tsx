'use client'

// ===================================================
// 📁 Archivo: [id]/page.tsx
// 📌 Descripción: Vista principal de un proyecto
// ===================================================

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'
import ProyectoEquipoList from '@/components/proyectos/ProyectoEquipoList'
import ProyectoEquipoItemList from '@/components/proyectos/ProyectoEquipoItemList'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
      <h1 className="text-2xl font-bold">🧱 Equipos Técnicos del Proyecto</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
        <p><strong>Cliente:</strong> {proyecto.cliente?.nombre ?? '—'}</p>
        <p><strong>Comercial:</strong> {proyecto.comercial?.name ?? '—'}</p>
        <p><strong>Gestor:</strong> {proyecto.gestor?.name ?? '—'}</p>
        <p><strong>Código:</strong> {proyecto.codigo}</p>
        <p><strong>Estado:</strong> {proyecto.estado}</p>
        <p><strong>Inicio:</strong> {new Date(proyecto.fechaInicio).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-800 bg-gray-50 p-4 rounded-lg shadow-inner">
        <p><strong>💰 Total Cliente:</strong> S/ {proyecto.totalCliente.toFixed(2)}</p>
        <p><strong>🧩 Equipos:</strong> S/ {proyecto.totalEquiposInterno.toFixed(2)}</p>
        <p><strong>⚙️ Servicios:</strong> S/ {proyecto.totalServiciosInterno.toFixed(2)}</p>
        <p><strong>🧾 Gastos:</strong> S/ {proyecto.totalGastosInterno.toFixed(2)}</p>
        <p><strong>🔻 Descuento:</strong> {proyecto.descuento}%</p>
        <p><strong>📊 Gran Total:</strong> S/ {proyecto.grandTotal.toFixed(2)}</p>
      </div>

      <ProyectoEquipoList
        proyectoId={proyecto.id}
        onCreated={() => toast.success('Grupo creado')}
      />

      <Card>
        <CardContent className="p-4">
          <ProyectoEquipoItemList
            proyectoId={proyecto.id}
            filtroEquipoId={undefined}
            modoRevision={true}
            onUpdated={() => toast.success('Ítem actualizado')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
