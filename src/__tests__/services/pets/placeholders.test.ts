import {
  esComoPlaceholder,
  etapaTienePasosIncompletos,
  contarEtapasIncompletas,
  PLACEHOLDER_GENERANDO,
  PLACEHOLDER_PENDIENTE,
  PLACEHOLDER_FALLIDA,
} from '@/lib/pets/placeholders'
import type { PetsContenido, BloqueComo } from '@/lib/validators/pets'

function construirContenido(etapas: PetsContenido['procedimiento']['etapas']): PetsContenido {
  return {
    personal: [{ rol: 'Supervisor' }],
    epp: { basico: [], bioseguridad: [], especifico: [], mppRef: '' },
    recursos: { equipos: [], herramientas: [], materiales: [] },
    procedimiento: { etapas },
    restricciones: [{ texto: 'PROHIBIDO ...' }],
    cambios: [{ fecha: '01/01/2026', version: '01', descripcion: 'x' }],
  }
}

const COMO_REAL: BloqueComo[] = [{ tipo: 'parrafo', texto: 'Verificar que el contactor esté en buen estado.' }]

describe('esComoPlaceholder', () => {
  it('reconoce las 3 variantes de placeholder', () => {
    expect(esComoPlaceholder(PLACEHOLDER_GENERANDO)).toBe(true)
    expect(esComoPlaceholder(PLACEHOLDER_PENDIENTE)).toBe(true)
    expect(esComoPlaceholder(PLACEHOLDER_FALLIDA)).toBe(true)
  })

  it('contenido real no se marca como placeholder', () => {
    expect(esComoPlaceholder(COMO_REAL)).toBe(false)
  })

  it('un párrafo con texto parecido pero no exacto no cuenta como placeholder', () => {
    const como: BloqueComo[] = [{ tipo: 'parrafo', texto: '(generando el resto...)' }]
    expect(esComoPlaceholder(como)).toBe(false)
  })

  it('varios bloques (aunque uno sea el texto placeholder) no cuenta — el paso ya tiene contenido real', () => {
    const como: BloqueComo[] = [...COMO_REAL, ...PLACEHOLDER_GENERANDO]
    expect(esComoPlaceholder(como)).toBe(false)
  })
})

describe('etapaTienePasosIncompletos / contarEtapasIncompletas', () => {
  it('etapa con todos los pasos reales no está incompleta', () => {
    const etapa = { letra: 'A', titulo: 'X', pasos: [{ que: 'p1', como: COMO_REAL, quien: [{ rol: 'r' }] }] }
    expect(etapaTienePasosIncompletos(etapa)).toBe(false)
  })

  it('etapa con algún paso en placeholder está incompleta', () => {
    const etapa = {
      letra: 'A',
      titulo: 'X',
      pasos: [
        { que: 'p1', como: COMO_REAL, quien: [{ rol: 'r' }] },
        { que: 'p2', como: PLACEHOLDER_FALLIDA, quien: [{ rol: 'r' }] },
      ],
    }
    expect(etapaTienePasosIncompletos(etapa)).toBe(true)
  })

  it('cuenta solo las etapas incompletas de todo el contenido', () => {
    const contenido = construirContenido([
      { letra: 'A', titulo: 'OK', pasos: [{ que: 'p1', como: COMO_REAL, quien: [{ rol: 'r' }] }] },
      { letra: 'B', titulo: 'Incompleta', pasos: [{ que: 'p1', como: PLACEHOLDER_PENDIENTE, quien: [{ rol: 'r' }] }] },
      { letra: 'C', titulo: 'Tambien incompleta', pasos: [{ que: 'p1', como: PLACEHOLDER_GENERANDO, quien: [{ rol: 'r' }] }] },
    ])
    expect(contarEtapasIncompletas(contenido)).toBe(2)
  })

  it('contenido sin ninguna etapa incompleta devuelve 0', () => {
    const contenido = construirContenido([
      { letra: 'A', titulo: 'OK', pasos: [{ que: 'p1', como: COMO_REAL, quien: [{ rol: 'r' }] }] },
    ])
    expect(contarEtapasIncompletas(contenido)).toBe(0)
  })
})
