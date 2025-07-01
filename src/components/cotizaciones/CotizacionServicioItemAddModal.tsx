'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { calcularHoras } from '@/lib/utils/formulas'

import type { CatalogoServicio, CategoriaServicio, CotizacionServicioItem, CotizacionServicio } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  servicio: CotizacionServicio
  onAgregarItems: (items: Partial<CotizacionServicioItem>[]) => void
}

export default function CotizacionServicioItemAddModal({
  open,
  onClose,
  servicio,
  onAgregarItems,
}: Props) {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [catalogo, setCatalogo] = useState<CatalogoServicio[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getCategoriasServicio()
      .then((cats) => {
        setCategorias(cats)
        if (cats.length > 0) setCategoriaId(cats[0].id)
      })
      .catch(() => toast.error('Error al cargar categorías'))
  }, [])

  useEffect(() => {
    if (categoriaId) {
      getCatalogoServiciosByCategoriaId(categoriaId)
        .then((res) => {
          const idsExistentes = new Set(servicio.items.map(i => i.catalogoServicioId))
          const filtrado = res.filter(s => !idsExistentes.has(s.id))
          setCatalogo(filtrado)
        })
        .catch(() => toast.error('Error al cargar servicios'))
    }
  }, [categoriaId, servicio.items])

  const handleToggle = (id: string) => {
    setSeleccionados(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleAgregar = () => {
    const seleccionadosIds = Object.entries(seleccionados)
      .filter(([, checked]) => checked)
      .map(([id]) => id)

    const seleccionadosCatalogo = catalogo.filter(s => seleccionadosIds.includes(s.id))

    if (seleccionadosCatalogo.length === 0) {
      toast.warning('No se ha seleccionado ningún servicio')
      return
    }

    const items: Partial<CotizacionServicioItem>[] = seleccionadosCatalogo.map(s => {
      const cantidad = 1
      const horaTotal = calcularHoras({
        formula: s.formula,
        cantidad,
        horaBase: s.horaBase,
        horaRepetido: s.horaRepetido,
        horaUnidad: s.horaUnidad,
        horaFijo: s.horaFijo
      })

      const costoHora = s.recurso.costoHora
      const factorSeguridad = 1.0
      const margen = 1.35
      const costoInterno = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
      const costoCliente = +(costoInterno * margen).toFixed(2)

      return {
        catalogoServicioId: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        categoria: s.categoria.nombre,
        unidadServicioId: s.unidadServicio.id,
        unidadServicioNombre: s.unidadServicio.nombre,
        recursoId: s.recurso.id,
        recursoNombre: s.recurso.nombre,
        formula: s.formula,
        horaBase: s.horaBase ?? 0,
        horaRepetido: s.horaRepetido ?? 0,
        horaUnidad: s.horaUnidad ?? 0,
        horaFijo: s.horaFijo ?? 0,
        costoHora,
        cantidad,
        horaTotal,
        factorSeguridad,
        margen,
        costoInterno,
        costoCliente
      }
    })

    onAgregarItems(items)
    toast.success(`${items.length} servicio(s) agregado(s)`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl z-50">
        <DialogHeader>
          <DialogTitle>➕ Agregar Servicios desde Catálogo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[300px] overflow-y-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left">Seleccionar</th>
                  <th className="p-2 text-left">Servicio</th>
                  <th className="p-2 text-left">Recurso</th>
                </tr>
              </thead>
              <tbody>
                {catalogo.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Checkbox
                        checked={seleccionados[item.id] || false}
                        onCheckedChange={() => handleToggle(item.id)}
                      />
                    </td>
                    <td className="p-2">{item.nombre}</td>
                    <td className="p-2">{item.recurso.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAgregar} disabled={loading}>
            Agregar Servicios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
