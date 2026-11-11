'use client'

// Aviso de la programación automática: cuántas tareas se ajustaron solas tras
// un cambio, cómo quedó el fin y un "Deshacer" que vuelve sus fechas anteriores
// (POST dependencias/restaurar). Lo usan el árbol, el editor de predecesoras y el Gantt.

import { toast } from 'sonner'

export interface Propagacion {
  tareasAjustadas: number
  finAntes?: string | null
  finDespues?: string | null
  deshacer: { id: string; inicio: string; fin: string }[]
}

const dia = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : ''

export function avisarPropagacion(
  proyectoId: string,
  p: Propagacion | null | undefined,
  alDeshacer?: () => void | Promise<void>,
  /** Para el ajuste manual ("Ajustar tareas…"); por defecto, el de la programación automática. */
  titulo?: string,
) {
  if (!p?.tareasAjustadas) return
  const cambiaFin = p.finAntes && p.finDespues && p.finAntes !== p.finDespues
  const n = `${p.tareasAjustadas} tarea${p.tareasAjustadas === 1 ? '' : 's'} ajustada${p.tareasAjustadas === 1 ? '' : 's'}`
  toast.success(titulo ? `${titulo}: ${n}` : `Programación automática: ${n}`, {
    description: cambiaFin
      ? `Ahora termina${titulo ? '' : 'n'} el ${dia(p.finDespues)} (antes ${dia(p.finAntes)}).`
      : titulo ? 'Quedaron pegadas a sus predecesoras, con sus desfases.' : 'Las que dependían de este cambio se movieron con él.',
    duration: 12000,
    action: {
      label: 'Deshacer',
      onClick: async () => {
        try {
          const r = await fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias/restaurar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cambios: p.deshacer }),
          })
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo deshacer')
          toast.info('Se volvieron a sus fechas anteriores')
          await alDeshacer?.()
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'No se pudo deshacer')
        }
      },
    },
  })
}
