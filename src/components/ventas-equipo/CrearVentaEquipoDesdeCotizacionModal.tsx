'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Package } from 'lucide-react'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
  buttonVariant?: 'default' | 'outline' | 'ghost'
  buttonSize?: 'sm' | 'default' | 'lg'
  buttonClassName?: string
  showIcon?: boolean
}

export default function CrearVentaEquipoDesdeCotizacionModal({
  cotizacion,
  buttonVariant = 'default',
  buttonSize = 'default',
  buttonClassName = '',
  showIcon = true,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(cotizacion.nombre)
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)

  const cotizacionAprobada = cotizacion.estado === 'aprobada'
  const tieneEquipos = (cotizacion.totalEquiposCliente ?? 0) > 0
  const puedeCrear = cotizacionAprobada && tieneEquipos

  const handleCrear = async () => {
    if (!puedeCrear || loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/venta-equipo/from-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacionId: cotizacion.id,
          nombre: nombre.trim() || cotizacion.nombre,
          fechaEntregaEstimada: fechaEntregaEstimada || undefined,
          observacion: observacion.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear la venta de equipos')
      }

      const data = await res.json()
      toast.success('Venta de equipos creada exitosamente')
      setOpen(false)
      router.push(`/comercial/ventas-equipos/${data.id}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={!puedeCrear}
          className={`${
            buttonVariant === 'default' && puedeCrear
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : !puedeCrear
              ? 'opacity-50 cursor-not-allowed'
              : ''
          } ${buttonClassName}`}
          title={
            !cotizacionAprobada
              ? 'La cotización debe estar aprobada'
              : !tieneEquipos
              ? 'La cotización no tiene equipos'
              : undefined
          }
        >
          {showIcon && <Package className="h-4 w-4 mr-2" />}
          <span className="hidden sm:inline">Crear Venta Equipos</span>
          <span className="sm:hidden">Equipos</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Crear Venta de Equipos</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Estado */}
          <div className={`p-4 border rounded-lg ${
            cotizacionAprobada ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cotizacionAprobada ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Package className={`h-5 w-5 ${cotizacionAprobada ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Estado de la Cotización</p>
                <p className={`text-lg font-semibold ${cotizacionAprobada ? 'text-green-800' : 'text-yellow-800'}`}>
                  {cotizacionAprobada ? '✅ Aprobada' : '⚠️ Pendiente de Aprobación'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Código: {cotizacion.codigo}</p>
              </div>
            </div>
          </div>

          {/* Requisitos faltantes */}
          {!puedeCrear && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 mb-2">Requisitos faltantes:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {!cotizacionAprobada && <li>• La cotización debe estar en estado &quot;aprobada&quot;</li>}
                {!tieneEquipos && <li>• La cotización debe tener al menos un equipo</li>}
              </ul>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la venta *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre descriptivo"
            />
          </div>

          {/* Fecha entrega estimada */}
          <div className="space-y-2">
            <Label htmlFor="fechaEntrega">Fecha de entrega estimada</Label>
            <Input
              id="fechaEntrega"
              type="date"
              value={fechaEntregaEstimada}
              onChange={(e) => setFechaEntregaEstimada(e.target.value)}
            />
          </div>

          {/* Observación */}
          <div className="space-y-2">
            <Label htmlFor="observacion">Observaciones</Label>
            <Textarea
              id="observacion"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCrear}
            disabled={!puedeCrear || !nombre.trim() || loading}
            className={puedeCrear ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          >
            {loading ? 'Creando...' : 'Crear Venta de Equipos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
