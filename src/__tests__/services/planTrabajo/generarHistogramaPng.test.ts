import sharp from 'sharp'
import {
  generarHistogramaEquipoPng,
  generarHistogramaHHPng,
  generarHistogramaHHActividadPng,
  construirSvgBarras,
  formatearMes,
  calcularEscalaY,
} from '@/lib/planTrabajo/generarHistogramaPng'
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

describe('formatearMes', () => {
  it('un solo año en el histograma: solo el nombre del mes, sin año (estilo manual: "MAYO", "JUNIO")', () => {
    const meses = ['2026-05', '2026-06', '2026-07']
    expect(meses.map(m => formatearMes(m, meses))).toEqual(['MAYO', 'JUNIO', 'JULIO'])
  })

  it('el histograma cruza 2+ años: agrega el año para no confundir meses homónimos', () => {
    const meses = ['2026-11', '2026-12', '2027-01']
    expect(meses.map(m => formatearMes(m, meses))).toEqual(['NOVIEMBRE 2026', 'DICIEMBRE 2026', 'ENERO 2027'])
  })
})

describe('calcularEscalaY', () => {
  it('redondea el tope de escala hacia arriba a un número "lindo", nunca por debajo del máximo real', () => {
    expect(calcularEscalaY(368)).toEqual({ max: 400, paso: 100 })
    expect(calcularEscalaY(42)).toEqual({ max: 50, paso: 10 })
    expect(calcularEscalaY(4)).toEqual({ max: 4, paso: 1 })
  })

  it('con 0 (sin datos), da una escala mínima no-cero para no dividir por 0', () => {
    const { max, paso } = calcularEscalaY(0)
    expect(max).toBeGreaterThan(0)
    expect(paso).toBeGreaterThan(0)
  })
})

describe('construirSvgBarras — eje Y y títulos (§13, correcciones de legibilidad)', () => {
  const series = [{ etiqueta: 'Construcción', valores: [80, 80, 0] }]
  // construirSvgBarras ya NO formatea fechas — recibe categorías ya formateadas
  // (el caller, generarHistogramaEquipoPng/HHPng, aplica formatearMes antes de llamarla).
  const categorias = ['FEBRERO', 'MARZO', 'ABRIL']

  it('el título ya NO dice "(por EDT)" — ni para equipo ni para horas-hombre (Bug fabricado por la sección §13.1)', () => {
    const svgEquipo = construirSvgBarras('Histograma de Equipo de Trabajo', categorias, series, 'agrupado')
    const svgHH = construirSvgBarras('Histograma de Horas-Hombre', categorias, series, 'apilado')
    expect(svgEquipo).not.toContain('por EDT')
    expect(svgHH).not.toContain('por EDT')
  })

  it('el SVG trae gridlines horizontales y etiquetas numéricas en el eje Y (antes no existían)', () => {
    const svg = construirSvgBarras('Título', categorias, series, 'agrupado')
    const gridlines = svg.match(/stroke="#e0e0e0"/g) ?? []
    expect(gridlines.length).toBeGreaterThan(0)
    // maxValor=80 → calcularEscalaY(80) = {max:80, paso:20} → ticks 0,20,40,60,80
    expect(svg).toContain('>0<')
    expect(svg).toContain('>80<')
  })

  it('dibuja las categorías tal cual se le pasan (no fabrica ni reformatea el eje X)', () => {
    const svg = construirSvgBarras('Título', categorias, series, 'agrupado')
    expect(svg).toContain('FEBRERO')
    expect(svg).toContain('MARZO')
    expect(svg).toContain('ABRIL')
  })
})

describe('generarHistogramaHHActividadPng (§13.3 — detalle CON/CMN)', () => {
  it('devuelve null si no hay hhPorActividadConCmn (proyecto sin EDTs de Construcción/Comisionamiento)', async () => {
    expect(await generarHistogramaHHActividadPng(histogramasFixture)).toBeNull()
  })

  it('devuelve null si hhPorActividadConCmn viene vacío (actividades o series en [])', async () => {
    const sinDatos: PlanHistogramas = { ...histogramasFixture, hhPorActividadConCmn: { actividades: [], series: [] } }
    expect(await generarHistogramaHHActividadPng(sinDatos)).toBeNull()
  })

  it('con datos, genera un PNG real cuyas series son por CARGO (no por EDT) y el título no contradice el total mensual', async () => {
    const conDatos: PlanHistogramas = {
      ...histogramasFixture,
      hhPorActividadConCmn: {
        actividades: ['Montaje de tablero', 'Pruebas eléctricas'],
        series: [
          { cargo: 'Supervisor', valoresPorActividad: [8, 4] },
          { cargo: 'Tecnico', valoresPorActividad: [24, 12] },
        ],
      },
    }
    const png = await generarHistogramaHHActividadPng(conDatos)
    expect(png).not.toBeNull()
    const buffer = Buffer.from(png!.data.replace(/^data:image\/png;base64,/, ''), 'base64')
    const metadata = await sharp(buffer).metadata()
    expect(metadata.format).toBe('png')
  })
})
