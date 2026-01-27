/**
 * API: Análisis de Cronograma para Importación Automática
 *
 * GET /api/cotizaciones/[id]/analisis-cronograma
 *
 * Esta API analiza una cotización y devuelve información detallada
 * sobre cómo se mapearía a un cronograma de 6 niveles.
 *
 * Respuesta incluye:
 * - Estadísticas de servicios e ítems
 * - Análisis de categorías disponibles
 * - Estimaciones de EDTs, actividades y tareas a crear
 * - Detección de zonas potenciales
 * - Cálculos de horas y duraciones
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Interfaces de respuesta
interface ServicioAnalisis {
  id: string
  nombre: string
  categoria: string
  cantidadItems: number
  horasTotales: number
  costoTotal: number
}

interface CategoriaAnalisis {
  nombre: string
  servicios: ServicioAnalisis[]
  totalServicios: number
  totalItems: number
  horasTotales: number
  costoTotal: number
}

interface ZonaDetectada {
  nombre: string
  patron: string
  serviciosAfectados: number
  confianza: number // 0-100
}

interface AnalisisResponse {
  cotizacion: {
    id: string
    nombre: string
    cliente: string
    totalServicios: number
    totalItems: number
    horasTotales: number
  }
  categorias: CategoriaAnalisis[]
  zonasDetectadas: ZonaDetectada[]
  estadisticas: {
    metodoCategorias: {
      edtsEstimados: number
      actividadesEstimadas: number
      tareasEstimadas: number
    }
    metodoServicios: {
      edtsEstimados: number
      actividadesEstimadas: number
      tareasEstimadas: number
    }
  }
  recomendaciones: {
    metodoRecomendado: 'categorias' | 'servicios'
    razon: string
    zonasRecomendadas: boolean
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: cotizacionId } = await params

    // Obtener cotización con todos los servicios e ítems
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: {
          select: { nombre: true }
        },
        cotizacionServicio: {
          include: {
            cotizacionServicioItem: true
          }
        }
      }
    }) as any

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Análisis de categorías
    const categoriasMap = new Map<string, ServicioAnalisis[]>()
    const servicios = (cotizacion as any).cotizacionServicio || []

    servicios.forEach((servicio: any) => {
      const categoriaNombre = servicio.categoria || 'Sin Categoría'

      if (!categoriasMap.has(categoriaNombre)) {
        categoriasMap.set(categoriaNombre, [])
      }

      const servicioAnalisis: ServicioAnalisis = {
        id: servicio.id,
        nombre: servicio.nombre,
        categoria: categoriaNombre,
        cantidadItems: servicio.items.length,
        horasTotales: servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0),
        costoTotal: servicio.items.reduce((sum: number, item: any) => sum + (item.costoCliente || 0), 0)
      }

      categoriasMap.get(categoriaNombre)!.push(servicioAnalisis)
    })

    // Convertir a array de categorías
    const categorias: CategoriaAnalisis[] = Array.from(categoriasMap.entries()).map(([nombre, servicios]) => ({
      nombre,
      servicios,
      totalServicios: servicios.length,
      totalItems: servicios.reduce((sum: number, s: ServicioAnalisis) => sum + s.cantidadItems, 0),
      horasTotales: servicios.reduce((sum: number, s: ServicioAnalisis) => sum + s.horasTotales, 0),
      costoTotal: servicios.reduce((sum: number, s: ServicioAnalisis) => sum + s.costoTotal, 0)
    }))

    // Detección de zonas
    const zonasDetectadas = detectarZonas(servicios)

    // Estadísticas por método
    const estadisticas = {
      metodoCategorias: {
        edtsEstimados: categorias.length,
        actividadesEstimadas: servicios.length,
        tareasEstimadas: servicios.reduce((sum: number, s: any) => sum + s.items.length, 0)
      },
      metodoServicios: {
        edtsEstimados: servicios.length,
        actividadesEstimadas: servicios.length,
        tareasEstimadas: servicios.reduce((sum: number, s: any) => sum + s.items.length, 0)
      }
    }

    // Recomendaciones
    const totalServicios = servicios.length
    const metodoRecomendado = totalServicios > 10 ? 'categorias' : 'servicios'
    const zonasRecomendadas = zonasDetectadas.length > 0 && zonasDetectadas.some(z => z.confianza > 70)

    const recomendaciones = {
      metodoRecomendado: metodoRecomendado as 'categorias' | 'servicios',
      razon: metodoRecomendado === 'categorias'
        ? 'Múltiples servicios permiten mejor agrupación por categorías'
        : 'Pocos servicios permiten granularidad por servicio individual',
      zonasRecomendadas
    }

    // Respuesta completa
    const response: AnalisisResponse = {
      cotizacion: {
        id: cotizacion.id,
        nombre: cotizacion.nombre,
        cliente: (cotizacion as any).cliente?.nombre || 'Sin cliente',
        totalServicios: servicios.length,
        totalItems: servicios.reduce((sum: number, s: any) => sum + s.items.length, 0),
        horasTotales: servicios.reduce((sum: number, s: any) => sum + s.items.reduce((sum2: number, item: any) => sum2 + (item.horaTotal || 0), 0), 0)
      },
      categorias,
      zonasDetectadas,
      estadisticas,
      recomendaciones
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error en análisis de cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Función auxiliar para detectar zonas
function detectarZonas(servicios: any[]): ZonaDetectada[] {
  const patronesZona = [
    { patron: /piso|piso/i, nombre: 'Pisos', confianza: 80 },
    { patron: /área|area/i, nombre: 'Áreas', confianza: 75 },
    { patron: /zona/i, nombre: 'Zonas', confianza: 70 },
    { patron: /nivel/i, nombre: 'Niveles', confianza: 65 },
    { patron: /sector/i, nombre: 'Sectores', confianza: 60 }
  ]

  const zonasEncontradas: ZonaDetectada[] = []

  servicios.forEach(servicio => {
    servicio.items.forEach((item: any) => {
      const textoAnalizar = `${item.nombre} ${item.descripcion || ''}`

      patronesZona.forEach(({ patron, nombre, confianza }) => {
        if (patron.test(textoAnalizar)) {
          const zonaExistente = zonasEncontradas.find(z => z.nombre === nombre)
          if (zonaExistente) {
            zonaExistente.serviciosAfectados++
            zonaExistente.confianza = Math.max(zonaExistente.confianza, confianza)
          } else {
            zonasEncontradas.push({
              nombre,
              patron: patron.source,
              serviciosAfectados: 1,
              confianza
            })
          }
        }
      })
    })
  })

  // Filtrar zonas con al menos 2 servicios afectados
  return zonasEncontradas.filter(zona => zona.serviciosAfectados >= 2)
}