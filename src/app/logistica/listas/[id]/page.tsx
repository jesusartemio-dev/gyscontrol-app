'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Plus,
  Package,
  CheckCircle,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { getLogisticaListaById } from '@/lib/services/logisticaLista'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import LogisticaListaDetalleItemTableProfessional from '@/components/logistica/LogisticaListaDetalleItemTableProfessional'
import ModalCrearCotizacionDesdeLista from '@/components/logistica/ModalCrearCotizacionDesdeLista'
import type { ListaEquipo } from '@/types'

export default function LogisticaListaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [lista, setLista] = useState<ListaEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCrearCotizacion, setShowCrearCotizacion] = useState(false)
  const [updatingEstado, setUpdatingEstado] = useState(false)

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

  const handleAvanzarEstado = async () => {
    if (!lista) return
    try {
      setUpdatingEstado(true)
      const updated = await updateListaEstado(lista.id, 'por_validar')
      if (updated) {
        toast.success('Estado actualizado')
        handleRefetch()
      } else {
        toast.error('Error al actualizar')
      }
    } catch {
      toast.error('Error al avanzar estado')
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
              {lista.estado === 'por_cotizar' && (
                <Button
                  size="sm"
                  onClick={handleAvanzarEstado}
                  disabled={updatingEstado}
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                >
                  {updatingEstado ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  Avanzar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
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

      {/* Modal */}
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
    </div>
  )
}
