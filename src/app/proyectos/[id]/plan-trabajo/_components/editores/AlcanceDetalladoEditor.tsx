'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceDetalladoSubItem, PlanAlcanceDetalladoTarea } from '@/types/planTrabajo'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, PlusCircle, ChevronUp, ChevronDown, EyeOff, ListChecks, ImageIcon, Camera, Sparkles, Lock, Save } from 'lucide-react'
import { GaleriaImagenesAlcance, type GaleriaImagenesAlcanceHandle } from './GaleriaImagenesAlcance'
import { HintFotoSugerida } from '@/components/catalogoImagenes/HintFotoSugerida'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { RegenerarEdtDialog } from './RegenerarEdtDialog'
import { CopiarPegarTexto } from '../CopiarPegarTexto'
import { BotonCopiarParaIA, DelCronogramaPanel } from '../CopiarParaIA'
import { construirTextoParaIa } from '@/lib/planTrabajo/contextoIaAlcance'
import type { PlanTrabajoImagen } from '@prisma/client'
import type { PlanHerramientasYEquipos, PlanTrabajoContexto } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  valor: PlanAlcanceDetalladoEdt[]
  /** Nombres de equipos/herramientas/materiales del plan — señal para sugerir imágenes del catálogo global (Bloque 4.2, Tarea 6). */
  herramientasYEquipos: PlanHerramientasYEquipos
  imagenes: PlanTrabajoImagen[]
  onImagenesChanged: () => Promise<void>
  onSave: (v: PlanAlcanceDetalladoEdt[]) => Promise<void>
  /** Guarda sin cerrar el panel (botón "Guardar actividad"). */
  onGuardarParcial: (v: PlanAlcanceDetalladoEdt[]) => Promise<void>
  onCancel: () => void
  /**
   * Índice del EDT a editar solo (lápiz de cada EDT en la vista). Se muestra
   * únicamente ese EDT y al guardar se reemplaza solo ese sobre lo que esté
   * guardado en el servidor en ese momento. Sin él, se edita todo el alcance.
   */
  soloEdt?: number
  /** Contexto del plan: de aquí sale "Del cronograma" y "Copiar para IA". */
  contexto?: PlanTrabajoContexto | null
}

const edtVacio = (): PlanAlcanceDetalladoEdt => ({
  numeracion: '',
  edtNombre: '',
  edtCodigo: '',
  faseNombre: '',
  faseAbreviatura: '',
  ubicacion: '',
  descripcion: '',
  tipoDetalle: 'resumido',
  subItems: [],
})

const subItemVacio = (numeracionPadre: string, idx: number): PlanAlcanceDetalladoSubItem => ({
  numeracion: `${numeracionPadre}.${idx + 1}`,
  actividadNombre: '',
  descripcion: '',
})

/** Conteos de un EDT para los badges del encabezado — de un vistazo, sin expandir (Prioridad 4). */
function contarEstadoEdt(item: PlanAlcanceDetalladoEdt, imagenes: PlanTrabajoImagen[]) {
  const edtRef = item.edtRefId ?? ''
  let tareas = 0
  let fotosPendientes = 0

  for (const s of item.subItems ?? []) {
    const imagenesSub = imagenes.filter(img => img.edtRef === edtRef && !img.tareaRef && (img.subItemRef ?? undefined) === s.actividadRefId)
    if (s.fotoSugerida && imagenesSub.length === 0) fotosPendientes++

    for (const t of (s.tareas ?? []).filter(t => !t.excluida)) {
      tareas++
      const imagenesTarea = imagenes.filter(img => img.edtRef === edtRef && img.tareaRef === t.tareaRefId)
      if (t.fotoSugerida && imagenesTarea.length === 0) fotosPendientes++
    }
  }

  const totalImagenes = edtRef ? imagenes.filter(img => img.edtRef === edtRef).length : 0
  // Sugerencias de imagen de IA pendientes de revisión (Bloque 4.2 sesión 4).
  const sugeridasIA = edtRef ? imagenes.filter(img => img.edtRef === edtRef && img.origen === 'IA_AUTO').length : 0
  return { tareas, imagenes: totalImagenes, fotosPendientes, sugeridasIA }
}

