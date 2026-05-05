'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileBarChart, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ReporteSeguridadCard } from '@/components/seguridad/reportes-semanales/ReporteSeguridadCard'
import type { ReporteSeguridadDetalle } from '@/lib/services/reporteSeguridad'
import { estadoReporteSeguridadEnum, ESTADO_REPORTE_LABELS } from '@/lib/validators/reporteSeguridad'

interface ProyectoMin {
  id: string
  codigo: string
  nombre: string
}

interface PaginatedResponse {
  data: ReporteSeguridadDetalle[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const PAGE_SIZE = 20

export default function ReportesSemanalesPage() {
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroProyectoId, setFiltroProyectoId] = useState<string>('')
  const [page, setPage] = useState(1)

  // Lista de proyectos para el filtro
  const queryProyectos = useQuery<ProyectoMin[]>({
    queryKey: ['proyectos-activos-min'],
    queryFn: async () => {
      const res = await fetch('/api/proyecto?estado=activo', { credentials: 'include' })
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      const arr: ProyectoMin[] = data.proyectos ?? data
      return arr.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))
    },
  })

  const query = useQuery<PaginatedResponse>({
    queryKey: ['seguridad', 'reportes-semanales', filtroEstado, filtroProyectoId, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtroEstado) params.set('estado', filtroEstado)
      if (filtroProyectoId) params.set('proyectoId', filtroProyectoId)
      params.set('page', String(page))
      params.set('pageSize', String(PAGE_SIZE))
      const res = await fetch(`/api/seguridad/reportes-semanales?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const reportes = query.data?.data ?? []
  const pagination = query.data?.pagination
  const proyectos = queryProyectos.data ?? []

  const resetPage = () => setPage(1)

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
          <FileBarChart className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">Reportes semanales de seguridad</h1>
          <p className="text-xs text-muted-foreground">Resúmenes de actividades por semana</p>
        </div>
        <Link href="/seguridad/reportes-semanales/nuevo">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={filtroEstado || 'todos'}
          onValueChange={(v) => { setFiltroEstado(v === 'todos' ? '' : v); resetPage() }}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {estadoReporteSeguridadEnum.options.map((e) => (
              <SelectItem key={e} value={e}>{ESTADO_REPORTE_LABELS[e]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroProyectoId || 'todos'}
          onValueChange={(v) => { setFiltroProyectoId(v === 'todos' ? '' : v); resetPage() }}
        >
          <SelectTrigger className="w-64 h-8 text-sm">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
        </div>
      ) : query.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar los reportes.
        </div>
      ) : reportes.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center space-y-2">
          <FileBarChart className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No hay reportes semanales</p>
          <p className="text-xs text-muted-foreground">
            {filtroEstado || filtroProyectoId
              ? 'Intenta con otros filtros'
              : 'Crea el primero con el botón Nuevo'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {reportes.map((r) => <ReporteSeguridadCard key={r.id} reporte={r} />)}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
