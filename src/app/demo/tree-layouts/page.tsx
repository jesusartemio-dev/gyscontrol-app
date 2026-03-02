'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Settings2, Users } from 'lucide-react'

// ============================================================
// DEMO: Opciones de layout para el árbol jerárquico
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
  personas?: number
}

const SAMPLE_DATA: DemoNode[] = [
  { id: '1', type: 'proyecto', nombre: 'INVENTARIO DE TANQUE DE BINATO', level: 0, expanded: true, hasChildren: true, childrenCount: 5, progress: 0, fechaInicio: '30 dic', fechaFin: '13 jul', horas: 3176.88 },
  { id: '2', type: 'fase', nombre: 'PLANIFICACIÓN', level: 1, expanded: true, hasChildren: true, childrenCount: 2, progress: 0, fechaInicio: '30 dic', fechaFin: '29 ene', horas: 256.5 },
  { id: '2a', type: 'edt', nombre: 'Gestión del Proyecto', level: 2, expanded: true, hasChildren: true, childrenCount: 3, progress: 15, fechaInicio: '30 dic', fechaFin: '15 ene', horas: 120 },
  { id: '2a1', type: 'actividad', nombre: 'Elaboración del Plan', level: 3, expanded: false, hasChildren: true, childrenCount: 2, progress: 30, fechaInicio: '30 dic', fechaFin: '05 ene', horas: 48 },
  { id: '2a2', type: 'actividad', nombre: 'Revisión de Documentos', level: 3, expanded: false, hasChildren: true, childrenCount: 3, progress: 0, fechaInicio: '06 ene', fechaFin: '15 ene', horas: 72 },
  { id: '2b', type: 'edt', nombre: 'Ingeniería Básica', level: 2, expanded: false, hasChildren: true, childrenCount: 4, progress: 0, fechaInicio: '15 ene', fechaFin: '29 ene', horas: 136.5 },
  { id: '3', type: 'fase', nombre: 'INGENIERIA', level: 1, expanded: false, hasChildren: true, childrenCount: 4, progress: 0, fechaInicio: '12 ene', fechaFin: '04 mar', horas: 458.38 },
  { id: '4', type: 'fase', nombre: 'LOGÍSTICA', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '13 ene', fechaFin: '13 may', horas: 836 },
  { id: '5', type: 'fase', nombre: 'EJECUCIÓN', level: 1, expanded: false, hasChildren: true, childrenCount: 2, progress: 0, fechaInicio: '02 feb', fechaFin: '17 jun', horas: 1455 },
  { id: '6', type: 'fase', nombre: 'CIERRE', level: 1, expanded: false, hasChildren: true, childrenCount: 1, progress: 0, fechaInicio: '17 jun', fechaFin: '13 jul', horas: 171 },
]

const NODE_ICONS: Record<string, string> = {
  proyecto: '📁',
  fase: '📊',
  edt: '🏗️',
  actividad: '⚡',
  tarea: '🔧',
}

const NODE_COLORS: Record<string, string> = {
  proyecto: 'bg-indigo-100 text-indigo-800',
  fase: 'bg-blue-100 text-blue-800',
  edt: 'bg-green-100 text-green-800',
  actividad: 'bg-purple-100 text-purple-800',
  tarea: 'bg-gray-100 text-gray-800',
}

const NODE_LABELS: Record<string, string> = {
  proyecto: 'Proyecto',
  fase: 'Fase',
  edt: 'EDT',
  actividad: 'Actividad',
  tarea: 'Tarea',
}

