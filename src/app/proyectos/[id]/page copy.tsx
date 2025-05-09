'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById, updateProyecto } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoEquipoItem, ProyectoServicioItem, ProyectoGastoItem } from '@/types'
import { toast } from 'sonner'

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof id === 'string') {
      getProyectoById(id)
        .then(setProyecto)
        .catch(() => setError('Error al cargar el proyecto.'))
    }
  }, [id])

  const handleCampoProyecto = async (campo: string, valor: any) => {
    if (!proyecto) return
    try {
      const actualizado = await updateProyecto(proyecto.id, { [campo]: valor })
      setProyecto({ ...proyecto, [campo]: valor })
      toast.success('Proyecto actualizado')
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!proyecto) return <p className="text-gray-600">Cargando proyecto...</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Proyecto: {proyecto.nombre}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600">Código</label>
          <input
            value={proyecto.codigo}
            onChange={(e) => handleCampoProyecto('codigo', e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Estado</label>
          <select
            value={proyecto.estado}
            onChange={(e) => handleCampoProyecto('estado', e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-2">Equipos</h2>
        {proyecto.equipos.map(eq => (
          <div key={eq.id} className="border p-3 rounded mb-3 bg-white">
            <div className="font-semibold">{eq.nombre}</div>
            <div className="text-sm text-gray-500 mb-2">{eq.descripcion}</div>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Código</th>
                  <th className="border px-2 py-1 text-left">Nombre</th>
                  <th className="border px-2 py-1 text-right">Cantidad</th>
                  <th className="border px-2 py-1 text-right">Costo Cliente</th>
                </tr>
              </thead>
              <tbody>
                {eq.items.map((item: ProyectoEquipoItem) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.codigo}</td>
                    <td className="border px-2 py-1">{item.nombre}</td>
                    <td className="border px-2 py-1 text-right">{item.cantidad}</td>
                    <td className="border px-2 py-1 text-right">S/. {item.costoCliente.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Servicios</h2>
        {proyecto.servicios.map(serv => (
          <div key={serv.id} className="border p-3 rounded mb-3 bg-white">
            <div className="font-semibold">{serv.categoria}</div>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Nombre</th>
                  <th className="border px-2 py-1 text-right">Horas</th>
                  <th className="border px-2 py-1 text-right">Costo Cliente</th>
                </tr>
              </thead>
              <tbody>
                {serv.items.map((item: ProyectoServicioItem) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.nombre}</td>
                    <td className="border px-2 py-1 text-right">{item.cantidadHoras}</td>
                    <td className="border px-2 py-1 text-right">S/. {item.costoCliente.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Gastos</h2>
        {proyecto.gastos.map(gas => (
          <div key={gas.id} className="border p-3 rounded mb-3 bg-white">
            <div className="font-semibold">{gas.nombre}</div>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Nombre</th>
                  <th className="border px-2 py-1 text-right">Cantidad</th>
                  <th className="border px-2 py-1 text-right">Costo Cliente</th>
                </tr>
              </thead>
              <tbody>
                {gas.items.map((item: ProyectoGastoItem) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.nombre}</td>
                    <td className="border px-2 py-1 text-right">{item.cantidad}</td>
                    <td className="border px-2 py-1 text-right">S/. {item.costoCliente.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  )
}
