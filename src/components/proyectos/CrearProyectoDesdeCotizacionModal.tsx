'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
}

export default function CrearProyectoDesdeCotizacionModal({ cotizacion }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  const puedeCrear = nombre.trim() !== '' && codigo.trim() !== ''

  const handleCrear = async () => {
    if (!puedeCrear) return
    setLoading(true)

    try {
      const proyecto = await crearProyectoDesdeCotizacion(cotizacion.id, {
        clienteId: cotizacion.cliente?.id ?? '',
        comercialId: cotizacion.comercial?.id ?? '',
        gestorId: cotizacion.comercial?.id ?? '',
        cotizacionId: cotizacion.id,
        nombre,
        codigo,
        estado: 'pendiente',
        fechaInicio: new Date().toISOString(),
        totalEquiposInterno: cotizacion.totalEquiposInterno,
        totalServiciosInterno: cotizacion.totalServiciosInterno,
        totalGastosInterno: cotizacion.totalGastosInterno,
        totalInterno: cotizacion.totalInterno,
        totalCliente: cotizacion.totalCliente,
        descuento: cotizacion.descuento,
        grandTotal: cotizacion.grandTotal,
      })

      toast.success('Proyecto creado correctamente')
      router.push(`/proyectos/${proyecto.id}`)
      setOpen(false)
    } catch (err) {
      console.error('❌ Error al crear proyecto:', err)
      toast.error('Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          Crear Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Crear Proyecto desde Cotización</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Nombre del proyecto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            placeholder="Código del proyecto"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCrear}
            disabled={!puedeCrear || loading}
            className="bg-purple-600 text-white"
          >
            {loading ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
