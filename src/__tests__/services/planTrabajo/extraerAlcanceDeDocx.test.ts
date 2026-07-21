import PizZip from 'pizzip'
import { extraerAlcanceDeDocx } from '@/lib/planTrabajo/extraerAlcanceDeDocx'

/** Arma un .docx mínimo con párrafos de texto plano (opcionalmente viñetas con numId). */
function construirDocxDePrueba(parrafos: { texto: string; viñeta?: boolean }[]): Buffer {
  const xmlParrafos = parrafos
    .map(p => {
      const numPr = p.viñeta ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>' : ''
      return `<w:p>${numPr}<w:r><w:t>${p.texto}</w:t></w:r></w:p>`
    })
    .join('')
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><w:document>${xmlParrafos}</w:document>`

  const zip = new PizZip()
  zip.file('word/document.xml', documentXml)
  return zip.generate({ type: 'nodebuffer' })
}

describe('extraerAlcanceDeDocx', () => {
  it('extrae el texto entre "ALCANCE DEL SERVICIO" y el siguiente encabezado ("ORGANIGRAMA")', () => {
    const buffer = construirDocxDePrueba([
      { texto: 'OBJETIVO' },
      { texto: 'Este es el objetivo del proyecto.' },
      { texto: 'ALCANCE DEL SERVICIO' },
      { texto: 'Se ejecutarán las instalaciones electromecánicas.' },
      { texto: 'Armar andamio certificado.', viñeta: true },
      { texto: 'ORGANIGRAMA' },
      { texto: 'Contenido del organigrama que no debe incluirse.' },
    ])

    const resultado = extraerAlcanceDeDocx(buffer)

    expect(resultado).toContain('Se ejecutarán las instalaciones electromecánicas.')
    expect(resultado).toContain('- Armar andamio certificado.')
    expect(resultado).not.toContain('objetivo del proyecto')
    expect(resultado).not.toContain('organigrama que no debe incluirse')
  })

  it('no confunde la entrada del índice ("11.ALCANCE DEL SERVICIO10", con página pegada) con el encabezado real', () => {
    const buffer = construirDocxDePrueba([
      { texto: '11.ALCANCE DEL SERVICIO10' }, // entrada de índice — no debe matchear
      { texto: 'ALCANCE DEL SERVICIO' }, // encabezado real
      { texto: 'Texto real de la sección.' },
      { texto: 'ORGANIGRAMA' },
    ])

    const resultado = extraerAlcanceDeDocx(buffer)
    expect(resultado).toBe('Texto real de la sección.')
  })

  it('tolera un número de sección literal delante del encabezado ("11. ALCANCE DEL SERVICIO")', () => {
    const buffer = construirDocxDePrueba([
      { texto: '11. ALCANCE DEL SERVICIO' },
      { texto: 'Contenido de la sección.' },
      { texto: 'HISTOGRAMAS' },
    ])

    expect(extraerAlcanceDeDocx(buffer)).toBe('Contenido de la sección.')
  })

  it('sin encabezado de fin (documento termina dentro de la sección), toma hasta el final', () => {
    const buffer = construirDocxDePrueba([
      { texto: 'ALCANCE DEL SERVICIO' },
      { texto: 'Único párrafo de contenido.' },
    ])

    expect(extraerAlcanceDeDocx(buffer)).toBe('Único párrafo de contenido.')
  })

  it('sin el encabezado "ALCANCE DEL SERVICIO", devuelve string vacío', () => {
    const buffer = construirDocxDePrueba([
      { texto: 'OBJETIVO' },
      { texto: 'Contenido cualquiera.' },
    ])

    expect(extraerAlcanceDeDocx(buffer)).toBe('')
  })

  it('un .docx / buffer completamente inválido no revienta — devuelve string vacío', () => {
    const bufferInvalido = Buffer.from('esto no es un zip valido')
    expect(extraerAlcanceDeDocx(bufferInvalido)).toBe('')
  })
})
