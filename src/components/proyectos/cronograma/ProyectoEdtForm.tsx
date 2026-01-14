// ===================================================
// 📁 Archivo: ProyectoEdtForm.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoEdtForm.tsx
// 🔧 Descripción: Formulario para crear/editar EDTs de proyecto
// 🎯 Funcionalidades: CRUD completo de EDTs con validaciones
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-03
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Save, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import type { ProyectoEdt, CategoriaServicio, User } from '@/types/modelos'
import type { CreateProyectoEdtPayload, ProyectoEdtUpdatePayload } from '@/types/payloads'

// Schema de validación
const edtFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida'),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  horasEstimadas: z.number().min(0.1, 'Las horas deben ser mayor a 0'),
  responsableId: z.string().optional(),
  descripcion: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  proyectoCronogramaId: z.string().min(1, 'El cronograma es requerido')
})

type EdtFormData = z.infer<typeof edtFormSchema>

interface ProyectoEdtFormProps {
  proyectoId: string
  cronogramaId?: string
  edt?: ProyectoEdt // Para edición
  onSuccess: (edt: ProyectoEdt) => void
  onCancel: () => void
}

export function ProyectoEdtForm({
  proyectoId,
  cronogramaId,
  edt,
  onSuccess,
  onCancel
}: ProyectoEdtFormProps) {
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [fechaInicio, setFechaInicio] = useState<Date>()
  const [fechaFin, setFechaFin] = useState<Date>()

  const isEditing = !!edt

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EdtFormData>({
    resolver: zodResolver(edtFormSchema),
    defaultValues: {
      nombre: edt?.nombre || '',
      categoriaServicioId: edt?.categoriaServicioId || '',
      fechaInicio: edt?.fechaInicio || '',
      fechaFin: edt?.fechaFin || '',
      horasEstimadas: edt?.horasPlan || 1,
      responsableId: edt?.responsableId || '',
      descripcion: edt?.descripcion || '',
      prioridad: edt?.prioridad || 'media',
      proyectoCronogramaId: cronogramaId || ''
    }
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  // Actualizar fechas cuando cambian los valores del form
  useEffect(() => {
    const fechaInicioStr = watch('fechaInicio')
    const fechaFinStr = watch('fechaFin')

    if (fechaInicioStr) setFechaInicio(new Date(fechaInicioStr))
    if (fechaFinStr) setFechaFin(new Date(fechaFinStr))
  }, [watch])

  const loadInitialData = async () => {
    try {
      // Cargar categorías de servicio
      const categoriasResponse = await fetch('/api/categoria-servicio')
      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json()
        setCategorias(categoriasData.data || [])
      }

      // Cargar usuarios (para responsables)
      const usuariosResponse = await fetch('/api/admin/users')
      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json()
        setUsuarios(usuariosData.data || [])
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error)
      toast.error('Error al cargar datos del formulario')
    }
  }

  const onSubmit = async (data: EdtFormData) => {
    try {
      setLoading(true)

      const payload: CreateProyectoEdtPayload = {
        proyectoId,
        proyectoCronogramaId: data.proyectoCronogramaId,
        nombre: data.nombre,
        categoriaServicioId: data.categoriaServicioId,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        horasEstimadas: data.horasEstimadas,
        responsableId: data.responsableId,
        descripcion: data.descripcion,
        prioridad: data.prioridad
      }

      const url = isEditing
        ? `/api/proyectos/${proyectoId}/edt/${edt.id}`
        : `/api/proyectos/${proyectoId}/edt`

      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar EDT')
      }

      const result = await response.json()

      toast.success(
        isEditing
          ? 'EDT actualizado exitosamente'
          : 'EDT creado exitosamente'
      )

      onSuccess(result.data)

    } catch (error) {
      console.error('Error guardando EDT:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar EDT')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? 'Editar EDT' : 'Crear Nuevo EDT'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del EDT *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Ej: Instalación eléctrica"
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          {/* Categoría de Servicio */}
          <div className="space-y-2">
            <Label htmlFor="categoriaServicioId">Categoría de Servicio *</Label>
            <Select
              value={watch('categoriaServicioId')}
              onValueChange={(value) => setValue('categoriaServicioId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoriaServicioId && (
              <p className="text-sm text-red-600">{errors.categoriaServicioId.message}</p>
            )}
          </div>

          {/* Zona - Eliminado según FASE 3 */}
          {/* <div className="space-y-2">
            <Label htmlFor="zona">Zona/Sector</Label>
            <Input
              id="zona"
              {...register('zona')}
              placeholder="Ej: Sector Norte, Planta Baja, etc."
            />
          </div> */}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio Planificada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicio ? (
                      format(fechaInicio, 'PPP', { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={(date) => {
                      setFechaInicio(date)
                      setValue('fechaInicio', date ? date.toISOString() : '')
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin Planificada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFin ? (
                      format(fechaFin, 'PPP', { locale: es })
                    ) : (
                      <span>Selecciona fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={(date) => {
                      setFechaFin(date)
                      setValue('fechaFin', date ? date.toISOString() : '')
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Horas Estimadas */}
          <div className="space-y-2">
            <Label htmlFor="horasEstimadas">Horas Estimadas *</Label>
            <Input
              id="horasEstimadas"
              type="number"
              step="0.5"
              min="0.1"
              {...register('horasEstimadas', { valueAsNumber: true })}
              placeholder="Ej: 40.5"
            />
            {errors.horasEstimadas && (
              <p className="text-sm text-red-600">{errors.horasEstimadas.message}</p>
            )}
          </div>

          {/* Responsable */}
          <div className="space-y-2">
            <Label htmlFor="responsableId">Responsable</Label>
            <Select
              value={watch('responsableId')}
              onValueChange={(value) => setValue('responsableId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona responsable" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select
              value={watch('prioridad')}
              onValueChange={(value) => setValue('prioridad', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Describe las actividades del EDT..."
              rows={3}
            />
          </div>

          {/* Cronograma ID (hidden) */}
          <input
            type="hidden"
            {...register('proyectoCronogramaId')}
            value={cronogramaId}
          />

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Actualizar EDT' : 'Crear EDT'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}