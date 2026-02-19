'use client'

import { useState, useEffect } from 'react'
import { Recurso } from '@/types'
import { deleteRecurso, toggleRecursoActivo } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Edit,
  Trash2,
  Users,
  User,
  Loader2,
  UsersRound,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  GripVertical,
  Link,
  Power,
  PowerOff,
  Building2,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getCostoHoraUSD,
  calcularCostoRealCuadrilla,
  calcularCostoRealIndividual,
  formatUSD,
  getConfiguracionCostos,
  ConfiguracionCostos,
  DEFAULTS
} from '@/lib/costos'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  data?: Recurso[]
  onEdit?: (r: Recurso) => void
  onDelete?: (id: string) => void
  onToggleActivo?: (recurso: Recurso) => void
  onReorder?: (items: Recurso[]) => void
  loading?: boolean
  error?: string | null
}

function SortableRow({
  recurso,
  config,
  onEdit,
  eliminando,
  onEliminar,
  onToggleActivo,
  toggling,
  draggable,
}: {
  recurso: Recurso
  config: ConfiguracionCostos
  onEdit?: (r: Recurso) => void
  eliminando: string | null
  onEliminar: (id: string) => void
  onToggleActivo?: (recurso: Recurso) => void
  toggling: string | null
  draggable: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recurso.id, disabled: !draggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const composiciones = recurso.composiciones || []
  const tienePersonal = composiciones.length > 0

  const costoReal = tienePersonal
    ? recurso.tipo === 'cuadrilla'
      ? calcularCostoRealCuadrilla(composiciones, config)
      : calcularCostoRealIndividual(composiciones, config)
    : 0

  const diferencia = tienePersonal ? recurso.costoHora - costoReal : 0
  const porcentajeDif = costoReal > 0
    ? (diferencia / costoReal) * 100
    : 0

  const getEstadoColor = () => {
    if (!tienePersonal) return 'text-gray-400'
    if (Math.abs(porcentajeDif) < 5) return 'text-green-600'
    if (diferencia > 0) return 'text-green-600'
    return 'text-red-600'
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'hover:bg-blue-50/50 text-xs',
        isDragging && 'opacity-50 bg-blue-50 shadow-lg z-50',
        !recurso.activo && 'opacity-50 bg-gray-50/50'
      )}
    >
      {draggable && (
        <TableCell className="px-1 py-1.5 w-8">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </TableCell>
      )}
      <TableCell className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            recurso.tipo === 'cuadrilla' ? "bg-purple-100" : "bg-blue-100"
          )}>
            {recurso.tipo === 'cuadrilla' ? (
              <UsersRound className="h-3 w-3 text-purple-600" />
            ) : (
              <User className="h-3 w-3 text-blue-600" />
            )}
          </div>
          <span className="font-medium">{recurso.nombre}</span>
        </div>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            recurso.tipo === 'cuadrilla'
              ? "border-purple-200 bg-purple-50 text-purple-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          )}
        >
          {recurso.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual'}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            recurso.origen === 'externo'
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          )}
        >
          <span className="flex items-center gap-1">
            {recurso.origen === 'externo' ? (
              <><Building2 className="h-2.5 w-2.5" /> Externo</>
            ) : (
              <><UserCheck className="h-2.5 w-2.5" /> GYS</>
            )}
          </span>
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        {tienePersonal ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <div className="flex -space-x-1">
                  {composiciones.slice(0, 3).map((comp, idx) => (
                    <div
                      key={comp.id || idx}
                      className={cn(
                        "w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-medium",
                        recurso.tipo === 'cuadrilla' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {comp.empleado?.user?.name?.charAt(0) || '?'}
                    </div>
                  ))}
                  {composiciones.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-medium">
                      +{composiciones.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {composiciones.length}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-xs mb-2">
                  {recurso.tipo === 'cuadrilla' ? 'Composición:' : 'Personal asignado:'}
                </p>
                {composiciones.map((comp, idx) => {
                  const costoEmp = getCostoHoraUSD(comp.empleado, config)
                  return (
                    <div key={comp.id || idx} className="flex items-center justify-between gap-4 text-xs">
                      <span>{comp.empleado?.user?.name || 'Sin nombre'}</span>
                      <span className="text-muted-foreground">
                        {recurso.tipo === 'cuadrilla'
                          ? `${comp.rol ? `${comp.rol} · ` : ''}${formatUSD(costoEmp)}/h`
                          : formatUSD(costoEmp) + '/h'
                        }
                      </span>
                    </div>
                  )
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-amber-600 cursor-help">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[10px]">Vacante</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Sin personal asignado</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <span className="font-mono text-xs font-medium text-blue-600">
          {formatUSD(recurso.costoHora)}
        </span>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        {recurso.costoHoraProyecto != null ? (
          <span className="font-mono text-xs font-medium text-emerald-600">
            {formatUSD(recurso.costoHoraProyecto)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">–</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-1.5">
        {tienePersonal ? (
          <span className="font-mono text-xs text-gray-700">
            {formatUSD(costoReal)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-1.5">
        {tienePersonal ? (
          <div className={cn("flex items-center gap-1", getEstadoColor())}>
            {diferencia > 0.01 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : diferencia < -0.01 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            <span className="font-mono text-xs font-medium">
              {diferencia >= 0 ? '+' : ''}{formatUSD(diferencia)}
            </span>
            <span className="text-[9px] text-muted-foreground">
              ({porcentajeDif >= 0 ? '+' : ''}{porcentajeDif.toFixed(0)}%)
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-1.5">
        {(() => {
          const counts = recurso._count
          if (!counts) return <span className="text-[10px] text-gray-400">-</span>
          const total = counts.catalogoServicio + counts.cotizacionServicioItem +
            counts.registroHoras + counts.plantillaServicioItem + counts.plantillaServicioItemIndependiente
          if (total === 0) return <span className="text-[10px] text-gray-400">No</span>
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Link className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">{total}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold mb-1">Referencias:</p>
                  {counts.catalogoServicio > 0 && <p>{counts.catalogoServicio} servicio(s) catálogo</p>}
                  {counts.cotizacionServicioItem > 0 && <p>{counts.cotizacionServicioItem} ítem(s) cotización</p>}
                  {counts.registroHoras > 0 && <p>{counts.registroHoras} registro(s) horas</p>}
                  {counts.plantillaServicioItem > 0 && <p>{counts.plantillaServicioItem} ítem(s) plantilla</p>}
                  {counts.plantillaServicioItemIndependiente > 0 && <p>{counts.plantillaServicioItemIndependiente} ítem(s) plantilla indep.</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })()}
      </TableCell>
      <TableCell className="px-3 py-1.5 text-center">
        <div className="flex justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleActivo?.(recurso)}
                disabled={toggling === recurso.id}
                className={cn(
                  "h-7 w-7 p-0",
                  recurso.activo
                    ? "hover:bg-amber-50 hover:text-amber-600"
                    : "hover:bg-green-50 hover:text-green-600"
                )}
                title={recurso.activo ? 'Desactivar' : 'Activar'}
              >
                {toggling === recurso.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : recurso.activo ? (
                  <Power className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <PowerOff className="h-3.5 w-3.5 text-gray-400" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{recurso.activo ? 'Desactivar recurso' : 'Activar recurso'}</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(recurso)}
            disabled={eliminando !== null}
            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEliminar(recurso.id)}
            disabled={eliminando === recurso.id}
            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
            title="Eliminar"
          >
            {eliminando === recurso.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function RecursoTableView({ data, onEdit, onDelete, onToggleActivo, onReorder, loading = false, error = null }: Props) {
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfiguracionCostos>({
    tipoCambio: DEFAULTS.TIPO_CAMBIO,
    horasSemanales: DEFAULTS.HORAS_SEMANALES,
    diasLaborables: DEFAULTS.DIAS_LABORABLES,
    semanasxMes: DEFAULTS.SEMANAS_X_MES,
    horasMensuales: DEFAULTS.HORAS_MENSUALES,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    getConfiguracionCostos().then(setConfig)
  }, [])

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteRecurso(id)
      toast.success('Recurso eliminado correctamente')
      onDelete?.(id)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al eliminar el recurso'
      toast.error(msg)
    } finally {
      setEliminando(null)
    }
  }

  const handleToggle = async (recurso: Recurso) => {
    setToggling(recurso.id)
    try {
      const updated = await toggleRecursoActivo(recurso.id, !recurso.activo)
      toast.success(updated.activo ? `"${recurso.nombre}" activado` : `"${recurso.nombre}" desactivado`)
      onToggleActivo?.(updated)
    } catch {
      toast.error('Error al cambiar estado del recurso')
    } finally {
      setToggling(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !data || !onReorder) return

    const oldIndex = data.findIndex(item => item.id === active.id)
    const newIndex = data.findIndex(item => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(data, oldIndex, newIndex).map((item, index) => ({
      ...item,
      orden: index,
    }))

    onReorder(reordered)
  }

  if (loading) {
    return (
      <div className="border rounded-lg bg-white p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-medium mb-1">No hay recursos</h3>
        <p className="text-sm text-muted-foreground">
          Comienza agregando tu primer recurso
        </p>
      </div>
    )
  }

  const draggable = !!onReorder

  return (
    <TooltipProvider>
      <div className="border rounded-lg bg-white overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={data.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  {draggable && (
                    <TableHead className="px-1 py-2 w-8" />
                  )}
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700">Nombre</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-24">Tipo</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-24">Origen</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-36">Personal</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-28">Costo/Hora</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-28">Costo Proy.</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-28">Costo Real</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-28">Diferencia</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-20">En uso</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-24 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((recurso) => (
                  <SortableRow
                    key={recurso.id}
                    recurso={recurso}
                    config={config}
                    onEdit={onEdit}
                    eliminando={eliminando}
                    onEliminar={eliminar}
                    onToggleActivo={handleToggle}
                    toggling={toggling}
                    draggable={draggable}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
    </TooltipProvider>
  )
}
