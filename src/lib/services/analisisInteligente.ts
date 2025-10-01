// ===================================================
// 📁 Archivo: analisisInteligente.ts
// 📌 Ubicación: src/lib/services/analisisInteligente.ts
// 🔧 Descripción: Servicio de análisis inteligente para distribución automática
//
// 🧠 Uso: Analiza ProyectoEquipo y genera sugerencias basadas en categorías
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

export interface AnalisisCategoria {
  nombre: string
  cantidadItems: number
  porcentaje: number
  items: ProyectoEquipoItem[]
}

export interface SugerenciaLista {
  nombre: string
  descripcion: string
  itemsIds: string[]
  categoriaPrincipal: string
  confianza: number // 0-100
  razonamiento: string
}

export interface ResultadoAnalisis {
  categoriasEncontradas: AnalisisCategoria[]
  totalItems: number
  patronDominante: string
  sugerencias: SugerenciaLista[]
  confianzaGeneral: number
}

// 📊 Reglas de distribución inteligente por categoría
const REGLAS_DISTRIBUCION = {
  'Eléctrica': {
    umbralMinimo: 5,
    nombresSugeridos: ['Sistema Eléctrico', 'Instalaciones Eléctricas', 'Equipos Eléctricos'],
    descripcion: 'Componentes eléctricos y de distribución de energía'
  },
  'Climatización': {
    umbralMinimo: 3,
    nombresSugeridos: ['Sistema de Climatización', 'Aire Acondicionado', 'HVAC'],
    descripcion: 'Equipos de climatización y ventilación'
  },
  'Automatización': {
    umbralMinimo: 3,
    nombresSugeridos: ['Sistema de Control', 'Automatización Industrial', 'PLC y Controles'],
    descripcion: 'Sistemas de control y automatización'
  },
  'Mecánica': {
    umbralMinimo: 3,
    nombresSugeridos: ['Equipos Mecánicos', 'Sistema Mecánico', 'Componentes Mecánicos'],
    descripcion: 'Equipos y componentes mecánicos'
  },
  'Instrumentación': {
    umbralMinimo: 2,
    nombresSugeridos: ['Instrumentación', 'Medición y Control', 'Sensores'],
    descripcion: 'Instrumentos de medición y control'
  },
  'Seguridad': {
    umbralMinimo: 2,
    nombresSugeridos: ['Sistema de Seguridad', 'Protecciones', 'Seguridad Industrial'],
    descripcion: 'Equipos de seguridad y protección'
  }
}

