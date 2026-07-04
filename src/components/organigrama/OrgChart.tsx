'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

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
  compact?: boolean
}

interface ChartDims {
  NODE_W: number
  NODE_H: number
  H_GAP: number
  V_GAP: number
  MAX_COLS: number       // max children per row before wrapping
  WRAP_FROM_DEPTH: number // apply MAX_COLS only at depth >= this (0 = always)
  isCompact: boolean
}

export const NORMAL_DIMS: ChartDims = { NODE_W: 145, NODE_H: 112, H_GAP: 6, V_GAP: 22, MAX_COLS: 2, WRAP_FROM_DEPTH: 1, isCompact: false }
const COMPACT_DIMS: ChartDims = { NODE_W: 130, NODE_H: 64, H_GAP: 6, V_GAP: 24, MAX_COLS: 999, WRAP_FROM_DEPTH: 0, isCompact: true }

export interface LayoutNode {
  nodo: OrgNodoCompleto
  x: number
  y: number
  width: number
  dims: ChartDims
}

export function buildLayout(nodos: OrgNodoCompleto[], dims: ChartDims): {
  nodes: LayoutNode[]
  svgWidth: number
  svgHeight: number
  edges: { x1: number; y1: number; x2: number; y2: number; midY: number }[]
} {
  const { NODE_W, NODE_H, H_GAP, V_GAP, MAX_COLS, WRAP_FROM_DEPTH } = dims
  if (nodos.length === 0) return { nodes: [], svgWidth: 0, svgHeight: 0, edges: [] }

  const byId = Object.fromEntries(nodos.map(n => [n.id, n]))
  const children: Record<string, string[]> = {}
  for (const n of nodos) {
    const pid = n.parentId ?? '__root__'
    if (!children[pid]) children[pid] = []
    children[pid].push(n.id)
  }
  for (const key of Object.keys(children)) {
    children[key].sort((a, b) => (byId[a]?.orden ?? 0) - (byId[b]?.orden ?? 0))
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const widths: Record<string, number> = {}

  // Compute subtree width. Wrapping only happens when ALL children are leaf nodes — if any
  // child has its own children, siblings stay in one row to preserve the org hierarchy.
  function subtreeWidth(id: string, depth: number): number {
    const kids = children[id] ?? []
    if (kids.length === 0) { widths[id] = NODE_W; return NODE_W }
    kids.forEach(k => subtreeWidth(k, depth + 1))
    const anyKidHasChildren = kids.some(k => (children[k] ?? []).length > 0)
    const effectiveCols = (depth < WRAP_FROM_DEPTH || anyKidHasChildren) ? 9999 : MAX_COLS
    const cols = Math.min(kids.length, effectiveCols)
    const rows = Math.ceil(kids.length / cols)
    let maxRowW = 0
    for (let r = 0; r < rows; r++) {
      const rowKids = kids.slice(r * cols, (r + 1) * cols)
      const rowW = rowKids.reduce((s, k) => s + widths[k] + H_GAP, -H_GAP)
      maxRowW = Math.max(maxRowW, rowW)
    }
    widths[id] = Math.max(NODE_W, maxRowW)
    return widths[id]
  }

  const roots = nodos.filter(n => !n.parentId).sort((a, b) => a.orden - b.orden)
  roots.forEach(r => subtreeWidth(r.id, 0))

  // Place nodes. minChildY prevents a node's children from starting above a sibling-wrap row,
  // which would cause overlapping nodes (e.g. CADISTA wrap-row vs SUPERVISOR's children).
  function assignPositions(id: string, centerX: number, startY: number, depth: number, minChildY = 0) {
    positions[id] = { x: centerX - NODE_W / 2, y: startY }
    const kids = children[id] ?? []
    if (kids.length === 0) return
    const anyKidHasChildren = kids.some(k => (children[k] ?? []).length > 0)
    const effectiveCols = (depth < WRAP_FROM_DEPTH || anyKidHasChildren) ? 9999 : MAX_COLS
    const cols = Math.min(kids.length, effectiveCols)
    const rows = Math.ceil(kids.length / cols)
    const childBaseY = Math.max(startY + NODE_H + V_GAP, minChildY)
    // Bottom of the last sibling row — grandchildren must start below this
    const lastRowY = childBaseY + (rows - 1) * (NODE_H + V_GAP)
    const kidMinChildY = lastRowY + NODE_H + V_GAP
    for (let r = 0; r < rows; r++) {
      const rowKids = kids.slice(r * cols, (r + 1) * cols)
      const rowW = rowKids.reduce((s, k) => s + widths[k] + H_GAP, -H_GAP)
      const rowY = childBaseY + r * (NODE_H + V_GAP)
      let curX = centerX - rowW / 2
      for (const kid of rowKids) {
        assignPositions(kid, curX + widths[kid] / 2, rowY, depth + 1, kidMinChildY)
        curX += widths[kid] + H_GAP
      }
    }
  }

  let curX = 0
  for (const root of roots) {
    assignPositions(root.id, curX + widths[root.id] / 2, 0, 0, 0)
    curX += widths[root.id] + H_GAP
  }

  const allX = Object.values(positions).map(p => p.x)
  const allY = Object.values(positions).map(p => p.y)
  const minX = Math.min(...allX)
  const minY = Math.min(...allY)
  const MARGIN = 16
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
    dims,
  }))

  const edges: { x1: number; y1: number; x2: number; y2: number; midY: number }[] = []
  for (const n of nodos) {
    if (!n.parentId) continue
    const parent = positions[n.parentId]
    const child = positions[n.id]
    if (!parent || !child) continue
    const y2 = child.y
    edges.push({
      x1: parent.x + NODE_W / 2,
      y1: parent.y + NODE_H,
      x2: child.x + NODE_W / 2,
      y2,
      // Connector turns just above the child node (inside the V_GAP space)
      // so it never passes through sibling wrap-row nodes at intermediate Y levels
      midY: y2 - V_GAP / 2,
    })
  }

  return { nodes, svgWidth: maxX, svgHeight: maxY, edges }
}

