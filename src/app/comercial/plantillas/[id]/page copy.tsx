'use client'

// ===================================================
// 📁 Archivo: [id]/page.tsx
// 📌 Vista de detalle de una plantilla con edición y creación de cotización
// ✍️ Autor: Asistente IA GYS
// ===================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getPlantillaById,
  updatePlantillaTotales
} from '@/lib/services/plantilla'
import { createCotizacionFromPlantilla } from '@/lib/services/cotizacion'
import { deletePlantillaServicio } from '@/lib/services/plantillaServicio'
import { deletePlantillaEquipo } from '@/lib/services/plantillaEquipo'
import { deletePlantillaGasto } from '@/lib/services/plantillaGasto'
import { deletePlantillaGastoItem } from '@/lib/services/plantillaGastoItem'
import PlantillaEquipoForm from '@/components/plantillas/PlantillaEquipoForm'
import PlantillaServicioForm from '@/components/plantillas/PlantillaServicioForm'
import PlantillaGastoForm from '@/components/plantillas/PlantillaGastoForm'
import PlantillaEquipoAccordion from '@/components/plantillas/PlantillaEquipoAccordion'
import PlantillaServicioAccordion from '@/components/plantillas/PlantillaServicioAccordion'
import PlantillaGastoAccordion from '@/components/plantillas/PlantillaGastoAccordion'
import ResumenTotalesPlantilla from '@/components/plantillas/ResumenTotalesPlantilla'
import PlantillaEquipoList from '@/components/plantillas/equipos/PlantillaEquipoList' // 👈 nuevo import

import ClienteSelector from '@/components/cotizaciones/ClienteSelector'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import type {
  Plantilla,
  PlantillaEquipoItem,
  PlantillaServicioItem,
  PlantillaGastoItem
} from '@/types'

