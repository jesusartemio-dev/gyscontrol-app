'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Settings2, Users, UserCheck, UserX, Plus, Edit, Trash2, Download, UserPlus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// ============================================================
// DEMO: Columna "Asignación" inteligente según tipo de cronograma
// Planificación = Recurso (costos) | Ejecución = Responsable (seguimiento)
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
  // Recurso (para planificación - costos)
  recursoNombre?: string
  recursosAsignados?: number
  recursosTotales?: number
  // Responsable (para ejecución - seguimiento)
  responsableNombre?: string
  responsablesAsignados?: number
  responsablesTotales?: number
}

const SAMPLE_DATA: DemoNode[] = [
  { id: '1', type: 'proyecto', nombre: 'INVENTARIO DE TANQUE DE BINATO', level: 0, expanded: true, hasChildren: true, childrenCount: 5, progress: 12, fechaInicio: '30 dic', fechaFin: '13 jul', horas: 3176.88, recursosAsignados: 18, recursosTotales: 25, responsablesAsignados: 15, responsablesTotales: 25 },
  { id: '2', type: 'fase', nombre: 'PLANIFICACIÓN', level: 1, expanded: true, hasChildren: true, childrenCount: 2, progress: 35, fechaInicio: '30 dic', fechaFin: '29 ene', horas: 256.5, recursosAsignados: 5, recursosTotales: 5, responsablesAsignados: 5, responsablesTotales: 5 },
  { id: '2a', type: 'edt', nombre: 'Gestión del Proyecto', level: 2, expanded: true, hasChildren: true, childrenCount: 2, progress: 45, fechaInicio: '30 dic', fechaFin: '15 ene', horas: 120, recursosAsignados: 3, recursosTotales: 3, responsablesAsignados: 3, responsablesTotales: 3 },
  { id: '2a1', type: 'actividad', nombre: 'Elaboración del Plan', level: 3, expanded: true, hasChildren: true, childrenCount: 2, progress: 60, fechaInicio: '30 dic', fechaFin: '05 ene', horas: 48, recursosAsignados: 2, recursosTotales: 2, responsablesAsignados: 2, responsablesTotales: 2 },
  { id: '2a1t1', type: 'tarea', nombre: 'Redactar plan de trabajo', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 100, fechaInicio: '30 dic', fechaFin: '02 ene', horas: 24, recursoNombre: 'Ing. Eléctrico Sr.', responsableNombre: 'Juan Pérez' },
  { id: '2a1t2', type: 'tarea', nombre: 'Revisión con cliente', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 20, fechaInicio: '03 ene', fechaFin: '05 ene', horas: 24, recursoNombre: 'Ing. Mecánico', responsableNombre: 'María García' },
  { id: '2a2', type: 'actividad', nombre: 'Revisión de Documentos', level: 3, expanded: true, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '06 ene', fechaFin: '15 ene', horas: 72, recursosAsignados: 1, recursosTotales: 1, responsablesAsignados: 1, responsablesTotales: 1 },
  { id: '2a2t1', type: 'tarea', nombre: 'Analizar TDR del proyecto', level: 4, expanded: false, hasChildren: false, childrenCount: 0, progress: 0, fechaInicio: '06 ene', fechaFin: '15 ene', horas: 72, recursoNombre: 'Cuadrilla Eléctrica', responsableNombre: 'Carlos López' },
  { id: '2b', type: 'edt', nombre: 'Ingeniería Básica', level: 2, expanded: false, hasChildren: true, childrenCount: 4, progress: 25, fechaInicio: '15 ene', fechaFin: '29 ene', horas: 136.5, recursosAsignados: 2, recursosTotales: 2, responsablesAsignados: 2, responsablesTotales: 2 },
  { id: '3', type: 'fase', nombre: 'INGENIERIA', level: 1, expanded: false, hasChildren: true, childrenCount: 4, progress: 10, fechaInicio: '12 ene', fechaFin: '04 mar', horas: 458.38, recursosAsignados: 6, recursosTotales: 8, responsablesAsignados: 4, responsablesTotales: 8 },
  { id: '4', type: 'fase', nombre: 'LOGÍSTICA', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '13 ene', fechaFin: '13 may', horas: 836, recursosAsignados: 0, recursosTotales: 4, responsablesAsignados: 0, responsablesTotales: 4 },
  { id: '5', type: 'fase', nombre: 'EJECUCIÓN', level: 1, expanded: false, hasChildren: true, childrenCount: 2, progress: 0, fechaInicio: '02 feb', fechaFin: '17 jun', horas: 1455, recursosAsignados: 5, recursosTotales: 6, responsablesAsignados: 4, responsablesTotales: 6 },
  { id: '6', type: 'fase', nombre: 'CIERRE', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '17 jun', fechaFin: '13 jul', horas: 171, recursosAsignados: 2, recursosTotales: 2, responsablesAsignados: 0, responsablesTotales: 2 },
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
const CAN_ADD: Record<string, { type: string; label: string }[]> = {
  proyecto: [{ type: 'fase', label: 'Fase' }, { type: 'edt', label: 'EDT' }],
  fase: [{ type: 'edt', label: 'EDT' }],
  edt: [{ type: 'actividad', label: 'Actividad' }],
  actividad: [{ type: 'tarea', label: 'Tarea' }],
  tarea: [],
}
const CAN_IMPORT: Record<string, string | null> = {
  proyecto: 'Importar Fases', fase: 'Importar EDT', actividad: 'Importar Tareas',
  edt: null, tarea: null,
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

function getAssignmentColor(assigned: number, total: number) {
  if (total === 0) return 'bg-gray-100 text-gray-400 border-gray-200'
  const ratio = assigned / total
  if (ratio >= 1) return 'bg-green-50 text-green-700 border-green-200'
  if (ratio > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

// ============================================================
// VISTA PLANIFICACIÓN: Columna muestra RECURSO (para costos)
// ============================================================
function PlanificacionView({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_65px_120px_75px_100px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div className="text-center">Recurso</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_65px_120px_75px_100px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          {/* Nombre */}
          <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16}px` }}>
            {node.hasChildren ? (
              node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
            ) : <div className="w-3 shrink-0" />}
            <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
            <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
            {node.hasChildren && <span className="text-[10px] text-gray-400 shrink-0">({node.childrenCount})</span>}
          </div>
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
                <span className="text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0 text-[10px] truncate inline-block max-w-full">{node.recursoNombre}</span>
              ) : (
                <span className="text-red-400 text-[10px]">Sin asignar</span>
              )
            ) : (
              node.recursosTotales && node.recursosTotales > 0 ? (
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${getAssignmentColor(node.recursosAsignados || 0, node.recursosTotales)}`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.recursosAsignados}/{node.recursosTotales}
                </span>
              ) : null
            )}
          </div>
          {/* Acciones completas por nivel */}
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {CAN_ADD[node.type]?.map(child => (
                  <DropdownMenuItem key={child.type}><Plus className="h-4 w-4 mr-2" />Crear {child.label}</DropdownMenuItem>
                ))}
                {CAN_IMPORT[node.type] && (
                  <DropdownMenuItem><Download className="h-4 w-4 mr-2" />{CAN_IMPORT[node.type]}</DropdownMenuItem>
                )}
                {(CAN_ADD[node.type]?.length > 0 || CAN_IMPORT[node.type]) && node.type !== 'proyecto' && (
                  <div className="h-px bg-gray-200 my-1" />
                )}
                {node.type !== 'proyecto' && (
                  <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                )}
                {node.type !== 'proyecto' && (
                  <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// VISTA EJECUCIÓN: Columna muestra RESPONSABLE (para seguimiento)
// + Opción "Asignar Responsable" en menú contextual de EDT y Tarea
// ============================================================
function EjecucionView({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_65px_120px_75px_110px_28px] items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Fechas</div>
        <div className="text-right pr-1">Horas</div>
        <div className="text-center">Responsable</div>
        <div></div>
      </div>
      {nodes.map(node => (
        <div key={node.id} className="grid grid-cols-[1fr_80px_65px_120px_75px_110px_28px] items-center gap-1 px-2 py-1 border-b last:border-b-0 hover:bg-gray-50">
          {/* Nombre */}
          <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16}px` }}>
            {node.hasChildren ? (
              node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
            ) : <div className="w-3 shrink-0" />}
            <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
            <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
            {node.hasChildren && <span className="text-[10px] text-gray-400 shrink-0">({node.childrenCount})</span>}
          </div>
          <div className="flex justify-center"><MiniProgress percentage={node.progress} /></div>
          <div className="flex justify-center">
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>{NODE_LABELS[node.type]}</Badge>
          </div>
          <div className="text-center text-[11px] text-gray-500">{node.fechaInicio}–{node.fechaFin}</div>
          <div className="text-right text-[11px] text-gray-600 font-mono pr-1">{node.horas}h</div>
          {/* Columna Responsable */}
          <div className="text-center text-[11px] truncate">
            {node.type === 'tarea' ? (
              node.responsableNombre ? (
                <span className="text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0 text-[10px] truncate inline-block max-w-full">{node.responsableNombre}</span>
              ) : (
                <span className="text-red-400 text-[10px]">Sin asignar</span>
              )
            ) : node.type === 'actividad' ? (
              // Actividad: solo muestra ratio, no se asigna responsable directamente
              node.responsablesTotales && node.responsablesTotales > 0 ? (
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${getAssignmentColor(node.responsablesAsignados || 0, node.responsablesTotales)}`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.responsablesAsignados}/{node.responsablesTotales}
                </span>
              ) : null
            ) : (
              // Proyecto, Fase, EDT: muestra ratio
              node.responsablesTotales && node.responsablesTotales > 0 ? (
                <span className={`inline-flex items-center gap-0.5 border rounded px-1 py-0 text-[10px] font-medium ${getAssignmentColor(node.responsablesAsignados || 0, node.responsablesTotales)}`}>
                  <Users className="h-2.5 w-2.5" />
                  {node.responsablesAsignados}/{node.responsablesTotales}
                </span>
              ) : null
            )}
          </div>
          {/* Acciones completas + "Asignar Responsable" para EDT y Tarea */}
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700"><Settings2 className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Crear hijos */}
                {CAN_ADD[node.type]?.map(child => (
                  <DropdownMenuItem key={child.type}><Plus className="h-4 w-4 mr-2" />Crear {child.label}</DropdownMenuItem>
                ))}
                {CAN_IMPORT[node.type] && (
                  <DropdownMenuItem><Download className="h-4 w-4 mr-2" />{CAN_IMPORT[node.type]}</DropdownMenuItem>
                )}
                {/* Separador si hubo opciones de crear/importar */}
                {(CAN_ADD[node.type]?.length > 0 || CAN_IMPORT[node.type]) && (
                  <div className="h-px bg-gray-200 my-1" />
                )}
                {/* Asignar Responsable - solo EDT y Tarea */}
                {(node.type === 'edt' || node.type === 'tarea') && (
                  <DropdownMenuItem className="text-blue-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Asignar Responsable
                    {node.type === 'edt' && <span className="text-[10px] text-gray-400 ml-1">(cascada)</span>}
                  </DropdownMenuItem>
                )}
                {(node.type === 'edt' || node.type === 'tarea') && (
                  <div className="h-px bg-gray-200 my-1" />
                )}
                {/* Editar y Eliminar - no para proyecto */}
                {node.type !== 'proyecto' && (
                  <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                )}
                {node.type !== 'proyecto' && (
                  <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
  const [view, setView] = useState<'planificacion' | 'ejecucion'>('planificacion')

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo: Columna Asignación Inteligente</h1>
        <p className="text-gray-500 mt-1">La misma columna muestra diferente info según el tipo de cronograma.</p>
      </div>

      {/* Leyenda */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Planificación</strong> = columna "Recurso" (catálogo, para estimar costos). Ej: "Ing. Eléctrico Sr.", "Cuadrilla Eléctrica"</p>
            <p><strong>Ejecución</strong> = columna "Responsable" (persona real, para seguimiento). Ej: "Juan Pérez", "María García"</p>
            <p><strong>Menú contextual (⚙)</strong>: Ambas vistas muestran Crear hijos, Importar, Editar y Eliminar según el nivel. En Ejecución, EDTs y Tareas tienen además "Asignar Responsable". En EDT cascadea a todas las tareas hijas.</p>
          </div>
        </CardContent>
      </Card>

      {/* Selector */}
      <div className="flex gap-2">
        <Button variant={view === 'planificacion' ? 'default' : 'outline'} onClick={() => setView('planificacion')}>
          Cronograma de Planificación
        </Button>
        <Button variant={view === 'ejecucion' ? 'default' : 'outline'} onClick={() => setView('ejecucion')}>
          Cronograma de Ejecución
        </Button>
      </div>

      {/* Vista principal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {view === 'planificacion' ? 'Planificación — Columna: Recurso (costos)' : 'Ejecución — Columna: Responsable (seguimiento)'}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {view === 'planificacion'
              ? 'Muestra el recurso del catálogo asignado para estimar costos. Nodos padre muestran ratio de tareas con recurso.'
              : 'Muestra la persona responsable de ejecutar. EDTs y Tareas tienen "Asignar Responsable" en el menú. Haz clic en ⚙ para verlo.'}
          </p>
        </CardHeader>
        <CardContent>
          {view === 'planificacion' ? <PlanificacionView nodes={SAMPLE_DATA} /> : <EjecucionView nodes={SAMPLE_DATA} />}
        </CardContent>
      </Card>

      {/* Comparativa lado a lado */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Comparativa lado a lado</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Planificación: Recurso (costos)</CardTitle>
              <p className="text-xs text-gray-400">Datos del catálogo de recursos con costo/hora</p>
            </CardHeader>
            <CardContent className="p-3"><PlanificacionView nodes={SAMPLE_DATA} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ejecución: Responsable (seguimiento)</CardTitle>
              <p className="text-xs text-gray-400">Personas reales. Clic en ⚙ de EDT/Tarea para ver "Asignar Responsable"</p>
            </CardHeader>
            <CardContent className="p-3"><EjecucionView nodes={SAMPLE_DATA} /></CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla resumen */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resumen del diseño</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Aspecto</th>
                <th className="text-center py-2 px-2">Planificación</th>
                <th className="text-center py-2 px-2">Ejecución</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Columna muestra</td>
                <td className="text-center">Recurso (catálogo)</td>
                <td className="text-center">Responsable (usuario)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">En tareas</td>
                <td className="text-center">Nombre del recurso</td>
                <td className="text-center">Nombre del usuario</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">En nodos padre</td>
                <td className="text-center">Ratio con semáforo</td>
                <td className="text-center">Ratio con semáforo</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Color en tareas</td>
                <td className="text-center"><span className="text-green-700 bg-green-50 border border-green-200 rounded px-1 text-xs">Verde</span></td>
                <td className="text-center"><span className="text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 text-xs">Azul</span></td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">Menú contextual</td>
                <td className="text-center">Crear hijos, Importar, Editar, Eliminar</td>
                <td className="text-center">+ "Asignar Responsable" en EDT y Tarea</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium">EDT cascadea?</td>
                <td className="text-center">Recurso → todas las tareas</td>
                <td className="text-center">Responsable → todas las tareas</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Actividad</td>
                <td className="text-center">Solo ratio (no se asigna)</td>
                <td className="text-center">Solo ratio (no se asigna)</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