function NodoCard({ node, onClick }: { node: LayoutNode; onClick?: (n: OrgNodoCompleto) => void }) {
  const { nodo, x, y, dims } = node
  const { NODE_W, NODE_H } = dims
  const isVacante = !nodo.user
  const isCompact = dims.isCompact

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
        style={{ width: NODE_W, height: NODE_H }}
        className={[
          'rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-150 flex flex-col',
          'hover:shadow-md hover:scale-[1.02]',
          isVacante
            ? 'bg-white border-dashed border-red-300 text-gray-600'
            : 'bg-white border-gray-200 text-gray-800',
        ].join(' ')}
      >
        <div
          className={[
            isCompact ? 'px-2 pt-1.5 pb-1 rounded-t-md' : 'px-3 pt-2.5 pb-1.5 rounded-t-[10px]',
            isVacante ? 'bg-red-50' : 'bg-slate-50',
          ].join(' ')}
        >
          <div
            className={[
              'font-bold uppercase tracking-widest leading-tight truncate',
              isCompact ? 'text-[8px]' : 'text-[10px]',
              isVacante ? 'text-red-400' : 'text-indigo-600',
            ].join(' ')}
          >
            {nodo.cargoLabel}
          </div>
        </div>

        <div className={`${isCompact ? 'px-2 py-1' : 'px-3 py-2'} flex-1 flex flex-col justify-center`}>
          {isVacante ? (
            <div className="flex items-center gap-1">
              <div className={`rounded-full bg-red-400 animate-pulse ${isCompact ? 'h-1 w-1' : 'h-1.5 w-1.5'}`} />
              <span className={`text-red-400 font-semibold italic ${isCompact ? 'text-[8px]' : 'text-xs'}`}>
                VACANTE
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className={`font-semibold truncate leading-tight text-gray-800 ${isCompact ? 'text-[10px]' : 'text-[13px]'}`}>
                {nodo.user!.name}
              </div>
              {!isCompact && (
                <>
                  {nodo._telefono && (
                    <div className="text-[10px] truncate text-gray-400">
                      Tel: {nodo._telefono}
                    </div>
                  )}
                  {nodo._cip && (
                    <div className="text-[10px] truncate text-gray-400">
                      CIP {nodo._cip}
                    </div>
                  )}
                  <div className="text-[10px] truncate text-gray-400">
                    {nodo.user!.email}
                  </div>
                </>
              )}
            </div>
          )}
          {!isCompact && (
            <div className="text-[9px] text-gray-300 truncate mt-1 uppercase tracking-wide">
              {nodo._empresa}
            </div>
          )}
        </div>
      </div>
    </foreignObject>
  )
}

