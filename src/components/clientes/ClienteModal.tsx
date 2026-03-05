'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Star, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createCliente, updateCliente } from '@/lib/services/cliente'
import type { Cliente } from '@/types'

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
  'Minería', 'Manufactura', 'Energía', 'Construcción', 'Tecnología',
  'Integrador', 'Salud', 'Educación', 'Comercio', 'Transporte', 'Otros'
]

const tamanosEmpresa = [
  'Microempresa (1-10)',
  'Pequeña (11-50)',
  'Mediana (51-200)',
  'Grande (201-1000)',
  'Multinacional (+1000)'
]

const frecuenciasCompra = [
  'Muy Alta (Semanal)',
  'Alta (Quincenal)',
  'Media (Mensual)',
  'Baja (Trimestral)',
  'Muy Baja (Semestral+)'
]

const estadosRelacion = [
  { value: 'prospecto', label: 'Prospecto' },
  { value: 'cliente_activo', label: 'Cliente Activo' },
  { value: 'cliente_inactivo', label: 'Cliente Inactivo' }
]

const NONE = '__none__'

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

export default function ClienteModal({
  isOpen,
  onClose,
  onSaved,
  initial = null,
  mode = 'create'
}: ClienteModalProps) {
  const [formData, setFormData] = useState<Partial<ClienteCRM>>({
    codigo: '', nombre: '', ruc: '', direccion: '', telefono: '', correo: '',
    sector: '', tamanoEmpresa: '', sitioWeb: '', potencialAnual: 0,
    frecuenciaCompra: '', estadoRelacion: 'prospecto', calificacion: 3
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initial) {
      setFormData({ ...initial, codigo: initial.codigo || '', potencialAnual: initial.potencialAnual || 0, calificacion: initial.calificacion || 3 })
    } else {
      setFormData({
        codigo: '', nombre: '', ruc: '', direccion: '', telefono: '', correo: '',
        sector: '', tamanoEmpresa: '', sitioWeb: '', potencialAnual: 0,
        frecuenciaCompra: '', estadoRelacion: 'prospecto', calificacion: 3
      })
    }
    setErrors({})
  }, [initial, isOpen])

  const validateForm = () => {
    const e: Record<string, string> = {}
    if (!formData.nombre?.trim()) e.nombre = 'Obligatorio'
    if (!formData.correo?.trim()) e.correo = 'Obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) e.correo = 'Formato inválido'
    if (formData.ruc && !/^\d{11}$/.test(formData.ruc)) e.ruc = 'Debe tener 11 dígitos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload: any = {
        nombre: formData.nombre!.trim(),
        ruc: formData.ruc || '',
        direccion: formData.direccion || '',
        telefono: formData.telefono || '',
        correo: formData.correo!.trim(),
        sector: formData.sector || '',
        tamanoEmpresa: formData.tamanoEmpresa || '',
        sitioWeb: formData.sitioWeb || '',
        potencialAnual: formData.potencialAnual || 0,
        frecuenciaCompra: formData.frecuenciaCompra || '',
        estadoRelacion: formData.estadoRelacion || 'prospecto',
        calificacion: formData.calificacion || 3,
      }

      let clienteData: ClienteCRM
      if (mode === 'create') {
        if (formData.codigo?.trim()) payload.codigo = formData.codigo.trim()
        clienteData = await createCliente(payload) as ClienteCRM
        toast.success('Cliente creado exitosamente')
      } else {
        if (formData.codigo?.trim()) payload.codigo = formData.codigo.trim()
        clienteData = await updateCliente(initial!.id, payload) as ClienteCRM
        toast.success('Cliente actualizado')
      }
      onSaved(clienteData)
      onClose()
    } catch (error: any) {
      const msg = error?.message || 'Error al guardar el cliente'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-blue-600" />
            {mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Datos principales - 3 columnas */}
          <div className="grid grid-cols-6 gap-3">
            {/* Nombre - 3 cols */}
            <div className="col-span-3">
              <Field id="nombre" label="Nombre" required error={errors.nombre}>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Nombre del cliente"
                  className={`h-8 text-sm ${errors.nombre ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </Field>
            </div>
            {/* Código - 1 col */}
            <div className="col-span-1">
              <Field id="codigo" label="Código" error={errors.codigo}>
                <Input
                  id="codigo"
                  value={formData.codigo || ''}
                  onChange={(e) => set('codigo', e.target.value.toUpperCase())}
                  placeholder="Auto"
                  className="h-8 text-sm font-mono"
                />
              </Field>
            </div>
            {/* RUC - 2 cols */}
            <div className="col-span-2">
              <Field id="ruc" label="RUC" error={errors.ruc}>
                <Input
                  id="ruc"
                  value={formData.ruc || ''}
                  onChange={(e) => set('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="20100000000"
                  className={`h-8 text-sm font-mono ${errors.ruc ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </Field>
            </div>

            {/* Correo - 3 cols */}
            <div className="col-span-3">
              <Field id="correo" label="Correo" required error={errors.correo}>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo || ''}
                  onChange={(e) => set('correo', e.target.value)}
                  placeholder="contacto@empresa.com"
                  className={`h-8 text-sm ${errors.correo ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </Field>
            </div>
            {/* Teléfono - 2 cols */}
            <div className="col-span-2">
              <Field id="telefono" label="Teléfono">
                <Input
                  id="telefono"
                  value={formData.telefono || ''}
                  onChange={(e) => set('telefono', e.target.value)}
                  placeholder="+51 999 999 999"
                  className="h-8 text-sm"
                />
              </Field>
            </div>
            {/* Dirección - 1 col */}
            <div className="col-span-1">
              {/* spacer for alignment */}
            </div>

            {/* Dirección full width */}
            <div className="col-span-6">
              <Field id="direccion" label="Dirección">
                <Input
                  id="direccion"
                  value={formData.direccion || ''}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="Dirección del cliente"
                  className="h-8 text-sm"
                />
              </Field>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t" />

          {/* CRM - grid compacto */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Información CRM</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Sector */}
              <Field id="sector" label="Sector">
                <Select value={formData.sector || NONE} onValueChange={(v) => set('sector', v === NONE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin sector</SelectItem>
                    {sectores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {/* Tamaño */}
              <Field id="tamanoEmpresa" label="Tamaño">
                <Select value={formData.tamanoEmpresa || NONE} onValueChange={(v) => set('tamanoEmpresa', v === NONE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin definir</SelectItem>
                    {tamanosEmpresa.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {/* Estado Relación */}
              <Field id="estadoRelacion" label="Estado">
                <Select value={formData.estadoRelacion || 'prospecto'} onValueChange={(v) => set('estadoRelacion', v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosRelacion.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {/* Sitio Web */}
              <Field id="sitioWeb" label="Sitio Web">
                <Input
                  id="sitioWeb"
                  value={formData.sitioWeb || ''}
                  onChange={(e) => set('sitioWeb', e.target.value)}
                  placeholder="www.empresa.com"
                  className="h-8 text-sm"
                />
              </Field>
              {/* Frecuencia Compra */}
              <Field id="frecuenciaCompra" label="Frec. Compra">
                <Select value={formData.frecuenciaCompra || NONE} onValueChange={(v) => set('frecuenciaCompra', v === NONE ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin definir</SelectItem>
                    {frecuenciasCompra.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {/* Potencial Anual */}
              <Field id="potencialAnual" label="Potencial Anual (USD)">
                <Input
                  id="potencialAnual"
                  type="number"
                  value={formData.potencialAnual || ''}
                  onChange={(e) => set('potencialAnual', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="h-8 text-sm"
                />
              </Field>
            </div>

            {/* Calificación inline */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Calificación</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 cursor-pointer transition-colors ${
                      i < (formData.calificacion || 3)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                    onClick={() => set('calificacion', i + 1)}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{formData.calificacion || 3}/5</span>
            </div>
          </div>

          {/* Footer con errores globales + botones */}
          <div className="flex items-center justify-between pt-3 border-t">
            {Object.keys(errors).length > 0 && (
              <p className="text-xs text-red-500">Corrige los campos marcados en rojo</p>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs min-w-[100px]">
                {loading ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Guardando...</>
                ) : (
                  mode === 'create' ? 'Crear Cliente' : 'Guardar'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
