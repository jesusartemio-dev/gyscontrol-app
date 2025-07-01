'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateEquipo, deleteEquipo } from '@/lib/services/catalogoEquipo'
import { CatalogoEquipo } from '@/types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Save, Trash2, X } from 'lucide-react'

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
    setCategorias([...new Set(data.map(eq => eq.categoria?.nombre).filter(Boolean))])
    setUnidades([...new Set(data.map(eq => eq.unidad?.nombre).filter(Boolean))])
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
      {/* 🔍 Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Categoría</label>
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Unidad</label>
          <Select value={unidadFiltro} onValueChange={setUnidadFiltro}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Buscar</label>
          <Input
            type="text"
            placeholder="Código o descripción"
            value={textoFiltro}
            onChange={e => setTextoFiltro(e.target.value)}
            className="w-64"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setCategoriaFiltro('__ALL__')
            setUnidadFiltro('__ALL__')
            setTextoFiltro('')
          }}
        >
          Limpiar filtros
        </Button>
      </div>

      {/* 📋 Tabla */}
      <div className="overflow-x-auto rounded shadow border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['Código', 'Descripción', 'Categoría', 'Unidad', 'Marca', 'Precio Interno', 'Margen', 'Precio Venta', 'Estado', 'Acciones'].map(th => (
                <th key={th} className="px-3 py-2 text-left font-semibold text-gray-700 border-b">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equiposFiltrados.map(eq => (
              <tr key={eq.id} className="hover:bg-gray-100">
                <td className="px-3 py-2 border-b">{eq.codigo}</td>
                <td className="px-3 py-2 border-b">{eq.descripcion}</td>
                <td className="px-3 py-2 border-b">{eq.categoria?.nombre}</td>
                <td className="px-3 py-2 border-b">{eq.unidad?.nombre}</td>
                <td className="px-3 py-2 border-b">{eq.marca}</td>
                <td className="px-3 py-2 border-b">
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
                <td className="px-3 py-2 border-b">
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
                <td className="px-3 py-2 border-b font-semibold text-green-700">S/ {eq.precioVenta.toFixed(2)}</td>
                <td className="px-3 py-2 border-b">
                  <select
                    className="text-sm border rounded px-1"
                    value={eq.estado}
                    onChange={e => handleEditField(eq.id, 'estado', e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </td>
                <td className="px-3 py-2 border-b flex gap-1">
                  {editandoId === eq.id ? (
                    <>
                      <Button size="icon" onClick={() => guardarEdicion(eq)}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={cancelarEdicion}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="outline" onClick={() => {
                        setEditandoId(eq.id)
                        setNuevoPrecio(eq.precioInterno)
                        setNuevoMargen(eq.margen)
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(eq.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