function SvgContent({ nodes, edges, svgWidth, svgHeight, onNodoClick }: {
  nodes: LayoutNode[]
  edges: { x1: number; y1: number; x2: number; y2: number; midY: number }[]
  svgWidth: number
  svgHeight: number
  onNodoClick?: (n: OrgNodoCompleto) => void
}) {
  return (
    <>
      <defs>
        <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#CBD5E1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width={svgWidth} height={svgHeight} fill="url(#dotgrid)" />
      {edges.map((e, i) => {
        return (
          <path
            key={i}
            d={`M ${e.x1} ${e.y1} L ${e.x1} ${e.midY} L ${e.x2} ${e.midY} L ${e.x2} ${e.y2}`}
            stroke="#94A3B8"
            strokeWidth={1.5}
            fill="none"
          />
        )
      })}
      {nodes.map(n => (
        <NodoCard key={n.nodo.id} node={n} onClick={onNodoClick} />
      ))}
    </>
  )
}

export default function OrgChart({ nodos, onNodoClick, compact }: OrgChartProps) {
  const dims = compact ? COMPACT_DIMS : NORMAL_DIMS
  const { nodes, svgWidth, svgHeight, edges } = buildLayout(nodos, dims)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Compact mode: auto-scale to fit width ────────────────────────────────
  const [compactScale, setCompactScale] = useState(1)
  useEffect(() => {
    if (!compact) return
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      setCompactScale(w > 0 && svgWidth > w ? w / svgWidth : 1)
    }
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [svgWidth, compact])

  // ── Normal mode: pan & zoom state ────────────────────────────────────────
  const [transform, setTransform] = useState({ zoom: 1, panX: 0, panY: 0 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const [dragging, setDragging] = useState(false)

  // Refs for values needed in non-React callbacks
  const containerSizeRef = useRef({ w: 0, h: 0 })
  const svgDimsRef = useRef({ w: svgWidth, h: svgHeight })
  svgDimsRef.current = { w: svgWidth, h: svgHeight }

  const dragDistRef = useRef(0)
  const justDraggedRef = useRef(false)
  const prevSvgRef = useRef({ w: 0, h: 0 })

  // Track container size
  useEffect(() => {
    if (compact) return
    const el = containerRef.current
    if (!el) return
    const update = () => {
      containerSizeRef.current = { w: el.clientWidth, h: el.clientHeight }
    }
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [compact])

  // Fit all nodes into the visible area
  const fitToScreen = useCallback(() => {
    const { w, h } = containerSizeRef.current
    const { w: sw, h: sh } = svgDimsRef.current
    if (!w || !h || !sw || !sh) return
    const margin = 48
    const newZoom = Math.min((w - margin) / sw, (h - margin) / sh, 1)
    setTransform({
      zoom: newZoom,
      panX: (w - sw * newZoom) / 2,
      panY: (h - sh * newZoom) / 2,
    })
  }, [])

  // Auto-fit when the diagram changes
  useEffect(() => {
    if (compact) return
    if (svgWidth !== prevSvgRef.current.w || svgHeight !== prevSvgRef.current.h) {
      prevSvgRef.current = { w: svgWidth, h: svgHeight }
      const t = setTimeout(fitToScreen, 60)
      return () => clearTimeout(t)
    }
  }, [svgWidth, svgHeight, compact, fitToScreen])

  // Zoom with mouse wheel, centered on cursor
  useEffect(() => {
    if (compact) return
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { zoom, panX, panY } = transformRef.current
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newZoom = Math.min(3, Math.max(0.15, zoom * factor))
      setTransform({
        zoom: newZoom,
        panX: cx - (cx - panX) * (newZoom / zoom),
        panY: cy - (cy - panY) * (newZoom / zoom),
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [compact])

  // Drag-to-pan with global mouse tracking so drag works outside SVG
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (compact || e.button !== 0) return
    e.preventDefault()
    dragDistRef.current = 0
    setDragging(true)
    let lastX = e.clientX
    let lastY = e.clientY

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX
      const dy = ev.clientY - lastY
      dragDistRef.current += Math.abs(dx) + Math.abs(dy)
      lastX = ev.clientX
      lastY = ev.clientY
      setTransform(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }))
    }

    const onUp = () => {
      justDraggedRef.current = dragDistRef.current > 5
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Suppress node click after a drag
  const handleClickCapture = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.stopPropagation()
      justDraggedRef.current = false
    }
  }

  // Zoom button: zoom centered on the container
  const zoomAtCenter = (factor: number) => {
    const { w, h } = containerSizeRef.current
    setTransform(prev => {
      const newZoom = Math.min(3, Math.max(0.15, prev.zoom * factor))
      return {
        zoom: newZoom,
        panX: w / 2 - (w / 2 - prev.panX) * (newZoom / prev.zoom),
        panY: h / 2 - (h / 2 - prev.panY) * (newZoom / prev.zoom),
      }
    })
  }

  if (nodos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin nodos en el organigrama
      </div>
    )
  }

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (compact) {
    const scaledH = Math.ceil(svgHeight * compactScale)
    return (
      <div
        ref={containerRef}
        id="org-chart-container"
        className="bg-slate-50"
        style={{ minHeight: 200, height: scaledH, overflow: 'hidden' }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            display: 'block',
            transform: compactScale < 1 ? `scale(${compactScale})` : undefined,
            transformOrigin: 'top left',
          }}
        >
          <SvgContent nodes={nodes} edges={edges} svgWidth={svgWidth} svgHeight={svgHeight} onNodoClick={onNodoClick} />
        </svg>
      </div>
    )
  }

  // ── Normal mode with pan & zoom ───────────────────────────────────────────
  const { zoom, panX, panY } = transform

  return (
    <div
      ref={containerRef}
      id="org-chart-container"
      className="relative bg-slate-50 select-none"
      style={{ minHeight: 400, height: '100%', overflow: 'hidden' }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          display: 'block',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'top left',
          cursor: dragging ? 'grabbing' : 'grab',
          willChange: 'transform',
        }}
        onMouseDown={handleSvgMouseDown}
        onClickCapture={handleClickCapture}
      >
        <SvgContent nodes={nodes} edges={edges} svgWidth={svgWidth} svgHeight={svgHeight} onNodoClick={onNodoClick} />
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-white rounded-lg shadow-md border border-gray-200 p-1">
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          title="Alejar (también con rueda del ratón)"
          onClick={() => zoomAtCenter(0.8)}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] text-gray-400 font-mono w-10 text-center select-none tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          title="Acercar (también con rueda del ratón)"
          onClick={() => zoomAtCenter(1.25)}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          title="Ajustar a pantalla"
          onClick={fitToScreen}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
