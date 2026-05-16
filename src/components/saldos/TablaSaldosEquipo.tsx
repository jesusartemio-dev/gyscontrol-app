'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X, Save, CalendarOff } from 'lucide-react'
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaldoRow {
  id: string
  anio: number
  diasAsignados: number
  diasGozados: number
  diasPendientes: number
  diasDisponibles: number
  user: { id: string; name: string; email: string }
  tipoAusencia: { id: string; codigo: string; nombre: string; color: string }
}

interface TipoAusencia {
  id: string
  codigo: string
  nombre: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSaldo(valor: number, codigo: string): string {
  return codigo === 'COMP_HE' ? `${valor}h` : `${valor}d`
}

function colorDisponibles(valor: number, codigo: string): string {
  if (codigo === 'COMP_HE') {
    if (valor <= 0) return 'text-destructive'
    if (valor <= 9.5) return 'text-amber-600'
    return 'text-emerald-600'
  }
  if (valor <= 0) return 'text-destructive'
  if (valor <= 3) return 'text-amber-600'
  return 'text-emerald-600'
}

// ── Ajuste Modal ───────────────────────────────────────────────────────────────

function AjusteModal({
  saldo,
  anioFiltro,
  tipos,
  usuarios,
  onClose,
  onSaved,
}: {
  saldo?: SaldoRow
  anioFiltro: number
  tipos: TipoAusencia[]
  usuarios: Array<{ id: string; name: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const [userId, setUserId] = useState(saldo?.user.id ?? '')
  const [tipoAusenciaId, setTipoAusenciaId] = useState(saldo?.tipoAusencia.id ?? '')
  const [dias, setDias] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const tipoSeleccionado = tipos.find((t) => t.id === tipoAusenciaId)
  const esCompHe = tipoSeleccionado?.codigo === 'COMP_HE'

  const handleSave = async () => {
    if (!userId || !tipoAusenciaId || !dias || !motivo.trim()) {
      toast.error('Complete todos los campos requeridos')
      return
    }
    const parsedDias = parseFloat(dias)
    if (isNaN(parsedDias)) {
      toast.error(esCompHe ? 'Las horas deben ser un número' : 'Los días deben ser un número')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/saldos-ausencia/ajuste', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tipoAusenciaId, anio: anioFiltro, dias: parsedDias, motivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al ajustar')
      toast.success('Saldo ajustado correctamente')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Ajuste de saldo</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label>Colaborador <span className="text-destructive">*</span></Label>
            <Select value={userId} onValueChange={setUserId} disabled={Boolean(saldo)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar colaborador..." /></SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de ausencia <span className="text-destructive">*</span></Label>
            <Select value={tipoAusenciaId} onValueChange={setTipoAusenciaId} disabled={Boolean(saldo)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {esCompHe ? 'Horas a ajustar' : 'Días a ajustar'}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.5"
              placeholder={esCompHe ? 'Ej: 9.5 (suma) o -9.5 (resta)' : 'Ej: 5 (suma) o -3 (resta)'}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {esCompHe
                ? 'Positivo para agregar horas, negativo para reducir. 1 día = 9.5h'
                : 'Positivo para agregar días, negativo para reducir.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo del ajuste <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Ej: Ajuste acordado con el coordinador..."
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Aplicar ajuste'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface TablaSaldosEquipoProps {
  titulo: string
  subtitulo: string
  /** Código del tipo de ausencia a preseleccionar al cargar (e.g. 'COMP_HE'). Omitir para 'Todos'. */
  defaultTipoCodigo?: string
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TablaSaldosEquipo({ titulo, subtitulo, defaultTipoCodigo }: TablaSaldosEquipoProps) {
  const currentYear = new Date().getFullYear()
  const [anio, setAnio] = useState(currentYear)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroUser, setFiltroUser] = useState('')

  const [saldos, setSaldos] = useState<SaldoRow[]>([])
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [usuarios, setUsuarios] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [ajusteModal, setAjusteModal] = useState<{ open: boolean; saldo?: SaldoRow }>({ open: false })

  const defaultAppliedRef = useRef(false)

  // Aplicar filtro por defecto una sola vez cuando se carguen los tipos
  useEffect(() => {
    if (!defaultTipoCodigo || defaultAppliedRef.current || tipos.length === 0) return
    const tipo = tipos.find((t) => t.codigo === defaultTipoCodigo)
    if (tipo) {
      defaultAppliedRef.current = true
      setFiltroTipo(tipo.id)
    }
  }, [tipos, defaultTipoCodigo])

  const cargar = () => {
    setLoading(true)
    const params = new URLSearchParams({ anio: String(anio) })
    if (filtroTipo !== 'todos') params.set('tipoAusenciaId', filtroTipo)
    if (filtroUser) params.set('userId', filtroUser)
    fetch(`/api/saldos-ausencia?${params}`)
      .then((r) => r.json())
      .then((d) => setSaldos(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Error al cargar saldos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/tipos-ausencia').then((r) => r.json()),
      fetch('/api/admin/usuarios?activo=true').then((r) => (r.ok ? r.json() : [])),
    ]).then(([tps, usrs]) => {
      setTipos(Array.isArray(tps) ? tps : [])
      setUsuarios(Array.isArray(usrs) ? usrs : [])
    })
  }, [])

  useEffect(() => { cargar() }, [anio, filtroTipo, filtroUser])

  const años = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="text-sm text-muted-foreground">{subtitulo}</p>
          </div>
        </div>
        <Button onClick={() => setAjusteModal({ open: true })}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ajuste
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {años.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtroUser || 'todos'} onValueChange={(v) => setFiltroUser(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos los colaboradores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los colaboradores</SelectItem>
            {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : saldos.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          No hay saldos registrados con los filtros actuales.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Colaborador</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-center font-medium">Asignados</th>
                <th className="px-4 py-3 text-center font-medium">Gozados</th>
                <th className="px-4 py-3 text-center font-medium">Pendientes</th>
                <th className="px-4 py-3 text-center font-medium">Disponibles</th>
                <th className="px-4 py-3 text-right font-medium">Ajustar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {saldos.map((s) => {
                const codigo = s.tipoAusencia.codigo
                return (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.user.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.tipoAusencia.color }} />
                        {s.tipoAusencia.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{formatSaldo(s.diasAsignados, codigo)}</td>
                    <td className="px-4 py-3 text-center">{formatSaldo(s.diasGozados, codigo)}</td>
                    <td className="px-4 py-3 text-center">{formatSaldo(s.diasPendientes, codigo)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${colorDisponibles(s.diasDisponibles, codigo)}`}>
                        {formatSaldo(s.diasDisponibles, codigo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setAjusteModal({ open: true, saldo: s })}>
                        Ajustar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {ajusteModal.open && (
        <AjusteModal
          saldo={ajusteModal.saldo}
          anioFiltro={anio}
          tipos={tipos}
          usuarios={usuarios}
          onClose={() => setAjusteModal({ open: false })}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
