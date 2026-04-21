'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Home, Search, AlertTriangle, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'

type Modalidad = 'presencial' | 'remoto' | 'hibrido' | 'confianza'
type Dia = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface EmpleadoRow {
  id: string
  modalidadTrabajo: Modalidad
  diasRemoto: Dia[]
  user: { id: string; name: string | null; email: string }
  cargo: { nombre: string } | null
  departamento: { nombre: string } | null
}

interface UsuarioSinFicha {
  id: string
  name: string | null
  email: string
  role: string
  lastLoginAt: string | null
}

const DIAS: Dia[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export default function ModalidadesPage() {
  const [data, setData] = useState<EmpleadoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroModalidad, setFiltroModalidad] = useState('todos')
  const [sinFicha, setSinFicha] = useState(0)
  const [usuariosSinFicha, setUsuariosSinFicha] = useState<UsuarioSinFicha[]>([])
  const [mostrarSinFicha, setMostrarSinFicha] = useState(false)

  async function cargar() {
    setLoading(true)
    const [modalidades, sinFichaData] = await Promise.all([
      fetch('/api/asistencia/modalidades').then(r => r.json()),
      fetch('/api/asistencia/modalidades/sin-ficha').then(r => r.json()),
    ])
    setData(modalidades)
    setSinFicha(sinFichaData.total ?? 0)
    setUsuariosSinFicha(sinFichaData.usuarios ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const departamentos = useMemo(() => {
    const set = new Set(data.map(e => e.departamento?.nombre).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [data])

  const cargos = useMemo(() => {
    const set = new Set(
      data
        .filter(e => filtroDepartamento === 'todos' || e.departamento?.nombre === filtroDepartamento)
        .map(e => e.cargo?.nombre)
        .filter(Boolean) as string[],
    )
    return Array.from(set).sort()
  }, [data, filtroDepartamento])

  const datosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return data.filter(e => {
      if (q && !(e.user.name?.toLowerCase().includes(q) || e.user.email.toLowerCase().includes(q))) return false
      if (filtroDepartamento !== 'todos' && e.departamento?.nombre !== filtroDepartamento) return false
      if (filtroCargo !== 'todos' && e.cargo?.nombre !== filtroCargo) return false
      if (filtroModalidad !== 'todos' && e.modalidadTrabajo !== filtroModalidad) return false
      return true
    })
  }, [data, busqueda, filtroDepartamento, filtroCargo, filtroModalidad])

  async function guardar(empleadoId: string, patch: Partial<Pick<EmpleadoRow, 'modalidadTrabajo' | 'diasRemoto'>>) {
    const empleado = data.find(e => e.id === empleadoId)
    if (!empleado) return
    const nuevoEstado = { ...empleado, ...patch }
    setSavingId(empleadoId)
    setData(prev => prev.map(e => (e.id === empleadoId ? nuevoEstado : e)))
    try {
      const r = await fetch(`/api/asistencia/modalidades/${empleadoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modalidadTrabajo: nuevoEstado.modalidadTrabajo,
          diasRemoto: nuevoEstado.diasRemoto,
        }),
      })
      if (!r.ok) {
        toast.error('Error al guardar')
        cargar()
      } else {
        toast.success('Guardado')
      }
    } finally {
      setSavingId(null)
    }
  }

  function toggleDia(empleadoId: string, dia: Dia) {
    const empleado = data.find(e => e.id === empleadoId)
    if (!empleado) return
    const activos = empleado.diasRemoto.includes(dia)
      ? empleado.diasRemoto.filter(d => d !== dia)
      : [...empleado.diasRemoto, dia]
    guardar(empleadoId, { diasRemoto: activos })
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Home className="h-6 w-6" /> Modalidades de Trabajo
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura qué empleados son presenciales, remotos o híbridos (días fijos)
        </p>
      </div>

      {sinFicha > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50">
          <div className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{sinFicha} usuario{sinFicha > 1 ? 's' : ''}</span> no tienen ficha de empleado y no aparecen aquí.
            </p>
            <button
              type="button"
              className="ml-auto flex items-center gap-1 text-sm font-medium text-amber-800 underline hover:text-amber-900"
              onClick={() => setMostrarSinFicha(v => !v)}
            >
              {mostrarSinFicha ? (
                <>Ocultar lista <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Ver quiénes <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
            <Link
              href="/admin/personal"
              className="shrink-0 text-sm font-medium text-amber-700 underline hover:text-amber-900"
            >
              Ir a Personal (RRHH) →
            </Link>
          </div>
          {mostrarSinFicha && (
            <div className="border-t border-amber-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosSinFicha.map((u, i) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{u.name || '—'}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-PE') : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href="/admin/personal"
                          className="inline-flex items-center gap-1 text-xs text-amber-700 underline hover:text-amber-900"
                        >
                          <UserPlus className="h-3 w-3" /> Crear ficha
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">Buscar empleado</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre o email..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Departamento</label>
            <Select
              value={filtroDepartamento}
              onValueChange={v => { setFiltroDepartamento(v); setFiltroCargo('todos') }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {departamentos.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cargo</label>
            <Select value={filtroCargo} onValueChange={setFiltroCargo}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {cargos.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Modalidad</label>
            <Select value={filtroModalidad} onValueChange={setFiltroModalidad}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="remoto">Remoto</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
                <SelectItem value="confianza">Confianza</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(busqueda || filtroDepartamento !== 'todos' || filtroCargo !== 'todos' || filtroModalidad !== 'todos') && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => { setBusqueda(''); setFiltroDepartamento('todos'); setFiltroCargo('todos'); setFiltroModalidad('todos') }}
            >
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {!loading && data.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          Mostrando <span className="font-semibold">{datosFiltrados.length}</span> de {data.length} empleados
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Días remoto (si híbrido)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datosFiltrados.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{e.user.name || e.user.email}</p>
                        <p className="text-xs text-muted-foreground">{e.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{e.departamento?.nombre || '—'}</TableCell>
                    <TableCell className="text-xs">{e.cargo?.nombre || '—'}</TableCell>
                    <TableCell>
                      <Select
                        value={e.modalidadTrabajo}
                        onValueChange={(v: Modalidad) =>
                          guardar(e.id, { modalidadTrabajo: v, diasRemoto: v === 'hibrido' ? e.diasRemoto : [] })
                        }
                        disabled={savingId === e.id}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="remoto">Remoto</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                          <SelectItem value="confianza">Confianza</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {e.modalidadTrabajo === 'hibrido' ? (
                        <div className="flex flex-wrap gap-1">
                          {DIAS.map(d => {
                            const activo = e.diasRemoto.includes(d)
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleDia(e.id, d)}
                                disabled={savingId === e.id}
                                className={`rounded border px-2 py-0.5 text-xs ${
                                  activo
                                    ? 'border-purple-400 bg-purple-100 text-purple-800'
                                    : 'bg-white text-gray-600'
                                }`}
                              >
                                {d.slice(0, 3)}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {e.modalidadTrabajo === 'remoto'
                            ? 'todos los días'
                            : e.modalidadTrabajo === 'confianza'
                            ? 'sin restricción'
                            : 'n/a'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {datosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {data.length === 0
                        ? 'No hay empleados registrados. Ve a Configuración → Personal (RRHH).'
                        : 'Sin resultados para los filtros aplicados.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
