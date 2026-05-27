'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { HeaderProyecto } from '@/components/seguridad/HeaderProyecto'
import { SelectorMes } from './components/SelectorMes'
import { PestañaResumen } from './components/PestañaResumen'
import { PestañaDatos } from './components/PestañaDatos'
import { PestañaPersonal } from './components/PestañaPersonal'
import { PestañaJornadas } from './components/PestañaJornadas'
import { PestañaEPP } from './components/PestañaEPP'
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

      {/* Pestañas del informe */}
      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="datos">Datos del proyecto</TabsTrigger>
          <TabsTrigger value="personal">
            Personal
            {data.kpis.personalUnico > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {data.kpis.personalUnico}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jornadas">
            Jornadas
            {data.kpis.jornadasTotal > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {data.kpis.jornadasTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="epp">
            EPP
            {data.kpis.entregasEppCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {data.kpis.entregasEppCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="registros" disabled>
            Registros de seguridad
            <Badge variant="outline" className="ml-1.5 text-[10px] h-4 px-1 text-muted-foreground">
              Fase 3
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="fotos" disabled>
            Fotos
            <Badge variant="outline" className="ml-1.5 text-[10px] h-4 px-1 text-muted-foreground">
              Fase 3
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <PestañaResumen data={data} />
        </TabsContent>

        <TabsContent value="datos" className="mt-4">
          <PestañaDatos data={data} />
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <PestañaPersonal data={data} />
        </TabsContent>

        <TabsContent value="jornadas" className="mt-4">
          <PestañaJornadas data={data} />
        </TabsContent>

        <TabsContent value="epp" className="mt-4">
          <PestañaEPP data={data} />
        </TabsContent>
      </Tabs>
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
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
