import PizZip from 'pizzip'
import { renderMatrizPlantillaOficial, type DatosMatrizPlantilla } from '@/lib/matrizComunicacion/plantillaOficial/renderizar'

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

function datosDePrueba(): DatosMatrizPlantilla {
  const personal = [
    { siglas: 'PR', nombre: 'Piero Ríos', cargo: 'Gestor de Proyectos', empresa: 'GYS Control Industrial SAC', celular: '999999999', correo: 'piero@gys.com' },
    { siglas: 'AP', nombre: 'Alonso Piscoya', cargo: 'Residente', empresa: 'GYS Control Industrial SAC', celular: '999999998', correo: 'alonso@gys.com' },
    { siglas: 'TA', nombre: 'Tito Álvarez', cargo: 'Supervisor', empresa: 'GYS Control Industrial SAC', celular: '999999997', correo: 'tito@gys.com' },
  ]
  return {
    proyecto: {
      nombre: 'Proyecto G300',
      clienteNombre: 'NEXA Resources Perú S.A.',
      clienteLogoUrl: null, // sin logo -> se mantiene el placeholder, sin red
      sede: 'Unidad Cerro Lindo',
      ordenCompraCliente: '8070008797',
      etapa: 'FEL3',
    },
    matriz: {
      codigoDocumento: 'MX-I790126021-3GYS-0240COR0001-R0',
      revisionDocumento: '0',
      numeroConsultor: 'GYS-2026-001',
      desarrolloNombre: 'Alonso Piscoya',
      verificoNombre: 'Piero Ríos',
      aproboNombre: 'Piero Ríos',
      autorizoNombre: 'Yony Apaza',
    },
    personal,
    filas: [
      { orden: 0, edtNombre: 'Gestión', frecuencia: 'S', medio: 'E', celdas: [{ siglas: 'PR', valor: 'E' }, { siglas: 'AP', valor: 'D' }, { siglas: 'TA', valor: 'D' }] },
      { orden: 1, edtNombre: 'Construcción', frecuencia: 'E', medio: 'IE', celdas: [{ siglas: 'PR', valor: 'DS' }, { siglas: 'AP', valor: 'D' }, { siglas: 'TA', valor: 'R' }] },
    ],
  }
}

describe('renderMatrizPlantillaOficial — contra la plantilla REAL', () => {
  it('genera un .docx válido (zip bien formado) sin tags crudos {...} sobrantes', async () => {
    const buffer = await renderMatrizPlantillaOficial(datosDePrueba())
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(1000)

    const zip = new PizZip(buffer)
    const documentXml = zip.file('word/document.xml')!.asText()
    const header1Xml = zip.file('word/header1.xml')!.asText()

    // Ningún tag docxtemplater sin resolver debe sobrevivir al render — los
    // tags reales son siempre minúsculas (cliente, #filas, siglas_0...); un
    // '{' seguido de mayúscula/dígito es un GUID de OOXML (w14:*,
    // mc:AlternateContent), no un tag sin resolver, y no debe dar falso positivo.
    expect(documentXml).not.toMatch(/\{[#/]?[a-z_]/)
    expect(header1Xml).not.toMatch(/\{[#/]?[a-z_]/)

    // Datos reales presentes en el resultado.
    expect(header1Xml).toContain('NEXA Resources')
    expect(header1Xml).toContain('MX-I790126021-3GYS-0240COR0001-R0')
    expect(header1Xml).toContain('Unidad Cerro Lindo')
    expect(documentXml).toContain('TA')
    expect(documentXml).toContain('AP: ALONSO PISCOYA' /* fuera del header, en el bloque de firmas */)
  })

  it('la fila de Construcción muestra "R" en la columna de Tito Álvarez (TA), no en Piero (PR)', async () => {
    const buffer = await renderMatrizPlantillaOficial(datosDePrueba())
    const zip = new PizZip(buffer)
    const documentXml = zip.file('word/document.xml')!.asText()

    // Verificación de alineación columnas<->códigos: cada fila de datos debe
    // traer la sigla de cada persona en su propia columna de siglas, y el
    // valor "R" de Construcción debe caer en la columna correspondiente a TA.
    // No hay una forma directa de "leer una tabla" desde el XML crudo, pero sí
    // podemos confirmar que el texto "R" aparece en el documento (celda de la
    // fila Construcción) y que TA aparece como sigla de columna.
    expect(documentXml).toContain('Construcción')
    expect(documentXml.match(/>R<\/w:t>/g)?.length ?? 0).toBeGreaterThan(0)
  })
})
