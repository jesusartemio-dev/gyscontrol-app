/**
 * 📄 Componente de Paginación de Datos Avanzado
 * 
 * Funcionalidades:
 * - Navegación completa por páginas
 * - Selector de límite de items por página
 * - Información detallada de registros
 * - Salto directo a páginas específicas
 * - Diseño responsive y accesible
 * - Integración con APIs paginadas del sistema GYS
 * 
 * @author Sistema GYS
 * @version 1.0.0
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaginationMeta } from '@/types/payloads'

// 🎨 Interfaces del componente
interface DataPaginationProps {
  /** Metadatos de paginación de la API */
  pagination: PaginationMeta
  /** Función para cambiar página */
  onPageChange: (page: number) => void
  /** Función para cambiar límite de items */
  onLimitChange?: (limit: number) => void
  /** Opciones de límite disponibles */
  limitOptions?: number[]
  /** Mostrar selector de límite */
  showLimitSelector?: boolean
  /** Mostrar información de registros */
  showItemsInfo?: boolean
  /** Mostrar salto a página específica */
  showPageJump?: boolean
  /** Clase CSS adicional */
  className?: string
  /** Tamaño del componente */
  size?: 'sm' | 'md' | 'lg'
  /** Texto personalizado para registros */
  itemsLabel?: string
  /** Mostrar navegación rápida (primera/última página) */
  showQuickNavigation?: boolean
}

// 🔧 Función para generar números de página visibles
const getVisiblePages = (currentPage: number, totalPages: number): (number | 'ellipsis')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []
  
  // ✅ Siempre mostrar primera página
  pages.push(1)
  
  if (currentPage <= 4) {
    // 📍 Cerca del inicio
    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
      pages.push(i)
    }
    if (totalPages > 6) pages.push('ellipsis')
    if (totalPages > 1) pages.push(totalPages)
  } else if (currentPage >= totalPages - 3) {
    // 📍 Cerca del final
    if (totalPages > 6) pages.push('ellipsis')
    for (let i = Math.max(totalPages - 4, 2); i < totalPages; i++) {
      pages.push(i)
    }
    if (totalPages > 1) pages.push(totalPages)
  } else {
    // 📍 En el medio
    pages.push('ellipsis')
    pages.push(currentPage - 1, currentPage, currentPage + 1)
    pages.push('ellipsis')
    if (totalPages > 1) pages.push(totalPages)
  }
  
  return pages
}

// 📄 Componente principal de paginación de datos
export const DataPagination: React.FC<DataPaginationProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
  showLimitSelector = true,
  showItemsInfo = true,
  showPageJump = true,
  showQuickNavigation = true,
  className,
  size = 'md',
  itemsLabel = 'registros'
}) => {
  const [jumpPage, setJumpPage] = React.useState('')
  
  const {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    totalPages,
    hasNextPage: hasNext,
    hasPrevPage: hasPrev
  } = pagination
  
  // 🧮 Calcular información de registros
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  
  // 🔧 Manejar salto a página específica
  const handlePageJump = () => {
    const page = parseInt(jumpPage)
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      setJumpPage('')
    }
  }
  
  // 🔧 Manejar tecla Enter en input de salto
  const handleJumpKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageJump()
    }
  }
  
  // 📱 Obtener páginas visibles
  const visiblePages = getVisiblePages(currentPage, totalPages)
  
  // ✅ No mostrar paginación si hay una sola página o menos
  if (totalPages <= 1) {
    return null
  }
  
  return (
    <div className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      'border-t border-gray-200 bg-white px-4 py-3 sm:px-6',
      className
    )}>
      {/* 📊 Información de registros y selector de límite */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {showItemsInfo && (
          <div className="text-sm text-gray-700">
            Mostrando{' '}
            <span className="font-medium">{startItem.toLocaleString()}</span>
            {' '}-{' '}
            <span className="font-medium">{endItem.toLocaleString()}</span>
            {' '}de{' '}
            <span className="font-medium">{totalItems.toLocaleString()}</span>
            {' '}{itemsLabel}
          </div>
        )}
        
        {/* 🔧 Selector de límite */}
        {showLimitSelector && onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Mostrar:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onLimitChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">por página</span>
          </div>
        )}
      </div>
      
      {/* 🔄 Controles de navegación */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* 📱 Salto a página específica */}
        {showPageJump && totalPages > 10 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Ir a página:</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={handleJumpKeyPress}
              className="w-16 h-8 text-center"
              placeholder="#"
              aria-label="Número de página"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handlePageJump}
              disabled={!jumpPage || parseInt(jumpPage) < 1 || parseInt(jumpPage) > totalPages}
              className="h-8"
            >
              Ir
            </Button>
          </div>
        )}
        
        {/* 🔄 Navegación principal */}
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            {/* ⏮️ Primera página */}
            {showQuickNavigation && (
              <PaginationItem>
                <Button
                  variant="outline"
                  size={size === 'sm' ? 'sm' : 'default'}
                  onClick={() => onPageChange(1)}
                  disabled={!hasPrev}
                  aria-label="Primera página"
                  className={cn(
                    'h-8 w-8 p-0',
                    size === 'sm' && 'h-7 w-7',
                    size === 'lg' && 'h-10 w-10'
                  )}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
            )}
            
            {/* ⏪ Página anterior */}
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => hasPrev && onPageChange(currentPage - 1)}
                className={cn(
                  !hasPrev && 'pointer-events-none opacity-50',
                  'cursor-pointer'
                )}
                aria-disabled={!hasPrev}
              />
            </PaginationItem>
            
            {/* 🔢 Números de página */}
            {visiblePages.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }
              
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                    aria-label={`Ir a página ${page}`}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            
            {/* ⏩ Página siguiente */}
            <PaginationItem>
              <PaginationNext 
                onClick={() => hasNext && onPageChange(currentPage + 1)}
                className={cn(
                  !hasNext && 'pointer-events-none opacity-50',
                  'cursor-pointer'
                )}
                aria-disabled={!hasNext}
              />
            </PaginationItem>
            
            {/* ⏭️ Última página */}
            {showQuickNavigation && (
              <PaginationItem>
                <Button
                  variant="outline"
                  size={size === 'sm' ? 'sm' : 'default'}
                  onClick={() => onPageChange(totalPages)}
                  disabled={!hasNext}
                  aria-label="Última página"
                  className={cn(
                    'h-8 w-8 p-0',
                    size === 'sm' && 'h-7 w-7',
                    size === 'lg' && 'h-10 w-10'
                  )}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

// 🎯 Hook personalizado para manejar paginación
export const usePagination = (initialPage = 1, initialLimit = 25) => {
  const [page, setPage] = React.useState(initialPage)
  const [limit, setLimit] = React.useState(initialLimit)
  
  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage)
  }, [])
  
  const handleLimitChange = React.useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // 🔁 Reset a primera página cuando cambia el límite
  }, [])
  
  const reset = React.useCallback(() => {
    setPage(1)
  }, [])
  
  // 📡 Generar parámetros para la URL
  const getParams = React.useCallback(() => {
    return { page, limit }
  }, [page, limit])
  
  return {
    page,
    limit,
    handlePageChange,
    handleLimitChange,
    reset,
    getParams
  }
}

export default DataPagination