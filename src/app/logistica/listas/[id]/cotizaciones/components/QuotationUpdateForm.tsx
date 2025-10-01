'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, X, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface QuotationItem {
  id: string
  codigo: string
  descripcion: string
  estado: string
  precioUnitario?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  observaciones?: string
  proveedor: {
    nombre: string
  }
  createdAt: string
  updatedAt: string
}

interface QuotationUpdateFormProps {
  quotationId: string | null
  onUpdate: () => void
}

export default function QuotationUpdateForm({ quotationId, onUpdate }: QuotationUpdateFormProps) {
  const [quotation, setQuotation] = useState<QuotationItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [estado, setEstado] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [tiempoEntregaModo, setTiempoEntregaModo] = useState<'stock' | 'dias' | 'semanas'>('stock')
  const [tiempoEntregaValor, setTiempoEntregaValor] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (quotationId) {
      loadQuotation()
    } else {
      resetForm()
    }
  }, [quotationId])

  const loadQuotation = async () => {
    if (!quotationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/cotizacion-proveedor-item/${quotationId}`)
      if (response.ok) {
        const data = await response.json()
        setQuotation({
          ...data,
          proveedor: data.cotizacion?.proveedor
        })

        // Populate form
        setEstado(data.estado || '')
        setPrecioUnitario(data.precioUnitario?.toString() || '')

        // Parse tiempoEntrega to determine mode and value
        const tiempoEntrega = data.tiempoEntrega || ''
        if (tiempoEntrega.toLowerCase().includes('stock')) {
          setTiempoEntregaModo('stock')
          setTiempoEntregaValor('')
        } else if (tiempoEntrega.toLowerCase().includes('semanas')) {
          setTiempoEntregaModo('semanas')
          const match = tiempoEntrega.match(/(\d+)/)
          setTiempoEntregaValor(match ? match[1] : '')
        } else if (tiempoEntrega.toLowerCase().includes('días') || tiempoEntrega.toLowerCase().includes('dias')) {
          setTiempoEntregaModo('dias')
          const match = tiempoEntrega.match(/(\d+)/)
          setTiempoEntregaValor(match ? match[1] : '')
        } else {
          setTiempoEntregaModo('stock')
          setTiempoEntregaValor('')
        }

        setObservaciones(data.observaciones || '')
      }
    } catch (error) {
      console.error('Error loading quotation:', error)
      toast.error('Error al cargar la cotización')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setQuotation(null)
    setEstado('')
    setPrecioUnitario('')
    setTiempoEntregaModo('stock')
    setTiempoEntregaValor('')
    setObservaciones('')
  }

  const handleSave = async () => {
    if (!quotation) return

    setSaving(true)
    try {
      // Calculate tiempoEntrega and tiempoEntregaDias based on mode and value
      let tiempoEntrega = 'Stock'
      let tiempoEntregaDias = 0

      if (tiempoEntregaModo === 'dias') {
        const valor = parseInt(tiempoEntregaValor) || 0
        tiempoEntregaDias = valor
        tiempoEntrega = `${valor} días`
      } else if (tiempoEntregaModo === 'semanas') {
        const valor = parseInt(tiempoEntregaValor) || 0
        tiempoEntregaDias = valor * 7
        tiempoEntrega = `${valor} semanas`
      }

      const updateData = {
        estado,
        precioUnitario: precioUnitario ? parseFloat(precioUnitario) : null,
        tiempoEntrega,
        tiempoEntregaDias,
        observaciones: observaciones || null
      }

      const response = await fetch(`/api/cotizacion-proveedor-item/${quotation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast.success('Cotización actualizada exitosamente')
        onUpdate()
        loadQuotation() // Reload to get updated data
      } else {
        throw new Error('Error al actualizar')
      }
    } catch (error) {
      console.error('Error saving quotation:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'solicitado':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'cotizado':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rechazado':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (estado: string) => {
    const variants = {
      solicitado: 'default',
      cotizado: 'default',
      rechazado: 'destructive',
      borrador: 'secondary'
    } as const

    const labels = {
      solicitado: 'Solicitado',
      cotizado: 'Cotizado',
      rechazado: 'Rechazado',
      borrador: 'Borrador'
    }

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'outline'}>
        {labels[estado as keyof typeof labels] || estado}
      </Badge>
    )
  }

  if (!quotationId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecciona una cotización para editar</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading || !quotation) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <span>Editar Cotización</span>
          {getStatusIcon(quotation.estado)}
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{quotation.descripcion || quotation.codigo}</span>
            {getStatusBadge(quotation.estado)}
          </div>
          <p className="text-sm text-muted-foreground">
            Proveedor: {quotation.proveedor?.nombre}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="cotizado">Cotizado</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Precio Unitario */}
        <div className="space-y-2">
          <Label htmlFor="precioUnitario">Precio Unitario (USD)</Label>
          <Input
            id="precioUnitario"
            type="number"
            step="0.01"
            min="0"
            value={precioUnitario}
            onChange={(e) => setPrecioUnitario(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Tiempo de Entrega */}
        <div className="space-y-2">
          <Label>Tiempo de Entrega</Label>
          <div className="flex gap-2 items-center">
            <Select value={tiempoEntregaModo} onValueChange={(value: 'stock' | 'dias' | 'semanas') => setTiempoEntregaModo(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="dias">Días</SelectItem>
                <SelectItem value="semanas">Semanas</SelectItem>
              </SelectContent>
            </Select>
            {(tiempoEntregaModo === 'dias' || tiempoEntregaModo === 'semanas') && (
              <Input
                type="number"
                min="0"
                value={tiempoEntregaValor}
                onChange={(e) => setTiempoEntregaValor(e.target.value)}
                placeholder={tiempoEntregaModo === 'dias' ? '15' : '2'}
                className="w-24"
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones adicionales..."
            rows={3}
          />
        </div>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Creado: {new Date(quotation.createdAt).toLocaleString()}</p>
          <p>Actualizado: {new Date(quotation.updatedAt).toLocaleString()}</p>
        </div>
      </CardContent>

      <div className="p-4 border-t">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}