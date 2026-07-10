import { BORRADOR_LOCAL_PASO1_VERSION, esBorradorLocalValido, type BorradorLocalPaso1 } from '@/lib/cronogramaIA/borradorWizard'

function borradorValido(overrides: Partial<BorradorLocalPaso1> = {}): BorradorLocalPaso1 {
  return {
    schemaVersion: BORRADOR_LOCAL_PASO1_VERSION,
    edtsSeleccionados: ['edt-1'],
    brownfield: false,
    ingenieriaDetalle: false,
    tableros: [],
    plcs: [],
    hmiCantidad: 0,
    scada: false,
    nValorizaciones: 0,
    duracionSemanas: 0,
    nPersonas: 0,
    nPets: 0,
    alcanceLibre: '',
    ...overrides,
  }
}

describe('esBorradorLocalValido', () => {
  it('acepta un borrador con al menos un EDT seleccionado y el schemaVersion actual', () => {
    expect(esBorradorLocalValido(borradorValido())).toBe(true)
  })

  it('rechaza un borrador vacío (cero EDTs marcados) — el bug real: se restauraba como si fuera una elección del usuario', () => {
    expect(esBorradorLocalValido(borradorValido({ edtsSeleccionados: [] }))).toBe(false)
  })

  it('rechaza un borrador de un schemaVersion viejo (o de una versión futura)', () => {
    expect(esBorradorLocalValido(borradorValido({ schemaVersion: 0 }))).toBe(false)
    expect(esBorradorLocalValido(borradorValido({ schemaVersion: BORRADOR_LOCAL_PASO1_VERSION + 1 }))).toBe(false)
  })

  it('rechaza un borrador sin schemaVersion (draft guardado antes de este fix)', () => {
    const { schemaVersion, ...sinVersion } = borradorValido()
    expect(esBorradorLocalValido(sinVersion)).toBe(false)
  })

  it('rechaza valores corruptos: null, undefined, arrays, primitivos, JSON con forma inesperada', () => {
    expect(esBorradorLocalValido(null)).toBe(false)
    expect(esBorradorLocalValido(undefined)).toBe(false)
    expect(esBorradorLocalValido('borrador')).toBe(false)
    expect(esBorradorLocalValido(42)).toBe(false)
    expect(esBorradorLocalValido([])).toBe(false)
    expect(esBorradorLocalValido({ edtsSeleccionados: 'no-es-array' })).toBe(false)
  })
})
