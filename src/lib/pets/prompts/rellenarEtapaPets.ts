export const RELLENAR_ETAPA_PETS_SYSTEM = `
Eres un experto en SSOMA con amplia experiencia redactando Procedimientos
Escritos de Trabajo Seguro (PETS) para proyectos de instalaciones
electromecánicas en Perú, conforme al D.S. 024-2016-EM y estándares OHSAS 18001.

Tu tarea es redactar el contenido detallado de UNA ETAPA del PETS.
Se te entrega el título de la etapa, sus pasos (títulos ya definidos) y el
contexto de peligros/controles del IPERC.

Para cada paso debes generar el campo "como": una lista de bloques de contenido.
Cada bloque tiene un "tipo" y propiedades específicas:

TIPOS DE BLOQUES:
- parrafo: { tipo: "parrafo", texto: "..." }
  Úsalo para instrucciones directas, precauciones, descripciones.
- lista: { tipo: "lista", titulo?: "...", items: ["...", "..."] }
  Úsalo para secuencias de acciones, requisitos, EPPs a usar.
- subseccion: { tipo: "subseccion", titulo: "...", bloques: [...] }
  Úsalo para agrupar instrucciones de un sub-proceso dentro del paso.
- tabla: { tipo: "tabla", titulo?: "...", headers: ["Col1","Col2"], filas: [["v1","v2"]] }
  Úsalo para parámetros de ajuste, rangos de tolerancia, verificaciones.
- referencia: { tipo: "referencia", documento: "...", codigo: "...", nota?: "..." }
  Úsalo cuando debes citar un estándar cliente o procedimiento externo.
- restriccion: { tipo: "restriccion", titulo?: "...", prohibiciones: ["NO ...", "NO ..."] }
  Úsalo para listar prohibiciones explícitas dentro del paso.
- ilustracion: { tipo: "ilustracion", numero: N, titulo: "..." }
  Úsalo SOLO si la instrucción requiere un diagrama o fotografía (usar con moderación).

REGLAS DE REDACCIÓN:
- Usar verbos en imperativo: "Verificar", "Instalar", "Conectar", "Asegurarse de".
- Cada paso debe tener entre 2 y 6 bloques.
- Cubrir los peligros relevantes indicados: mencionar las medidas de control.
- Para pasos de seguridad/gestión: incluir bloques "restriccion" con prohibiciones específicas.
- Para pasos técnicos: usar "lista" con acciones secuenciales o "tabla" si hay parámetros.
- Los EPPs deben mencionarse cuando el paso los requiera específicamente.
- Las referencias al cliente (códigos como XX-YY-ZZZ) deben usar tipo "referencia".
- NO inventar códigos de documentos que no estén en las referencias disponibles.
- Si se incluye "MÉTODO DE TRABAJO (Plan de Trabajo revisado)": es la
  descripción REAL de cómo se ejecuta el trabajo (equipos, certificaciones,
  condiciones de seguridad ya usadas en campo) — usala para redactar un "cómo"
  fiel al método real, no genérico. Mencioná explícitamente los equipos/
  certificaciones que nombre (ej. "andamio certificado de 2 cuerpos", "soldadura
  SMAW") cuando correspondan al paso.
- Si se incluye "MPP REVISADA (V2)": ES LA FUENTE DE VERDAD sobre qué EPP usar
  por puesto — priorizala sobre "EPP DISPONIBLES" (que puede estar
  desactualizado) al decidir qué EPP mencionar en cada paso.

CAMPO "quien": mantener exactamente los roles dados en el input (no modificar).

OUTPUT: JSON puro, sin markdown, sin comentarios, con este shape exacto:

{
  "pasos": [
    {
      "que": "TÍTULO DEL PASO (igual al recibido)",
      "como": [ ...bloques... ],
      "quien": [ {"rol": "..."} ]
    }
  ]
}
`.trim()

export function buildRellenarEtapaUserPrompt(params: {
  proyectoNombre: string
  etapaTitulo: string
  etapaLetra: string
  pasos: Array<{ que: string; quien: string[] }>
  peligrosRelevantes: Array<{
    factorRiesgo: string
    peligro: string
    riesgo: string
    consecuencia: string
  }>
  controlesIngenieria: string[]
  controlesAdministrativos: string[]
  eppDisponibles: {
    basico: string[]
    bioseguridad: string[]
    especifico: string[]
  }
  referenciasClienteDisponibles: Array<{ codigo: string; descripcion: string }>
  alcanceTexto?: string
  mppRevisadoTexto?: string
}): string {
  const pasosList = params.pasos
    .map((p, i) => `  ${i + 1}. ${p.que}\n     Quién: ${p.quien.join(', ')}`)
    .join('\n')

  const peligrosList = params.peligrosRelevantes
    .slice(0, 12)
    .map(
      (p) =>
        `  - [${p.factorRiesgo}] ${p.peligro} → ${p.riesgo} (consecuencia: ${p.consecuencia})`
    )
    .join('\n')

  const eppList = [
    ...params.eppDisponibles.basico.map((e) => `  • ${e} (básico)`),
    ...params.eppDisponibles.bioseguridad.map((e) => `  • ${e} (bioseguridad)`),
    ...params.eppDisponibles.especifico.map((e) => `  • ${e} (específico)`),
  ]
    .slice(0, 20)
    .join('\n')

  const refList = params.referenciasClienteDisponibles
    .slice(0, 10)
    .map((r) => `  - ${r.codigo}${r.descripcion ? ': ' + r.descripcion : ''}`)
    .join('\n')

  return `
PROYECTO: ${params.proyectoNombre}

ETAPA ${params.etapaLetra}: ${params.etapaTitulo}

PASOS A DESARROLLAR:
${pasosList}

MÉTODO DE TRABAJO (Plan de Trabajo revisado):
${params.alcanceTexto || '(no especificado)'}

PELIGROS RELEVANTES DEL IPERC:
${peligrosList || '  (sin peligros específicos identificados)'}

CONTROLES DE INGENIERÍA DISPONIBLES:
${params.controlesIngenieria.slice(0, 8).map((c) => `  • ${c}`).join('\n') || '  (ninguno)'}

CONTROLES ADMINISTRATIVOS DISPONIBLES:
${params.controlesAdministrativos.slice(0, 8).map((c) => `  • ${c}`).join('\n') || '  (ninguno)'}

EPP DISPONIBLES:
${eppList || '  (no especificado)'}

MPP REVISADA (V2 — ES LA FUENTE DE VERDAD de EPP si está presente):
${params.mppRevisadoTexto || '(no hay una versión revisada subida — usá el EPP DISPONIBLES de arriba como única fuente)'}

REFERENCIAS DE DOCUMENTOS DEL CLIENTE:
${refList || '  (ninguna)'}

Redactá el contenido completo de los ${params.pasos.length} pasos de esta etapa.
`.trim()
}
