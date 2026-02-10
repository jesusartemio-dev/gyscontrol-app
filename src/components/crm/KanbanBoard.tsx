'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import { DollarSign, User, GripVertical, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  getOportunidades,
  cambiarEstadoOportunidad,
  CrmOportunidad,
  CRM_ESTADOS_OPORTUNIDAD
} from '@/lib/services/crm'

// -------------------------------------------------------
// Column configuration
// -------------------------------------------------------

interface ColumnConfig {
  id: string
  label: string
  color: string        // Tailwind ring / accent color
  headerBg: string     // header background gradient
  badgeBg: string      // badge variant classes
}

const COLUMNS: ColumnConfig[] = [
  {
    id: CRM_ESTADOS_OPORTUNIDAD.INICIO,
    label: 'Inicio',
    color: 'purple',
    headerBg: 'from-purple-500 to-purple-600',
    badgeBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.CONTACTO_CLIENTE,
    label: 'Contacto',
    color: 'blue',
    headerBg: 'from-blue-500 to-blue-600',
    badgeBg: 'bg-blue-100 text-blue-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.VALIDACION_TECNICA,
    label: 'V. Tecnica',
    color: 'cyan',
    headerBg: 'from-cyan-500 to-cyan-600',
    badgeBg: 'bg-cyan-100 text-cyan-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.VALIDACION_COMERCIAL,
    label: 'V. Comercial',
    color: 'violet',
    headerBg: 'from-violet-500 to-violet-600',
    badgeBg: 'bg-violet-100 text-violet-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.NEGOCIACION,
    label: 'Negociacion',
    color: 'orange',
    headerBg: 'from-orange-500 to-orange-600',
    badgeBg: 'bg-orange-100 text-orange-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.SEGUIMIENTO_PROYECTO,
    label: 'Ganada',
    color: 'green',
    headerBg: 'from-green-500 to-green-600',
    badgeBg: 'bg-green-100 text-green-700'
  },
  {
    id: CRM_ESTADOS_OPORTUNIDAD.FEEDBACK_MEJORA,
    label: 'Perdida',
    color: 'red',
    headerBg: 'from-red-500 to-red-600',
    badgeBg: 'bg-red-100 text-red-700'
  }
]

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)

const priorityConfig: Record<string, { label: string; className: string }> = {
  critica: { label: 'Critica', className: 'bg-red-100 text-red-700 border-red-200' },
  alta:    { label: 'Alta',    className: 'bg-orange-100 text-orange-700 border-orange-200' },
  media:   { label: 'Media',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
  baja:    { label: 'Baja',    className: 'bg-gray-100 text-gray-600 border-gray-200' }
}

function daysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

// -------------------------------------------------------
// Grouped state type
// -------------------------------------------------------

type GroupedOportunidades = Record<string, CrmOportunidad[]>

function groupByEstado(items: CrmOportunidad[]): GroupedOportunidades {
  const grouped: GroupedOportunidades = {}
  for (const col of COLUMNS) {
    grouped[col.id] = []
  }
  for (const item of items) {
    if (grouped[item.estado]) {
      grouped[item.estado].push(item)
    }
  }
  return grouped
}

// -------------------------------------------------------
// Draggable Card
// -------------------------------------------------------

interface DraggableCardProps {
  oportunidad: CrmOportunidad
  onView?: (o: CrmOportunidad) => void
  onEdit?: (o: CrmOportunidad) => void
}

function DraggableCard({ oportunidad, onView, onEdit }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: oportunidad.id,
    data: { oportunidad }
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-30' : ''}
    >
      <OpportunityCard
        oportunidad={oportunidad}
        onView={onView}
        onEdit={onEdit}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  )
}

// -------------------------------------------------------
// Opportunity Card (shared between board and overlay)
// -------------------------------------------------------

interface OpportunityCardProps {
  oportunidad: CrmOportunidad
  onView?: (o: CrmOportunidad) => void
  onEdit?: (o: CrmOportunidad) => void
  dragAttributes?: Record<string, any>
  dragListeners?: Record<string, any>
  isOverlay?: boolean
}

