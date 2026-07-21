'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, ExternalLink, Download, ChevronDown, FileText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DetalleGeneracion } from './DetalleGeneracion'

interface Generacion {
  id: string
  numeroRevision: string
  archivoNombre: string
  tamanioBytes: number
  webViewLink: string
  driveFileId: string
  origen: string
  vigente: boolean
  codigoNexa: string | null
  generadoEn: string
  generadoPor: { id: string; name: string | null; email: string }
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  proyectoId: string
}

export function HistorialGeneraciones({ proyectoId }: Props) {
  const [open, setOpen] = useState(false)
  const [generaciones, setGeneraciones] = useState<Generacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [descargandoId, setDescargandoId] = useState<string | null>(null)
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)

  const cargarGeneraciones = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/generaciones`)
      if (res.ok) {
        const { data } = await res.json()
        setGeneraciones(data)
      }
    } finally {
      setCargando(false)
    }
  }, [proyectoId])

  useEffect(() => {
    if (open) cargarGeneraciones()
  }, [open, cargarGeneraciones])

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDescargar = async (gen: Generacion) => {
    setDescargandoId(gen.id)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/plan-trabajo/generaciones/${gen.id}/descargar`
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? `HTTP ${res.status}`)
      }
      downloadBlob(await res.blob(), gen.archivoNombre)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar')
    } finally {
      setDescargandoId(null)
    }
  }

  const handleRegenerar = async (gen: Generacion) => {
    setRegenerandoId(gen.id)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/plan-trabajo/generaciones/${gen.id}/regenerar`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? `HTTP ${res.status}`)
      }
      downloadBlob(await res.blob(), gen.archivoNombre)
      toast.success('DOCX regenerado desde snapshot')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al regenerar')
    } finally {
      setRegenerandoId(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <History size={14} />
        Historial DOCX{generaciones.length > 0 ? ` (${generaciones.length})` : ''}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Historial de exportaciones DOCX</SheetTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cargarGeneraciones} disabled={cargando} title="Recargar">
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
            </Button>
          </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {cargando ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Cargando...</p>
            ) : generaciones.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-sm text-muted-foreground">No hay exportaciones registradas.</p>
                <p className="text-xs text-muted-foreground">Usá el botón <strong>Exportar DOCX</strong> para generar el primer documento.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {generaciones.map(gen => (
                  <li key={gen.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{gen.codigoNexa ?? gen.archivoNombre}</p>
                          {gen.vigente && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 hover:bg-green-100 shrink-0">Vigente</Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {gen.origen === 'IMPORTADO' ? 'Editado y subido' : 'Generado'}
                          </Badge>
                        </div>
                        {gen.codigoNexa && (
                          <p className="text-xs text-muted-foreground truncate">{gen.archivoNombre}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(gen.generadoEn)} · {fmtBytes(gen.tamanioBytes)}
                        </p>
                        {gen.generadoPor.name && (
                          <p className="text-xs text-muted-foreground">por {gen.generadoPor.name}</p>
                        )}
                        {gen.origen === 'IMPORTADO' && (
                          <p className="text-xs text-muted-foreground">Descargá el archivo (▾) para ver el contenido editado.</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {gen.origen !== 'IMPORTADO' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setDetalleId(gen.id)}
                          >
                            <FileText size={12} />
                            Ver
                          </Button>
                        )}

                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a
                            href={gen.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir en Drive"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs">
                              <Download size={12} />
                              <ChevronDown size={10} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              disabled={descargandoId === gen.id}
                              onClick={() => handleDescargar(gen)}
                            >
                              {descargandoId === gen.id ? 'Descargando...' : 'Copia exacta de Drive'}
                            </DropdownMenuItem>
                            {gen.origen !== 'IMPORTADO' && (
                              <DropdownMenuItem
                                disabled={regenerandoId === gen.id}
                                onClick={() => handleRegenerar(gen)}
                              >
                                {regenerandoId === gen.id ? 'Regenerando...' : 'Regenerar desde snapshot'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {detalleId && (
        <DetalleGeneracion
          proyectoId={proyectoId}
          generacionId={detalleId}
          isOpen={detalleId !== null}
          onClose={() => setDetalleId(null)}
        />
      )}
    </>
  )
}
