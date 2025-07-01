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
import {
  updateProyectoEquipoItem,
  createProyectoEquipoItem,
} from '@/lib/services/proyectoEquipoItem'
import {
  reemplazarItemLista,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ProyectoEquipo,
  ListaEquipoItem,
} from '@/types'
import { EstadoListaItem, OrigenListaItem } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  listaId: string
  proyectoId: string
  onUpdated?: () => void
}

export default function ModalReemplazarItemDesdeCatalogo({
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

  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [proyectoEquipoId, setProyectoEquipoId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchData = async () => {
      const [e, c, s] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriaEquipo(),
        getProyectoEquipos(proyectoId),
      ])
      setEquipos(e)
      setCategorias(c)
      setSecciones(s)
    }
    fetchData()
  }, [open, proyectoId])

  const handleSeleccionar = (equipo: CatalogoEquipo) => {
    setSelected(equipo)
    setCantidad(1)
  }

  const handleReemplazar = async () => {
    if (!selected || cantidad <= 0 || !motivoCambio.trim() || !proyectoEquipoId) {
      toast.warning('Completa todos los campos')
      return
    }

    try {
      setLoading(true)

      const idAntiguo = item.proyectoEquipoItemId ?? undefined

      if (idAntiguo) {
        await updateProyectoEquipoItem(idAntiguo, {
          estado: 'reemplazado',
          nuevo: false,
        })
      }

      const nuevoPEI = await createProyectoEquipoItem({
        proyectoEquipoId,
        catalogoEquipoId: selected.id,
        equipoOriginalId: idAntiguo,
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        categoria: selected.categoria?.nombre ?? 'SIN-CATEGORIA',
        marca: selected.marca ?? 'SIN-MARCA',
        cantidad,
        precioInterno: selected.precioInterno ?? 0,
        precioCliente: selected.precioVenta ?? 0,
        costoInterno: (selected.precioInterno ?? 0) * cantidad,
        costoCliente: (selected.precioVenta ?? 0) * cantidad,
        estado: 'reemplazado',
        nuevo: true,
        motivoCambio,
      })

        const payload = {
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: selected.precioVenta ?? 0,
        comentarioRevision: motivoCambio,
        estado: 'borrador' as EstadoListaItem, // ✅ CORREGIDO
        origen: 'reemplazo' as OrigenListaItem,
        proyectoEquipoItemId: nuevoPEI.id,
        reemplazaAId: idAntiguo,
        listaId,
        }

        await reemplazarItemLista(item.id, payload)
        await updateListaEquipoItem(item.id, {
        estado: 'borrador' as EstadoListaItem, // ✅ CORREGIDO
})



      toast.success('✅ Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()
    } catch (error) {
      console.error('Error al reemplazar item:', error)
      toast.error('❌ No se pudo reemplazar el ítem')
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
          <DialogTitle>🔄 Reemplazar ítem cotizado por catálogo</DialogTitle>
        </DialogHeader>

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
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={proyectoEquipoId}
                onChange={(e) => setProyectoEquipoId(e.target.value)}
              >
                <option value="">— Selecciona sección —</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
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
