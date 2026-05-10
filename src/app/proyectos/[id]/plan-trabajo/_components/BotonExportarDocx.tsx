'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generarOrganigramaPng } from '@/lib/planTrabajo/generarOrganigramaPng'
import type { OrgNodoContexto } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  orgNodos: OrgNodoContexto[]
  incluirOrganigrama?: boolean
  disabled?: boolean
}

export function BotonExportarDocx({ proyectoId, orgNodos, incluirOrganigrama = true, disabled }: Props) {
  const [exportando, setExportando] = useState(false)

  const handleExportar = async () => {
    setExportando(true)
    try {
      // 1. Generar PNG solo si el toggle está activo
      let pngBase64 = ''
      if (incluirOrganigrama && orgNodos.length > 0) {
        pngBase64 = await generarOrganigramaPng(orgNodos)
      }

      // 2. Llamar al endpoint
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/exportar-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organigramaPngBase64: pngBase64 }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; errores?: string[]; advertencias?: string[] }
        if (res.status === 422) {
          const errores: string[] = data.errores ?? []
          const advertencias: string[] = data.advertencias ?? []
          toast.error('No se puede exportar el plan', {
            description: (
              <div className="space-y-2 mt-1">
                {errores.length > 0 && (
                  <div>
                    <div className="font-semibold text-xs mb-0.5">Falta completar:</div>
                    <ul className="space-y-0.5">
                      {errores.map((e, i) => (
                        <li key={i} className="text-xs before:content-['•'] before:mr-1">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {advertencias.length > 0 && (
                  <div>
                    <div className="font-semibold text-xs mb-0.5 text-amber-700">Advertencias:</div>
                    <ul className="space-y-0.5">
                      {advertencias.map((a, i) => (
                        <li key={i} className="text-xs text-amber-700 before:content-['•'] before:mr-1">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
            duration: 10000,
          })
          return
        }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      // 3. Descargar blob
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

      // 4. Toast
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
    <Button
      variant="outline"
      onClick={handleExportar}
      disabled={disabled || exportando}
    >
      <FileDown className="h-4 w-4 mr-2" />
      {exportando ? 'Generando...' : 'Exportar DOCX'}
    </Button>
  )
}
