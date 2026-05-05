'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectorSemana } from '@/components/seguridad/reportes-semanales/SelectorSemana'
import { formatearSemanaIso } from '@/lib/validators/reporteSeguridad'

interface ProyectoMinimo {
  id: string
  codigo: string
  nombre: string
}

export default function NuevoReporteSemanalPage() {
  const router = useRouter()

  const [proyectoId, setProyectoId] = useState<string>('')
  const [semanaIso, setSemanaIso] = useState<string>(formatearSemanaIso(new Date()))

  const queryProyectos = useQuery<ProyectoMinimo[]>({
    queryKey: ['proyectos-activos-min'],
    queryFn: async () => {
      const res = await fetch('/api/proyecto?estado=activo', { credentials: 'include' })
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      return (data.proyectos ?? data).map((p: ProyectoMinimo) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
      }))
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/seguridad/reportes-semanales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proyectoId, semanaIso }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al crear el reporte')
      }
      return res.json() as Promise<{ id: string }>
    },
    onSuccess: (data) => {
      toast.success('Reporte creado')
      router.push(`/seguridad/reportes-semanales/${data.id}`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const proyectos = queryProyectos.data ?? []
  const canSubmit = !!proyectoId && !!semanaIso && !mutation.isPending

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/seguridad/reportes-semanales">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">Nuevo reporte semanal</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="space-y-2">
            <Label>Proyecto</Label>
            {queryProyectos.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
            ) : (
              <Select value={proyectoId} onValueChange={setProyectoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} — {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Semana</Label>
            <SelectorSemana value={semanaIso} onChange={setSemanaIso} disabled={mutation.isPending} />
            <p className="text-xs text-muted-foreground">
              Código: <span className="font-mono">{semanaIso}</span>
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending ? 'Creando…' : 'Crear reporte'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
