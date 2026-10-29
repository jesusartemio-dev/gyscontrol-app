import { asegurarEstilosIndice, poblarIndice } from '@/lib/planTrabajo/indiceDocx'
import { mantenerImagenConPie } from '@/lib/planTrabajo/exportDocx'

const TOC_VACIO =
  '<w:sdt><w:sdtPr><w:alias w:val="Tabla de contenido"/></w:sdtPr><w:sdtContent>' +
  '<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/><w:instrText xml:space="preserve">TOC \\h \\o &quot;1-2&quot;</w:instrText><w:fldChar w:fldCharType="separate"/></w:r></w:p>' +
  '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:sdtContent></w:sdt>'

const titulo = (estilo: string, texto: string) =>
  `<w:p><w:pPr><w:pStyle w:val="${estilo}"/></w:pPr><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`

describe('poblarIndice', () => {
  it('llena el índice con los títulos 1-2 posteriores, con marcador y PAGEREF', () => {
    const doc = `<w:body>${titulo('Heading1', 'Carátula')}${TOC_VACIO}${titulo('Heading1', '1. OBJETIVO')}${titulo('Heading2', '11.9 Construcción &amp; montaje')}${titulo('Heading3', '11.9.1 Previos')}</w:body>`
    const { xml, entradas } = poblarIndice(doc)

    expect(entradas).toBe(2)
    expect(xml).toContain('<w:pStyle w:val="TOC1"/>')
    // Número y título separados por tabulación, como la referencia NEXA.
    expect(xml).toContain('>11.9</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">Construcción &amp; montaje<')
    expect(xml).not.toMatch(/TOC\d"[^]*Carátula/)
    expect(xml).not.toMatch(/<w:t xml:space="preserve">11\.9\.1 Previos<\/w:t><\/w:r><w:r><w:tab/)
    expect(xml.match(/<w:bookmarkStart /g)).toHaveLength(2)
    expect(xml).toContain('PAGEREF _TocGys90000 \\h')
    // Un solo campo TOC: begin en la primera entrada, end al final.
    expect(xml.match(/TOC \\h/g)).toHaveLength(1)
    expect(xml.match(/fldCharType="begin"/g)).toHaveLength(3) // TOC + 2 PAGEREF
    expect(xml.match(/fldCharType="end"/g)).toHaveLength(3)
  })

  it('respeta los niveles del campo: \\o "1-1" deja fuera los Heading2', () => {
    const doc = `<w:body>${TOC_VACIO.replace('1-2', '1-1')}${titulo('Heading1', '1. OBJETIVO')}${titulo('Heading2', '1.1 Detalle')}</w:body>`
    expect(poblarIndice(doc).entradas).toBe(1)
  })

  it('sin campo TOC no toca el documento', () => {
    const doc = `<w:body>${titulo('Heading1', 'A')}</w:body>`
    expect(poblarIndice(doc)).toEqual({ xml: doc, entradas: 0 })
  })
})

describe('asegurarEstilosIndice', () => {
  it('agrega outlineLvl a los Heading y los estilos TOC1/TOC2', () => {
    const styles = '<w:styles><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:rPr><w:sz w:val="26"/></w:rPr></w:style></w:styles>'
    const xml = asegurarEstilosIndice(styles)
    expect(xml).toContain('<w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr>')
    expect(xml).toContain('w:styleId="TOC1"')
    expect(asegurarEstilosIndice(xml)).toBe(xml)
  })
})

describe('mantenerImagenConPie', () => {
  it('marca keepNext en el párrafo centrado de la imagen, después de pStyle', () => {
    const img = '<w:p><w:pPr><w:pStyle w:val="X"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing></w:drawing></w:r></w:p>'
    const texto = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Figura 1</w:t></w:r></w:p>'
    const xml = mantenerImagenConPie(img + texto)
    expect(xml).toContain('<w:pStyle w:val="X"/><w:keepNext/><w:jc')
    expect(xml.match(/keepNext/g)).toHaveLength(1)
    expect(mantenerImagenConPie(xml)).toBe(xml)
  })
})
