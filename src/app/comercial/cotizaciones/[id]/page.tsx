'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  getCotizacionById,
  updateCotizacion
} from '@/lib/services/cotizacion'
import {
  deleteCotizacionServicio,
  updateCotizacionServicio
} from '@/lib/services/cotizacionServicio'
import {
  deleteCotizacionEquipo,
  updateCotizacionEquipo
} from '@/lib/services/cotizacionEquipo'
import {
  deleteCotizacionGasto,
  updateCotizacionGasto
} from '@/lib/services/cotizacionGasto'
import { deleteCotizacionGastoItem } from '@/lib/services/cotizacionGastoItem'

import CotizacionEquipoForm from '@/components/cotizaciones/CotizacionEquipoForm'
import CotizacionServicioForm from '@/components/cotizaciones/CotizacionServicioForm'
import CotizacionGastoForm from '@/components/cotizaciones/CotizacionGastoForm'
import CotizacionEquipoAccordion from '@/components/cotizaciones/CotizacionEquipoAccordion'
import CotizacionServicioAccordion from '@/components/cotizaciones/CotizacionServicioAccordion'
import CotizacionGastoAccordion from '@/components/cotizaciones/CotizacionGastoAccordion'

import ResumenTotalesCotizacion from '@/components/cotizaciones/ResumenTotalesCotizacion'
import EstadoCotizacionToolbar from '@/components/cotizaciones/EstadoCotizacionToolbar'
import { DescargarPDFButton } from '@/components/pdf/CotizacionPDF'
import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import { useRouter } from 'next/navigation'

import type {
  Cotizacion,
  CotizacionEquipoItem,
  CotizacionServicioItem,
  CotizacionGastoItem
} from '@/types'

