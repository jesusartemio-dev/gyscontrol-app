'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Settings2, Users, UserCheck, UserX, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================
// DEMO: Opciones para mostrar asignación de recursos en el árbol
// ============================================================

interface DemoNode {
  id: string
  type: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  nombre: string
  level: number
  expanded: boolean
  hasChildren: boolean
  childrenCount: number
  progress: number
  fechaInicio: string
  fechaFin: string
  horas: number
  // Recurso (solo tareas)
  recursoNombre?: string
  // Cobertura de recursos (nodos padre): tareas con recurso / total tareas
  recursosAsignados?: number
  recursosTotales?: number
}

// Datos con tareas expandidas para mostrar recursos
const SAMPLE_DATA: DemoNode[] = [
  { id: '1', type: 'proyecto', nombre: 'INVENTARIO DE TANQUE DE BINATO', level: 0, expanded: true, hasChildren: true, childrenCount: 5, progress: 0, fechaInicio: '30 dic', fechaFin: '13 jul', horas: 3176.88, recursosAsignados: 18, recursosTotales: 25 },
  { id: '2', type: 'fase', nombre: 'PLANIFICACIÓN', level: 1, expanded: true, hasChildren: true, childrenCount: 2, progress: 0, fechaInicio: '30 dic', fechaFin: '29 ene', horas: 256.5, recursosAsignados: 5, recursosTotales: 5 },
  { id: '2a', type: 'edt', nombre: 'Gestión del Proyecto', level: 2, expanded: true, hasChildren: true, childrenCount: 2, progress: 15, fechaInicio: '30 dic', fechaFin: '15 ene', horas: 120, recursosAsignados: 3, recursosTotales: 3 },
  { id: '2a1', type: 'actividad', nombre: 'Elaboración del Plan', level: 3, expanded: true, hasChildren: true, childrenCount: 2, progress: 30, fechaInicio: '30 dic', fechaFin: '05 ene', horas: 48, recursosAsignados: 2, recursosTotales: 2 },
  { id: '2a1t1', type: 'tarea', nombre: 'Redactar plan de trabajo', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 60, fechaInicio: '30 dic', fechaFin: '02 ene', horas: 24, recursoNombre: 'Juan Pérez' },
  { id: '2a1t2', type: 'tarea', nombre: 'Revisión con cliente', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 0, fechaInicio: '03 ene', fechaFin: '05 ene', horas: 24, recursoNombre: 'María García' },
  { id: '2a2', type: 'actividad', nombre: 'Revisión de Documentos', level: 3, expanded: true, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '06 ene', fechaFin: '15 ene', horas: 72, recursosAsignados: 1, recursosTotales: 1 },
  { id: '2a2t1', type: 'tarea', nombre: 'Analizar TDR del proyecto', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 0, fechaInicio: '06 ene', fechaFin: '15 ene', horas: 72, recursoNombre: 'Cuadrilla Eléctrica' },
  { id: '2b', type: 'edt', nombre: 'Ingeniería Básica', level: 2, expanded: false, hasChildren: true, childrenCount: 4, progress: 0, fechaInicio: '15 ene', fechaFin: '29 ene', horas: 136.5, recursosAsignados: 2, recursosTotales: 2 },
  { id: '3', type: 'fase', nombre: 'INGENIERIA', level: 1, expanded: false, hasChildren: true, childrenCount: 4, progress: 0, fechaInicio: '12 ene', fechaFin: '04 mar', horas: 458.38, recursosAsignados: 6, recursosTotales: 8 },
  { id: '4', type: 'fase', nombre: 'LOGÍSTICA', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '13 ene', fechaFin: '13 may', horas: 836, recursosAsignados: 0, recursosTotales: 4 },
  { id: '5', type: 'fase', nombre: 'EJECUCIÓN', level: 1, expanded: false, hasChildren: true, childrenCount: 2, progress: 0, fechaInicio: '02 feb', fechaFin: '17 jun', horas: 1455, recursosAsignados: 5, recursosTotales: 6 },
  { id: '6', type: 'fase', nombre: 'CIERRE', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '17 jun', fechaFin: '13 jul', horas: 171, recursosAsignados: 2, recursosTotales: 2 },
]

