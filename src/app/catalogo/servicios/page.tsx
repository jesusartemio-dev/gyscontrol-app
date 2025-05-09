'use client'

// ===================================================
// 📁 Archivo: page.tsx (Actualizado PRO con eliminación funcional)
// 📍 Ubicación: src/app/catalogo/servicios/
// ===================================================

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getCatalogoServicios,
  createCatalogoServicio,
  updateCatalogoServicio,
  deleteCatalogoServicio,
} from '@/lib/services/catalogoServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { exportarServiciosAExcel } from '@/lib/utils/serviciosExcel'
import {
  leerServiciosDesdeExcel,
  importarServiciosDesdeExcelValidado,
} from '@/lib/utils/serviciosImportUtils'

import CatalogoServicioCrearAcordeon from '@/components/catalogo/CatalogoServicioCrearAcordeon'
import CatalogoServicioList from '@/components/catalogo/CatalogoServicioList'
import ModalDuplicadosServicios from '@/components/catalogo/ModalDuplicadosServicios'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

import type { CatalogoServicio } from '@/types'

export default function CatalogoServicioPage() {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [duplicados, setDuplicados] = useState<{ id: string; nombre: string }[]>([])
  const [serviciosDuplicados, setServiciosDuplicados] = useState<any[]>([])

  const cargarServicios = async () => {
    try {
      const data = await getCatalogoServicios()
      setServicios(data)
    } catch (err) {
      console.error('❌ Error al cargar servicios:', err)
      toast.error('Error al cargar servicios.')
    }
  }

  useEffect(() => {
    cargarServicios()
  }, [])

  const handleCreated = () => cargarServicios()
  const handleUpdated = () => cargarServicios()

  // ✅ Esta es la función corregida para eliminar
  const eliminarServicio = async (id: string) => {
    try {
      console.log('🧨 Eliminando servicio desde page.tsx con ID:', id)
      await deleteCatalogoServicio(id)
      toast.success('Servicio eliminado')
      await cargarServicios()
    } catch (error) {
      toast.error('Error al eliminar servicio')
      console.error('❌ Error al eliminar servicio:', error)
    }
  }

  const handleExportar = async () => {
    try {
      await exportarServiciosAExcel(servicios)
      toast.success('Servicios exportados exitosamente.')
    } catch (err) {
      console.error('❌ Error al exportar servicios:', err)
      toast.error('Error al exportar servicios.')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerServiciosDesdeExcel(file)
      const [categorias, unidades, recursos, serviciosExistentes] = await Promise.all([
        getCategoriasServicio(),
        getUnidadesServicio(),
        getRecursos(),
        getCatalogoServicios(),
      ])

      const { serviciosNuevos, serviciosDuplicados, errores } =
        await importarServiciosDesdeExcelValidado(
          datos,
          categorias,
          unidades,
          recursos,
          serviciosExistentes.map((s) => ({ nombre: s.nombre, id: s.id }))
        )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores encontrados en la importación.')
        return
      }

      if (serviciosNuevos.length > 0) {
        await Promise.all(serviciosNuevos.map((servicio) => createCatalogoServicio(servicio)))
        toast.success(`${serviciosNuevos.length} servicios nuevos creados.`)
      }

      if (serviciosDuplicados.length > 0) {
        setDuplicados(serviciosDuplicados.map((d) => ({ id: d.id, nombre: d.nombre })))
        setServiciosDuplicados(serviciosDuplicados)
        setMostrarModal(true)
      } else {
        await cargarServicios()
      }
    } catch (err) {
      console.error('❌ Error inesperado al importar servicios:', err)
      toast.error('Error inesperado en la importación.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      await Promise.all(serviciosDuplicados.map((servicio) => updateCatalogoServicio(servicio.id, servicio)))
      toast.success('Servicios duplicados sobrescritos exitosamente.')
      await cargarServicios()
    } catch (err) {
      console.error('❌ Error al sobrescribir duplicados:', err)
      toast.error('Error al sobrescribir duplicados.')
    } finally {
      setMostrarModal(false)
      setDuplicados([])
      setServiciosDuplicados([])
    }
  }

  const cancelarImportacion = () => {
    setMostrarModal(false)
    setDuplicados([])
    setServiciosDuplicados([])
    toast('Importación cancelada.')
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🛠 Catálogo de Servicios</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      <CatalogoServicioCrearAcordeon onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <CatalogoServicioList
          data={servicios}
          onUpdate={handleUpdated}
          onDelete={eliminarServicio}
        />
      </div>

      {importando && (
        <p className="text-sm text-gray-500">Importando datos, por favor espere...</p>
      )}

      {errores.length > 0 && (
        <div className="text-sm text-red-600 space-y-1 bg-red-100 p-3 rounded">
          <p className="font-semibold">Errores encontrados en la importación:</p>
          <ul className="list-disc pl-5">
            {errores.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {mostrarModal && (
        <ModalDuplicadosServicios
          duplicados={duplicados}
          onConfirm={sobrescribirDuplicados}
          onCancel={cancelarImportacion}
        />
      )}
    </div>
  )
}
