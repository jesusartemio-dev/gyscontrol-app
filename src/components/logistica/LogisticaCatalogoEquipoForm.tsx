'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { createEquipoLogistica, getCatalogoEquiposLogistica } from '@/lib/services/logisticaCatalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LogisticaCatalogoEquipoFormProps {
  onCreated: (equipo: any) => void
}

const schema = z.object({
  categoriaId: z.string().min(1, 'Categoría requerida'),
  unidadId: z.string().min(1, 'Unidad requerida'),
  codigo: z.string().min(1, 'Código requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  marca: z.string().min(1, 'Marca requerida'),
  precioLista: z.number().min(0, 'Debe ser positivo'),
  factorCosto: z.number().min(0.5).max(3, 'Debe ser entre 0.5 y 3'),
  factorVenta: z.number().min(1).max(3, 'Debe ser entre 1 y 3')
})

export default function LogisticaCatalogoEquipoForm({ onCreated }: LogisticaCatalogoEquipoFormProps) {
  const [precioInterno, setPrecioInterno] = useState(0)
  const [precioVenta, setPrecioVenta] = useState(0)
  const [categorias, setCategorias] = useState<{ value: string; label: string }[]>([])
  const [unidades, setUnidades] = useState<{ value: string; label: string }[]>([])
  const [codigosExistentes, setCodigosExistentes] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoriaId: '',
      unidadId: '',
      codigo: '',
      descripcion: '',
      marca: '',
      precioLista: 0,
      factorCosto: 1.00,
      factorVenta: 1.15
    }
  })

  const watchPrecioLista = watch('precioLista')
  const watchFactorCosto = watch('factorCosto')
  const watchFactorVenta = watch('factorVenta')

  useEffect(() => {
    const pInterno = parseFloat((watchPrecioLista * watchFactorCosto).toFixed(2))
    setPrecioInterno(pInterno)
    setPrecioVenta(parseFloat((pInterno * watchFactorVenta).toFixed(2)))
  }, [watchPrecioLista, watchFactorCosto, watchFactorVenta])

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [cats, unis, equipos] = await Promise.all([
          getCategoriasEquipo(),
          getUnidades(),
          getCatalogoEquiposLogistica()
        ])
        setCategorias(cats.map((c: any) => ({ value: c.id, label: c.nombre })))
        setUnidades(unis.map((u: any) => ({ value: u.id, label: u.nombre })))
        setCodigosExistentes(equipos.map((e: any) => e.codigo.toLowerCase()))
      } catch (error) {
        toast.error('Error cargando datos para el formulario.')
      }
    }
    cargarDatos()
  }, [])

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (codigosExistentes.includes(values.codigo.toLowerCase())) {
      setError('codigo', { type: 'manual', message: 'Este código ya existe en logística.' })
      return
    }

    try {
      const nuevo = await createEquipoLogistica({ ...values, precioInterno, precioVenta, estado: 'pendiente' })
      if (nuevo) {
        onCreated(nuevo)
        reset()
        setPrecioVenta(0)
        toast.success('Equipo creado exitosamente en logística.')
      } else {
        toast.error('Error al crear el equipo en logística.')
      }
    } catch (error) {
      console.error('❌ Error al crear equipo en logística:', error)
      toast.error('Error al crear el equipo en logística.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-xl shadow">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Categoría</Label>
          <Select value={watch('categoriaId')} onValueChange={v => setValue('categoriaId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoriaId && <p className="text-red-500 text-sm">{errors.categoriaId.message}</p>}
        </div>

        <div>
          <Label>Unidad</Label>
          <Select value={watch('unidadId')} onValueChange={v => setValue('unidadId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona unidad" />
            </SelectTrigger>
            <SelectContent>
              {unidades.map(u => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unidadId && <p className="text-red-500 text-sm">{errors.unidadId.message}</p>}
        </div>

        <div>
          <Label>Código</Label>
          <Input {...register('codigo')} placeholder="Código del equipo" />
          {errors.codigo && <p className="text-red-500 text-sm">{errors.codigo.message}</p>}
        </div>

        <div>
          <Label>Descripción</Label>
          <Input {...register('descripcion')} placeholder="Descripción" />
          {errors.descripcion && <p className="text-red-500 text-sm">{errors.descripcion.message}</p>}
        </div>

        <div>
          <Label>Marca</Label>
          <Input {...register('marca')} placeholder="Marca" />
          {errors.marca && <p className="text-red-500 text-sm">{errors.marca.message}</p>}
        </div>

        <div>
          <Label>Precio Lista</Label>
          <Input type="number" step="0.01" {...register('precioLista', { valueAsNumber: true })} />
          {errors.precioLista && <p className="text-red-500 text-sm">{errors.precioLista.message}</p>}
        </div>

        <div>
          <Label>Factor Costo</Label>
          <Input type="number" step="0.01" {...register('factorCosto', { valueAsNumber: true })} />
          {errors.factorCosto && <p className="text-red-500 text-sm">{errors.factorCosto.message}</p>}
        </div>

        <div>
          <Label>Factor Venta</Label>
          <Input type="number" step="0.01" {...register('factorVenta', { valueAsNumber: true })} />
          {errors.factorVenta && <p className="text-red-500 text-sm">{errors.factorVenta.message}</p>}
        </div>

        <div>
          <Label>Precio Interno (Calculado)</Label>
          <Input value={precioInterno} readOnly className="bg-gray-100 text-gray-600" />
        </div>

        <div>
          <Label>Precio Venta (Calculado)</Label>
          <Input value={precioVenta} readOnly className="bg-gray-100 text-gray-600" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Agregar Equipo a Logística
        </Button>
      </div>
    </form>
  )
}
