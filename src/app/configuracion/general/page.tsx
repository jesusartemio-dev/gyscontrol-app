'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Save,
  Loader2,
  DollarSign,
  Clock,
  Calculator,
  RefreshCw,
  Home,
  ChevronRight,
  Info
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import Link from 'next/link'
import { DEFAULTS } from '@/lib/costos'

interface ConfiguracionGeneral {
  id: string
  tipoCambio: number
  horasSemanales: number
  diasLaborables: number
  semanasxMes: number
  horasMensuales: number
  updatedAt?: string
}

export default function ConfiguracionGeneralPage() {
  const [config, setConfig] = useState<ConfiguracionGeneral>({
    id: 'default',
    tipoCambio: DEFAULTS.TIPO_CAMBIO,
    horasSemanales: DEFAULTS.HORAS_SEMANALES,
    diasLaborables: DEFAULTS.DIAS_LABORABLES,
    semanasxMes: DEFAULTS.SEMANAS_X_MES,
    horasMensuales: DEFAULTS.HORAS_MENSUALES,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  // Calcular horas mensuales automáticamente
  useEffect(() => {
    const horasMensuales = config.horasSemanales * config.semanasxMes
    if (horasMensuales !== config.horasMensuales) {
      setConfig(prev => ({ ...prev, horasMensuales }))
    }
  }, [config.horasSemanales, config.semanasxMes])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/configuracion/general')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          ...data,
          tipoCambio: parseFloat(data.tipoCambio),
        })
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) throw new Error('Error al guardar')

      const data = await res.json()
      setConfig({
        ...data,
        tipoCambio: parseFloat(data.tipoCambio),
      })
      toast.success('Configuración guardada correctamente')
    } catch (error) {
      console.error('Error guardando:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  const resetDefaults = () => {
    setConfig({
      ...config,
      tipoCambio: DEFAULTS.TIPO_CAMBIO,
      horasSemanales: DEFAULTS.HORAS_SEMANALES,
      diasLaborables: DEFAULTS.DIAS_LABORABLES,
      semanasxMes: DEFAULTS.SEMANAS_X_MES,
      horasMensuales: DEFAULTS.HORAS_MENSUALES,
    })
  }

  // Ejemplo de cálculo
  const ejemploSueldo = 3000 // S/. 3,000
  const costoHoraUSD = (ejemploSueldo / config.tipoCambio) / config.horasMensuales

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Configuración</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">General</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              Configuración General
            </h1>
            <p className="text-muted-foreground mt-1">
              Parámetros para cálculo de costos y conversión de moneda
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetDefaults} disabled={saving}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Tipo de Cambio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Tipo de Cambio
              </CardTitle>
              <CardDescription>
                Conversión de Soles (PEN) a Dólares (USD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipoCambio">
                  Tipo de Cambio (PEN/USD)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 inline ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Cuántos soles equivale 1 dólar</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">S/. 1 USD =</span>
                  <Input
                    id="tipoCambio"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={config.tipoCambio}
                    onChange={(e) => setConfig({ ...config, tipoCambio: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-center font-mono"
                  />
                  <span className="text-sm text-muted-foreground">PEN</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Ejemplo: S/. 100 = <span className="font-mono font-medium text-green-600">
                    ${(100 / config.tipoCambio).toFixed(2)} USD
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Jornada Laboral */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Jornada Laboral
              </CardTitle>
              <CardDescription>
                Configuración según legislación peruana (48h/semana)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horasSemanales">Horas/Semana</Label>
                  <Input
                    id="horasSemanales"
                    type="number"
                    min="1"
                    max="168"
                    value={config.horasSemanales}
                    onChange={(e) => setConfig({ ...config, horasSemanales: parseInt(e.target.value) || 0 })}
                    className="text-center font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasLaborables">Días Laborables</Label>
                  <Input
                    id="diasLaborables"
                    type="number"
                    min="1"
                    max="7"
                    value={config.diasLaborables}
                    onChange={(e) => setConfig({ ...config, diasLaborables: parseInt(e.target.value) || 0 })}
                    className="text-center font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semanasxMes">Semanas por Mes</Label>
                <Input
                  id="semanasxMes"
                  type="number"
                  min="1"
                  max="5"
                  value={config.semanasxMes}
                  onChange={(e) => setConfig({ ...config, semanasxMes: parseInt(e.target.value) || 0 })}
                  className="w-24 text-center font-mono"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-blue-700">Horas Mensuales:</span>
                <Badge variant="secondary" className="text-lg font-mono bg-blue-100 text-blue-700">
                  {config.horasMensuales}h
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fórmula y Ejemplo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              Fórmula de Cálculo
            </CardTitle>
            <CardDescription>
              Cómo se calcula el costo/hora de un empleado en USD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <p className="text-purple-400">// Fórmula:</p>
              <p>Costo/Hora (USD) = (Sueldo PEN / Tipo Cambio) / Horas Mensuales</p>
              <p className="mt-3 text-green-400">// Con valores actuales:</p>
              <p>Costo/Hora (USD) = (Sueldo PEN / {config.tipoCambio}) / {config.horasMensuales}</p>
            </div>

            <div className="mt-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
              <p className="text-sm font-medium mb-3">Ejemplo con S/. 3,000 de sueldo:</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Sueldo Mensual</p>
                  <p className="text-lg font-bold text-gray-700">S/. 3,000</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sueldo en USD</p>
                  <p className="text-lg font-bold text-green-600">
                    ${(ejemploSueldo / config.tipoCambio).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Costo/Hora</p>
                  <p className="text-lg font-bold text-blue-600">
                    ${costoHoraUSD.toFixed(2)}/h
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center">
          {config.updatedAt && (
            <p>Última actualización: {new Date(config.updatedAt).toLocaleString('es-PE')}</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
