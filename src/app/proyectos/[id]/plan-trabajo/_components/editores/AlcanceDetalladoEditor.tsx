'use client'

import { useRef, useState } from 'react'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceDetalladoSubItem, PlanAlcanceDetalladoTarea } from '@/types/planTrabajo'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, PlusCircle, ChevronUp, ChevronDown, EyeOff, ListChecks, ImageIcon, Camera, Sparkles, Lock } from 'lucide-react'
import { GaleriaImagenesAlcance, type GaleriaImagenesAlcanceHandle } from './GaleriaImagenesAlcance'
import { HintFotoSugerida } from '@/components/catalogoImagenes/HintFotoSugerida'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { RegenerarEdtDialog } from './RegenerarEdtDialog'
import type { PlanTrabajoImagen } from '@prisma/client'
import type { PlanHerramientasYEquipos } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  valor: PlanAlcanceDetalladoEdt[]
  /** Nombres de equipos/herramientas/materiales del plan — señal para sugerir imágenes del catálogo global (Bloque 4.2, Tarea 6). */
  herramientasYEquipos: PlanHerramientasYEquipos
  imagenes: PlanTrabajoImagen[]
  onImagenesChanged: () => Promise<void>
  onSave: (v: PlanAlcanceDetalladoEdt[]) => Promise<void>
  onCancel: () => void
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

