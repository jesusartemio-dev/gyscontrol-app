// ===================================================
// 📁 Archivo: DiagnosticoAcciones.tsx
// 📌 Descripción: Componente de diagnóstico para verificar funcionalidad de acciones
// 📌 Propósito: Identificar problemas en la selección de cotizaciones
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

interface DiagnosticoProps {
  itemId: string
  cotizaciones: any[]
}

export default function DiagnosticoAcciones({ itemId, cotizaciones }: DiagnosticoProps) {
  const [diagnosticos, setDiagnosticos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  // 🔍 Ejecutar diagnósticos automáticamente
  useEffect(() => {
    const resultados: string[] = []

    // Check 1: Verificar si hay cotizaciones
    if (!cotizaciones || cotizaciones.length === 0) {
      resultados.push('❌ No hay cotizaciones disponibles')
    } else {
      resultados.push(`✅ ${cotizaciones.length} cotizaciones encontradas`)
    }

    // Check 2: Verificar cotizaciones con estado 'cotizado'
    const cotizacionesDisponibles = cotizaciones.filter(c => c.estado === 'cotizado')
    if (cotizacionesDisponibles.length === 0) {
      resultados.push('⚠️ No hay cotizaciones con estado "cotizado"')
    } else {
      resultados.push(`✅ ${cotizacionesDisponibles.length} cotizaciones disponibles para selección`)
    }

    // Check 3: Verificar precios válidos
    const cotizacionesConPrecio = cotizaciones.filter(c => c.precioUnitario && c.precioUnitario > 0)
    if (cotizacionesConPrecio.length === 0) {
      resultados.push('❌ No hay cotizaciones con precios válidos')
    } else {
      resultados.push(`✅ ${cotizacionesConPrecio.length} cotizaciones con precios válidos`)
    }

    // Check 4: Verificar proveedores
    const cotizacionesConProveedor = cotizaciones.filter(c => c.cotizacion?.proveedor?.nombre)
    if (cotizacionesConProveedor.length === 0) {
      resultados.push('⚠️ Algunas cotizaciones no tienen proveedor asignado')
    } else {
      resultados.push(`✅ ${cotizacionesConProveedor.length} cotizaciones con proveedor válido`)
    }

    // Check 5: Verificar si ya hay una selección
    const cotizacionSeleccionada = cotizaciones.find(c => c.esSeleccionada)
    if (cotizacionSeleccionada) {
      resultados.push(`ℹ️ Ya hay una cotización seleccionada: ${cotizacionSeleccionada.cotizacion?.proveedor?.nombre || 'Proveedor desconocido'}`)
    } else {
      resultados.push('ℹ️ No hay cotización seleccionada actualmente')
    }

    setDiagnosticos(resultados)
  }, [cotizaciones])

  // 🧪 Probar API endpoint
  const probarAPI = async () => {
    if (cotizaciones.length === 0) {
      toast.error('No hay cotizaciones para probar')
      return
    }

    const cotizacionParaProbar = cotizaciones.find(c => c.estado === 'cotizado')
    if (!cotizacionParaProbar) {
      toast.error('No hay cotizaciones disponibles para probar')
      return
    }

    setApiStatus('testing')
    setIsLoading(true)

    try {
      console.log('🧪 Probando API con:', {
        itemId,
        cotizacionId: cotizacionParaProbar.id,
        endpoint: `/api/lista-equipo-item/${itemId}/seleccionar-cotizacion`
      })

      const response = await fetch(`/api/lista-equipo-item/${itemId}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cotizacionProveedorItemId: cotizacionParaProbar.id
        })
      })

      console.log('📡 Respuesta de API:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Datos recibidos:', data)
        setApiStatus('success')
        toast.success('🎉 API funcionando correctamente')
      } else {
        const errorData = await response.json()
        console.error('❌ Error de API:', errorData)
        setApiStatus('error')
        toast.error(`❌ Error de API: ${errorData.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('💥 Error inesperado:', error)
      setApiStatus('error')
      toast.error(`💥 Error inesperado: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 🎨 Obtener color del badge según el tipo de mensaje
  const getBadgeVariant = (mensaje: string) => {
    if (mensaje.startsWith('✅')) return 'default'
    if (mensaje.startsWith('❌')) return 'destructive'
    if (mensaje.startsWith('⚠️')) return 'secondary'
    return 'outline'
  }

  // 🎨 Obtener icono según el estado de la API
  const getApiStatusIcon = () => {
    switch (apiStatus) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'testing': return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default: return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Diagnóstico de Acciones - Item {itemId}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 📊 Resultados del diagnóstico */}
        <div>
          <h3 className="font-semibold mb-3">Resultados del Diagnóstico:</h3>
          <div className="space-y-2">
            {diagnosticos.map((diagnostico, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(diagnostico) as 'outline' | 'default' | 'secondary'} className="text-xs">
                  {diagnostico}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* 🧪 Prueba de API */}
        <div>
          <h3 className="font-semibold mb-3">Prueba de API:</h3>
          <div className="flex items-center gap-4">
            <Button 
              onClick={probarAPI}
              disabled={isLoading || cotizaciones.length === 0}
              variant="outline"
            >
              {isLoading ? 'Probando...' : 'Probar Selección de Cotización'}
            </Button>
            <div className="flex items-center gap-2">
              {getApiStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {apiStatus === 'idle' && 'Listo para probar'}
                {apiStatus === 'testing' && 'Probando API...'}
                {apiStatus === 'success' && 'API funcionando correctamente'}
                {apiStatus === 'error' && 'Error en la API'}
              </span>
            </div>
          </div>
        </div>

        {/* 📋 Información de cotizaciones */}
        <div>
          <h3 className="font-semibold mb-3">Cotizaciones Disponibles:</h3>
          <div className="grid gap-2">
            {cotizaciones.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay cotizaciones disponibles</p>
            ) : (
              cotizaciones.map((cot, index) => (
                <div key={cot.id || index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {cot.cotizacion?.proveedor?.nombre || 'Proveedor desconocido'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estado: {cot.estado} | Precio: ${cot.precioUnitario || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={cot.estado === 'cotizado' ? 'default' : 'secondary'}>
                        {cot.estado}
                      </Badge>
                      {cot.esSeleccionada && (
                        <Badge variant="default" className="bg-green-600">
                          Seleccionada
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🔧 Información técnica */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <p><strong>Endpoint:</strong> /api/lista-equipo-item/{itemId}/seleccionar-cotizacion</p>
          <p><strong>Método:</strong> PATCH</p>
          <p><strong>Payload:</strong> {`{ "cotizacionProveedorItemId": "<id>" }`}</p>
        </div>
      </CardContent>
    </Card>
  )
}