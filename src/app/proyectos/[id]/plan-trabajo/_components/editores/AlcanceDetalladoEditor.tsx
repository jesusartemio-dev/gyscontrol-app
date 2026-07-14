'use client'

import { useState } from 'react'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceDetalladoSubItem, PlanAlcanceDetalladoTarea } from '@/types/planTrabajo'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, PlusCircle, Camera } from 'lucide-react'
import { GaleriaImagenesAlcance } from './GaleriaImagenesAlcance'
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

export function AlcanceDetalladoEditor({ proyectoId, valor, herramientasYEquipos, imagenes, onImagenesChanged, onSave, onCancel }: Props) {
  const [items, setItems] = useState<PlanAlcanceDetalladoEdt[]>(
    valor.length > 0 ? valor : [edtVacio()]
  )
  const [saving, setSaving] = useState(false)

  // Nombres de equipos/herramientas/materiales del plan — señal de contexto para
  // sugerir imágenes del catálogo global en cada galería (Bloque 4.2, Tarea 6).
  const textosHerramientas = [
    ...herramientasYEquipos.equipos,
    ...herramientasYEquipos.herramientas,
    ...herramientasYEquipos.materiales,
  ].map(h => h.nombre)

  const updateItem = (idx: number, patch: Partial<PlanAlcanceDetalladoEdt>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

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
          <Accordion type="multiple" className="space-y-2">
            {items.map((item, edtIdx) => (
              <AccordionItem key={edtIdx} value={String(edtIdx)} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-left min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{item.numeracion || '–'}</span>
                    <span className="text-sm font-medium truncate">
                      {item.faseAbreviatura ? `${item.faseAbreviatura} · ` : ''}{item.edtNombre || '(sin nombre)'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-3">
                  {/* Identificación */}
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
                    <Label className="text-xs">Descripción narrativa</Label>
                    <Textarea value={item.descripcion} onChange={e => updateItem(edtIdx, { descripcion: e.target.value })} rows={4} className="text-sm resize-none" placeholder="Párrafo narrativo de 80-150 palabras describiendo el flujo de trabajo..." />
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
                      {(item.subItems ?? []).map((sub, subIdx) => (
                        <div key={subIdx} className="space-y-1.5 border rounded p-2 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Input value={sub.numeracion} onChange={e => updateSubItem(edtIdx, subIdx, { numeracion: e.target.value })} className="h-7 text-xs w-20 font-mono" placeholder="11.1.1" />
                            <Input value={sub.actividadNombre} onChange={e => updateSubItem(edtIdx, subIdx, { actividadNombre: e.target.value })} className="h-7 text-xs flex-1" placeholder="Nombre de la actividad" />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeSubItem(edtIdx, subIdx)}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                          <Textarea value={sub.descripcion} onChange={e => updateSubItem(edtIdx, subIdx, { descripcion: e.target.value })} rows={3} className="text-xs resize-none" placeholder="Descripción narrativa de la actividad..." />

                          {(sub.tareas ?? []).length > 0 && (
                            <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tareas</p>
                              {(sub.tareas ?? []).map((tarea, tareaIdx) => {
                                const imagenesDeLaTarea = imagenes.filter(
                                  img => img.edtRef === (item.edtRefId ?? '') && img.tareaRef === tarea.tareaRefId
                                )
                                return (
                                  <div key={tarea.tareaRefId ?? tareaIdx} className="space-y-1">
                                    <div className="flex items-start gap-1">
                                      <span className="text-[10px] text-muted-foreground mt-1.5 shrink-0">•</span>
                                      <Textarea
                                        value={tarea.texto}
                                        onChange={e => updateTarea(edtIdx, subIdx, tareaIdx, { texto: e.target.value })}
                                        rows={1}
                                        className="text-xs resize-none min-h-0 py-1"
                                        placeholder={tarea.nombre}
                                      />
                                    </div>
                                    {item.tipoDetalle === 'detallado' && (
                                      <div className="pl-3 space-y-1">
                                        {tarea.fotoSugerida && imagenesDeLaTarea.length === 0 && (
                                          <div className="flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] text-amber-800">
                                            <Camera size={11} className="shrink-0 mt-0.5" />
                                            <span><strong>Foto sugerida:</strong> {tarea.fotoSugerida}</span>
                                          </div>
                                        )}
                                        <Input
                                          value={tarea.fotoSugerida ?? ''}
                                          onChange={e => updateTarea(edtIdx, subIdx, tareaIdx, { fotoSugerida: e.target.value })}
                                          className="h-6 text-[10px]"
                                          placeholder="Foto sugerida para esta tarea (opcional, no se exporta al docx)"
                                        />
                                        {tarea.tareaRefId && (
                                          <GaleriaImagenesAlcance
                                            proyectoId={proyectoId}
                                            edtRef={item.edtRefId ?? ''}
                                            tareaRef={tarea.tareaRefId}
                                            nombreDefault={tarea.nombre}
                                            textosContexto={[...textosHerramientas, tarea.texto, tarea.nombre]}
                                            imagenes={imagenes}
                                            onChanged={onImagenesChanged}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {item.tipoDetalle === 'detallado' && (() => {
                            const imagenesDelSubItem = imagenes.filter(
                              img => img.edtRef === (item.edtRefId ?? '') && !img.tareaRef && (img.subItemRef ?? undefined) === sub.actividadRefId
                            )
                            return (
                              <>
                                {sub.fotoSugerida && imagenesDelSubItem.length === 0 && (
                                  <div className="flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] text-amber-800">
                                    <Camera size={12} className="shrink-0 mt-0.5" />
                                    <span><strong>Foto sugerida:</strong> {sub.fotoSugerida}</span>
                                  </div>
                                )}
                                <Input
                                  value={sub.fotoSugerida ?? ''}
                                  onChange={e => updateSubItem(edtIdx, subIdx, { fotoSugerida: e.target.value })}
                                  className="h-7 text-xs"
                                  placeholder="Foto sugerida para el levantamiento (opcional, no se exporta al docx)"
                                />
                              </>
                            )
                          })()}
                          {item.tipoDetalle === 'detallado' && sub.actividadRefId && (
                            <GaleriaImagenesAlcance
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
                      ))}
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
            ))}
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
