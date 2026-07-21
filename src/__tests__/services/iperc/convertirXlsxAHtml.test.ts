import * as XLSX from 'xlsx'
import { convertirXlsxAHtml } from '@/lib/iperc/convertirXlsxAHtml'

function construirXlsxDePrueba(hojas: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = XLSX.utils.aoa_to_sheet(filas)
    XLSX.utils.book_append_sheet(wb, ws, nombre)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('convertirXlsxAHtml', () => {
  it('convierte la hoja "IPERC" a una tabla HTML con el contenido de las celdas', () => {
    const buffer = construirXlsxDePrueba({
      IPERC: [
        ['#', 'Tarea'],
        [1, 'Armar andamio certificado'],
      ],
    })

    const html = convertirXlsxAHtml(buffer)

    expect(html).not.toBeNull()
    expect(html).toContain('<table>')
    expect(html).toContain('Armar andamio certificado')
  })

  it('prioriza la hoja llamada "IPERC" sobre otras hojas del libro', () => {
    const buffer = construirXlsxDePrueba({
      Matriz: [['no debería aparecer']],
      IPERC: [['sí debería aparecer']],
    })

    const html = convertirXlsxAHtml(buffer)

    expect(html).toContain('sí debería aparecer')
    expect(html).not.toContain('no debería aparecer')
  })

  it('sin hoja "IPERC", usa la primera hoja del libro', () => {
    const buffer = construirXlsxDePrueba({
      Resumen: [['contenido de la primera hoja']],
    })

    const html = convertirXlsxAHtml(buffer)

    expect(html).toContain('contenido de la primera hoja')
  })

  it('no incluye atributos data-t/data-v/id que agrega SheetJS (sanitizado)', () => {
    const buffer = construirXlsxDePrueba({ IPERC: [['valor']] })

    const html = convertirXlsxAHtml(buffer)

    expect(html).not.toContain('data-t=')
    expect(html).not.toContain('data-v=')
    expect(html).not.toMatch(/id="sjs-/)
  })

  it('un .xlsx corrupto (firma ZIP inválida) no revienta — devuelve null', () => {
    // SheetJS es muy tolerante con texto plano (lo trata como CSV de una
    // celda) — para forzar un error real hace falta imitar un ZIP corrupto.
    const bufferInvalido = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x01, 0x02])
    expect(convertirXlsxAHtml(bufferInvalido)).toBeNull()
  })
})
