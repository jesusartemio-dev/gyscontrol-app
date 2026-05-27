'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  Archive,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
} from 'lucide-react'
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
import { PestañaReportesSemanales } from './components/PestañaReportesSemanales'
import {
  PestañaCharlas,
  PestañaInspecciones,
  PestañaObservaciones,
  PestañaIncidentes,
  PestañaRiesgosCriticos,
  PestañaMedioAmbiente,
  PestañaPrevencionSalud,
  PestañaActividadGeneral,
} from './components/PestañaRegistros'
import { formatearMes } from '@/lib/utils/periodoMes'
import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'

// ─── Export helpers ───────────────────────────────────────────────────────────

async function descargarBlob(url: string, fallbackFilename: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error ?? 'Error al generar el archivo')
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : fallbackFilename
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
  return filename
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InformeMensualPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [mes, setMes] = useState<string>(() => formatearMes(new Date()))
  const [excelLoading, setExcelLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)

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

  const handleExcel = async () => {
    setExcelLoading(true)
    try {
      const filename = await descargarBlob(
        `/api/seguridad/informe-mensual/${id}/exportar-excel?mes=${mes}`,
        `Informe_${mes}.xlsx`,
      )
      toast.success(`Excel descargado: ${filename}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar Excel')
    } finally {
      setExcelLoading(false)
    }
  }

  const handleZip = async () => {
    setZipLoading(true)
    toast.info('Preparando ZIP… puede tomar hasta 2 minutos con muchas fotos.')
    try {
      const filename = await descargarBlob(
        `/api/seguridad/informe-mensual/${id}/fotos-zip?mes=${mes}`,
        `fotos_${mes}.zip`,
      )
      toast.success(`ZIP descargado: ${filename}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar ZIP')
    } finally {
      setZipLoading(false)
    }
  }

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

  const kpis = data.kpis
  const reg = data.registrosPorTipo

  return (
    <div className="container mx-auto p-6 space-y-5">
      {/* Header del proyecto */}
      <HeaderProyecto
        proyecto={data.proyecto}
        periodo={data.periodo}
        kpis={kpis}
      />

      {/* Barra temporal + exportadores */}
      <div className="flex items-center gap-2 flex-wrap">
        <SelectorMes value={mes} onChange={setMes} disabled={isLoading} />

        <div className="ml-auto flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcel}
            disabled={excelLoading}
          >
            {excelLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            )}
            {excelLoading ? 'Generando…' : 'Excel completo'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZip}
            disabled={zipLoading || kpis.fotosCount === 0}
            title={kpis.fotosCount === 0 ? 'No hay fotos en este mes' : undefined}
          >
            {zipLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Archive className="h-4 w-4 mr-1.5" />
            )}
            {zipLoading ? 'Preparando ZIP…' : `Todas las fotos${kpis.fotosCount > 0 ? ` (${kpis.fotosCount})` : ''}`}
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/seguridad/proyectos/${id}/informe-mensual/imprimir?mes=${mes}`} target="_blank">
              <Printer className="h-4 w-4 mr-1.5" />
              Vista de impresión
            </Link>
          </Button>
        </div>
      </div>

      {/* Pestañas */}
      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap h-auto gap-1">
          {/* ── Fase 1-2 ── */}
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="personal">
            Personal
            {kpis.personalUnico > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.personalUnico}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jornadas">
            Jornadas
            {kpis.jornadasTotal > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.jornadasTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="epp">
            EPP
            {kpis.entregasEppCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.entregasEppCount}
              </Badge>
            )}
          </TabsTrigger>

          {/* ── Fase 3: Registros ── */}
          <TabsTrigger value="charlas">
            Charlas
            {kpis.charlasCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.charlasCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inspecciones">
            Inspecciones
            {kpis.inspeccionesCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.inspeccionesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="observaciones">
            Observaciones
            {kpis.observacionesCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.observacionesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incidentes">
            Incidentes
            {kpis.incidentesCount > 0 ? (
              <Badge className="ml-1.5 text-[10px] h-4 px-1 bg-red-100 text-red-700 border-red-200 border">
                {kpis.incidentesCount}
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1 text-emerald-600">
                0
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="riesgos">
            Riesgos
            {kpis.riesgoCriticoCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.riesgoCriticoCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="medio-ambiente">
            Medio ambiente
            {kpis.medioAmbienteCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.medioAmbienteCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="prevencion-salud">
            Prev. salud
            {kpis.prevencionSaludCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.prevencionSaludCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actividad-general">
            Act. general
            {kpis.actividadGeneralCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {kpis.actividadGeneralCount}
              </Badge>
            )}
          </TabsTrigger>

          {/* ── Fase 4: Reportes ── */}
          <TabsTrigger value="reportes">
            Reportes semanales
            {data.reportesSemanales.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {data.reportesSemanales.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Contenido Fase 1-2 ── */}
        <TabsContent value="resumen" className="mt-4"><PestañaResumen data={data} /></TabsContent>
        <TabsContent value="datos" className="mt-4"><PestañaDatos data={data} /></TabsContent>
        <TabsContent value="personal" className="mt-4"><PestañaPersonal data={data} /></TabsContent>
        <TabsContent value="jornadas" className="mt-4"><PestañaJornadas data={data} /></TabsContent>
        <TabsContent value="epp" className="mt-4"><PestañaEPP data={data} /></TabsContent>

        {/* ── Fase 3: Registros ── */}
        <TabsContent value="charlas" className="mt-4"><PestañaCharlas data={data} /></TabsContent>
        <TabsContent value="inspecciones" className="mt-4"><PestañaInspecciones data={data} /></TabsContent>
        <TabsContent value="observaciones" className="mt-4"><PestañaObservaciones data={data} /></TabsContent>
        <TabsContent value="incidentes" className="mt-4"><PestañaIncidentes data={data} /></TabsContent>
        <TabsContent value="riesgos" className="mt-4"><PestañaRiesgosCriticos data={data} /></TabsContent>
        <TabsContent value="medio-ambiente" className="mt-4"><PestañaMedioAmbiente data={data} /></TabsContent>
        <TabsContent value="prevencion-salud" className="mt-4"><PestañaPrevencionSalud data={data} /></TabsContent>
        <TabsContent value="actividad-general" className="mt-4"><PestañaActividadGeneral data={data} /></TabsContent>

        {/* ── Fase 4: Reportes ── */}
        <TabsContent value="reportes" className="mt-4"><PestañaReportesSemanales data={data} /></TabsContent>
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
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
