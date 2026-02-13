'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Loader2, DollarSign, FileText, Calendar } from 'lucide-react'
import {
  createSolicitudAnticipo,
  updateSolicitudAnticipo,
} from '@/lib/services/solicitudAnticipo'
import type { SolicitudAnticipo } from '@/types'

interface SolicitudAnticipoFormProps {
  proyectoId: string
  solicitanteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  anticipo?: SolicitudAnticipo | null
}

export default function SolicitudAnticipoForm({
  proyectoId,
  solicitanteId,
  open,
  onOpenChange,
  onSaved,
  anticipo,
}: SolicitudAnticipoFormProps) {
  const isEdit = !!anticipo
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && anticipo) {
      setMonto(String(anticipo.monto))
      setMotivo(anticipo.motivo || '')
      setFechaInicio(anticipo.fechaInicio ? anticipo.fechaInicio.split('T')[0] : '')
      setFechaFin(anticipo.fechaFin ? anticipo.fechaFin.split('T')[0] : '')
    } else if (open && !anticipo) {
      setMonto('')
      setMotivo('')
      setFechaInicio('')
      setFechaFin('')
    }
    setErrors({})
  }, [open, anticipo])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!monto || parseFloat(monto) <= 0) errs.monto = 'Monto debe ser mayor a 0'
    if (!motivo.trim()) errs.motivo = 'El motivo es obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      if (isEdit && anticipo) {
        await updateSolicitudAnticipo(anticipo.id, {
          monto: parseFloat(monto),
          motivo: motivo.trim(),
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null,
        })
        toast.success('Anticipo actualizado')
      } else {
        await createSolicitudAnticipo({
          proyectoId,
          solicitanteId,
          monto: parseFloat(monto),
          motivo: motivo.trim(),
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
        })
        toast.success('Anticipo creado')
      }
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100">
              <DollarSign className="h-4 w-4 text-blue-700" />
            </div>
            {isEdit ? 'Editar Anticipo' : 'Nueva Solicitud de Anticipo'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la solicitud.'
              : 'Solicita un anticipo de dinero para gastos del proyecto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="anticipo-monto" className="text-sm font-medium">
              Monto (PEN) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="anticipo-monto"
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => { setMonto(e.target.value); setErrors(prev => ({ ...prev, monto: '' })) }}
                placeholder="0.00"
                className={`pl-9 ${errors.monto ? 'border-red-500' : ''}`}
                disabled={loading}
                autoFocus
              />
            </div>
            {errors.monto && <p className="text-xs text-red-600">{errors.monto}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="anticipo-motivo" className="text-sm font-medium">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="anticipo-motivo"
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setErrors(prev => ({ ...prev, motivo: '' })) }}
                placeholder="Ej: Viáticos para puesta en marcha en Arequipa"
                className={`pl-9 min-h-[80px] ${errors.motivo ? 'border-red-500' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.motivo && <p className="text-xs text-red-600">{errors.motivo}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="anticipo-fecha-inicio" className="text-sm font-medium">
                Fecha inicio <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="anticipo-fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anticipo-fecha-fin" className="text-sm font-medium">
                Fecha fin <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="anticipo-fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !monto || !motivo.trim()}
              className="h-9 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {isEdit ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {isEdit ? 'Guardar' : 'Crear Solicitud'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
