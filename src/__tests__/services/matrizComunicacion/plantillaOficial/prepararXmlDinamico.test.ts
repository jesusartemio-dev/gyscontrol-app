import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import {
  expandirColumnasResponsabilidad,
  ajustarGridColumnas,
  calcularAnchosColumnas,
  prepararXmlPlantilla,
  siglasTagName,
  codigoTagName,
} from '@/lib/matrizComunicacion/plantillaOficial/prepararXmlDinamico'
import { insertarCamposPaginacion } from '@/lib/documentosOficiales/plantillaOficial/insertarCamposPaginacion'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Matriz/plantilla_matriz_comunicacion.docx')

function cargarXmlReal() {
  const buffer = readFileSync(TEMPLATE_PATH)
  const zip = new PizZip(buffer)
  return {
    documentXml: zip.file('word/document.xml')!.asText(),
    header1Xml: zip.file('word/header1.xml')!.asText(),
  }
}

function contarOcurrencias(xml: string, needle: string): number {
  return xml.split(needle).length - 1
}

describe('calcularAnchosColumnas', () => {
  it('reparte el presupuesto de 4810 dxa entre N columnas, la suma siempre cuadra exacto', () => {
    for (const n of [1, 2, 3, 9, 12, 20]) {
      const anchos = calcularAnchosColumnas(n)
      expect(anchos).toHaveLength(n)
      expect(anchos.reduce((a, b) => a + b, 0)).toBe(525 + 511 + 568 + 513 + 517 + 582 + 582 + 525 + 487)
      expect(anchos.every(a => a > 0)).toBe(true)
    }
  })

  it('n=0 devuelve arreglo vacío', () => {
    expect(calcularAnchosColumnas(0)).toEqual([])
  })
})

describe('expandirColumnasResponsabilidad — contra el document.xml REAL de la plantilla', () => {
  it('clona {_siglas_} y {_codigo_} exactamente N veces, agrega {/filas} al final del último código', () => {
    const { documentXml } = cargarXmlReal()
    const anchos = calcularAnchosColumnas(5)
    const { documentXml: resultado, siglasTags } = expandirColumnasResponsabilidad(documentXml, anchos)

    expect(siglasTags).toEqual([0, 1, 2, 3, 4].map(siglasTagName))
    for (let i = 0; i < 5; i++) {
      expect(resultado).toContain(`{${siglasTagName(i)}}`)
      expect(resultado).toContain(`{${codigoTagName(i)}}`)
    }
    // El marcador original ya no debe existir — todo quedó reemplazado.
    expect(resultado).not.toContain('{_siglas_}')
    expect(resultado).not.toContain('{_codigo_}')
    // {/filas} no existía en el original y ahora aparece exactamente una vez,
    // pegado al último código.
    expect(contarOcurrencias(documentXml, '{/filas}')).toBe(0)
    expect(contarOcurrencias(resultado, '{/filas}')).toBe(1)
    expect(resultado).toContain(`{${codigoTagName(4)}}{/filas}`)
    // {#filas}{id} sigue intacto, sin tocar.
    expect(resultado).toContain('{#filas}{id}')
    asertarXmlBienFormado(resultado, 'expandirColumnasResponsabilidad')
  })

  it('con N=1 sigue produciendo exactamente un par siglas_0/codigo_0 con el cierre del loop', () => {
    const { documentXml } = cargarXmlReal()
    const { documentXml: resultado } = expandirColumnasResponsabilidad(documentXml, calcularAnchosColumnas(1))
    expect(resultado).toContain('{siglas_0}')
    expect(resultado).toContain('{codigo_0}{/filas}')
  })

  it('lanza si el marcador no existe (protección contra plantilla editada en Word)', () => {
    expect(() => expandirColumnasResponsabilidad('<w:document></w:document>', [100])).toThrow(/no encontrado/)
  })
})