// Small progress bar component for demos
function MiniProgress({ percentage, size = 'sm' }: { percentage: number; size?: 'sm' | 'xs' }) {
  const width = size === 'xs' ? 'w-12' : 'w-16'
  return (
    <div className="flex items-center gap-1">
      <div className={`${width} h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 w-7 text-right">{percentage}%</span>
    </div>
  )
}

// ============================================================
// OPCIÓN A: Columnas alineadas (estilo tabla-árbol)
// ============================================================
function OptionA({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header de columnas */}
      <div className="grid grid-cols-[1fr_70px_60px_50px_130px_80px_32px] gap-1 px-3 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div>Nombre</div>
        <div className="text-center">Progreso</div>
        <div className="text-center">Tipo</div>
        <div className="text-center">Hijos</div>
        <div className="text-center">Fechas</div>
        <div className="text-right">Horas</div>
        <div></div>
      </div>
      {/* Filas */}
      {nodes.map(node => (
        <div
          key={node.id}
          className="grid grid-cols-[1fr_70px_60px_50px_130px_80px_32px] gap-1 items-center px-3 py-1 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          {/* Nombre con indentación */}
          <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: `${node.level * 16}px` }}>
            {node.hasChildren ? (
              node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
            ) : (
              <div className="w-3 shrink-0" />
            )}
            <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
            <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
          </div>
          {/* Progreso */}
          <div className="flex justify-center">
            <MiniProgress percentage={node.progress} size="xs" />
          </div>
          {/* Tipo */}
          <div className="flex justify-center">
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>
              {NODE_LABELS[node.type]}
            </Badge>
          </div>
          {/* Hijos */}
          <div className="text-center">
            {node.hasChildren && (
              <Badge variant="secondary" className="text-[10px] leading-none px-1 py-0 h-4">
                {node.childrenCount}
              </Badge>
            )}
          </div>
          {/* Fechas */}
          <div className="text-center text-[11px] text-gray-500">
            {node.fechaInicio}–{node.fechaFin}
          </div>
          {/* Horas */}
          <div className="text-right text-[11px] text-gray-600 font-mono">
            {node.horas}h
          </div>
          {/* Acciones */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN B: Nombre izquierda, metadatos agrupados a la derecha
// ============================================================
function OptionB({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg">
      {nodes.map(node => (
        <div
          key={node.id}
          className="flex items-center justify-between px-3 py-1 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          {/* Izquierda: nombre con indentación */}
          <div className="flex items-center gap-1 min-w-0 flex-1" style={{ paddingLeft: `${node.level * 16}px` }}>
            {node.hasChildren ? (
              node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
            ) : (
              <div className="w-3 shrink-0" />
            )}
            <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
            <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
          </div>

          {/* Derecha: metadatos agrupados */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <MiniProgress percentage={node.progress} size="xs" />
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>
              {NODE_LABELS[node.type]}
            </Badge>
            {node.hasChildren && (
              <Badge variant="secondary" className="text-[10px] leading-none px-1 py-0 h-4">
                {node.childrenCount}
              </Badge>
            )}
            <span className="text-[11px] text-gray-500 w-[110px] text-center">
              {node.fechaInicio}–{node.fechaFin}
            </span>
            <span className="text-[11px] text-gray-600 font-mono w-[70px] text-right">
              {node.horas}h
            </span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN C: Dos líneas por nodo
// ============================================================
function OptionC({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg">
      {nodes.map(node => (
        <div
          key={node.id}
          className="px-3 py-1.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
          style={{ paddingLeft: `${node.level * 16 + 12}px` }}
        >
          {/* Línea 1: nombre + tipo */}
          <div className="flex items-center gap-1.5">
            {node.hasChildren ? (
              node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
            ) : (
              <div className="w-3 shrink-0" />
            )}
            <span className="text-xs shrink-0">{NODE_ICONS[node.type]}</span>
            <span className="text-sm font-medium text-gray-900 truncate">{node.nombre}</span>
            <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-4 ${NODE_COLORS[node.type]}`}>
              {NODE_LABELS[node.type]}
            </Badge>
            {node.hasChildren && (
              <Badge variant="secondary" className="text-[10px] leading-none px-1 py-0 h-4">
                {node.childrenCount}
              </Badge>
            )}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {/* Línea 2: metadatos */}
          <div className="flex items-center gap-3 ml-7 mt-0.5">
            <MiniProgress percentage={node.progress} size="xs" />
            <span className="text-[11px] text-gray-400">
              {node.fechaInicio}–{node.fechaFin}
            </span>
            <span className="text-[11px] text-gray-400">
              {node.horas}h
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// OPCIÓN D: Híbrido - nombre izq + metadatos derecha con ancho fijo
// ============================================================
function OptionD({ nodes }: { nodes: DemoNode[] }) {
  return (
    <div className="border rounded-lg">
      {nodes.map(node => {
        // Color dot en lugar de badge con texto
        const dotColors: Record<string, string> = {
          proyecto: 'bg-indigo-500',
          fase: 'bg-blue-500',
          edt: 'bg-green-500',
          actividad: 'bg-purple-500',
          tarea: 'bg-gray-500',
        }

        return (
          <div
            key={node.id}
            className="flex items-center px-3 py-1 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            {/* Izquierda: árbol + nombre */}
            <div className="flex items-center gap-1 min-w-0 flex-1" style={{ paddingLeft: `${node.level * 16}px` }}>
              {node.hasChildren ? (
                node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
              ) : (
                <div className="w-3 shrink-0" />
              )}
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColors[node.type]}`} title={NODE_LABELS[node.type]} />
              <span className="text-xs font-medium text-gray-900 truncate">{node.nombre}</span>
              {node.hasChildren && (
                <span className="text-[10px] text-gray-400 shrink-0">({node.childrenCount})</span>
              )}
            </div>

            {/* Derecha: metadatos con anchos fijos */}
            <div className="flex items-center shrink-0 gap-0">
              <div className="w-[72px] flex justify-center">
                <MiniProgress percentage={node.progress} size="xs" />
              </div>
              <div className="w-[100px] text-center text-[11px] text-gray-500">
                {node.fechaInicio}–{node.fechaFin}
              </div>
              <div className="w-[65px] text-right text-[11px] text-gray-600 font-mono">
                {node.horas}h
              </div>
              <div className="w-[28px] flex justify-center">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function TreeLayoutsDemo() {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D'>('A')

  const options = [
    { key: 'A' as const, label: 'Columnas Alineadas', desc: 'Estilo tabla con header de columnas' },
    { key: 'B' as const, label: 'Metadatos a la Derecha', desc: 'Nombre izquierda, datos agrupados derecha' },
    { key: 'C' as const, label: 'Dos Líneas', desc: 'Nombre arriba, metadatos abajo' },
    { key: 'D' as const, label: 'Híbrido Compacto', desc: 'Dot de color + anchos fijos, sin badge de tipo' },
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo: Layouts del Árbol Jerárquico</h1>
        <p className="text-gray-500 mt-1">Compara las 4 opciones de layout para el cronograma.</p>
      </div>

      {/* Selector de opciones */}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <Button
            key={opt.key}
            variant={selectedOption === opt.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedOption(opt.key)}
          >
            Opción {opt.key}: {opt.label}
          </Button>
        ))}
      </div>

      {/* Descripción */}
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

      {/* Vista comparativa: todas juntas */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Comparativa lado a lado</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">A: Columnas Alineadas</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <OptionA nodes={SAMPLE_DATA} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">B: Metadatos a la Derecha</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <OptionB nodes={SAMPLE_DATA} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">C: Dos Líneas</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <OptionC nodes={SAMPLE_DATA} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">D: Híbrido Compacto</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <OptionD nodes={SAMPLE_DATA} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla comparativa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativa de Características</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Característica</th>
                <th className="text-center py-2 px-2">A: Columnas</th>
                <th className="text-center py-2 px-2">B: Derecha</th>
                <th className="text-center py-2 px-2">C: Dos líneas</th>
                <th className="text-center py-2 px-2">D: Híbrido</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Alineación vertical</td>
                <td className="text-center py-2">Excelente</td>
                <td className="text-center py-2">Buena</td>
                <td className="text-center py-2">Regular</td>
                <td className="text-center py-2">Muy buena</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Compacidad vertical</td>
                <td className="text-center py-2">Alta</td>
                <td className="text-center py-2">Alta</td>
                <td className="text-center py-2">Baja</td>
                <td className="text-center py-2">Alta</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Legibilidad del nombre</td>
                <td className="text-center py-2">Buena</td>
                <td className="text-center py-2">Muy buena</td>
                <td className="text-center py-2">Excelente</td>
                <td className="text-center py-2">Muy buena</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Escaneo rápido de datos</td>
                <td className="text-center py-2">Excelente</td>
                <td className="text-center py-2">Buena</td>
                <td className="text-center py-2">Regular</td>
                <td className="text-center py-2">Muy buena</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Uso en pantalla pequeña</td>
                <td className="text-center py-2">Regular</td>
                <td className="text-center py-2">Buena</td>
                <td className="text-center py-2">Buena</td>
                <td className="text-center py-2">Buena</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Identificación de tipo</td>
                <td className="text-center py-2">Badge texto</td>
                <td className="text-center py-2">Badge texto</td>
                <td className="text-center py-2">Badge texto</td>
                <td className="text-center py-2">Dot color</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
