'use client'

import { useState } from 'react'
import { Recurso } from '@/types'
import { deleteRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Edit,
  Trash2,
  Users,
  Loader2,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data?: Recurso[]
  onEdit?: (r: Recurso) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function RecursoCardView({ data, onEdit, onDelete, loading = false, error = null }: Props) {
  const [eliminando, setEliminando] = useState<string | null>(null)

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteRecurso(id)
      toast.success('Recurso eliminado correctamente')
      onDelete?.(id)
    } catch (error) {
      console.error('Error al eliminar recurso:', error)
      toast.error('Error al eliminar el recurso')
    } finally {
      setEliminando(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-medium mb-1">No hay recursos</h3>
        <p className="text-sm text-muted-foreground">
          Comienza agregando tu primer recurso
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {data.map((recurso) => (
        <Card key={recurso.id} className="hover:shadow-md transition-shadow hover:border-blue-300">
          <CardContent className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-sm truncate flex-1 pr-2">
                {recurso.nombre}
              </h3>
              {eliminando === recurso.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-500 shrink-0" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(recurso)}>
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => eliminar(recurso.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Cost */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-green-600 font-mono">
                {formatCurrency(recurso.costoHora)}
              </span>
              <span className="text-[10px] text-muted-foreground">/hora</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}