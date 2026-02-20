'use client'

import { useState } from 'react'
import { Settings, FileText, CheckCircle, AlertTriangle, History, Percent } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { CabeceraTab } from '@/components/cotizaciones/tabs/CabeceraTab'
import { ExclusionesTab } from '@/components/cotizaciones/tabs/ExclusionesTab'
import { CondicionesTab } from '@/components/cotizaciones/tabs/CondicionesTab'
import { DescuentoTab } from '@/components/cotizaciones/tabs/DescuentoTab'
import VersionesCotizacion from '@/components/cotizaciones/VersionesCotizacion'

import { useCotizacionContext } from '../cotizacion-context'

export default function CotizacionConfiguracionPage() {
  const { cotizacion, setCotizacion, refreshCotizacion, isLocked } = useCotizacionContext()
  const [activeTab, setActiveTab] = useState('cabecera')

  if (!cotizacion) return null

  const totalCondiciones = cotizacion.condiciones?.length || 0
  const totalExclusiones = cotizacion.exclusiones?.length || 0

  return (
    <div className="space-y-4">
      {/* Toolbar Compacto */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Settings className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold">Configuración</h2>
      </div>

      {/* Tabs para Cabecera, Condiciones, Exclusiones, Descuento, Versiones */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="cabecera" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Cabecera</span>
          </TabsTrigger>
          <TabsTrigger value="condiciones" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Condiciones</span>
            {totalCondiciones > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {totalCondiciones}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exclusiones" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Exclusiones</span>
            {totalExclusiones > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {totalExclusiones}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="descuento" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Descuento</span>
            {cotizacion.descuentoEstado === 'propuesto' && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-amber-100 text-amber-700">!</Badge>
            )}
            {cotizacion.descuentoEstado === 'aprobado' && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-green-100 text-green-700">
                {cotizacion.descuentoPorcentaje}%
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versiones" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Versiones</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="cabecera" className="m-0">
            <CabeceraTab
              cotizacion={cotizacion}
              onUpdated={setCotizacion}
              isLocked={isLocked}
            />
          </TabsContent>

          <TabsContent value="condiciones" className="m-0">
            <CondicionesTab
              cotizacion={cotizacion}
              onUpdated={setCotizacion}
              isLocked={isLocked}
            />
          </TabsContent>

          <TabsContent value="exclusiones" className="m-0">
            <ExclusionesTab
              cotizacion={cotizacion}
              onUpdated={setCotizacion}
              isLocked={isLocked}
            />
          </TabsContent>

          <TabsContent value="descuento" className="m-0">
            <DescuentoTab
              cotizacion={cotizacion}
              onUpdated={setCotizacion}
              isLocked={isLocked}
            />
          </TabsContent>

          <TabsContent value="versiones" className="m-0">
            <VersionesCotizacion
              cotizacionId={cotizacion.id}
              cotizacionCodigo={cotizacion.codigo || cotizacion.id}
              cotizacionNombre={cotizacion.nombre}
              onVersionCreated={refreshCotizacion}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
