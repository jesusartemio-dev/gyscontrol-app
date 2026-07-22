import PizZip from 'pizzip'
import { convertirDocxAHtml } from '@/lib/pets/convertirDocxAHtml'

/** Arma un .docx mínimo pero real (Content_Types + rels + document.xml) para no depender de un archivo de plantilla. */
function construirDocxDePrueba(parrafos: string[]): Buffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const escaparXml = (texto: string) =>
    texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cuerpo = parrafos.map(p => `<w:p><w:r><w:t>${escaparXml(p)}</w:t></w:r></w:p>`).join('')
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${cuerpo}</w:body>
</w:document>`

  const zip = new PizZip()
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rootRels)
  zip.file('word/document.xml', documentXml)
  return zip.generate({ type: 'nodebuffer' })
}

describe('convertirDocxAHtml', () => {
  it('convierte un .docx real a HTML con el texto de los párrafos', async () => {
    const buffer = construirDocxDePrueba(['Procedimiento revisado y aprobado.'])

    const html = await convertirDocxAHtml(buffer)

    expect(html).not.toBeNull()
    expect(html).toContain('Procedimiento revisado y aprobado.')
  })

  it('conserva varios párrafos en orden', async () => {
    const buffer = construirDocxDePrueba(['Primer párrafo.', 'Segundo párrafo.'])

    const html = await convertirDocxAHtml(buffer)

    const idx1 = html!.indexOf('Primer párrafo.')
    const idx2 = html!.indexOf('Segundo párrafo.')
    expect(idx1).toBeGreaterThanOrEqual(0)
    expect(idx2).toBeGreaterThan(idx1)
  })

  it('no incluye tags de script (sanitizado)', async () => {
    const buffer = construirDocxDePrueba(['<script>alert(1)</script> texto normal'])

    const html = await convertirDocxAHtml(buffer)

    expect(html).not.toContain('<script>')
  })

  it('un buffer completamente inválido no revienta — devuelve null', async () => {
    const bufferInvalido = Buffer.from('esto no es un docx valido')
    expect(await convertirDocxAHtml(bufferInvalido)).toBeNull()
  })
})
