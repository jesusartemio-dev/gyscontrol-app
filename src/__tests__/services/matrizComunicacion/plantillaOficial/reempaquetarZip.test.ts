import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import { reempaquetarZip } from '@/lib/matrizComunicacion/plantillaOficial/reempaquetarZip'

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Matriz/plantilla_matriz_comunicacion.docx')

describe('reempaquetarZip — contra el .docx REAL de la plantilla', () => {
  it('deja [Content_Types].xml primero y sin entradas de directorio', () => {
    const original = readFileSync(TEMPLATE_PATH)
    const resultado = reempaquetarZip(original)

    const zip = new PizZip(resultado)
    const nombres = Object.keys(zip.files)

    expect(nombres[0]).toBe('[Content_Types].xml')
    expect(nombres.filter(n => zip.files[n].dir)).toEqual([])
  })

  it('preserva el contenido exacto de cada parte (texto y binario)', () => {
    const original = readFileSync(TEMPLATE_PATH)
    const resultado = reempaquetarZip(original)

    const zipOriginal = new PizZip(original)
    const zipResultado = new PizZip(resultado)

    expect(zipResultado.file('word/document.xml')!.asText()).toBe(zipOriginal.file('word/document.xml')!.asText())
    expect(zipResultado.file('word/header1.xml')!.asText()).toBe(zipOriginal.file('word/header1.xml')!.asText())

    const imgOriginal = Buffer.from(zipOriginal.file('word/media/image4.png')!.asUint8Array())
    const imgResultado = Buffer.from(zipResultado.file('word/media/image4.png')!.asUint8Array())
    expect(imgResultado.equals(imgOriginal)).toBe(true)
  })

  it('no pierde ninguna parte real (mismo conteo de archivos no-directorio)', () => {
    const original = readFileSync(TEMPLATE_PATH)
    const resultado = reempaquetarZip(original)

    const zipOriginal = new PizZip(original)
    const zipResultado = new PizZip(resultado)

    const archivosOriginal = Object.keys(zipOriginal.files).filter(n => !zipOriginal.files[n].dir).sort()
    const archivosResultado = Object.keys(zipResultado.files).filter(n => !zipResultado.files[n].dir).sort()
    expect(archivosResultado).toEqual(archivosOriginal)
  })
})
