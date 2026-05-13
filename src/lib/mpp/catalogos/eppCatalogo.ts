export type EppCatalogoSeed = {
  codigo: string
  nombre: string
  categoria: string
  unidad: string
  descripcion?: string
  asignacionesDefault: string[]
}

export const EPP_CATALOGO_SEED: EppCatalogoSeed[] = [
  // ── CABEZA ────────────────────────────────────────────────────────────────
  {
    codigo: 'CAB-001',
    nombre: 'Casco de seguridad clase E',
    categoria: 'Cabeza',
    unidad: 'unidad',
    asignacionesDefault: [
      'Supervisor SSOMA', 'Ingeniero de Proyectos', 'Técnico Electricista',
      'Técnico Mecánico', 'Operador de Equipos', 'Soldador',
      'Rigger / Aparejador', 'Ayudante de Obra', 'Almacenero',
    ],
  },
  {
    codigo: 'CAB-002',
    nombre: 'Casco con suspensión ratchet',
    categoria: 'Cabeza',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador', 'Técnico Electricista'],
  },
  {
    codigo: 'CAB-003',
    nombre: 'Capucha ignífuga',
    categoria: 'Cabeza',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador'],
  },

  // ── OJOS / CARA ───────────────────────────────────────────────────────────
  {
    codigo: 'OJO-001',
    nombre: 'Lentes de seguridad claro',
    categoria: 'Ojos y Cara',
    unidad: 'unidad',
    asignacionesDefault: [
      'Supervisor SSOMA', 'Ingeniero de Proyectos', 'Técnico Electricista',
      'Técnico Mecánico', 'Operador de Equipos', 'Soldador',
      'Rigger / Aparejador', 'Ayudante de Obra',
    ],
  },
  {
    codigo: 'OJO-002',
    nombre: 'Lentes de seguridad oscuro',
    categoria: 'Ojos y Cara',
    unidad: 'unidad',
    asignacionesDefault: ['Operador de Equipos', 'Conductor / Chofer'],
  },
  {
    codigo: 'OJO-003',
    nombre: 'Careta de soldar automática',
    categoria: 'Ojos y Cara',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador'],
  },
  {
    codigo: 'OJO-004',
    nombre: 'Careta facial completa policarbonato',
    categoria: 'Ojos y Cara',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista', 'Técnico Mecánico'],
  },
  {
    codigo: 'OJO-005',
    nombre: 'Goggle antipolvo / antisalpicadura',
    categoria: 'Ojos y Cara',
    unidad: 'unidad',
    asignacionesDefault: ['Ayudante de Obra', 'Almacenero'],
  },

  // ── OÍDOS ─────────────────────────────────────────────────────────────────
  {
    codigo: 'OID-001',
    nombre: 'Tapones auditivos desechables NRR 33',
    categoria: 'Oídos',
    unidad: 'par',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Operador de Equipos',
      'Soldador', 'Ayudante de Obra',
    ],
  },
  {
    codigo: 'OID-002',
    nombre: 'Orejeras de copa NRR 25',
    categoria: 'Oídos',
    unidad: 'unidad',
    asignacionesDefault: ['Operador de Equipos'],
  },

  // ── VÍAS RESPIRATORIAS ────────────────────────────────────────────────────
  {
    codigo: 'RES-001',
    nombre: 'Mascarilla desechable KN95',
    categoria: 'Respiratorio',
    unidad: 'unidad',
    asignacionesDefault: [
      'Supervisor SSOMA', 'Ingeniero de Proyectos', 'Ayudante de Obra', 'Almacenero',
    ],
  },
  {
    codigo: 'RES-002',
    nombre: 'Respirador media cara + filtros P100',
    categoria: 'Respiratorio',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador', 'Técnico Mecánico'],
  },
  {
    codigo: 'RES-003',
    nombre: 'Filtro para vapores orgánicos OV/P100',
    categoria: 'Respiratorio',
    unidad: 'par',
    asignacionesDefault: ['Soldador', 'Técnico Mecánico'],
  },
  {
    codigo: 'RES-004',
    nombre: 'Respirador cara completa doble filtro',
    categoria: 'Respiratorio',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista'],
  },

  // ── MANOS ─────────────────────────────────────────────────────────────────
  {
    codigo: 'MAN-001',
    nombre: 'Guantes de cuero multiflex',
    categoria: 'Manos',
    unidad: 'par',
    asignacionesDefault: [
      'Técnico Mecánico', 'Operador de Equipos', 'Rigger / Aparejador',
      'Ayudante de Obra', 'Almacenero',
    ],
  },
  {
    codigo: 'MAN-002',
    nombre: 'Guantes dieléctricos clase 00 (1000V)',
    categoria: 'Manos',
    unidad: 'par',
    asignacionesDefault: ['Técnico Electricista'],
  },
  {
    codigo: 'MAN-003',
    nombre: 'Guantes de soldador tipo mosquetero',
    categoria: 'Manos',
    unidad: 'par',
    asignacionesDefault: ['Soldador'],
  },
  {
    codigo: 'MAN-004',
    nombre: 'Guantes anticorte nivel 5',
    categoria: 'Manos',
    unidad: 'par',
    asignacionesDefault: ['Técnico Mecánico'],
  },
  {
    codigo: 'MAN-005',
    nombre: 'Guantes nitrilo desechables',
    categoria: 'Manos',
    unidad: 'caja x100',
    asignacionesDefault: ['Supervisor SSOMA', 'Ingeniero de Proyectos'],
  },

  // ── PIES ──────────────────────────────────────────────────────────────────
  {
    codigo: 'PIE-001',
    nombre: 'Botas de seguridad punta de acero',
    categoria: 'Pies',
    unidad: 'par',
    asignacionesDefault: [
      'Supervisor SSOMA', 'Ingeniero de Proyectos', 'Técnico Electricista',
      'Técnico Mecánico', 'Operador de Equipos', 'Soldador',
      'Rigger / Aparejador', 'Ayudante de Obra', 'Almacenero',
    ],
  },
  {
    codigo: 'PIE-002',
    nombre: 'Botas dieléctricas sin punta metálica',
    categoria: 'Pies',
    unidad: 'par',
    asignacionesDefault: ['Técnico Electricista'],
  },
  {
    codigo: 'PIE-003',
    nombre: 'Botas de jebe caña alta (lluvia/lodo)',
    categoria: 'Pies',
    unidad: 'par',
    asignacionesDefault: ['Ayudante de Obra'],
  },
  {
    codigo: 'PIE-004',
    nombre: 'Zapatos de seguridad tipo deportivo ESD',
    categoria: 'Pies',
    unidad: 'par',
    asignacionesDefault: ['Conductor / Chofer', 'Almacenero'],
  },

  // ── CUERPO / ROPA ─────────────────────────────────────────────────────────
  {
    codigo: 'ROP-001',
    nombre: 'Mameluco drill naranja alta visibilidad',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Operador de Equipos',
      'Ayudante de Obra',
    ],
  },
  {
    codigo: 'ROP-002',
    nombre: 'Mameluco ignífugo FR',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador', 'Técnico Electricista'],
  },
  {
    codigo: 'ROP-003',
    nombre: 'Chaleco de alta visibilidad clase 2',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: [
      'Supervisor SSOMA', 'Ingeniero de Proyectos', 'Rigger / Aparejador',
      'Conductor / Chofer', 'Almacenero',
    ],
  },
  {
    codigo: 'ROP-004',
    nombre: 'Delantal de cuero para soldador',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador'],
  },
  {
    codigo: 'ROP-005',
    nombre: 'Polo manga larga con protección UV',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: ['Operador de Equipos', 'Conductor / Chofer'],
  },
  {
    codigo: 'ROP-006',
    nombre: 'Impermeable de PVC con capucha',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: ['Ayudante de Obra', 'Operador de Equipos'],
  },
  {
    codigo: 'ROP-007',
    nombre: 'Pantalón de seguridad drill con refuerzo',
    categoria: 'Ropa de Trabajo',
    unidad: 'unidad',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Rigger / Aparejador',
    ],
  },

  // ── CAÍDAS ────────────────────────────────────────────────────────────────
  {
    codigo: 'CAI-001',
    nombre: 'Arnés de cuerpo completo 4 argollas ANSI',
    categoria: 'Trabajo en Altura',
    unidad: 'unidad',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Soldador',
      'Rigger / Aparejador', 'Ayudante de Obra',
    ],
  },
  {
    codigo: 'CAI-002',
    nombre: 'Línea de vida doble con absorbedor 1.8m',
    categoria: 'Trabajo en Altura',
    unidad: 'unidad',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Soldador',
      'Rigger / Aparejador', 'Ayudante de Obra',
    ],
  },
  {
    codigo: 'CAI-003',
    nombre: 'Cuerda de seguridad de vida 15m',
    categoria: 'Trabajo en Altura',
    unidad: 'unidad',
    asignacionesDefault: ['Rigger / Aparejador'],
  },
  {
    codigo: 'CAI-004',
    nombre: 'Conector de posicionamiento',
    categoria: 'Trabajo en Altura',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista', 'Técnico Mecánico'],
  },
  {
    codigo: 'CAI-005',
    nombre: 'Casco con barboquejo para altura',
    categoria: 'Trabajo en Altura',
    unidad: 'unidad',
    asignacionesDefault: ['Rigger / Aparejador', 'Técnico Electricista'],
  },

  // ── ELÉCTRICO ─────────────────────────────────────────────────────────────
  {
    codigo: 'ELE-001',
    nombre: 'Casco dieléctrico clase E',
    categoria: 'Eléctrico',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista'],
  },
  {
    codigo: 'ELE-002',
    nombre: 'Alfombra dieléctrica 1m x 1m',
    categoria: 'Eléctrico',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista'],
  },
  {
    codigo: 'ELE-003',
    nombre: 'Detector de tensión sin contacto',
    categoria: 'Eléctrico',
    unidad: 'unidad',
    asignacionesDefault: ['Técnico Electricista'],
  },

  // ── SOLDADURA ─────────────────────────────────────────────────────────────
  {
    codigo: 'SOL-001',
    nombre: 'Mangas de cuero para soldador',
    categoria: 'Soldadura',
    unidad: 'par',
    asignacionesDefault: ['Soldador'],
  },
  {
    codigo: 'SOL-002',
    nombre: 'Escarpines de cuero',
    categoria: 'Soldadura',
    unidad: 'par',
    asignacionesDefault: ['Soldador'],
  },
  {
    codigo: 'SOL-003',
    nombre: 'Manta ignífuga fibra de vidrio 1.5x1.5m',
    categoria: 'Soldadura',
    unidad: 'unidad',
    asignacionesDefault: ['Soldador'],
  },

  // ── IZAJE / RIGGER ────────────────────────────────────────────────────────
  {
    codigo: 'IZA-001',
    nombre: 'Guantes de rigger anticorte',
    categoria: 'Izaje',
    unidad: 'par',
    asignacionesDefault: ['Rigger / Aparejador'],
  },
  {
    codigo: 'IZA-002',
    nombre: 'Casco de rigger con protector de cuello',
    categoria: 'Izaje',
    unidad: 'unidad',
    asignacionesDefault: ['Rigger / Aparejador'],
  },

  // ── SEÑALIZACIÓN / EMERGENCIA ─────────────────────────────────────────────
  {
    codigo: 'SEN-001',
    nombre: 'Chaleco de rescate tipo III',
    categoria: 'Emergencia',
    unidad: 'unidad',
    asignacionesDefault: ['Supervisor SSOMA'],
  },
  {
    codigo: 'SEN-002',
    nombre: 'Linterna frontal LED recargable',
    categoria: 'Emergencia',
    unidad: 'unidad',
    asignacionesDefault: [
      'Técnico Electricista', 'Técnico Mecánico', 'Supervisor SSOMA',
    ],
  },

  // ── CONDUCCIÓN ────────────────────────────────────────────────────────────
  {
    codigo: 'CON-001',
    nombre: 'Cinturón de seguridad 3 puntos (control)',
    categoria: 'Conducción',
    unidad: 'unidad',
    asignacionesDefault: ['Conductor / Chofer'],
  },
  {
    codigo: 'CON-002',
    nombre: 'Gafas de sol polarizadas para conducir',
    categoria: 'Conducción',
    unidad: 'unidad',
    asignacionesDefault: ['Conductor / Chofer'],
  },

  // ── VARIOS ────────────────────────────────────────────────────────────────
  {
    codigo: 'VAR-001',
    nombre: 'Protector solar SPF 50+',
    categoria: 'Varios',
    unidad: 'frasco',
    asignacionesDefault: [
      'Operador de Equipos', 'Conductor / Chofer', 'Ayudante de Obra',
    ],
  },
  {
    codigo: 'VAR-002',
    nombre: 'Crema barrera para manos',
    categoria: 'Varios',
    unidad: 'frasco',
    asignacionesDefault: ['Técnico Mecánico', 'Soldador'],
  },
  {
    codigo: 'VAR-003',
    nombre: 'Botiquín personal básico',
    categoria: 'Varios',
    unidad: 'kit',
    asignacionesDefault: ['Supervisor SSOMA'],
  },
  {
    codigo: 'VAR-004',
    nombre: 'Kit de bloqueo LOTO personal',
    categoria: 'Varios',
    unidad: 'kit',
    asignacionesDefault: ['Técnico Electricista', 'Técnico Mecánico'],
  },
  {
    codigo: 'VAR-005',
    nombre: 'Rodilleras de trabajo articuladas',
    categoria: 'Varios',
    unidad: 'par',
    asignacionesDefault: ['Ayudante de Obra', 'Técnico Mecánico'],
  },
]
