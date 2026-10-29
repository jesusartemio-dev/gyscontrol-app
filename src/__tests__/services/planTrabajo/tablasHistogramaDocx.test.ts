import { formatoValor, insertarTablasHistograma, marcadorTablaHistograma, tablasDeHistogramas, xmlTablaHistograma } from '@/lib/planTrabajo/tablasHistogramaDocx'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'

const histogramas = {
  meses: ['2026-10', '2026-11', '2026-12'],
  equipoTrabajo: [{ etiqueta: 'Tecnico', valoresPorMes: [1, 12, 12], total: 12 }],
  horasHombre: [
    { etiqueta: 'Planificación', valoresPorMes: [67.5, 0, 0], total: 67.5 },
    { etiqueta: 'Construcción', valoresPorMes: [0, 550.5, 157.5], total: 708 },
  ],
}

const texto = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1])

describe('tablasHistogramaDocx', () => {
  it('una columna por mes con el nombre del mes, "—" en los ceros y MÁX. al final', () => {
    const { equipo } = tablasDeHistogramas(histogramas, 775.5)
    expect(texto(xmlTablaHistograma(equipo))).toEqual(['PERSONAL / CARGO', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'MÁX.', 'Tecnico', '1', '12', '12', '12'])
  })

  it('horas-hombre: fila TOTAL GENERAL con la suma de cada mes y el total', () => {
    const { hh } = tablasDeHistogramas(histogramas, 775.5)
    const t = texto(xmlTablaHistograma(hh))
    expect(t.slice(0, 5)).toEqual(['EDT', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'TOTAL HH'])
    expect(t).toEqual(expect.arrayContaining(['Construcción', '—', '550.5', '157.5', '708']))
    expect(t.slice(-5)).toEqual(['TOTAL GENERAL', '67.5', '550.5', '157.5', '775.5'])
  })

  it('los anchos de la grilla suman el ancho de la tabla y coinciden con las celdas', () => {
    const xml = xmlTablaHistograma(tablasDeHistogramas(histogramas, 775.5).hh)
    const grid = [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]))
    expect(grid).toHaveLength(5)
    expect(grid.reduce((a, b) => a + b, 0)).toBe(9640)
    asertarXmlBienFormado(`<w:body xmlns:w="w">${xml}</w:body>`, 'tabla')
  })

  it('reemplaza el párrafo del marcador por la tabla', () => {
    const doc = `<w:p><w:r><w:t>antes</w:t></w:r></w:p><w:p><w:pPr/><w:r><w:t>${marcadorTablaHistograma('equipo')}</w:t></w:r></w:p><w:p><w:r><w:t>después</w:t></w:r></w:p>`
    const xml = insertarTablasHistograma(doc, tablasDeHistogramas(histogramas, 0))
    expect(xml).not.toContain('§TABLA')
    expect(xml).toMatch(/antes<\/w:t><\/w:r><\/w:p><w:tbl>[\s\S]*<\/w:tbl><w:p><w:r><w:t>después/)
  })

  it('formatoValor: 0 → —, un decimal sin ".0"', () => {
    expect(formatoValor(0)).toBe('—')
    expect(formatoValor(38.25)).toBe('38.3')
    expect(formatoValor(12)).toBe('12')
  })
})
