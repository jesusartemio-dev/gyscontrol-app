'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { badgeNivelRiesgo } from '@/lib/iperc/colorRiesgo'
import { evaluarRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'
import { PELIGROS_CATALOGO } from '@/lib/iperc/catalogos/peligros'
import { CONTROLES_CATALOGO } from '@/lib/iperc/catalogos/controles'
import type { IpercFila } from '@/types/iperc'

const FACTORES = [
  'MECÁNICO', 'LOCATIVO', 'ELÉCTRICO', 'FÍSICO', 'QUÍMICO',
  'ERGONÓMICO', 'PSICOSOCIAL', 'BIOLÓGICO', 'FISICOQUÍMICO',
] as const

const PROBABILIDADES = ['A', 'B', 'C', 'D', 'E'] as const
const SEVERIDADES = [1, 2, 3, 4, 5] as const

const SEV_LABELS: Record<number, string> = {
  1: '1 – Catastrófica',
  2: '2 – Mortal',
  3: '3 – Permanente',
  4: '4 – Temporal',
  5: '5 – Menor',
}
const PROB_LABELS: Record<string, string> = {
  A: 'A – Común',
  B: 'B – Ha sucedido',
  C: 'C – Podría suceder',
  D: 'D – Raro',
  E: 'E – Práct. imposible',
}

const filaFormSchema = z.object({
  proceso: z.string().min(1, 'Requerido'),
  actividad: z.string().min(1, 'Requerido'),
  tarea: z.string().min(1, 'Requerido'),
  puestoTrabajo: z.string().min(1, 'Requerido'),
  factorRiesgo: z.string().min(1, 'Requerido'),
  condicionActividad: z.enum(['Rutinaria', 'No rutinaria']),
  peligro: z.string().min(1, 'Requerido'),
  riesgo: z.string().min(1, 'Requerido'),
  consecuencia: z.string().min(1, 'Requerido'),
  severidad: z.coerce.number().int().min(1).max(5),
  probabilidad: z.string().min(1),
  eliminar: z.string().optional(),
  sustituir: z.string().optional(),
  controlIngenieria: z.string().optional(),
  controlAdministrativo: z.string().optional(),
  controlReceptor: z.string().optional(),
  severidadResidual: z.coerce.number().int().min(1).max(5),
  probabilidadResidual: z.string().min(1),
  accionesMejora: z.string().optional(),
  responsables: z.string().optional(),
})

type FilaFormValues = z.infer<typeof filaFormSchema>

interface Props {
  open: boolean
  onClose: () => void
  proyectoId: string
  fila: IpercFila | null
  onSaved: (fila: IpercFila) => void
}

export function EditorFilaSheet({ open, onClose, proyectoId, fila, onSaved }: Props) {
  const isEdit = fila !== null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FilaFormValues>({
    resolver: zodResolver(filaFormSchema),
    defaultValues: {
      proceso: '',
      actividad: '',
      tarea: '',
      puestoTrabajo: '',
      factorRiesgo: 'MECÁNICO',
      condicionActividad: 'Rutinaria',
      peligro: '',
      riesgo: '',
      consecuencia: '',
      severidad: 3,
      probabilidad: 'C',
      eliminar: '',
      sustituir: '',
      controlIngenieria: '',
      controlAdministrativo: '',
      controlReceptor: '',
      severidadResidual: 4,
      probabilidadResidual: 'D',
      accionesMejora: '',
      responsables: '',
    },
  })

  const factorRiesgo = watch('factorRiesgo')
  const severidad = watch('severidad')
  const probabilidad = watch('probabilidad')
  const severidadResidual = watch('severidadResidual')
  const probabilidadResidual = watch('probabilidadResidual')

  const nivelInicial = evaluarRiesgo(Number(severidad), probabilidad)
  const nivelResidual = evaluarRiesgo(Number(severidadResidual), probabilidadResidual)

  useEffect(() => {
    if (open) {
      if (fila) {
        reset({
          proceso: fila.proceso,
          actividad: fila.actividad,
          tarea: fila.tarea,
          puestoTrabajo: fila.puestoTrabajo,
          factorRiesgo: fila.factorRiesgo,
          condicionActividad: fila.condicionActividad as 'Rutinaria' | 'No rutinaria',
          peligro: fila.peligro,
          riesgo: fila.riesgo,
          consecuencia: fila.consecuencia,
          severidad: fila.severidad,
          probabilidad: fila.probabilidad,
          eliminar: fila.eliminar ?? '',
          sustituir: fila.sustituir ?? '',
          controlIngenieria: fila.controlIngenieria ?? '',
          controlAdministrativo: fila.controlAdministrativo ?? '',
          controlReceptor: fila.controlReceptor ?? '',
          severidadResidual: fila.severidadResidual,
          probabilidadResidual: fila.probabilidadResidual,
          accionesMejora: fila.accionesMejora ?? '',
          responsables: fila.responsables ?? '',
        })
      } else {
        reset()
      }
    }
  }, [open, fila, reset])

  const peligrosSugeridos = PELIGROS_CATALOGO.filter(p => p.categoria === factorRiesgo)

  const onPeligroSelect = (item: (typeof PELIGROS_CATALOGO)[number]) => {
    setValue('peligro', item.peligro)
    setValue('riesgo', item.riesgo)
    setValue('consecuencia', item.consecuencia)
  }

  const getControlesSugeridos = (jerarquia: string) =>
    CONTROLES_CATALOGO.filter(c => c.jerarquia === jerarquia).slice(0, 5)

  const onSubmit = async (values: FilaFormValues) => {
    try {
      const url = isEdit
        ? `/api/proyectos/${proyectoId}/iperc/filas/${fila!.id}`
        : `/api/proyectos/${proyectoId}/iperc/filas`

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al guardar')
      }
      const { data } = await res.json()
      toast.success(isEdit ? 'Fila actualizada' : 'Fila agregada')
      onSaved(data)
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEdit ? 'Editar fila' : 'Nueva fila'} IPERC</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Origen */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Origen
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Proceso *</Label>
                <Input {...register('proceso')} className="h-8 text-sm mt-0.5" />
                {errors.proceso && <p className="text-xs text-destructive mt-0.5">{errors.proceso.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Actividad *</Label>
                <Input {...register('actividad')} className="h-8 text-sm mt-0.5" />
                {errors.actividad && <p className="text-xs text-destructive mt-0.5">{errors.actividad.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Tarea *</Label>
                <Input {...register('tarea')} className="h-8 text-sm mt-0.5" />
                {errors.tarea && <p className="text-xs text-destructive mt-0.5">{errors.tarea.message}</p>}
              </div>
            </div>
          </div>

          {/* Puesto y Factor */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Puesto y Factor
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Puesto de trabajo *</Label>
                <Input {...register('puestoTrabajo')} className="h-8 text-sm mt-0.5" />
                {errors.puestoTrabajo && <p className="text-xs text-destructive mt-0.5">{errors.puestoTrabajo.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Factor de riesgo *</Label>
                <Select
                  value={factorRiesgo}
                  onValueChange={v => setValue('factorRiesgo', v)}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTORES.map(f => (
                      <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Condición *</Label>
                <Select
                  value={watch('condicionActividad')}
                  onValueChange={v => setValue('condicionActividad', v as 'Rutinaria' | 'No rutinaria')}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rutinaria" className="text-xs">Rutinaria</SelectItem>
                    <SelectItem value="No rutinaria" className="text-xs">No rutinaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Peligro con autocomplete */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Peligro / Riesgo
            </h3>
            {peligrosSugeridos.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Sugerencias para {factorRiesgo}:</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {peligrosSugeridos.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onPeligroSelect(p)}
                      className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors text-left"
                    >
                      {p.peligro}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Peligro *</Label>
                <Input {...register('peligro')} className="h-8 text-sm mt-0.5" />
                {errors.peligro && <p className="text-xs text-destructive mt-0.5">{errors.peligro.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Riesgo *</Label>
                <Input {...register('riesgo')} className="h-8 text-sm mt-0.5" />
                {errors.riesgo && <p className="text-xs text-destructive mt-0.5">{errors.riesgo.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Consecuencia *</Label>
                <Input {...register('consecuencia')} className="h-8 text-sm mt-0.5" />
                {errors.consecuencia && <p className="text-xs text-destructive mt-0.5">{errors.consecuencia.message}</p>}
              </div>
            </div>
          </div>

          {/* Evaluación inicial */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Evaluación inicial
            </h3>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs">Severidad (1-5)</Label>
                <Select
                  value={String(severidad)}
                  onValueChange={v => setValue('severidad', Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map(s => (
                      <SelectItem key={s} value={String(s)} className="text-xs">{SEV_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Probabilidad (A-E)</Label>
                <Select
                  value={probabilidad}
                  onValueChange={v => setValue('probabilidad', v)}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBABILIDADES.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{PROB_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pb-0.5">
                {nivelInicial ? (
                  <Badge className={`${badgeNivelRiesgo(nivelInicial.nivel)} text-xs`}>
                    {nivelInicial.nivel} ({nivelInicial.valor})
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Controles
            </h3>
            <Accordion type="multiple" className="border rounded-md">
              {(
                [
                  { key: 'eliminar', label: 'Eliminar', jerarquia: 'eliminar' },
                  { key: 'sustituir', label: 'Sustituir', jerarquia: 'sustituir' },
                  { key: 'controlIngenieria', label: 'Ingeniería', jerarquia: 'ingenieria' },
                  { key: 'controlAdministrativo', label: 'Administrativo', jerarquia: 'administrativo' },
                  { key: 'controlReceptor', label: 'EPP / Receptor', jerarquia: 'epp' },
                ] as const
              ).map(({ key, label, jerarquia }) => {
                const sugerencias = getControlesSugeridos(jerarquia)
                return (
                  <AccordionItem key={key} value={key} className="border-b last:border-b-0 px-2">
                    <AccordionTrigger className="text-xs py-2">{label}</AccordionTrigger>
                    <AccordionContent>
                      {sugerencias.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {sugerencias.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-muted transition-colors text-left"
                              onClick={() => {
                                const curr = (watch(key as keyof FilaFormValues) as string) ?? ''
                                setValue(
                                  key as keyof FilaFormValues,
                                  curr ? `${curr}; ${s.texto}` : s.texto
                                )
                              }}
                            >
                              + {s.texto}
                            </button>
                          ))}
                        </div>
                      )}
                      <Textarea
                        {...register(key as keyof FilaFormValues)}
                        className="text-xs h-16 resize-none"
                        placeholder={`Describí el control de ${label.toLowerCase()}…`}
                      />
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          {/* Evaluación residual */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Evaluación residual
            </h3>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs">Severidad residual</Label>
                <Select
                  value={String(severidadResidual)}
                  onValueChange={v => setValue('severidadResidual', Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map(s => (
                      <SelectItem key={s} value={String(s)} className="text-xs">{SEV_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Probabilidad residual</Label>
                <Select
                  value={probabilidadResidual}
                  onValueChange={v => setValue('probabilidadResidual', v)}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBABILIDADES.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{PROB_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pb-0.5">
                {nivelResidual ? (
                  <Badge className={`${badgeNivelRiesgo(nivelResidual.nivel)} text-xs`}>
                    {nivelResidual.nivel} ({nivelResidual.valor})
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Plan de acción */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Plan de acción
            </h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Acciones de mejora</Label>
                <Textarea
                  {...register('accionesMejora')}
                  className="text-xs h-16 resize-none mt-0.5"
                  placeholder="Describí las acciones de mejora…"
                />
              </div>
              <div>
                <Label className="text-xs">Responsables</Label>
                <Input
                  {...register('responsables')}
                  className="h-8 text-sm mt-0.5"
                  placeholder="Nombres o cargos"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {isEdit ? 'Guardar cambios' : 'Agregar fila'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
