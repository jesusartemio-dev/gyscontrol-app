'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HeaderProyecto } from '@/components/seguridad/HeaderProyecto'
import { SelectorMes } from './components/SelectorMes'
import { formatearMes } from '@/lib/utils/periodoMes'
import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'

export default function InformeMensualPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [mes, setMes] = useState<string>(() => formatearMes(new Date()))

  const { data, isLoading, error } = useQuery<InformeMensualAgregado>({
    queryKey: ['informe-mensual', id, mes],
    queryFn: async () => {
      const res = await fetch(`/api/seguridad/informe-mensual/${id}?mes=${mes}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al cargar el informe')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <InformeMensualSkeleton />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 text-destructive py-8">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error instanceof Error ? error.message : 'Error al cargar el informe'}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto p-6 space-y-5">
      {/* Header del proyecto con KPIs resumen */}
      <HeaderProyecto
        proyecto={data.proyecto}
        periodo={data.periodo}
        kpis={data.kpis}
      />

      {/* Barra de navegación temporal + acciones */}
      <div className="flex items-center gap-3 flex-wrap">
        <SelectorMes value={mes} onChange={setMes} disabled={isLoading} />

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <FileText className="h-4 w-4 mr-1.5" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar PPT
          </Button>
        </div>
      </div>

      {/* Placeholder contenido — Fase 2 */}
      <div className="rounded-xl border-2 border-dashed border-muted p-16 text-center space-y-3">
        <p className="text-base font-semibold text-muted-foreground">
          Pestañas en construcción — Fase 2
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Aquí irán las pestañas: Resumen, Jornadas de Campo, Registros de Seguridad, Personal, EPP.
        </p>
        <div className="pt-2 text-xs text-muted-foreground/60 space-y-0.5">
          <p>
            Datos cargados para {data.periodo.labelMes}: {data.kpis.jornadasTotal} jornadas ·{' '}
            {(data.kpis.charlasCount + data.kpis.inspeccionesCount + data.kpis.observacionesCount +
              data.kpis.incidentesCount + data.kpis.riesgoCriticoCount + data.kpis.medioAmbienteCount +
              data.kpis.prevencionSaludCount + data.kpis.actividadGeneralCount)}{' '}
            registros de seguridad · {data.kpis.hht.toFixed(1)} HHT
          </p>
        </div>
      </div>
    </div>
  )
}

function InformeMensualSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-5">
      <div className="rounded-xl border p-6 space-y-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-28" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-60" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-52" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
