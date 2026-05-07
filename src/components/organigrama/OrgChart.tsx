'use client'

import React, { useRef, useCallback } from 'react'

export interface OrgNodoCompleto {
  id: string
  parentId: string | null
  orden: number
  cargoLabel: string
  esFijoGys: boolean
  cipOverride: string | null
  telefonoOverride: string | null
  empresaOverride: string | null
  user: {
    id: string
    name: string
    email: string
    empleado: { telefono: string | null; cip: string | null; cargo: { nombre: string } | null } | null
  } | null
  _telefono: string | null
  _cip: string | null
  _empresa: string
}

interface OrgChartProps {
  nodos: OrgNodoCompleto[]
  onNodoClick?: (nodo: OrgNodoCompleto) => void
}

const NODE_W = 220
const NODE_H = 110
const H_GAP = 32
const V_GAP = 60

interface LayoutNode {
  nodo: OrgNodoCompleto
  x: number
  y: number
  width: number
}

function buildLayout(nodos: OrgNodoCompleto[]): {
  nodes: LayoutNode[]
  svgWidth: number
  svgHeight: number
  edges: { x1: number; y1: number; x2: number; y2: number }[]
} {
  if (nodos.length === 0) return { nodes: [], svgWidth: 0, svgHeight: 0, edges: [] }

  const byId = Object.fromEntries(nodos.map(n => [n.id, n]))
  const children: Record<string, string[]> = {}
  for (const n of nodos) {
    const pid = n.parentId ?? '__root__'
    if (!children[pid]) children[pid] = []
    children[pid].push(n.id)
  }

  // Sort children by orden
  for (const key of Object.keys(children)) {
    children[key].sort((a, b) => (byId[a]?.orden ?? 0) - (byId[b]?.orden ?? 0))
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const widths: Record<string, number> = {}

  // Compute subtree width (bottom-up)
  function subtreeWidth(id: string): number {
    const kids = children[id] ?? []
    if (kids.length === 0) {
      widths[id] = NODE_W
      return NODE_W
    }
    const total = kids.reduce((s, k) => s + subtreeWidth(k) + H_GAP, -H_GAP)
    widths[id] = Math.max(NODE_W, total)
    return widths[id]
  }

  const roots = nodos.filter(n => !n.parentId).sort((a, b) => a.orden - b.orden)

  let totalRootWidth = roots.reduce((s, r) => s + subtreeWidth(r.id) + H_GAP, -H_GAP)
  if (roots.length === 0) totalRootWidth = 0

  // Assign positions (top-down)
  function assignPositions(id: string, centerX: number, depth: number) {
    positions[id] = { x: centerX - NODE_W / 2, y: depth * (NODE_H + V_GAP) }
    const kids = children[id] ?? []
    if (kids.length === 0) return
    const totalKidsWidth = kids.reduce((s, k) => s + widths[k] + H_GAP, -H_GAP)
    let curX = centerX - totalKidsWidth / 2
    for (const kid of kids) {
      const kidCenter = curX + widths[kid] / 2
      assignPositions(kid, kidCenter, depth + 1)
      curX += widths[kid] + H_GAP
    }
  }

  let curX = 0
  for (const root of roots) {
    assignPositions(root.id, curX + widths[root.id] / 2, 0)
    curX += widths[root.id] + H_GAP
  }

  // Normalize to 20px margin
  const allX = Object.values(positions).map(p => p.x)
  const allY = Object.values(positions).map(p => p.y)
  const minX = Math.min(...allX)
  const minY = Math.min(...allY)
  const MARGIN = 20
  for (const id of Object.keys(positions)) {
    positions[id].x -= minX - MARGIN
    positions[id].y -= minY - MARGIN
  }

  const maxX = Math.max(...Object.values(positions).map(p => p.x)) + NODE_W + MARGIN
  const maxY = Math.max(...Object.values(positions).map(p => p.y)) + NODE_H + MARGIN

  const nodes: LayoutNode[] = nodos.map(n => ({
    nodo: n,
    x: positions[n.id]?.x ?? 0,
    y: positions[n.id]?.y ?? 0,
    width: NODE_W,
  }))

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (const n of nodos) {
    if (!n.parentId) continue
    const parent = positions[n.parentId]
    const child = positions[n.id]
    if (!parent || !child) continue
    edges.push({
      x1: parent.x + NODE_W / 2,
      y1: parent.y + NODE_H,
      x2: child.x + NODE_W / 2,
      y2: child.y,
    })
  }

  return { nodes, svgWidth: maxX, svgHeight: maxY, edges }
}

function NodoCard({ node, onClick }: { node: LayoutNode; onClick?: (n: OrgNodoCompleto) => void }) {
  const { nodo, x, y } = node
  const isVacante = !nodo.user
  const isGys = nodo.esFijoGys

  const bgClass = isGys
    ? 'bg-[#2E4057] text-white border-[#2E4057]'
    : isVacante
      ? 'bg-white border-dashed border-red-300 text-gray-700'
      : 'bg-white border-gray-200 text-gray-800'

  const labelClass = isGys ? 'text-white/80' : 'text-gray-500'

  return (
    <foreignObject
      x={x}
      y={y}
      width={NODE_W}
      height={NODE_H}
      style={{ overflow: 'visible' }}
      onClick={() => onClick?.(nodo)}
    >
      <div
        className={`w-full h-full rounded-lg border-2 shadow-sm p-2.5 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between ${bgClass}`}
        style={{ width: NODE_W, height: NODE_H }}
      >
        {/* Cargo */}
        <div className={`text-[11px] font-bold uppercase tracking-wide leading-tight truncate ${isGys ? 'text-white' : 'text-indigo-700'}`}>
          {nodo.cargoLabel}
        </div>

        {isVacante ? (
          <div className="text-xs text-red-400 font-medium italic mt-1">[VACANTE]</div>
        ) : (
          <div className="space-y-0.5 mt-1">
            <div className={`text-xs font-semibold truncate ${isGys ? 'text-white' : 'text-gray-800'}`}>
              {nodo.user!.name}
            </div>
            {nodo._telefono && (
              <div className={`text-[10px] truncate ${labelClass}`}>
                Cel. {nodo._telefono}
              </div>
            )}
            {nodo._cip && (
              <div className={`text-[10px] truncate ${labelClass}`}>
                CIP N° {nodo._cip}
              </div>
            )}
            <div className={`text-[10px] truncate ${labelClass}`}>
              {nodo.user!.email}
            </div>
          </div>
        )}
      </div>
    </foreignObject>
  )
}

export default function OrgChart({ nodos, onNodoClick }: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { nodes, svgWidth, svgHeight, edges } = buildLayout(nodos)

  if (nodos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin nodos en el organigrama
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      id="org-chart-container"
      className="overflow-auto bg-gray-50 rounded-lg border"
      style={{ minHeight: 300 }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block', minWidth: svgWidth }}
      >
        {/* Connector lines */}
        {edges.map((e, i) => {
          const midY = (e.y1 + e.y2) / 2
          return (
            <path
              key={i}
              d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              fill="none"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => (
          <NodoCard key={n.nodo.id} node={n} onClick={onNodoClick} />
        ))}
      </svg>
    </div>
  )
}
