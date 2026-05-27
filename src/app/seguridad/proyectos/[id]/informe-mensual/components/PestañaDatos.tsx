'use client'

import { Building2, Calendar, FileText, User, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || '—'}</dd>
    </div>
  )
}

export function PestañaDatos({ data }: { data: InformeMensualAgregado }) {
  const { proyecto, periodo } = data

  const fechaInicioStr = new Date(proyecto.fechaInicio).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const fechaFinStr = proyecto.fechaFin
    ? new Date(proyecto.fechaFin).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-4">
      {/* Información del proyecto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Información del proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Código" value={proyecto.codigo} />
            <Field label="Nombre" value={proyecto.nombre} />
            {proyecto.descripcion && (
              <div className="col-span-full space-y-0.5">
                <dt className="text-xs text-muted-foreground">Descripción</dt>
                <dd className="text-sm">{proyecto.descripcion}</dd>
              </div>
            )}
            <Field label="Estado" value={proyecto.estado.replace(/_/g, ' ')} />
            <Field label="Período del informe" value={periodo.labelMes} />
            <Field label="Días laborables en el mes" value={String(periodo.diasLaborables)} />
            <Field label="Fecha de inicio" value={fechaInicioStr} />
            {fechaFinStr && <Field label="Fecha de fin" value={fechaFinStr} />}
          </dl>
        </CardContent>
      </Card>

      {/* Partes involucradas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Partes del proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {proyecto.cliente && (
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Cliente
                </dt>
                <dd className="text-sm font-medium">{proyecto.cliente.nombre}</dd>
              </div>
            )}
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Gestor de proyecto
              </dt>
              <dd className="text-sm font-medium">{proyecto.gestor.name ?? proyecto.gestor.email}</dd>
            </div>
            {proyecto.comercial && (
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Comercial
                </dt>
                <dd className="text-sm font-medium">
                  {proyecto.comercial.name ?? proyecto.comercial.email}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Período de reporte */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Período de reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
            <Field
              label="Inicio del mes"
              value={new Date(periodo.fechaInicio).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
            <Field
              label="Fin del mes"
              value={new Date(periodo.fechaFin).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
            <Field label="Días laborables" value={String(periodo.diasLaborables)} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
