'use client'

// Eliminar el Plan de Trabajo: borra en cascada secciones, imágenes del
// alcance, versiones subidas/exportadas y lo editado a mano. Por eso el modal
// muestra lo que se pierde con números reales y pide escribir el código del
// proyecto (un clic de más no alcanzaba: el botón estaba suelto en la barra).

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ResumenEliminarPlan {
  /** Secciones con contenido. */
  secciones: number
  /** Imágenes del alcance (todas). */
  imagenes: number
  /** De esas, subidas directamente (fotos propias, no de la biblioteca): no se recuperan. */
  fotosPropias: number
  /** Secciones editadas a mano + textos editados del Alcance Detallado. */
  editadas: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  codigoProyecto: string
  resumen: ResumenEliminarPlan
  onEliminado?: () => void
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function DialogEliminarPlan({ open, onOpenChange, proyectoId, codigoProyecto, resumen, onEliminado }: Props) {
  const [eliminando, setEliminando] = useState(false)
  const [confirmacion, setConfirmacion] = useState('')
  const [versiones, setVersiones] = useState<{ subidas: number; exportadas: number } | null>(null)

  // Al abrir: limpia lo escrito y cuenta las versiones (no vienen en el contexto).
  useEffect(() => {
    if (!open) return
    setConfirmacion('')
    setVersiones(null)
    let vivo = true
    fetch(`/api/proyectos/${proyectoId}/plan-trabajo`)
      .then(r => (r.ok ? r.json() : null))
      .then(body => {
        if (!vivo) return
        const gens = (body?.data?.generaciones ?? []) as { origen?: string }[]
        setVersiones({
          subidas: gens.filter(g => g.origen === 'IMPORTADO').length,
          exportadas: gens.filter(g => g.origen !== 'IMPORTADO').length,
        })
      })
      .catch(() => { if (vivo) setVersiones({ subidas: 0, exportadas: 0 }) })
    return () => { vivo = false }
  }, [open, proyectoId])

  const coincide = confirmacion.trim().toUpperCase() === codigoProyecto.trim().toUpperCase()

  const handleEliminar = async () => {
    if (!coincide) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      toast.success('Plan eliminado. Podés crear uno nuevo.')
      onOpenChange(false)
      onEliminado?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const lineas: { texto: string; fuerte?: boolean }[] = [
    { texto: plural(resumen.secciones, 'sección con contenido', 'secciones con contenido') },
  ]
  if (resumen.imagenes > 0) {
    lineas.push({
      texto: `${plural(resumen.imagenes, 'imagen del alcance', 'imágenes del alcance')}` +
        (resumen.fotosPropias > 0 ? ` — ${plural(resumen.fotosPropias, 'es foto subida', 'son fotos subidas')} a mano (de campo u oficina), que no se recuperan` : ''),
      fuerte: resumen.fotosPropias > 0,
    })
  }
  if (versiones && versiones.subidas > 0) {
    lineas.push({ texto: `${plural(versiones.subidas, 'versión revisada subida', 'versiones revisadas subidas')} (Word corregido) y sus imágenes pendientes`, fuerte: true })
  }
  if (versiones && versiones.exportadas > 0) {
    lineas.push({ texto: `el historial de ${plural(versiones.exportadas, 'exportación', 'exportaciones')} DOCX` })
  }
  if (resumen.editadas > 0) {
    lineas.push({ texto: `${plural(resumen.editadas, 'cambio hecho a mano', 'cambios hechos a mano')} (secciones y textos editados)`, fuerte: true })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!eliminando) onOpenChange(o) }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">¿Eliminar el Plan de Trabajo?</DialogTitle>
          <DialogDescription>
            Se borra el plan completo de {codigoProyecto}. <strong>No se puede deshacer.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Se pierde:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {lineas.map((l, i) => (
              <li key={i} className={l.fuerte ? 'font-medium text-destructive' : ''}>{l.texto}</li>
            ))}
            {!versiones && (
              <li className="list-none -ml-5 flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> contando versiones…
              </li>
            )}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            El cronograma, el organigrama y los documentos del proyecto no se tocan.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmar-eliminar-plan" className="text-sm">
            Para confirmar, escribí el código del proyecto: <span className="font-mono font-semibold">{codigoProyecto}</span>
          </label>
          <Input
            id="confirmar-eliminar-plan"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && coincide) void handleEliminar() }}
            placeholder={codigoProyecto}
            autoComplete="off"
            className="font-mono"
          />
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleEliminar} disabled={!coincide || eliminando}>
            {eliminando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            Eliminar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
