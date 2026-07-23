import type { ContextoMpp } from '../cargarContexto'

export interface AjusteMpp {
  eppNombre: string
  puesto: string
  accion: 'agregar' | 'quitar'
  razon: string
}

export function construirPromptAjustes(contexto: ContextoMpp): string {
  return `Sos un experto en seguridad industrial de GYS Control Industrial SAC (Perú).
Tu tarea es analizar los peligros reales de un proyecto y ASIGNAR el EPP adecuado
a cada puesto de trabajo del proyecto (Matriz de EPP por Puesto), en base a los
peligros del IPERC.

═══════════════════════════════════════════════════════════════════
DATOS DEL PROYECTO
═══════════════════════════════════════════════════════════════════
- Nombre: ${contexto.proyecto.nombre}
- Código: ${contexto.proyecto.codigo}

═══════════════════════════════════════════════════════════════════
PELIGROS DEL IPERC (${contexto.iperc.totalFilas} filas analizadas)
═══════════════════════════════════════════════════════════════════

Factores de riesgo presentes: ${contexto.iperc.factoresGlobales.join(', ')}

Peligros críticos (severidad ≥3) detectados:
${contexto.iperc.peligrosCriticosAltos.map((p) => `  - ${p}`).join('\n')}

Peligros por puesto de trabajo:
${contexto.iperc.resumenPorPuesto
  .map(
    (r) => `
  Puesto: ${r.puesto}
  - Cantidad de filas con peligros: ${r.cantidadFilas}
  - Factores de riesgo: ${Object.entries(r.factoresRiesgo)
    .map(([f, c]) => `${f}(${c})`)
    .join(', ')}
  - Severidad máxima: ${r.severidadMax}
  - Peligros más frecuentes: ${r.peligrosFrecuentes.slice(0, 3).join('; ')}`
  )
  .join('\n')}

═══════════════════════════════════════════════════════════════════
IPERC REVISADO (V2 — esta es LA FUENTE DE VERDAD si está presente)
═══════════════════════════════════════════════════════════════════

${contexto.iperc.revisadoTexto || '(no hay una versión revisada subida — usá el resumen por puesto de arriba como única fuente)'}

═══════════════════════════════════════════════════════════════════
CATÁLOGO DE EPP DISPONIBLES (${contexto.catalogoCount} items)
═══════════════════════════════════════════════════════════════════

La matriz está VACÍA — no hay asignaciones previas. Elegí, para cada EPP que
corresponda, a qué puesto(s) asignarlo según los peligros reales del proyecto.

${contexto.catalogoEpp
  .map((e) => `  ${e.nombre} — riesgo: ${e.riesgo} — parte del cuerpo: ${e.parteCuerpo}`)
  .join('\n')}

═══════════════════════════════════════════════════════════════════
TU TAREA
═══════════════════════════════════════════════════════════════════

Asigná el EPP adecuado a cada uno de los puestos del proyecto según los
peligros del IPERC. Partís de una matriz vacía: cada asignación que propongas
es una acción "agregar" (no hay nada que "quitar" todavía).

Si está presente el "IPERC REVISADO (V2)": es la fuente de verdad — fue
corregido y aprobado a mano por SSOMA. Basá tu análisis en ESE contenido, no
en el resumen por puesto (que puede estar desactualizado si el IPERC cambió
después de generarse). El resumen por puesto solo te sirve de estructura/
referencia si no hay V2.

Criterios:
- Si hay peligro ELÉCTRICO de severidad ≥3 → asegurate de que los puestos
  expuestos tengan EPPs eléctricos (guantes dieléctricos, caretas para arco).
- Si hay peligro QUÍMICO → guantes de nitrilo/neopreno, lentes de seguridad.
- Si hay trabajos en ALTURA → arnés de cuerpo completo, línea de vida doble.
- Si hay SOLDADURA → careta de soldar, mandil, mangas y escarpines de cuero.
- Si hay POLVO/MATERIAL PARTICULADO → respiradores con filtros P100.
- Si hay RUIDO intenso → orejeras de copa además de tapones.
- Los EPPs básicos (casco, lentes claros, calzado de seguridad, chaleco) van
  para TODOS los puestos que estén expuestos a trabajo de campo.

RESPONDÉ EN FORMATO JSON ESTRICTO (sin texto antes ni después):

{
  "ajustes": [
    {
      "eppNombre": "Careta de soldar automática",
      "puesto": "${contexto.puestos[0] ?? 'Residente'}",
      "accion": "agregar",
      "razon": "Aparece tarea de soldadura en el IPERC con severidad 3"
    }
  ],
  "resumen": "Breve descripción de las asignaciones propuestas"
}

REGLAS CRÍTICAS:
- Los nombres de EPPs DEBEN coincidir EXACTAMENTE con los del catálogo de arriba (case sensitive).
- Los puestos DEBEN ser EXACTAMENTE uno de los siguientes cargos del proyecto (sin variaciones):
${contexto.puestos.map((p) => `  "${p}"`).join('\n')}
- NO uses puestos del IPERC que no estén en la lista de arriba. Si un puesto del IPERC
  no está en la lista, mapéalo al cargo más cercano de la lista, o ignoralo.
- "accion" va a ser casi siempre "agregar" (la matriz parte vacía).
- Genera todas las asignaciones necesarias — no hay límite artificial, pero sé preciso:
  solo EPP claramente justificado por los peligros del proyecto para ese puesto.
- Sé conservador: solo asignaciones claramente justificadas por el IPERC.
- "razon" en una sola frase corta, en español.
`
}