const NODE_ICONS: Record<string, string> = {
  proyecto: '📁', fase: '📊', edt: '🏗️', actividad: '⚡', tarea: '🔧',
}
const NODE_COLORS: Record<string, string> = {
  proyecto: 'bg-indigo-100 text-indigo-800', fase: 'bg-blue-100 text-blue-800',
  edt: 'bg-green-100 text-green-800', actividad: 'bg-purple-100 text-purple-800',
  tarea: 'bg-gray-100 text-gray-800',
}
const NODE_LABELS: Record<string, string> = {
  proyecto: 'Proyecto', fase: 'Fase', edt: 'EDT', actividad: 'Actividad', tarea: 'Tarea',
}

function MiniProgress({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-7 text-right">{percentage}%</span>
    </div>
  )
}

// Helper: color semáforo para cobertura de recursos
function getResourceColor(assigned: number, total: number) {
  if (total === 0) return 'text-gray-300'
  const ratio = assigned / total
  if (ratio >= 1) return 'text-green-500'
  if (ratio > 0) return 'text-amber-500'
  return 'text-red-400'
}

function getResourceBg(assigned: number, total: number) {
  if (total === 0) return 'bg-gray-100 text-gray-400'
  const ratio = assigned / total
  if (ratio >= 1) return 'bg-green-50 text-green-700 border-green-200'
  if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

// ============================================================
// Base row rendering (grid actual implementado)
// ============================================================
function BaseRow({ node, extra }: { node: DemoNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16}px` }}>
      {node.hasChildren ? (
        node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
      ) : (
        <div className="w-3 shrink-0" />
      )}
      <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
      <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
      {node.hasChildren && (
        <span className="text-[10px] text-gray-400 shrink-0">({node.childrenCount})</span>
      )}
      {extra}
    </div>
  )
}

// ============================================================
// OPCIÓN A: Columna de Recurso adicional
// ============================================================
function OptionA({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_65px_120px_75px_110px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div className="text-center">Recurso</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_65px_120px_75px_110px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          <BaseRow node={node} />
          <div className="flex justify-center"><MiniProgress percentage={node.progress} /></div>
          <div className="flex justify-center">
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>{NODE_LABELS[node.type]}</Badge>
          </div>
          <div className="text-center text-[11px] text-gray-500">{node.fechaInicio}–{node.fechaFin}</div>
          <div className="text-right text-[11px] text-gray-600 font-mono pr-1">{node.horas}h</div>
          {/* Columna Recurso */}
          <div className="text-center text-[11px] truncate">
            {node.type === 'tarea' ? (
              node.recursoNombre ? (
                <span className="text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0 text-[10px]">{node.recursoNombre}</span>
              ) : (
                <span className="text-red-400 text-[10px]">Sin asignar</span>
              )
            ) : (
              node.recursosTotales && node.recursosTotales > 0 ? (
                <span className={`text-[10px] font-medium ${getResourceColor(node.recursosAsignados || 0, node.recursosTotales)}`}>
                  {node.recursosAsignados}/{node.recursosTotales}
                </span>
              ) : null
            )}
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN B: Icono semáforo junto al nombre
// ============================================================
function OptionB({ nodes }: { nodes: DemoNode[] }) {
  const ResourceIcon = ({ node }: { node: DemoNode }) => {
    if (node.type === 'tarea') {
      return node.recursoNombre ? (
        <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
      ) : (
        <UserX className="h-3 w-3 text-red-400 shrink-0" />
      )
    }
    if (!node.recursosTotales || node.recursosTotales === 0) return null
    const color = getResourceColor(node.recursosAsignados || 0, node.recursosTotales)
    return <Users className={`h-3 w-3 ${color} shrink-0`} />
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_65px_120px_75px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_65px_120px_75px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          <BaseRow node={node} extra={<ResourceIcon node={node} />} />
          <div className="flex justify-center"><MiniProgress percentage={node.progress} /></div>
          <div className="flex justify-center">
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>{NODE_LABELS[node.type]}</Badge>
          </div>
          <div className="text-center text-[11px] text-gray-500">{node.fechaInicio}–{node.fechaFin}</div>
          <div className="text-right text-[11px] text-gray-600 font-mono pr-1">{node.horas}h</div>
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN C: Icono semáforo + Tooltip con detalle
// ============================================================
function OptionC({ nodes }: { nodes: DemoNode[] }) {
  const ResourceIndicator = ({ node }: { node: DemoNode }) => {
    if (node.type === 'tarea') {
      const icon = node.recursoNombre ? (
        <UserCheck className="h-3 w-3 text-green-500 shrink-0 cursor-help" />
      ) : (
        <UserX className="h-3 w-3 text-red-400 shrink-0 cursor-help" />
      )
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild><span className="shrink-0">{icon}</span></TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {node.recursoNombre ? (
                <span>Recurso: <strong>{node.recursoNombre}</strong></span>
              ) : (
                <span className="text-red-500">Sin recurso asignado</span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    if (!node.recursosTotales || node.recursosTotales === 0) return null
    const assigned = node.recursosAsignados || 0
    const total = node.recursosTotales
    const color = getResourceColor(assigned, total)
    const icon = <Users className={`h-3 w-3 ${color} shrink-0 cursor-help`} />

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild><span className="shrink-0">{icon}</span></TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div>
              <strong>Recursos: {assigned}/{total}</strong> tareas asignadas
              {assigned < total && (
                <div className="text-amber-600 mt-0.5">
                  {total - assigned} tarea{total - assigned > 1 ? 's' : ''} sin recurso
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_65px_120px_75px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_65px_120px_75px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          <BaseRow node={node} extra={<ResourceIndicator node={node} />} />
          <div className="flex justify-center"><MiniProgress percentage={node.progress} /></div>
          <div className="flex justify-center">
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>{NODE_LABELS[node.type]}</Badge>
          </div>
          <div className="text-center text-[11px] text-gray-500">{node.fechaInicio}–{node.fechaFin}</div>
          <div className="text-right text-[11px] text-gray-600 font-mono pr-1">{node.horas}h</div>
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN D: Columna Recurso reemplazando columna Tipo
// ============================================================
function OptionD({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_120px_75px_110px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div className="text-center">Recurso</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_120px_75px_110px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          <BaseRow node={node} />
          <div className="flex justify-center"><MiniProgress percentage={node.progress} /></div>
          <div className="text-center text-[11px] text-gray-500">{node.fechaInicio}–{node.fechaFin}</div>
          <div className="text-right text-[11px] text-gray-600 font-mono pr-1">{node.horas}h</div>
          {/* Recurso en lugar de Tipo */}
          <div className="text-center text-[11px] truncate">
            {node.type === 'tarea' ? (
              node.recursoNombre ? (
                <span className="text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0 text-[10px] truncate inline-block max-w-full">{node.recursoNombre}</span>
              ) : (
                <span className="text-red-400 text-[10px]">Sin asignar</span>
              )
            ) : (
              node.recursosTotales && node.recursosTotales > 0 ? (
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] ${getResourceBg(node.recursosAsignados || 0, node.recursosTotales)}`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.recursosAsignados}/{node.recursosTotales}
                </span>
              ) : null
            )}
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function TreeLayoutsDemo() {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D'>('A')

  const options = [
    { key: 'A' as const, label: 'Columna Recurso', desc: 'Columna adicional: nombre del recurso en tareas, ratio N/M en padres' },
    { key: 'B' as const, label: 'Icono Semáforo', desc: 'Icono de persona con color verde/amarillo/rojo junto al nombre' },
    { key: 'C' as const, label: 'Icono + Tooltip', desc: 'Igual que B pero al hover muestra detalle del recurso o ratio' },
    { key: 'D' as const, label: 'Recurso reemplaza Tipo', desc: 'Elimina columna Tipo (ya se identifica por icono) y usa ese espacio para Recurso' },
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo: Indicador de Recursos en el Árbol</h1>
        <p className="text-gray-500 mt-1">Compara las 4 opciones para mostrar asignación de recursos en nodos colapsados y expandidos.</p>
      </div>

      {/* Leyenda de datos de ejemplo */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-3">
          <p className="text-sm text-amber-800">
            <strong>Datos de ejemplo:</strong> PLANIFICACIÓN tiene 5/5 recursos (verde), INGENIERIA 6/8 (amarillo), LOGÍSTICA 0/4 (rojo), EJECUCIÓN 5/6 (amarillo), CIERRE 2/2 (verde). Las tareas muestran el nombre del recurso asignado.
          </p>
        </CardContent>
      </Card>

      {/* Selector */}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <Button key={opt.key} variant={selectedOption === opt.key ? 'default' : 'outline'} size="sm" onClick={() => setSelectedOption(opt.key)}>
            Opción {opt.key}: {opt.label}
          </Button>
        ))}
      </div>

      {/* Vista principal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Opción {selectedOption}: {options.find(o => o.key === selectedOption)?.label}
          </CardTitle>
          <p className="text-sm text-gray-500">{options.find(o => o.key === selectedOption)?.desc}</p>
        </CardHeader>
        <CardContent>
          {selectedOption === 'A' && <OptionA nodes={SAMPLE_DATA} />}
          {selectedOption === 'B' && <OptionB nodes={SAMPLE_DATA} />}
          {selectedOption === 'C' && <OptionC nodes={SAMPLE_DATA} />}
          {selectedOption === 'D' && <OptionD nodes={SAMPLE_DATA} />}
        </CardContent>
      </Card>

      {/* Comparativa lado a lado */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Comparativa lado a lado</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">A: Columna Recurso</CardTitle></CardHeader>
            <CardContent className="p-3"><OptionA nodes={SAMPLE_DATA} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">B: Icono Semáforo</CardTitle></CardHeader>
            <CardContent className="p-3"><OptionB nodes={SAMPLE_DATA} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">C: Icono + Tooltip</CardTitle></CardHeader>
            <CardContent className="p-3"><OptionC nodes={SAMPLE_DATA} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">D: Recurso reemplaza Tipo</CardTitle></CardHeader>
            <CardContent className="p-3"><OptionD nodes={SAMPLE_DATA} /></CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla comparativa */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Comparativa</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Característica</th>
                <th className="text-center py-2 px-2">A: Columna</th>
                <th className="text-center py-2 px-2">B: Icono</th>
                <th className="text-center py-2 px-2">C: Icono+Tip</th>
                <th className="text-center py-2 px-2">D: Reemplaza Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Visibilidad del recurso</td>
                <td className="text-center">Excelente</td>
                <td className="text-center">Buena</td>
                <td className="text-center">Buena</td>
                <td className="text-center">Excelente</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Detalle sin interacción</td>
                <td className="text-center">Nombre + ratio</td>
                <td className="text-center">Solo color</td>
                <td className="text-center">Solo color</td>
                <td className="text-center">Nombre + ratio</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Espacio horizontal</td>
                <td className="text-center text-amber-600">+110px</td>
                <td className="text-center text-green-600">+0px</td>
                <td className="text-center text-green-600">+0px</td>
                <td className="text-center text-green-600">+0px (reusa)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Identificación de tipo</td>
                <td className="text-center">Badge visible</td>
                <td className="text-center">Badge visible</td>
                <td className="text-center">Badge visible</td>
                <td className="text-center text-amber-600">Solo por icono</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Cobertura en nodos padre</td>
                <td className="text-center">Ratio N/M</td>
                <td className="text-center">Color semáforo</td>
                <td className="text-center">Color + tooltip</td>
                <td className="text-center">Badge ratio</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Complejidad</td>
                <td className="text-center">Baja</td>
                <td className="text-center">Baja</td>
                <td className="text-center">Media</td>
                <td className="text-center">Baja</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
