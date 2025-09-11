/**
 * 📝 PedidoEquipoForm Component
 * 
 * Formulario para crear y editar pedidos de equipos.
 * Incluye validación, fechas y campos requeridos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// 🎨 UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// 🎯 Icons
import { 
  Package, 
  Save, 
  X, 
  Calendar,
  User,
  FileText,
  Loader2
} from 'lucide-react'

// 📡 Types
import type { PedidoEquipo, ListaEquipo } from '@/types/modelos'
import type { PedidoEquipoPayload } from '@/types/payloads'

// 🎨 Validation Schema
const pedidoFormSchema = z.object({
  fechaNecesaria: z.string().min(1, 'La fecha necesaria es obligatoria'),
  fechaOC: z.string().optional(),
  responsableId: z.string().min(1, 'Debe seleccionar un responsable'),
  estado: z.enum(['borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado']),
  observaciones: z.string().optional(),
})

type PedidoFormData = z.infer<typeof pedidoFormSchema>

// 🎯 Props Interface
interface PedidoEquipoFormProps {
  pedido?: PedidoEquipo
  proyectoId: string
  listas?: ListaEquipo[]
  onSubmit: (payload: PedidoEquipoPayload) => Promise<void>
  onCancel?: () => void
  className?: string
}

// ✅ Estados disponibles para el pedido
const ESTADOS_PEDIDO = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

// 🎯 Main Component
export const PedidoEquipoForm: React.FC<PedidoEquipoFormProps> = ({
  pedido,
  proyectoId,
  listas,
  onSubmit,
  onCancel,
  className = ''
}) => {
  // 🎯 States
  const [loading, setLoading] = useState(false)
  const isEditing = !!pedido

  // 🔁 Form setup
  const form = useForm<PedidoFormData>({
    resolver: zodResolver(pedidoFormSchema),
    defaultValues: {
      fechaNecesaria: pedido?.fechaNecesaria ? 
        new Date(pedido.fechaNecesaria).toISOString().split('T')[0] : '',
      fechaOC: pedido?.fechaEntregaEstimada ? 
        new Date(pedido.fechaEntregaEstimada).toISOString().split('T')[0] : '',
      responsableId: pedido?.responsableId || '',
      estado: pedido?.estado || 'borrador',
      observaciones: pedido?.observacion || '',
    },
  })

  // 🎯 Event handlers
  const handleSubmit = async (data: PedidoFormData) => {
    try {
      setLoading(true)
      
      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId: data.responsableId,
        listaId: '', // Se asignará desde el contexto
        fechaNecesaria: data.fechaNecesaria,
        fechaEntregaEstimada: data.fechaOC,
        estado: data.estado,
        observacion: data.observaciones,
      }

      await onSubmit(payload)
      
      toast.success(
        isEditing ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente'
      )
      
    } catch (error) {
      console.error('Error al guardar pedido:', error)
      toast.error('Error al guardar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onCancel?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 📋 Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fecha Necesaria */}
              <FormField
                control={form.control}
                name="fechaNecesaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha Necesaria *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fecha OC */}
              <FormField
                control={form.control}
                name="fechaOC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha Orden de Compra
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsable */}
              <FormField
                control={form.control}
                name="responsableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Responsable *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ID del responsable"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado */}
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_PEDIDO.map((estado) => (
                          <SelectItem key={estado.value} value={estado.value}>
                            {estado.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 📝 Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Observaciones */}
              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales..."
                        rows={3}
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 🎯 Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Actualizar' : 'Crear'} Pedido
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  )
}

export default PedidoEquipoForm
