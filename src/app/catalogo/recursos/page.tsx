'use client'

import { useEffect, useState } from 'react'
import { getRecursos, createRecurso } from '@/lib/services/recurso'
import { Recurso } from '@/types'
import RecursoForm from '@/components/catalogo/RecursoForm'
import RecursoList from '@/components/catalogo/RecursoList'
import { toast } from 'sonner'
import { exportarRecursosAExcel } from '@/lib/utils/recursoExcel'
import {
  leerRecursosDesdeExcel,
  validarRecursos
} from '@/lib/utils/recursoImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

export default function Page() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  useEffect(() => {
    getRecursos().then(setRecursos)
  }, [])

  const handleCreated = (nuevo: Recurso) => {
    setRecursos((prev) => [nuevo, ...prev])
  }

  const handleUpdated = (actualizado: Recurso) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === actualizado.id ? actualizado : r))
    )
  }

  const handleDeleted = (id: string) => {
    setRecursos((prev) => prev.filter((r) => r.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarRecursosAExcel(recursos)
      toast.success('Recursos exportados exitosamente')
    } catch (err) {
      toast.error('Error al exportar recursos')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerRecursosDesdeExcel(file)
      const nombresExistentes = recursos.map(r => r.nombre)
      const { nuevos, errores: erroresImport } = validarRecursos(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevos.map(r => createRecurso({ nombre: r.nombre, costoHora: r.costoHora })))
      toast.success(`${nuevos.length} recursos importados correctamente`)
      getRecursos().then(setRecursos)
    } catch (err) {
      console.error('Error al importar recursos:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">👷 Recursos</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      {importando && <p className="text-sm text-gray-500">Importando recursos...</p>}

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

      <RecursoForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <RecursoList
          data={recursos}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      </div>
    </div>
  )
}
