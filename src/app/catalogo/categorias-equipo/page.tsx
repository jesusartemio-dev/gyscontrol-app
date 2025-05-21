'use client'

import { useEffect, useState } from 'react'
import {
  getCategoriaEquipo,
  createCategoriaEquipo
} from '@/lib/services/categoriaEquipo'
import { toast } from 'sonner'
import { exportarCategoriasEquipoAExcel } from '@/lib/utils/categoriaEquipoExcel'
import {
  leerCategoriasEquipoDesdeExcel,
  validarCategoriasEquipo
} from '@/lib/utils/categoriaEquipoImportUtils'
import type { CategoriaEquipo } from '@/types'
import CategoriaEquipoForm from '@/components/catalogo/CategoriaEquipoForm'
import CategoriaEquipoList from '@/components/catalogo/CategoriaEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

export default function CategoriasEquipoPage() {
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  const cargarCategorias = async () => {
    const data = await getCategoriaEquipo()
    setCategorias(data)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const handleCreated = (nueva: CategoriaEquipo) => {
    setCategorias((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: CategoriaEquipo) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarCategoriasEquipoAExcel(categorias)
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
      const datos = await leerCategoriasEquipoDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores: erroresImport } = validarCategoriasEquipo(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaEquipo({ nombre: c.nombre })))
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
        <h1 className="text-2xl font-bold">🏷 Categorías de Equipos</h1>
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

      <CategoriaEquipoForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <CategoriaEquipoList
          data={categorias}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
          onRefresh={cargarCategorias}
        />
      </div>
    </div>
  )
}
