/**
 * Detección de posible mal-tageo de EDT — heurística por palabras clave, en
 * código, sin LLM. No selecciona ni fuerza nada por sí sola: solo marca un
 * EDT como "posible según cotización — confirma" para que el usuario decida
 * en el Paso 1. Si el usuario lo marca a mano, el mecanismo de corrección ya
 * existente (ProyectoCronogramaEdtCorreccion / botón de pin) se encarga de
 * recordarlo para la próxima vez — ver derivarEdtsSoporte.ts.
 *
 * Complementa (no reemplaza) el mecanismo de corrección: la corrección
 * resuelve "ya sé que falta X, guardalo"; esto resuelve "¿cómo se entera el
 * usuario de que probablemente falta X?".
 */

export interface EvidenciaTexto {
  texto: string
  /** Descripción legible del origen del texto (ej. `Partida "DESARROLLO DE PLANOS"`, "Descripción libre del alcance"). */
  origen: string
  /** Código del EDT al que esta evidencia YA está tageada, si aplica (partidas de cotización). Ausente para texto libre. */
  edtActual?: string
  /**
   * 'alta' = el texto ES el nombre/título de la partida (señal fuerte e
   * intencional). 'baja' (default si se omite) = el texto es una
   * descripción larga o texto libre donde la palabra clave puede aparecer
   * de paso sin que la partida sea realmente sobre eso — ej. "actualización
   * de planos" dentro de una partida de Cierre (as-built) no es lo mismo
   * que una partida llamada "DESARROLLO DE PLANOS". Cuando hay varias
   * evidencias para el mismo EDT, gana la de mayor prioridad.
   */
  prioridad?: 'alta' | 'baja'
}

export interface EdtPosibleDetectado {
  edtNombre: string
  motivo: string
}

interface ReglaDeteccion {
  edtNombre: string
  regex: RegExp
  etiqueta: string
}

const REGLAS_DETECCION: ReglaDeteccion[] = [
  {
    edtNombre: 'PLA',
    regex: /planos?|unifilar(es)?|recorrido de (l[ií]neas|cables)|ubicaci[oó]n de equipos|diagramas?/i,
    etiqueta: 'planos/unifilares/recorrido de líneas/ubicación de equipos',
  },
  {
    edtNombre: 'PLC',
    regex: /programaci[oó]n( de)? plc|\bplc\b|l[oó]gica de control/i,
    etiqueta: 'programación/PLC/lógica',
  },
  {
    edtNombre: 'HMI',
    regex: /pantallas? (hmi|de operador)|\bhmi\b|\bscada\b/i,
    etiqueta: 'pantallas HMI/SCADA',
  },
  {
    // Solo fabricación/armado (taller) — "montaje de tablero" normalmente es
    // instalación EN CAMPO de un tablero ya fabricado (trabajo de CON, no
    // de TAB) y NO debe disparar esta regla.
    edtNombre: 'TAB',
    regex: /fabricaci[oó]n de tablero|armado de tablero/i,
    etiqueta: 'fabricación/armado de tablero (taller)',
  },
]

const ORDEN_PRIORIDAD: Record<'alta' | 'baja', number> = { alta: 0, baja: 1 }

/**
 * Recorre las evidencias (partidas de cotización + descripción libre del
 * alcance) buscando keywords que apunten a un EDT distinto del que ya tiene
 * asignado (o, para texto libre sin EDT propio, cualquier mención). Cuando
 * varias evidencias apuntan al mismo EDT, se cita la de mayor prioridad
 * (el nombre de una partida, no una mención de paso en su descripción).
 * Nunca revienta con evidencias vacías/sin match — simplemente no sugiere
 * nada.
 */
export function detectarEdtsPosibles(evidencias: EvidenciaTexto[]): EdtPosibleDetectado[] {
  const candidatosPorEdt = new Map<string, { evidencia: EvidenciaTexto; regla: ReglaDeteccion }[]>()

  for (const ev of evidencias) {
    if (!ev.texto) continue
    for (const regla of REGLAS_DETECCION) {
      if (!regla.regex.test(ev.texto)) continue
      if (ev.edtActual === regla.edtNombre) continue // ya está bien tageado, no hay nada que sugerir
      const lista = candidatosPorEdt.get(regla.edtNombre) ?? []
      lista.push({ evidencia: ev, regla })
      candidatosPorEdt.set(regla.edtNombre, lista)
    }
  }

  const resultado: EdtPosibleDetectado[] = []
  for (const [edtNombre, candidatos] of candidatosPorEdt) {
    const mejor = [...candidatos].sort(
      (a, b) => ORDEN_PRIORIDAD[a.evidencia.prioridad ?? 'baja'] - ORDEN_PRIORIDAD[b.evidencia.prioridad ?? 'baja']
    )[0]
    resultado.push({
      edtNombre,
      motivo: mejor.evidencia.edtActual
        ? `${mejor.evidencia.origen} está tageada como ${mejor.evidencia.edtActual} pero menciona ${mejor.regla.etiqueta} — ¿incluir ${edtNombre}?`
        : `${mejor.evidencia.origen} menciona ${mejor.regla.etiqueta} — ¿incluir ${edtNombre}?`,
    })
  }

  return resultado
}
