'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createCliente, updateCliente } from '@/lib/services/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  User, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Save, 
  X, 
  Loader2,
  FileText,
  Hash
} from 'lucide-react'
import type { Cliente } from '@/types'
import type { ClientePayload } from '@/types/payloads'
import { z } from 'zod'

// Validation schema
const clienteSchema = z.object({
  codigo: z.string().min(2, 'El código debe tener al menos 2 caracteres').max(10, 'El código no puede exceder 10 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  ruc: z.string().optional().refine((val) => {
    if (!val) return true
    return /^\d{11}$/.test(val)
  }, 'El RUC debe tener 11 dígitos'),
  direccion: z.string().optional(),
  telefono: z.string().optional().refine((val) => {
    if (!val) return true
    return /^[\d\s\-\+\(\)]{7,15}$/.test(val)
  }, 'Formato de teléfono inválido'),
  correo: z.string().optional().refine((val) => {
    if (!val) return true
    return z.string().email().safeParse(val).success
  }, 'Formato de correo inválido')
})

interface Props {
  onSaved: (cliente: Cliente) => void
  initial?: Cliente | null
  onCancel?: () => void
}

export default function ClienteForm({ onSaved, initial, onCancel }: Props) {
  const [form, setForm] = useState<Partial<Cliente>>(initial || {})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm(initial || {})
    setFormErrors({})
    setError(null)
  }, [initial])

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value })
    // Clear field-specific error when user types
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' })
    }
  }

  const resetForm = () => {
    setForm({})
    setFormErrors({})
    setError(null)
    onCancel?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFormErrors({})

    // Validate form
    try {
      clienteSchema.parse(form)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message
          }
        })
        setFormErrors(errors)
        return
      }
    }

    setLoading(true)

    try {
      const cliente = form.id
        ? await updateCliente(form.id, form)
        : await createCliente(form as Omit<Cliente, 'id'>)
      onSaved(cliente)
      if (!form.id) {
        setForm({})
      }
    } catch (err) {
      setError('Error al guardar el cliente')
      toast.error('Error al guardar el cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Nombre Field */}
      <div className="space-y-2">
        <Label htmlFor="nombre" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Nombre de la Empresa *
        </Label>
        <Input
          id="nombre"
          placeholder="Nombre completo de la empresa"
          value={form.nombre || ''}
          onChange={(e) => handleChange('nombre', e.target.value)}
          className={formErrors.nombre ? 'border-red-500' : ''}
        />
        {formErrors.nombre && (
          <p className="text-sm text-red-500">{formErrors.nombre}</p>
        )}
      </div>

      {/* Código Field */}
      <div className="space-y-2">
        <Label htmlFor="codigo" className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Código de Cliente *
        </Label>
        <Input
          id="codigo"
          placeholder="Ej: CJM, ABC, XYZ"
          value={form.codigo || ''}
          onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
          className={formErrors.codigo ? 'border-red-500' : ''}
          maxLength={10}
        />
        {formErrors.codigo && (
          <p className="text-sm text-red-500">{formErrors.codigo}</p>
        )}
        {!formErrors.codigo && (
          <p className="text-sm text-gray-500">Código único para identificar al cliente (2-10 caracteres)</p>
        )}
      </div>

      {/* RUC Field */}
      <div className="space-y-2">
        <Label htmlFor="ruc" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          RUC
        </Label>
        <Input
          id="ruc"
          placeholder="12345678901"
          value={form.ruc || ''}
          onChange={(e) => handleChange('ruc', e.target.value)}
          className={formErrors.ruc ? 'border-red-500' : ''}
          maxLength={11}
        />
        {formErrors.ruc && (
          <p className="text-sm text-red-500">{formErrors.ruc}</p>
        )}
        {!formErrors.ruc && (
          <p className="text-sm text-gray-500">11 dígitos numéricos</p>
        )}
      </div>

      {/* Dirección Field */}
      <div className="space-y-2">
        <Label htmlFor="direccion" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Dirección
        </Label>
        <Input
          id="direccion"
          placeholder="Dirección completa"
          value={form.direccion || ''}
          onChange={(e) => handleChange('direccion', e.target.value)}
          className={formErrors.direccion ? 'border-red-500' : ''}
        />
        {formErrors.direccion && (
          <p className="text-sm text-red-500">{formErrors.direccion}</p>
        )}
      </div>

      {/* Teléfono Field */}
      <div className="space-y-2">
        <Label htmlFor="telefono" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Teléfono
        </Label>
        <Input
          id="telefono"
          placeholder="+51 999 999 999"
          value={form.telefono || ''}
          onChange={(e) => handleChange('telefono', e.target.value)}
          className={formErrors.telefono ? 'border-red-500' : ''}
        />
        {formErrors.telefono && (
          <p className="text-sm text-red-500">{formErrors.telefono}</p>
        )}
      </div>

      {/* Correo Field */}
      <div className="space-y-2">
        <Label htmlFor="correo" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Correo Electrónico
        </Label>
        <Input
          id="correo"
          type="email"
          placeholder="contacto@empresa.com"
          value={form.correo || ''}
          onChange={(e) => handleChange('correo', e.target.value)}
          className={formErrors.correo ? 'border-red-500' : ''}
        />
        {formErrors.correo && (
          <p className="text-sm text-red-500">{formErrors.correo}</p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {form.id ? 'Actualizar Cliente' : 'Crear Cliente'}
            </>
          )}
        </Button>
        {form.id && (
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>
    </motion.form>
  )
}
