import type { OrgNodoContexto } from '@/types/planTrabajo'
import type { OrgNodoCompleto } from '@/components/organigrama/OrgChart'

function adaptarNodos(nodos: OrgNodoContexto[]): OrgNodoCompleto[] {
  return nodos.map(n => ({
    id: n.id,
    parentId: n.parentId,
    orden: n.orden,
    cargoLabel: n.cargoLabel,
    esFijoGys: n.esFijoGys,
    cipOverride: n.cipOverride,
    telefonoOverride: n.telefonoOverride,
    empresaOverride: n.empresaOverride,
    user: n.user
      ? {
          id: n.user.id,
          name: n.user.name ?? '',
          email: n.user.email,
          empleado: n.user.empleado
            ? { telefono: n.user.empleado.telefono, cip: n.user.empleado.cip, cargo: null }
            : null,
        }
      : null,
    _telefono: n.telefonoOverride ?? n.user?.empleado?.telefono ?? null,
    _cip: n.cipOverride ?? n.user?.empleado?.cip ?? null,
    _empresa: n.empresaOverride ?? 'GYS',
  }))
}

export async function generarOrganigramaPng(nodos: OrgNodoContexto[]): Promise<string> {
  const { buildLayout, NORMAL_DIMS } = await import('@/components/organigrama/OrgChart')

  const nodosAdaptados = adaptarNodos(nodos)
  const { nodes, edges, svgWidth, svgHeight } = buildLayout(nodosAdaptados, NORMAL_DIMS)
  const { NODE_W, NODE_H } = NORMAL_DIMS
  const SCALE = 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(svgWidth * SCALE, 1)
  canvas.height = Math.max(svgHeight * SCALE, 1)
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // Background + dot grid
  ctx.fillStyle = '#F8FAFC'
  ctx.fillRect(0, 0, svgWidth, svgHeight)
  ctx.fillStyle = '#CBD5E1'
  for (let gx = 0; gx < svgWidth; gx += 24)
    for (let gy = 0; gy < svgHeight; gy += 24) {
      ctx.beginPath(); ctx.arc(gx + 1, gy + 1, 1, 0, Math.PI * 2); ctx.fill()
    }

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // Edges
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 1.5
  for (const e of edges) {
    const midY = (e.y1 + e.y2) / 2
    ctx.beginPath()
    ctx.moveTo(e.x1, e.y1)
    ctx.bezierCurveTo(e.x1, midY, e.x2, midY, e.x2, e.y2)
    ctx.stroke()
  }

  // Nodes
  const HDR = 34
  for (const n of nodes) {
    const { x, y, nodo } = n
    const isGys = nodo.esFijoGys
    const isVacant = !nodo.user

    ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2
    ctx.fillStyle = isGys ? '#2E4057' : '#FFFFFF'
    rr(x, y, NODE_W, NODE_H, 8); ctx.fill()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

    ctx.strokeStyle = isGys ? '#1e2d3d' : isVacant ? '#FCA5A5' : '#E5E7EB'
    ctx.lineWidth = isVacant ? 1.5 : 2
    if (isVacant) ctx.setLineDash([6, 3])
    rr(x, y, NODE_W, NODE_H, 8); ctx.stroke()
    ctx.setLineDash([])

    ctx.save()
    rr(x, y, NODE_W, NODE_H, 8); ctx.clip()
    ctx.fillStyle = isGys ? '#243347' : isVacant ? '#FEF2F2' : '#F8FAFC'
    ctx.fillRect(x, y, NODE_W, HDR)
    ctx.restore()

    ctx.strokeStyle = isGys ? '#1e2d3d' : isVacant ? '#FCA5A5' : '#E5E7EB'
    ctx.lineWidth = 1; ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(x, y + HDR); ctx.lineTo(x + NODE_W, y + HDR); ctx.stroke()

    ctx.fillStyle = isGys ? '#C7D2FE' : isVacant ? '#F87171' : '#4F46E5'
    ctx.font = 'bold 9px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(nodo.cargoLabel, x + NODE_W / 2, y + 21, NODE_W - 12)

    if (isVacant) {
      ctx.fillStyle = '#F87171'
      ctx.font = 'bold italic 11px system-ui, sans-serif'
      ctx.fillText('VACANTE', x + NODE_W / 2, y + HDR + (NODE_H - HDR) / 2 + 4)
    } else {
      ctx.fillStyle = isGys ? '#FFFFFF' : '#1F2937'
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillText(nodo.user!.name ?? '', x + NODE_W / 2, y + 58, NODE_W - 12)

      ctx.fillStyle = isGys ? '#A5B4FC' : '#9CA3AF'
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'left'
      let dy = y + 74
      if (nodo._telefono) { ctx.fillText(`Tel: ${nodo._telefono}`, x + 8, dy, NODE_W - 16); dy += 13 }
      if (nodo._cip) { ctx.fillText(`CIP ${nodo._cip}`, x + 8, dy, NODE_W - 16); dy += 13 }
      ctx.fillStyle = isGys ? '#A5B4FC' : '#D1D5DB'
      ctx.fillText(nodo.user!.email, x + 8, dy, NODE_W - 16)
    }
  }

  return canvas.toDataURL('image/png')
}
