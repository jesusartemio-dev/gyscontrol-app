import sharp from 'sharp'
import { normalizarImagenOrganigrama } from '@/lib/services/Organigrama/normalizarImagenOrganigrama'

async function pngDePrueba(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { r: 220, g: 220, b: 220, alpha: 1 } } }).png().toBuffer()
}

describe('normalizarImagenOrganigrama', () => {
  it('imagen ya ≥2000px de ancho no se toca (mismo tamaño, mismo aspect ratio) — sin padding', async () => {
    const original = await pngDePrueba(2100, 1000) // ratio 2.1, el caso real de G300
    const resultado = await normalizarImagenOrganigrama(original)
    expect(resultado.width).toBe(2100)
    expect(resultado.height).toBe(1000)
  })

  it('imagen angosta (<2000px) se escala hasta 2000px de ancho preservando el aspect ratio exacto', async () => {
    const original = await pngDePrueba(1000, 500) // ratio 2.0
    const resultado = await normalizarImagenOrganigrama(original)
    expect(resultado.width).toBe(2000)
    expect(resultado.height).toBe(1000) // 2000 / 2.0
  })

  it('nunca fuerza un aspect ratio fijo — dos imágenes de proporciones distintas conservan proporciones distintas', async () => {
    const achatada = await normalizarImagenOrganigrama(await pngDePrueba(1000, 400)) // ratio 2.5
    const cuadrada = await normalizarImagenOrganigrama(await pngDePrueba(1000, 900)) // ratio ~1.11
    expect(achatada.width / achatada.height).toBeCloseTo(2.5, 1)
    expect(cuadrada.width / cuadrada.height).toBeCloseTo(1000 / 900, 1)
  })
})
