'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, User, Mail, Phone, Building2, MessageSquare, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateContactoData } from '@/lib/services/crm/contactos'

interface ContactoFormProps {
  clienteId: string
  onSave: (data: CreateContactoData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ContactoForm({ clienteId, onSave, onCancel, loading = false }: ContactoFormProps) {
  const [formData, setFormData] = useState<CreateContactoData>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const handleInputChange = (field: keyof CreateContactoData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuevo Contacto
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Básica</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo || ''}
                    onChange={(e) => handleInputChange('cargo', e.target.value)}
                    placeholder="Cargo o posición"
                  />
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Contacto</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono || ''}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="+51 999 999 999"
                  />
                </div>

                <div>
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular || ''}
                    onChange={(e) => handleInputChange('celular', e.target.value)}
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>
            </div>

            {/* Información de Negocio */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Negocio</h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="esDecisionMaker"
                  checked={formData.esDecisionMaker}
                  onCheckedChange={(checked) => handleInputChange('esDecisionMaker', !!checked)}
                />
                <Label htmlFor="esDecisionMaker" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Es tomador de decisiones
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="areasInfluencia">Áreas de Influencia</Label>
                  <Select
                    value={formData.areasInfluencia || ''}
                    onValueChange={(value) => handleInputChange('areasInfluencia', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="técnica">Técnica</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financiera">Financiera</SelectItem>
                      <SelectItem value="operativa">Operativa</SelectItem>
                      <SelectItem value="gerencial">Gerencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relacionComercial">Relación Comercial</Label>
                  <Select
                    value={formData.relacionComercial || ''}
                    onValueChange={(value) => handleInputChange('relacionComercial', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muy_buena">Muy Buena</SelectItem>
                      <SelectItem value="buena">Buena</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="mala">Mala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notas Adicionales</h3>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas || ''}
                  onChange={(e) => handleInputChange('notas', e.target.value)}
                  placeholder="Información adicional sobre el contacto..."
                  rows={3}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Contacto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}