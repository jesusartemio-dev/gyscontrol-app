'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Crown, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { CrmContactoCliente } from '@/types'

interface ContactoFormProps {
   isOpen: boolean
   onClose: () => void
   onSave: (contacto: CrmContactoCliente) => void
   contacto?: CrmContactoCliente | null
   clienteId: string
   mode: 'create' | 'edit'
 }

const areasInfluenciaOptions = [
  'Compras',
  'Técnica',
  'Financiera',
  'Operaciones',
  'Gerencia',
  'Mantenimiento',
  'Producción',
  'Calidad'
]

const relacionComercialOptions = [
  'Excelente',
  'Buena',
  'Regular',
  'Mala',
  'Nueva'
]

export default function ContactoForm({
  isOpen,
  onClose,
  onSave,
  contacto,
  clienteId,
  mode
}: ContactoFormProps) {
  const [formData, setFormData] = useState<CrmContactoCliente>({
    nombre: '',
    cargo: '',
    email: '',
    telefono: '',
    celular: '',
    esDecisionMaker: false,
    areasInfluencia: '',
    relacionComercial: '',
    notas: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or contacto changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && contacto) {
        setFormData({
          ...contacto,
          fechaUltimoContacto: contacto.fechaUltimoContacto || ''
        })
      } else {
        setFormData({
          nombre: '',
          cargo: '',
          email: '',
          telefono: '',
          celular: '',
          esDecisionMaker: false,
          areasInfluencia: '',
          relacionComercial: '',
          notas: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, contacto, mode])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const url = mode === 'edit' && contacto?.id
        ? `/api/crm/clientes/${clienteId}/contactos/${contacto.id}`
        : `/api/crm/clientes/${clienteId}/contactos`

      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar contacto')
      }

      const savedContacto = await response.json()
      onSave(savedContacto)

      toast.success(
        mode === 'edit'
          ? 'Contacto actualizado exitosamente'
          : 'Contacto creado exitosamente'
      )

      onClose()
    } catch (error) {
      console.error('Error saving contacto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar contacto')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CrmContactoCliente, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {mode === 'edit' ? 'Editar Contacto' : 'Nuevo Contacto'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Actualiza la información del contacto'
              : 'Agrega un nuevo contacto para este cliente'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información Básica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className={errors.nombre ? 'border-red-500' : ''}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-600">{errors.nombre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo || ''}
                  onChange={(e) => handleInputChange('cargo', e.target.value)}
                  placeholder="Ej: Gerente de Compras"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="esDecisionMaker"
                checked={formData.esDecisionMaker}
                onCheckedChange={(checked) => handleInputChange('esDecisionMaker', checked as boolean)}
              />
              <Label htmlFor="esDecisionMaker" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                Es Decision Maker (Tomador de decisiones)
              </Label>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información de Contacto
            </h3>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="juan.perez@empresa.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono || ''}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+51 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Celular
                </Label>
                <Input
                  id="celular"
                  value={formData.celular || ''}
                  onChange={(e) => handleInputChange('celular', e.target.value)}
                  placeholder="+51 987 654 321"
                />
              </div>
            </div>
          </div>

          {/* Información comercial */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información Comercial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="areasInfluencia">Áreas de Influencia</Label>
                <Select
                  value={formData.areasInfluencia || ''}
                  onValueChange={(value) => handleInputChange('areasInfluencia', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areasInfluenciaOptions.map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relacionComercial">Relación Comercial</Label>
                <Select
                  value={formData.relacionComercial || ''}
                  onValueChange={(value) => handleInputChange('relacionComercial', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar relación" />
                  </SelectTrigger>
                  <SelectContent>
                    {relacionComercialOptions.map(rel => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales</Label>
              <Textarea
                id="notas"
                value={formData.notas || ''}
                onChange={(e) => handleInputChange('notas', e.target.value)}
                placeholder="Información adicional sobre el contacto..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : mode === 'edit' ? 'Actualizar' : 'Crear'} Contacto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}