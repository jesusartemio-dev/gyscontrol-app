// ===================================================
// 📁 Archivo: VirtualList.tsx
// 📌 Ubicación: src/components/ui/VirtualList.tsx
// 🔧 Descripción: Componente de virtualización para listas grandes
//
// 🧠 Uso: Renderiza solo elementos visibles para optimizar rendimiento
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 📋 Interfaces
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number | ((item: T, index: number) => number)
  containerHeight: number
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode
  overscan?: number // Número de elementos extra a renderizar fuera del viewport
  className?: string
  onScroll?: (scrollTop: number, scrollHeight: number) => void
  onEndReached?: () => void
  endReachedThreshold?: number
  loading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  estimatedItemHeight?: number // Para elementos de altura variable
}

interface ItemPosition {
  index: number
  top: number
  height: number
}

// 🎯 Hook para calcular posiciones de elementos
function useItemPositions<T>(
  items: T[],
  itemHeight: number | ((item: T, index: number) => number),
  estimatedItemHeight: number = 50
) {
  const [positions, setPositions] = useState<ItemPosition[]>([])
  const measuredHeights = useRef<Map<number, number>>(new Map())

  const calculatePositions = useCallback(() => {
    const newPositions: ItemPosition[] = []
    let top = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let height: number

      if (typeof itemHeight === 'function') {
        // Usar altura medida si está disponible, sino usar estimada
        height = measuredHeights.current.get(i) || estimatedItemHeight
      } else {
        height = itemHeight
      }

      newPositions.push({
        index: i,
        top,
        height
      })

      top += height
    }

    setPositions(newPositions)
  }, [items, itemHeight, estimatedItemHeight])

  useEffect(() => {
    calculatePositions()
  }, [calculatePositions])

  const updateItemHeight = useCallback((index: number, height: number) => {
    if (measuredHeights.current.get(index) !== height) {
      measuredHeights.current.set(index, height)
      calculatePositions()
    }
  }, [calculatePositions])

  return { positions, updateItemHeight }
}

// 🎯 Hook para calcular elementos visibles
function useVisibleRange(
  positions: ItemPosition[],
  scrollTop: number,
  containerHeight: number,
  overscan: number = 5
) {
  return useMemo(() => {
    if (positions.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] }
    }

    const viewportTop = scrollTop
    const viewportBottom = scrollTop + containerHeight

    // Encontrar primer elemento visible
    let startIndex = 0
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].top + positions[i].height > viewportTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
    }

    // Encontrar último elemento visible
    let endIndex = positions.length - 1
    for (let i = startIndex; i < positions.length; i++) {
      if (positions[i].top > viewportBottom) {
        endIndex = Math.min(positions.length - 1, i + overscan)
        break
      }
    }

    const visibleItems = positions.slice(startIndex, endIndex + 1)

    return { startIndex, endIndex, visibleItems }
  }, [positions, scrollTop, containerHeight, overscan])
}

// 📏 Componente para medir altura de elementos
interface ItemMeasurerProps {
  children: React.ReactNode
  onHeightChange: (height: number) => void
}

function ItemMeasurer({ children, onHeightChange }: ItemMeasurerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(entry.contentRect.height)
        }
      })

      resizeObserver.observe(ref.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  return <div ref={ref}>{children}</div>
}

// 🎯 Componente principal VirtualList
export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  loadingComponent,
  emptyComponent,
  estimatedItemHeight = 50
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { positions, updateItemHeight } = useItemPositions(items, itemHeight, estimatedItemHeight)
  const { startIndex, endIndex, visibleItems } = useVisibleRange(positions, scrollTop, containerHeight, overscan)

  // 📏 Altura total del contenido
  const totalHeight = useMemo(() => {
    if (positions.length === 0) return 0
    const lastPosition = positions[positions.length - 1]
    return lastPosition.top + lastPosition.height
  }, [positions])

  // 🎯 Manejar scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)

    // Callback de scroll
    if (onScroll) {
      onScroll(scrollTop, totalHeight)
    }

    // Detectar fin de lista para lazy loading
    if (onEndReached && !loading) {
      const scrollHeight = e.currentTarget.scrollHeight
      const clientHeight = e.currentTarget.clientHeight
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

      if (scrollPercentage >= endReachedThreshold) {
        onEndReached()
      }
    }
  }, [onScroll, onEndReached, loading, totalHeight, endReachedThreshold])

  // 🎯 Renderizar elementos vacíos
  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="text-gray-500 text-center">
            <p className="text-lg font-medium">No hay elementos</p>
            <p className="text-sm">La lista está vacía</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 📏 Contenedor con altura total */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <AnimatePresence mode="popLayout">
          {visibleItems.map((position) => {
            const item = items[position.index]
            const isVisible = position.index >= startIndex && position.index <= endIndex

            return (
              <motion.div
                key={position.index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: 0,
                  right: 0,
                  minHeight: typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight
                }}
              >
                {typeof itemHeight === 'function' ? (
                  <ItemMeasurer
                    onHeightChange={(height) => updateItemHeight(position.index, height)}
                  >
                    {renderItem(item, position.index, isVisible)}
                  </ItemMeasurer>
                ) : (
                  renderItem(item, position.index, isVisible)
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* 🔄 Indicador de carga */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-4 flex justify-center"
            style={{ top: totalHeight }}
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Cargando más elementos...</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// 🎯 Hook personalizado para usar VirtualList con datos paginados
export function useVirtualizedData<T>(
  fetchData: (page: number, pageSize: number) => Promise<{ items: T[], hasMore: boolean }>,
  pageSize: number = 50
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const initialLoadTriggered = useRef(false)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchData(page, pageSize)
      
      setItems(prev => [...prev, ...result.items])
      setHasMore(result.hasMore)
      setPage(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [fetchData, page, pageSize, loading, hasMore])

  const reset = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setError(null)
    initialLoadTriggered.current = false
  }, [])

  // Cargar primera página automáticamente
  useEffect(() => {
    if (items.length === 0 && hasMore && !loading && !initialLoadTriggered.current) {
      initialLoadTriggered.current = true
      loadMore()
    }
  }, [items.length, hasMore, loading]) // Removed loadMore from dependencies to prevent infinite loop

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset
  }
}

// 🎯 Tipos exportados
export type { VirtualListProps, ItemPosition }