'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { X } from 'lucide-react'

export interface FiltrosRegistrosValor {
  tipo: TipoRegistroSeguridad | 'todos'
  proyectoId: string
  fechaDesde: string
  fechaHasta: string
}

interface ProyectoOpt {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  value: FiltrosRegistrosValor
  onChange: (v: FiltrosRegistrosValor) => void
  proyectos: ProyectoOpt[]
}

const TIPOS_ORDENADOS: TipoRegistroSeguridad[] = [
  'charla',
  'inspeccion',
  'observacion',
  'incidente',
  'actividad_general',
  'riesgo_critico',
  'medio_ambiente',
  'prevencion_salud',
]

export function FiltrosRegistros({ value, onChange, proyectos }: Props) {
  const limpiar = () =>
    onChange({ tipo: 'todos', proyectoId: '', fechaDesde: '', fechaHasta: '' })

  const hayFiltros =
    value.tipo !== 'todos' || value.proyectoId !== '' || value.fechaDesde !== '' || value.fechaHasta !== ''

  return (
    <Card>
      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={value.tipo}
            onValueChange={(v) => onChange({ ...value, tipo: v as FiltrosRegistrosValor['tipo'] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS_ORDENADOS.map((t) => (
                <SelectItem key={t} value={t}>{TIPO_REGISTRO_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Proyecto</Label>
          <Select
            value={value.proyectoId || 'todos'}
            onValueChange={(v) => onChange({ ...value, proyectoId: v === 'todos' ? '' : v })}
          >
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-mono text-[10px] mr-2">{p.codigo}</span>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={value.fechaDesde}
            onChange={(e) => onChange({ ...value, fechaDesde: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={value.fechaHasta}
            onChange={(e) => onChange({ ...value, fechaHasta: e.target.value })}
          />
        </div>

        {hayFiltros && (
          <div className="sm:col-span-4 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