export default function PlantillaDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState({ equipo: false, servicio: false, gasto: false })
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string | undefined>()

  useEffect(() => {
    if (typeof id === 'string') {
      getPlantillaById(id)
        .then(setPlantilla)
        .catch(() => setError('❌ Error al cargar la plantilla.'))
    }
  }, [id])

  const actualizarTotalesParciales = (equipos: any[], servicios: any[], gastos: any[]) => {
    const subtotalesEquipos = calcularTotal({ equipos, servicios: [], gastos: [] })
    const subtotalesServicios = calcularTotal({ equipos: [], servicios, gastos: [] })
    const subtotalesGastos = calcularTotal({ equipos: [], servicios: [], gastos })

    const totalInterno = subtotalesEquipos.totalInterno + subtotalesServicios.totalInterno + subtotalesGastos.totalInterno
    const totalCliente = subtotalesEquipos.totalCliente + subtotalesServicios.totalCliente + subtotalesGastos.totalCliente

    return {
      totalEquiposInterno: subtotalesEquipos.totalInterno,
      totalEquiposCliente: subtotalesEquipos.totalCliente,
      totalServiciosInterno: subtotalesServicios.totalInterno,
      totalServiciosCliente: subtotalesServicios.totalCliente,
      totalGastosInterno: subtotalesGastos.totalInterno,
      totalGastosCliente: subtotalesGastos.totalCliente,
      totalInterno,
      totalCliente,
      descuento: plantilla?.descuento ?? 0,
      grandTotal: totalCliente - (plantilla?.descuento ?? 0),
    }
  }

  const actualizarEquipo = (equipoId: string, callback: (items: PlantillaEquipoItem[]) => PlantillaEquipoItem[]) => {
    if (!plantilla) return
    const equiposActualizados = plantilla.equipos.map(e =>
      e.id === equipoId ? { ...e, items: callback(e.items), ...calcularSubtotal(callback(e.items)) } : e
    )
    const nuevosTotales = actualizarTotalesParciales(equiposActualizados, plantilla.servicios, plantilla.gastos)
    setPlantilla({ ...plantilla, equipos: equiposActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const actualizarServicio = (servicioId: string, callback: (items: PlantillaServicioItem[]) => PlantillaServicioItem[]) => {
    if (!plantilla) return
    const serviciosActualizados = plantilla.servicios.map(s =>
      s.id === servicioId ? { ...s, items: callback(s.items), ...calcularSubtotal(callback(s.items)) } : s
    )
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, serviciosActualizados, plantilla.gastos)
    setPlantilla({ ...plantilla, servicios: serviciosActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const actualizarGasto = (gastoId: string, callback: (items: PlantillaGastoItem[]) => PlantillaGastoItem[]) => {
    if (!plantilla) return
    const gastosActualizados = plantilla.gastos.map(g =>
      g.id === gastoId ? { ...g, items: callback(g.items), ...calcularSubtotal(callback(g.items)) } : g
    )
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, plantilla.servicios, gastosActualizados)
    setPlantilla({ ...plantilla, gastos: gastosActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleCrearCotizacion = async () => {
    if (!plantilla || !clienteIdSeleccionado) {
      setError('Debe seleccionar un cliente para continuar.')
      return
    }
    try {
      setCreating(true)
      const nueva = await createCotizacionFromPlantilla({ plantillaId: plantilla.id, clienteId: clienteIdSeleccionado })
      router.push(`/comercial/cotizaciones/${nueva.id}`)
    } catch {
      setError('❌ No se pudo crear la cotización.')
    } finally {
      setCreating(false)
    }
  }

  const handleEliminarGrupoEquipo = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaEquipo(id)
    const equipos = plantilla.equipos.filter(e => e.id !== id)
    const nuevosTotales = actualizarTotalesParciales(equipos, plantilla.servicios, plantilla.gastos)
    setPlantilla({ ...plantilla, equipos, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaServicio(id)
    const servicios = plantilla.servicios.filter(s => s.id !== id)
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, servicios, plantilla.gastos)
    setPlantilla({ ...plantilla, servicios, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaGasto(id)
    const gastos = plantilla.gastos.filter(g => g.id !== id)
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, plantilla.servicios, gastos)
    setPlantilla({ ...plantilla, gastos, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarItemGasto = async (gastoId: string, itemId: string) => {
    await deletePlantillaGastoItem(itemId)
    actualizarGasto(gastoId, items => items.filter(i => i.id !== itemId))
  }

  if (error) return <p className="text-red-500 font-semibold">{error}</p>
  if (!plantilla) return <p className="text-gray-600">Cargando plantilla...</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{plantilla.nombre}</h1>
      <ResumenTotalesPlantilla plantilla={plantilla} />

      <div className="flex items-center justify-between gap-x-4">
        <div className="flex-1">
          <ClienteSelector selectedId={clienteIdSeleccionado} onChange={setClienteIdSeleccionado} />
        </div>
        <Button onClick={handleCrearCotizacion} disabled={!clienteIdSeleccionado || creating}>
          {creating ? 'Creando...' : '➕ Crear Cotización'}
        </Button>
      </div>

      {/* Equipos */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-red-600">💼</span> Secciones de Equipos
          </h2>
          <Button variant="secondary" onClick={() => setShowForm(prev => ({ ...prev, equipo: !prev.equipo }))}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo Equipo
          </Button>
        </div>
        {showForm.equipo && (
          <PlantillaEquipoForm plantillaId={plantilla.id} onCreated={nuevo => setPlantilla(p => p ? { ...p, equipos: [...p.equipos, { ...nuevo, items: [] }] } : p)} />
        )}
        <div className="space-y-2">
          {plantilla.equipos.map(e => (
            <PlantillaEquipoAccordion key={e.id} equipo={e} onCreated={i => actualizarEquipo(e.id, items => [...items, i])} onDeleted={id => actualizarEquipo(e.id, items => items.filter(i => i.id !== id))} onUpdated={item => actualizarEquipo(e.id, items => items.map(i => i.id === item.id ? item : i))} onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)} onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, equipos: p.equipos.map(eq => eq.id === e.id ? { ...eq, nombre: nuevo } : eq) } : p)} />
          ))}
        </div>
      </section>

      {/* Servicios */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-gray-700">🛠️</span> Secciones de Servicios
          </h2>
          <Button variant="secondary" onClick={() => setShowForm(prev => ({ ...prev, servicio: !prev.servicio }))}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo Servicio
          </Button>
        </div>
        {showForm.servicio && (
          <PlantillaServicioForm plantillaId={plantilla.id} onCreated={nuevo => setPlantilla(p => p ? { ...p, servicios: [...p.servicios, { ...nuevo, items: [] }] } : p)} />
        )}
        <div className="space-y-2">
          {plantilla.servicios.map(s => (
            <PlantillaServicioAccordion key={s.id} servicio={s} onCreated={i => actualizarServicio(s.id, items => [...items, i])} onDeleted={id => actualizarServicio(s.id, items => items.filter(i => i.id !== id))} onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))} onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)} onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, servicios: p.servicios.map(se => se.id === s.id ? { ...se, nombre: nuevo } : se) } : p)} />
          ))}
        </div>
      </section>

      {/* Gastos */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-green-600">💰</span> Secciones de Gastos
          </h2>
          <Button variant="secondary" onClick={() => setShowForm(prev => ({ ...prev, gasto: !prev.gasto }))}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo Gasto
          </Button>
        </div>
        {showForm.gasto && (
          <PlantillaGastoForm plantillaId={plantilla.id} onCreated={nuevo => setPlantilla(p => p ? { ...p, gastos: [...(p.gastos || []), { ...nuevo, items: [] }] } : p)} />
        )}
        <div className="space-y-2">
          {plantilla.gastos?.map(g => (
            <PlantillaGastoAccordion key={g.id} gasto={g} onCreated={i => actualizarGasto(g.id, items => [...items, i])} onUpdated={(id, changes) => actualizarGasto(g.id, items => items.map(i => i.id === id ? { ...i, ...changes } : i))} onDeleted={id => handleEliminarItemGasto(g.id, id)} onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)} onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, gastos: p.gastos.map(ga => ga.id === g.id ? { ...ga, nombre: nuevo } : ga) } : p)} />
          ))}
        </div>
      </section>
    </div>
  )
}
