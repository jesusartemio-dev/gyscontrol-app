'use client'

import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Trash2, Plus, Edit2, Loader2 } from 'lucide-react'
import type { PetsContenido } from '@/lib/validators/pets'

// ── Types ──────────────────────────────────────────────────────────────────────

type Etapa = PetsContenido['procedimiento']['etapas'][number]
type Paso = Etapa['pasos'][number]

interface Props {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  onEditarPaso: (etapaIdx: number, pasoIdx: number) => void
  onAgregarPaso: (etapaIdx: number) => void
  saving: boolean
}

// ── Helper: editable string list ──────────────────────────────────────────────

function StringListEditor({
  items,
  onChange,
  minItems = 0,
  placeholder = 'Elemento...',
}: {
  items: string[]
  onChange: (v: string[]) => void
  minItems?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      {items.map((v, i) => (
        <div key={i} className="flex gap-1">
          <Input
            value={v}
            onChange={(e) => {
              const n = [...items]
              n[i] = e.target.value
              onChange(n)
            }}
            className="h-7 text-xs"
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 flex-shrink-0"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            disabled={items.length <= minItems}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1 px-1"
        onClick={() => onChange([...items, ''])}
      >
        <Plus className="h-3 w-3" /> Agregar
      </Button>
    </div>
  )
}

// ── Sortable Paso ─────────────────────────────────────────────────────────────

function SortablePaso({
  id,
  paso,
  onEditar,
  onEliminar,
  canDelete,
  disabled,
}: {
  id: string
  paso: Paso
  onEditar: () => void
  onEliminar: () => void
  canDelete: boolean
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1.5 py-1.5 px-2 rounded border border-gray-200 bg-white group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{paso.que}</p>
        <p className="text-xs text-gray-400 truncate">
          {paso.quien.map((q) => q.rol).join(', ')}
        </p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onEditar}
          disabled={disabled}
          title="Editar paso"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500"
          onClick={onEliminar}
          disabled={!canDelete || disabled}
          title="Eliminar paso"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ── Sortable Etapa ────────────────────────────────────────────────────────────

function SortableEtapa({
  id,
  etapa,
  etapaIdx,
  contenido,
  onGuardar,
  onEditarPaso,
  onAgregarPaso,
  saving,
  canDelete,
}: {
  id: string
  etapa: Etapa
  etapaIdx: number
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  onEditarPaso: (eIdx: number, pIdx: number) => void
  onAgregarPaso: (eIdx: number) => void
  saving: boolean
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const innerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const pasoIds = etapa.pasos.map((_, i) => `paso-${etapaIdx}-${i}`)

  const handlePasoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = parseInt((active.id as string).split('-')[2])
    const to = parseInt((over.id as string).split('-')[2])
    const nuevo = structuredClone(contenido) as PetsContenido
    nuevo.procedimiento.etapas[etapaIdx].pasos = arrayMove(
      nuevo.procedimiento.etapas[etapaIdx].pasos,
      from,
      to,
    )
    await onGuardar(nuevo)
  }

  const eliminarPaso = async (pIdx: number) => {
    const nuevo = structuredClone(contenido) as PetsContenido
    nuevo.procedimiento.etapas[etapaIdx].pasos.splice(pIdx, 1)
    await onGuardar(nuevo)
  }

  const eliminarEtapa = async () => {
    if (!canDelete) return
    const nuevo = structuredClone(contenido) as PetsContenido
    nuevo.procedimiento.etapas.splice(etapaIdx, 1)
    nuevo.procedimiento.etapas.forEach((e, i) => {
      e.letra = String.fromCharCode(65 + i)
    })
    await onGuardar(nuevo)
  }

  const letra = etapa.letra ?? String.fromCharCode(65 + etapaIdx)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="rounded-md border border-gray-200 bg-gray-50/50"
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0">
          {letra}
        </Badge>
        <span className="text-sm font-medium flex-1 truncate">{etapa.titulo}</span>
        <div className="flex gap-0.5 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAgregarPaso(etapaIdx)}
            disabled={saving}
            title="Agregar paso"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500"
            onClick={eliminarEtapa}
            disabled={!canDelete || saving}
            title="Eliminar etapa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-3 pb-2 space-y-1">
        <DndContext
          sensors={innerSensors}
          collisionDetection={closestCenter}
          onDragEnd={handlePasoDragEnd}
        >
          <SortableContext items={pasoIds} strategy={verticalListSortingStrategy}>
            {etapa.pasos.map((paso, pIdx) => (
              <SortablePaso
                key={`paso-${etapaIdx}-${pIdx}`}
                id={`paso-${etapaIdx}-${pIdx}`}
                paso={paso}
                onEditar={() => onEditarPaso(etapaIdx, pIdx)}
                onEliminar={() => eliminarPaso(pIdx)}
                canDelete={etapa.pasos.length > 1}
                disabled={saving}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

// ── Nueva Etapa Form ──────────────────────────────────────────────────────────

function NuevaEtapaForm({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [titulo, setTitulo] = useState('')
  const [adding, setAdding] = useState(false)

  const agregar = async () => {
    if (!titulo.trim()) return
    setAdding(true)
    const nuevo = structuredClone(contenido) as PetsContenido
    const letraIdx = nuevo.procedimiento.etapas.length
    nuevo.procedimiento.etapas.push({
      letra: String.fromCharCode(65 + letraIdx),
      titulo: titulo.trim(),
      pasos: [{ que: 'Nuevo paso', como: [{ tipo: 'parrafo', texto: '' }], quien: [{ rol: '' }] }],
    })
    try {
      await onGuardar(nuevo)
      setTitulo('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex gap-2 pt-1 border-t border-dashed border-gray-200">
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título de nueva etapa..."
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') agregar()
        }}
      />
      <Button
        type="button"
        size="sm"
        className="h-8 flex-shrink-0"
        onClick={agregar}
        disabled={!titulo.trim() || saving || adding}
      >
        {adding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}

// ── Section: Personal ─────────────────────────────────────────────────────────

function PersonalSection({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [roles, setRoles] = useState(contenido.personal.map((p) => p.rol))
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    const filtered = roles.filter((r) => r.trim())
    if (!filtered.length) return
    setGuardando(true)
    try {
      await onGuardar({ ...contenido, personal: filtered.map((rol) => ({ rol })) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3">
      <StringListEditor
        items={roles}
        onChange={setRoles}
        minItems={1}
        placeholder="Rol..."
      />
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={guardar}
        disabled={saving || guardando}
      >
        {guardando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}

// ── Section: EPP ──────────────────────────────────────────────────────────────

function EppSection({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [basico, setBasico] = useState(contenido.epp.basico.map((e) => e.nombre))
  const [bioseg, setBioseg] = useState(contenido.epp.bioseguridad.map((e) => e.nombre))
  const [especifico, setEspecifico] = useState(contenido.epp.especifico.map((e) => e.nombre))
  const [mppRef, setMppRef] = useState(contenido.epp.mppRef)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    try {
      await onGuardar({
        ...contenido,
        epp: {
          basico: basico.filter((n) => n.trim()).map((nombre) => ({ nombre })),
          bioseguridad: bioseg.filter((n) => n.trim()).map((nombre) => ({ nombre })),
          especifico: especifico.filter((n) => n.trim()).map((nombre) => ({ nombre })),
          mppRef,
        },
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Básico</p>
        <StringListEditor items={basico} onChange={setBasico} placeholder="Equipo básico..." />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Bioseguridad</p>
        <StringListEditor items={bioseg} onChange={setBioseg} placeholder="Equipo bioseguridad..." />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Específico</p>
        <StringListEditor items={especifico} onChange={setEspecifico} placeholder="Equipo específico..." />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Referencia MPP</p>
        <Input
          value={mppRef}
          onChange={(e) => setMppRef(e.target.value)}
          className="h-7 text-xs"
          placeholder="Código de referencia MPP..."
        />
      </div>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={guardar}
        disabled={saving || guardando}
      >
        {guardando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}

// ── Section: Recursos ─────────────────────────────────────────────────────────

function RecursosSection({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [equipos, setEquipos] = useState(contenido.recursos.equipos.map((e) => e.nombre))
  const [herramientas, setHerramientas] = useState(
    contenido.recursos.herramientas.map((e) => e.nombre),
  )
  const [materiales, setMateriales] = useState(
    contenido.recursos.materiales.map((e) => e.nombre),
  )
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    try {
      await onGuardar({
        ...contenido,
        recursos: {
          equipos: equipos.filter((n) => n.trim()).map((nombre) => ({ nombre })),
          herramientas: herramientas.filter((n) => n.trim()).map((nombre) => ({ nombre })),
          materiales: materiales.filter((n) => n.trim()).map((nombre) => ({ nombre })),
        },
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Equipos</p>
        <StringListEditor items={equipos} onChange={setEquipos} placeholder="Equipo..." />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Herramientas</p>
        <StringListEditor
          items={herramientas}
          onChange={setHerramientas}
          placeholder="Herramienta..."
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Materiales</p>
        <StringListEditor items={materiales} onChange={setMateriales} placeholder="Material..." />
      </div>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={guardar}
        disabled={saving || guardando}
      >
        {guardando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}

// ── Section: Restricciones ────────────────────────────────────────────────────

function RestriccionesSection({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [items, setItems] = useState(contenido.restricciones.map((r) => r.texto))
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    const filtered = items.filter((t) => t.trim())
    if (!filtered.length) return
    setGuardando(true)
    try {
      await onGuardar({ ...contenido, restricciones: filtered.map((texto) => ({ texto })) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {items.map((v, i) => (
          <div key={i} className="flex gap-1 items-start">
            <Textarea
              value={v}
              onChange={(e) => {
                const n = [...items]
                n[i] = e.target.value
                setItems(n)
              }}
              className="text-xs min-h-[48px] resize-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 flex-shrink-0 mt-0.5"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 px-1"
          onClick={() => setItems([...items, ''])}
        >
          <Plus className="h-3 w-3" /> Agregar
        </Button>
      </div>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={guardar}
        disabled={saving || guardando}
      >
        {guardando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}

// ── Section: Cambios ──────────────────────────────────────────────────────────

function CambiosSection({
  contenido,
  onGuardar,
  saving,
}: {
  contenido: PetsContenido
  onGuardar: (nuevo: PetsContenido) => Promise<void>
  saving: boolean
}) {
  const [cambios, setCambios] = useState(contenido.cambios)
  const [guardando, setGuardando] = useState(false)

  const update = (i: number, campo: keyof (typeof cambios)[0], valor: string) => {
    const n = [...cambios]
    n[i] = { ...n[i], [campo]: valor }
    setCambios(n)
  }

  const guardar = async () => {
    const filtered = cambios.filter((c) => c.descripcion.trim())
    if (!filtered.length) return
    setGuardando(true)
    try {
      await onGuardar({ ...contenido, cambios: filtered })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {cambios.map((c, i) => (
          <div key={i} className="grid grid-cols-[80px_80px_1fr_28px] gap-1 items-center">
            <Input
              value={c.fecha}
              onChange={(e) => update(i, 'fecha', e.target.value)}
              className="h-7 text-xs"
              placeholder="Fecha"
            />
            <Input
              value={c.version}
              onChange={(e) => update(i, 'version', e.target.value)}
              className="h-7 text-xs"
              placeholder="Versión"
            />
            <Input
              value={c.descripcion}
              onChange={(e) => update(i, 'descripcion', e.target.value)}
              className="h-7 text-xs"
              placeholder="Descripción"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() => setCambios(cambios.filter((_, j) => j !== i))}
              disabled={cambios.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 px-1"
          onClick={() =>
            setCambios([...cambios, { fecha: '', version: '', descripcion: '' }])
          }
        >
          <Plus className="h-3 w-3" /> Agregar
        </Button>
      </div>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={guardar}
        disabled={saving || guardando}
      >
        {guardando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
        Guardar
      </Button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function PetsEditorPanel({
  contenido,
  onGuardar,
  onEditarPaso,
  onAgregarPaso,
  saving,
}: Props) {
  const outerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const etapaIds = contenido.procedimiento.etapas.map((_, i) => `etapa-${i}`)

  const handleEtapaDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = parseInt((active.id as string).split('-')[1])
    const to = parseInt((over.id as string).split('-')[1])
    const nuevo = structuredClone(contenido) as PetsContenido
    nuevo.procedimiento.etapas = arrayMove(nuevo.procedimiento.etapas, from, to)
    nuevo.procedimiento.etapas.forEach((e, i) => {
      e.letra = String.fromCharCode(65 + i)
    })
    await onGuardar(nuevo)
  }

  return (
    <Accordion type="multiple" defaultValue={['procedimiento']} className="space-y-2">
      <AccordionItem value="procedimiento" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">
          Procedimiento ({contenido.procedimiento.etapas.length} etapas)
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-2">
            <DndContext
              sensors={outerSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleEtapaDragEnd}
            >
              <SortableContext items={etapaIds} strategy={verticalListSortingStrategy}>
                {contenido.procedimiento.etapas.map((etapa, i) => (
                  <SortableEtapa
                    key={`etapa-${i}`}
                    id={`etapa-${i}`}
                    etapa={etapa}
                    etapaIdx={i}
                    contenido={contenido}
                    onGuardar={onGuardar}
                    onEditarPaso={onEditarPaso}
                    onAgregarPaso={onAgregarPaso}
                    saving={saving}
                    canDelete={contenido.procedimiento.etapas.length > 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <NuevaEtapaForm contenido={contenido} onGuardar={onGuardar} saving={saving} />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="personal" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">
          Personal ({contenido.personal.length})
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <PersonalSection contenido={contenido} onGuardar={onGuardar} saving={saving} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="epp" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">EPP</AccordionTrigger>
        <AccordionContent className="pb-3">
          <EppSection contenido={contenido} onGuardar={onGuardar} saving={saving} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="recursos" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">Recursos</AccordionTrigger>
        <AccordionContent className="pb-3">
          <RecursosSection contenido={contenido} onGuardar={onGuardar} saving={saving} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="restricciones" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">
          Restricciones ({contenido.restricciones.length})
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <RestriccionesSection contenido={contenido} onGuardar={onGuardar} saving={saving} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cambios" className="border rounded-lg px-3">
        <AccordionTrigger className="text-sm font-semibold py-2.5">
          Control de cambios
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <CambiosSection contenido={contenido} onGuardar={onGuardar} saving={saving} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
