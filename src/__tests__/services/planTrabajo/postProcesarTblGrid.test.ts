import { sincronizarTblGridDelDocumento } from '@/lib/planTrabajo/postProcesarTblGrid'

/**
 * Reproduce el bug real (confirmado por el usuario renderizando la plantilla):
 * un loop `{-w:tc roles}` duplica `<w:tc>` en cada fila de la grilla RACI,
 * pero Docxtemplater deja `<w:tblGrid>` con el conteo de columnas ORIGINAL
 * de la plantilla (3), no el real post-render (2 fijas + N dinámicas).
 */
function tc(w: number, texto = 'x', extra = ''): string {
  return `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${w}"/>${extra}</w:tcPr><w:p><w:r><w:t>${texto}</w:t></w:r></w:p></w:tc>`
}

function tabla(gridColWidths: number[], filas: string[]): string {
  const tblGrid = `<w:tblGrid>${gridColWidths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
  return `<w:tbl><w:tblPr><w:tblLayout w:type="fixed"/></w:tblPr>${tblGrid}${filas.join('')}</w:tbl>`
}

describe('sincronizarTblGridDelDocumento', () => {
  it('tabla RACI post-render (3 gridCol declarados, 7 celdas reales por fila) — reconstruye tblGrid a 7 columnas con los anchos reales', () => {
    // 1 EDT (2800) + 5 personas (340 c/u, post {-w:tc raciPersonas}) + 1 cierre (60) = 7 celdas, 3 gridCol viejos.
    const filaCabecera = `<w:tr>${tc(2800, 'EDT')}${[1, 2, 3, 4, 5].map(() => tc(340, 'PR')).join('')}${tc(60, '')}</w:tr>`
    const filaDatos = `<w:tr>${tc(2800, 'Planificación')}${[1, 2, 3, 4, 5].map(() => tc(340, 'R')).join('')}${tc(60, '')}</w:tr>`
    const doc = tabla([2800, 340, 60], [filaCabecera, filaDatos])

    const { xml, tablasCorregidas } = sincronizarTblGridDelDocumento(doc)

    expect(tablasCorregidas).toEqual([0])
    const gridCols = xml.match(/<w:gridCol w:w="(\d+)"\/>/g)!.map(g => Number(g.match(/\d+/)![0]))
    expect(gridCols).toEqual([2800, 340, 340, 340, 340, 340, 60])
    // Las filas (contenido de las celdas) no se tocan, solo el tblGrid.
    expect(xml).toContain('<w:t>Planificación</w:t>')
  })

  it('tabla cuyo tblGrid YA coincide con las celdas reales — no se toca (no aparece en tablasCorregidas)', () => {
    const fila = `<w:tr>${tc(1000)}${tc(8640)}</w:tr>`
    const doc = tabla([1000, 8640], [fila, fila])

    const { xml, tablasCorregidas } = sincronizarTblGridDelDocumento(doc)

    expect(tablasCorregidas).toEqual([])
    expect(xml).toBe(doc)
  })

  it('varias tablas en el documento — solo se corrige la que tiene el desalineo, las demás quedan intactas', () => {
    const filaOk = `<w:tr>${tc(1000)}${tc(8640)}</w:tr>`
    const tablaOk = tabla([1000, 8640], [filaOk])

    const filaRaci = `<w:tr>${tc(2800)}${tc(340)}${tc(340)}${tc(340)}${tc(60)}</w:tr>`
    const tablaRaci = tabla([2800, 340, 60], [filaRaci])

    const doc = `${tablaOk}<w:p/>${tablaRaci}`
    const { xml, tablasCorregidas } = sincronizarTblGridDelDocumento(doc)

    expect(tablasCorregidas).toEqual([1])
    // La primera tabla (índice 0) no cambia un solo carácter.
    expect(xml.startsWith(tablaOk)).toBe(true)
    const inicioSegundaTabla = xml.indexOf('<w:tbl>', xml.indexOf('<w:tbl>') + 1)
    const gridColsSegundaTabla = xml.slice(inicioSegundaTabla).match(/<w:gridCol w:w="(\d+)"\/>/g)!
    expect(gridColsSegundaTabla.map(g => Number(g.match(/\d+/)![0]))).toEqual([2800, 340, 340, 340, 60])
  })

  it('fila con celda fusionada (gridSpan) no se confunde con un desalineo — se usa la fila con más celdas literales para reconstruir', () => {
    // Tabla "revisiones": fila título con 1 celda gridSpan=8 (ancho total 9640), y filas de datos con 8 celdas reales.
    const anchos = [700, 700, 4240, 800, 800, 800, 800, 800]
    const filaTitulo = `<w:tr>${tc(9640, 'TITULO', '<w:gridSpan w:val="8"/>')}</w:tr>`
    const filaDatos = `<w:tr>${anchos.map(w => tc(w)).join('')}</w:tr>`
    const doc = tabla(anchos, [filaTitulo, filaDatos, filaTitulo])

    const { tablasCorregidas } = sincronizarTblGridDelDocumento(doc)

    // 8 gridCol declarados, columnasEfectivas de CUALQUIER fila (incluida la fusionada) = 8 — ya coincide, no se toca.
    expect(tablasCorregidas).toEqual([])
  })

  it('tabla anidada dentro de una celda no contamina el cálculo de la tabla exterior', () => {
    const filaInterna = `<w:tr>${tc(100)}${tc(200)}</w:tr>`
    const tablaInterna = tabla([100, 200], [filaInterna])
    // La tabla exterior tiene 2 columnas (1000/8640) y una tabla anidada de 2 columnas MUY distintas (100/200) en su única celda.
    const filaExterior = `<w:tr><w:tc><w:tcPr><w:tcW w:type="dxa" w:w="1000"/></w:tcPr>${tablaInterna}</w:tc>${tc(8640)}</w:tr>`
    const doc = tabla([1000, 8640], [filaExterior])

    const { xml, tablasCorregidas } = sincronizarTblGridDelDocumento(doc)

    // La tabla anidada por sí sola SÍ está desalineada (2 gridCol propios, pero sus celdas coinciden 2=2 → no se toca tampoco).
    // Lo que se verifica acá es que la tabla EXTERIOR (2 celdas propias: 1000+8640) coincide con sus 2 gridCol — nada se corrige.
    expect(tablasCorregidas).toEqual([])
    expect(xml).toBe(doc)
  })
})
