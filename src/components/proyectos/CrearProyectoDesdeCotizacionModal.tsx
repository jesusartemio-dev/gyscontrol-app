'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { FolderPlus } from 'lucide-react'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import type { Cotizacion } from '@/types'

interface Props {
  cotizacion: Cotizacion
  buttonVariant?: 'default' | 'outline' | 'ghost'
  buttonSize?: 'sm' | 'default' | 'lg'
  buttonClassName?: string
  showIcon?: boolean
}

export default function CrearProyectoDesdeCotizacionModal({ 
  cotizacion, 
  buttonVariant = 'default',
  buttonSize = 'default',
  buttonClassName = '',
  showIcon = true
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ Validación: solo fechaInicio es requerida (nombre viene de la cotización)
  const puedeCrear = fechaInicio && !loading

  const handleCrear = async () => {
    if (!puedeCrear) return

    // ✅ Validate required fields before sending
    if (!cotizacion.cliente?.id) {
      toast.error('La cotización debe tener un cliente asignado')
      return
    }

    if (!cotizacion.comercial?.id) {
      toast.error('La cotización debe tener un comercial asignado')
      return
    }

    setLoading(true)
    try {
      // 📡 Call service to create project from cotización
      const proyecto = await crearProyectoDesdeCotizacion(cotizacion.id, {
        clienteId: cotizacion.cliente.id,
        comercialId: cotizacion.comercial.id,
        gestorId: cotizacion.comercial.id, // ✅ Use comercial as default gestor
        cotizacionId: cotizacion.id,
        nombre: cotizacion.nombre, // ✅ Use cotización name automatically
        totalEquiposInterno: cotizacion.totalEquiposInterno,
        totalServiciosInterno: cotizacion.totalServiciosInterno,
        totalGastosInterno: cotizacion.totalGastosInterno,
        totalInterno: cotizacion.totalInterno,
        totalCliente: cotizacion.totalCliente,
        descuento: cotizacion.descuento,
        grandTotal: cotizacion.grandTotal,
        estado: 'creado', // ✅ Use correct enum value
        fechaInicio,
        fechaFin: fechaFin || undefined
      })

      toast.success('Proyecto creado exitosamente')
      setOpen(false)

      // Reset form
      setFechaInicio('')
      setFechaFin('')
      
      // Navigate to the new project
      router.push(`/proyectos/${proyecto.id}`)
    } catch (error) {
      console.error('Error al crear proyecto:', error)
      // ✅ Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear el proyecto'
      toast.error(`Error al crear el proyecto: ${errorMessage}`)
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
          className={`${buttonVariant === 'default' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${buttonClassName}`}
        >
          {showIcon && <FolderPlus className="h-4 w-4 mr-2" />}
          <span className="hidden sm:inline">Crear Proyecto</span>
          <span className="sm:hidden">Proyecto</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Crear Proyecto desde Cotización</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Información del proyecto */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Nombre del Proyecto</p>
                <p className="text-lg font-semibold text-blue-800">{cotizacion.nombre}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Basado en la cotización: {cotizacion.codigo}
                </p>
              </div>
            </div>
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
                min={fechaInicio}
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