describe('ajustarGridColumnas — contra el document.xml REAL', () => {
  it('sube el gridSpan de RESPONSABILIDAD a N y agrega N gridCol nuevos manteniendo los 4 fijos', () => {
    const { documentXml } = cargarXmlReal()
    const anchos = calcularAnchosColumnas(7)
    const resultado = ajustarGridColumnas(documentXml, anchos)

    expect(resultado).toContain(`<w:gridSpan w:val="7"/>`)
    expect(resultado).not.toContain('<w:gridSpan w:val="1"/>')

    // document.xml tiene varias tablas (revisiones, contactos, la matriz) —
    // el tblGrid relevante es el que precede a la celda RESPONSABILIDAD, no
    // "el primero del documento".
    const respIdx = resultado.indexOf('RESPONSABILIDAD')
    const gridStart = resultado.lastIndexOf('<w:tblGrid>', respIdx)
    const gridEnd = resultado.indexOf('</w:tblGrid>', gridStart)
    const gridXml = resultado.slice(gridStart, gridEnd)
    const cols = [...gridXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]))
    expect(cols).toHaveLength(4 + 7)
    expect(cols.slice(0, 4)).toEqual([412, 2415, 1334, 779])
    expect(cols.slice(4)).toEqual(anchos)
    asertarXmlBienFormado(resultado, 'ajustarGridColumnas')
  })
})

describe('insertarCamposPaginacion — contra el header1.xml REAL', () => {
  it('reemplaza {hoja} por un valor semilla (ya vive dentro de un campo PAGE real) y construye el campo NUMPAGES para {totalHojas}', () => {
    const { header1Xml } = cargarXmlReal()
    expect(header1Xml).toContain('{hoja}')
    expect(header1Xml).toContain('{totalHojas}')
    // Confirma el hallazgo: {hoja} ya está dentro de un campo PAGE real.
    expect(header1Xml).toContain(' PAGE ')
    expect(header1Xml).not.toContain('NUMPAGES')

    const resultado = insertarCamposPaginacion(header1Xml)

    expect(resultado).not.toContain('{hoja}')
    expect(resultado).not.toContain('{totalHojas}')
    expect(resultado).toContain('NUMPAGES')
    expect(resultado).toContain('<w:fldChar w:fldCharType="begin"/>')
    expect(resultado).toContain('<w:fldChar w:fldCharType="separate"/>')
    expect(resultado).toContain('<w:fldChar w:fldCharType="end"/>')

    // Regresión del bug real: <w:r[^>]*> matcheaba por accidente <w:rPr>/
    // <w:rFonts> (cualquier elemento que empiece con "r"), dejando el <w:r>
    // original sin cerrar y produciendo un .docx que Word rechazaba al abrir
    // ("error trying to open the file"). Un parser XML estricto es la única
    // forma confiable de detectar esto — un simple "contiene el texto X" lo
    // dejó pasar la vez anterior.
    asertarXmlBienFormado(resultado, 'insertarCamposPaginacion')
  })

  it('nunca anida un <w:r> dentro de otro <w:r>/<w:rPr> (regresión exacta del bug real)', () => {
    const { header1Xml } = cargarXmlReal()
    const resultado = insertarCamposPaginacion(header1Xml)
    expect(resultado).not.toMatch(/<w:rPr>\s*<w:r>/)
  })
})

describe('prepararXmlPlantilla — orquestador end-to-end contra los archivos REALES', () => {
  it('produce document.xml y header1.xml transformados, sin dejar ningún marcador crudo', () => {
    const { documentXml, header1Xml } = cargarXmlReal()
    const resultado = prepararXmlPlantilla({ documentXml, header1Xml, numPersonas: 4 })

    expect(resultado.siglasTags).toHaveLength(4)
    for (const marcador of ['{_siglas_}', '{_codigo_}']) {
      expect(resultado.documentXml).not.toContain(marcador)
    }
    expect(resultado.documentXml).toContain('{/filas}')
    expect(resultado.header1Xml).not.toContain('{hoja}')
    expect(resultado.header1Xml).not.toContain('{totalHojas}')

    // Sanidad básica de XML bien formado en la región tocada: mismo número de
    // aperturas y cierres de <w:tc> en todo el documento transformado.
    const abiertas = (resultado.documentXml.match(/<w:tc>/g) ?? []).length
    const cerradas = (resultado.documentXml.match(/<\/w:tc>/g) ?? []).length
    expect(abiertas).toBe(cerradas)

    // Validación estricta con parser real — la que hubiera atrapado el bug
    // de NUMPAGES (runs anidados) antes de que llegara a un .docx real.
    asertarXmlBienFormado(resultado.documentXml, 'prepararXmlPlantilla:documentXml')
    asertarXmlBienFormado(resultado.header1Xml, 'prepararXmlPlantilla:header1Xml')
  })
})
