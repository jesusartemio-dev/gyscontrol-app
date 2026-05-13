import type { ContextoMpp } from '../cargarContexto'

export interface AjusteMpp {
  eppNombre: string
  puesto: string
  accion: 'agregar' | 'quitar'
  razon: string
}

export function construirPromptAjustes(contexto: ContextoMpp): string {
  return `Sos un experto en seguridad industrial de GYS Control Industrial SAC (Perú).
Tu tarea es analizar los peligros reales de un proyecto y proponer AJUSTES al MPP
(Matriz de EPP por Puesto) basándote en los peligros del IPERC.

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
ASIGNACIONES DEFAULT DEL CATÁLOGO MPP (${contexto.catalogoCount} EPPs estándar GYS)
═══════════════════════════════════════════════════════════════════

Este es el MPP base que se aplica por defecto. Analizá si conviene
AGREGAR o QUITAR EPPs específicos según los peligros reales del proyecto.

${Object.entries(contexto.defaultsActuales)
  .map(([epp, puestos]) => `  ${epp}: ${puestos.join(', ')}`)
  .join('\n')}

═══════════════════════════════════════════════════════════════════
TU TAREA
═══════════════════════════════════════════════════════════════════

Analizá si las asignaciones por defecto son adecuadas para los peligros reales.
Propone solo los AJUSTES NECESARIOS (no repitas asignaciones que ya están bien).

Criterios:
- Si hay peligro ELÉCTRICO de severidad ≥3 → asegurate de que los puestos
  expuestos tengan EPPs eléctricos (guantes dieléctricos, caretas para arco).
- Si hay peligro QUÍMICO → guantes de nitrilo/neopreno, lentes de seguridad.
- Si hay trabajos en ALTURA → arnés de cuerpo completo, línea de vida doble.
- Si hay SOLDADURA → careta de soldar, mandil, mangas y escarpines de cuero.
- Si hay POLVO/MATERIAL PARTICULADO → respiradores con filtros P100.
- Si hay RUIDO intenso → orejeras de copa además de tapones.

RESPONDÉ EN FORMATO JSON ESTRICTO (sin texto antes ni después):

{
  "ajustes": [
    {
      "eppNombre": "Careta de soldar automática",
      "puesto": "Soldador",
      "accion": "agregar",
      "razon": "Aparece tarea de soldadura en el IPERC con severidad 3"
    }
  ],
  "resumen": "Breve descripción de los ajustes propuestos"
}

REGLAS CRÍTICAS:
- Los nombres de EPPs DEBEN coincidir EXACTAMENTE con los del catálogo de arriba (case sensitive).
- Los puestos DEBEN ser uno de: ${contexto.iperc.resumenPorPuesto.map((r) => r.puesto).join(', ')}.
- Genera entre 0 y 30 ajustes. Si no hay nada que cambiar, devolvé "ajustes": [].
- Sé conservador: solo ajustes claramente justificados por el IPERC.
- "razon" en una sola frase corta, en español.
`
}
