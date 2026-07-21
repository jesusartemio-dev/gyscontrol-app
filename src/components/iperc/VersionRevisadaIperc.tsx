'use client'

import { useEffect, useState } from 'react'
import { FileSpreadsheet, ExternalLink, Loader2 } from 'lucide-react'

interface VersionRevisadaData {
  html: string
  codigoDocumento: string
  numeroRevision: string
  archivoNombre: string
  subidoEn: string
  webViewLink: string
}

interface Props {
  proyectoId: string
}

/**
 * Vista de la última versión IMPORTADO vigente del IPERC (el Excel que
 * alguien revisó/aprobó fuera de la app y volvió a subir), renderizada TAL
 * CUAL — misma idea que VersionRevisadaView.tsx del Plan de Trabajo, pero acá
 * el archivo es XLSX: se convierte a una tabla HTML con SheetJS en vez de
 * mammoth. No se re-parsea a filas de IPERC — es una vista de solo lectura.
 */
export function VersionRevisadaIperc({ proyectoId }: Props) {
  const [data, setData] = useState<VersionRevisadaData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(null)
    fetch(`/api/proyectos/${proyectoId}/iperc/version-revisada`)
      .then(async res => {
        if (!res.ok) throw new Error('No se pudo cargar la versión revisada')
        return res.json()
      })
      .then(({ data }) => {
        if (!cancelado) setData(data)
      })
      .catch(err => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar la versión revisada')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => { cancelado = true }
  }, [proyectoId])

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Cargando versión revisada...
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 text-center py-8">{error}</p>
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Todavía no se subió ninguna versión revisada de este IPERC.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border rounded-md px-3 py-2 bg-muted/40 text-sm">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileSpreadsheet size={14} className="shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{data.codigoDocumento || data.archivoNombre}</span>
        </div>
        <span className="text-xs text-muted-foreground">Rev. {data.numeroRevision}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(data.subidoEn).toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
        <a
          href={data.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
        >
          <ExternalLink size={12} />
          Abrir en Drive
        </a>
      </div>

      <div className="overflow-x-auto border rounded-md p-4 bg-white">
        {/* eslint-disable-next-line react/no-danger -- HTML sanitizado server-side (sanitize-html) antes de llegar acá */}
        <div className="xlsx-vista" dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    </div>
  )
}
