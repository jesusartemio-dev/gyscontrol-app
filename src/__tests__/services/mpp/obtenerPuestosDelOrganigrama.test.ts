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

  it('el rolFuncional del puesto manda sobre el texto del cargo', () => {
    // El organigrama real de CJM52. "Supervisor de Proyecto" adivinado por
    // palabras da 'supervisor', pero en el catálogo de puestos es 'residente':
    // leyendo el texto no había residente y la MPP caía al catálogo fijo, con
    // diez columnas que no son las del proyecto.
    const nodos = [
      { id: 'n-gg', parentId: null, cargoLabel: 'Gerencia General', orden: 0, puesto: { rolFuncional: null } },
      { id: 'n-gp', parentId: 'n-gg', cargoLabel: 'Gerencia de Proyectos', orden: 2, puesto: { rolFuncional: null } },
      { id: 'n-ssoma', parentId: 'n-gp', cargoLabel: 'Ingeniero de Seguridad', orden: 5, puesto: { rolFuncional: 'ssoma' } },
      { id: 'n-sup-proy', parentId: 'n-gp', cargoLabel: 'Supervisor de Proyecto', orden: 6, puesto: { rolFuncional: 'residente' } },
      { id: 'n-sup-campo', parentId: 'n-sup-proy', cargoLabel: 'Supervisor de Campo', orden: 3, puesto: { rolFuncional: 'supervisor' } },
      { id: 'n-tec', parentId: 'n-sup-campo', cargoLabel: 'Técnico Operativo', orden: 0, puesto: { rolFuncional: null } },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual([
      'Ingeniero de Seguridad',
      'Supervisor de Proyecto',
      'Supervisor de Campo',
      'Técnico Operativo',
    ])
  })

  it('un puesto catalogado sin rolFuncional no se rescata adivinando por el texto', () => {
    // Si el nodo está catalogado, su rolFuncional es la respuesta, incluso
    // cuando es null: el catálogo dice que ese puesto no cumple un rol.
    const nodos = [
      { id: 'n-ssoma', parentId: null, cargoLabel: 'SSOMA', orden: 0, puesto: { rolFuncional: 'ssoma' } },
      { id: 'n-res', parentId: 'n-ssoma', cargoLabel: 'RESIDENTE', orden: 1, puesto: { rolFuncional: null } },
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual([...PUESTOS_MPP])
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
