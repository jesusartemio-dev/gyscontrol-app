import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import {
  elegirOrientacion,
  calcularExtentEmu,
  ajustarExtentEnDocumentXml,
  ajustarOrientacionEnDocumentXml,
} from '@/lib/services/Organigrama/ajustarExtentImagenOrganigrama'

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')

// Área útil real (EMU) derivada de los márgenes reales de cada sección de la
// plantilla (ver el módulo bajo prueba) — recalculada acá de forma
// independiente para no depender de las constantes internas del módulo.
const TWIP_A_EMU = 635
const AREA_APAISADA = { maxCx: (16838 - 1077 - 1077) * TWIP_A_EMU, maxCy: (11906 - 2400 - 1077) * TWIP_A_EMU }
const AREA_VERTICAL = { maxCx: (11906 - 1077 - 1077) * TWIP_A_EMU, maxCy: (16838 - 2835 - 1077) * TWIP_A_EMU }

describe('elegirOrientacion', () => {
  it('árbol achatado o cuadrado (aspecto ≤1.5) usa página vertical — documento uniforme con la carátula', () => {
    expect(elegirOrientacion(1000, 1000)).toBe('vertical') // 1.0
    expect(elegirOrientacion(1500, 1000)).toBe('vertical') // 1.5 exacto
  })
  it('árbol ancho (aspecto >1.5) usa página apaisada', () => {
    expect(elegirOrientacion(2100, 1000)).toBe('apaisada') // 2.1, el caso real de G300
    expect(elegirOrientacion(1501, 1000)).toBe('apaisada')
  })
})

describe('calcularExtentEmu', () => {
  it('apaisada: árbol más achatado que el área útil se fija al ancho máximo y reduce el alto', () => {
    const { cx, cy } = calcularExtentEmu(2100, 1000, 'apaisada') // ratio 2.1 > maxRatio apaisada (~1.742)
    expect(cx).toBe(AREA_APAISADA.maxCx)
    expect(cy).toBe(Math.round(AREA_APAISADA.maxCx / 2.1))
    expect(cy).toBeLessThan(AREA_APAISADA.maxCy)
  })

  it('apaisada: árbol más angosto que el área útil se fija al alto máximo y reduce el ancho', () => {
    const { cx, cy } = calcularExtentEmu(1000, 1000, 'apaisada') // ratio 1.0 < maxRatio apaisada
    expect(cy).toBe(AREA_APAISADA.maxCy)
    expect(cx).toBe(Math.round(AREA_APAISADA.maxCy * 1.0))
    expect(cx).toBeLessThan(AREA_APAISADA.maxCx)
  })

  it('vertical: usa el área útil real de la sección 1 (carátula), no la de la apaisada', () => {
    const { cx, cy } = calcularExtentEmu(1000, 1000, 'vertical') // ratio 1.0 > maxRatio vertical (~0.754) -> ancho máximo
    expect(cx).toBe(AREA_VERTICAL.maxCx)
    expect(cy).toBe(Math.round(AREA_VERTICAL.maxCx / 1.0))
    expect(cy).toBeLessThan(AREA_VERTICAL.maxCy)
  })

  it('nunca produce un extent que exceda el área útil de la orientación elegida, en ninguna dimensión', () => {
    for (const [w, h] of [[3000, 500], [500, 3000], [1, 1], [4000, 1900]]) {
      const apaisada = calcularExtentEmu(w, h, 'apaisada')
      expect(apaisada.cx).toBeLessThanOrEqual(AREA_APAISADA.maxCx)
      expect(apaisada.cy).toBeLessThanOrEqual(AREA_APAISADA.maxCy)
      const vertical = calcularExtentEmu(w, h, 'vertical')
      expect(vertical.cx).toBeLessThanOrEqual(AREA_VERTICAL.maxCx)
      expect(vertical.cy).toBeLessThanOrEqual(AREA_VERTICAL.maxCy)
    }
  })
})

describe('ajustarExtentEnDocumentXml — contra el document.xml REAL de la plantilla', () => {
  function cargarDocumentXml(): string {
    const zip = new PizZip(readFileSync(TEMPLATE_PATH))
    return zip.file('word/document.xml')!.asText()
  }

  it('reemplaza EXACTAMENTE las 2 ocurrencias (wp:extent + a:ext) por el tamaño calculado', () => {
    const documentXml = cargarDocumentXml()
    expect((documentXml.match(/cx="9300000" cy="5300000"/g) ?? []).length).toBe(2)

    const resultado = ajustarExtentEnDocumentXml(documentXml, 9300000, 4428571)
    expect((resultado.match(/cx="9300000" cy="5300000"/g) ?? []).length).toBe(0)
    expect((resultado.match(/cx="9300000" cy="4428571"/g) ?? []).length).toBe(2)
  })

  it('lanza si el conteo de ocurrencias no es exactamente 2 (protección contra plantilla editada)', () => {
    expect(() => ajustarExtentEnDocumentXml('<w:document></w:document>', 100, 100)).toThrow(/Se esperaban 2 ocurrencias/)
    expect(() => ajustarExtentEnDocumentXml('cx="9300000" cy="5300000" ... cx="9300000" cy="5300000" ... cx="9300000" cy="5300000"', 100, 100)).toThrow(/Se esperaban 2 ocurrencias/)
  })
})

describe('ajustarOrientacionEnDocumentXml — contra el document.xml REAL de la plantilla', () => {
  function cargarDocumentXml(): string {
    const zip = new PizZip(readFileSync(TEMPLATE_PATH))
    return zip.file('word/document.xml')!.asText()
  }

  it("'apaisada' no toca nada — la plantilla ya viene así", () => {
    const documentXml = cargarDocumentXml()
    const resultado = ajustarOrientacionEnDocumentXml(documentXml, 'apaisada')
    expect(resultado).toBe(documentXml)
  })

  it("'vertical' deja la sección 2 con el MISMO pgSz/pgMar que la sección 1 (documento uniforme)", () => {
    const documentXml = cargarDocumentXml()
    const resultado = ajustarOrientacionEnDocumentXml(documentXml, 'vertical')

    expect(resultado).not.toContain('w:orient="landscape"')
    // Ambas secciones deben terminar con el mismo pgSz+pgMar (el de la carátula).
    const bloque = '<w:pgSz w:w="11906" w:h="16838" w:code="9"/><w:pgMar w:top="2835" w:right="1077" w:bottom="1077" w:left="1077" w:header="397" w:footer="397" w:gutter="0"/>'
    expect((resultado.match(new RegExp(bloque.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length).toBe(2)
  })
})
