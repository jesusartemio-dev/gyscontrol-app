import { computeSeleccionRectangulo, toggleCeldaEnSeleccion } from '@/lib/planificacion/seleccion'

const userIds = ['u1', 'u2', 'u3']
const fechas = ['2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29']
const vacio = () => []

describe('computeSeleccionRectangulo', () => {
  it('3 personas × 5 días sin asignaciones → 15 claves', () => {
    const result = computeSeleccionRectangulo('u1', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, vacio)
    expect(result.size).toBe(15)
    expect(result.has('u1|2026-05-25')).toBe(true)
    expect(result.has('u3|2026-05-29')).toBe(true)
    expect(result.has('u2|2026-05-27')).toBe(true)
  })

  it('filtro: celdas con proyecto asignado no se incluyen', () => {
    const getCeldas = (userId: string, fecha: string) =>
      userId === 'u2' && fecha === '2026-05-26' ? [{ tipo: 'proyecto' as const }] : []
    const result = computeSeleccionRectangulo('u1', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, getCeldas)
    expect(result.size).toBe(14)
    expect(result.has('u2|2026-05-26')).toBe(false)
  })

  it('filtro: celdas de ausencia no se incluyen', () => {
    const getCeldas = (userId: string, fecha: string) =>
      userId === 'u1' && fecha === '2026-05-27' ? [{ tipo: 'ausencia' as const }] : []
    const result = computeSeleccionRectangulo('u1', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, getCeldas)
    expect(result.size).toBe(14)
    expect(result.has('u1|2026-05-27')).toBe(false)
  })

  it('filtro: múltiples celdas ocupadas en la selección', () => {
    const ocupadas = new Set(['u1|2026-05-25', 'u2|2026-05-26', 'u3|2026-05-29'])
    const getCeldas = (userId: string, fecha: string) =>
      ocupadas.has(`${userId}|${fecha}`) ? [{ tipo: 'proyecto' as const }] : []
    const result = computeSeleccionRectangulo('u1', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, getCeldas)
    expect(result.size).toBe(12)
    for (const k of ocupadas) expect(result.has(k)).toBe(false)
  })

  it('selección de una sola celda → 1 clave', () => {
    const result = computeSeleccionRectangulo('u2', '2026-05-26', 'u2', '2026-05-26', userIds, fechas, vacio)
    expect(result.size).toBe(1)
    expect(result.has('u2|2026-05-26')).toBe(true)
  })

  it('rectángulo invertido (drag de derecha-abajo a izquierda-arriba) produce el mismo resultado', () => {
    const a = computeSeleccionRectangulo('u1', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, vacio)
    const b = computeSeleccionRectangulo('u3', '2026-05-29', 'u1', '2026-05-25', userIds, fechas, vacio)
    expect(a.size).toBe(b.size)
    for (const k of a) expect(b.has(k)).toBe(true)
  })

  it('userId desconocido → Set vacío', () => {
    const result = computeSeleccionRectangulo('uX', '2026-05-25', 'u3', '2026-05-29', userIds, fechas, vacio)
    expect(result.size).toBe(0)
  })

  it('fecha desconocida → Set vacío', () => {
    const result = computeSeleccionRectangulo('u1', '2026-06-01', 'u3', '2026-05-29', userIds, fechas, vacio)
    expect(result.size).toBe(0)
  })

  it('1 persona × 5 días → 5 claves', () => {
    const result = computeSeleccionRectangulo('u2', '2026-05-25', 'u2', '2026-05-29', userIds, fechas, vacio)
    expect(result.size).toBe(5)
    for (const f of fechas) expect(result.has(`u2|${f}`)).toBe(true)
  })
})

describe('toggleCeldaEnSeleccion', () => {
  it('Ctrl+click desde idle → selección de 1 celda', () => {
    const result = toggleCeldaEnSeleccion({ type: 'idle' }, 'u1', '2026-05-25')
    expect(result.type).toBe('selected')
    if (result.type === 'selected') {
      expect(result.celdas.size).toBe(1)
      expect(result.celdas.has('u1|2026-05-25')).toBe(true)
      expect(result.anchorUserId).toBe('u1')
      expect(result.anchorFecha).toBe('2026-05-25')
    }
  })

  it('Ctrl+click acumulativo: 3 celdas distintas → set con 3 elementos', () => {
    let state = toggleCeldaEnSeleccion({ type: 'idle' }, 'u1', '2026-05-25')
    state = toggleCeldaEnSeleccion(state, 'u1', '2026-05-26')
    state = toggleCeldaEnSeleccion(state, 'u2', '2026-05-25')
    expect(state.type).toBe('selected')
    if (state.type === 'selected') {
      expect(state.celdas.size).toBe(3)
      expect(state.celdas.has('u1|2026-05-25')).toBe(true)
      expect(state.celdas.has('u1|2026-05-26')).toBe(true)
      expect(state.celdas.has('u2|2026-05-25')).toBe(true)
    }
  })

  it('Ctrl+click sobre celda ya seleccionada → toggle (quita la celda)', () => {
    let state = toggleCeldaEnSeleccion({ type: 'idle' }, 'u1', '2026-05-25')
    state = toggleCeldaEnSeleccion(state, 'u1', '2026-05-26')
    state = toggleCeldaEnSeleccion(state, 'u1', '2026-05-25') // quitar primera
    expect(state.type).toBe('selected')
    if (state.type === 'selected') {
      expect(state.celdas.size).toBe(1)
      expect(state.celdas.has('u1|2026-05-25')).toBe(false)
      expect(state.celdas.has('u1|2026-05-26')).toBe(true)
    }
  })

  it('Ctrl+click quita la única celda → state vuelve a idle', () => {
    let state = toggleCeldaEnSeleccion({ type: 'idle' }, 'u1', '2026-05-25')
    state = toggleCeldaEnSeleccion(state, 'u1', '2026-05-25')
    expect(state.type).toBe('idle')
  })

  it('Cmd+click (metaKey) — la lógica de toggle es idéntica al Ctrl+click', () => {
    // metaKey vs ctrlKey distinción vive en el caller (page.tsx); toggleCeldaEnSeleccion es agnóstico
    // Verificamos que el mismo resultado se produce independientemente del modificador de teclado
    const fromIdle = toggleCeldaEnSeleccion({ type: 'idle' }, 'u-mac', '2026-05-27')
    expect(fromIdle.type).toBe('selected')
    if (fromIdle.type === 'selected') {
      expect(fromIdle.celdas.has('u-mac|2026-05-27')).toBe(true)
    }
    // Toggle off (simula segundo Cmd+click sobre la misma celda)
    const toggled = toggleCeldaEnSeleccion(fromIdle, 'u-mac', '2026-05-27')
    expect(toggled.type).toBe('idle')
  })

  it('Ctrl+click desde estado selecting (drag en curso) → crea nueva selección de 1 celda', () => {
    const selecting = { type: 'selecting', origenUserId: 'u1', origenFecha: '2026-05-25', actualUserId: 'u2', actualFecha: '2026-05-26' }
    const result = toggleCeldaEnSeleccion(selecting, 'u3', '2026-05-27')
    expect(result.type).toBe('selected')
    if (result.type === 'selected') {
      expect(result.celdas.size).toBe(1)
      expect(result.celdas.has('u3|2026-05-27')).toBe(true)
    }
  })
})