export default function CotizacionDetallePage() {
  const { id } = useParams()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderPDF, setRenderPDF] = useState(true)
  const [showForm, setShowForm] = useState({ equipo: false, servicio: false, gasto: false })

  const router = useRouter()
  const [creandoProyecto, setCreandoProyecto] = useState(false)


  useEffect(() => {
    if (typeof id === 'string') {
      getCotizacionById(id)
        .then(setCotizacion)
        .catch(() => setError('Error al cargar cotización.'))
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
      descuento: cotizacion?.descuento ?? 0,
      grandTotal: totalCliente - (cotizacion?.descuento ?? 0)
    }
  }

  const actualizarEquipo = (equipoId: string, callback: (items: CotizacionEquipoItem[]) => CotizacionEquipoItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const equipos = cotizacion.equipos.map(e =>
      e.id === equipoId ? { ...e, items: callback(e.items), ...calcularSubtotal(callback(e.items)) } : e
    )
    const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, equipos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const actualizarServicio = (servicioId: string, callback: (items: CotizacionServicioItem[]) => CotizacionServicioItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const servicios = cotizacion.servicios.map(s =>
      s.id === servicioId ? { ...s, items: callback(s.items), ...calcularSubtotal(callback(s.items)) } : s
    )
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, servicios, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const actualizarGasto = (gastoId: string, callback: (items: CotizacionGastoItem[]) => CotizacionGastoItem[]) => {
    if (!cotizacion) return
    setRenderPDF(false)
    const gastos = cotizacion.gastos.map(g =>
      g.id === gastoId ? { ...g, items: callback(g.items), ...calcularSubtotal(callback(g.items)) } : g
    )
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
    setCotizacion({ ...cotizacion, gastos, ...nuevosTotales })
    void updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoEquipo = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionEquipo(id)
    const equipos = cotizacion.equipos.filter(e => e.id !== id)
    const nuevosTotales = actualizarTotalesParciales(equipos, cotizacion.servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, equipos, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionServicio(id)
    const servicios = cotizacion.servicios.filter(s => s.id !== id)
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, servicios, cotizacion.gastos)
    setCotizacion({ ...cotizacion, servicios, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!cotizacion) return
    setRenderPDF(false)
    await deleteCotizacionGasto(id)
    const gastos = cotizacion.gastos.filter(g => g.id !== id)
    const nuevosTotales = actualizarTotalesParciales(cotizacion.equipos, cotizacion.servicios, gastos)
    setCotizacion({ ...cotizacion, gastos, ...nuevosTotales })
    await updateCotizacion(cotizacion.id, nuevosTotales)
    setTimeout(() => setRenderPDF(true), 100)
  }

  const handleEliminarItemGasto = async (gastoId: string, itemId: string) => {
    await deleteCotizacionGastoItem(itemId)
    actualizarGasto(gastoId, items => items.filter(i => i.id !== itemId))
  }

  const handleActualizarNombreEquipo = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionEquipo(id, { nombre: nuevo })
    setCotizacion({
      ...cotizacion,
      equipos: cotizacion.equipos.map(e => e.id === id ? { ...e, nombre: nuevo } : e)
    })
  }

  const handleActualizarNombreServicio = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionServicio(id, { categoria: nuevo })
    setCotizacion({
      ...cotizacion,
      servicios: cotizacion.servicios.map(s => s.id === id ? { ...s, categoria: nuevo } : s)
    })
  }

  const handleActualizarNombreGasto = async (id: string, nuevo: string) => {
    if (!cotizacion) return
    await updateCotizacionGasto(id, { nombre: nuevo })
    setCotizacion({
      ...cotizacion,
      gastos: cotizacion.gastos.map(g => g.id === id ? { ...g, nombre: nuevo } : g)
    })
  }

  const handleCrearProyecto = async () => {
      if (!cotizacion) return
      setCreandoProyecto(true)
    
      try {

            // 🟣 Log para depuración:
          console.log('🟣 Enviando a crear proyecto desde cotización:', {
            cotizacionId: cotizacion.id,
            gestorId: cotizacion.comercial?.id,
          })
          
        const proyecto = await crearProyectoDesdeCotizacion(cotizacion.id, {
          gestorId: cotizacion.comercial?.id ?? '',
          fechaInicio: new Date(), // por ahora la fecha actual
        })
        router.push(`/proyectos/${proyecto.id}`)
      } catch (error) {
        console.error('❌ Error al crear proyecto', error)
        alert('Error al crear el proyecto. Intenta nuevamente.')
      } finally {
        setCreandoProyecto(false)
      }
    }
  

  if (error) return <p className="text-red-500">{error}</p>
  if (!cotizacion) return <p className="text-gray-600">Cargando cotización...</p>

  const puedeRenderizarPDF =
    cotizacion &&
    cotizacion.cliente &&
    Array.isArray(cotizacion.equipos) &&
    cotizacion.equipos.every(e => Array.isArray(e.items)) &&
    Array.isArray(cotizacion.servicios) &&
    cotizacion.servicios.every(s => Array.isArray(s.items)) &&
    Array.isArray(cotizacion.gastos) &&
    cotizacion.gastos.every(g => Array.isArray(g.items))

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{cotizacion.nombre}</h1>
        {renderPDF && puedeRenderizarPDF && <DescargarPDFButton cotizacion={cotizacion} />}
      </div>

      <EstadoCotizacionToolbar
        cotizacion={cotizacion}
        onUpdated={(nuevoEstado, nuevaEtapa) =>
          setCotizacion(prev => prev ? { ...prev, estado: nuevoEstado, etapa: nuevaEtapa } : prev)
        }
      />

      <ResumenTotalesCotizacion cotizacion={cotizacion} />

      {/* Equipos */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-red-600">💼</span> Secciones de Equipos
          </h2>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm flex items-center gap-1"
            onClick={() => setShowForm(prev => ({ ...prev, equipo: !prev.equipo }))}
          >
            <span className="text-lg">＋</span> Equipo
          </button>
        </div>
        {showForm.equipo && (
          <CotizacionEquipoForm
            cotizacionId={cotizacion.id}
            onCreated={(nuevo) =>
              setCotizacion(p => p ? { ...p, equipos: [...p.equipos, { ...nuevo, items: [] }] } : p)
            }
          />
        )}
        <div className="space-y-2">
          {cotizacion.equipos.map(e => (
            <CotizacionEquipoAccordion
              key={e.id}
              equipo={e}
              onCreated={i => actualizarEquipo(e.id, items => [...items, i])}
              onUpdated={item => actualizarEquipo(e.id, items => items.map(i => i.id === item.id ? item : i))}
              onDeleted={id => actualizarEquipo(e.id, items => items.filter(i => i.id !== id))}
              onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)}
              onUpdatedNombre={nuevo => handleActualizarNombreEquipo(e.id, nuevo)}
            />
          ))}
        </div>
      </section>

      {/* Servicios */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-gray-700">🛠️</span> Secciones de Servicios
          </h2>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1"
            onClick={() => setShowForm(prev => ({ ...prev, servicio: !prev.servicio }))}
          >
            <span className="text-lg">＋</span> Servicio
          </button>
        </div>
        {showForm.servicio && (
          <CotizacionServicioForm
            cotizacionId={cotizacion.id}
            onCreated={(nuevo) =>
              setCotizacion(p => p ? { ...p, servicios: [...p.servicios, { ...nuevo, items: [] }] } : p)
            }
          />
        )}
        <div className="space-y-2">
          {cotizacion.servicios.map(s => (
            <CotizacionServicioAccordion
              key={s.id}
              servicio={s}
              onCreated={i => actualizarServicio(s.id, items => [...items, i])}
              onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))}
              onDeleted={id => actualizarServicio(s.id, items => items.filter(i => i.id !== id))}
              onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)}
              onUpdatedNombre={nuevo => handleActualizarNombreServicio(s.id, nuevo)}
            />
          ))}
        </div>
      </section>

      {/* Gastos */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-green-600">💰</span> Secciones de Gastos
          </h2>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm flex items-center gap-1"
            onClick={() => setShowForm(prev => ({ ...prev, gasto: !prev.gasto }))}
          >
            <span className="text-lg">＋</span> Gasto
          </button>
        </div>
        {showForm.gasto && (
          <CotizacionGastoForm
            cotizacionId={cotizacion.id}
            onCreated={(nuevo) =>
              setCotizacion(p => p ? { ...p, gastos: [...(p.gastos || []), { ...nuevo, items: [] }] } : p)
            }
          />
        )}
        <div className="space-y-2">
          {cotizacion.gastos?.map(g => (
            <CotizacionGastoAccordion
              key={g.id}
              gasto={g}
              onCreated={i => actualizarGasto(g.id, items => [...items, i])}
              onUpdated={(id, changes) =>
                actualizarGasto(g.id, items => items.map(i => i.id === id ? { ...i, ...changes } : i))
              }
              onDeleted={id => handleEliminarItemGasto(g.id, id)}
              onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)}
              onUpdatedNombre={nuevo => handleActualizarNombreGasto(g.id, nuevo)}
            />
          ))}
        </div>
      </section>
      {cotizacion.estado === "aprobada" && cotizacion.etapa === "cerrado" && (
        <div className="pt-4 border-t">
          <button
            onClick={handleCrearProyecto}
            disabled={creandoProyecto}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            {creandoProyecto ? 'Creando proyecto...' : 'Crear Proyecto'}
          </button>
        </div>
      )}

    </div>
  )
}
