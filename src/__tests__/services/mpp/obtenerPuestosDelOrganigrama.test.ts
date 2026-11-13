import { derivarColumnasMpp, derivarPuestosMpp } from '@/lib/mpp/obtenerPuestosDelOrganigrama'
import { PUESTOS_MPP } from '@/lib/mpp/catalogos/puestos'

/** Atajo para armar nodos de organigrama en los casos de prueba. */
const nodo = (id: string, nombre: string, orden: number, vaACampo: boolean) => ({
  puesto: { id, nombre, orden, vaACampo },
})

describe('derivarColumnasMpp', () => {
  it('toma los puestos de campo, ordenados por el catálogo', () => {
    // El organigrama real de CJM52.
    const nodos = [
      nodo('p-gg', 'Gerencia General', 10, false),
      nodo('p-gp', 'Gerencia de Proyectos', 20, false),
      nodo('p-com', 'Comercial', 30, false),
      nodo('p-gestor', 'Gestor de Proyectos', 40, true),
      nodo('p-res', 'Supervisor de Proyecto', 50, true),
      nodo('p-coord', 'Coordinador de Ingeniería', 60, false),
      nodo('p-cad', 'Cadista', 80, false),
      nodo('p-sup', 'Supervisor de Campo', 90, true),
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
      nodo('p-log', 'Logística', 120, false),
      nodo('p-electro', 'Técnico Electrotecnia', 160, true),
      nodo('p-oper', 'Técnico Operativo', 150, true),
    ]

    expect(derivarPuestosMpp(nodos)).toEqual([
      'Gestor de Proyectos',
      'Supervisor de Proyecto',
      'Supervisor de Campo',
      'Ingeniero de Seguridad',
      'Técnico Operativo',
      'Técnico Electrotecnia',
    ])
  })

  it('deja fuera a quien no va a campo, aunque esté en el organigrama', () => {
    const nodos = [
      nodo('p-cad', 'Cadista', 80, false),
      nodo('p-coord', 'Coordinador de Ingeniería', 60, false),
      nodo('p-sup', 'Supervisor de Campo', 90, true),
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
    ]

    const puestos = derivarPuestosMpp(nodos)

    expect(puestos).toEqual(['Supervisor de Campo', 'Ingeniero de Seguridad'])
    expect(puestos).not.toContain('Cadista')
    expect(puestos).not.toContain('Coordinador de Ingeniería')
  })

  it('dos nodos del mismo puesto son una sola columna', () => {
    // CJM45 tiene dos nodos de seguridad, "HSEQ" y "Supervisor de Seguridad
    // (HSEQ)", apuntando al mismo puesto del catálogo.
    const nodos = [
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
      nodo('p-tec', 'Técnico Eléctrico', 140, true),
      nodo('p-tec', 'Técnico Eléctrico', 140, true),
      nodo('p-tec', 'Técnico Eléctrico', 140, true),
    ]

    expect(derivarPuestosMpp(nodos)).toEqual(['Ingeniero de Seguridad', 'Técnico Eléctrico'])
  })

  it('devuelve el puestoId de cada columna, que es con lo que se buscan los EPP por defecto', () => {
    const nodos = [
      nodo('p-sup', 'Supervisor de Campo', 90, true),
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
    ]

    expect(derivarColumnasMpp(nodos)).toEqual([
      { puestoId: 'p-sup', nombre: 'Supervisor de Campo' },
      { puestoId: 'p-ssoma', nombre: 'Ingeniero de Seguridad' },
    ])
  })

  it('sin puestos de campo cae al catálogo fijo, sin puestoId', () => {
    const nodos = [
      nodo('p-gg', 'Gerencia General', 10, false),
      nodo('p-com', 'Comercial', 30, false),
    ]

    const columnas = derivarColumnasMpp(nodos)

    expect(columnas.map(c => c.nombre)).toEqual([...PUESTOS_MPP])
    expect(columnas.every(c => c.puestoId === null)).toBe(true)
  })

  it('un solo puesto de campo no alcanza y también cae al catálogo fijo', () => {
    const nodos = [nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true)]

    expect(derivarPuestosMpp(nodos)).toEqual([...PUESTOS_MPP])
  })

  it('dos puestos de campo son suficientes y no caen al respaldo', () => {
    const nodos = [
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
      nodo('p-sup', 'Supervisor de Campo', 90, true),
    ]

    expect(derivarPuestosMpp(nodos)).toEqual(['Supervisor de Campo', 'Ingeniero de Seguridad'])
  })

  it('un nodo sin puesto catalogado no aporta columna', () => {
    const nodos = [
      { puesto: null },
      {},
      nodo('p-ssoma', 'Ingeniero de Seguridad', 110, true),
      nodo('p-sup', 'Supervisor de Campo', 90, true),
    ]

    expect(derivarPuestosMpp(nodos)).toEqual(['Supervisor de Campo', 'Ingeniero de Seguridad'])
  })
})
