'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SelectorTipoRegistro } from '@/components/seguridad/registros/SelectorTipoRegistro'

import {
  actualizarRegistroSeguridadSchema,
  type ActualizarRegistroSeguridadInput,
  type TipoRegistroSeguridad,
} from '@/lib/validators/registroSeguridad'

interface RegistroDetalle {
  id: string
  tipo: TipoRegistroSeguridad
  descripcion: string
  asistentes: number | null
  observaciones: string | null
  ingenieroId: string
  jornada: {
    id: string
    estado: string
    proyecto: { id: string; codigo: string; nombre: string }
  }
}

export default function EditarRegistroSeguridadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const query = useQuery<RegistroDetalle>({
    queryKey: ['seguridad', 'registro', id],
    queryFn: async () => {
      const res = await fetch(`/api/seguridad/registros/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ActualizarRegistroSeguridadInput>({
    resolver: zodResolver(actualizarRegistroSeguridadSchema),
  })

  const tipo = watch('tipo')

  // Populate form when data loads
  useEffect(() => {
    if (query.data) {
      const r = query.data
      setValue('tipo', r.tipo)
      setValue('descripcion', r.descripcion)
      setValue('asistentes', r.asistentes ?? undefined)
      setValue('observaciones', r.observaciones ?? undefined)
    }
  }, [query.data, setValue])

  const mutation = useMutation({
    mutationFn: async (data: ActualizarRegistroSeguridadInput) => {
      const res = await fetch(`/api/seguridad/registros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al guardar')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Registro actualizado')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registro', id] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registros'] })
      router.push(`/seguridad/registros/${id}`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar'),
  })

  if (query.isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-3 max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
        <Link href={`/seguridad/registros/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el registro.
        </div>
      </div>
    )
  }

  const r = query.data
  const jornada = r.jornada
  const jornadaCerrada = jornada.estado === 'aprobado' || jornada.estado === 'rechazado'

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href={`/seguridad/registros/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Editar registro</h1>
          <p className="text-xs text-muted-foreground">{jornada.proyecto.codigo}</p>
        </div>
      </div>

      {jornadaCerrada && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          La jornada está en estado <strong>{jornada.estado}</strong>. No se puede modificar el registro.
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de actividad *</Label>
              <SelectorTipoRegistro
                value={tipo ?? null}
                onChange={(v) => setValue('tipo', v ?? undefined, { shouldDirty: true })}
                disabled={jornadaCerrada || mutation.isPending}
              />
              {errors.tipo && <p className="text-xs text-red-500">{errors.tipo.message}</p>}
            </div>

            {tipo === 'charla' && (
              <div className="space-y-1.5">
                <Label htmlFor="asistentes">Asistentes</Label>
                <Input
                  id="asistentes"
                  type="number"
                  min={0}
                  placeholder="Número de asistentes"
                  {...register('asistentes', { valueAsNumber: true })}
                  disabled={jornadaCerrada || mutation.isPending}
                />
                {errors.asistentes && <p className="text-xs text-red-500">{errors.asistentes.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                placeholder="Describe la actividad realizada…"
                rows={4}
                {...register('descripcion')}
                disabled={jornadaCerrada || mutation.isPending}
              />
              {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales…"
                rows={3}
                {...register('observaciones')}
                disabled={jornadaCerrada || mutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12"
          disabled={!isDirty || mutation.isPending || jornadaCerrada}
        >
          {mutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </form>
    </div>
  )
}
