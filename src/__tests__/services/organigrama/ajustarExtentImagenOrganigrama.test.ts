import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import { calcularExtentEmu, ajustarExtentEnDocumentXml } from '@/lib/services/Organigrama/ajustarExtentImagenOrganigrama'

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')

describe('calcularExtentEmu', () => {
  it('árbol achatado (ratio > 1.7547, ej. 2.1:1 — el caso real de G300) se fija al ancho máximo y reduce el alto', () => {
    const { cx, cy } = calcularExtentEmu(2100, 1000) // ratio 2.1
    expect(cx).toBe(9300000)
    expect(cy).toBe(Math.round(9300000 / 2.1))
    expect(cy).toBeLessThan(5300000)
  })

  it('árbol angosto y profundo (ratio < 1.7547) se fija al alto máximo y reduce el ancho', () => {
    const { cx, cy } = calcularExtentEmu(1000, 1000) // ratio 1.0
    expect(cy).toBe(5300000)
    expect(cx).toBe(Math.round(5300000 * 1.0))
    expect(cx).toBeLessThan(9300000)
  })

  it('ratio exactamente igual al máximo usa el área completa (equivalente al comportamiento previo sin padding)', () => {
    const { cx, cy } = calcularExtentEmu(9300000, 5300000)
    expect(cx).toBe(9300000)
    expect(cy).toBe(5300000)
  })

  it('nunca produce un extent que exceda el área útil en ninguna dimensión', () => {
    for (const [w, h] of [[3000, 500], [500, 3000], [1, 1], [4000, 1900]]) {
      const { cx, cy } = calcularExtentEmu(w, h)
      expect(cx).toBeLessThanOrEqual(9300000)
      expect(cy).toBeLessThanOrEqual(5300000)
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
