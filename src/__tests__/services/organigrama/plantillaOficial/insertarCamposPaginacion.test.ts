import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import { insertarCamposPaginacion } from '@/lib/documentosOficiales/plantillaOficial/insertarCamposPaginacion'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')

describe('insertarCamposPaginacion — contra la plantilla REAL del organigrama', () => {
  it('procesa header1.xml del organigrama sin cambios de código (header idéntico al de la Matriz)', () => {
    const buffer = readFileSync(TEMPLATE_PATH)
    const zip = new PizZip(buffer)
    const header1Xml = zip.file('word/header1.xml')!.asText()

    expect(header1Xml).toContain('{hoja}')
    expect(header1Xml).toContain('{totalHojas}')
    expect(header1Xml).not.toContain('NUMPAGES')

    const resultado = insertarCamposPaginacion(header1Xml)

    expect(resultado).not.toContain('{hoja}')
    expect(resultado).not.toContain('{totalHojas}')
    expect(resultado).toContain('NUMPAGES')
    asertarXmlBienFormado(resultado, 'organigrama header1.xml')
  })
})
