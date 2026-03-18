'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  Loader2,
  CheckCircle,
  FileText,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

interface FirmaData {
  id: string
  nombre: string
  cargo: string
  firmaDifusion: boolean
  fechaFirma: string | null
  proyecto: string
  cliente: string
  codigoCod: string
  documentos: Array<{
    id: string
    codigoDocumento: string
    titulo: string
    tipo: string
    parSubtipo: string | null
    driveUrl: string | null
  }>
}

export default function FirmaPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FirmaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nombreConfirmado, setNombreConfirmado] = useState('')
  const [dni, setDni] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [fechaFirma, setFechaFirma] = useState<string | null>(null)

  useEffect(() => {
    if (token) loadData()
  }, [token])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ssoma/firma/${token}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'El enlace no es v\u00e1lido o ha expirado.' : 'Error al cargar los datos.')
        return
      }
      const d = await res.json()
      setData(d)
      if (d.firmaDifusion) {
        setSigned(true)
        setFechaFirma(d.fechaFirma)
      }
    } catch {
      setError('Error de conexi\u00f3n.')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async () => {
    if (!nombreConfirmado.trim() || !dni.trim()) return
    setSigning(true)
    try {
      const res = await fetch(`/api/ssoma/firma/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreConfirmado, dni }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error')
      }
      const result = await res.json()
      setSigned(true)
      setFechaFirma(result.fechaFirma)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar firma')
    } finally {
      setSigning(false)
    }
  }

  // Full-screen overlay to cover the app sidebar/nav
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      {children}
    </div>
  )

  if (loading) {
    return (
      <Wrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        </div>
      </Wrapper>
    )
  }

  if (error || !data) {
    return (
      <Wrapper>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-sm text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-lg font-semibold text-gray-900">Enlace no v\u00e1lido</h1>
            <p className="text-sm text-muted-foreground">{error || 'No se encontraron datos.'}</p>
          </div>
        </div>
      </Wrapper>
    )
  }

  if (signed) {
    return (
      <Wrapper>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-sm text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              {nombreConfirmado ? `Gracias ${nombreConfirmado}` : 'Ya registraste tu conformidad'}
            </h1>
            <p className="text-sm text-muted-foreground">Tu firma ha sido registrada.</p>
            {fechaFirma && (
              <p className="text-xs text-muted-foreground">
                {new Date(fechaFirma).toLocaleString('es-PE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            <Badge className="bg-gray-100 text-gray-700">{data.proyecto}</Badge>
          </div>
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Constancia de Difusi\u00f3n SSOMA</h1>
          <p className="text-sm text-muted-foreground">GYS Control Industrial SAC</p>
        </div>

        {/* Project info */}
        <div className="border rounded-lg p-4 bg-white space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Proyecto</span>
            <span className="text-sm font-medium">{data.proyecto}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cliente</span>
            <span className="text-sm">{data.cliente}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Trabajador</span>
            <span className="text-sm font-medium">{data.nombre}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cargo</span>
            <span className="text-sm">{data.cargo}</span>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Documentos de seguridad</h2>
          <div className="border rounded-lg bg-white divide-y">
            {data.documentos.length > 0 ? data.documentos.map((doc) => (
              <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">{doc.titulo}</span>
                  <span className="text-xs text-muted-foreground">{doc.codigoDocumento}</span>
                </div>
                {doc.driveUrl && (
                  <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Los documentos a\u00fan no han sido aprobados
              </div>
            )}
          </div>
        </div>

        {/* Declaration */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900 leading-relaxed">
            Declaro haber recibido y comprendido el contenido de los procedimientos
            de seguridad listados anteriormente.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre completo <span className="text-red-500">*</span></Label>
            <Input
              value={nombreConfirmado}
              onChange={(e) => setNombreConfirmado(e.target.value)}
              placeholder={data.nombre}
              disabled={signing}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">DNI <span className="text-red-500">*</span></Label>
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="12345678"
              maxLength={8}
              disabled={signing}
            />
          </div>
        </div>

        <Button
          onClick={handleSign}
          disabled={signing || !nombreConfirmado.trim() || !dni.trim()}
          className="w-full bg-red-600 hover:bg-red-700"
          size="lg"
        >
          {signing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
          ) : (
            <><CheckCircle className="h-4 w-4 mr-2" />Confirmar y firmar</>
          )}
        </Button>
      </div>
    </Wrapper>
  )
}
