'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, X, Home } from 'lucide-react'

interface Solicitud {
  id: string
  fechaInicio: string
  fechaFin: string
  descripcion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado'
  motivoRechazo: string | null
  createdAt: string
  aprobadoEn: string | null
  solicitante: { id: string; name: string | null; email: string }
  aprobador: { id: string; name: string | null } | null
}

function estadoColor(e: string) {
  switch (e) {
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-700'
    case 'pendiente':
      return 'bg-amber-100 text-amber-700'
    case 'rechazado':
      return 'bg-red-100 text-red-700'
    case 'cancelado':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function SupervisionSolicitudesRemoto() {
  const [data, setData] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'pendiente' | 'todas'>('pendiente')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams({ scope: 'equipo' })
    if (filtro === 'pendiente') params.set('estado', 'pendiente')
    const r = await fetch(`/api/asistencia/solicitudes-remoto?${params}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  async function responder(id: string, estado: 'aprobado' | 'rechazado') {
    let motivoRechazo: string | null = null
    if (estado === 'rechazado') {
      motivoRechazo = prompt('Motivo del rechazo (opcional):') || null
    }
    const r = await fetch(`/api/asistencia/solicitudes-remoto/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, motivoRechazo }),
    })
    if (!r.ok) {
      toast.error('Error al procesar')
      return
    }
    toast.success(estado === 'aprobado' ? 'Solicitud aprobada' : 'Solicitud rechazada')
    cargar()
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Home className="h-6 w-6" /> Solicitudes de Trabajo Remoto
          </h1>
          <p className="text-sm text-muted-foreground">
            Aprueba o rechaza las solicitudes del equipo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filtro === 'pendiente' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('pendiente')}
          >
            Pendientes
          </Button>
          <Button
            variant={filtro === 'todas' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('todas')}
          >
            Todas
          </Button>
        </div>
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
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {s.solicitante.name || s.solicitante.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.solicitante.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(s.fechaInicio).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell>{new Date(s.fechaFin).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell className="max-w-xs text-xs">{s.descripcion || '—'}</TableCell>
                    <TableCell>
                      <Badge className={estadoColor(s.estado)} variant="outline">
                        {s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {s.estado === 'pendiente' && (
                        <>
                          <Button size="sm" onClick={() => responder(s.id, 'aprobado')}>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => responder(s.id, 'rechazado')}
                          >
                            <X className="mr-1 h-3 w-3" /> Rechazar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {filtro === 'pendiente'
                        ? 'No hay solicitudes pendientes.'
                        : 'Sin solicitudes registradas.'}
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
