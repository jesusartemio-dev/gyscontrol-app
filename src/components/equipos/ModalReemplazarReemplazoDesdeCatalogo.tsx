// ===================================================
// 📁 Archivo: ModalReemplazarReemplazoDesdeCatalogo.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para reemplazar un ítem que ya es reemplazo
//                por otro equipo del catálogo, manteniendo la trazabilidad
// ===================================================

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
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import {
  createListaEquipoItem,
  deleteListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ListaEquipoItem,
} from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  listaId: string
  proyectoId: string
  onUpdated?: () => void
}

export default function ModalReemplazarReemplazoDesdeCatalogo({
  open,
  onClose,
  item,
  listaId,
  proyectoId,
  onUpdated,
}: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [cantidad, setCantidad] = useState(1)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchData = async () => {
      const [e, c] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriaEquipo(),
      ])
      setEquipos(e)
      setCategorias(c)
    }
    fetchData()
  }, [open])

  const handleSeleccionar = (equipo: CatalogoEquipo) => {
    setSelected(equipo)
    setCantidad(1)
  }

  const handleReemplazar = async () => {
    if (!selected || cantidad <= 0 || !motivoCambio.trim()) {
      toast.warning('Completa todos los campos')
      return
    }

    try {
      setLoading(true)

      const reemplazaProyectoEquipoItemId = item.reemplazaProyectoEquipoItemId
      const tieneCotizaciones = (item.cotizaciones?.length ?? 0) > 0

      if (tieneCotizaciones) {
        await updateListaEquipoItem(item.id, {
          estado: 'rechazado',
          proyectoEquipoItemId: undefined,
        })
      } else {
        await deleteListaEquipoItem(item.id)
      }

      const nuevoItem = await createListaEquipoItem({
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: selected.precioVenta ?? 0,
        comentarioRevision: motivoCambio,
        estado: 'borrador',
        origen: 'reemplazo',
        listaId,
        proyectoEquipoItemId: item.proyectoEquipoItemId ?? undefined,
        proyectoEquipoId: item.proyectoEquipoId ?? undefined,
        reemplazaProyectoEquipoItemId,
      })

      // ✅ Actualiza el ProyectoEquipoItem original para reflejar que fue reemplazado
      if (item.proyectoEquipoItemId) {
        await updateProyectoEquipoItem(item.proyectoEquipoItemId, {
          estado: 'reemplazado',
          motivoCambio: motivoCambio.trim(),
        })
      }

      // ✅ Si el nuevo ítem reemplaza uno planificado, lo actualizamos con el id del nuevo
      if (reemplazaProyectoEquipoItemId && nuevoItem) {
        await updateProyectoEquipoItem(reemplazaProyectoEquipoItemId, {
          listaEquipoSeleccionadoId: nuevoItem.id,
        })
      }

      toast.success('✅ Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()
    } catch (error) {
      console.error('❌ Error al reemplazar ítem:', error)
      toast.error('No se pudo reemplazar el ítem')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const matchCategoria =
      categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const matchTexto =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCategoria && matchTexto
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl">
        <DialogHeader>
          <DialogTitle>🔁 Reemplazar ítem reemplazado por catálogo</DialogTitle>
        </DialogHeader>

        {/* 🔍 Filtro de búsqueda y categoría */}
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Buscar por código o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1 text-sm"
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

        {/* 📋 Tabla de equipos del catálogo */}
        <ScrollArea className="h-[350px] border rounded mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Código</th>
                <th className="p-2">Descripción</th>
                <th className="p-2">Unidad</th>
                <th className="p-2">Precio</th>
                <th className="p-2 text-center">Seleccionar</th>
              </tr>
            </thead>
            <tbody>
              {equiposFiltrados.map((equipo) => (
                <tr
                  key={equipo.id}
                  className={`border-t hover:bg-gray-50 ${
                    selected?.id === equipo.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-2">{equipo.codigo}</td>
                  <td className="p-2">{equipo.descripcion}</td>
                  <td className="p-2">{equipo.unidad?.nombre}</td>
                  <td className="p-2">S/ {equipo.precioVenta?.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSeleccionar(equipo)}
                    >
                      Seleccionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {/* 📝 Detalles del nuevo ítem */}
        {selected && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Seleccionado:</strong> {selected.descripcion}
            </p>
            <Input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value))}
              placeholder="Cantidad"
            />
            <textarea
              placeholder="Motivo o justificación técnica..."
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
            />
          </div>
        )}

        {/* ✅ Botones de acción */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleReemplazar}
            disabled={!selected || loading || !motivoCambio.trim()}
          >
            {loading ? 'Guardando...' : 'Reemplazar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
