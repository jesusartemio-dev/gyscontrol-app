'use client'

import { useState } from 'react'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceDetalladoSubItem } from '@/types/planTrabajo'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, PlusCircle } from 'lucide-react'

interface Props {
  valor: PlanAlcanceDetalladoEdt[]
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

export function AlcanceDetalladoEditor({ valor, onSave, onCancel }: Props) {
  const [items, setItems] = useState<PlanAlcanceDetalladoEdt[]>(
    valor.length > 0 ? valor : [edtVacio()]
  )
  const [saving, setSaving] = useState(false)

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
                  <div>
                    <Label className="text-xs">Ubicación (opcional)</Label>
                    <Input value={item.ubicacion ?? ''} onChange={e => updateItem(edtIdx, { ubicacion: e.target.value })} className="h-8 text-sm" placeholder="Site cliente / Sección 50" />
                  </div>
                  <div>
                    <Label className="text-xs">Descripción narrativa</Label>
                    <Textarea value={item.descripcion} onChange={e => updateItem(edtIdx, { descripcion: e.target.value })} rows={4} className="text-sm resize-none" placeholder="Párrafo narrativo de 80-150 palabras describiendo el flujo de trabajo..." />
                  </div>

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
