'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Building2,
  FileText,
  Package,
  Mail,
  Plus,
  ChevronRight,
  ChevronDown,
  History
} from 'lucide-react'
import type { CotizacionProveedor } from '@/types'
import CotizacionProveedorHistorial from '@/components/logistica/CotizacionProveedorHistorial'
import CotizacionEstadoFlujoBanner from '@/components/logistica/CotizacionEstadoFlujoBanner'
import CotizacionProveedorTabla from '@/components/logistica/CotizacionProveedorTabla'
import ModalAgregarItemCotizacionProveedor from '@/components/logistica/ModalAgregarItemCotizacionProveedor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CotizacionProveedorDetailPage({ params }: PageProps) {
  const { data: session } = useSession()
  const [cotizacion, setCotizacion] = useState<CotizacionProveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [cotizacionId, setCotizacionId] = useState('')
  const [showAgregarItems, setShowAgregarItems] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)

  useEffect(() => {
    params.then((p) => setCotizacionId(p.id))
  }, [params])

  useEffect(() => {
    if (!cotizacionId) return

    const fetchData = async () => {
      try {
        const data = await getCotizacionProveedorById(cotizacionId)
        if (!data) {
          notFound()
          return
        }
        setCotizacion(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [cotizacionId])

  const handleRefresh = async () => {
    if (!cotizacionId) return
    try {
      const updated = await getCotizacionProveedorById(cotizacionId)
      if (updated) setCotizacion(updated)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSolicitarCotizacion = () => {
    if (!cotizacion?.proveedor?.correo) {
      toast.error('El proveedor no tiene correo')
      return
    }

    const subject = `Solicitud de Cotización - ${cotizacion.codigo}`
    const itemsList = cotizacion.items?.map(item =>
      `• ${item.descripcion} (${item.codigo}) - ${item.cantidad} ${item.unidad}`
    ).join('\n') || ''

    const body = `Estimado ${cotizacion.proveedor.nombre},

Solicitamos cotización para:

${itemsList}

Proyecto: ${cotizacion.proyecto?.codigo} - ${cotizacion.proyecto?.nombre}
Cotización: ${cotizacion.codigo}

Saludos,
Equipo de Compras`

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cotizacion.proveedor.correo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank')
  }

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-gray-100 text-gray-700',
      solicitado: 'bg-blue-100 text-blue-700',
      cotizado: 'bg-purple-100 text-purple-700',
      seleccionado: 'bg-green-100 text-green-700',
      rechazado: 'bg-red-100 text-red-700',
    }
    return styles[estado] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!cotizacion) notFound()

  const stats = {
    totalItems: cotizacion.items?.length || 0,
    totalCost: cotizacion.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0,
    selectedItems: cotizacion.items?.filter(item => item.esSeleccionada).length || 0,
    itemsSinPrecio: cotizacion.items?.filter(item => !item.precioUnitario).length || 0,
  }

  const estado = cotizacion.estado || 'pendiente'
  const esEstadoFinal = estado === 'rechazado' || estado === 'seleccionado'

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/logistica" className="hover:text-foreground">Logística</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/logistica/cotizaciones" className="hover:text-foreground">Cotizaciones</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{cotizacion.codigo}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/logistica/cotizaciones">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold">{cotizacion.codigo}</h1>
                    <Badge className={`text-[10px] h-5 ${getEstadoBadge(estado)}`}>
                      {estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{cotizacion.proveedor?.nombre || 'Sin proveedor'}</span>
                    <span>·</span>
                    <span>{cotizacion.proyecto?.nombre}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!esEstadoFinal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgregarItems(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Items
                </Button>
              )}
              {(estado === 'pendiente' || estado === 'solicitado') && cotizacion.proveedor?.correo && (
                <Button
                  size="sm"
                  onClick={handleSolicitarCotizacion}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Solicitar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats inline */}
        <div className="px-4 py-1.5 border-t bg-gray-50/50 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Items:</span>
            <span className="font-semibold">{stats.totalItems}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">
              ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {stats.selectedItems > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Seleccionados:</span>
              <span className="font-semibold text-green-600">{stats.selectedItems}</span>
            </div>
          )}
          {stats.itemsSinPrecio > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sin precio:</span>
              <span className="font-semibold text-amber-600">{stats.itemsSinPrecio}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Estado flujo */}
        <CotizacionEstadoFlujoBanner
          estado={estado}
          cotizacionId={cotizacionId}
          cotizacionNombre={cotizacion.codigo}
          usuarioId={session?.user?.id}
          onUpdated={(nuevoEstado: string) => {
            setCotizacion(prev => prev ? { ...prev, estado: nuevoEstado as any } : null)
          }}
        />

        {/* Items table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {cotizacion.items && cotizacion.items.length > 0 ? (
            <CotizacionProveedorTabla
              items={cotizacion.items}
              onItemUpdated={(updatedItem) => {
                setCotizacion(prev => prev ? {
                  ...prev,
                  items: prev.items?.map(item =>
                    item.id === updatedItem.id ? updatedItem : item
                  ) || []
                } : null)
              }}
              onUpdated={handleRefresh}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-2"
                onClick={() => setShowAgregarItems(true)}
              >
                Agregar items
              </Button>
            </div>
          )}
        </div>

        {/* Historial colapsable */}
        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Historial</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
          </button>
          {showHistorial && (
            <div className="px-4 pb-4 border-t">
              <CotizacionProveedorHistorial
                cotizacionId={cotizacionId}
                entidadTipo="COTIZACION_PROVEEDOR"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <ModalAgregarItemCotizacionProveedor
        open={showAgregarItems}
        onClose={() => setShowAgregarItems(false)}
        cotizacion={cotizacion}
        proyectoId={cotizacion.proyectoId || ''}
        onAdded={handleRefresh}
      />
    </div>
  )
}
