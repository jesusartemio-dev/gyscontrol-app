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

  it('para el mismo árbol, el layout compacto ocupa menos alto total que el del editor (mismos niveles, menos gap acumulado)', () => {
    const normal = buildLayout(NODOS, NORMAL_DIMS)
    const documento = buildLayout(NODOS, DOCUMENTO_DIMS)
    expect(documento.svgHeight).toBeLessThan(normal.svgHeight)
  })

  it('la separación vertical entre un padre y su hijo es menor en modo documento', () => {
    const normal = buildLayout(NODOS, NORMAL_DIMS)
    const documento = buildLayout(NODOS, DOCUMENTO_DIMS)
    const gapEntreNiveles = (layout: ReturnType<typeof buildLayout>) => {
      const root = layout.nodes.find(n => n.nodo.id === 'root')!
      const hijoA = layout.nodes.find(n => n.nodo.id === 'a')!
      return hijoA.y - (root.y + root.dims.NODE_H)
    }
    expect(gapEntreNiveles(documento)).toBeLessThan(gapEntreNiveles(normal))
  })
})
