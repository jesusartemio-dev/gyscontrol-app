'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Mail, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface QuotationItem {
  id: string
  codigo: string
  descripcion: string
  estado: string
  precioUnitario?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  cotizacion: {
    proveedor: {
      nombre: string
    }
  }
  createdAt: string
  updatedAt: string
}

interface QuotationListProps {
  listaId: string
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onSelectQuotation: (quotationId: string) => void
  loading?: boolean
  refreshKey?: number
}

export default function QuotationList({
  listaId,
  selectedIds,
  onSelectionChange,
  onSelectQuotation,
  loading = false,
  refreshKey
}: QuotationListProps) {
  const [quotations, setQuotations] = useState<QuotationItem[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<QuotationItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadQuotations()
  }, [listaId, refreshKey])

  useEffect(() => {
    filterQuotations()
  }, [quotations, searchTerm, statusFilter])

  const loadQuotations = async () => {
    try {
      const response = await fetch(`/api/logistica/listas/${listaId}/cotizaciones`)
      if (response.ok) {
        const data = await response.json()
        setQuotations(data.quotations || [])
      }
    } catch (error) {
      console.error('Error loading quotations:', error)
    }
  }

  const filterQuotations = () => {
    let filtered = quotations

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.cotizacion?.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.estado === statusFilter)
    }

    setFilteredQuotations(filtered)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredQuotations.map(q => q.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectQuotation = (quotationId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, quotationId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== quotationId))
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'solicitado':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'cotizado':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'borrador':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (estado: string) => {
    const variants = {
      solicitado: 'default',
      cotizado: 'default',
      borrador: 'secondary',
      rechazado: 'destructive'
    } as const

    const labels = {
      solicitado: 'Solicitado',
      cotizado: 'Cotizado',
      borrador: 'Borrador',
      rechazado: 'Rechazado'
    }

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'outline'}>
        {labels[estado as keyof typeof labels] || estado}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cotizaciones ({filteredQuotations.length})</span>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === filteredQuotations.length && filteredQuotations.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} seleccionadas
            </span>
          </div>
        </CardTitle>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar cotizaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="cotizado">Cotizado</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron cotizaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredQuotations.map((quotation) => {
                const isSelected = selectedIds.includes(quotation.id)
                return (
                  <div
                    key={quotation.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => onSelectQuotation(quotation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectQuotation(quotation.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {quotation.descripcion || quotation.codigo}
                          </span>
                          {getStatusIcon(quotation.estado)}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {quotation.cotizacion?.proveedor?.nombre}
                          </span>
                          {getStatusBadge(quotation.estado)}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            ${quotation.precioUnitario?.toFixed(2) || '0.00'}
                          </span>
                          <span>
                            {quotation.tiempoEntrega || 'Sin tiempo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}