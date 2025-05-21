'use client'

import { useEffect, useState } from 'react'
import CategoriaServicioForm from '@/components/catalogo/CategoriaServicioForm'
import CategoriaServicioList from '@/components/catalogo/CategoriaServicioList'
import { getCategoriasServicio, createCategoriaServicio } from '@/lib/services/categoriaServicio'
import { toast } from 'sonner'
import { exportarCategoriasServicioAExcel } from '@/lib/utils/categoriaServicioExcel'
import {
  leerCategoriasServicioDesdeExcel,
  validarCategoriasServicio
} from '@/lib/utils/categoriaServicioImportUtils'
import type { CategoriaServicio } from '@/types'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

export default function Page() {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  const cargarCategorias = async () => {
    const data = await getCategoriasServicio()
    setCategorias(data)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const handleCreated = (nueva: CategoriaServicio) => {
    setCategorias((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: CategoriaServicio) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarCategoriasServicioAExcel(categorias)
      toast.success('Categorías exportadas exitosamente')
    } catch (err) {
      toast.error('Error al exportar categorías')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerCategoriasServicioDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores: erroresImport } = validarCategoriasServicio(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaServicio({ nombre: c.nombre })))
      toast.success(`${nuevas.length} categorías importadas correctamente`)
      cargarCategorias()
    } catch (err) {
      console.error('Error al importar categorías:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📁 Categorías de Servicio</h1>
        <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
      </div>

      {importando && <p className="text-sm text-gray-500">Importando categorías...</p>}

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

      <CategoriaServicioForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <CategoriaServicioList
          data={categorias}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      </div>
    </div>
  )
}
