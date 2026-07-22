import * as XLSX from 'xlsx'
import { convertirXlsxATexto } from '@/lib/iperc/convertirXlsxATexto'

function construirXlsxDePrueba(hojas: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), nombre)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('convertirXlsxATexto', () => {
  it('convierte la hoja "IPERC" (default) a CSV con el contenido de las celdas', () => {
    const buffer = construirXlsxDePrueba({ IPERC: [['#', 'Peligro'], [1, 'Caída de altura']] })

    const texto = convertirXlsxATexto(buffer)

    expect(texto).toContain('Caída de altura')
  })

  it('acepta un nombre de hoja preferida distinto (ej. "MATRIZ EPPs" para la MPP)', () => {
    const buffer = construirXlsxDePrueba({
      IPERC: [['no debería aparecer']],
      'MATRIZ EPPs': [['EPP básico', 'Soldador']],
    })

    const texto = convertirXlsxATexto(buffer, 'MATRIZ EPPs')

    expect(texto).toContain('EPP básico')
    expect(texto).not.toContain('no debería aparecer')
  })

  it('con hoja preferida que no existe, usa la primera hoja del libro', () => {
    const buffer = construirXlsxDePrueba({ Resumen: [['contenido de la primera hoja']] })

    const texto = convertirXlsxATexto(buffer, 'MATRIZ EPPs')

    expect(texto).toContain('contenido de la primera hoja')
  })

  it('trunca matrices muy extensas (tope defensivo de caracteres)', () => {
    const filaLarga = Array.from({ length: 2000 }, (_, i) => `celda-${i}`)
    const buffer = construirXlsxDePrueba({ IPERC: [filaLarga] })

    const texto = convertirXlsxATexto(buffer)

    expect(texto).toContain('[... truncado, matriz muy extensa ...]')
  })

  it('un .xlsx corrupto (firma ZIP inválida) no revienta — devuelve null', () => {
    const bufferInvalido = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x01, 0x02])
    expect(convertirXlsxATexto(bufferInvalido)).toBeNull()
  })
})
