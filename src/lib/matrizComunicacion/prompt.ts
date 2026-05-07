export interface MatrizPromptData {
  nombreProyecto: string
  codigoProyecto: string
  cliente: string
  descripcion?: string
  personal: { nombre: string; siglas: string; cargo: string }[]
  edts: { nombre: string; descripcion?: string }[]
}

export interface MatrizFilaIA {
  orden: number
  informacion: string
  emisor: string
  receptores: string[]
  medio: string
  frecuencia: string
  formato: string
  notas?: string
}

export function buildPromptMatriz(d: MatrizPromptData): string {
  const personalList = d.personal
    .map(p => `  - ${p.siglas}: ${p.nombre} (${p.cargo})`)
    .join('\n')

  const edtList = d.edts
    .map((e, i) => `  ${i + 1}. ${e.nombre}${e.descripcion ? ` — ${e.descripcion}` : ''}`)
    .join('\n')

  return `Eres un consultor de gestión de proyectos para GYS CONTROL INDUSTRIAL SAC.
Genera la Matriz de Comunicaciones (GYS-GPR-MAC) del proyecto.

EMPRESA: GYS CONTROL INDUSTRIAL SAC — automatización y proyectos electromecánicos, Perú
PROYECTO: ${d.nombreProyecto} (${d.codigoProyecto})
CLIENTE: ${d.cliente}
${d.descripcion ? `DESCRIPCIÓN: ${d.descripcion.substring(0, 400)}` : ''}

PERSONAL DEL PROYECTO (siglas → nombre, cargo):
${personalList || '  (sin personal asignado)'}

ACTIVIDADES / EDTs DEL PROYECTO:
${edtList || '  (sin EDTs definidas)'}

INSTRUCCIONES:
Genera entre 12 y 20 filas de comunicación que cubran el ciclo de vida del proyecto:
inicio, planificación, ejecución (avances, inspecciones, seguridad, compras, técnico),
control de cambios, incidentes, cierres parciales y cierre final.

Para cada fila incluye:
- informacion: qué se comunica (ej. "Informe de avance semanal")
- emisor: cargo completo de quien genera (ej. "Gestor de Proyecto")
- receptores: array con las SIGLAS del personal que recibe (ej. ["GY","JM","CA"])
  Usa SOLO las siglas definidas arriba. Incluye siempre al menos al Gestor de Proyecto.
- medio: Reunión | Correo electrónico | Informe escrito | WhatsApp/Teléfono | Sistema GYS
- frecuencia: Diario | Semanal | Quincenal | Mensual | Al evento | Al inicio | Al cierre
- formato: código o nombre del documento (ej. "GYS-GPR-001", "Correo", "Acta", "Informe")
- notas: observación breve o vacío ""

RESPONDE ÚNICAMENTE con un array JSON válido, sin markdown ni explicaciones:
[
  {
    "orden": 0,
    "informacion": "...",
    "emisor": "...",
    "receptores": ["..."],
    "medio": "...",
    "frecuencia": "...",
    "formato": "...",
    "notas": ""
  },
  ...
]`
}
