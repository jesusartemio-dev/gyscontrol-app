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
  const [loading, setLoading] = useState(false)

  // ✅ Validaciones de negocio (re-evaluadas en cada render)
  const cotizacionAprobada = cotizacion.estado === 'aprobada'
  const tieneCliente = !!cotizacion.cliente?.id
  const tieneComercial = !!cotizacion.comercial?.id
  const puedeCrearProyecto = cotizacionAprobada && tieneCliente && tieneComercial

  // ✅ Validación: fecha requerida + condiciones de negocio + no loading
  const puedeCrear = puedeCrearProyecto && fechaInicio && !loading

  const handleCrear = async () => {
    if (!puedeCrear) return

    setLoading(true)
    try {
      // 📡 Call service to create project from cotización
      const proyecto = await crearProyectoDesdeCotizacion(cotizacion.id, {
        clienteId: cotizacion.cliente!.id,
        comercialId: cotizacion.comercial!.id,
        gestorId: cotizacion.comercial!.id, // ✅ Use comercial as default gestor
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
        fechaFin: undefined
      })

      toast.success('Proyecto creado exitosamente')
      setOpen(false)

      // Reset form
      setFechaInicio('')

      // Navigate to the new project (client-side navigation)
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
          disabled={!puedeCrearProyecto}
          className={`${
            buttonVariant === 'default' && puedeCrearProyecto
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : !puedeCrearProyecto
              ? 'bg-gray-400 cursor-not-allowed text-gray-200'
              : ''
          } ${buttonClassName}`}
          title={!puedeCrearProyecto ? 'La cotización debe estar aprobada y tener cliente/comercial asignados' : undefined}
        >
          {showIcon && <FolderPlus className="h-4 w-4 mr-2" />}
          <span className="hidden sm:inline">
            {!puedeCrearProyecto ? 'Cotización no válida' : 'Crear Proyecto'}
          </span>
          <span className="sm:hidden">
            {!puedeCrearProyecto ? 'No válido' : 'Proyecto'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Crear Proyecto desde Cotización</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Estado de la cotización */}
          <div className={`p-4 border rounded-lg ${
            cotizacionAprobada
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                cotizacionAprobada ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <FolderPlus className={`h-5 w-5 ${
                  cotizacionAprobada ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Estado de la Cotización</p>
                <p className={`text-lg font-semibold ${
                  cotizacionAprobada ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {cotizacionAprobada ? '✅ Aprobada' : '⚠️ Pendiente de Aprobación'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Código: {cotizacion.codigo}
                </p>
              </div>
            </div>
          </div>

          {/* Requisitos para crear proyecto */}
          {!puedeCrearProyecto && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 mb-2">Requisitos faltantes:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {!cotizacionAprobada && (
                  <li>• La cotización debe estar en estado "aprobada"</li>
                )}
                {!tieneCliente && (
                  <li>• La cotización debe tener un cliente asignado</li>
                )}
                {!tieneComercial && (
                  <li>• La cotización debe tener un comercial asignado</li>
                )}
              </ul>
            </div>
          )}

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
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCrear}
            disabled={!puedeCrear || loading}
            className={`${
              puedeCrearProyecto
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-400 cursor-not-allowed text-gray-200'
            }`}
          >
            {loading ? 'Creando...' :
             !puedeCrearProyecto ? 'Cotización no válida' :
             'Crear Proyecto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
