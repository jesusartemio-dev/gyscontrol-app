'use client'

import { useState } from 'react'
import { Phone, Mail, Users, FileText, Clock, Loader2, MessageSquare } from 'lucide-react'
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

const tipoOptions = [
  { value: TIPOS_ACTIVIDAD.LLAMADA, label: 'Llamada', icon: Phone },
  { value: TIPOS_ACTIVIDAD.EMAIL, label: 'Email', icon: Mail },
  { value: TIPOS_ACTIVIDAD.REUNION, label: 'Reunión', icon: Users },
  { value: TIPOS_ACTIVIDAD.PROPUESTA, label: 'Propuesta', icon: FileText },
  { value: TIPOS_ACTIVIDAD.SEGUIMIENTO, label: 'Seguimiento', icon: Clock },
]

const resultadoOptions = [
  { value: RESULTADOS_ACTIVIDAD.POSITIVO, label: 'Positivo', dot: 'bg-green-500' },
  { value: RESULTADOS_ACTIVIDAD.NEUTRO, label: 'Neutro', dot: 'bg-yellow-500' },
  { value: RESULTADOS_ACTIVIDAD.NEGATIVO, label: 'Negativo', dot: 'bg-red-500' },
  { value: RESULTADOS_ACTIVIDAD.PENDIENTE, label: 'Pendiente', dot: 'bg-gray-400' },
]

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

      setFormData({ tipo: '', descripcion: '', fecha: '', resultado: '', notas: '' })
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

  const set = (field: string) => (value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Fila 1: Tipo + Resultado */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo *</Label>
          <Select value={formData.tipo} onValueChange={set('tipo')}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {tipoOptions.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Resultado</Label>
          <Select value={formData.resultado} onValueChange={set('resultado')}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {resultadoOptions.map(({ value, label, dot }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fila 2: Descripcion */}
      <div className="space-y-1.5">
        <Label className="text-xs">Descripción *</Label>
        <Textarea
          placeholder="Describe la actividad realizada..."
          value={formData.descripcion}
          onChange={(e) => set('descripcion')(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Fila 3: Fecha + Notas lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Fecha</Label>
          <Input
            type="datetime-local"
            value={formData.fecha}
            onChange={(e) => set('fecha')(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Por defecto: ahora</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notas</Label>
          <Textarea
            placeholder="Info adicional..."
            value={formData.notas}
            onChange={(e) => set('notas')(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} size="sm" className="flex-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          )}
          {loading ? 'Registrando...' : 'Registrar'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
