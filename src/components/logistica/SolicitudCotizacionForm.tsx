// ===================================================
// 📁 Archivo: SolicitudCotizacionForm.tsx
// 🖌️ Descripción: Formulario para generar solicitud de cotización (correo)
// 🧰 Uso: En logística, para seleccionar items y generar mensaje para proveedor
// ✍️ Autor: IA GYS + Jesús Artemio
// 🗓️ Última actualización: 2025-05-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { ListaEquipoItem } from '@/types'
import { getListaEquipoItemsByProyecto } from '@/lib/services/listaEquipoItem'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  proyectoId: string
  proveedorCorreo: string
  proyectoNombre: string
}

export default function SolicitudCotizacionForm({ proyectoId, proveedorCorreo, proyectoNombre }: Props) {
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mensaje, setMensaje] = useState<string>('')

  useEffect(() => {
    const cargarItems = async () => {
      const data = await getListaEquipoItemsByProyecto(proyectoId)
      setItems(data)
    }
    cargarItems()
  }, [proyectoId])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const generarMensaje = () => {
    const seleccionadosItems = items.filter((i) => seleccionados.has(i.id))
    if (seleccionadosItems.length === 0) {
      toast.warning('Selecciona al menos un ítem para cotizar')
      return
    }

    const texto = `Estimado proveedor,\n\nSolicitamos atentamente la cotización de los siguientes ítems:\n\n` +
      seleccionadosItems
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.descripcion} (Código: ${item.codigo}) - Cant: ${item.cantidad} ${item.unidad}`
        )
        .join('\n') +
      `\n\nPor favor incluir precio unitario, tiempo de entrega y condiciones.\n\nGracias.`

    setMensaje(texto)
  }

  const abrirGmail = () => {
    const seleccionadosItems = items.filter((i) => seleccionados.has(i.id))
    if (!proveedorCorreo || seleccionadosItems.length === 0) {
      toast.error('Falta proveedor o ítems seleccionados')
      return
    }

    const asunto = `Solicitud de Cotización – Proyecto ${proyectoNombre}`
    const cuerpo = `Estimado proveedor,\n\nSolicitamos atentamente la cotización de los siguientes ítems para el proyecto ${proyectoNombre}:\n\n` +
      seleccionadosItems
        .map((item, i) => `${i + 1}. ${item.descripcion} (${item.codigo}) - ${item.cantidad} ${item.unidad}`)
        .join('\n') +
      `\n\nAgradeceremos indicar precio unitario, tiempo de entrega y condiciones.\n\nSaludos,\nÁrea de Logística – GYS`

    const url = new URL('https://mail.google.com/mail/u/0/')
    url.searchParams.set('view', 'cm')
    url.searchParams.set('fs', '1')
    url.searchParams.set('to', proveedorCorreo)
    url.searchParams.set('su', asunto)
    url.searchParams.set('body', cuerpo)

    window.open(url.toString(), '_blank')
  }

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-white shadow-sm">
      <h2 className="text-lg font-semibold">Solicitar Cotización</h2>

      <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded-md">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={seleccionados.has(item.id)}
              onCheckedChange={() => toggleSeleccion(item.id)}
            />
            <span>
              {item.descripcion} <span className="text-gray-500">({item.codigo})</span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button onClick={generarMensaje} className="bg-blue-600 text-white">
          📝 Generar Mensaje
        </Button>
        <Button onClick={abrirGmail} className="bg-red-600 text-white">
          📧 Enviar por Gmail
        </Button>
      </div>

      {mensaje && (
        <div className="space-y-2">
          <Label>Mensaje sugerido:</Label>
          <Textarea rows={10} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </div>
      )}
    </div>
  )
}
