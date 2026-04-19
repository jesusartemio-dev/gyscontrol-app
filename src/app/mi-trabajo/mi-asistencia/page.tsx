'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Clock, TrendingDown, CalendarDays } from 'lucide-react'
import { formatearTardanza } from '@/lib/utils/formatTardanza'

interface Marcaje {
  id: string
  tipo: string
  fechaHora: string
  fechaEsperada: string
  minutosTarde: number
  estado: string
  dentroGeofence: boolean
  metodoMarcaje: string
  banderas: string[]
  ubicacion: { id: string; nombre: string; tipo: string } | null
}

interface Resp {
  marcajes: Marcaje[]
  resumenMes: {
    totalIngresos: number
    minutosTardeTotal: number
    vecesConTardanza: number
  }
}

function estadoColor(estado: string) {
  switch (estado) {
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

export default function MiAsistenciaPage() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/asistencia/mi-historial')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Mi Asistencia</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Ingresos del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.resumenMes.totalIngresos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" /> Veces tarde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {data.resumenMes.vecesConTardanza}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Min. tarde acumulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {formatearTardanza(data.resumenMes.minutosTardeTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos marcajes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Tardanza</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.marcajes.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(m.fechaHora).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>{m.tipo.replace('_', ' ')}</TableCell>
                  <TableCell>{m.ubicacion?.nombre || '—'}</TableCell>
                  <TableCell>{m.minutosTarde > 0 ? formatearTardanza(m.minutosTarde) : '—'}</TableCell>
                  <TableCell>
                    <Badge className={estadoColor(m.estado)} variant="outline">
                      {m.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.marcajes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aún no tienes marcajes registrados.
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
