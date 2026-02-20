'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { createCatalogoEquipo, updateCatalogoEquipo, getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogoEquipo } from '@/types'

interface CatalogoEquipoFormProps {
  equipo?: Partial<CatalogoEquipo>
  onCreated?: (equipo: any) => void
  onUpdated?: (equipo: any) => void
  onCancel?: () => void
}

const schema = z.object({
  categoriaId: z.string().min(1, 'Categoría requerida'),
  unidadId: z.string().min(1, 'Unidad requerida'),
  codigo: z.string().min(1, 'Código requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  marca: z.string().optional(),
  precioLista: z.number().min(0, 'Debe ser positivo'),
  factorCosto: z.number().min(0.5).max(3, 'Debe ser entre 0.5 y 3'),
  factorVenta: z.number().min(1).max(3, 'Debe ser entre 1 y 3'),
  precioLogistica: z.number().min(0).optional()
})

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function CatalogoEquipoForm({ equipo, onCreated, onUpdated, onCancel }: CatalogoEquipoFormProps) {
  const isEditMode = !!equipo?.id
  const [categorias, setCategorias] = useState<{ value: string; label: string }[]>([])
  const [unidades, setUnidades] = useState<{ value: string; label: string }[]>([])
  const [codigosExistentes, setCodigosExistentes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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
      categoriaId: equipo?.categoriaId || equipo?.categoriaEquipo?.id || '',
      unidadId: equipo?.unidadId || equipo?.unidad?.id || '',
      codigo: equipo?.codigo || '',
      descripcion: equipo?.descripcion || '',
      marca: equipo?.marca || '',
      precioLista: equipo?.precioLista || 0,
      factorCosto: equipo?.factorCosto || 1.00,
      factorVenta: equipo?.factorVenta || 1.15,
      precioLogistica: equipo?.precioLogistica ?? undefined
    }
  })

  const watchPrecioLista = watch('precioLista')
  const watchFactorCosto = watch('factorCosto')
  const watchFactorVenta = watch('factorVenta')

  const calculados = useMemo(() => {
    const pInterno = +(watchPrecioLista * watchFactorCosto).toFixed(2)
    const pVenta = +(pInterno * watchFactorVenta).toFixed(2)
    const margen = pInterno > 0 ? ((pVenta - pInterno) / pInterno) * 100 : 0
    return { precioInterno: pInterno, precioVenta: pVenta, margen }
  }, [watchPrecioLista, watchFactorCosto, watchFactorVenta])

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      try {
        const [cats, unis, equipos] = await Promise.all([
          getCategoriasEquipo(),
          getUnidades(),
          getCatalogoEquipos()
        ])
        setCategorias(cats.map((c: any) => ({ value: c.id, label: c.nombre })))
        setUnidades(unis.map((u: any) => ({ value: u.id, label: u.nombre })))
        const codigos = equipos.map((e: any) => e.codigo.toLowerCase())
        if (isEditMode) {
          setCodigosExistentes(codigos.filter((c: string) => c !== equipo!.codigo!.toLowerCase()))
        } else {
          setCodigosExistentes(codigos)
        }
      } catch (error) {
        toast.error('Error cargando datos para el formulario.')
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [])

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (codigosExistentes.includes(values.codigo.toLowerCase())) {
      setError('codigo', { type: 'manual', message: 'Este código ya existe en el catálogo.' })
      return
    }

    const equipoData = {
      codigo: values.codigo,
      descripcion: values.descripcion,
      marca: values.marca || '',
      precioLista: values.precioLista,
      precioInterno: calculados.precioInterno,
      factorCosto: values.factorCosto,
      factorVenta: values.factorVenta,
      precioVenta: calculados.precioVenta,
      precioLogistica: values.precioLogistica ?? null,
      categoriaId: values.categoriaId,
      unidadId: values.unidadId,
      estado: equipo?.estado || 'activo'
    }

    try {
      if (isEditMode) {
        const actualizado = await updateCatalogoEquipo(equipo!.id!, equipoData)
        onUpdated?.(actualizado)
        toast.success('Equipo actualizado exitosamente.')
      } else {
        const nuevo = await createCatalogoEquipo(equipoData)
        onCreated?.(nuevo)
        reset()
        toast.success('Equipo creado exitosamente.')
      }
    } catch (error) {
      console.error('Error al guardar equipo:', error)
      toast.error(isEditMode ? 'Error al actualizar el equipo.' : 'Error al crear el equipo.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {/* Código y Marca */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Código *</Label>
          <Input
            {...register('codigo')}
            placeholder="EQ-001"
            className="h-8 text-sm font-mono"
            onFocus={(e) => e.target.select()}
          />
          {errors.codigo && <p className="text-red-500 text-[10px] mt-0.5">{errors.codigo.message}</p>}
        </div>
        <div>
          <Label className="text-xs">Marca</Label>
          <Input
            {...register('marca')}
            placeholder="Siemens"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <Label className="text-xs">Descripción *</Label>
        <Textarea
          {...register('descripcion')}
          placeholder="Descripción del equipo..."
          rows={2}
          className="text-sm min-h-[48px] resize-none"
        />
        {errors.descripcion && <p className="text-red-500 text-[10px] mt-0.5">{errors.descripcion.message}</p>}
      </div>

      {/* Categoría y Unidad */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Categoría *</Label>
          <Select value={watch('categoriaId')} onValueChange={v => setValue('categoriaId', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(cat => (
                <SelectItem key={cat.value} value={cat.value} className="text-sm">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoriaId && <p className="text-red-500 text-[10px] mt-0.5">{errors.categoriaId.message}</p>}
        </div>
        <div>
          <Label className="text-xs">Unidad *</Label>
          <Select value={watch('unidadId')} onValueChange={v => setValue('unidadId', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {unidades.map(u => (
                <SelectItem key={u.value} value={u.value} className="text-sm">
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unidadId && <p className="text-red-500 text-[10px] mt-0.5">{errors.unidadId.message}</p>}
        </div>
      </div>

      {/* Precios */}
      <div className="border rounded-lg p-3 bg-gray-50/50">
        <div className="flex items-center gap-1.5 mb-3">
          <Calculator className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium">Precios</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">P.Lista *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              {...register('precioLista', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              className="h-7 text-xs font-mono"
            />
            {errors.precioLista && <p className="text-red-500 text-[10px] mt-0.5">{errors.precioLista.message}</p>}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">F.Costo</Label>
            <Input
              type="number"
              min={0.5}
              max={3}
              step={0.01}
              {...register('factorCosto', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
              placeholder="1.00"
              className="h-7 text-xs font-mono"
            />
            {errors.factorCosto && <p className="text-red-500 text-[10px] mt-0.5">{errors.factorCosto.message}</p>}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">F.Venta</Label>
            <Input
              type="number"
              min={1}
              max={3}
              step={0.01}
              {...register('factorVenta', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
              placeholder="1.15"
              className="h-7 text-xs font-mono"
            />
            <span className="text-[9px] text-muted-foreground">
              {((watchFactorVenta - 1) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Precios calculados */}
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">P.Interno (P.Lista × F.Costo):</span>
            <span className="font-mono font-medium text-blue-600">
              {formatCurrency(calculados.precioInterno)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">P.Venta (P.Interno × F.Venta):</span>
            <span className="font-mono font-medium text-green-600">
              {formatCurrency(calculados.precioVenta)}
            </span>
          </div>
        </div>

        {/* Precio Logística */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">P.Logística</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              {...register('precioLogistica', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              className="h-7 text-xs font-mono flex-1"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className={cn(
        "grid grid-cols-3 gap-2 p-3 rounded-lg border",
        calculados.margen >= 15 ? "bg-green-50/50 border-green-200" : "bg-orange-50/50 border-orange-200"
      )}>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">P.Interno</p>
          <p className="text-sm font-semibold text-gray-700">
            {formatCurrency(calculados.precioInterno)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">P.Venta</p>
          <p className="text-sm font-bold text-green-600">
            {formatCurrency(calculados.precioVenta)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Margen</p>
          <p className={cn(
            "text-sm font-semibold",
            calculados.margen >= 20 ? 'text-emerald-600' :
            calculados.margen >= 10 ? 'text-amber-600' : 'text-red-500'
          )}>
            {calculados.margen.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Guardando...
            </>
          ) : isEditMode ? (
            'Actualizar Equipo'
          ) : (
            'Agregar Equipo'
          )}
        </Button>
      </div>
    </form>
  )
}