export function AlcanceDetalladoEditor({ proyectoId, valor, herramientasYEquipos, imagenes, onImagenesChanged, onSave, onGuardarParcial, onCancel, soloEdt, contexto }: Props) {
  const [items, setItems] = useState<PlanAlcanceDetalladoEdt[]>(
    valor.length > 0 ? valor : [edtVacio()]
  )
  const [saving, setSaving] = useState(false)
  // Lo que está guardado en el servidor: base para "Guardar actividad" (que
  // guarda solo esa actividad sobre lo ya guardado) y para saber qué cambió.
  const [guardado, setGuardado] = useState<PlanAlcanceDetalladoEdt[]>(() => (valor.length > 0 ? valor : [edtVacio()]))
  const [guardandoActividad, setGuardandoActividad] = useState<string | null>(null)
  // EDT enfocado (null = todo el alcance). "Ver todo el alcance" lo suelta.
  const [foco, setFoco] = useState<number | null>(
    soloEdt != null && soloEdt >= 0 && soloEdt < items.length ? soloEdt : null
  )
  // Acordeón controlado: todo cerrado al abrir el alcance completo (se navega
  // con el índice); abierto solo el EDT enfocado.
  const [abiertos, setAbiertos] = useState<string[]>(foco != null ? [String(foco)] : [])
  // Cambios sin guardar: el panel se cerraba al hacer clic afuera o con Esc y
  // se perdía todo lo editado sin aviso (el botón Guardar está al final).
  const edtCambiado = (idx: number) => JSON.stringify(items[idx]) !== JSON.stringify(guardado[idx])
  const hayCambios = foco != null ? edtCambiado(foco) : JSON.stringify(items) !== JSON.stringify(guardado)
  const actividadCambiada = (edtIdx: number, subIdx: number) =>
    JSON.stringify(items[edtIdx]?.subItems?.[subIdx]) !== JSON.stringify(guardado[edtIdx]?.subItems?.[subIdx])

  // Las viñetas agregadas a mano se validan antes de guardar (el servidor
  // rechaza una viñeta vacía y el error no dice cuál es).
  const hayTareaManualVacia = (edts: PlanAlcanceDetalladoEdt[]) =>
    edts.some(e => (e.subItems ?? []).some(s => (s.tareas ?? []).some(t => t.manualId && !t.texto.trim())))

  /**
   * Modo un EDT: pone ese EDT sobre el alcance que está guardado AHORA en el
   * servidor (no sobre la copia de cuando se abrió el panel), así no se pisa
   * lo que otra persona haya guardado mientras tanto en otros EDTs.
   */
  const fusionarConServidor = async (edt: PlanAlcanceDetalladoEdt, idx: number): Promise<PlanAlcanceDetalladoEdt[]> => {
    const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/contexto`)
    if (!res.ok) throw new Error(`no se pudo leer el plan actual (HTTP ${res.status})`)
    const { data } = await res.json()
    const actual = ((data?.planTrabajo?.alcanceDetallado ?? []) as PlanAlcanceDetalladoEdt[])
    const pos = edt.edtRefId
      ? actual.findIndex(e => e.edtRefId === edt.edtRefId)
      : (idx < actual.length && !actual[idx].edtRefId ? idx : -1)
    if (pos < 0) throw new Error('este EDT ya no está en el plan guardado (se quitó o se regeneró el alcance). Recargá la página.')
    const copia = [...actual]
    copia[pos] = edt
    return copia
  }

  const irAEdt = (idx: number) => {
    setAbiertos(prev => (prev.includes(String(idx)) ? prev : [...prev, String(idx)]))
    setTimeout(() => document.getElementById(`alcance-edt-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // Guarda SOLO esta actividad: la copia sobre lo ya guardado y manda todo el
  // alcance (el PATCH es por sección). Si la estructura del EDT cambió
  // (actividades agregadas/quitadas/movidas), se guarda el EDT completo.
  const guardarActividad = async (edtIdx: number, subIdx: number) => {
    const local = items[edtIdx]
    const base = guardado[edtIdx]
    const idsActividades = (e: PlanAlcanceDetalladoEdt) => JSON.stringify((e.subItems ?? []).map(s => s.actividadRefId ?? ''))
    const mismaEstructura =
      base && base.edtRefId === local.edtRefId && idsActividades(base) === idsActividades(local)
    const nuevo = [...guardado]
    if (mismaEstructura) {
      nuevo[edtIdx] = { ...base, subItems: (base.subItems ?? []).map((s, i) => (i === subIdx ? local.subItems![subIdx] : s)) }
    } else {
      nuevo[edtIdx] = local
    }
    if (hayTareaManualVacia(nuevo)) {
      toast.error('Hay una tarea agregada a mano sin texto: escríbela o quítala')
      return
    }
    setGuardandoActividad(`${edtIdx}-${subIdx}`)
    try {
      await onGuardarParcial(foco != null ? await fusionarConServidor(nuevo[edtIdx], edtIdx) : nuevo)
      setGuardado(nuevo)
      toast.success(`Actividad guardada${mismaEstructura ? '' : ' (con su EDT)'}`)
    } catch (e) {
      toast.error(`No se pudo guardar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    } finally {
      setGuardandoActividad(null)
    }
  }

  const cerrar = () => {
    if (hayCambios && !window.confirm('Tenés cambios sin guardar en el Alcance Detallado. ¿Cerrar y descartarlos?')) return
    onCancel()
  }

  // Refs a cada instancia de galería (una por tarea/subItem/EDT) — el popover
  // de "Foto sugerida" (Prioridad 2) dispara subir/elegir-de-biblioteca de la
  // galería correspondiente sin duplicar esa lógica.
  const galeriaRefs = useRef(new Map<string, GaleriaImagenesAlcanceHandle | null>())

  // Nombres de equipos/herramientas/materiales del plan — señal de contexto para
  // sugerir imágenes del catálogo global en cada galería (Bloque 4.2, Tarea 6).
  const textosHerramientas = [
    ...herramientasYEquipos.equipos,
    ...herramientasYEquipos.herramientas,
    ...herramientasYEquipos.materiales,
  ].map(h => h.nombre)

  // "Confirmar todas" / "Quitar todas" las sugerencias de imagen de IA de un
  // EDT completo (Bloque 4.2 sesión 4) — reutiliza los mismos endpoints que
  // cada imagen individual, en paralelo.
  const confirmarTodasSugeridas = async (edtRefId: string) => {
    const pendientes = imagenes.filter(img => img.edtRef === edtRefId && img.origen === 'IA_AUTO')
    await Promise.all(pendientes.map(img =>
      fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen: 'CONFIRMADA' }),
      })
    ))
    await onImagenesChanged()
  }

  const quitarTodasSugeridas = async (edtRefId: string) => {
    const pendientes = imagenes.filter(img => img.edtRef === edtRefId && img.origen === 'IA_AUTO')
    await Promise.all(pendientes.map(img =>
      fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.id}`, { method: 'DELETE' })
    ))
    await onImagenesChanged()
  }

  const updateItem = (idx: number, patch: Partial<PlanAlcanceDetalladoEdt>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  // Regenerar SOLO un EDT (Bloque 4.2 sesión 5) — reemplaza únicamente ese
  // EDT en el estado local por el que devolvió el servidor; los demás EDTs
  // (incluidas sus ediciones locales sin guardar) no se tocan.
  const handleEdtRegenerado = (edtFresco: PlanAlcanceDetalladoEdt) => {
    setItems(prev => prev.map(it => it.edtRefId === edtFresco.edtRefId ? edtFresco : it))
    // El servidor ya lo guardó al regenerar.
    setGuardado(prev => prev.map(it => it.edtRefId === edtFresco.edtRefId ? edtFresco : it))
  }

  const marcarDescripcionEditada = (edtIdx: number, texto: string) =>
    updateItem(edtIdx, { descripcion: texto, descripcionEditadaManualmente: true })
  const liberarDescripcionEdt = (edtIdx: number) => updateItem(edtIdx, { descripcionEditadaManualmente: false })

  const addEdt = () => setItems(prev => [...prev, edtVacio()])

  const removeEdt = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const addSubItem = (edtIdx: number) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = it.subItems ?? []
      return { ...it, subItems: [...subs, subItemVacio(it.numeracion, subs.length)] }
    }))

  const updateSubItem = (edtIdx: number, subIdx: number, patch: Partial<PlanAlcanceDetalladoSubItem>) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = (it.subItems ?? []).map((s, si) => si === subIdx ? { ...s, ...patch } : s)
      return { ...it, subItems: subs }
    }))

  const marcarDescripcionSubItemEditada = (edtIdx: number, subIdx: number, texto: string) =>
    updateSubItem(edtIdx, subIdx, { descripcion: texto, descripcionEditadaManualmente: true })
  const liberarDescripcionSubItem = (edtIdx: number, subIdx: number) =>
    updateSubItem(edtIdx, subIdx, { descripcionEditadaManualmente: false })

  const removeSubItem = (edtIdx: number, subIdx: number) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      return { ...it, subItems: (it.subItems ?? []).filter((_, si) => si !== subIdx) }
    }))

  // Mueve una actividad dentro de su EDT. Entre dos actividades del cronograma
  // se intercambia también la numeración, así queda correlativa (11.5.1, 11.5.2…).
  const moverActividad = (edtIdx: number, subIdx: number, direccion: -1 | 1) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = [...(it.subItems ?? [])]
      const otroIdx = subIdx + direccion
      if (otroIdx < 0 || otroIdx >= subs.length) return it
      let a = subs[subIdx]
      let b = subs[otroIdx]
      if (a.actividadRefId && b.actividadRefId) {
        ;[a, b] = [{ ...a, numeracion: b.numeracion }, { ...b, numeracion: a.numeracion }]
      }
      subs[subIdx] = b
      subs[otroIdx] = a
      return { ...it, subItems: subs }
    }))

  // Viñetas de tareas (Bloque 4.2, Tarea 1) y fotoSugerida por tarea (Bloque
  // 4.2 sesión 2, Tarea 2) — el texto redactado por IA es corregible a mano.
  // Las tareas del cronograma vienen 1:1 (alcanceEstructura.ts) y solo se
  // ocultan; las agregadas a mano (manualId) sí se crean y se borran acá.
  const updateTarea = (edtIdx: number, subIdx: number, tareaIdx: number, patch: Partial<PlanAlcanceDetalladoTarea>) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = (it.subItems ?? []).map((s, si) => {
        if (si !== subIdx) return s
        const tareas = (s.tareas ?? []).map((t, ti) => ti === tareaIdx ? { ...t, ...patch } : t)
        return { ...s, tareas }
      })
      return { ...it, subItems: subs }
    }))

  // Borrado lógico del plan (Bloque 4.2 sesión 3) — NUNCA quita la tarea del
  // cronograma real, solo la oculta de este documento. Sobrevive a un
  // regenerar de sección (ver preservarEstadoManualTareas.ts) salvo que el
  // usuario la restaure explícitamente con "Restaurar".
  const excluirTarea = (edtIdx: number, subIdx: number, tareaIdx: number) =>
    updateTarea(edtIdx, subIdx, tareaIdx, { excluida: true })

  // Viñeta agregada a mano: va debajo de `despuesDe` (-1 = al inicio) y no
  // existe en el cronograma, así que no lleva imágenes propias.
  const agregarTarea = (edtIdx: number, subIdx: number, despuesDe: number) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = (it.subItems ?? []).map((s, si) => {
        if (si !== subIdx) return s
        const tareas = [...(s.tareas ?? [])]
        tareas.splice(despuesDe + 1, 0, { manualId: crypto.randomUUID(), nombre: '', texto: '', textoEditadoManualmente: true })
        return { ...s, tareas }
      })
      return { ...it, subItems: subs }
    }))

  const quitarTareaManual = (edtIdx: number, subIdx: number, tareaIdx: number) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = (it.subItems ?? []).map((s, si) =>
        si === subIdx ? { ...s, tareas: (s.tareas ?? []).filter((_, ti) => ti !== tareaIdx) } : s
      )
      return { ...it, subItems: subs }
    }))

  const restaurarTarea = (edtIdx: number, subIdx: number, tareaIdx: number) =>
    updateTarea(edtIdx, subIdx, tareaIdx, { excluida: false })

  // Protección de texto editado a mano (Bloque 4.2 sesión 5) — una regeneración
  // posterior preserva por defecto cualquier viñeta marcada así (ver
  // aplicarAlcanceDeRegeneracion.ts); "Liberar" la deja disponible de nuevo
  // para que la IA la reescriba, sin cambiar el texto actual.
  const marcarTextoTareaEditado = (edtIdx: number, subIdx: number, tareaIdx: number, texto: string) =>
    updateTarea(edtIdx, subIdx, tareaIdx, { texto, textoEditadoManualmente: true })
  const liberarTextoTarea = (edtIdx: number, subIdx: number, tareaIdx: number) =>
    updateTarea(edtIdx, subIdx, tareaIdx, { textoEditadoManualmente: false })

  // Reordena viñetas — el orden del cronograma no siempre es el orden
  // narrativo deseado. Salta tareas ocultas (excluida) al buscar el vecino,
  // así las flechas siempre mueven la tarea respecto de la siguiente VISIBLE.
  const moverTarea = (edtIdx: number, subIdx: number, tareaIdx: number, direccion: -1 | 1) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== edtIdx) return it
      const subs = (it.subItems ?? []).map((s, si) => {
        if (si !== subIdx) return s
        const tareas = [...(s.tareas ?? [])]
        let otroIdx = tareaIdx + direccion
        while (otroIdx >= 0 && otroIdx < tareas.length && tareas[otroIdx].excluida) {
          otroIdx += direccion
        }
        if (otroIdx < 0 || otroIdx >= tareas.length) return s
        ;[tareas[tareaIdx], tareas[otroIdx]] = [tareas[otroIdx], tareas[tareaIdx]]
        return { ...s, tareas }
      })
      return { ...it, subItems: subs }
    }))

  const handleSave = async () => {
    if (hayTareaManualVacia(foco != null ? [items[foco]] : items)) {
      toast.error('Hay una tarea agregada a mano sin texto: escríbela o quítala')
      return
    }
    setSaving(true)
    try {
      if (foco != null) {
        await onSave(await fusionarConServidor(items[foco], foco))
        toast.success(`${items[foco].edtNombre || 'EDT'} guardado`)
        return
      }
      await onSave(items)
      toast.success('Alcance Detallado guardado')
    } catch (e) {
      // Antes el error se tragaba: parecía guardado y al cerrar se perdía.
      toast.error(`No se pudo guardar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && cerrar()}>
      <SheetContent
        side="right"
        // Pantalla completa: con tareas, viñetas e imágenes lado a lado el panel angosto se leía mal.
        className="w-screen sm:max-w-none overflow-y-auto bg-slate-50 p-3 sm:p-6"
        // Solo se cierra con Cancelar, la X o Esc: un clic afuera (o en el
        // diálogo de biblioteca/subida de imágenes) lo cerraba y se perdía lo editado.
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-8">
            {foco != null
              ? <span>Editar {items[foco].numeracion} {items[foco].edtNombre || '(sin nombre)'}</span>
              : <span>Editar Alcance Detallado</span>}
            {foco != null && items.length > 1 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-normal"
                title="Ver y editar todos los EDTs (al guardar se guarda todo el alcance)"
                onClick={() => { setFoco(null); irAEdt(foco) }}
              >
                Ver todo el alcance
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mx-auto mt-4 max-w-[1600px] space-y-3">
          {/* Índice: con muchos EDTs había que bajar mucho para llegar a uno.
              Todo arranca cerrado; un chip abre ese EDT y salta a él. */}
          {foco == null && items.length > 1 && (
            <div className="sticky -top-3 z-20 -mx-3 border-b bg-slate-50/95 px-3 py-2 backdrop-blur sm:-top-6 sm:-mx-6 sm:px-6">
              <div className="flex flex-wrap items-center gap-1.5">
                {items.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => irAEdt(idx)}
                    title={it.edtNombre}
                    className={`max-w-[14rem] truncate rounded-full border px-2 py-0.5 text-[11px] transition-colors hover:border-indigo-400 hover:bg-indigo-50 ${
                      abiertos.includes(String(idx)) ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'bg-white text-gray-700'
                    }`}
                  >
                    <span className="font-mono text-muted-foreground">{it.numeracion || '–'}</span>{' '}
                    {it.edtNombre || '(sin nombre)'}
                    {edtCambiado(idx) && <span className="ml-1 text-amber-600" title="Con cambios sin guardar">●</span>}
                  </button>
                ))}
                <span className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setAbiertos(items.map((_, i) => String(i)))}>
                    Abrir todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setAbiertos([])}>
                    Cerrar todos
                  </Button>
                </span>
              </div>
            </div>
          )}
          <Accordion
            type="multiple"
            className="space-y-2"
            value={abiertos}
            onValueChange={setAbiertos}
          >
            {items.map((item, edtIdx) => {
              if (foco != null && edtIdx !== foco) return null
              const estado = contarEstadoEdt(item, imagenes)
              return (
              <AccordionItem key={edtIdx} id={`alcance-edt-${edtIdx}`} value={String(edtIdx)} className="scroll-mt-14 border rounded-lg px-2 sm:px-4 bg-white shadow-sm">
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{item.numeracion || '–'}</span>
                    <span className="text-sm font-medium truncate">
                      {item.faseAbreviatura ? `${item.faseAbreviatura} · ` : ''}{item.edtNombre || '(sin nombre)'}
                    </span>
                    {item.tipoDetalle === 'detallado' && (
                      <div className="flex items-center gap-1 ml-auto mr-2 shrink-0">
                        {estado.tareas > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                            <ListChecks size={10} /> {estado.tareas}
                          </Badge>
                        )}
                        {estado.imagenes > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                            <ImageIcon size={10} /> {estado.imagenes}
                          </Badge>
                        )}
                        {estado.fotosPendientes > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal text-amber-700 border-amber-300 bg-amber-50">
                            <Camera size={10} /> {estado.fotosPendientes}
                          </Badge>
                        )}
                        {estado.sugeridasIA > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal text-indigo-700 border-indigo-300 bg-indigo-50">
                            <Sparkles size={10} /> {estado.sugeridasIA}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-3">
                  {/* Identificación — de solo lectura cuando viene del cronograma real
                      (item.edtRefId): numeración/código/fase/nombre NO se editan acá.
                      Un EDT agregado a mano ("Agregar EDT", sin edtRefId) sigue 100% editable. */}
                  {item.edtRefId ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground bg-gray-50 border rounded-md px-3 py-2">
                      <span><span className="text-gray-400">N°</span> <span className="font-mono text-gray-700">{item.numeracion}</span></span>
                      <span><span className="text-gray-400">Código</span> <span className="font-mono text-gray-700">{item.edtCodigo}</span></span>
                      <span><span className="text-gray-400">Fase</span> <span className="text-gray-700">{item.faseNombre} ({item.faseAbreviatura})</span></span>
                      <span className="text-gray-700 font-medium">{item.edtNombre}</span>
                      <RegenerarEdtDialog
                        proyectoId={proyectoId}
                        edtRefId={item.edtRefId}
                        nombreEdt={item.edtNombre}
                        onRegenerado={handleEdtRegenerado}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">N° (11.1)</Label>
                          <Input value={item.numeracion} onChange={e => updateItem(edtIdx, { numeracion: e.target.value })} className="h-8 text-sm" placeholder="11.1" />
                        </div>
                        <div>
                          <Label className="text-xs">Código EDT</Label>
                          <Input value={item.edtCodigo} onChange={e => updateItem(edtIdx, { edtCodigo: e.target.value })} className="h-8 text-sm" placeholder="CON" />
                        </div>
                        <div>
                          <Label className="text-xs">Abrev. Fase</Label>
                          <Input value={item.faseAbreviatura} onChange={e => updateItem(edtIdx, { faseAbreviatura: e.target.value })} className="h-8 text-sm" placeholder="EJEC" />
                        </div>
                      </div>
                    </>
                  )}
                  {item.edtRefId && <DelCronogramaPanel contexto={contexto} edtRefId={item.edtRefId} />}
                  {item.edtRefId && estado.sugeridasIA > 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                      <Sparkles size={12} className="shrink-0" />
                      <span className="flex-1">{estado.sugeridasIA} imagen{estado.sugeridasIA > 1 ? 'es' : ''} sugerida{estado.sugeridasIA > 1 ? 's' : ''} por IA pendiente{estado.sugeridasIA > 1 ? 's' : ''} de revisión</span>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-white" onClick={() => confirmarTodasSugeridas(item.edtRefId!)}>
                        Confirmar todas
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-white text-red-600" onClick={() => quitarTodasSugeridas(item.edtRefId!)}>
                        Quitar todas
                      </Button>
                    </div>
                  )}
                  {!item.edtRefId && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Nombre EDT</Label>
                          <Input value={item.edtNombre} onChange={e => updateItem(edtIdx, { edtNombre: e.target.value })} className="h-8 text-sm" placeholder="Construcción" />
                        </div>
                        <div>
                          <Label className="text-xs">Fase</Label>
                          <Input value={item.faseNombre} onChange={e => updateItem(edtIdx, { faseNombre: e.target.value })} className="h-8 text-sm" placeholder="EJECUCIÓN" />
                        </div>
                      </div>
                    </>
                  )}
                  {item.tipoDetalle === 'detallado' && (item.personalRequerido ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground shrink-0">Personal requerido:</span>
                      {item.personalRequerido!.map((p, pi) => (
                        <Badge key={pi} variant="outline" className="text-[10px] font-normal">
                          {p.cantidad}× {p.cargo}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Ubicación (opcional)</Label>
                      <Input value={item.ubicacion ?? ''} onChange={e => updateItem(edtIdx, { ubicacion: e.target.value })} className="h-8 text-sm" placeholder="Ej: Nave principal — Nivel 3" />
                    </div>
                    <div>
                      <Label className="text-xs">Nivel de detalle</Label>
                      <select
                        value={item.tipoDetalle}
                        onChange={e => updateItem(edtIdx, { tipoDetalle: e.target.value as 'detallado' | 'resumido' })}
                        className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                      >
                        <option value="resumido">Resumido (Planificación/Ingeniería/Procura/Cierre)</option>
                        <option value="detallado">Detallado (Ejecución — admite imágenes)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Label className="text-xs">Descripción narrativa</Label>
                      {item.descripcionEditadaManualmente && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-800"
                          title="Editado a mano — se conservará al regenerar este EDT"
                          onClick={() => liberarDescripcionEdt(edtIdx)}
                        >
                          <Lock size={10} /> Editado a mano · <span className="underline">Liberar</span>
                        </button>
                      )}
                      <BotonCopiarParaIA
                        className="ml-auto"
                        obtenerTexto={() => construirTextoParaIa({ contexto, item: items[edtIdx], objetivo: { tipo: 'edt' } })}
                      />
                      <CopiarPegarTexto
                        texto={item.descripcion}
                        onPegar={(t) => marcarDescripcionEditada(edtIdx, t)}
                      />
                    </div>
                    <Textarea value={item.descripcion} onChange={e => marcarDescripcionEditada(edtIdx, e.target.value)} rows={4} className="text-sm resize-none" placeholder="Párrafo narrativo de 80-150 palabras describiendo el flujo de trabajo..." />
                  </div>

                  {item.tipoDetalle === 'detallado' && item.edtRefId && (
                    <GaleriaImagenesAlcance
                      proyectoId={proyectoId}
                      edtRef={item.edtRefId}
                      nombreDefault={item.edtNombre}
                      textosContexto={textosHerramientas}
                      imagenes={imagenes}
                      onChanged={onImagenesChanged}
                      titulo="Imágenes del EDT"
                    />
                  )}

                  {/* SubItems */}
                  {(item.subItems ?? []).length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Actividades</p>
                      {(item.subItems ?? []).map((sub, subIdx) => {
                        const claveGaleriaSub = `subitem:${sub.actividadRefId ?? `${edtIdx}-${subIdx}`}`
                        const conGaleriaSub = item.tipoDetalle === 'detallado' && Boolean(sub.actividadRefId)
                        const imagenesDelSubItem = imagenes.filter(
                          img => img.edtRef === (item.edtRefId ?? '') && !img.tareaRef && (img.subItemRef ?? undefined) === sub.actividadRefId
                        )
                        return (
                        // Tres niveles a la vista: EDT (tarjeta blanca) › actividad (banda
                        // índigo + fondo tenue) › tareas (bandeja gris con tarjetas blancas).
                        <div key={subIdx} className="overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50/50 shadow-sm">
                          <div className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-100 px-3 py-2">
                            {sub.actividadRefId ? (
                              <span className="text-sm flex-1 min-w-0 truncate">
                                <span className="font-mono text-indigo-500">{sub.numeracion}</span>{' '}
                                <span className="text-indigo-950 font-semibold">{sub.actividadNombre}</span>
                              </span>
                            ) : (
                              <>
                                <Input value={sub.numeracion} onChange={e => updateSubItem(edtIdx, subIdx, { numeracion: e.target.value })} className="h-7 text-xs w-20 font-mono" placeholder="11.1.1" />
                                <Input value={sub.actividadNombre} onChange={e => updateSubItem(edtIdx, subIdx, { actividadNombre: e.target.value })} className="h-7 text-xs flex-1" placeholder="Nombre de la actividad" />
                              </>
                            )}
                            {item.tipoDetalle === 'detallado' && (
                              <HintFotoSugerida
                                value={sub.fotoSugerida ?? ''}
                                editable
                                activo={Boolean(sub.fotoSugerida) && imagenesDelSubItem.length === 0}
                                onChange={v => updateSubItem(edtIdx, subIdx, { fotoSugerida: v })}
                                onSubir={() => galeriaRefs.current.get(claveGaleriaSub)?.abrirSelectorArchivo()}
                                onElegirBiblioteca={() => galeriaRefs.current.get(claveGaleriaSub)?.abrirPicker()}
                              />
                            )}
                            {actividadCambiada(edtIdx, subIdx) && (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-xs shrink-0"
                                disabled={guardandoActividad !== null || saving}
                                onClick={() => guardarActividad(edtIdx, subIdx)}
                              >
                                <Save size={12} className="mr-1" />
                                {guardandoActividad === `${edtIdx}-${subIdx}` ? 'Guardando…' : 'Guardar actividad'}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Subir actividad" disabled={subIdx === 0} onClick={() => moverActividad(edtIdx, subIdx, -1)}>
                              <ChevronUp size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bajar actividad" disabled={subIdx === (item.subItems ?? []).length - 1} onClick={() => moverActividad(edtIdx, subIdx, 1)}>
                              <ChevronDown size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeSubItem(edtIdx, subIdx)}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                          <div className="space-y-3 p-2 sm:p-3">
                          {/* Descripción e imágenes lado a lado, igual que en las tareas:
                              la galería al final del bloque quedaba después de todas las
                              tareas y no se leía como parte de la actividad. */}
                          <div className={conGaleriaSub ? 'grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}>
                          <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {sub.descripcionEditadaManualmente && (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-800"
                              title="Editado a mano — se conservará al regenerar este EDT"
                              onClick={() => liberarDescripcionSubItem(edtIdx, subIdx)}
                            >
                              <Lock size={10} /> Editado a mano · <span className="underline">Liberar</span>
                            </button>
                          )}
                          <BotonCopiarParaIA
                            className="ml-auto"
                            obtenerTexto={() => construirTextoParaIa({ contexto, item: items[edtIdx], objetivo: { tipo: 'actividad', si: subIdx } })}
                          />
                          <CopiarPegarTexto
                            texto={sub.descripcion}
                            onPegar={(t) => marcarDescripcionSubItemEditada(edtIdx, subIdx, t)}
                          />
                          </div>
                          <Textarea value={sub.descripcion} onChange={e => marcarDescripcionSubItemEditada(edtIdx, subIdx, e.target.value)} rows={3} className="text-sm resize-none bg-white" placeholder="Descripción narrativa de la actividad..." />
                          </div>
                          {conGaleriaSub && (
                            <div className="min-w-0">
                              <GaleriaImagenesAlcance
                                compacta
                                ref={el => { galeriaRefs.current.set(claveGaleriaSub, el) }}
                                proyectoId={proyectoId}
                                edtRef={item.edtRefId ?? ''}
                                subItemRef={sub.actividadRefId!}
                                nombreDefault={sub.actividadNombre}
                                textosContexto={[...textosHerramientas, ...(sub.tareas ?? []).map(t => t.texto || t.nombre)]}
                                imagenes={imagenes}
                                onChanged={onImagenesChanged}
                                titulo="Imágenes de la actividad"
                              />
                            </div>
                          )}
                          </div>

                          {(sub.tareas ?? []).length > 0 && (() => {
                            const conIndice = (sub.tareas ?? []).map((tarea, tareaIdx) => ({ tarea, tareaIdx }))
                            const visibles = conIndice.filter(x => !x.tarea.excluida)
                            const ocultas = conIndice.filter(x => x.tarea.excluida)
                            return (
                              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-100 p-2">
                                <p className="px-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Tareas</p>
                                {visibles.map(({ tarea, tareaIdx }, posVisible) => {
                                  const imagenesDeLaTarea = imagenes.filter(
                                    img => img.edtRef === (item.edtRefId ?? '') && img.tareaRef === tarea.tareaRefId
                                  )
                                  const claveGaleria = `tarea:${tarea.tareaRefId ?? `${edtIdx}-${subIdx}-${tareaIdx}`}`
                                  const conGaleria = item.tipoDetalle === 'detallado' && Boolean(tarea.tareaRefId)
                                  return (
                                    <div
                                      key={tarea.tareaRefId ?? tarea.manualId ?? tareaIdx}
                                      className={`rounded-md border p-2 shadow-sm sm:p-3 ${tarea.manualId ? 'bg-sky-50 border-dashed border-sky-300' : 'bg-white border-slate-200'} ${conGaleria ? 'grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}
                                    >
                                      {/* En celular los botones bajan a su propia fila: al lado del
                                          texto lo dejaban en una columna de una palabra por línea. */}
                                      <div className="flex flex-wrap items-start gap-2 min-w-0 sm:flex-nowrap">
                                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                                          {posVisible + 1}
                                        </span>
                                        <div className="min-w-0 flex-1 basis-[calc(100%-1.75rem)] space-y-1 sm:basis-0">
                                          {/* Nombre de la tarea en el cronograma: la viñeta es la redacción para el documento. */}
                                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                            {tarea.manualId ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] font-normal text-sky-700 border-sky-300 bg-white"
                                                title="Agregada a mano en el plan: no existe en el cronograma (no suma horas ni admite imágenes propias)"
                                              >
                                                Tarea manual
                                              </Badge>
                                            ) : (
                                              <span className="font-medium text-gray-600">{tarea.nombre}</span>
                                            )}
                                            {!tarea.manualId && tarea.textoEditadoManualmente && (
                                              <button
                                                type="button"
                                                className="flex items-center gap-0.5 text-amber-700 hover:text-amber-800"
                                                title="Editado a mano — se conservará al regenerar. Click para liberar."
                                                onClick={() => liberarTextoTarea(edtIdx, subIdx, tareaIdx)}
                                              >
                                                <Lock size={10} /> editado
                                              </button>
                                            )}
                                            <BotonCopiarParaIA
                                              className="ml-auto"
                                              obtenerTexto={() => construirTextoParaIa({ contexto, item: items[edtIdx], objetivo: { tipo: 'tarea', si: subIdx, ti: tareaIdx } })}
                                            />
                                            <CopiarPegarTexto
                                              unaLinea
                                              texto={tarea.texto || tarea.nombre}
                                              onPegar={(t) => tarea.manualId
                                                ? updateTarea(edtIdx, subIdx, tareaIdx, { texto: t, nombre: t })
                                                : marcarTextoTareaEditado(edtIdx, subIdx, tareaIdx, t)}
                                            />
                                          </div>
                                          <Textarea
                                            value={tarea.texto}
                                            onChange={e => tarea.manualId
                                              ? updateTarea(edtIdx, subIdx, tareaIdx, { texto: e.target.value, nombre: e.target.value.trim() })
                                              : marcarTextoTareaEditado(edtIdx, subIdx, tareaIdx, e.target.value)}
                                            rows={2}
                                            className="text-sm leading-relaxed resize-none min-h-0 py-1.5"
                                            placeholder={tarea.manualId ? 'Ej: Pase de piso con pasamuro y transición' : tarea.nombre}
                                            autoFocus={Boolean(tarea.manualId) && !tarea.texto}
                                          />
                                        </div>
                                        <div className="ml-auto flex shrink-0 items-center">
                                        {item.tipoDetalle === 'detallado' && !tarea.manualId && (
                                          <div className="shrink-0">
                                            <HintFotoSugerida
                                              value={tarea.fotoSugerida ?? ''}
                                              editable
                                              activo={Boolean(tarea.fotoSugerida) && imagenesDeLaTarea.length === 0}
                                              onChange={v => updateTarea(edtIdx, subIdx, tareaIdx, { fotoSugerida: v })}
                                              onSubir={() => galeriaRefs.current.get(claveGaleria)?.abrirSelectorArchivo()}
                                              onElegirBiblioteca={() => galeriaRefs.current.get(claveGaleria)?.abrirPicker()}
                                            />
                                          </div>
                                        )}
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Subir tarea" disabled={posVisible === 0} onClick={() => moverTarea(edtIdx, subIdx, tareaIdx, -1)}>
                                            <ChevronUp size={14} />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bajar tarea" disabled={posVisible === visibles.length - 1} onClick={() => moverTarea(edtIdx, subIdx, tareaIdx, 1)}>
                                            <ChevronDown size={14} />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-sky-700" title="Agregar tarea debajo" onClick={() => agregarTarea(edtIdx, subIdx, tareaIdx)}>
                                            <Plus size={14} />
                                          </Button>
                                          {tarea.manualId ? (
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Eliminar tarea agregada a mano" onClick={() => quitarTareaManual(edtIdx, subIdx, tareaIdx)}>
                                              <Trash2 size={14} />
                                            </Button>
                                          ) : (
                                            <DeleteAlertDialog
                                              title="¿Quitar esta tarea del plan?"
                                              description="Se oculta de este documento (viñeta, imágenes y foto sugerida). El cronograma real del proyecto NO se modifica — podés restaurarla luego desde 'tareas ocultas'."
                                              onConfirm={() => excluirTarea(edtIdx, subIdx, tareaIdx)}
                                              trigger={
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Quitar del plan">
                                                  <Trash2 size={14} />
                                                </Button>
                                              }
                                            />
                                          )}
                                        </div>
                                      </div>
                                      {conGaleria && tarea.tareaRefId && (
                                        <div className="min-w-0">
                                          <GaleriaImagenesAlcance
                                            compacta
                                            titulo="Imágenes de la tarea"
                                            ref={el => { galeriaRefs.current.set(claveGaleria, el) }}
                                            proyectoId={proyectoId}
                                            edtRef={item.edtRefId ?? ''}
                                            tareaRef={tarea.tareaRefId}
                                            nombreDefault={tarea.nombre}
                                            textosContexto={[...textosHerramientas, tarea.texto, tarea.nombre]}
                                            imagenes={imagenes}
                                            onChanged={onImagenesChanged}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                                {ocultas.length > 0 && (
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground">
                                        <EyeOff size={11} className="mr-1" /> {ocultas.length} tarea{ocultas.length > 1 ? 's' : ''} oculta{ocultas.length > 1 ? 's' : ''}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1 pl-1 pt-1">
                                      {ocultas.map(({ tarea, tareaIdx }) => (
                                        <div key={tarea.tareaRefId ?? tareaIdx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          <span className="line-through truncate flex-1">{tarea.texto || tarea.nombre}</span>
                                          <Button variant="outline" size="sm" className="h-5 text-[10px] px-1.5 shrink-0" onClick={() => restaurarTarea(edtIdx, subIdx, tareaIdx)}>
                                            Restaurar
                                          </Button>
                                        </div>
                                      ))}
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </div>
                            )
                          })()}

                          {item.tipoDetalle === 'detallado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-sky-700"
                              onClick={() => agregarTarea(edtIdx, subIdx, (sub.tareas ?? []).length - 1)}
                            >
                              <Plus size={11} className="mr-1" /> Agregar tarea
                            </Button>
                          )}

                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addSubItem(edtIdx)}>
                      <PlusCircle size={12} className="mr-1" /> Agregar actividad
                    </Button>
                    {/* Quitar un EDT cambia los índices de todo el alcance: solo desde la edición completa. */}
                    {foco == null && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => removeEdt(edtIdx)}>
                        <Trash2 size={12} className="mr-1" /> Eliminar EDT
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              )
            })}
          </Accordion>

          {foco == null && (
            <Button variant="outline" className="w-full" onClick={addEdt}>
              <Plus size={14} className="mr-1" /> Agregar EDT
            </Button>
          )}

          {/* Fija abajo: el panel es largo y el botón quedaba fuera de vista. */}
          <div className="sticky bottom-0 z-10 -mx-3 -mb-3 flex items-center justify-end gap-2 border-t bg-background px-3 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
            {hayCambios && <span className="mr-auto text-xs text-amber-600">Cambios sin guardar</span>}
            <Button variant="outline" onClick={cerrar} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !hayCambios}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
