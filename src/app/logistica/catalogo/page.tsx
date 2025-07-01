'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import LogisticaCatalogoEquipoCrearAcordeon from '@/components/logistica/LogisticaCatalogoEquipoCrearAcordeon'
import LogisticaCatalogoEquipoList from '@/components/logistica/LogisticaCatalogoEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { exportarEquiposAExcel, importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import { importarEquiposDesdeExcelValidado } from '@/lib/utils/equiposImportUtils'
import { recalcularCatalogoEquipo } from '@/lib/utils/recalculoCatalogoEquipo'
import { getCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import {
  createEquipoLogistica,
  updateEquipoLogistica,
  getCatalogoEquiposLogistica,
  deleteEquipoLogistica,
} from '@/lib/services/logisticaCatalogoEquipo'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

export default function LogisticaCatalogoPage() {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [equiposNuevos, setEquiposNuevos] = useState<CatalogoEquipoPayload[]>([])
  const [equiposDuplicados, setEquiposDuplicados] = useState<CatalogoEquipoConId[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargarEquipos = async () => {
    try {
      const data = await getCatalogoEquiposLogistica()
      setEquipos(data)
    } catch (err) {
      console.error('❌ Error al cargar equipos (Logística):', err)
      toast.error('Error al cargar equipos.')
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  const handleCreated = async (data: CatalogoEquipoPayload) => {
    const result = await createEquipoLogistica(data)
    if (result) {
      toast.success('Equipo creado exitosamente.')
      cargarEquipos()
    }
  }

  const handleUpdated = async (id: string, data: Partial<CatalogoEquipoPayload>) => {
    const result = await updateEquipoLogistica(id, data)
    if (result) {
      toast.success('Equipo actualizado exitosamente.')
      cargarEquipos()
    }
  }

  const handleDeleted = async (id: string) => {
    const success = await deleteEquipoLogistica(id)
    if (success) {
      toast.success('Equipo eliminado.')
      cargarEquipos()
    }
  }

  const handleExportar = async () => {
    try {
      await exportarEquiposAExcel(equipos)
      toast.success('Equipos exportados exitosamente.')
    } catch (err) {
      console.error('❌ Error al exportar:', err)
      toast.error('Error al exportar equipos.')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])
    setMostrarModal(false)

    try {
      const datos = await importarEquiposDesdeExcel(file)
      const [categorias, unidades, equiposExistentes] = await Promise.all([
        getCategoriaEquipo(),
        getUnidades(),
        getCatalogoEquiposLogistica(),
      ])

      const codigosExistentes = equiposExistentes.map(eq => eq.codigo)
      const idPorCodigo: Record<string, string> = equiposExistentes.reduce((acc, eq) => {
        acc[eq.codigo] = eq.id
        return acc
      }, {} as Record<string, string>)

      const { equiposValidos, errores } = await importarEquiposDesdeExcelValidado(
        datos,
        categorias,
        unidades,
        codigosExistentes
      )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores encontrados en la importación.')
        return
      }

      const nuevos: CatalogoEquipoPayload[] = []
      const duplicados: CatalogoEquipoConId[] = []

      for (const eq of equiposValidos) {
        const payload: CatalogoEquipoPayload = {
          codigo: eq.codigo,
          descripcion: eq.descripcion,
          marca: eq.marca,
          precioInterno: eq.precioInterno,
          margen: eq.margen,
          precioVenta: eq.precioVenta,
          categoriaId: eq.categoriaId,
          unidadId: eq.unidadId,
          estado: eq.estado,
        }

        if (codigosExistentes.includes(eq.codigo)) {
          duplicados.push({ ...payload, id: idPorCodigo[eq.codigo] })
        } else {
          nuevos.push(payload)
        }
      }

      setEquiposNuevos(nuevos)
      setEquiposDuplicados(duplicados)

      if (duplicados.length > 0) {
        setMostrarModal(true)
      } else if (nuevos.length > 0) {
        const creados = (await Promise.all(
          nuevos.map(eq => createEquipoLogistica(recalcularCatalogoEquipo(eq)))
        )).filter((item): item is CatalogoEquipo => item !== null)

        setEquipos(prev => [...prev, ...creados])
        toast.success('Equipos importados exitosamente.')
      } else {
        toast('No se encontraron nuevos equipos para importar.')
      }
    } catch (err) {
      console.error('❌ Error general al importar:', err)
      toast.error('Error inesperado en la importación.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      const nuevos = (await Promise.all(
        equiposNuevos.map(eq => createEquipoLogistica(recalcularCatalogoEquipo(eq)))
      )).filter((item): item is CatalogoEquipo => item !== null)

      const actualizados = (await Promise.all(
        equiposDuplicados.map(eq => {
          const { id, ...data } = eq
          return updateEquipoLogistica(id, recalcularCatalogoEquipo(data))
        })
      )).filter((item): item is CatalogoEquipo => item !== null)

      setEquipos(prev => {
        const actualizadosIds = new Set(actualizados.map(e => e.id))
        const equiposFiltrados = prev.filter(e => !actualizadosIds.has(e.id))
        return [...equiposFiltrados, ...actualizados, ...nuevos]
      })

      toast.success('Equipos sobrescritos exitosamente.')
      setMostrarModal(false)
    } catch (err) {
      console.error('❌ Error al sobrescribir duplicados:', err)
      toast.error('Error al sobrescribir duplicados.')
    }
  }

  const cancelarImportacion = () => {
    setMostrarModal(false)
    setEquiposNuevos([])
    setEquiposDuplicados([])
    toast('Importación cancelada.')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Catálogo de Equipos (Logística)</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      <LogisticaCatalogoEquipoCrearAcordeon onCreated={handleCreated} />

      {equipos.length === 0 ? (
        <p className="text-gray-500 text-sm italic mt-4">No hay equipos registrados aún.</p>
      ) : (
        <LogisticaCatalogoEquipoList
          data={equipos}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      )}

      {importando && (
        <p className="text-sm text-gray-500">Importando datos, por favor espere...</p>
      )}

      {errores.length > 0 && (
        <div className="text-sm text-red-600 space-y-1 bg-red-100 p-3 rounded">
          <p className="font-semibold">Errores al importar:</p>
          <ul className="list-disc pl-5">
            {errores.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

{mostrarModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-100/60 backdrop-blur-sm z-50">
    <div className="bg-white p-6 rounded-xl space-y-4 w-full max-w-md">
      <h2 className="text-xl font-bold text-center">Equipos Duplicados</h2>
      <p className="text-sm text-gray-700 text-center">
        Se encontraron códigos ya existentes:
      </p>
      <div className="max-h-48 overflow-y-auto border rounded p-2">
        <ul className="text-center text-gray-800 text-sm">
          {equiposDuplicados.map((eq, idx) => (
            <li key={idx}>{eq.codigo}</li>
          ))}
        </ul>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={sobrescribirDuplicados}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Sobreescribir
        </button>
        <button
          onClick={cancelarImportacion}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}