function OpportunityCard({
  oportunidad,
  onView,
  onEdit,
  dragAttributes,
  dragListeners,
  isOverlay
}: OpportunityCardProps) {
  const days = daysInStage(oportunidad.updatedAt)
  const prio = priorityConfig[oportunidad.prioridad] ?? priorityConfig.media

  return (
    <Card
      className={`mb-2 p-3 bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
        isOverlay ? 'opacity-80 shadow-lg ring-2 ring-blue-400' : ''
      }`}
      onClick={() => onView?.(oportunidad)}
      onDoubleClick={() => onEdit?.(oportunidad)}
    >
      {/* Drag handle + name */}
      <div className="flex items-start gap-1.5">
        <button
          className="mt-0.5 cursor-grab text-muted-foreground/60 hover:text-muted-foreground shrink-0"
          {...dragAttributes}
          {...dragListeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
          {oportunidad.nombre}
        </span>
      </div>

      {/* Client */}
      {oportunidad.cliente && (
        <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="text-xs truncate">{oportunidad.cliente.nombre}</span>
        </div>
      )}

      {/* Value */}
      {oportunidad.valorEstimado != null && oportunidad.valorEstimado > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span className="text-sm font-medium text-green-700">
            {formatCurrency(oportunidad.valorEstimado)}
          </span>
        </div>
      )}

      {/* Bottom row: probability, priority, days */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {oportunidad.probabilidad}%
        </Badge>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${prio.className}`}>
          {prio.label}
        </Badge>
        {days > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {days}d
          </span>
        )}
      </div>
    </Card>
  )
}

// -------------------------------------------------------
// Droppable Column
// -------------------------------------------------------

interface DroppableColumnProps {
  config: ColumnConfig
  items: CrmOportunidad[]
  onView?: (o: CrmOportunidad) => void
  onEdit?: (o: CrmOportunidad) => void
}

function DroppableColumn({ config, items, onView, onEdit }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: config.id })

  const totalValue = items.reduce((sum, o) => sum + (o.valorEstimado ?? 0), 0)

  return (
    <div
      className={`flex flex-col min-w-[220px] max-w-[280px] flex-shrink-0 bg-muted/50 rounded-lg transition-all ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`rounded-t-lg bg-gradient-to-r ${config.headerBg} px-3 py-2`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{config.label}</h3>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs px-1.5 py-0 hover:bg-white/30">
            {items.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-[11px] text-white/80 mt-0.5">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Column Items */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {items.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            Sin oportunidades
          </div>
        )}
        {items.map((oportunidad) => (
          <DraggableCard
            key={oportunidad.id}
            oportunidad={oportunidad}
            onView={onView}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Loading skeleton
// -------------------------------------------------------

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[220px] max-w-[280px] flex-shrink-0 bg-muted/50 rounded-lg"
        >
          <Skeleton className="h-12 rounded-t-lg rounded-b-none" />
          <div className="p-2 space-y-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

interface KanbanBoardProps {
  onView?: (oportunidad: CrmOportunidad) => void
  onEdit?: (oportunidad: CrmOportunidad) => void
}

export default function KanbanBoard({ onView, onEdit }: KanbanBoardProps) {
  const { toast } = useToast()
  const [grouped, setGrouped] = useState<GroupedOportunidades>({})
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState<CrmOportunidad | null>(null)

  // Pointer sensor with small activation distance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  // ---------------------------
  // Initial data load
  // ---------------------------
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await getOportunidades({}, { limit: 200 })
        if (!cancelled) {
          setGrouped(groupByEstado(response.data))
        }
      } catch (err) {
        console.error('Error loading oportunidades for kanban:', err)
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las oportunidades',
            variant: 'destructive'
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------
  // Drag handlers
  // ---------------------------
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const oportunidad = event.active.data.current?.oportunidad as CrmOportunidad | undefined
    setActiveCard(oportunidad ?? null)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCard(null)

      const { active, over } = event
      if (!over) return

      const oportunidad = active.data.current?.oportunidad as CrmOportunidad | undefined
      if (!oportunidad) return

      const sourceEstado = oportunidad.estado
      const destEstado = over.id as string

      // If dropped on same column, do nothing
      if (sourceEstado === destEstado) return

      // Check destination is a valid column
      const isValidColumn = COLUMNS.some((c) => c.id === destEstado)
      if (!isValidColumn) return

      // --- Optimistic update ---
      setGrouped((prev) => {
        const next = { ...prev }
        // Remove from source
        next[sourceEstado] = prev[sourceEstado].filter((o) => o.id !== oportunidad.id)
        // Add to destination with updated estado
        const moved = { ...oportunidad, estado: destEstado, updatedAt: new Date().toISOString() }
        next[destEstado] = [...(prev[destEstado] ?? []), moved]
        return next
      })

      // --- API call ---
      try {
        await cambiarEstadoOportunidad(oportunidad.id, destEstado)
      } catch (err) {
        console.error('Error changing estado:', err)

        // Revert optimistic update
        setGrouped((prev) => {
          const next = { ...prev }
          next[destEstado] = prev[destEstado].filter((o) => o.id !== oportunidad.id)
          next[sourceEstado] = [...prev[sourceEstado], oportunidad]
          return next
        })

        toast({
          title: 'Error',
          description: 'No se pudo cambiar el estado de la oportunidad',
          variant: 'destructive'
        })
      }
    },
    [toast]
  )

  const handleDragCancel = useCallback(() => {
    setActiveCard(null)
  }, [])

  // ---------------------------
  // Render
  // ---------------------------
  if (loading) {
    return <KanbanSkeleton />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            config={col}
            items={grouped[col.id] ?? []}
            onView={onView}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-[260px]">
            <OpportunityCard
              oportunidad={activeCard}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
