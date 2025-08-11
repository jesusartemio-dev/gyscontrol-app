'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { createListaEquipoItem } from '@/lib/services/listaEquipoItem'
import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ProyectoEquipo,
} from '@/types'

interface Props {
  proyectoId: string
  listaId: string
  onClose: () => void
  onCreated?: () => void
}

export default function ModalAgregarItemDesdeCatalogo({
  proyectoId,
  listaId,
  onClose,
  onCreated,
}: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [secciones, setSecciones] = useState<ProyectoEquipo[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [proyectoEquipoId, setProyectoEquipoId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [equiposData, categoriasData, seccionesData] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriaEquipo(),
        getProyectoEquipos(proyectoId),
      ])
      setEquipos(equiposData)
      setCategorias(categoriasData)
      setSecciones(seccionesData)
    }
    fetchData()
  }, [proyectoId])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAgregar = async () => {
    const ids = Object.entries(seleccionados)
      .filter(([_, v]) => v)
      .map(([id]) => id)

    if (ids.length === 0 || !proyectoEquipoId) {
      toast.warning('Selecciona al menos un equipo y el grupo del proyecto')
      return
    }

    try {
      setLoading(true)
      for (const id of ids) {
        const equipo = equipos.find((e) => e.id === id)
        if (!equipo) continue

        await createListaEquipoItem({
          listaId,
          proyectoEquipoId,
          codigo: equipo.codigo,
          descripcion: equipo.descripcion,
          unidad: equipo.unidad?.nombre || 'UND',
          cantidad: 1,
          presupuesto: equipo.precioVenta ?? 0,
          origen: 'nuevo',
          estado: 'borrador',
        })
      }

      toast.success('✅ Equipos agregados correctamente')
      onCreated?.()
      onClose()
    } catch (error) {
      console.error('❌ Error al agregar los equipos:', error)
      toast.error('❌ No se pudo agregar los equipos')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const matchCategoria = categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const matchSearch = e.codigo.toLowerCase().includes(search.toLowerCase()) || e.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCategoria && matchSearch
  })

  const seleccionadosPreview = equipos.filter((e) => seleccionados[e.id])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl">
        <DialogHeader>
          <DialogTitle>➕ Agregar Equipos desde Catálogo</DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="🔍 Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md"
          />
          <select
            className="border rounded-md px-2 py-1 text-sm max-w-xs"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <ScrollArea className="h-[350px] border rounded-md mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-center">✔</th>
                <th className="p-2">Código</th>
                <th className="p-2">Descripción</th>
                <th className="p-2">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {equiposFiltrados.map((equipo) => (
                <tr key={equipo.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={!!seleccionados[equipo.id]}
                      onCheckedChange={() => toggleSeleccion(equipo.id)}
                    />
                  </td>
                  <td className="p-2">{equipo.codigo}</td>
                  <td className="p-2">{equipo.descripcion}</td>
                  <td className="p-2">{equipo.unidad?.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {/* Grupo del proyecto */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Equipos seleccionados:</strong> {seleccionadosPreview.length}
          </p>
          {seleccionadosPreview.length > 0 && (
            <ul className="text-sm list-disc list-inside text-gray-700">
              {seleccionadosPreview.map((e) => (
                <li key={e.id}>{e.codigo} - {e.descripcion}</li>
              ))}
            </ul>
          )}

          <select
            className="border rounded-md px-2 py-1 text-sm w-full"
            value={proyectoEquipoId}
            onChange={(e) => setProyectoEquipoId(e.target.value)}
          >
            <option value="">— Selecciona grupo del proyecto —</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAgregar} disabled={loading || seleccionadosPreview.length === 0 || !proyectoEquipoId}>
            {loading ? 'Agregando...' : 'Agregar a la Lista'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
