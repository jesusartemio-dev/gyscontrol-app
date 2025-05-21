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
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { createProyectoEquipoItem, updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import { updateListaEquipoItem, deleteListaEquipoItemByProyectoItemId } from '@/lib/services/listaEquipoItem'
import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ProyectoEquipoItemPayload,
  ProyectoEquipo,
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

export default function ModalReemplazarItemListaCatalogo({
  open,
  onClose,
  item,
  listaId,
  proyectoId,
  onUpdated,
}: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [secciones, setSecciones] = useState<ProyectoEquipo[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState<number>(1)
  const [motivoCambio, setMotivoCambio] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [proyectoEquipoId, setProyectoEquipoId] = useState<string>('')

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
    if (open) fetchData()
  }, [proyectoId, open])

  const handleSeleccionar = (equipo: CatalogoEquipo) => {
    setSelected(equipo)
    setCantidad(1)
  }

  const handleReemplazar = async () => {
    if (!selected || cantidad <= 0 || !proyectoEquipoId || !motivoCambio.trim()) {
      toast.warning('Completa todos los campos requeridos')
      return
    }

    try {
      setLoading(true)

      const payload: ProyectoEquipoItemPayload = {
        proyectoEquipoId,
        catalogoEquipoId: selected.id,
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        categoria: selected.categoria?.nombre ?? 'SIN-CATEGORIA',
        unidad: selected.unidad?.nombre ?? 'UND',
        marca: selected.marca ?? 'SIN-MARCA',
        cantidad,
        precioInterno: selected.precioVenta,
        precioCliente: selected.precioVenta,
        costoInterno: cantidad * selected.precioVenta,
        costoCliente: cantidad * selected.precioVenta,
        nuevo: true,
        motivoCambio,
        listaId,
        estado: 'en_lista',
        equipoOriginalId: item.proyectoEquipoItemId || undefined,
      }

      const nuevoEquipo = await createProyectoEquipoItem(payload)

      // ✅ Eliminar el item anterior de la lista técnica
      if (item.proyectoEquipoItemId) {
        await updateProyectoEquipoItem(item.proyectoEquipoItemId, {
          estado: 'reemplazado',
        })

        await deleteListaEquipoItemByProyectoItemId(item.proyectoEquipoItemId)
      }

      // ✅ Crear el nuevo ítem de lista
      await updateListaEquipoItem(item.id, {
        proyectoEquipoItemId: nuevoEquipo.id,
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad: cantidad,
        presupuesto: selected.precioVenta,
      })

      toast.success('✅ Equipo reemplazado correctamente')
      onUpdated?.()
      onClose()
    } catch (error) {
      console.error('❌ Error al reemplazar equipo:', error)
      toast.error('❌ No se pudo reemplazar el equipo')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const coincideCategoria = categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const coincideTexto =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    return coincideCategoria && coincideTexto
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl">
        <DialogHeader>
          <DialogTitle>♻️ Reemplazar Ítem Técnico</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <Input
            placeholder="🔍 Buscar por código o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <select
            className="border rounded-md px-2 py-1 text-sm"
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

        <ScrollArea className="h-[350px] border rounded-md mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Código</th>
                <th className="p-2">Descripción</th>
                <th className="p-2">Unidad</th>
                <th className="p-2">Precio Venta</th>
                <th className="p-2 text-center">Seleccionar</th>
              </tr>
            </thead>
            <tbody>
              {equiposFiltrados.map((equipo) => (
                <tr
                  key={equipo.id}
                  className={`border-t hover:bg-gray-50 ${selected?.id === equipo.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-2">{equipo.codigo}</td>
                  <td className="p-2">{equipo.descripcion}</td>
                  <td className="p-2">{equipo.unidad.nombre}</td>
                  <td className="p-2">S/. {equipo.precioVenta.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <Button size="sm" variant="outline" onClick={() => handleSeleccionar(equipo)}>
                      Seleccionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {selected && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm text-gray-600">
              <strong>Equipo seleccionado:</strong> {selected.descripcion}
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value))}
                placeholder="Cantidad"
              />
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={proyectoEquipoId}
                onChange={(e) => setProyectoEquipoId(e.target.value)}
              >
                <option value="">— Selecciona equipo del proyecto —</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <textarea
                placeholder="Motivo del cambio o justificación técnica..."
                value={motivoCambio}
                onChange={(e) => setMotivoCambio(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
              />
            </div>
          </div>
        )}

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
