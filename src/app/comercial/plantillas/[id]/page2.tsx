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
import PlantillaEquipoList from '@/components/plantillas/equipos/PlantillaEquipoList'
import PlantillaServicioForm from '@/components/plantillas/PlantillaServicioForm'
import PlantillaGastoForm from '@/components/plantillas/PlantillaGastoForm'
import PlantillaServicioAccordion from '@/components/plantillas/PlantillaServicioAccordion'
import PlantillaGastoAccordion from '@/components/plantillas/PlantillaGastoAccordion'
import ResumenTotalesPlantilla from '@/components/plantillas/ResumenTotalesPlantilla'
import ClienteSelector from '@/components/cotizaciones/ClienteSelector'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import type {
  Plantilla,
  PlantillaEquipo,
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

  const handleEliminarGrupoEquipo = async (equipoId: string) => {
    if (!plantilla) return
    await deletePlantillaEquipo(equipoId)
    const equipos = plantilla.equipos.filter(e => e.id !== equipoId)
    const nuevosTotales = actualizarTotalesParciales(equipos, plantilla.servicios, plantilla.gastos)
    setPlantilla({ ...plantilla, equipos, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleItemChange = (equipoId: string, items: PlantillaEquipoItem[]) => {
    actualizarEquipo(equipoId, () => items)
  }

  const handleNombreChange = (equipoId: string, nuevo: string) => {
    if (!plantilla) return
    const equipos = plantilla.equipos.map(eq =>
      eq.id === equipoId ? { ...eq, nombre: nuevo } : eq
    )
    setPlantilla({ ...plantilla, equipos })
  }

  const handleEquipoChange = (equipoId: string, changes: Partial<PlantillaEquipo>) => {
    if (!plantilla) return
    const equipos = plantilla.equipos.map(eq =>
      eq.id === equipoId ? { ...eq, ...changes } : eq
    )
    setPlantilla({ ...plantilla, equipos })
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
          <PlantillaEquipoForm
            plantillaId={plantilla.id}
            onCreated={(nuevo) =>
              setPlantilla(p => p ? { ...p, equipos: [...p.equipos, { ...nuevo, items: [] }] } : p)
            }
          />
        )}
        <PlantillaEquipoList
          equipos={plantilla.equipos}
          onItemChange={handleItemChange}
          onUpdatedNombre={handleNombreChange}
          onDeletedGrupo={handleEliminarGrupoEquipo}
          onChange={handleEquipoChange}
        />
      </section>

      {/* Servicios */}
      {/* ... (sin cambios) */}

      {/* Gastos */}
      {/* ... (sin cambios) */}
    </div>
  )
}
