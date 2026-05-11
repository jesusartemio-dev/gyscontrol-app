'use client'

import { useState } from 'react'
import { FileDown, AlertTriangle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { generarOrganigramaPng } from '@/lib/planTrabajo/generarOrganigramaPng'
import type { OrgNodoContexto } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  orgNodos: OrgNodoContexto[]
  incluirOrganigrama?: boolean
  disabled?: boolean
}

interface ValidacionError {
  errores: string[]
  advertencias: string[]
}

export function BotonExportarDocx({ proyectoId, orgNodos, incluirOrganigrama = true, disabled }: Props) {
  const [exportando, setExportando] = useState(false)
  const [validacion, setValidacion] = useState<ValidacionError | null>(null)

  const handleExportar = async () => {
    setExportando(true)
    try {
      let pngBase64 = ''
      if (incluirOrganigrama && orgNodos.length > 0) {
        pngBase64 = await generarOrganigramaPng(orgNodos)
      }

      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/exportar-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organigramaPngBase64: pngBase64 }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; errores?: string[]; advertencias?: string[] }
        if (res.status === 422) {
          setValidacion({
            errores: data.errores ?? [],
            advertencias: data.advertencias ?? [],
          })
          return
        }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const driveError = res.headers.get('X-Drive-Error')
      const driveLink = res.headers.get('X-Drive-View-Link')
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const archivoNombre = disposition.match(/filename="(.+?)"/)?.[1] ?? 'PlanTrabajo.docx'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = archivoNombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (driveError) {
        toast.warning(`Descargado, pero falló subida a Drive: ${driveError}`)
      } else if (driveLink) {
        toast.success('Documento descargado y guardado en Drive', {
          action: {
            label: 'Ver en Drive',
            onClick: () => window.open(driveLink, '_blank'),
          },
        })
      } else {
        toast.success('Documento descargado')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleExportar}
        disabled={disabled || exportando}
      >
        <FileDown className="h-4 w-4 mr-2" />
        {exportando ? 'Generando...' : 'Exportar DOCX'}
      </Button>

      {validacion && (
        <Dialog open onOpenChange={() => setValidacion(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={18} />
                No se puede exportar el plan
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 pt-2">
                  {validacion.errores.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-destructive mb-1.5">
                        Falta completar (obligatorio):
                      </p>
                      <ul className="space-y-1">
                        {validacion.errores.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validacion.advertencias.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-700 mb-1.5">
                        Advertencias (no bloquean):
                      </p>
                      <ul className="space-y-1">
                        {validacion.advertencias.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setValidacion(null)}>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
