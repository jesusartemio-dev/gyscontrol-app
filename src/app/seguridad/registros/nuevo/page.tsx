'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { SelectorJornada, type JornadaActiva, nombreTarea, trabajadoresDeJornada } from '@/components/seguridad/registros/SelectorJornada'
import { SelectorTipoRegistro } from '@/components/seguridad/registros/SelectorTipoRegistro'
import { FotosUploader, type FotoLocal } from '@/components/seguridad/registros/FotosUploader'

import {
  crearRegistroSeguridadSchema,
  tipoRegistroSeguridadEnum,
  type CrearRegistroSeguridadInput,
  type TipoRegistroSeguridad,
} from '@/lib/validators/registroSeguridad'
import { rangoSemanaIso } from '@/lib/validators/reporteSeguridad'

interface RegistroCreado {
  id: string
}

async function subirFoto(registroId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/seguridad/registros/${registroId}/fotos`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Error al subir foto')
  }
  return res.json()
}

export default function NuevoRegistroSeguridadPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  // Query params: tipo, proyectoId, semanaIso, reporteId
  const tipoParam = searchParams.get('tipo')
  const proyectoIdParam = searchParams.get('proyectoId') ?? undefined
  const semanaIsoParam = searchParams.get('semanaIso') ?? undefined
  const reporteIdParam = searchParams.get('reporteId') ?? undefined

  const tipoInicial: TipoRegistroSeguridad =
    tipoParam && tipoRegistroSeguridadEnum.safeParse(tipoParam).success
      ? (tipoParam as TipoRegistroSeguridad)
      : 'charla'

  // Si vino con semanaIso, calcular fechaDesde/Hasta para filtrar el SelectorJornada
  const rangoSemana = useMemo(() => {
    if (!semanaIsoParam) return null
    try {
      const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIsoParam)
      return {
        fechaDesde: fechaInicio.toISOString().slice(0, 10),
        fechaHasta: fechaFin.toISOString().slice(0, 10),
      }
    } catch {
      return null
    }
  }, [semanaIsoParam])

  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<JornadaActiva | null>(null)
  const [fotos, setFotos] = useState<FotoLocal[]>([])

  const form = useForm<CrearRegistroSeguridadInput>({
    resolver: zodResolver(crearRegistroSeguridadSchema),
    defaultValues: {
      registroHorasCampoId: '',
      tipo: tipoInicial,
      descripcion: '',
      asistentes: null,
      observaciones: null,
    },
  })

  const tipo = form.watch('tipo')

  const crearMutation = useMutation({
    mutationFn: async (input: CrearRegistroSeguridadInput) => {
      const res = await fetch('/api/seguridad/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo crear el registro')
      }
      return (await res.json()) as RegistroCreado
    },
  })

  const onSubmit = async (data: CrearRegistroSeguridadInput) => {
    if (!jornadaSeleccionada) {
      toast.error('Selecciona una jornada activa primero')
      return
    }

    try {
      const creado = await crearMutation.mutateAsync({
        ...data,
        registroHorasCampoId: jornadaSeleccionada.id,
        asistentes: data.tipo === 'charla' ? data.asistentes ?? null : null,
      })

      // Subir fotos en serie. Si alguna falla, igual seguimos al detalle.
      let exitos = 0
      let fallos = 0
      for (const foto of fotos) {
        try {
          await subirFoto(creado.id, foto.file)
          exitos++
        } catch (err) {
          console.error('Error subiendo foto:', err)
          fallos++
        }
      }

      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registros'] })

      if (fallos > 0) {
        toast.warning(
          `Registro creado, pero ${fallos} foto${fallos > 1 ? 's' : ''} no se pudo${
            fallos > 1 ? 'eron' : ''
          } subir. Puedes reintentar desde el detalle.`,
        )
      } else if (exitos > 0) {
        toast.success(`Registro creado con ${exitos} foto${exitos > 1 ? 's' : ''}`)
      } else {
        toast.success('Registro creado')
      }

      // Si vino desde el editor de un reporte, regresa al editor; sino al detalle del registro.
      if (reporteIdParam) {
        router.push(`/seguridad/reportes-semanales/${reporteIdParam}`)
      } else {
        router.push(`/seguridad/registros/${creado.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear registro')
    }
  }

  const enviando = form.formState.isSubmitting || crearMutation.isPending

  return (
    <div className="mx-auto p-3 sm:p-4 space-y-3 max-w-md sm:max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/seguridad/registros">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Nuevo registro</h1>
          <p className="text-xs text-muted-foreground">Captura una actividad de seguridad</p>
        </div>
      </div>

      <SelectorJornada
        value={jornadaSeleccionada?.id ?? null}
        onChange={(_id, jornada) => {
          setJornadaSeleccionada(jornada)
          form.setValue('registroHorasCampoId', jornada?.id ?? '', { shouldValidate: true })
          // Pre-sugiere asistentes con la cuadrilla actual cuando es charla y aún no se llenó
          if (jornada && form.getValues('tipo') === 'charla' && !form.getValues('asistentes')) {
            const total = trabajadoresDeJornada(jornada).length
            if (total > 0) form.setValue('asistentes', total)
          }
        }}
        filtroProyectoId={proyectoIdParam}
        filtroFechaDesde={rangoSemana?.fechaDesde}
        filtroFechaHasta={rangoSemana?.fechaHasta}
      />

      {jornadaSeleccionada && jornadaSeleccionada.tareas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-orange-700">Contexto de la jornada</p>
              <p className="text-[11px] text-muted-foreground">
                {trabajadoresDeJornada(jornadaSeleccionada).length} trabajador{trabajadoresDeJornada(jornadaSeleccionada).length === 1 ? '' : 'es'}
              </p>
            </div>
            <div className="space-y-1">
              {jornadaSeleccionada.tareas.map((t) => (
                <div key={t.id} className="text-xs leading-snug">
                  <span className="font-medium">• {nombreTarea(t)}</span>
                  {t.miembros.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      — {t.miembros.length} pers · {t.miembros.reduce((s, m) => s + (m.horas ?? 0), 0).toFixed(1)} h
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-orange-200">
              Esta es la cuadrilla y tareas reportadas en la jornada. Úsalas como referencia para tu descripción.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo" className="text-sm">Tipo de actividad</Label>
              <SelectorTipoRegistro
                id="tipo"
                value={tipo}
                onChange={(t) => form.setValue('tipo', t as TipoRegistroSeguridad)}
                disabled={enviando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-sm">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Qué se hizo, dónde, con quiénes…"
                rows={4}
                disabled={enviando}
                {...form.register('descripcion')}
              />
              {form.formState.errors.descripcion && (
                <p className="text-xs text-red-600">{form.formState.errors.descripcion.message}</p>
              )}
            </div>

            {tipo === 'charla' && (
              <div className="space-y-1.5">
                <Label htmlFor="asistentes" className="text-sm">Asistentes</Label>
                <Input
                  id="asistentes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="Cantidad"
                  disabled={enviando}
                  {...form.register('asistentes', {
                    setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                  })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="observaciones" className="text-sm">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales"
                rows={2}
                disabled={enviando}
                {...form.register('observaciones', {
                  setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Fotos (1 a 3)</Label>
              <FotosUploader fotos={fotos} onChange={setFotos} max={3} disabled={enviando} />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={enviando || !jornadaSeleccionada}
          className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
        >
          {enviando ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Guardar registro</>
          )}
        </Button>
      </form>
    </div>
  )
}
