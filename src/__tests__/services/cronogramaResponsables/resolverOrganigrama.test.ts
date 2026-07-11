import { resolverOrganigramaProyecto, matchRolPorCargo } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { calcularRolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'

describe('matchRolPorCargo — tolerancia a variantes reales de cargoLabel', () => {
  it('reconoce las 6 variantes básicas', () => {
    expect(matchRolPorCargo('Gestor de Proyectos')).toBe('gestor')
    expect(matchRolPorCargo('Residente')).toBe('residente')
    expect(matchRolPorCargo('Supervisor')).toBe('supervisor')
    expect(matchRolPorCargo('SSOMA')).toBe('ssoma')
    expect(matchRolPorCargo('Cadista')).toBe('cadista')
    expect(matchRolPorCargo('Logística')).toBe('logistica')
  })

  it('tolera mayúsculas, singular/plural y títulos combinados observados en producción/dev', () => {
    expect(matchRolPorCargo('HSEQ')).toBe('ssoma')
    expect(matchRolPorCargo('Supervisor de Seguridad (HSEQ)')).toBe('ssoma') // ssoma gana sobre "supervisor" genérico
    expect(matchRolPorCargo('Residente / Ing. Programador')).toBe('residente')
    expect(matchRolPorCargo('Gestor de Proyecto')).toBe('gestor') // singular
    expect(matchRolPorCargo('GESTOR DE PROYECTOS')).toBe('gestor') // mayúsculas
  })

  it('cargoLabel que no matchea ningún rol conocido devuelve null', () => {
    expect(matchRolPorCargo('GERENCIA GENERAL')).toBeNull()
    expect(matchRolPorCargo('COMERCIAL')).toBe('logistica') // "comercial" está en la regla de logística/comercial
    expect(matchRolPorCargo('Contador')).toBeNull()
  })
})

describe('resolverOrganigramaProyecto — organigrama SINTÉTICO de un proyecto distinto (personas distintas)', () => {
  // Test de aceptación 6b: la misma tabla global (reglasResponsable.ts) debe
  // resolver correctamente contra un organigrama de OTRO proyecto, con
  // personas distintas a G300 — demuestra que la regla es global y la
  // resolución es por proyecto. Incluye variantes reales de cargoLabel y un
  // caso PLC -> Residente de punta a punta.
  const nodos = [
    { id: 'n-ger', userId: null, cargoLabel: 'GERENCIA GENERAL', orden: 0 }, // vacante, no matchea rol
    { id: 'n-gestor', userId: 'u-carla', cargoLabel: 'Gestor de Proyecto', orden: 1, user: { name: 'Carla Mendoza' } },
    { id: 'n-residente', userId: 'u-braulio', cargoLabel: 'Residente / Ing. Programador', orden: 2, user: { name: 'Braulio Soto' } },
    { id: 'n-supervisor', userId: 'u-nadia', cargoLabel: 'Supervisor de Seguridad (HSEQ)', orden: 3, user: { name: 'Nadia Reyes' } },
    { id: 'n-ssoma', userId: 'u-hugo', cargoLabel: 'HSEQ', orden: 4, user: { name: 'Hugo Paredes' } },
    { id: 'n-cadista', userId: null, cargoLabel: 'Cadista', orden: 5 }, // vacante
    { id: 'n-contador', userId: 'u-luz', cargoLabel: 'Contador', orden: 6, user: { name: 'Luz Vidal' } }, // no reconocido
  ]

  it('resuelve gestor y residente a las personas correctas de ESTE proyecto', () => {
    const { porRol, cargoLabelsNoReconocidos } = resolverOrganigramaProyecto(nodos)
    expect(porRol.get('gestor')?.nombre).toBe('Carla Mendoza')
    expect(porRol.get('residente')?.nombre).toBe('Braulio Soto')
    // "Supervisor de Seguridad (HSEQ)" cae en ssoma por prioridad de orden de
    // reglas, dejando el cargo "Supervisor" (campo) sin persona en este
    // organigrama sintético — comportamiento esperado, no un bug del test.
    expect(porRol.get('supervisor')).toBeNull()
    expect(cargoLabelsNoReconocidos).toEqual(expect.arrayContaining([{ nodoId: 'n-contador', cargoLabel: 'Contador' }]))
  })

  it('empate entre 2 nodos con el mismo rol se resuelve por menor orden', () => {
    const conEmpate = [
      { id: 'a', userId: 'u-1', cargoLabel: 'Residente', orden: 5, user: { name: 'Persona Tardia' } },
      { id: 'b', userId: 'u-2', cargoLabel: 'Residente', orden: 1, user: { name: 'Persona Primero' } },
    ]
    const { porRol } = resolverOrganigramaProyecto(conEmpate)
    expect(porRol.get('residente')?.nombre).toBe('Persona Primero')
  })

  it('caso PLC -> Residente de punta a punta usando este organigrama sintético', () => {
    const { porRol } = resolverOrganigramaProyecto(nodos)
    const rol = calcularRolResponsable({ edtCodigo: 'PLC' })
    expect(rol).toBe('residente')
    const persona = rol ? porRol.get(rol) : null
    expect(persona?.nombre).toBe('Braulio Soto')
    expect(persona?.userId).toBe('u-braulio')
  })

  it('un rol sin ningún nodo que lo ocupe queda null, nunca inventa a alguien', () => {
    const { porRol } = resolverOrganigramaProyecto([{ id: 'x', userId: 'u-x', cargoLabel: 'Gestor de Proyectos', orden: 0, user: { name: 'Solo Gestor' } }])
    expect(porRol.get('gestor')?.nombre).toBe('Solo Gestor')
    expect(porRol.get('residente')).toBeNull()
    expect(porRol.get('supervisor')).toBeNull()
    expect(porRol.get('ssoma')).toBeNull()
    expect(porRol.get('cadista')).toBeNull()
    expect(porRol.get('logistica')).toBeNull()
  })
})
