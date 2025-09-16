'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import { Cotizacion } from '@/types'
import { toast } from 'sonner'

interface Props {
  cotizacion: Cotizacion
}

export default function CrearProyectoDesdeCotizacionForm({ cotizacion }: Props) {
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [creando, setCreando] = useState(false)
  const router = useRouter()

  const puedeCrear = nombre.trim() !== '' && codigo.trim() !== ''

  const handleCrear = async () => {
    if (!puedeCrear) return
    setCreando(true)

    try {
      const proyecto = await crearProyectoDesdeCotizacion(cotizacion.id, {
        clienteId: cotizacion.cliente?.id ?? '',
        comercialId: cotizacion.comercial?.id ?? '',
        gestorId: cotizacion.comercial?.id ?? '',
        cotizacionId: cotizacion.id,
        nombre,
        codigo,
        estado: 'en_planificacion',
        fechaInicio: new Date().toISOString(),
        totalEquiposInterno: cotizacion.totalEquiposInterno,
        totalServiciosInterno: cotizacion.totalServiciosInterno,
        totalGastosInterno: cotizacion.totalGastosInterno,
        totalInterno: cotizacion.totalInterno,
        totalCliente: cotizacion.totalCliente,
        descuento: cotizacion.descuento,
        grandTotal: cotizacion.grandTotal,
      })

      toast.success('Proyecto creado correctamente')
      router.push(`/proyectos/${proyecto.id}`)
    } catch (err) {
      console.error('Error al crear proyecto:', err)
      toast.error('Error al crear el proyecto')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <h2 className="font-semibold text-lg">📝 Crear Proyecto</h2>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Nombre del proyecto"
          className="border px-3 py-2 rounded w-1/2"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="text"
          placeholder="Código del proyecto"
          className="border px-3 py-2 rounded w-1/2"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </div>

      <button
        onClick={handleCrear}
        disabled={!puedeCrear || creando}
        className={`px-4 py-2 rounded text-sm text-white ${
          puedeCrear && !creando
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {creando ? 'Creando proyecto...' : 'Crear Proyecto'}
      </button>
    </div>
  )
}
