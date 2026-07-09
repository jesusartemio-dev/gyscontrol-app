'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, Trash2, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CotizacionDiff } from '@/lib/agente/cotizacionDocumentoExtractor'

interface CotizacionDocumentoResponse {
  id: string
  nombreArchivo: string
  urlArchivo: string
  numeroPropuesta: string | null
  clienteDetectado: string | null
  moneda: string | null
  fechaPropuesta: string | null
  resumenAlcance: string[] | null
  exclusiones: string[] | null
  advertenciasExtraccion: string[] | null
  estadoVerificacion: string | null
  fechaVerificacion: string | null
  diffLive: CotizacionDiff
}

function formatMonto(valor: number, moneda?: string): string {
  const symbol = moneda === 'PEN' ? 'S/' : '$'
  return `${symbol} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (estado === 'coincide') {
    return (
      <Badge variant="default" className="bg-green-600 text-white">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Coincide
      </Badge>
    )
  }
  if (estado === 'no_coincide') {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" /> No coincide
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <HelpCircle className="h-3 w-3 mr-1" /> Sin verificar
    </Badge>
  )
}

export default function CotizacionDocumentoPanel({ proyectoId }: { proyectoId: string }) {
  const [documento, setDocumento] = useState<CotizacionDocumentoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [reverificando, setReverificando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/proyecto/${proyectoId}/cotizacion-documento`)
      if (res.status === 404) {
        setDocumento(null)
        return
      }
      if (!res.ok) throw new Error()
      setDocumento(await res.json())
    } catch {
      toast.error('Error al cargar la cotización del proyecto')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar])

  const handleFileSelected = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/proyecto/${proyectoId}/cotizacion-documento/analizar-pdf`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar el PDF')
      setDocumento(data)
      toast.success('Cotización analizada correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el PDF')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReverificar = async () => {
    setReverificando(true)
    try {
      const res = await fetch(`/api/proyecto/${proyectoId}/cotizacion-documento/reverificar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reverificar')
      setDocumento(data)
      toast.success('Verificación actualizada contra los costos reales')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reverificar')
    } finally {
      setReverificando(false)
    }
  }

  const handleEliminar = async () => {
    if (!confirm('¿Eliminar el PDF de cotización cargado? Podrás volver a subir uno.')) return
    try {
      const res = await fetch(`/api/proyecto/${proyectoId}/cotizacion-documento`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDocumento(null)
      toast.success('Cotización eliminada')
    } catch {
      toast.error('Error al eliminar la cotización')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!documento) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">Aún no hay una cotización cargada</p>
            <p className="text-sm text-muted-foreground">
              Sube la Propuesta Económica (PDF) que dio origen a este proyecto para extraer el alcance y verificar los totales.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analizando PDF...</>
              : <><Upload className="h-4 w-4 mr-2" /> Subir PDF de cotización</>}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { diffLive } = documento
  const moneda = diffLive.campos[0]?.unidad

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{documento.numeroPropuesta || documento.nombreArchivo}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {documento.clienteDetectado || 'Cliente no detectado'}
              {documento.fechaPropuesta ? ` · ${new Date(documento.fechaPropuesta).toLocaleDateString('es-PE')}` : ''}
            </p>
          </div>
          <EstadoBadge estado={documento.estadoVerificacion} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/20">
                <tr>
                  <th className="text-left p-2 font-medium">Campo</th>
                  <th className="text-left p-2 font-medium">Costo real del proyecto</th>
                  <th className="text-left p-2 font-medium">Cotización (PDF)</th>
                  <th className="p-2 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {diffLive.campos.map((d, i) => (
                  <tr key={i} className={`border-t ${!d.coincide ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                    <td className={`p-2 ${!d.coincide ? 'font-semibold' : 'text-muted-foreground'}`}>{d.label}</td>
                    <td className="p-2">{formatMonto(d.valorSistema, d.unidad)}</td>
                    <td className={`p-2 ${!d.coincide ? 'font-semibold text-red-700 dark:text-red-400' : ''}`}>
                      {formatMonto(d.valorDocumento, d.unidad)}
                    </td>
                    <td className="p-2">
                      {d.coincide
                        ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                        : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!diffLive.monedaCoincide && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> La moneda de la cotización ({moneda}) no coincide con la del proyecto — los montos no son directamente comparables.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleReverificar} disabled={reverificando}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reverificando ? 'animate-spin' : ''}`} /> Reverificar
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? 'Analizando...' : 'Reemplazar PDF'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }}
            />
            <a href={documento.urlArchivo} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ver PDF original
              </Button>
            </a>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto" onClick={handleEliminar}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
            </Button>
          </div>
          {documento.fechaVerificacion && (
            <p className="text-[11px] text-muted-foreground">
              Última verificación: {new Date(documento.fechaVerificacion).toLocaleString('es-PE')}
            </p>
          )}
        </CardContent>
      </Card>

      {documento.resumenAlcance && documento.resumenAlcance.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen de alcance</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {documento.resumenAlcance.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {documento.exclusiones && documento.exclusiones.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Exclusiones y observaciones clave</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {documento.exclusiones.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {documento.advertenciasExtraccion && documento.advertenciasExtraccion.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader><CardTitle className="text-sm">Advertencias de la extracción</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              {documento.advertenciasExtraccion.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
