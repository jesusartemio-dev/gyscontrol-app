'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, LayoutList, LayoutGrid, List } from 'lucide-react'

import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import EquiposTableView from '@/components/proyectos/equipos/EquiposTableView'
import EquiposCardView from '@/components/proyectos/equipos/EquiposCardView'
import CrearListaMultipleModal from '@/components/proyectos/equipos/CrearListaMultipleModal'

import { useProyectoContext } from '../ProyectoContext'
import type { ProyectoEquipoCotizado } from '@/types'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

function EquiposSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 pb-3 border-b">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-2 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProyectoEquiposPage() {
  const { proyecto } = useProyectoContext()
  const [equipos, setEquipos] = useState<ProyectoEquipoCotizado[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEquipo, setSelectedEquipo] = useState<ProyectoEquipoCotizado | null>(null)

  useEffect(() => {
    if (!proyecto?.id) return

    const fetchEquipos = async () => {
      try {
        const data = await getProyectoEquipos(proyecto.id)
        setEquipos(data)
      } catch (error) {
        console.error('Error fetching equipos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEquipos()
  }, [proyecto?.id])

  if (!proyecto) return null

  const handleOpenModal = (equipo: ProyectoEquipoCotizado) => {
    setSelectedEquipo(equipo)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedEquipo(null)
  }

  const handleDistribucionCompletada = (listaId: string) => {
    console.log('Lista creada:', listaId)
  }

  const totalItems = equipos.reduce((sum, eq) => sum + (eq.items?.length || 0), 0)
  const totalCosto = equipos.reduce((sum, eq) =>
    sum + (eq.items?.reduce((s, i) => s + (i.precioCliente * i.cantidad), 0) || 0), 0
  )
  const completedItems = equipos.reduce((sum, eq) =>
    sum + (eq.items?.filter(i => i.estado === 'en_lista' || i.estado === 'reemplazado' || i.listaId).length || 0), 0
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Package className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Equipos Cotizados</h2>

        {/* Stats inline */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            {equipos.length} grupos
          </Badge>
          <span className="text-gray-300">|</span>
          <span>{totalItems} items</span>
          <span className="text-gray-300">|</span>
          <span className="text-green-600">{completedItems} en lista</span>
          <span className="text-gray-300">|</span>
          <span className="font-mono text-green-600 font-medium">{formatCurrency(totalCosto)}</span>
        </div>

        <div className="flex-1" />

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-6 px-2 rounded-r-none"
          >
            <LayoutList className="h-3 w-3" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className="h-6 px-2 rounded-l-none"
          >
            <LayoutGrid className="h-3 w-3" />
          </Button>
        </div>

        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
          <Link href={`/proyectos/${proyecto.id}/equipos/listas`}>
            <List className="h-3 w-3 mr-1" />
            Listas
          </Link>
        </Button>
      </div>

      {/* Mobile Stats */}
      <div className="sm:hidden flex items-center justify-between text-xs text-muted-foreground pb-2">
        <span>{equipos.length} grupos · {totalItems} items</span>
        <span className="font-mono text-green-600 font-medium">{formatCurrency(totalCosto)}</span>
      </div>

      {/* Content */}
      {loading ? (
        <EquiposSkeleton />
      ) : equipos.length === 0 ? (
        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
          <div className="text-center">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No hay equipos en este proyecto</p>
            <p className="text-xs text-muted-foreground">Los equipos se importan desde la cotización.</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <EquiposTableView
          equipos={equipos}
          proyectoId={proyecto.id}
          onCreateList={handleOpenModal}
        />
      ) : (
        <EquiposCardView
          equipos={equipos}
          proyectoId={proyecto.id}
          onCreateList={handleOpenModal}
        />
      )}

      {/* Modal */}
      {selectedEquipo && (
        <CrearListaMultipleModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          proyectoEquipo={selectedEquipo as any}
          proyectoId={proyecto.id}
          onDistribucionCompletada={handleDistribucionCompletada}
        />
      )}
    </div>
  )
}
