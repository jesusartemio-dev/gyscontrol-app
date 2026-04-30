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
import { CheckCircle2, Loader2, Smartphone, X, ShieldOff } from 'lucide-react'

interface Dispositivo {
  id: string
  userAgent: string
  plataforma: string
  modelo: string | null
  resolucion: string
  aprobado: boolean
  primeraVez: string
  ultimaVez: string
  user: { id: string; name: string | null; email: string }
  aprobadoPor: { id: string; name: string | null } | null
}

export default function DispositivosPage() {
  const [data, setData] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes')

  async function cargar() {
    setLoading(true)
    setSinPermiso(false)
    const url = `/api/asistencia/dispositivos?scope=all${filtro === 'pendientes' ? '&pendientes=1' : ''}`
    try {
      const r = await fetch(url)
      if (r.status === 401 || r.status === 403) {
        setSinPermiso(true)
        setData([])
        return
      }
      if (!r.ok) {
        toast.error('Error al cargar dispositivos')
        setData([])
        return
      }
      const j = await r.json()
      setData(Array.isArray(j) ? j : [])
    } catch {
      toast.error('Error de red')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  async function aprobar(id: string, aprobado: boolean) {
    const r = await fetch(`/api/asistencia/dispositivos/${id}/aprobar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aprobado }),
    })
    if (!r.ok) {
      toast.error('Error al procesar')
      return
    }
    toast.success(aprobado ? 'Dispositivo aprobado' : 'Aprobación removida')
    cargar()
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-sm text-muted-foreground">
            Vincula el celular de cada trabajador para evitar suplantación
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filtro === 'pendientes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('pendientes')}
          >
            Pendientes
          </Button>
          <Button
            variant={filtro === 'todos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('todos')}
          >
            Todos
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sinPermiso ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <ShieldOff className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold">No tienes acceso a esta sección</p>
                <p className="text-sm text-muted-foreground">
                  La aprobación de dispositivos es solo para roles de supervisión
                  (admin, gerente, coordinador, gestor).
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Primer uso</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{d.user.name || d.user.email}</p>
                        <p className="text-xs text-muted-foreground">{d.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{d.modelo || d.plataforma}</p>
                          <p className="text-xs text-muted-foreground">{d.resolucion}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(d.primeraVez).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(d.ultimaVez).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell>
                      {d.aprobado ? (
                        <Badge className="bg-emerald-100 text-emerald-700" variant="outline">
                          aprobado
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700" variant="outline">
                          pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.aprobado ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => aprobar(d.id, false)}
                        >
                          <X className="mr-1 h-3 w-3" /> Revocar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => aprobar(d.id, true)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Aprobar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {filtro === 'pendientes'
                        ? 'No hay dispositivos pendientes de aprobación.'
                        : 'Aún no hay dispositivos registrados.'}
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
