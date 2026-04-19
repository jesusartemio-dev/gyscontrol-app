'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Loader2, Home } from 'lucide-react'

type Modalidad = 'presencial' | 'remoto' | 'hibrido'
type Dia = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface EmpleadoRow {
  id: string
  modalidadTrabajo: Modalidad
  diasRemoto: Dia[]
  user: { id: string; name: string | null; email: string }
  cargo: { nombre: string } | null
  departamento: { nombre: string } | null
}

const DIAS: Dia[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export default function ModalidadesPage() {
  const [data, setData] = useState<EmpleadoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/asistencia/modalidades')
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

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
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Días remoto (si híbrido)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(e => (
                  <TableRow key={e.id}>
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
                          <SelectItem value="remoto">100% Remoto</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
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
                          {e.modalidadTrabajo === 'remoto' ? 'todos los días' : 'n/a'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay empleados registrados. Ve a Configuración → Personal (RRHH).
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
