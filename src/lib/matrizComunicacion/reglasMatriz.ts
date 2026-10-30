/**
 * Reglas de la Matriz de Comunicaciones: qué frecuencia, qué medio y quién
 * participa en cada EDT. Son reglas de negocio globales, iguales para todo
 * proyecto; lo único que varía es QUIÉN ocupa cada puesto, y eso sale del
 * organigrama.
 *
 * Reemplazan las heurísticas en texto libre que vivían dentro del prompt de la
 * IA. Aquellas emparejaban por el NOMBRE del EDT, no por quién hace el trabajo:
 * la línea "Cadista: E en Documentación" hacía que el cadista emitiera los
 * "Documentos de Ingeniería" por parecido de texto, cuando los escribe el
 * Coordinador de Ingeniería. Además la IA no es determinista, así que dos
 * generaciones del mismo proyecto podían dar matrices distintas.
 *
 * El código "R" (Autoriza) NO se define acá: sigue saliendo de la tabla
 * EDT->rol más la subida de nivel de aplicarReglaResponsable.ts.
 */

/** D=Destinatario E=Emisor S=Soporte V=Valida. Vacío = no participa. */
export type CodigoParticipacion = 'D' | 'E' | 'S' | 'V' | 'DV' | 'DS' | ''

export interface ReglaEdt {
  /** D=Diario S=Semanal M=Mensual E=Eventual */
  frecuencia: 'D' | 'S' | 'M' | 'E'
  /** I=Informe M=Minuta E=Email R=Reunión P=Planilla IE=Informe+Email IR=Informe+Reunión */
  medio: 'I' | 'M' | 'E' | 'R' | 'P' | 'IE' | 'IR'
  /** Qué hace el cliente. Por defecto aprueba: en GYS el cliente valida casi todo. */
  cliente: 'DV' | 'D' | ''
  /** Puesto del catálogo -> código. Quien no aparece, no participa. */
  participacion: Record<string, CodigoParticipacion>
}

export const CLIENTE_POR_DEFECTO = 'DV' as const

/**
 * Indexada por el nombre del EDT en el catálogo ("GES", "CON"…), que es lo que
 * el resto del módulo llama `codigo`.
 *
 * GEN y PRE quedan fuera a propósito, igual que en la tabla EDT->rol: un EDT no
 * listado no se inventa, su fila sale vacía y con advertencia.
 */
export const REGLAS_MATRIZ: Record<string, ReglaEdt> = {
  // ── Gestión ──────────────────────────────────────────────────────────────
  GES: {
    frecuencia: 'E', medio: 'IR', cliente: 'DV',
    // El plan, el cronograma y el organigrama los tiene que conocer el equipo
    // que ejecuta, no solo el cliente: antes nadie del equipo los recibía.
    participacion: {
      'Gestor de Proyectos': 'E',
      'Supervisor de Campo': 'D',
      'Ingeniero de Seguridad': 'D',
      'Coordinador de Ingeniería': 'D',
    },
  },
  CTL: {
    frecuencia: 'S', medio: 'IE', cliente: 'DV',
    // Comercial recibe el seguimiento porque de ahí salen las valorizaciones.
    participacion: { 'Gestor de Proyectos': 'E', 'Comercial': 'D' },
  },
  CIE: {
    frecuencia: 'E', medio: 'IR', cliente: 'DV',
    // El informe de cierre, el dossier y el acta los emite el Gestor. El
    // cadista aporta los planos as-built como soporte, no como emisor, y
    // Comercial recibe por el cierre contractual.
    participacion: {
      'Gestor de Proyectos': 'E',
      'Cadista': 'S',
      'Programador': 'S',
      'Comercial': 'D',
    },
  },

  // ── Seguridad ────────────────────────────────────────────────────────────
  SEG: {
    frecuencia: 'E', medio: 'IR', cliente: 'DV',
    participacion: { 'Ingeniero de Seguridad': 'E' },
  },
  SSO: {
    frecuencia: 'S', medio: 'IE', cliente: 'DV',
    // El supervisor de campo alimenta el seguimiento con la información de obra.
    participacion: { 'Ingeniero de Seguridad': 'E', 'Supervisor de Campo': 'S' },
  },

  // ── Ingeniería de oficina ────────────────────────────────────────────────
  ING: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    participacion: {
      'Coordinador de Ingeniería': 'E',
      'Cadista': 'S',
      'Supervisor de Proyecto': 'V',
      'Supervisor de Campo': 'D',
    },
  },
  PLA: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    participacion: { 'Cadista': 'E', 'Coordinador de Ingeniería': 'V' },
  },
  PLC: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    participacion: { 'Programador': 'E', 'Coordinador de Ingeniería': 'V' },
  },
  HMI: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    participacion: { 'Programador': 'E', 'Coordinador de Ingeniería': 'V' },
  },

  // ── Procura ──────────────────────────────────────────────────────────────
  PRO: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    // Ingeniería hace la evaluación técnica; el cliente aprueba antes de comprar.
    participacion: {
      'Logística': 'E',
      'Coordinador de Ingeniería': 'S',
      'Supervisor de Campo': 'D',
    },
  },
  SER: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    // SSOMA valida la certificación de andamios; el supervisor necesita saber
    // cuándo llegan porque los usa.
    participacion: {
      'Logística': 'E',
      'Supervisor de Campo': 'D',
      'Ingeniero de Seguridad': 'V',
    },
  },

  // ── Ejecución ────────────────────────────────────────────────────────────
  TAB: {
    frecuencia: 'E', medio: 'IE', cliente: 'DV',
    // El armado es en taller GYS, no en planta: SSOMA no participa. El cadista
    // recibe para el as-built y el cliente firma el protocolo de FAT.
    participacion: { 'Coordinador de Ingeniería': 'E', 'Cadista': 'D' },
  },
  CON: {
    frecuencia: 'D', medio: 'I', cliente: 'DV',
    // En campo SSOMA acompaña de forma permanente, no solo recibe.
    participacion: { 'Supervisor de Campo': 'E', 'Ingeniero de Seguridad': 'S' },
  },
  CMM: {
    frecuencia: 'E', medio: 'IR', cliente: 'DV',
    participacion: { 'Supervisor de Campo': 'E', 'Programador': 'S' },
  },
}

export function obtenerReglaEdt(codigo: string): ReglaEdt | null {
  return REGLAS_MATRIZ[codigo.toUpperCase().trim()] ?? null
}
