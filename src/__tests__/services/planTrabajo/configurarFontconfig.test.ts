import { readFileSync } from 'fs'
import {
  asegurarFontconfigParaHistogramas,
  fuentesDisponibles,
  rutaArchivosFuente,
  _resetFontconfigParaTests,
} from '@/lib/planTrabajo/configurarFontconfig'

/**
 * Informe §13, Bug 1 ("cajitas" en título/leyenda de los histogramas): sharp
 * empaqueta fontconfig pero CERO archivos de fuente reales (confirmado
 * inspeccionando los tarballs npm de @img/sharp-linux-x64 y
 * @img/sharp-libvips-linux-x64) — sin una fuente real bundleada, el runtime
 * serverless de Vercel/Lambda (sin fuentes de sistema) dibuja `.notdef` para
 * todo carácter. Este test NO puede probar que el texto se vea bien (eso
 * requiere medir píxeles de un PNG real en el runtime de producción, ver
 * plan de prueba manual) — solo que la fuente bundleada existe en el repo y
 * que la configuración de fontconfig se genera sin lanzar excepción.
 */
describe('configurarFontconfig — fuente bundleada para los histogramas del §13', () => {
  beforeEach(() => _resetFontconfigParaTests())

  it('las fuentes DejaVu Sans (Regular + Bold) están realmente en el repo, no solo referenciadas', () => {
    expect(fuentesDisponibles()).toBe(true)
    for (const ruta of rutaArchivosFuente()) {
      const buffer = readFileSync(ruta)
      expect(buffer.length).toBeGreaterThan(1000) // no es un archivo vacío/placeholder
    }
  })

  it('asegurarFontconfigParaHistogramas() no lanza y setea FONTCONFIG_FILE apuntando a un fonts.conf real', () => {
    delete process.env.FONTCONFIG_FILE
    expect(() => asegurarFontconfigParaHistogramas()).not.toThrow()
    expect(process.env.FONTCONFIG_FILE).toBeTruthy()

    const contenido = readFileSync(process.env.FONTCONFIG_FILE!, 'utf-8')
    expect(contenido).toContain('<dir>')
    expect(contenido).toContain('fonts.dtd')
    // La ruta embebida debe ser POSIX (barras `/`) — fontconfig no resuelve `\` en Windows.
    expect(contenido).not.toContain('\\')
  })

  it('es idempotente — llamarla 2 veces no falla ni regenera innecesariamente', () => {
    asegurarFontconfigParaHistogramas()
    const primerValor = process.env.FONTCONFIG_FILE
    expect(() => asegurarFontconfigParaHistogramas()).not.toThrow()
    expect(process.env.FONTCONFIG_FILE).toBe(primerValor)
  })
})
