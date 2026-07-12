import { buildLayout, NORMAL_DIMS, DOCUMENTO_DIMS, type OrgNodoCompleto } from '@/components/organigrama/OrgChart'

function nodo(id: string, parentId: string | null, orden = 0): OrgNodoCompleto {
  return {
    id, parentId, orden, cargoLabel: 'Cargo', esFijoGys: false,
    cipOverride: null, telefonoOverride: null, empresaOverride: null,
    user: { id, name: `Persona ${id}`, email: `${id}@gys.com`, empleado: null },
    _telefono: null, _cip: null, _empresa: 'GYS',
  }
}

// Árbol representativo: 1 raíz + 3 hijos, cada uno con 2 hijos propios (13 nodos totales, como G300).
const NODOS: OrgNodoCompleto[] = [
  nodo('root', null),
  nodo('a', 'root', 0), nodo('b', 'root', 1), nodo('c', 'root', 2),
  nodo('a1', 'a', 0), nodo('a2', 'a', 1),
  nodo('b1', 'b', 0), nodo('b2', 'b', 1),
  nodo('c1', 'c', 0), nodo('c2', 'c', 1),
]

describe('DOCUMENTO_DIMS — espaciado compacto para el export a Word', () => {
  it('reduce el gap horizontal y vertical frente a NORMAL_DIMS', () => {
    expect(DOCUMENTO_DIMS.H_GAP).toBeLessThan(NORMAL_DIMS.H_GAP)
    expect(DOCUMENTO_DIMS.V_GAP).toBeLessThan(NORMAL_DIMS.V_GAP)
  })

  it('ensancha levemente las cajas sin achicar el alto (mismo contenido: cargo/nombre/tel/CIP/correo)', () => {
    expect(DOCUMENTO_DIMS.NODE_W).toBeGreaterThan(NORMAL_DIMS.NODE_W)
    expect(DOCUMENTO_DIMS.NODE_H).toBe(NORMAL_DIMS.NODE_H)
  })

  // NOTA: el layout compacto reduce el ancho (menos hermanos empujados a los
  // extremos), pero el ALTO ya no se garantiza menor que el editor — la
  // compactación por contorno impone un V_GAP mínimo (~40% de NODE_H, ver
  // GAP_H_MIN_PROP/GAP_V_MIN_PROP en OrgChart.tsx) para que el codo del
  // conector sea visible, y ese mínimo puede terminar siendo MAYOR que el
  // V_GAP del editor (bug real detectado tras la primera versión del
  // compactado: cajas/niveles quedaban borde con borde, sin espacio para
  // dibujar los conectores).
  it('la separación vertical entre padre e hijo respeta el mínimo proporcional (≥40% de NODE_H) aunque sea mayor que la del editor', () => {
    const documento = buildLayout(NODOS, DOCUMENTO_DIMS)
    const root = documento.nodes.find(n => n.nodo.id === 'root')!
    const hijoA = documento.nodes.find(n => n.nodo.id === 'a')!
    const gap = hijoA.y - (root.y + root.dims.NODE_H)
    expect(gap).toBeGreaterThanOrEqual(DOCUMENTO_DIMS.NODE_H * 0.4)
  })

  it('dos hermanos simples (sin hijos) quedan separados por EXACTAMENTE el mínimo proporcional (≥15% de NODE_W) — ni pegados ni con hueco de más', () => {
    const dosHermanos: OrgNodoCompleto[] = [nodo('root', null), nodo('x', 'root', 0), nodo('y', 'root', 1)]
    const documento = buildLayout(dosHermanos, DOCUMENTO_DIMS)
    const x = documento.nodes.find(n => n.nodo.id === 'x')!
    const y = documento.nodes.find(n => n.nodo.id === 'y')!
    const gap = y.x - (x.x + DOCUMENTO_DIMS.NODE_W)
    const minimoEsperado = DOCUMENTO_DIMS.NODE_W * 0.15
    expect(gap).toBeCloseTo(minimoEsperado, 0)
    expect(gap).toBeGreaterThan(0) // nunca bordes tocándose
  })
})

// ── Empaquetado compacto (tidy-tree / Reingold-Tilford) — árboles desbalanceados ──
// Caso real que motivó el fix: un organigrama con una rama muy profunda
// (ej. "Operaciones", con varios niveles de reportes) y ramas hoja de 1 solo
// nodo (ej. "Comercial", "SSOMA") — bajo el algoritmo clásico, las hojas
// quedan empujadas a los extremos del lienzo porque el ancho reservado para
// la rama profunda es un rectángulo monolítico igual a su fila MÁS ANCHA,
// ocupado en TODA su extensión vertical (no solo donde de verdad hace falta).
function ocupacionNivel1(layout: ReturnType<typeof buildLayout>, nodos: OrgNodoCompleto[], nodeW: number): number {
  const nivel1 = layout.nodes.filter(n => {
    const p = nodos.find(x => x.id === n.nodo.parentId)
    return n.nodo.parentId !== null && (!p || p.parentId === null)
  })
  return (nivel1.length * nodeW) / layout.svgWidth
}

