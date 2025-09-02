'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionGenerarButton.tsx
// 📌 Descripción: Botón final para generar la cotización en backend (optimizado con bulk)
// 🧠 Uso: Envía todos los ítems seleccionados al servidor (CotizacionProveedor + CotizacionProveedorItem)
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-30 (ajustes de estados y presupuesto)
// ===================================================

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  createCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'
import {
  createMultipleCotizacionProveedorItems,
} from '@/lib/services/cotizacionProveedorItem'
import type { ListaEquipoItem, EstadoCotizacionProveedor } from '@/types'
import { Button } from '@/components/ui/button'

interface Props {
  proyectoId: string
  proveedorId: string
  selectedItems: Record<string, { item: ListaEquipoItem; cantidad: number }>
}

export default function LogisticaCotizacionGenerarButton({
  proyectoId,
  proveedorId,
  selectedItems,
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.warning('Selecciona al menos un ítem antes de generar.')
      return
    }

    try {
      setLoading(true)

      // 1️⃣ Crear cotización principal (el backend generará el código)
      const cotizacion = await createCotizacionProveedor({
        proyectoId,
        proveedorId,
      })

      if (!cotizacion) {
        toast.error('Error al crear cotización principal.')
        return
      }

      // 2️⃣ Preparar payload masivo
      const itemsPayload = Object.values(selectedItems).map(({ item, cantidad }) => ({
        cotizacionId: cotizacion.id,
        listaEquipoItemId: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidadOriginal: item.cantidad,
        precioUnitario: 0,                                   // ✅ inicia en cero
        cantidad,
        costoTotal: 0,                                       // ✅ inicia en cero
        tiempoEntrega: '',
        estado: 'pendiente' as EstadoCotizacionProveedor,    // ✅ estado inicial
        esSeleccionada: false,                               // ✅ aún no seleccionado
      }))

      const result = await createMultipleCotizacionProveedorItems(itemsPayload)

      if (result) {
        toast.success('Cotización generada correctamente.')
        router.push('/logistica/cotizaciones')
      } else {
        toast.error('Error al generar ítems de la cotización.')
      }
    } catch (err) {
      console.error('Error al generar cotización:', err)
      toast.error('Error al generar cotización.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      className="w-full bg-green-600 text-white"
    >
      {loading ? 'Generando...' : '✅ Generar Cotización'}
    </Button>
  )
}
