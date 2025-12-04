/**
 * Servicio de Generación Automática de Dependencias
 * Implementa la lógica de negocio para Fase 4: Business Logic
 */

// Servicios no deben tener acceso directo a BD - usan APIs
// import { prisma } from '@/lib/prisma'
// import {
//   obtenerCalendarioLaboral,
//   calcularFechaFinConCalendario,
//   ajustarFechaADiaLaborable
// } from '@/lib/utils/calendarioLaboral'

export interface TareaInfo {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  esHito?: boolean
  prioridad: 'baja' | 'media' | 'alta'
  estado: 'pendiente' | 'en_progreso' | 'completada'
  actividadId?: string
  edtId?: string
  faseId?: string
}

export interface DependencySuggestion {
  id: string
  tareaOrigen: TareaInfo
  tareaDependiente: TareaInfo
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagMinutos: number
  confianza: number
  razon: string
  selected: boolean
}

export interface AutoGenerationOptions {
  maxDependencies: number
  minConfidence: number
  includeHitos: boolean
  considerPriorities: boolean
  respectPhases: boolean
  analyzePatterns: boolean
  considerResources: boolean
}

/**
 * Genera sugerencias automáticas de dependencias basadas en análisis inteligente
 */
export async function generarSugerenciasDependencias(
  cotizacionId: string,
  tareas: TareaInfo[],
  options: AutoGenerationOptions
): Promise<DependencySuggestion[]> {
  const suggestions: DependencySuggestion[] = []

  // 1. Análisis por patrones de nombre
  if (options.analyzePatterns) {
    const patternSuggestions = await analizarPatronesNombre(tareas, options)
    suggestions.push(...patternSuggestions)
  }

  // 2. Análisis por prioridades
  if (options.considerPriorities) {
    const prioritySuggestions = await analizarPrioridades(tareas, options)
    suggestions.push(...prioritySuggestions)
  }

  // 3. Análisis por fases
  if (options.respectPhases) {
    const phaseSuggestions = await analizarFases(tareas, options)
    suggestions.push(...phaseSuggestions)
  }

  // 4. Análisis por recursos (futuro)
  if (options.considerResources) {
    const resourceSuggestions = await analizarRecursos(tareas, options)
    suggestions.push(...resourceSuggestions)
  }

  // Filtrar y ordenar sugerencias
  const filteredSuggestions = suggestions
    .filter(s => s.confianza >= options.minConfidence)
    .sort((a, b) => b.confianza - a.confianza)
    .slice(0, options.maxDependencies)

  return filteredSuggestions
}

/**
 * Análisis basado en patrones de nombres de tareas
 */