// 🎯 Función principal de análisis inteligente
export async function analizarProyectoEquipo(proyectoEquipo: ProyectoEquipo): Promise<ResultadoAnalisis> {
  // 🔍 Debug: Información inicial
  console.log('🔍 Iniciando análisis inteligente para ProyectoEquipo:', {
    id: proyectoEquipo.id,
    nombre: proyectoEquipo.nombre,
    totalItemsProyecto: proyectoEquipo.items?.length || 0,
    itemsEstados: proyectoEquipo.items?.reduce((acc, item) => {
      acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  })

  // Obtener datos frescos de items disponibles
  let itemsDisponibles: ProyectoEquipoItem[] = []

  try {
    console.log('🔍 Consultando API de items disponibles...')
    const response = await fetch(`/api/proyecto-equipo-item/disponibles/proyecto-equipo/${proyectoEquipo.id}`)
    if (response.ok) {
      itemsDisponibles = await response.json()
      console.log('✅ Items obtenidos de API para análisis:', {
        cantidad: itemsDisponibles.length,
        estados: itemsDisponibles.reduce((acc, item) => {
          acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        listaIds: itemsDisponibles.reduce((acc, item) => {
          const listaId = item.listaId || 'sin-lista'
          acc[listaId] = (acc[listaId] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        primerosItems: itemsDisponibles.slice(0, 3).map(item => ({
          id: item.id,
          descripcion: item.descripcion?.substring(0, 30),
          estado: item.estado,
          listaId: item.listaId
        }))
      })
    } else {
      console.warn('⚠️ API no disponible para análisis, usando datos del ProyectoEquipo filtrados')
      // Fallback mejorado: filtrar items que NO están en listas activas
      const todosLosItems = proyectoEquipo.items || []
      itemsDisponibles = todosLosItems.filter(item => item.estado !== 'en_lista')
      console.log('📋 Items del fallback filtrado para análisis:', {
        totalItems: todosLosItems.length,
        itemsFiltrados: todosLosItems.length - itemsDisponibles.length,
        itemsDisponibles: itemsDisponibles.length,
        estados: itemsDisponibles.reduce((acc, item) => {
          acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        mensaje: 'Usando items del ProyectoEquipo filtrados (sin estado "en_lista")'
      })
    }
  } catch (error) {
    console.error('❌ Error obteniendo items disponibles para análisis:', error)
    // Fallback mejorado: filtrar items que NO están en listas activas
    const todosLosItems = proyectoEquipo.items || []
    itemsDisponibles = todosLosItems.filter(item => item.estado !== 'en_lista')
    console.log('📋 Items del fallback por error (filtrados):', {
      totalItems: todosLosItems.length,
      itemsFiltrados: todosLosItems.length - itemsDisponibles.length,
      itemsDisponibles: itemsDisponibles.length,
      mensaje: 'Usando items del ProyectoEquipo filtrados por error'
    })
  }

  if (!itemsDisponibles || itemsDisponibles.length === 0) {
    console.warn('⚠️ No hay items disponibles para análisis')
    return {
      categoriasEncontradas: [],
      totalItems: 0,
      patronDominante: 'Sin items disponibles',
      sugerencias: [],
      confianzaGeneral: 0
    }
  }

  console.log('✅ Procediendo con análisis de', itemsDisponibles.length, 'items')

  // 1. 📊 Contar items por categoría
  const categoriasMap = new Map<string, ProyectoEquipoItem[]>()

  itemsDisponibles.forEach(item => {
    // ✅ Priorizar categoría del catálogo si está disponible
    let categoriaNombre = 'SIN-CATEGORIA'

    if (item.catalogoEquipo?.categoria) {
      // Si categoria es un objeto, extraer el nombre
      categoriaNombre = typeof item.catalogoEquipo.categoria === 'string'
        ? item.catalogoEquipo.categoria
        : item.catalogoEquipo.categoria.nombre || 'SIN-CATEGORIA'
    } else if (item.categoria) {
      categoriaNombre = item.categoria
    }

    if (!categoriasMap.has(categoriaNombre)) {
      categoriasMap.set(categoriaNombre, [])
    }
    categoriasMap.get(categoriaNombre)!.push(item)
  })

  // 2. 📈 Convertir a array ordenado por cantidad
  const categoriasEncontradas: AnalisisCategoria[] = Array.from(categoriasMap.entries())
    .map(([nombre, items]) => ({
      nombre,
      cantidadItems: items.length,
      porcentaje: 0, // Se calcula después
      items
    }))
    .sort((a, b) => b.cantidadItems - a.cantidadItems)

  const totalItems = itemsDisponibles.length

  // 3. 📊 Calcular porcentajes
  categoriasEncontradas.forEach(cat => {
    cat.porcentaje = Math.round((cat.cantidadItems / totalItems) * 100)
  })

  // 4. 🎯 Identificar patrón dominante
  const patronDominante = identificarPatronDominante(categoriasEncontradas)

  // 5. 💡 Generar sugerencias inteligentes
  const sugerencias = generarSugerenciasInteligentes(categoriasEncontradas, totalItems)

  // 6. 📊 Calcular confianza general
  const confianzaGeneral = calcularConfianzaGeneral(sugerencias, totalItems)

  return {
    categoriasEncontradas,
    totalItems,
    patronDominante,
    sugerencias,
    confianzaGeneral
  }
}

// 🔍 Identificar el patrón dominante del proyecto
function identificarPatronDominante(categorias: AnalisisCategoria[]): string {
  if (categorias.length === 0) return 'Sin categorías'

  const categoriaPrincipal = categorias[0]

  // Proyecto altamente especializado
  if (categoriaPrincipal.porcentaje >= 70) {
    return `Proyecto especializado en ${categoriaPrincipal.nombre}`
  }

  // Proyecto equilibrado
  if (categorias.length >= 3 && categoriaPrincipal.porcentaje <= 40) {
    return 'Proyecto multidisciplinario equilibrado'
  }

  // Proyecto con categoría dominante
  if (categoriaPrincipal.porcentaje >= 50) {
    return `Proyecto predominantemente ${categoriaPrincipal.nombre}`
  }

  // Proyecto mixto
  return 'Proyecto mixto con múltiples especialidades'
}

// 🧠 Generar sugerencias inteligentes basadas en categorías
function generarSugerenciasInteligentes(
  categorias: AnalisisCategoria[],
  totalItems: number
): SugerenciaLista[] {
  const sugerencias: SugerenciaLista[] = []

  categorias.forEach((categoria, index) => {
    // Solo procesar categorías con reglas definidas
    const regla = REGLAS_DISTRIBUCION[categoria.nombre as keyof typeof REGLAS_DISTRIBUCION]

    if (regla && categoria.cantidadItems >= regla.umbralMinimo) {
      // Calcular confianza basada en cantidad y porcentaje
      const confianzaBase = Math.min(categoria.porcentaje * 1.2, 95)
      const confianzaCantidad = Math.min((categoria.cantidadItems / totalItems) * 100, 100)
      const confianza = Math.round((confianzaBase + confianzaCantidad) / 2)

      sugerencias.push({
        nombre: regla.nombresSugeridos[0],
        descripcion: regla.descripcion,
        itemsIds: categoria.items.map(item => item.id),
        categoriaPrincipal: categoria.nombre,
        confianza,
        razonamiento: generarRazonamiento(categoria, regla, totalItems)
      })
    } else if (categoria.cantidadItems >= 3) {
      // Categoría sin regla específica pero con suficientes items
      sugerencias.push({
        nombre: `Equipos ${categoria.nombre}`,
        descripcion: `Componentes y equipos de ${categoria.nombre.toLowerCase()}`,
        itemsIds: categoria.items.map(item => item.id),
        categoriaPrincipal: categoria.nombre,
        confianza: Math.min(categoria.porcentaje, 75),
        razonamiento: `Agrupación automática de ${categoria.cantidadItems} items de ${categoria.nombre}`
      })
    }
  })

  // Si no hay sugerencias pero hay items, crear una lista general
  if (sugerencias.length === 0 && categorias.length > 0) {
    const todosLosItems = categorias.flatMap(cat => cat.items.map(item => item.id))
    sugerencias.push({
      nombre: 'Lista General de Equipos',
      descripcion: 'Agrupación general de todos los equipos del proyecto',
      itemsIds: todosLosItems,
      categoriaPrincipal: 'General',
      confianza: 60,
      razonamiento: 'Agrupación general cuando no se detectan patrones específicos'
    })
  }

  return sugerencias.sort((a, b) => b.confianza - a.confianza)
}

// 💭 Generar razonamiento para cada sugerencia
function generarRazonamiento(
  categoria: AnalisisCategoria,
  regla: any,
  totalItems: number
): string {
  const porcentaje = categoria.porcentaje
  const cantidad = categoria.cantidadItems

  if (porcentaje >= 60) {
    return `${categoria.nombre} representa el ${porcentaje}% del proyecto (${cantidad} de ${totalItems} items). Alta especialización detectada.`
  } else if (porcentaje >= 30) {
    return `${categoria.nombre} es una categoría importante con ${cantidad} items (${porcentaje}% del total).`
  } else {
    return `Agrupación de ${cantidad} items de ${categoria.nombre} para mejor organización.`
  }
}

// 📊 Calcular confianza general del análisis
function calcularConfianzaGeneral(sugerencias: SugerenciaLista[], totalItems: number): number {
  if (sugerencias.length === 0) return 0

  const confianzaPromedio = sugerencias.reduce((sum, s) => sum + s.confianza, 0) / sugerencias.length
  const coberturaItems = sugerencias.reduce((sum, s) => sum + s.itemsIds.length, 0)
  const factorCobertura = (coberturaItems / totalItems) * 100

  // La confianza general es un promedio ponderado
  return Math.round((confianzaPromedio * 0.7) + (factorCobertura * 0.3))
}

// 🎯 Función de utilidad para obtener estadísticas rápidas
export async function obtenerEstadisticasRapidas(proyectoEquipo: ProyectoEquipo) {
  // Obtener datos frescos de items disponibles
  let itemsDisponibles: ProyectoEquipoItem[] = []

  try {
    const response = await fetch(`/api/proyecto-equipo-item/disponibles/proyecto-equipo/${proyectoEquipo.id}`)
    if (response.ok) {
      itemsDisponibles = await response.json()
      console.log('✅ Items obtenidos del endpoint mejorado para estadísticas:', {
        cantidad: itemsDisponibles.length,
        estados: itemsDisponibles.reduce((acc, item) => {
          acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        listaIds: itemsDisponibles.reduce((acc, item) => {
          const listaId = item.listaId || 'sin-lista'
          acc[listaId] = (acc[listaId] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })
    } else {
      console.warn('⚠️ Endpoint no disponible para estadísticas, usando fallback')
      // Fallback: usar TODOS los datos del proyectoEquipo (no solo pendientes)
      itemsDisponibles = proyectoEquipo.items || []
      console.log('📊 Estadísticas usando fallback (TODOS los items):', {
        cantidad: itemsDisponibles.length,
        mensaje: 'Usando TODOS los items del ProyectoEquipo para estadísticas'
      })
    }
  } catch (error) {
    console.error('❌ Error obteniendo items disponibles para estadísticas:', error)
    // Fallback: usar TODOS los datos del proyectoEquipo (no solo pendientes)
    itemsDisponibles = proyectoEquipo.items || []
    console.log('📊 Estadísticas usando fallback por error (TODOS los items):', {
      cantidad: itemsDisponibles.length,
      mensaje: 'Usando TODOS los items del ProyectoEquipo para estadísticas por error'
    })
  }

  if (!itemsDisponibles || itemsDisponibles.length === 0) {
    return {
      totalItems: 0,
      categoriasUnicas: 0,
      categoriaPrincipal: 'Sin items disponibles',
      distribucionEquilibrada: false
    }
  }

  const categorias = new Set(itemsDisponibles.map(item => item.categoria || 'SIN-CATEGORIA'))
  const categoriaPrincipal = itemsDisponibles
    .reduce((acc, item) => {
      const cat = item.categoria || 'SIN-CATEGORIA'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const categoriaMasFrecuente = Object.entries(categoriaPrincipal)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sin categoría'

  const maxCount = Math.max(...Object.values(categoriaPrincipal))
  const distribucionEquilibrada = maxCount / itemsDisponibles.length <= 0.6

  return {
    totalItems: itemsDisponibles.length,
    categoriasUnicas: categorias.size,
    categoriaPrincipal: categoriaMasFrecuente,
    distribucionEquilibrada
  }
}
