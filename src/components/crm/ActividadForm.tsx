'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MessageSquare, Phone, Mail, Users, FileText, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createActividadOportunidad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'
import type { CrmActividad } from '@/lib/services/crm/actividades'

interface ActividadFormProps {
  oportunidadId: string
  onSuccess: (actividad: CrmActividad) => void
  onCancel: () => void
}

export default function ActividadForm({ oportunidadId, onSuccess, onCancel }: ActividadFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo: '',
    descripcion: '',
    fecha: '',
    resultado: '',
    notas: ''
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tipo || !formData.descripcion.trim()) {
      toast({
        title: "Campos requeridos",
        description: "El tipo y descripción son obligatorios",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const nuevaActividad = await createActividadOportunidad(oportunidadId, {
        tipo: formData.tipo,
        descripcion: formData.descripcion.trim(),
        fecha: formData.fecha || undefined,
        resultado: formData.resultado || undefined,
        notas: formData.notas.trim() || undefined
      })

      toast({
        title: "Actividad registrada",
        description: "La actividad se ha registrado correctamente",
      })

      onSuccess(nuevaActividad)

      // Reset form
      setFormData({
        tipo: '',
        descripcion: '',
        fecha: '',
        resultado: '',
        notas: ''
      })

    } catch (error) {
      console.error('Error al crear actividad:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar la actividad",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case TIPOS_ACTIVIDAD.LLAMADA:
        return <Phone className="h-4 w-4" />
      case TIPOS_ACTIVIDAD.EMAIL:
        return <Mail className="h-4 w-4" />
      case TIPOS_ACTIVIDAD.REUNION:
        return <Users className="h-4 w-4" />
      case TIPOS_ACTIVIDAD.PROPUESTA:
        return <FileText className="h-4 w-4" />
      case TIPOS_ACTIVIDAD.SEGUIMIENTO:
        return <Clock className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Registrar Nueva Actividad</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de actividad */}
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de Actividad *</Label>
          <Select value={formData.tipo} onValueChange={(value) => handleInputChange('tipo', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo de actividad" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPOS_ACTIVIDAD).map(([key, value]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    {getTipoIcon(value)}
                    <span className="capitalize">{value}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Textarea
            id="descripcion"
            placeholder="Describe la actividad realizada..."
            value={formData.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={3}
          />
        </div>

        {/* Fecha */}
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            type="datetime-local"
            value={formData.fecha}
            onChange={(e) => handleInputChange('fecha', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si no se especifica, se usará la fecha y hora actual
          </p>
        </div>

        {/* Resultado */}
        <div className="space-y-2">
          <Label htmlFor="resultado">Resultado</Label>
          <Select value={formData.resultado} onValueChange={(value) => handleInputChange('resultado', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el resultado" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESULTADOS_ACTIVIDAD).map(([key, value]) => (
                <SelectItem key={value} value={value}>
                  <span className="capitalize">{value}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notas adicionales */}
        <div className="space-y-2">
          <Label htmlFor="notas">Notas Adicionales</Label>
          <Textarea
            id="notas"
            placeholder="Información adicional sobre la actividad..."
            value={formData.notas}
            onChange={(e) => handleInputChange('notas', e.target.value)}
            rows={2}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Registrar Actividad
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </motion.div>
  )
}