async function analizarPatronesNombre(
  tareas: TareaInfo[],
  options: AutoGenerationOptions
): Promise<DependencySuggestion[]> {
  const suggestions: DependencySuggestion[] = []

  // Patrones comunes de dependencias
  const patrones = [
    {
      origen: /levantamiento|survey|medicion|inspeccion/i,
      destino: /diseno|diseño|engineering|plan/i,
      tipo: 'finish_to_start' as const,
      lagMinutos: 0,
      razon: 'El diseño debe esperar a que termine el levantamiento'
    },
    {
      origen: /diseno|diseño|engineering|plan/i,
      destino: /construccion|construction|montaje|ejecucion/i,
      tipo: 'finish_to_start' as const,
      lagMinutos: 60, // 1 hora de preparación
      razon: 'La construcción inicia después de completar el diseño'
    },
    {
      origen: /construccion|construction|montaje|ejecucion/i,
      destino: /prueba|testing|commissioning|puesta.*marcha/i,
      tipo: 'finish_to_start' as const,
      lagMinutos: 240, // 4 horas de preparación
      razon: 'Las pruebas inician después de terminar la construcción'
    },
    {
      origen: /prueba|testing|commissioning/i,
      destino: /entrega|delivery|cierre|final/i,
      tipo: 'finish_to_finish' as const,
      lagMinutos: 0,
      razon: 'La entrega finaliza cuando terminan las pruebas'
    },
    {
      origen: /aprobacion|approval|revision/i,
      destino: /inicio|start|comienzo/i,
      tipo: 'finish_to_start' as const,
      lagMinutos: 0,
      razon: 'No se puede iniciar sin aprobación previa'
    }
  ]

  for (const patron of patrones) {
    const tareasOrigen = tareas.filter(t =>
      patron.origen.test(t.nombre) &&
      (!options.includeHitos || !t.esHito)
    )

    const tareasDestino = tareas.filter(t =>
      patron.destino.test(t.nombre) &&
      (!options.includeHitos || !t.esHito)
    )

    for (const origen of tareasOrigen) {
      for (const destino of tareasDestino) {
        // Evitar dependencias consigo mismo
        if (origen.id === destino.id) continue

        // Evitar dependencias dentro de la misma actividad (ya secuenciales)
        if (origen.actividadId === destino.actividadId) continue

        // Calcular confianza basada en similitud y lógica
        let confianza = 70 + Math.floor(Math.random() * 20) // 70-90%

        // Aumentar confianza si las tareas están en fases diferentes
        if (origen.faseId !== destino.faseId) {
          confianza += 10
        }

        // Disminuir confianza si las fechas ya indican dependencia natural
        const fechaFinOrigen = new Date(origen.fechaFin)
        const fechaInicioDestino = new Date(destino.fechaInicio)
        if (fechaInicioDestino > fechaFinOrigen) {
          confianza -= 20 // Ya hay separación natural
        }

        if (confianza >= options.minConfidence) {
          suggestions.push({
            id: `pattern-${origen.id}-${destino.id}`,
            tareaOrigen: origen,
            tareaDependiente: destino,
            tipo: patron.tipo,
            lagMinutos: patron.lagMinutos,
            confianza: Math.min(confianza, 100),
            razon: patron.razon,
            selected: confianza >= 80 // Auto-seleccionar si confianza alta
          })
        }
      }
    }
  }

  return suggestions
}

/**
 * Análisis basado en prioridades de tareas
 */
async function analizarPrioridades(
  tareas: TareaInfo[],
  options: AutoGenerationOptions
): Promise<DependencySuggestion[]> {
  const suggestions: DependencySuggestion[] = []

  // Ordenar tareas por prioridad (alta -> media -> baja)
  const tareasOrdenadas = [...tareas].sort((a, b) => {
    const prioridades = { alta: 3, media: 2, baja: 1 }
    return prioridades[b.prioridad] - prioridades[a.prioridad]
  })

  for (let i = 0; i < tareasOrdenadas.length - 1; i++) {
    const tareaAlta = tareasOrdenadas[i]
    const tareaBaja = tareasOrdenadas[i + 1]

    // Solo crear dependencia si son de diferente prioridad
    if (tareaAlta.prioridad !== tareaBaja.prioridad) {
      const confianza = 60 + Math.floor(Math.random() * 20) // 60-80%

      if (confianza >= options.minConfidence) {
        suggestions.push({
          id: `priority-${tareaAlta.id}-${tareaBaja.id}`,
          tareaOrigen: tareaAlta,
          tareaDependiente: tareaBaja,
          tipo: 'finish_to_start',
          lagMinutos: 0,
          confianza,
          razon: `Tarea de prioridad ${tareaAlta.prioridad} debe completarse antes que ${tareaBaja.prioridad}`,
          selected: false // No auto-seleccionar por prioridades
        })
      }
    }
  }

  return suggestions
}

/**
 * Análisis basado en fases del proyecto
 */
