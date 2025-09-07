'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ Validación: nombre, código y fecha de inicio son obligatorios
  const puedeCrear = nombre.trim() !== '' && codigo.trim() !== '' && fechaInicio.trim() !== ''

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
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: fechaFin ? new Date(fechaFin).toISOString() : undefined,
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

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del proyecto *</Label>
            <Input
              id="nombre"
              placeholder="Ingrese el nombre del proyecto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="codigo">Código del proyecto *</Label>
            <Input
              id="codigo"
              placeholder="Ingrese el código del proyecto"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha de fin (opcional)</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full"
                min={fechaInicio} // ✅ La fecha fin no puede ser anterior a la fecha inicio
              />
            </div>
          </div>
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
