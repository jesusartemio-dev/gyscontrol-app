'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { petsContenidoSchema } from '@/lib/validators/pets'
import type { PetsContenido, BloqueComo } from '@/lib/validators/pets'
import { BloqueComoEditor } from './BloqueComoEditor'

interface Props {
  proyectoId: string
  contenido: PetsContenido
  etapaIndex: number
  pasoIndex: number | null // null → nuevo paso (append al final)
  onClose: () => void
  onSaved: (nuevoContenido: PetsContenido) => void
}

export function PasoEditorModal({
  proyectoId,
  contenido,
  etapaIndex,
  pasoIndex,
  onClose,
  onSaved,
}: Props) {
  const etapa = contenido.procedimiento.etapas[etapaIndex]
  const pasoOriginal = pasoIndex !== null ? etapa?.pasos[pasoIndex] ?? null : null
  const esNuevo = pasoOriginal === null

  const [que, setQue] = useState(pasoOriginal?.que ?? '')
  const [quien, setQuien] = useState<string[]>(
    pasoOriginal?.quien.map((q) => q.rol) ?? ['']
  )
  const [como, setComo] = useState<BloqueComo[]>(
    pasoOriginal?.como ?? [{ tipo: 'parrafo', texto: '' }]
  )
  const [saving, setSaving] = useState(false)

  // Sugiere roles desde personal del contenido
  const rolesDisponibles = contenido.personal.map((p) => p.rol)

  const letra = etapa?.letra ?? String.fromCharCode(65 + etapaIndex)
  const numPaso = pasoIndex !== null ? pasoIndex + 1 : (etapa?.pasos.length ?? 0) + 1
  const tituloModal = esNuevo
    ? `Nuevo paso — Etapa ${letra}`
    : `Editar paso ${letra}.${numPaso}`

  const guardar = async () => {
    if (!que.trim()) {
      toast.error('El campo "Qué" es obligatorio')
      return
    }
    const quienFiltrado = quien.filter((r) => r.trim())
    if (quienFiltrado.length === 0) {
      toast.error('Debe haber al menos un rol responsable')
      return
    }
    const comoFiltrado = como.filter((b) => {
      if (b.tipo === 'parrafo') return b.texto.trim().length > 0
      return true
    })
    if (comoFiltrado.length === 0) {
      toast.error('Debe haber al menos un bloque de contenido')
      return
    }

    const nuevoPaso = {
      que: que.trim(),
      como: comoFiltrado,
      quien: quienFiltrado.map((r) => ({ rol: r })),
    }

    const nuevoContenido = structuredClone(contenido) as PetsContenido
    if (esNuevo) {
      nuevoContenido.procedimiento.etapas[etapaIndex].pasos.push(nuevoPaso)
    } else {
      nuevoContenido.procedimiento.etapas[etapaIndex].pasos[pasoIndex!] = nuevoPaso
    }

    const validated = petsContenidoSchema.safeParse(nuevoContenido)
    if (!validated.success) {
      toast.error('Error de validación', {
        description: validated.error.issues[0]?.message,
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pets/contenido`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Error HTTP ${res.status}`)
      toast.success(esNuevo ? 'Paso agregado' : 'Paso guardado')
      onSaved(validated.data)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{tituloModal}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Qué */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">
              Qué
            </label>
            <Input
              value={que}
              onChange={(e) => setQue(e.target.value)}
              maxLength={200}
              className="text-sm"
              placeholder="Título del paso..."
            />
            <p className="text-xs text-gray-400 mt-0.5 text-right">{que.length}/200</p>
          </div>

          {/* Quién */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">
              Quién
            </label>
            <div className="space-y-1">
              {quien.map((rol, i) => (
                <div key={i} className="flex gap-1">
                  <Input
                    value={rol}
                    onChange={(e) => {
                      const next = [...quien]
                      next[i] = e.target.value
                      setQuien(next)
                    }}
                    list="roles-sugeridos"
                    className="h-8 text-sm"
                    placeholder="Rol responsable..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 flex-shrink-0"
                    onClick={() => setQuien(quien.filter((_, j) => j !== i))}
                    disabled={quien.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <datalist id="roles-sugeridos">
                {rolesDisponibles.map((r, i) => (
                  <option key={i} value={r} />
                ))}
              </datalist>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setQuien([...quien, ''])}
              >
                <Plus className="h-3 w-3" /> Agregar rol
              </Button>
            </div>
          </div>

          {/* Cómo */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block">
              Cómo
            </label>
            <BloqueComoEditor bloques={como} onChange={setComo} />
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
