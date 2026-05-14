'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Plus, Brain, Download, RefreshCw, Pencil, Check } from 'lucide-react'
import { petsContenidoSchema } from '@/lib/validators/pets'
import type { PetsContenido } from '@/lib/validators/pets'
import { PetsViewer } from './PetsViewer'
import { PetsGenerator } from './PetsGenerator'
import { PetsEditorPanel } from './PetsEditorPanel'
import { PasoEditorModal } from './PasoEditorModal'
import { useRegenerarPetsSSE } from './useRegenerarPetsSSE'

interface PetsRecord {
  id: string
  iaEnCurso: boolean
  contenido: unknown
  estado: string | null
  codigoDocumento: string | null
  revision: string | null
}

interface Props {
  proyectoId: string
}

type Mode = 'idle' | 'generando' | 'exporting'

export function PetsClient({ proyectoId }: Props) {
  const [pets, setPets] = useState<PetsRecord | null | undefined>(undefined)
  const [mode, setMode] = useState<Mode>('idle')
  const [contenido, setContenido] = useState<PetsContenido | null>(null)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pasoEditando, setPasoEditando] = useState<{
    etapaIdx: number
    pasoIdx: number
  } | null>(null)
  const [agregarPasoEn, setAgregarPasoEn] = useState<number | null>(null)

  const { estado: estadoRegen, regenerarEtapa, regenerarPaso } = useRegenerarPetsSSE(proyectoId)

  const cargarPets = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pets`)
      if (!res.ok) {
        toast.error('Error al cargar PETS')
        setPets(null)
        return
      }
      const { data } = await res.json()
      setPets(data)
      if (data?.contenido) {
        const parsed = petsContenidoSchema.safeParse(data.contenido)
        setContenido(parsed.success ? parsed.data : null)
      } else {
        setContenido(null)
      }
    } catch {
      toast.error('Error de red al cargar PETS')
      setPets(null)
    }
  }, [proyectoId])

  useEffect(() => {
    cargarPets()
  }, [cargarPets])

  const crearPets = async () => {
    setLoadingCreate(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pets`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al crear PETS')
      setPets(json.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear PETS')
    } finally {
      setLoadingCreate(false)
    }
  }

  const exportarDocx = async () => {
    setMode('exporting')
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pets/exportar-docx`, {
        method: 'POST',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? `Error HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] ?? 'PETS.docx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('DOCX descargado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar DOCX')
    } finally {
      setMode('idle')
    }
  }

  const guardarContenido = async (nuevo: PetsContenido): Promise<void> => {
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pets/contenido`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Error HTTP ${res.status}`)
      setContenido(nuevo)
      toast.success('Guardado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
      throw e
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (pets === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No pets record
  if (pets === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-muted-foreground text-sm">
          Este proyecto no tiene un PETS creado aún.
        </p>
        <Button onClick={crearPets} disabled={loadingCreate}>
          {loadingCreate ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Crear PETS
        </Button>
      </div>
    )
  }

  // Generating (full)
  if (mode === 'generando') {
    return (
      <div className="space-y-4 p-1">
        <h2 className="text-lg font-semibold">Generando PETS con IA</h2>
        <p className="text-sm text-muted-foreground">
          La generación tarda varios minutos. No cierres esta pestaña.
        </p>
        <PetsGenerator
          proyectoId={proyectoId}
          onComplete={() => {
            setMode('idle')
            cargarPets()
          }}
          onError={(msg) => {
            setMode('idle')
            toast.error(`Error en generación: ${msg}`)
          }}
        />
      </div>
    )
  }

  // Has pets but no contenido
  if (!contenido) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          El PETS está creado pero aún no tiene contenido generado.
        </p>
        <Button onClick={() => setMode('generando')}>
          <Brain className="h-4 w-4 mr-2" />
          Generar con IA
        </Button>
      </div>
    )
  }

  const regenActivo = estadoRegen.activo

  // Has contenido — show viewer or editor + actions
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">PETS</h2>
          {pets.codigoDocumento && (
            <p className="text-xs text-muted-foreground font-mono">
              {pets.codigoDocumento} · Rev. {pets.revision ?? '01'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={modoEdicion ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoEdicion(!modoEdicion)}
            disabled={saving || mode !== 'idle'}
          >
            {modoEdicion ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Listo
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-1.5" />
                Editar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode('generando')}
            disabled={mode !== 'idle' || saving || regenActivo}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Regenerar
          </Button>
          <Button
            size="sm"
            onClick={exportarDocx}
            disabled={mode !== 'idle' || saving || regenActivo}
          >
            {mode === 'exporting' ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Exportar DOCX
          </Button>
        </div>
      </div>

      {modoEdicion ? (
        <PetsEditorPanel
          contenido={contenido}
          onGuardar={guardarContenido}
          onEditarPaso={(eIdx, pIdx) => {
            if (regenActivo) return
            setPasoEditando({ etapaIdx: eIdx, pasoIdx: pIdx })
          }}
          onAgregarPaso={(eIdx) => {
            if (regenActivo) return
            setAgregarPasoEn(eIdx)
          }}
          saving={saving}
          estadoRegen={estadoRegen}
          onRegenerarEtapa={(etapaIdx) => regenerarEtapa(etapaIdx, cargarPets)}
          onRegenerarPaso={(etapaIdx, pasoIdx) => regenerarPaso(etapaIdx, pasoIdx, cargarPets)}
        />
      ) : (
        <PetsViewer contenido={contenido} />
      )}

      {pasoEditando && (
        <PasoEditorModal
          proyectoId={proyectoId}
          contenido={contenido}
          etapaIndex={pasoEditando.etapaIdx}
          pasoIndex={pasoEditando.pasoIdx}
          onClose={() => setPasoEditando(null)}
          onSaved={(nuevo) => setContenido(nuevo)}
        />
      )}

      {agregarPasoEn !== null && (
        <PasoEditorModal
          proyectoId={proyectoId}
          contenido={contenido}
          etapaIndex={agregarPasoEn}
          pasoIndex={null}
          onClose={() => setAgregarPasoEn(null)}
          onSaved={(nuevo) => setContenido(nuevo)}
        />
      )}
    </div>
  )
}
