// ===================================================
// 💽 Archivo: CatalogoEquipoList.tsx (Avanzado)
// 📋 Ubicación: src/components/catalogo/
// 🔧 Descripción: Listado editable de Catálogo de Equipos optimizado con filtros accesibles.
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-25
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateEquipo, deleteEquipo } from '@/lib/services/catalogoEquipo'
import { CatalogoEquipo } from '@/types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  data: CatalogoEquipo[]
  onUpdate?: () => void
  onDelete?: () => void
}

export default function CatalogoEquipoList({ data, onUpdate, onDelete }: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>(data)
  const [categorias, setCategorias] = useState<string[]>([])
  const [unidades, setUnidades] = useState<string[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [unidadFiltro, setUnidadFiltro] = useState('__ALL__')
  const [textoFiltro, setTextoFiltro] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoPrecio, setNuevoPrecio] = useState<number | null>(null)
  const [nuevoMargen, setNuevoMargen] = useState<number | null>(null)

  useEffect(() => {
    setEquipos(data)
    setCategorias([...new Set(data.map(eq => eq.categoria?.nombre).filter(Boolean))] as string[])
    setUnidades([...new Set(data.map(eq => eq.unidad?.nombre).filter(Boolean))] as string[])
  }, [data])

  const handleEditField = async (id: string, field: keyof CatalogoEquipo, value: string | number) => {
    try {
      const updated = await updateEquipo(id, { [field]: value })
      setEquipos(prev => prev.map(eq => (eq.id === id ? updated : eq)))
      toast.success('Campo actualizado.')
      onUpdate?.()
    } catch (err) {
      console.error('❌ Error al editar:', err)
      toast.error('Error al editar campo.')
    }
  }

  const guardarEdicion = async (equipo: CatalogoEquipo) => {
    if (nuevoPrecio === null || nuevoMargen === null) return

    if (nuevoPrecio === equipo.precioInterno && nuevoMargen === equipo.margen) {
      toast('No se detectaron cambios.')
      cancelarEdicion()
      return
    }

    const precioVenta = parseFloat((nuevoPrecio * (1 + nuevoMargen)).toFixed(2))

    try {
      const actualizado = await updateEquipo(equipo.id, {
        precioInterno: nuevoPrecio,
        margen: nuevoMargen,
        precioVenta,
      })
      setEquipos(prev => prev.map(eq => (eq.id === equipo.id ? actualizado : eq)))
      toast.success('Equipo actualizado.')
      cancelarEdicion()
      onUpdate?.()
    } catch (err) {
      console.error('❌ Error al guardar edición:', err)
      toast.error('Error al guardar cambios.')
    }
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevoPrecio(null)
    setNuevoMargen(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEquipo(id)
      setEquipos(prev => prev.filter(eq => eq.id !== id))
      toast.success('Equipo eliminado.')
      onDelete?.()
    } catch (err) {
      console.error('❌ Error al eliminar equipo:', err)
      toast.error('Error al eliminar equipo.')
    }
  }

  const equiposFiltrados = equipos.filter(eq =>
    (categoriaFiltro !== '__ALL__' ? eq.categoria?.nombre === categoriaFiltro : true) &&
    (unidadFiltro !== '__ALL__' ? eq.unidad?.nombre === unidadFiltro : true) &&
    (`${eq.codigo} ${eq.descripcion}`.toLowerCase().includes(textoFiltro.toLowerCase()))
  )

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex flex-col space-y-1">
          <label htmlFor="categoria" className="text-sm font-medium text-gray-700">Categoría</label>
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger id="categoria" className="w-60">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas las categorías</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="unidad" className="text-sm font-medium text-gray-700">Unidad</label>
          <Select value={unidadFiltro} onValueChange={setUnidadFiltro}>
            <SelectTrigger id="unidad" className="w-60">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas las unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="buscar" className="text-sm font-medium text-gray-700">Buscar</label>
          <Input
            id="buscar"
            type="text"
            placeholder="Buscar código o descripción"
            value={textoFiltro}
            onChange={e => setTextoFiltro(e.target.value)}
            className="w-80"
          />
        </div>

        <Button variant="outline" onClick={() => {
          setCategoriaFiltro('__ALL__')
          setUnidadFiltro('__ALL__')
          setTextoFiltro('')
        }}>
          Limpiar filtros
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border mt-4 text-sm">
          <thead className="bg-gray-100">
            <tr>
              {['Código', 'Descripción', 'Categoría', 'Unidad', 'Marca', 'Precio Interno', 'Margen', 'Precio Venta', 'Estado', 'Acciones'].map(th => (
                <th key={th} className="border px-2 py-1">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equiposFiltrados.map(eq => (
              <tr key={eq.id}>
                <td className="border px-2 py-1">{eq.codigo}</td>
                <td className="border px-2 py-1">{eq.descripcion}</td>
                <td className="border px-2 py-1">{eq.categoria?.nombre}</td>
                <td className="border px-2 py-1">{eq.unidad?.nombre}</td>
                <td className="border px-2 py-1">{eq.marca}</td>
                <td className="border px-2 py-1">
                  {editandoId === eq.id ? (
                    <Input
                      type="number"
                      value={nuevoPrecio ?? ''}
                      onChange={e => setNuevoPrecio(parseFloat(e.target.value))}
                      className="w-24"
                    />
                  ) : (
                    eq.precioInterno.toFixed(2)
                  )}
                </td>
                <td className="border px-2 py-1">
                  {editandoId === eq.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={nuevoMargen ?? ''}
                      onChange={e => setNuevoMargen(parseFloat(e.target.value))}
                      className="w-20"
                    />
                  ) : (
                    `${(eq.margen * 100).toFixed(0)}%`
                  )}
                </td>
                <td className="border px-2 py-1 font-semibold text-green-700">S/ {eq.precioVenta.toFixed(2)}</td>
                <td className="border px-2 py-1">
                  <select
                    className="text-sm"
                    value={eq.estado}
                    onChange={e => handleEditField(eq.id, 'estado', e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </td>
                <td className="border px-2 py-1 text-center">
                  {editandoId === eq.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => guardarEdicion(eq)}
                        disabled={nuevoPrecio === eq.precioInterno && nuevoMargen === eq.margen}
                      >💾</Button>
                      <Button size="sm" variant="ghost" onClick={cancelarEdicion}>❌</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => { setEditandoId(eq.id); setNuevoPrecio(eq.precioInterno); setNuevoMargen(eq.margen); }}>✏️</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(eq.id)}>🗑️</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
