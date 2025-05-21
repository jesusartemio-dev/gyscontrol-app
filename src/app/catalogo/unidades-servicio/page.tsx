// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/unidades-servicio/
// 🔧 Página de unidades de servicio con import/export y validación
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import UnidadServicioForm from '@/components/catalogo/UnidadServicioForm'
import UnidadServicioList from '@/components/catalogo/UnidadServicioList'
import { UnidadServicio } from '@/types'
import { getUnidadesServicio, createUnidadServicio } from '@/lib/services/unidadServicio'
import { toast } from 'sonner'
import { exportarUnidadesServicioAExcel } from '@/lib/utils/unidadServicioExcel'
import {
  leerUnidadesServicioDesdeExcel,
  validarUnidadesServicio
} from '@/lib/utils/unidadServicioImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

export default function Page() {
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  const cargarUnidades = async () => {
    const data = await getUnidadesServicio()
    setUnidades(data)
  }

  useEffect(() => {
    cargarUnidades()
  }, [])

  const handleCreated = (nueva: UnidadServicio) => {
    setUnidades((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: UnidadServicio) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === actualizada.id ? actualizada : u))
    )
  }

  const handleDeleted = (id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id))
  }

  const handleExportar = async () => {
    try {
      exportarUnidadesServicioAExcel(unidades)
      toast.success('Unidades de servicio exportadas')
    } catch (err) {
      toast.error('Error al exportar unidades')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerUnidadesServicioDesdeExcel(file)
      const nombresExistentes = unidades.map(u => u.nombre)
      const { nuevas, errores: erroresImport } = validarUnidadesServicio(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(u => createUnidadServicio({ nombre: u.nombre })))
      toast.success(`${nuevas.length} unidades importadas correctamente`)
      cargarUnidades()
    } catch (err) {
      console.error('Error al importar unidades de servicio:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📏 Unidades de Servicio</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      {importando && <p className="text-sm text-gray-500">Importando unidades...</p>}

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

      <UnidadServicioForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <UnidadServicioList
          data={unidades}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
          onRefresh={cargarUnidades}
        />
      </div>
    </div>
  )
}
