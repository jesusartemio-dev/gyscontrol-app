'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { User, ChevronDown, ChevronUp, RefreshCw, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getAuditHistory } from '@/lib/services/audit-client'
import { formatDate } from '@/lib/utils'
import type { AuditLog } from '@/types/modelos'

interface CatalogoEquipoPrecioHistorialProps {
  equipoId: string
  className?: string
}

const PRICE_LABELS: Record<string, string> = {
  precioLista: 'P.Lista',
  precioLogistica: 'P.Logistica',
  precioReal: 'P.Real',
  precioInterno: 'P.Interno',
  precioVenta: 'P.Venta',
  factorCosto: 'F.Costo',
  factorVenta: 'F.Venta',
}

const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount == null) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return String(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num)
}

const formatValue = (field: string, value: any): string => {
  if (field.startsWith('factor')) return value != null ? Number(value).toFixed(2) : '—'
  return formatCurrency(value)
}

const CatalogoEquipoPrecioHistorial: React.FC<CatalogoEquipoPrecioHistorialProps> = ({
  equipoId,
  className,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [equipoId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const logs = await getAuditHistory('CATALOGO_EQUIPO', equipoId, 50)
      // Filter only logs that have price changes
      const priceLogs = logs.filter(log => {
        if (!log.cambios) return false
        try {
          const cambios = JSON.parse(log.cambios)
          return Object.keys(cambios).some(k => k in PRICE_LABELS)
        } catch {
          return false
        }
      })
      setAuditLogs(priceLogs)
    } catch (error) {
      console.error('Error loading price history:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedItems(newExpanded)
  }

  const displayedLogs = showAll ? auditLogs : auditLogs.slice(0, 5)

  const formatChanges = (cambios: string | null | undefined) => {
    if (!cambios) return null
    try {
      const parsed = JSON.parse(cambios)
      const priceEntries = Object.entries(parsed).filter(([field]) => field in PRICE_LABELS)
      if (priceEntries.length === 0) return null
      return (
        <div className="space-y-1">
          {priceEntries.map(([field, change]: [string, any]) => (
            <div key={field} className="text-[11px] text-gray-600">
              <span className="font-medium">{PRICE_LABELS[field]}:</span>{' '}
              <span className="font-mono bg-red-50 px-0.5 rounded text-red-600 text-[10px]">
                {formatValue(field, change.anterior)}
              </span>
              {' → '}
              <span className="font-mono bg-green-50 px-0.5 rounded text-green-600 text-[10px]">
                {formatValue(field, change.nuevo)}
              </span>
            </div>
          ))}
        </div>
      )
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1.5 mb-2">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Historial de Precios</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (auditLogs.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1.5">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Sin cambios de precios registrados</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">
            Historial de Precios ({auditLogs.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadHistory}
          disabled={loading}
          className="h-5 px-1.5 text-[10px]"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-1">
          <AnimatePresence>
            {displayedLogs.map((log) => {
              const isExpanded = expandedItems.has(log.id)
              let metadata: Record<string, any> = {}
              try { metadata = log.metadata ? JSON.parse(log.metadata) : {} } catch {}

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex items-start gap-2 group"
                >
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <User className="w-2 h-2 text-gray-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-700 text-[8px] px-1 py-0 font-normal">
                        {metadata.vista || 'direct'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {log.usuario?.name || log.usuario?.email || '—'}
                      </span>
                      <span className="text-[10px] text-gray-300 font-mono ml-auto whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </span>
                      <button
                        onClick={() => toggleExpanded(log.id)}
                        className="p-0 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Always show a summary of changes */}
                    {!isExpanded && log.cambios && (() => {
                      try {
                        const parsed = JSON.parse(log.cambios)
                        const fields = Object.keys(parsed).filter(k => k in PRICE_LABELS)
                        return (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {fields.map(f => PRICE_LABELS[f]).join(', ')}
                          </p>
                        )
                      } catch { return null }
                    })()}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-1 pl-2 border-l-2 border-gray-100 space-y-1">
                        {formatChanges(log.cambios)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Show more/less */}
      {auditLogs.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-blue-600 hover:text-blue-800 mt-1"
        >
          {showAll ? 'Mostrar menos' : `Ver todos (${auditLogs.length - 5} mas)`}
        </button>
      )}
    </div>
  )
}

export default CatalogoEquipoPrecioHistorial
