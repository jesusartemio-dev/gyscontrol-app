import { buildLayout, elegirDimsDocumento, DOCUMENTO_DIMS, DOCUMENTO_DIMS_ANCHO, type OrgNodoCompleto } from '@/components/organigrama/OrgChart'

function nodo(id: string, parentId: string | null, orden = 0): OrgNodoCompleto {
  return {
    id, parentId, orden, cargoLabel: 'Cargo', esFijoGys: false,
    cipOverride: null, telefonoOverride: null, empresaOverride: null,
    user: { id, name: `Persona ${id}`, email: `${id}@gys.com`, empleado: null },
    _telefono: null, _cip: null, _empresa: 'GYS',
  }
}

describe('elegirDimsDocumento', () => {
  it('un árbol angosto y profundo (una cadena lineal) da un aspect ratio <1.6 y usa DOCUMENTO_DIMS_ANCHO', () => {
    // Cadena de 6 niveles, 1 nodo por nivel — necesariamente mucho más alto que ancho.
    const cadena: OrgNodoCompleto[] = [nodo('n0', null)]
    for (let i = 1; i < 6; i++) cadena.push(nodo(`n${i}`, `n${i - 1}`))

    const layout = buildLayout(cadena, DOCUMENTO_DIMS)
    expect(layout.svgWidth / layout.svgHeight).toBeLessThan(1.6)

    const dims = elegirDimsDocumento(cadena)
    expect(dims).toBe(DOCUMENTO_DIMS_ANCHO)
  })

  it('un árbol ancho (muchos hijos directos de la raíz) da un aspect ratio ≥1.6 y usa DOCUMENTO_DIMS normal', () => {
    const ancho: OrgNodoCompleto[] = [nodo('root', null)]
    for (let i = 0; i < 10; i++) ancho.push(nodo(`h${i}`, 'root', i))

    const layout = buildLayout(ancho, DOCUMENTO_DIMS)
    expect(layout.svgWidth / layout.svgHeight).toBeGreaterThanOrEqual(1.6)

    const dims = elegirDimsDocumento(ancho)
    expect(dims).toBe(DOCUMENTO_DIMS)
  })

  it('DOCUMENTO_DIMS_ANCHO tiene cajas y fuente más grandes que DOCUMENTO_DIMS', () => {
    expect(DOCUMENTO_DIMS_ANCHO.NODE_W).toBeGreaterThan(DOCUMENTO_DIMS.NODE_W)
    expect(DOCUMENTO_DIMS_ANCHO.NODE_H).toBeGreaterThan(DOCUMENTO_DIMS.NODE_H)
  })
})