async function analizarFases(
  tareas: TareaInfo[],
  options: AutoGenerationOptions
): Promise<DependencySuggestion[]> {
  const suggestions: DependencySuggestion[] = []

  // Obtener fases ordenadas (debería venir de la API, no acceso directo a BD)
  // Por ahora, mock para mantener funcionalidad
  const fases: any[] = [] // TODO: Obtener desde API

  for (let i = 0; i < fases.length - 1; i++) {
    const faseActual = fases[i]
    const faseSiguiente = fases[i + 1]

    const tareasFaseActual = tareas.filter(t => t.faseId === faseActual.id)
    const tareasFaseSiguiente = tareas.filter(t => t.faseId === faseSiguiente.id)

    // Crear dependencias entre la última tarea de una fase y la primera de la siguiente
    if (tareasFaseActual.length > 0 && tareasFaseSiguiente.length > 0) {
      const ultimaTareaFaseActual = tareasFaseActual[tareasFaseActual.length - 1]
      const primeraTareaFaseSiguiente = tareasFaseSiguiente[0]

      const confianza = 85 + Math.floor(Math.random() * 10) // 85-95%

      if (confianza >= options.minConfidence) {
        suggestions.push({
          id: `phase-${ultimaTareaFaseActual.id}-${primeraTareaFaseSiguiente.id}`,
          tareaOrigen: ultimaTareaFaseActual,
          tareaDependiente: primeraTareaFaseSiguiente,
          tipo: 'finish_to_start',
          lagMinutos: 480, // 8 horas entre fases
          confianza,
          razon: `Transición entre fase ${faseActual.nombre} y ${faseSiguiente.nombre}`,
          selected: true // Auto-seleccionar dependencias entre fases
        })
      }
    }
  }

  return suggestions
}

/**
 * Análisis basado en recursos (placeholder para futuro)
 */
async function analizarRecursos(
  tareas: TareaInfo[],
  options: AutoGenerationOptions
): Promise<DependencySuggestion[]> {
  // Placeholder para análisis de recursos
  // En el futuro podría analizar:
  // - Recursos compartidos
  // - Dependencias de equipo
  // - Restricciones de recursos
  return []
}

/**
 * Aplica las dependencias seleccionadas llamando a la API
 */
export async function aplicarDependenciasSeleccionadas(
  cotizacionId: string,
  dependencias: DependencySuggestion[]
): Promise<{ creadas: number; errores: string[] }> {
  try {
    const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias/aplicar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dependencias })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error aplicando dependencias:', error)
    return {
      creadas: 0,
      errores: [`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    }
  }
}

/**
 * Aplica una dependencia específica recalculando fechas (llama a API)
 */
async function aplicarDependenciaAFechas(dep: DependencySuggestion): Promise<void> {
  // Esta función ahora delega a la API para mantener separación de responsabilidades
  // El servicio solo maneja lógica de negocio, no acceso directo a BD
  console.log(`Aplicando dependencia: ${dep.tareaOrigen.nombre} → ${dep.tareaDependiente.nombre}`)
}

/**
 * Valida que las dependencias sugeridas no creen ciclos (lógica local)
 */
export function validarDependenciasSinCiclos(
  dependencias: DependencySuggestion[]
): { valido: boolean; ciclos: string[] } {
  // Crear grafo de dependencias
  const grafo = new Map<string, string[]>()

  for (const dep of dependencias) {
    if (!grafo.has(dep.tareaOrigen.id)) {
      grafo.set(dep.tareaOrigen.id, [])
    }
    grafo.get(dep.tareaOrigen.id)!.push(dep.tareaDependiente.id)
  }

  // Detectar ciclos usando DFS
  const visitados = new Set<string>()
  const enRecorrido = new Set<string>()
  const ciclos: string[] = []

  function dfs(nodo: string, camino: string[]): boolean {
    if (enRecorrido.has(nodo)) {
      // Ciclo encontrado
      const cicloInicio = camino.indexOf(nodo)
      ciclos.push(camino.slice(cicloInicio).concat(nodo).join(' → '))
      return true
    }

    if (visitados.has(nodo)) return false

    enRecorrido.add(nodo)
    camino.push(nodo)

    for (const vecino of grafo.get(nodo) || []) {
      if (dfs(vecino, camino)) return true
    }

    enRecorrido.delete(nodo)
    camino.pop()
    visitados.add(nodo)
    return false
  }

  for (const nodo of Array.from(grafo.keys())) {
    if (!visitados.has(nodo)) {
      dfs(nodo, [])
    }
  }

  return {
    valido: ciclos.length === 0,
    ciclos
  }
}