'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Plus,
  Package,
  ArrowRight,
  X,
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { getLogisticaListaById } from '@/lib/services/logisticaLista'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import { flujoEstados, estadoLabels, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import LogisticaListaDetalleItemTableProfessional from '@/components/logistica/LogisticaListaDetalleItemTableProfessional'
import ModalCrearCotizacionDesdeLista from '@/components/logistica/ModalCrearCotizacionDesdeLista'
import type { ListaEquipo } from '@/types'

export default function LogisticaListaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [lista, setLista] = useState<ListaEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCrearCotizacion, setShowCrearCotizacion] = useState(false)
  const [updatingEstado, setUpdatingEstado] = useState(false)
  const [openRechazo, setOpenRechazo] = useState(false)
  const [openConfirmAvanzar, setOpenConfirmAvanzar] = useState(false)
  const [justificacion, setJustificacion] = useState('')

  const handleRefetch = async () => {
    try {
      const data = await getLogisticaListaById(id)
      if (data) setLista(data)
      else toast.error('No se encontró la lista')
    } catch {
      toast.error('Error al refrescar lista')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await handleRefetch()
      setLoading(false)
    }
    fetchData()
  }, [id])

  const rol = session?.user?.role || ''
  const flujo = lista ? flujoEstados[lista.estado as EstadoListaEquipo] : null
  const puedeAvanzar = !!flujo?.siguiente && flujo.roles.includes(rol)
  const puedeRechazar = !!flujo?.rechazar && flujo.roles.includes(rol)

  const handleAvanzarEstado = async () => {
    if (!lista || !flujo?.siguiente) return
    try {
      setUpdatingEstado(true)
      await updateListaEstado(lista.id, flujo.siguiente)
      toast.success(`Estado actualizado a "${estadoLabels[flujo.siguiente]}"`)
      handleRefetch()
    } catch (error: any) {
      toast.error(error?.message || 'Error al avanzar estado')
    } finally {
      setUpdatingEstado(false)
    }
  }

  const handleRechazar = async () => {
    if (!lista || !flujo?.rechazar || justificacion.trim().length < 10) return
    try {
      setUpdatingEstado(true)
      await updateListaEstado(lista.id, flujo.rechazar, justificacion.trim())
      toast.success('Lista rechazada')
      setJustificacion('')
      setOpenRechazo(false)
      handleRefetch()
    } catch (error: any) {
      toast.error(error?.message || 'Error al rechazar')
    } finally {
      setUpdatingEstado(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      borrador: 'bg-gray-100 text-gray-700',
      por_revisar: 'bg-yellow-100 text-yellow-700',
      por_cotizar: 'bg-blue-100 text-blue-700',
      por_validar: 'bg-purple-100 text-purple-700',
      por_aprobar: 'bg-orange-100 text-orange-700',
      aprobada: 'bg-green-100 text-green-700',
      rechazada: 'bg-red-100 text-red-700',
      enviada: 'bg-cyan-100 text-cyan-700',
      completada: 'bg-emerald-100 text-emerald-700',
    }
    return styles[estado] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!lista) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">Lista no encontrada</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" asChild>
            <Link href="/logistica/listas">Volver a Listas</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Use lista.items (transformed with cotizaciones) or fallback to listaEquipoItem
  const items = (lista as any).items || lista.listaEquipoItem || []

  // Pricing stats
  const totalItems = items.length
  const itemsSinPrecio = items.filter((i: any) => !i.precioElegido && !i.cotizacionSeleccionadaId).length
  const itemsSinCotizacion = items.filter((i: any) => {
    const cots = i.cotizaciones || i.cotizacionProveedorItems || []
    return cots.length === 0
  }).length
  const faltanPrecios = totalItems > 0 && itemsSinPrecio > 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/logistica" className="hover:text-foreground">Logística</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/logistica/listas" className="hover:text-foreground">Listas</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{lista.codigo}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/logistica/listas">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold">{lista.codigo}</h1>
                    <Badge className={`text-[10px] h-5 ${getEstadoBadge(lista.estado)}`}>
                      {lista.estado?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {lista.proyecto?.nombre || 'Sin proyecto'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCrearCotizacion(true)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Cotización
              </Button>
              {puedeAvanzar && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (faltanPrecios) {
                      setOpenConfirmAvanzar(true)
                    } else {
                      handleAvanzarEstado()
                    }
                  }}
                  disabled={updatingEstado}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  {updatingEstado ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3 w-3 mr-1" />
                  )}
                  Avanzar
                </Button>
              )}
              {puedeRechazar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenRechazo(true)}
                  disabled={updatingEstado}
                  className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-3 w-3 mr-1" />
                  Rechazar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Warning: items sin precios */}
        {faltanPrecios && puedeAvanzar && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{itemsSinPrecio} de {totalItems}</strong> items no tienen precio asignado
              {itemsSinCotizacion > 0 && (
                <> ({itemsSinCotizacion} sin cotizaciones)</>
              )}
              . Asigna cotizaciones y selecciona precios antes de avanzar.
            </span>
          </div>
        )}

        {/* Items table */}
        {items.length > 0 ? (
          <LogisticaListaDetalleItemTableProfessional
            items={items}
            onUpdated={handleRefetch}
          />
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items en esta lista</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cotización */}
      {lista.proyecto && (
        <ModalCrearCotizacionDesdeLista
          open={showCrearCotizacion}
          onClose={() => setShowCrearCotizacion(false)}
          lista={lista}
          proyecto={lista.proyecto}
          onCreated={() => {
            toast.success('Cotización creada')
            handleRefetch()
          }}
        />
      )}

      {/* Dialog Confirmar Avanzar sin precios */}
      <AlertDialog open={openConfirmAvanzar} onOpenChange={setOpenConfirmAvanzar}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Items sin precio asignado
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Hay <strong>{itemsSinPrecio} de {totalItems}</strong> items que no tienen precio asignado.
                </p>
                {itemsSinCotizacion > 0 && (
                  <p>{itemsSinCotizacion} items no tienen ninguna cotización creada.</p>
                )}
                <p className="text-amber-600">
                  Se recomienda asignar precios y tiempos de entrega a todos los items antes de avanzar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingEstado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleAvanzarEstado()
                setOpenConfirmAvanzar(false)
              }}
              disabled={updatingEstado}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Avanzar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Rechazo */}
      <AlertDialog open={openRechazo} onOpenChange={setOpenRechazo}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar esta lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Indica la razón del rechazo para que el equipo pueda hacer correcciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Justificación *
            </label>
            <Textarea
              placeholder="Describe las razones del rechazo..."
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingEstado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRechazar}
              disabled={updatingEstado || justificacion.trim().length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              {updatingEstado ? 'Rechazando...' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
