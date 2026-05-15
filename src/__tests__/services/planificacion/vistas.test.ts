import {
  colorParaProyecto,
  iniciales,
  toDateKey,
  addDays,
  dateToISOWeek,
  parseISOWeek,
  COLORES_PROYECTO,
} from '@/lib/utils/planificacion'

describe('colorParaProyecto', () => {
  it('el mismo ID siempre devuelve el mismo color', () => {
    const id = 'proyecto-abc-123'
    const color1 = colorParaProyecto(id)
    const color2 = colorParaProyecto(id)
    expect(color1).toBe(color2)
  })

  it('devuelve un color de la paleta COLORES_PROYECTO', () => {
    const ids = ['id-1', 'id-2', 'id-3', 'proyecto-xyz', 'abc123def456']
    for (const id of ids) {
      const color = colorParaProyecto(id)
      expect(COLORES_PROYECTO).toContain(color)
    }
  })

  it('IDs distintos pueden devolver colores distintos', () => {
    const colores = new Set(
      Array.from({ length: 20 }, (_, i) => colorParaProyecto(`proyecto-${i}`)),
    )
    // Con 20 IDs distintos debería haber al menos 2 colores diferentes
    expect(colores.size).toBeGreaterThan(1)
  })

  it('devuelve una cadena hex válida', () => {
    const color = colorParaProyecto('test-id')
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('ID vacío devuelve un color válido (no lanza error)', () => {
    expect(() => colorParaProyecto('')).not.toThrow()
    expect(COLORES_PROYECTO).toContain(colorParaProyecto(''))
  })
})

describe('iniciales', () => {
  it('"Juan Ramírez" → "JR"', () => {
    expect(iniciales('Juan Ramírez')).toBe('JR')
  })

  it('"María" → "M"', () => {
    expect(iniciales('María')).toBe('M')
  })

  it('"Pedro José García López" → "PJ" (máximo 2 iniciales)', () => {
    expect(iniciales('Pedro José García López')).toBe('PJ')
  })

  it('cadena vacía → ""', () => {
    expect(iniciales('')).toBe('')
  })

  it('nombre con múltiples espacios → ignora espacios vacíos', () => {
    expect(iniciales('  Ana   Lucía  ')).toBe('AL')
  })

  it('nombre en minúsculas → iniciales en mayúsculas', () => {
    expect(iniciales('carlos mendoza')).toBe('CM')
  })
})

describe('toDateKey', () => {
  it('convierte un Date UTC a "YYYY-MM-DD"', () => {
    const d = new Date('2026-05-25T00:00:00.000Z')
    expect(toDateKey(d)).toBe('2026-05-25')
  })

  it('usa UTC (no la hora local)', () => {
    // Medianoche UTC no debe ser "el día anterior"
    const d = new Date('2026-01-01T00:00:00.000Z')
    expect(toDateKey(d)).toBe('2026-01-01')
  })

  it('maneja fin de mes correctamente', () => {
    const d = new Date('2026-02-28T00:00:00.000Z')
    expect(toDateKey(d)).toBe('2026-02-28')
  })

  it('maneja año bisiesto', () => {
    const d = new Date('2024-02-29T00:00:00.000Z')
    expect(toDateKey(d)).toBe('2024-02-29')
  })
})

describe('addDays', () => {
  it('suma días positivos correctamente', () => {
    const d = new Date('2026-05-25T00:00:00.000Z')
    expect(addDays(d, 5).toISOString().slice(0, 10)).toBe('2026-05-30')
  })

  it('suma 0 días devuelve la misma fecha', () => {
    const d = new Date('2026-05-25T00:00:00.000Z')
    expect(addDays(d, 0).getTime()).toBe(d.getTime())
  })

  it('suma negativos retrocede', () => {
    const d = new Date('2026-05-25T00:00:00.000Z')
    expect(addDays(d, -1).toISOString().slice(0, 10)).toBe('2026-05-24')
  })
})

describe('dateToISOWeek', () => {
  it('lunes 2026-05-25 → "2026-W22"', () => {
    const d = new Date('2026-05-25T00:00:00.000Z')
    expect(dateToISOWeek(d)).toBe('2026-W22')
  })

  it('primer día del año 2026 (jueves) → semana del año anterior ISO', () => {
    // 2026-01-01 es jueves, que pertenece a 2026-W01
    const d = new Date('2026-01-01T00:00:00.000Z')
    expect(dateToISOWeek(d)).toBe('2026-W01')
  })

  it('2024-01-01 (lunes) → "2024-W01"', () => {
    const d = new Date('2024-01-01T00:00:00.000Z')
    expect(dateToISOWeek(d)).toBe('2024-W01')
  })

  it('2025-12-29 (lunes) → "2026-W01" (pertenece a la semana 1 de 2026 ISO)', () => {
    const d = new Date('2025-12-29T00:00:00.000Z')
    expect(dateToISOWeek(d)).toBe('2026-W01')
  })

  it('es consistente con parseISOWeek (ida y vuelta)', () => {
    const semanas = ['2026-W01', '2026-W10', '2026-W22', '2026-W40', '2026-W52']
    for (const s of semanas) {
      const lunes = parseISOWeek(s)
      expect(dateToISOWeek(lunes)).toBe(s)
    }
  })
})
