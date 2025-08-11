// ===================================================
// 📁 Archivo: ModalReemplazarItemDesdeCatalogo.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para reemplazar un ítem "cotizado" por otro del catálogo
// ✅ Lógica:
//     - Crea un nuevo ListaEquipoItem con origen "reemplazo"
//     - Copia tanto proyectoEquipoItemId como reemplazaProyectoEquipoItemId desde el ítem original
//     - Actualiza ProyectoEquipoItem para apuntar al nuevo ítem
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
import {
  createListaEquipoItem,
  deleteListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ListaEquipoItem,
} from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  proyectoId: string
  listaId: string
  onUpdated?: () => void
}

export default function ModalReemplazarItemDesdeCatalogo({
  open,
  onClose,
  item,
  proyectoId,
  listaId,
  onUpdated,
}: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
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
    if (!selected || !cantidad || cantidad <= 0 || !motivoCambio.trim()) {
      toast.warning('Completa todos los campos')
      return
    }

    if (item.origen !== 'cotizado') {
      toast.error('Este modal solo aplica a ítems con origen "cotizado"')
      return
    }

    try {
      setLoading(true)

      const tieneCotizaciones = item.cotizaciones && item.cotizaciones.length > 0
      const proyectoEquipoItemId = item.proyectoEquipoItemId ?? undefined

      if (tieneCotizaciones) {
        // ✅ Ítem tiene cotizaciones → solo se rechaza y desvincula
        await updateListaEquipoItem(item.id, {
          estado: 'rechazado',
          proyectoEquipoItemId: undefined,
        })
      } else {
        // ✅ Ítem sin cotizaciones → se elimina
        await deleteListaEquipoItem(item.id)
      }

      // ✅ Crear nuevo ítem con origen "reemplazo" y doble vínculo al ProyectoEquipoItem original
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
        proyectoEquipoItemId: proyectoEquipoItemId,
        proyectoEquipoId: item.proyectoEquipoId,
        reemplazaProyectoEquipoItemId: proyectoEquipoItemId,
      })

      // ✅ Actualizar ProyectoEquipoItem para que apunte al nuevo ítem
      if (proyectoEquipoItemId && nuevoItem) {
          await updateProyectoEquipoItem(proyectoEquipoItemId, {
            listaEquipoSeleccionadoId: nuevoItem.id,
            listaId: listaId,
            estado: 'reemplazado',
            motivoCambio: motivoCambio.trim(),
          })
      }

      toast.success('Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()

    } catch (error) {
      console.error('Error al reemplazar ítem:', error)
      toast.error('No se pudo reemplazar el ítem')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const coincideCategoria =
      categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const coincideTexto =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    return coincideCategoria && coincideTexto
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            🔄 Reemplazar ítem de cotización por catálogo
          </DialogTitle>
        </DialogHeader>

        {/* 🔎 Filtros de búsqueda */}
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

        {/* 📋 Tabla de equipos disponibles */}
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

        {/* 📝 Datos adicionales del reemplazo */}
        {selected && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Seleccionado:</strong> {selected.descripcion}
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value))}
                placeholder="Cantidad"
              />
            </div>
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
