import sharp from 'sharp'
import { generarHistogramaEquipoPng, generarHistogramaHHPng } from '@/lib/planTrabajo/generarHistogramaPng'
import type { PlanHistogramas } from '@/types/planTrabajo'

const histogramasFixture: PlanHistogramas = {
  meses: ['2026-02', '2026-03', '2026-04'],
  equipoTrabajo: [
    { etiqueta: 'Construcción', valoresPorMes: [1, 1, 0], total: 2 },
    { etiqueta: 'Comisionamiento', valoresPorMes: [0, 1, 1], total: 2 },
  ],
  horasHombre: [
    { etiqueta: 'Construcción', valoresPorMes: [80, 80, 0], total: 160 },
    { etiqueta: 'Comisionamiento', valoresPorMes: [0, 40, 40], total: 80 },
  ],
}

const histogramasVacio: PlanHistogramas = { meses: [], equipoTrabajo: [], horasHombre: [] }

describe('generarHistogramaEquipoPng / generarHistogramaHHPng', () => {
  it('genera un PNG real (ancho/alto > 0, magic bytes de PNG) a partir de los datos deterministas de Etapa 1', async () => {
    const equipo = await generarHistogramaEquipoPng(histogramasFixture)
    expect(equipo).not.toBeNull()
    expect(equipo!.width).toBeGreaterThan(0)
    expect(equipo!.height).toBeGreaterThan(0)

    const base64 = equipo!.data.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const metadata = await sharp(buffer).metadata()
    expect(metadata.format).toBe('png')
    expect(metadata.width).toBe(equipo!.width)
    expect(metadata.height).toBe(equipo!.height)
  })

  it('genera el gráfico de horas-hombre igual de bien formado', async () => {
    const hh = await generarHistogramaHHPng(histogramasFixture)
    expect(hh).not.toBeNull()
    const buffer = Buffer.from(hh!.data.replace(/^data:image\/png;base64,/, ''), 'base64')
    const metadata = await sharp(buffer).metadata()
    expect(metadata.format).toBe('png')
  })

  it('devuelve null cuando no hay datos (nunca genera un gráfico vacío)', async () => {
    expect(await generarHistogramaEquipoPng(histogramasVacio)).toBeNull()
    expect(await generarHistogramaHHPng(histogramasVacio)).toBeNull()
  })
})
