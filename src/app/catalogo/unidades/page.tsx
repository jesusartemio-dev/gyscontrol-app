// src/app/catalogo/unidades/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getUnidades, createUnidad } from '@/lib/services/unidad'
import { Unidad } from '@/types'
import { toast } from 'sonner'
import { exportarUnidadesAExcel } from '@/lib/utils/unidadExcel'
import { leerUnidadesDesdeExcel, validarUnidades } from '@/lib/utils/unidadImportUtils'
import UnidadForm from '@/components/catalogo/UnidadForm'
import UnidadList from '@/components/catalogo/UnidadList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

export default function CatalogoUnidadesPage() {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  useEffect(() => {
    getUnidades()
      .then(setUnidades)
      .catch(() => toast.error('Error al cargar unidades'))
  }, [])

  const handleCreated = (nueva: Unidad) => {
    setUnidades((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: Unidad) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === actualizada.id ? actualizada : u))
    )
  }

  const handleDeleted = (id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id))
  }

  const handleExportar = async () => {
    try {
      exportarUnidadesAExcel(unidades)
      toast.success('Unidades exportadas exitosamente')
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
      const datos = await leerUnidadesDesdeExcel(file)
      const nombresExistentes = unidades.map(u => u.nombre)
      const { nuevas, errores: erroresImport } = validarUnidades(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores en la importación')
        return
      }

      await Promise.all(nuevas.map(u => createUnidad({ nombre: u.nombre })))
      toast.success(`${nuevas.length} unidades importadas correctamente`)
      getUnidades().then(setUnidades)
    } catch (err) {
      console.error('Error al importar:', err)
      toast.error('Error inesperado al importar')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📦 Unidades</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      {importando && <p className="text-sm text-gray-500">Importando datos, por favor espere...</p>}

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

      <UnidadForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <UnidadList
          data={unidades}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
          onRefresh={() => getUnidades().then(setUnidades)}
        />
      </div>
    </div>
  )
}
