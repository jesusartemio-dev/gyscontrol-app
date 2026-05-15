'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, X, Save, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Schema ────────────────────────────────────────────────────────────────────

const FormSchema = z.object({
  codigo: z.string().min(1).max(20).regex(/^[A-Z][A-Z0-9_]*$/, 'Solo MAYÚSCULAS, números y guiones bajos'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido').default('#6366f1'),
  descuentaSaldo: z.boolean().default(false),
  diasPorDefecto: z.number().positive().nullable().optional(),
  tipoCicloSaldo: z.enum(['anio_calendario', 'anio_servicio', 'sin_ciclo']).default('sin_ciclo'),
  requiereDocumento: z.boolean().default(false),
  requiereAprobacion: z.boolean().default(true),
  requiereAprobacion2: z.boolean().default(false),
  diasUmbralAprobacion2: z.number().int().positive().nullable().optional(),
  aplicaFinDeSemana: z.boolean().default(false),
  orden: z.number().int().min(0).default(0),
})

type FormValues = z.infer<typeof FormSchema>

// ── Types ─────────────────────────────────────────────────────────────────────

interface TipoAusencia {
  id: string
  codigo: string
  nombre: string
  color: string
  descuentaSaldo: boolean
  diasPorDefecto: number | null
  tipoCicloSaldo: string
  requiereDocumento: boolean
  requiereAprobacion: boolean
  requiereAprobacion2: boolean
  diasUmbralAprobacion2: number | null
  aplicaFinDeSemana: boolean
  activo: boolean
  orden: number
}

const CICLO_LABELS: Record<string, string> = {
  anio_calendario: 'Año calendario',
  anio_servicio: 'Año de servicio',
  sin_ciclo: 'Sin ciclo',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function TipoModal({
  tipo,
  onClose,
  onSaved,
}: {
  tipo?: TipoAusencia
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = Boolean(tipo)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: tipo
      ? {
          codigo: tipo.codigo,
          nombre: tipo.nombre,
          color: tipo.color,
          descuentaSaldo: tipo.descuentaSaldo,
          diasPorDefecto: tipo.diasPorDefecto ?? undefined,
          tipoCicloSaldo: tipo.tipoCicloSaldo as any,
          requiereDocumento: tipo.requiereDocumento,
          requiereAprobacion: tipo.requiereAprobacion,
          requiereAprobacion2: tipo.requiereAprobacion2,
          diasUmbralAprobacion2: tipo.diasUmbralAprobacion2 ?? undefined,
          aplicaFinDeSemana: tipo.aplicaFinDeSemana,
          orden: tipo.orden,
        }
      : {
          codigo: '',
          nombre: '',
          color: '#6366f1',
          descuentaSaldo: false,
          tipoCicloSaldo: 'sin_ciclo',
          requiereDocumento: false,
          requiereAprobacion: true,
          requiereAprobacion2: false,
          aplicaFinDeSemana: false,
          orden: 0,
        },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const url = isEditing ? `/api/tipos-ausencia/${tipo!.id}` : '/api/tipos-ausencia'
      const method = isEditing ? 'PUT' : 'POST'
      const payload = isEditing
        ? { ...values, codigo: undefined } // código no se puede cambiar
        : values

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      toast.success(isEditing ? 'Tipo actualizado' : 'Tipo creado')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  })

  const colorVal = watch('color')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Editar tipo de ausencia' : 'Nuevo tipo de ausencia'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-1.5">
              <Label>Código <span className="text-destructive">*</span></Label>
              <Input
                {...register('codigo')}
                placeholder="VAC"
                disabled={isEditing}
                className={isEditing ? 'bg-muted' : ''}
              />
              {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('nombre')} placeholder="Vacaciones" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={colorVal} onChange={(e) => setValue('color', e.target.value)} className="h-9 w-10 rounded border p-0.5" />
                <Input {...register('color')} placeholder="#6366f1" className="font-mono text-xs" />
              </div>
              {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
            </div>

            {/* Orden */}
            <div className="space-y-1.5">
              <Label>Orden</Label>
              <Input type="number" {...register('orden', { valueAsNumber: true })} placeholder="0" />
            </div>
          </div>

          {/* Ciclo saldo */}
          <div className="space-y-1.5">
            <Label>Ciclo de saldo</Label>
            <Select value={watch('tipoCicloSaldo')} onValueChange={(v) => setValue('tipoCicloSaldo', v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CICLO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Días por defecto */}
          <div className="space-y-1.5">
            <Label>Días por defecto <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              type="number"
              step="0.5"
              placeholder="30"
              {...register('diasPorDefecto', { setValueAs: (v) => v === '' ? null : Number(v) })}
            />
          </div>

          {/* Switches */}
          <div className="space-y-3">
            {[
              { key: 'descuentaSaldo', label: 'Descuenta saldo' },
              { key: 'requiereDocumento', label: 'Requiere documento' },
              { key: 'requiereAprobacion', label: 'Requiere aprobación' },
              { key: 'requiereAprobacion2', label: 'Requiere doble aprobación' },
              { key: 'aplicaFinDeSemana', label: 'Aplica fines de semana' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-normal">{label}</Label>
                <Switch
                  checked={watch(key as keyof FormValues) as boolean}
                  onCheckedChange={(v) => setValue(key as keyof FormValues, v as any)}
                />
              </div>
            ))}
          </div>

          {/* Umbral aprobación 2 */}
          {watch('requiereAprobacion2') && (
            <div className="space-y-1.5">
              <Label>Umbral para doble aprobación (días) <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                type="number"
                placeholder="Ej: 5 (activa nivel 2 si días > 5)"
                {...register('diasUmbralAprobacion2', { setValueAs: (v) => v === '' ? null : Number(v) })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TiposAusenciaPage() {
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; tipo?: TipoAusencia }>({ open: false })
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const cargar = () => {
    setLoading(true)
    fetch(`/api/tipos-ausencia${mostrarInactivos ? '?inactivos=true' : ''}`)
      .then((r) => r.json())
      .then((d) => setTipos(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Error al cargar tipos de ausencia'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [mostrarInactivos])

  const toggleActivo = async (tipo: TipoAusencia) => {
    const res = await fetch(`/api/tipos-ausencia/${tipo.id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !tipo.activo }),
    })
    if (res.ok) {
      toast.success(`Tipo ${tipo.activo ? 'desactivado' : 'activado'}`)
      cargar()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al cambiar estado')
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Tipos de Ausencia</h1>
            <p className="text-sm text-muted-foreground">Catálogo de tipos de ausencia del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={mostrarInactivos} onCheckedChange={setMostrarInactivos} />
            Mostrar inactivos
          </label>
          <Button onClick={() => setModal({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo tipo
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : tipos.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          No hay tipos de ausencia.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Código</th>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Ciclo</th>
                <th className="px-4 py-3 text-center font-medium">Días</th>
                <th className="px-4 py-3 text-center font-medium">Saldo</th>
                <th className="px-4 py-3 text-center font-medium">Aprob.</th>
                <th className="px-4 py-3 text-center font-medium">Fin semana</th>
                <th className="px-4 py-3 text-center font-medium">Activo</th>
                <th className="px-4 py-3 text-right font-medium">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tipos.map((t) => (
                <tr key={t.id} className={`hover:bg-muted/20 ${!t.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.codigo}</code>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{t.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{CICLO_LABELS[t.tipoCicloSaldo] ?? t.tipoCicloSaldo}</td>
                  <td className="px-4 py-3 text-center">{t.diasPorDefecto ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.descuentaSaldo ? 'default' : 'outline'}>
                      {t.descuentaSaldo ? 'Sí' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.requiereAprobacion2 ? '2 niveles' : t.requiereAprobacion ? '1 nivel' : 'No'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.aplicaFinDeSemana ? 'default' : 'outline'}>
                      {t.aplicaFinDeSemana ? 'Sí' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={t.activo} onCheckedChange={() => toggleActivo(t)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setModal({ open: true, tipo: t })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <TipoModal
          tipo={modal.tipo}
          onClose={() => setModal({ open: false })}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
