import { derivarPuestosMpp } from '@/lib/mpp/obtenerPuestosDelOrganigrama'
import { PUESTOS_MPP } from '@/lib/mpp/catalogos/puestos'

describe('derivarPuestosMpp', () => {
  it('árbol real: SSOMA + Residente con Supervisor y técnicos debajo', () => {
    const nodos = [
      { id: 'n-ger', parentId: null, cargoLabel: 'GERENCIA GENERAL', orden: 0 },
      { id: 'n-ssoma', parentId: 'n-ger', cargoLabel: 'SSOMA', orden: 1 },
      { id: 'n-residente', parentId: 'n-ger', cargoLabel: 'RESIDENTE', orden: 2 },
      { id: 'n-supervisor', parentId: 'n-residente', cargoLabel: 'SUPERVISOR', orden: 0 },
      { id: 'n-instrumentista', parentId: 'n-supervisor', cargoLabel: 'TECNICO INSTRUMENTISTA', orden: 0 },
      { id: 'n-operario', parentId: 'n-supervisor', cargoLabel: 'TECNICO OPERARIO', orden: 1 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual([
      'SSOMA',
      'RESIDENTE',
      'SUPERVISOR',
      'TECNICO INSTRUMENTISTA',
      'TECNICO OPERARIO',
    ])
  })

  it('sin nodo RESIDENTE reconocible, cae al catálogo fijo PUESTOS_MPP', () => {
    const nodos = [
      { id: 'n-ger', parentId: null, cargoLabel: 'GERENCIA GENERAL', orden: 0 },
      { id: 'n-ssoma', parentId: 'n-ger', cargoLabel: 'SSOMA', orden: 1 },
      { id: 'n-contador', parentId: 'n-ger', cargoLabel: 'Contador', orden: 2 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual([...PUESTOS_MPP])
  })

  it('Residente sin SSOMA y sin hijos (resultado < 2), cae al catálogo fijo', () => {
    const nodos = [{ id: 'n-residente', parentId: null, cargoLabel: 'Residente', orden: 0 }]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual([...PUESTOS_MPP])
  })

  it('Residente + 1 hijo (exactamente 2 puestos) NO cae al fallback', () => {
    const nodos = [
      { id: 'n-residente', parentId: null, cargoLabel: 'Residente', orden: 0 },
      { id: 'n-tecnico', parentId: 'n-residente', cargoLabel: 'Técnico', orden: 0 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual(['Residente', 'Técnico'])
  })

  it('varios candidatos a SSOMA: gana el de menor orden', () => {
    const nodos = [
      { id: 'n-residente', parentId: null, cargoLabel: 'Residente', orden: 0 },
      { id: 'n-tecnico', parentId: 'n-residente', cargoLabel: 'Técnico', orden: 0 },
      { id: 'n-ssoma-2', parentId: null, cargoLabel: 'HSEQ (backup)', orden: 5 },
      { id: 'n-ssoma-1', parentId: null, cargoLabel: 'Seguridad', orden: 1 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos[0]).toBe('Seguridad')
  })

  it('cargoLabel duplicado (mismo texto, distinto nodo) se deduplica a 1 columna', () => {
    const nodos = [
      { id: 'n-residente', parentId: null, cargoLabel: 'Residente', orden: 0 },
      { id: 'n-t1', parentId: 'n-residente', cargoLabel: 'Técnico Instrumentista', orden: 0 },
      { id: 'n-t2', parentId: 'n-residente', cargoLabel: 'Técnico Instrumentista', orden: 1 },
      { id: 'n-t3', parentId: 'n-residente', cargoLabel: 'técnico instrumentista', orden: 2 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual(['Residente', 'Técnico Instrumentista'])
  })

  it('nodos vacantes (sin persona asignada) igual aportan su cargoLabel como columna', () => {
    const nodos = [
      { id: 'n-residente', parentId: null, cargoLabel: 'Residente', orden: 0 },
      { id: 'n-vacante', parentId: 'n-residente', cargoLabel: 'Soldador', orden: 0 },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual(['Residente', 'Soldador'])
  })
})
