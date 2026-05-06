'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FiltrosRegistros, type FiltrosRegistrosValor } from '@/components/seguridad/registros/FiltrosRegistros'
import { GrupoJornada, type RegistroFila } from '@/components/seguridad/registros/GrupoJornada'
import type { TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'

interface RegistroLista {
  id: string
  tipo: TipoRegistroSeguridad
  descripcion: string
  asistentes: number | null
  createdAt: string
  evidencia: {
    id: string
    estado: 'abierta' | 'cerrada'
    jornada: {
      id: string
      fechaTrabajo: string
      estado: string
      proyecto: { id: string; codigo: string; nombre: string }
      supervisor: { id: string; name: string | null }
    }
  }
  ingeniero: { id: string; name: string | null; email: string | null }
  fotos: Array<{
    id: string
    nombreArchivo: string
    urlArchivo: string
    orden: number
  }>
}

interface ProyectoOpt {
  id: string
  codigo: string
  nombre: string
}

const FILTROS_INICIALES: FiltrosRegistrosValor = {
  tipo: 'todos',
  proyectoId: '',
  fechaDesde: '',
  fechaHasta: '',
}

export default function RegistrosSeguridadListaPage() {
  const [filtros, setFiltros] = useState<FiltrosRegistrosValor>(FILTROS_INICIALES)

  const proyectosQuery = useQuery<ProyectoOpt[]>({
    queryKey: ['proyectos', 'lista-min'],
    queryFn: async () => {
      const res = await fetch('/api/proyecto', { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar proyectos')
      const data = await res.json()
      return (data as Array<{ id: string; codigo: string; nombre: string }>).map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (filtros.tipo !== 'todos') sp.set('tipo', filtros.tipo)
    if (filtros.proyectoId) sp.set('proyectoId', filtros.proyectoId)
    if (filtros.fechaDesde) sp.set('fechaDesde', filtros.fechaDesde)
    if (filtros.fechaHasta) sp.set('fechaHasta', filtros.fechaHasta)
    return sp.toString()
  }, [filtros])

  const registrosQuery = useQuery<RegistroLista[]>({
    queryKey: ['seguridad', 'registros', queryString],
    queryFn: async () => {
      const url = `/api/seguridad/registros${queryString ? `?${queryString}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar registros')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const registros = registrosQuery.data ?? []

  const grupos = useMemo(() => {
    const map = new Map<
      string,
      {
        evidenciaId: string
        jornada: RegistroLista['evidencia']['jornada']
        registros: RegistroFila[]
      }
    >()
    for (const r of registros) {
      const jornadaId = r.evidencia.jornada.id
      if (!map.has(jornadaId)) {
        map.set(jornadaId, {
          evidenciaId: r.evidencia.id,
          jornada: r.evidencia.jornada,
          registros: [],
        })
      }
      map.get(jornadaId)!.registros.push({
        id: r.id,
        tipo: r.tipo,
        descripcion: r.descripcion,
        asistentes: r.asistentes,
        fotos: r.fotos.map((f) => ({ id: f.id, nombreArchivo: f.nombreArchivo })),
      })
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.jornada.fechaTrabajo).getTime() - new Date(a.jornada.fechaTrabajo).getTime(),
    )
  }, [registros])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600" />
            Registros de campo
          </h1>
          <p className="text-sm text-muted-foreground">
            Charlas, inspecciones, observaciones y demás actividades de seguridad
          </p>
        </div>
        <Link href="/seguridad/evidencias">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-1" /> Nueva evidencia
          </Button>
        </Link>
      </div>

      <FiltrosRegistros
        value={filtros}
        onChange={setFiltros}
        proyectos={proyectosQuery.data ?? []}
      />

      {registrosQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : registrosQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los registros.
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => registrosQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : registros.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {Object.values(filtros).some((v) => v && v !== 'todos')
            ? 'No hay registros con los filtros aplicados.'
            : 'Aún no hay registros. Crea el primero con "Nuevo registro".'}
        </div>
      ) : (
        <div className="space-y-2">
          {registrosQuery.isFetching && (
            <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Actualizando…
            </div>
          )}
          {grupos.map((g, i) => (
            <GrupoJornada
              key={g.jornada.id}
              jornada={g.jornada}
              registros={g.registros}
              evidenciaId={g.evidenciaId}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
