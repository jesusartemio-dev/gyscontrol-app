// ===================================================
// 📁 Archivo: CotizacionProveedorForm.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Formulario para registrar nueva cotización de proveedor
//
// 🧠 Uso: Usado en vista de logística para crear cotizaciones nuevas
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getProveedores } from '@/lib/services/proveedor'
import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CotizacionProveedorPayload, Proveedor } from '@/types'

const schema = z.object({
  proveedorId: z.string().min(1, 'Proveedor requerido'),
  proyectoId: z.string().min(1),
  nombre: z.string().min(1, 'Nombre requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  proyectoId: string
  onCreated: (payload: CotizacionProveedorPayload) => void
}

export default function CotizacionProveedorForm({ proyectoId, onCreated }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedorId: '',
      proyectoId,
      nombre: '',
      fecha: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    getProveedores().then(setProveedores)
  }, [])

  const onSubmit = async (values: FormValues) => {
    try {
      onCreated(values)
      toast.success('✅ Cotización registrada')
      reset({ ...values, nombre: '', proveedorId: '' })
    } catch (err) {
      toast.error('❌ Error al registrar cotización')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border p-4 rounded-xl shadow-md">
      <h2 className="font-semibold text-lg">➕ Nueva Cotización</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Proveedor</Label>
          <Controller
            name="proveedorId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.proveedorId && (
            <p className="text-red-500 text-sm">{errors.proveedorId.message}</p>
          )}
        </div>

        <div>
          <Label>Nombre de Cotización</Label>
          <Input placeholder="Ej: COT-0001" {...register('nombre')} />
          {errors.nombre && (
            <p className="text-red-500 text-sm">{errors.nombre.message}</p>
          )}
        </div>

        <div>
          <Label>Fecha</Label>
          <Input type="date" {...register('fecha')} />
          {errors.fecha && (
            <p className="text-red-500 text-sm">{errors.fecha.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-green-600 text-white" disabled={isSubmitting}>
          Guardar Cotización
        </Button>
      </div>
    </form>
  )
}
