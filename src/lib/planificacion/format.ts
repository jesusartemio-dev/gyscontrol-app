function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b(\w)/g, (c) => c.toUpperCase())
}

export function abreviarNombre(nombre: string): string {
  const words = nombre.trim().split(/\s+/)
  return toTitleCase(words.length > 2 ? words.slice(0, 2).join(' ') : nombre)
}

const CARGO_MAP: Array<[RegExp, string]> = [
  [/^INGENIERO\s+SEMI\s+SENIOR/i, 'Ing. Semi Sr.'],
  [/^INGENIERO\s+SENIOR\s+B/i, 'Ing. Senior B'],
  [/^INGENIERO\s+SENIOR\s+A/i, 'Ing. Senior A'],
  [/^INGENIERO\s+SENIOR/i, 'Ing. Senior'],
  [/^INGENIERO\s+JUNIOR\s+B/i, 'Ing. Junior B'],
  [/^INGENIERO\s+JUNIOR\s+A/i, 'Ing. Junior A'],
  [/^INGENIERO\s+JUNIOR/i, 'Ing. Junior'],
  [/^INGENIERO/i, 'Ingeniero'],
  [/^T[EÉ]CNICO\s+SEMI\s+SENIOR/i, 'Téc. Semi Sr.'],
  [/^T[EÉ]CNICO\s+SENIOR/i, 'Téc. Senior'],
  [/^T[EÉ]CNICO\s+JUNIOR\s+B/i, 'Téc. Junior B'],
  [/^T[EÉ]CNICO\s+JUNIOR\s+A/i, 'Téc. Junior A'],
  [/^T[EÉ]CNICO\s+JUNIOR/i, 'Téc. Junior'],
  [/^T[EÉ]CNICO/i, 'Técnico'],
  [/^OPERADOR/i, 'Operador'],
  [/^GERENTE/i, 'Gerente'],
  [/^JEFE/i, 'Jefe'],
  [/^SUPERVISOR/i, 'Supervisor'],
  [/^ASISTENTE/i, 'Asistente'],
  [/^ESPECIALISTA/i, 'Especialista'],
  [/^ANALISTA/i, 'Analista'],
  [/^RESIDENTE/i, 'Residente'],
  [/^COORDINADOR$/i, 'Coordinador'],
]

export function abreviarCargo(cargo: string | null): string {
  if (!cargo) return ''
  const c = cargo.trim()

  // Coordinador de X → Coord. X (keep department)
  const coordMatch = c.match(/^coordinador\s+de\s+(.+)/i)
  if (coordMatch) return `Coord. ${toTitleCase(coordMatch[1])}`

  for (const [regex, result] of CARGO_MAP) {
    if (regex.test(c)) return result
  }

  const titled = toTitleCase(c)
  return titled.length > 22 ? titled.slice(0, 21) + '…' : titled
}
