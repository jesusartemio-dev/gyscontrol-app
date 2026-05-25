'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, ListFilter, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { exportarEquiposAExcel } from '@/lib/utils/equiposExcel'
import type { CatalogoEquipo } from '@/types'

interface ActiveFilter {
  key: string
  label: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  equiposTotal: CatalogoEquipo[]
  equiposFiltrados: CatalogoEquipo[]
  activeFilters: ActiveFilter[]
}

type Opcion = 'todo' | 'filtrado'

export function ModalExportarCatalogo({ isOpen, onClose, equiposTotal, equiposFiltrados, activeFilters }: Props) {
  const [opcion, setOpcion] = useState<Opcion>('todo')
  const [exportando, setExportando] = useState(false)

  const hasActiveFilters = activeFilters.length > 0

  const handleExportar = async () => {
    const data = opcion === 'filtrado' ? equiposFiltrados : equiposTotal
    setExportando(true)
    try {
      await exportarEquiposAExcel(data)
      toast.success(`${data.length} equipos exportados`)
      onClose()
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !exportando && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Download className="h-4 w-4 text-green-600" />
            Exportar catálogo
          </DialogTitle>
          <DialogDescription className="sr-only">Elige qué equipos exportar</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-1">
          {/* Opción: todo */}
          <button
            onClick={() => setOpcion('todo')}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
              opcion === 'todo'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Database className={cn('h-4 w-4 mt-0.5 shrink-0', opcion === 'todo' ? 'text-green-600' : 'text-gray-400')} />
            <div>
              <p className="text-xs font-medium">Todo el catálogo</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {equiposTotal.length} equipos sin filtrar
              </p>
            </div>
          </button>

          {/* Opción: filtrado */}
          <button
            onClick={() => hasActiveFilters && setOpcion('filtrado')}
            disabled={!hasActiveFilters}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
              !hasActiveFilters && 'opacity-50 cursor-not-allowed',
              opcion === 'filtrado' && hasActiveFilters
                ? 'border-blue-500 bg-blue-50'
                : hasActiveFilters
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200'
            )}
          >
            <ListFilter className={cn('h-4 w-4 mt-0.5 shrink-0', opcion === 'filtrado' ? 'text-blue-600' : 'text-gray-400')} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Solo lo filtrado</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hasActiveFilters
                  ? `${equiposFiltrados.length} equipos con los filtros activos`
                  : 'No hay filtros activos'}
              </p>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {activeFilters.map(f => (
                    <Badge key={f.key} variant="secondary" className="text-[10px] h-4 px-1.5">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={exportando}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700"
            onClick={handleExportar}
            disabled={exportando}
          >
            {exportando
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Exportando...</>
              : <><Download className="h-3.5 w-3.5 mr-1.5" />Descargar Excel</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
