// Horarios por defecto de cada turno (ingreso y salida), editables al planificar.
// A: 07:30–18:00 (9.5h) · B: 14:00–11:30 (día sig.) · C: 19:30–06:00 (día sig.)
export type TurnoAsignable = 'turno_a' | 'turno_b' | 'turno_c'

export const TURNO_LETRA: Record<string, string> = {
  turno_a: 'A',
  turno_b: 'B',
  turno_c: 'C',
  dia_completo: 'A',
}

export const TURNO_HORA_DEFAULT: Record<TurnoAsignable, { ingreso: string; salida: string }> = {
  turno_a: { ingreso: '07:30', salida: '18:00' },
  turno_b: { ingreso: '14:00', salida: '11:30' },
  turno_c: { ingreso: '19:30', salida: '06:00' },
}

// Normaliza un turno (incl. el legacy 'dia_completo') a uno asignable A/B/C.
export function turnoAsignable(turno: string): TurnoAsignable {
  return turno === 'turno_b' || turno === 'turno_c' ? turno : 'turno_a'
}

// true si el turno cruza la medianoche (salida <= ingreso), p. ej. 14:00 a 11:30.
export function turnoCruzaMedianoche(ingreso: string, salida: string): boolean {
  return !!ingreso && !!salida && salida <= ingreso
}