export function AlcanceDetalladoEditor({ proyectoId, valor, herramientasYEquipos, imagenes, onImagenesChanged, onSave, onCancel }: Props) {
  const [items, setItems] = useState<PlanAlcanceDetalladoEdt[]>(
    valor.length > 0 ? valor : [edtVacio()]
  )
  const [saving, setSaving] = useState(false)

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
  const handleEdtRegenerado = (edtFresco: PlanAlcanceDetalladoEdt) =>
    setItems(prev => prev.map(it => it.edtRefId === edtFresco.edtRefId ? edtFresco : it))

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

  // Viñetas de tareas (Bloque 4.2, Tarea 1) y fotoSugerida por tarea (Bloque
  // 4.2 sesión 2, Tarea 2) — el texto redactado por IA es corregible a mano;
  // nunca se agregan/quitan tareas acá (vienen 1:1 del cronograma real, ver
  // alcanceEstructura.ts).
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
    setSaving(true)
    try { await onSave(items) } finally { setSaving(false) }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Alcance Detallado</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {/* Colapsado por defecto lo 'resumido' (Planificación/Ingeniería/Procura/Cierre);
              expandido lo 'detallado' (Ejecución) — es donde hay más que revisar (Prioridad 4). */}
          <Accordion
            type="multiple"
            className="space-y-2"
            defaultValue={items.map((it, idx) => ({ it, idx })).filter(x => x.it.tipoDetalle === 'detallado').map(x => String(x.idx))}
          >
            {items.map((item, edtIdx) => {
              const estado = contarEstadoEdt(item, imagenes)
              return (
              <AccordionItem key={edtIdx} value={String(edtIdx)} className="border rounded-lg px-3">
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
                  <div>
                    <div className="flex items-center justify-between">
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
                    />
                  )}

                  {/* SubItems */}
                  {(item.subItems ?? []).length > 0 && (
                    <div className="space-y-2 border-l-2 border-indigo-100 pl-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actividades</p>
                      {(item.subItems ?? []).map((sub, subIdx) => {
                        const claveGaleriaSub = `subitem:${sub.actividadRefId ?? `${edtIdx}-${subIdx}`}`
                        const imagenesDelSubItem = imagenes.filter(
                          img => img.edtRef === (item.edtRefId ?? '') && !img.tareaRef && (img.subItemRef ?? undefined) === sub.actividadRefId
                        )
                        return (
                        <div key={subIdx} className="space-y-1.5 border border-l-4 border-l-indigo-300 rounded p-2 bg-gray-50">
                          <div className="flex items-center gap-2">
                            {sub.actividadRefId ? (
                              <span className="text-xs flex-1 min-w-0 truncate">
                                <span className="font-mono text-gray-400">{sub.numeracion}</span>{' '}
                                <span className="text-gray-700 font-medium">{sub.actividadNombre}</span>
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
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeSubItem(edtIdx, subIdx)}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
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
                          <Textarea value={sub.descripcion} onChange={e => marcarDescripcionSubItemEditada(edtIdx, subIdx, e.target.value)} rows={3} className="text-xs resize-none" placeholder="Descripción narrativa de la actividad..." />

                          {(sub.tareas ?? []).length > 0 && (() => {
                            const conIndice = (sub.tareas ?? []).map((tarea, tareaIdx) => ({ tarea, tareaIdx }))
                            const visibles = conIndice.filter(x => !x.tarea.excluida)
                            const ocultas = conIndice.filter(x => x.tarea.excluida)
                            return (
                              <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tareas</p>
                                {visibles.map(({ tarea, tareaIdx }, posVisible) => {
                                  const imagenesDeLaTarea = imagenes.filter(
                                    img => img.edtRef === (item.edtRefId ?? '') && img.tareaRef === tarea.tareaRefId
                                  )
                                  const claveGaleria = `tarea:${tarea.tareaRefId ?? `${edtIdx}-${subIdx}-${tareaIdx}`}`
                                  return (
                                    <div key={tarea.tareaRefId ?? tareaIdx} className="space-y-1">
                                      <div className="flex items-start gap-1">
                                        <span className="text-[10px] text-muted-foreground mt-1.5 shrink-0">•</span>
                                        <Textarea
                                          value={tarea.texto}
                                          onChange={e => marcarTextoTareaEditado(edtIdx, subIdx, tareaIdx, e.target.value)}
                                          rows={1}
                                          className="text-xs resize-none min-h-0 py-1"
                                          placeholder={tarea.nombre}
                                        />
                                        {tarea.textoEditadoManualmente && (
                                          <button
                                            type="button"
                                            className="flex items-center shrink-0 mt-1.5 text-amber-700 hover:text-amber-800"
                                            title="Editado a mano — se conservará al regenerar. Click para liberar."
                                            onClick={() => liberarTextoTarea(edtIdx, subIdx, tareaIdx)}
                                          >
                                            <Lock size={11} />
                                          </button>
                                        )}
                                        {item.tipoDetalle === 'detallado' && (
                                          <div className="mt-1.5 shrink-0">
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
                                        <div className="flex shrink-0 mt-0.5">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={posVisible === 0} onClick={() => moverTarea(edtIdx, subIdx, tareaIdx, -1)}>
                                            <ChevronUp size={14} />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={posVisible === visibles.length - 1} onClick={() => moverTarea(edtIdx, subIdx, tareaIdx, 1)}>
                                            <ChevronDown size={14} />
                                          </Button>
                                          <DeleteAlertDialog
                                            title="¿Quitar esta tarea del plan?"
                                            description="Se oculta de este documento (viñeta, imágenes y foto sugerida). El cronograma real del proyecto NO se modifica — podés restaurarla luego desde 'tareas ocultas'."
                                            onConfirm={() => excluirTarea(edtIdx, subIdx, tareaIdx)}
                                            trigger={
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                                                <Trash2 size={14} />
                                              </Button>
                                            }
                                          />
                                        </div>
                                      </div>
                                      {item.tipoDetalle === 'detallado' && tarea.tareaRefId && (
                                        <div className="pl-3">
                                          <GaleriaImagenesAlcance
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

                          {item.tipoDetalle === 'detallado' && sub.actividadRefId && (
                            <GaleriaImagenesAlcance
                              ref={el => { galeriaRefs.current.set(claveGaleriaSub, el) }}
                              proyectoId={proyectoId}
                              edtRef={item.edtRefId ?? ''}
                              subItemRef={sub.actividadRefId}
                              nombreDefault={sub.actividadNombre}
                              textosContexto={[...textosHerramientas, ...(sub.tareas ?? []).map(t => t.texto || t.nombre)]}
                              imagenes={imagenes}
                              onChanged={onImagenesChanged}
                            />
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addSubItem(edtIdx)}>
                      <PlusCircle size={12} className="mr-1" /> Agregar actividad
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => removeEdt(edtIdx)}>
                      <Trash2 size={12} className="mr-1" /> Eliminar EDT
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
              )
            })}
          </Accordion>

          <Button variant="outline" className="w-full" onClick={addEdt}>
            <Plus size={14} className="mr-1" /> Agregar EDT
          </Button>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
