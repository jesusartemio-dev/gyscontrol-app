'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { TablaExportable } from './TablaExportable'
import type { InformeMensualAgregado, JornadaInforme } from '@/lib/services/informeMensualSeguridad'
import { cn } from '@/lib/utils'

const ESTADO_JORNADA_LABEL: Record<string, string> = {
  iniciado: 'Iniciado',
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const ESTADO_JORNADA_COLOR: Record<string, string> = {
  iniciado: 'bg-blue-100 text-blue-700 border-blue-200',
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

const ESTADO_SSOMA_COLOR: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

function jornadaHoras(j: JornadaInforme): number {
  return j.tareas.flatMap((t) => t.miembros).reduce((s, m) => s + m.horas, 0)
}

function jornadaPersonas(j: JornadaInforme): number {
  return new Set(j.tareas.flatMap((t) => t.miembros.map((m) => m.usuarioId))).size
}

const COLUMNS = [
  {
    header: 'Fecha',
    accessor: (j: JornadaInforme) =>
      new Date(j.fechaTrabajo).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  },
  {
    header: 'Supervisor',
    accessor: (j: JornadaInforme) => j.supervisor?.name ?? j.supervisor?.email ?? '—',
  },
  {
    header: 'Estado',
    accessor: (j: JornadaInforme) => ESTADO_JORNADA_LABEL[j.estado] ?? j.estado,
  },
  {
    header: 'Tareas',
    accessor: (j: JornadaInforme) => j.tareas.length,
  },
  {
    header: 'Personas',
    accessor: (j: JornadaInforme) => jornadaPersonas(j),
  },
  {
    header: 'Horas',
    accessor: (j: JornadaInforme) => jornadaHoras(j).toFixed(1),
  },
  {
    header: 'SSOMA',
    accessor: (j: JornadaInforme) =>
      j.evidenciaSeguridad
        ? `${j.evidenciaSeguridad.estado} (${j.evidenciaSeguridad._count.registros})`
        : '—',
  },
]

export function PestañaJornadas({ data }: { data: InformeMensualAgregado }) {
  const { jornadas, kpis, proyecto, periodo } = data
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroSupervisor, setFiltroSupervisor] = useState<string>('todos')

  const supervisores = Array.from(
    new Map(
      jornadas
        .filter((j) => j.supervisor)
        .map((j) => [j.supervisor!.id, j.supervisor!.name ?? j.supervisor!.email]),
    ).entries(),
  )

  const filtradas = jornadas.filter((j) => {
    if (filtroEstado !== 'todos' && j.estado !== filtroEstado) return false
    if (filtroSupervisor !== 'todos' && j.supervisor?.id !== filtroSupervisor) return false
    return true
  })

  const filename = `${proyecto.codigo}_jornadas_${periodo.mes}`

  return (
    <div className="space-y-4">
      {/* Resumen badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground self-center">
          {kpis.jornadasTotal} jornadas totales
        </span>
        {['aprobado', 'pendiente', 'iniciado', 'rechazado'].map((estado) => {
          const count =
            estado === 'aprobado' ? kpis.jornadasAprobadas :
            estado === 'pendiente' ? kpis.jornadasPendientes :
            estado === 'iniciado' ? kpis.jornadasIniciadas :
            kpis.jornadasRechazadas
          if (count === 0) return null
          return (
            <Badge
              key={estado}
              className={cn('text-[10px] border', ESTADO_JORNADA_COLOR[estado])}
            >
              {ESTADO_JORNADA_LABEL[estado]}: {count}
            </Badge>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Estado:</label>
          <select
            className="text-xs rounded border bg-background px-2 py-1"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos</option>
            {Object.entries(ESTADO_JORNADA_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        {supervisores.length > 1 && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Supervisor:</label>
            <select
              className="text-xs rounded border bg-background px-2 py-1"
              value={filtroSupervisor}
              onChange={(e) => setFiltroSupervisor(e.target.value)}
            >
              <option value="todos">Todos</option>
              {supervisores.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        )}
        {(filtroEstado !== 'todos' || filtroSupervisor !== 'todos') && (
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => { setFiltroEstado('todos'); setFiltroSupervisor('todos') }}
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtradas.length} de {jornadas.length}
        </span>
      </div>

      <TablaExportable
        columns={COLUMNS}
        rows={filtradas}
        filename={filename}
        emptyMessage="No hay jornadas de campo para este mes."
      >
        {(jornada) => (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Estado jornada:{' '}
                <Badge className={cn('text-[10px] border', ESTADO_JORNADA_COLOR[jornada.estado])}>
                  {ESTADO_JORNADA_LABEL[jornada.estado] ?? jornada.estado}
                </Badge>
              </span>
              {jornada.evidenciaSeguridad && (
                <span>
                  SSOMA:{' '}
                  <Badge
                    className={cn(
                      'text-[10px] border',
                      ESTADO_SSOMA_COLOR[jornada.evidenciaSeguridad.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200',
                    )}
                  >
                    {jornada.evidenciaSeguridad.estado} · {jornada.evidenciaSeguridad._count.registros} registros
                  </Badge>
                </span>
              )}
              {jornada.aprobadoPor && (
                <span>Aprobado por: {jornada.aprobadoPor.name ?? '—'}</span>
              )}
            </div>
            {jornada.tareas.length > 0 && (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Tarea</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Personas</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jornada.tareas.map((tarea) => {
                      const horas = tarea.miembros.reduce((s, m) => s + m.horas, 0)
                      return (
                        <tr key={tarea.id} className="border-b last:border-0">
                          <td className="px-3 py-1.5">
                            {tarea.proyectoTarea?.nombre ?? '—'}
                          </td>
                          <td className="px-3 py-1.5">
                            {tarea.miembros.map((m) => m.usuario.name ?? m.usuario.email).join(', ') || '—'}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums">{horas.toFixed(1)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </TablaExportable>
    </div>
  )
}