describe('Empaquetado compacto — árbol MODERADAMENTE desbalanceado (2 ramas con 3 hijos + 2 hojas)', () => {
  const NODOS_MODERADO: OrgNodoCompleto[] = [
    nodo('root', null),
    nodo('comercial', 'root', 0), nodo('operaciones', 'root', 1), nodo('tecnica', 'root', 2), nodo('ssoma', 'root', 3),
    nodo('op0', 'operaciones', 0), nodo('op1', 'operaciones', 1), nodo('op2', 'operaciones', 2),
    nodo('te0', 'tecnica', 0), nodo('te1', 'tecnica', 1), nodo('te2', 'tecnica', 2),
  ]

  it('cumple el criterio de aceptación medible (≥55% de ocupación en la fila de nivel 1)', () => {
    const layout = buildLayout(NODOS_MODERADO, DOCUMENTO_DIMS)
    const ocupacion = ocupacionNivel1(layout, NODOS_MODERADO, DOCUMENTO_DIMS.NODE_W)
    expect(ocupacion).toBeGreaterThanOrEqual(0.55)
  })

  it('mejora sustancialmente la ocupación frente al algoritmo clásico (mismo árbol)', () => {
    const clasico = ocupacionNivel1(buildLayout(NODOS_MODERADO, NORMAL_DIMS), NODOS_MODERADO, NORMAL_DIMS.NODE_W)
    const compacto = ocupacionNivel1(buildLayout(NODOS_MODERADO, DOCUMENTO_DIMS), NODOS_MODERADO, DOCUMENTO_DIMS.NODE_W)
    expect(compacto).toBeGreaterThan(clasico)
  })

  it('los hermanos hoja quedan pegados a la rama vecina (gap ≈ H_GAP), no en los extremos del lienzo', () => {
    const layout = buildLayout(NODOS_MODERADO, DOCUMENTO_DIMS)
    const comercial = layout.nodes.find(n => n.nodo.id === 'comercial')!
    const operaciones = layout.nodes.find(n => n.nodo.id === 'operaciones')!
    // El gap entre el borde derecho de Comercial y el borde izquierdo de la
    // caja de Operaciones (su propio nodo, no su subárbol) debe ser chico —
    // bajo el algoritmo clásico este gap podía ser de cientos de px.
    const gap = operaciones.x - (comercial.x + DOCUMENTO_DIMS.NODE_W)
    expect(Math.abs(gap)).toBeLessThan(DOCUMENTO_DIMS.NODE_W) // muy por debajo de un ancho de caja completo
  })
})

describe('Empaquetado compacto — árbol EXTREMADAMENTE desbalanceado (1 rama con 12 nietos + 2 hojas)', () => {
  // Caso límite: una sola rama domina el ancho total del lienzo (su fila más
  // ancha, no las hojas vecinas, determina el ancho del documento) — acá el
  // empaquetado de hermanos por sí solo tiene un techo real: no puede
  // encoger contenido que genuinamente necesita ese espacio en una fila más
  // profunda. Documentado explícitamente: si el organigrama real resulta así
  // de desbalanceado, compactar hermanos ayuda pero puede no bastar para
  // llegar al 55% — el siguiente lever sería envolver (wrap) la fila más
  // ancha en 2+ filas, cambio no incluido en este fix.
  const NODOS_EXTREMO: OrgNodoCompleto[] = (() => {
    const nodos: OrgNodoCompleto[] = [nodo('root', null)]
    nodos.push(nodo('comercial', 'root', 0))
    nodos.push(nodo('operaciones', 'root', 1))
    nodos.push(nodo('ssoma', 'root', 2))
    for (let g = 0; g < 4; g++) {
      nodos.push(nodo(`ger${g}`, 'operaciones', g))
      for (let r = 0; r < 3; r++) nodos.push(nodo(`ger${g}_r${r}`, `ger${g}`, r))
    }
    return nodos
  })()

  it('igual mejora la ocupación de forma medible frente al clásico, aunque no alcance el 55% en este caso límite', () => {
    const clasico = ocupacionNivel1(buildLayout(NODOS_EXTREMO, NORMAL_DIMS), NODOS_EXTREMO, NORMAL_DIMS.NODE_W)
    const compacto = ocupacionNivel1(buildLayout(NODOS_EXTREMO, DOCUMENTO_DIMS), NODOS_EXTREMO, DOCUMENTO_DIMS.NODE_W)
    expect(compacto).toBeGreaterThan(clasico)
  })

  it('nunca produce colisiones: dos nodos en la misma fila (misma profundidad) nunca se superponen en X', () => {
    const layout = buildLayout(NODOS_EXTREMO, DOCUMENTO_DIMS)
    const porFila = new Map<number, typeof layout.nodes>()
    layout.nodes.forEach(n => {
      const arr = porFila.get(n.y) ?? []
      arr.push(n)
      porFila.set(n.y, arr)
    })
    porFila.forEach(filaNodos => {
      const ordenados = [...filaNodos].sort((a, b) => a.x - b.x)
      for (let i = 1; i < ordenados.length; i++) {
        expect(ordenados[i].x).toBeGreaterThanOrEqual(ordenados[i - 1].x + DOCUMENTO_DIMS.NODE_W)
      }
    })
  })
})
