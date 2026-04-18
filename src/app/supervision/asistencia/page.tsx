'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Download, Loader2, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Fila {
  id: string
  fechaHora: string
  tipo: string
  minutosTarde: number
  estado: string
  dentroGeofence: boolean
  metodoMarcaje: string
  banderas: string[]
  user: { name: string | null; email: string }
  empleado: { departamento: { nombre: string } | null; cargo: { nombre: string } | null } | null
  ubicacion: { nombre: string; tipo: string } | null
  dispositivo: { nombre: string | null; modelo: string | null; plataforma: string; aprobado: boolean }
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}
function haceDias(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function estadoColor(e: string) {
  switch (e) {
    case 'a_tiempo':
      return 'bg-emerald-100 text-emerald-700'
    case 'tarde':
      return 'bg-amber-100 text-amber-700'
    case 'muy_tarde':
      return 'bg-red-100 text-red-700'
    case 'fuera_zona':
      return 'bg-orange-100 text-orange-700'
    case 'dispositivo_nuevo':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function SupervisionAsistencia() {
  const [data, setData] = useState<Fila[]>([])
  const [loading, setLoading] = useState(false)
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoy())
  const [estado, setEstado] = useState('todos')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta })
    if (estado !== 'todos') params.set('estado', estado)
    const r = await fetch(`/api/asistencia/reporte?${params}`)
    const j = await r.json()
    setData(j)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exportarExcel() {
    const rows = data.map(f => ({
      Fecha: new Date(f.fechaHora).toLocaleString('es-PE'),
      Trabajador: f.user.name || f.user.email,
      Departamento: f.empleado?.departamento?.nombre || '',
      Cargo: f.empleado?.cargo?.nombre || '',
      Tipo: f.tipo,
      Ubicación: f.ubicacion?.nombre || '',
      'Min. tarde': f.minutosTarde,
      Estado: f.estado,
      Geofence: f.dentroGeofence ? 'Dentro' : 'Fuera',
      Método: f.metodoMarcaje,
      Dispositivo: `${f.dispositivo.modelo || f.dispositivo.plataforma}${
        f.dispositivo.aprobado ? '' : ' (NUEVO)'
      }`,
      Banderas: f.banderas.join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
    XLSX.writeFile(wb, `asistencia_${desde}_a_${hasta}.xlsx`)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supervisión de Asistencia</h1>
          <p className="text-sm text-muted-foreground">
            Marcajes del equipo y gestión de dispositivos
          </p>
        </div>
        <Link href="/supervision/asistencia/dispositivos">
          <Button variant="outline">
            <ShieldCheck className="mr-2 h-4 w-4" /> Aprobar dispositivos
          </Button>
        </Link>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="a_tiempo">A tiempo</SelectItem>
                <SelectItem value="tarde">Tarde</SelectItem>
                <SelectItem value="muy_tarde">Muy tarde</SelectItem>
                <SelectItem value="fuera_zona">Fuera zona</SelectItem>
                <SelectItem value="dispositivo_nuevo">Dispositivo nuevo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={cargar} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Filtrar
          </Button>
          <Button variant="outline" onClick={exportarExcel} disabled={data.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Trabajador</TableHead>
                <TableHead>Dpto.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Min tarde</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Dispositivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(f.fechaHora).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>{f.user.name || f.user.email}</TableCell>
                  <TableCell className="text-xs">{f.empleado?.departamento?.nombre || '—'}</TableCell>
                  <TableCell>{f.tipo.replace('_', ' ')}</TableCell>
                  <TableCell>{f.ubicacion?.nombre || '—'}</TableCell>
                  <TableCell>{f.minutosTarde > 0 ? `${f.minutosTarde}` : '—'}</TableCell>
                  <TableCell>
                    <Badge className={estadoColor(f.estado)} variant="outline">
                      {f.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.dispositivo.modelo || f.dispositivo.plataforma}
                    {!f.dispositivo.aprobado && (
                      <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">
                        nuevo
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Sin registros en el rango seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
