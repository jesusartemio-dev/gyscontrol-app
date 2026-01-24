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

import { getEdts } from '@/lib/services/edt'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { calcularHoras } from '@/lib/utils/formulas'

import type { CatalogoServicio, Edt, CotizacionServicioItem, CotizacionServicio } from '@/types'

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
  const [catalogo, setCatalogo] = useState<CatalogoServicio[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Find the EDT ID that matches the servicio's EDT
    const edtId = servicio.edtId || servicio.edt?.id
    if (!edtId) {
      toast.error('No se encontró EDT para este servicio')
      return
    }

    getCatalogoServiciosByCategoriaId(edtId)
      .then((res) => {
        const idsExistentes = new Set((servicio.items || []).map(i => i.catalogoServicioId))
        const filtrado = res.filter(s => !idsExistentes.has(s.id))
        setCatalogo(filtrado)
      })
      .catch(() => toast.error('Error al cargar servicios del EDT'))
  }, [servicio.edtId, servicio.edt?.id, servicio.items])

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

      const costoHora = s.recurso?.costoHora || 0
      const factorSeguridad = 1.0
      const margen = 1.35
      const costoInterno = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
      const costoCliente = +(costoInterno * margen).toFixed(2)

      return {
        catalogoServicioId: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        edtId: s.edt?.id || s.categoriaId,
        unidadServicioId: s.unidadServicio?.id || '',
        unidadServicioNombre: s.unidadServicio?.nombre || '',
        recursoId: s.recurso?.id || '',
        recursoNombre: s.recurso?.nombre || '',
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
          <DialogTitle>➕ Agregar Servicios - {servicio.edt?.nombre || servicio.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Agregando servicios del EDT: <strong>{servicio.edt?.nombre || servicio.nombre}</strong>
            </p>
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
                    <td className="p-2">{item.recurso?.nombre || 'Sin recurso'}</td>
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
