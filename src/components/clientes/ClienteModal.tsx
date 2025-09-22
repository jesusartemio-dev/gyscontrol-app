'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Star,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { Cliente } from '@/types'

// Extended Cliente type with CRM fields
interface ClienteCRM extends Cliente {
  sector?: string
  tamanoEmpresa?: string
  sitioWeb?: string
  linkedin?: string
  potencialAnual?: number
  frecuenciaCompra?: string
  ultimoProyecto?: string
  estadoRelacion?: string
  calificacion?: number
}

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (cliente: ClienteCRM) => void
  initial?: ClienteCRM | null
  mode?: 'create' | 'edit'
}

const sectores = [
  'Minería',
  'Manufactura',
  'Energía',
  'Construcción',
  'Tecnología',
  'Salud',
  'Educación',
  'Comercio',
  'Transporte',
  'Otros'
]

const tamanosEmpresa = [
  'Microempresa (1-10 empleados)',
  'Pequeña (11-50 empleados)',
  'Mediana (51-200 empleados)',
  'Grande (201-1000 empleados)',
  'Multinacional (+1000 empleados)'
]

const frecuenciasCompra = [
  'Muy Alta (Semanal)',
  'Alta (Quincenal)',
  'Media (Mensual)',
  'Baja (Trimestral)',
  'Muy Baja (Semestral+)'
]

const estadosRelacion = [
  { value: 'prospecto', label: 'Prospecto', color: 'secondary' },
  { value: 'cliente_activo', label: 'Cliente Activo', color: 'default' },
  { value: 'cliente_inactivo', label: 'Cliente Inactivo', color: 'outline' }
]

export default function ClienteModal({
  isOpen,
  onClose,
  onSaved,
  initial = null,
  mode = 'create'
}: ClienteModalProps) {
  const [formData, setFormData] = useState<Partial<ClienteCRM>>({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    correo: '',
    sector: '',
    tamanoEmpresa: '',
    sitioWeb: '',
    potencialAnual: 0,
    frecuenciaCompra: '',
    estadoRelacion: 'prospecto',
    calificacion: 3
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initial) {
      setFormData({
        ...initial,
        potencialAnual: initial.potencialAnual || 0,
        calificacion: initial.calificacion || 3
      })
    } else {
      setFormData({
        nombre: '',
        ruc: '',
        direccion: '',
        telefono: '',
        correo: '',
        sector: '',
        tamanoEmpresa: '',
        sitioWeb: '',
        potencialAnual: 0,
        frecuenciaCompra: '',
        estadoRelacion: 'prospecto',
        calificacion: 3
      })
    }
    setErrors({})
  }, [initial, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }

    if (!formData.correo?.trim()) {
      newErrors.correo = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'El correo no tiene un formato válido'
    }

    if (formData.potencialAnual && formData.potencialAnual < 0) {
      newErrors.potencialAnual = 'El potencial anual debe ser positivo'
    }

    if (formData.calificacion && (formData.calificacion < 1 || formData.calificacion > 5)) {
      newErrors.calificacion = 'La calificación debe estar entre 1 y 5'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }

    setLoading(true)

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const clienteData: ClienteCRM = {
        id: initial?.id || `temp-${Date.now()}`,
        codigo: initial?.codigo || `CLI-${Date.now()}`,
        numeroSecuencia: initial?.numeroSecuencia || 1,
        nombre: formData.nombre!,
        ruc: formData.ruc || '',
        direccion: formData.direccion || '',
        telefono: formData.telefono || '',
        correo: formData.correo!,
        sector: formData.sector || '',
        tamanoEmpresa: formData.tamanoEmpresa || '',
        sitioWeb: formData.sitioWeb || '',
        potencialAnual: formData.potencialAnual || 0,
        frecuenciaCompra: formData.frecuenciaCompra || '',
        estadoRelacion: formData.estadoRelacion || 'prospecto',
        calificacion: formData.calificacion || 3,
        createdAt: initial?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      onSaved(clienteData)

      if (mode === 'create') {
        toast.success('Cliente creado exitosamente')
      } else {
        toast.success('Cliente actualizado exitosamente')
      }

      onClose()
    } catch (error) {
      console.error('Error saving cliente:', error)
      toast.error('Error al guardar el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 cursor-pointer ${
          i < rating
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={() => handleInputChange('calificacion', i + 1)}
      />
    ))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {mode === 'create' ? 'Crear Nuevo Cliente' : 'Editar Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Básica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Cliente *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre || ''}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      placeholder="Ingrese el nombre del cliente"
                      className={errors.nombre ? 'border-red-500' : ''}
                    />
                    {errors.nombre && (
                      <p className="text-sm text-red-500">{errors.nombre}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ruc">RUC</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc || ''}
                      onChange={(e) => handleInputChange('ruc', e.target.value)}
                      placeholder="Ingrese el RUC"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo Electrónico *</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={formData.correo || ''}
                      onChange={(e) => handleInputChange('correo', e.target.value)}
                      placeholder="cliente@empresa.com"
                      className={errors.correo ? 'border-red-500' : ''}
                    />
                    {errors.correo && (
                      <p className="text-sm text-red-500">{errors.correo}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono || ''}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      placeholder="+51 999 999 999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion || ''}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    placeholder="Dirección completa del cliente"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Información CRM */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Información CRM
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Select
                      value={formData.sector || ''}
                      onValueChange={(value) => handleInputChange('sector', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectores.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tamanoEmpresa">Tamaño de Empresa</Label>
                    <Select
                      value={formData.tamanoEmpresa || ''}
                      onValueChange={(value) => handleInputChange('tamanoEmpresa', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tamaño" />
                      </SelectTrigger>
                      <SelectContent>
                        {tamanosEmpresa.map((tamano) => (
                          <SelectItem key={tamano} value={tamano}>
                            {tamano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sitioWeb">Sitio Web</Label>
                    <Input
                      id="sitioWeb"
                      value={formData.sitioWeb || ''}
                      onChange={(e) => handleInputChange('sitioWeb', e.target.value)}
                      placeholder="https://www.empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frecuenciaCompra">Frecuencia de Compra</Label>
                    <Select
                      value={formData.frecuenciaCompra || ''}
                      onValueChange={(value) => handleInputChange('frecuenciaCompra', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {frecuenciasCompra.map((frecuencia) => (
                          <SelectItem key={frecuencia} value={frecuencia}>
                            {frecuencia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="potencialAnual">Potencial Anual (USD)</Label>
                    <Input
                      id="potencialAnual"
                      type="number"
                      value={formData.potencialAnual || ''}
                      onChange={(e) => handleInputChange('potencialAnual', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="1000"
                      className={errors.potencialAnual ? 'border-red-500' : ''}
                    />
                    {errors.potencialAnual && (
                      <p className="text-sm text-red-500">{errors.potencialAnual}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoRelacion">Estado de Relación</Label>
                    <Select
                      value={formData.estadoRelacion || 'prospecto'}
                      onValueChange={(value) => handleInputChange('estadoRelacion', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosRelacion.map((estado) => (
                          <SelectItem key={estado.value} value={estado.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant={estado.color as any} className="text-xs">
                                {estado.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Calificación del Cliente</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {renderStars(formData.calificacion || 3)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formData.calificacion || 3}/5 estrellas
                    </span>
                  </div>
                  {errors.calificacion && (
                    <p className="text-sm text-red-500">{errors.calificacion}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </div>
                  ) : (
                    mode === 'create' ? 'Crear Cliente' : 'Actualizar Cliente'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
