'use client'

import { useState, useEffect } from 'react'
import type { PlanTrabajo } from '@prisma/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

import { ObjetivoView } from './secciones/ObjetivoView'
import { AlcanceGeneralView } from './secciones/AlcanceGeneralView'
import { AlcanceDetalladoView } from './secciones/AlcanceDetalladoView'
import { EppRequeridosView } from './secciones/EppRequeridosView'
import { HerramientasView } from './secciones/HerramientasView'
import { RestriccionesView } from './secciones/RestriccionesView'
import { PersonalAsignadoView } from './secciones/PersonalAsignadoView'
import { MatrizRaciView } from './secciones/MatrizRaciView'
import { HistogramasView } from './secciones/HistogramasView'
import { CronogramaResumenView } from './secciones/CronogramaResumenView'
import { ResponsabilidadesView } from './secciones/ResponsabilidadesView'
import { ReferenciasView } from './secciones/ReferenciasView'

interface Props {
  proyectoId: string
  generacionId: string
  isOpen: boolean
  onClose: () => void
}

interface Meta {
  archivoNombre: string
  generadoEn: string
  generadoPor: { name: string | null; email: string }
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">{titulo}</h3>
      <div>{children}</div>
    </div>
  )
}

export function DetalleGeneracion({ proyectoId, generacionId, isOpen, onClose }: Props) {
  const [plan, setPlan] = useState<PlanTrabajo | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setPlan(null)
    setMeta(null)

    fetch(`/api/proyectos/${proyectoId}/plan-trabajo/generaciones/${generacionId}`)
      .then(r => r.json())
      .then(({ data }) => {
        setPlan(data.snapshotPlan ?? null)
        setMeta({
          archivoNombre: data.archivoNombre,
          generadoEn: data.generadoEn,
          generadoPor: data.generadoPor,
        })
      })
      .catch(() => {/* silencioso — el estado queda vacío */})
      .finally(() => setLoading(false))
  }, [isOpen, proyectoId, generacionId])

  return (
    <Sheet open={isOpen} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="sm:max-w-2xl flex flex-col gap-0 p-0 z-[60]">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base truncate">
            {meta?.archivoNombre ?? 'Detalle de generación'}
          </SheetTitle>
          {meta && (
            <p className="text-xs text-muted-foreground">
              {new Date(meta.generadoEn).toLocaleString('es-PE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {meta.generadoPor.name ? ` · ${meta.generadoPor.name}` : ''}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          ) : !plan ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Este snapshot fue generado con una versión anterior y no tiene datos de secciones disponibles.
            </p>
          ) : (
            <>
              <Section titulo="Objetivo"><ObjetivoView plan={plan} /></Section>
              <Section titulo="Alcance General"><AlcanceGeneralView plan={plan} /></Section>
              <Section titulo="Alcance Detallado"><AlcanceDetalladoView plan={plan} /></Section>
              <Section titulo="EPP Requeridos"><EppRequeridosView plan={plan} /></Section>
              <Section titulo="Herramientas y Equipos"><HerramientasView plan={plan} /></Section>
              <Section titulo="Restricciones"><RestriccionesView plan={plan} /></Section>
              <Section titulo="Personal Asignado"><PersonalAsignadoView plan={plan} /></Section>
              <Section titulo="Matriz RACI"><MatrizRaciView plan={plan} /></Section>
              <Section titulo="Histogramas"><HistogramasView plan={plan} /></Section>
              <Section titulo="Cronograma Resumen"><CronogramaResumenView plan={plan} /></Section>
              <Section titulo="Responsabilidades"><ResponsabilidadesView plan={plan} /></Section>
              <Section titulo="Referencias"><ReferenciasView plan={plan} /></Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
