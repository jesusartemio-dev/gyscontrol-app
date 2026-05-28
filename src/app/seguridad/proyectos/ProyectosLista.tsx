'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Calendar, LayoutGrid, List, User } from 'lucide-react'
import type { ProyectoEstado } from '@prisma/client'

const ESTADO_LABELS: Partial<Record<ProyectoEstado, string>> = {
  creado: 'Creado',
  en_planificacion: 'En planificación',
  listas_pendientes: 'Listas pendientes',
  listas_aprobadas: 'Listas aprobadas',
  pedidos_creados: 'Pedidos creados',
  en_ejecucion: 'En ejecución',
  en_cierre: 'En cierre',
}

const ESTADO_COLOR: Partial<Record<ProyectoEstado, string>> = {
  creado: 'bg-gray-100 text-gray-700 border-gray-200',
  en_planificacion: 'bg-blue-100 text-blue-700 border-blue-200',
  listas_pendientes: 'bg-amber-100 text-amber-700 border-amber-200',
  listas_aprobadas: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pedidos_creados: 'bg-orange-100 text-orange-700 border-orange-200',
  en_ejecucion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  en_cierre: 'bg-purple-100 text-purple-700 border-purple-200',
}

export interface ProyectoItem {
  id: string
  codigo: string
  nombre: string
  estado: ProyectoEstado
  fechaInicio: Date
  cliente: { id: string; nombre: string } | null
  gestor: { id: string; name: string | null } | null
}

interface Props {
  proyectos: ProyectoItem[]
}

export function ProyectosLista({ proyectos }: Props) {
  const [view, setView] = useState<'table' | 'card'>('table')

  useEffect(() => {
    if (window.innerWidth < 768) setView('card')
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-8 px-3"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'card' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-8 px-3"
            onClick={() => setView('card')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">Código</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proyecto</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Gestor</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell w-32">Inicio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">Estado</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/seguridad/proyectos/${p.id}/informe-mensual`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                      {p.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/seguridad/proyectos/${p.id}/informe-mensual`} className="font-medium hover:underline leading-tight block">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {p.cliente?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {p.gestor?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell tabular-nums text-xs">
                    {p.fechaInicio.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] border ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {ESTADO_LABELS[p.estado] ?? p.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectos.map((p) => (
            <Link key={p.id} href={`/seguridad/proyectos/${p.id}/informe-mensual`}>
              <Card className="hover:shadow-md transition cursor-pointer h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{p.codigo}</p>
                      <p className="font-semibold text-sm leading-tight mt-0.5">{p.nombre}</p>
                    </div>
                    <Badge className={`text-[10px] border shrink-0 ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {ESTADO_LABELS[p.estado] ?? p.estado}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {p.cliente && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.cliente.nombre}</span>
                      </div>
                    )}
                    {p.gestor?.name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{p.gestor.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>
                        Inicio:{' '}
                        {p.fechaInicio.toLocaleDateString('es-PE', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
