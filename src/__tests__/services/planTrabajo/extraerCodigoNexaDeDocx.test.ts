import PizZip from 'pizzip'
import { extraerCodigoNexaDeDocx } from '@/lib/planTrabajo/extraerCodigoNexaDeDocx'

/** Arma un .docx mínimo con un header (tabla simulada como párrafos sueltos, misma info que lee la función: solo el texto de cada párrafo, en orden). */
function construirDocxConHeader(textosHeader: string[], nombreHeader = 'word/header1.xml'): Buffer {
  const parrafos = textosHeader.map(t => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('')
  const headerXml = `<?xml version="1.0" encoding="UTF-8"?><w:hdr>${parrafos}</w:hdr>`

  const zip = new PizZip()
  zip.file(nombreHeader, headerXml)
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document><w:body/></w:document>')
  return zip.generate({ type: 'nodebuffer' })
}

describe('extraerCodigoNexaDeDocx', () => {
  it('extrae el código cuando está en el párrafo SIGUIENTE a la etiqueta "Nº. NEXA:"', () => {
    const buffer = construirDocxConHeader(['Nº. NEXA:', 'PN-I790126044-3GYS-0370COR0001', 'HOJA'])
    expect(extraerCodigoNexaDeDocx(buffer)).toBe('PN-I790126044-3GYS-0370COR0001')
  })

  it('extrae el código cuando está pegado en el MISMO párrafo que la etiqueta', () => {
    const buffer = construirDocxConHeader(['Nº. NEXA: PN-I790126044-3GYS-0370COR0001'])
    expect(extraerCodigoNexaDeDocx(buffer)).toBe('PN-I790126044-3GYS-0370COR0001')
  })

  it('sin ninguna mención a "NEXA" en el header, devuelve null', () => {
    const buffer = construirDocxConHeader(['ORDEN DE COMPRA 4519803517', 'HOJA 1/22'])
    expect(extraerCodigoNexaDeDocx(buffer)).toBeNull()
  })

  it('sin ningún header en el docx, devuelve null sin reventar', () => {
    const zip = new PizZip()
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document><w:body/></w:document>')
    const buffer = zip.generate({ type: 'nodebuffer' })
    expect(extraerCodigoNexaDeDocx(buffer)).toBeNull()
  })

  it('un .docx / buffer completamente inválido no revienta — devuelve null', () => {
    const bufferInvalido = Buffer.from('esto no es un zip valido')
    expect(extraerCodigoNexaDeDocx(bufferInvalido)).toBeNull()
  })

  it('si el texto siguiente a "NEXA" no parece un código (muy corto o sin guion), devuelve null', () => {
    const buffer = construirDocxConHeader(['Nº. NEXA:', 'Ninguno', 'HOJA'])
    expect(extraerCodigoNexaDeDocx(buffer)).toBeNull()
  })
})
