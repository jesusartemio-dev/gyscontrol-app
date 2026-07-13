import { buscarDuplicadoEnCatalogo, normalizarNombreTarea } from '@/lib/cronogramaIA/matchTareaCatalogo'

const CATALOGO = [
  { id: 'c1', nombre: 'Protocolo de Megado' },
  { id: 'c2', nombre: 'Tendido de Cables' },
  { id: 'c3', nombre: 'Pruebas de Continuidad' },
]

describe('buscarDuplicadoEnCatalogo — anti-duplicado de tareas propuestas por IA', () => {
  it('"Megado de cables" matchea la tarea de catálogo existente "Protocolo de Megado"', () => {
    const r = buscarDuplicadoEnCatalogo('Megado de cables', CATALOGO)
    expect(r.esDuplicado).toBe(true)
    expect(r.candidato?.id).toBe('c1')
  })

  it('nombre idéntico (salvo mayúsculas/tildes) matchea por contención directa', () => {
    const r = buscarDuplicadoEnCatalogo('protocolo de megado', CATALOGO)
    expect(r.esDuplicado).toBe(true)
    expect(r.candidato?.id).toBe('c1')
  })

  it('una tarea genuinamente nueva, sin ninguna palabra distintiva compartida, no matchea', () => {
    const r = buscarDuplicadoEnCatalogo('Instalación de Sensores de Vibración', CATALOGO)
    expect(r.esDuplicado).toBe(false)
  })

  it('nombre vacío nunca matchea (no revienta)', () => {
    expect(buscarDuplicadoEnCatalogo('', CATALOGO).esDuplicado).toBe(false)
    expect(buscarDuplicadoEnCatalogo('   ', CATALOGO).esDuplicado).toBe(false)
  })

  it('catálogo vacío nunca matchea', () => {
    expect(buscarDuplicadoEnCatalogo('Megado de cables', []).esDuplicado).toBe(false)
  })
})

describe('normalizarNombreTarea', () => {
  it('minúsculas, sin tildes, sin puntuación, espacios colapsados', () => {
    expect(normalizarNombreTarea('  Megado  de   Cables (Fase 1)  ')).toBe('megado de cables fase 1')
    expect(normalizarNombreTarea('Instalación de Válvulas')).toBe('instalacion de valvulas')
  })
})
