/**
 * API para EDTs Unificados - Análisis Transversal por EDT
 * 
 * Unifica las EDTs del servicio y del cronograma para análisis transversal
 * Permite ver todas las horas por EDT (PLC, HMI, ING) a través de múltiples proyectos
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('soloActivos') === 'true'
    const incluirHoras = searchParams.get('incluirHoras') === 'true'
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    // Base query para EDTs unificados (sin autenticación)
    const whereClause: any = {}

    if (soloActivos) {
      whereClause.estado = { not: 'cancelado' }
    }

    // Filtros por fecha si se proporcionan
    if (fechaInicio || fechaFin) {
      whereClause.fechaInicioPlan = {}
      if (fechaInicio) {
        whereClause.fechaInicioPlan.gte = new Date(fechaInicio)
      }
      if (fechaFin) {
        whereClause.fechaInicioPlan.lte = new Date(fechaFin)
      }
    }

    // Obtener EDTs unificados con información básica
    const edts = await prisma.proyectoEdt.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        categoriaServicioId: true,
        categoriaServicio: {
          select: {
            id: true,
            nombre: true,
            descripcion: true
          }
        },
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        horasPlan: true,
        horasReales: true,
        estado: true,
        porcentajeAvance: true,
        fechaInicioPlan: true,
        fechaFinPlan: true,
        descripcion: true,
        orden: true,
        // Horas registradas
        registrosHoras: incluirHoras ? {
          select: {
            id: true,
            horasTrabajadas: true,
            fechaTrabajo: true,
            descripcion: true,
            recursoNombre: true,
            recursoId: true,
            usuario: {
              select: {
                name: true
              }
            }
          }
        } : false
      },
      orderBy: [
        { proyecto: { codigo: 'asc' } },
        { orden: 'asc' }
      ]
    })

    // Procesar EDTs unificados
    const edtsUnificados = edts.map(edt => {
      const horasRealesTotales = Number(edt.horasReales) || 0
      const horasPlanificadas = Number(edt.horasPlan) || 0
      
      // Calcular horas por recurso si se incluyen
      let horasPorRecurso: any[] = []
      let costoTotalCalculado = 0
      
      if (incluirHoras && edt.registrosHoras) {
        const resumenHoras = edt.registrosHoras.reduce((acc, registro) => {
          const recursoNombre = registro.recursoNombre || 'Sin recurso'
          const horas = Number(registro.horasTrabajadas) || 0
          
          if (!acc[recursoNombre]) {
            acc[recursoNombre] = {
              recurso: recursoNombre,
              horas: 0,
              costoTotal: 0
            }
          }
          
          acc[recursoNombre].horas += horas
          // Por ahora usaremos costo fijo, se puede mejorar después
          acc[recursoNombre].costoTotal += horas * 25 // Costo promedio por hora
          
          return acc
        }, {} as Record<string, any>)
        
        horasPorRecurso = Object.values(resumenHoras) as any[]
        costoTotalCalculado = Object.values(resumenHoras).reduce((total: number, rec: any) => total + rec.costoTotal, 0)
      }

      return {
        id: edt.id,
        nombre: edt.nombre,
        categoriaId: edt.categoriaServicioId,
        categoriaNombre: edt.categoriaServicio?.nombre || 'Sin categoría',
        categoriaDescripcion: edt.categoriaServicio?.descripcion,
        proyecto: {
          id: edt.proyecto.id,
          nombre: edt.proyecto.nombre,
          codigo: edt.proyecto.codigo,
          estado: edt.proyecto.estado,
          fechaInicio: edt.proyecto.fechaInicio,
          fechaFin: edt.proyecto.fechaFin
        },
        responsable: {
          id: edt.responsable?.id,
          nombre: edt.responsable?.name || 'Sin responsable'
        },
        horas: {
          planificadas: horasPlanificadas,
          reales: horasRealesTotales,
          diferencia: horasRealesTotales - horasPlanificadas,
          porcentajeAvance: horasPlanificadas > 0 ? Math.round((horasRealesTotales / horasPlanificadas) * 100) : 0
        },
        estado: edt.estado,
        fechas: {
          inicioPlan: edt.fechaInicioPlan,
          finPlan: edt.fechaFinPlan
        },
        descripcion: edt.descripcion,
        orden: edt.orden,
        // Análisis de costos si se solicita
        analisisCosto: incluirHoras ? {
          costoTotalCalculado,
          horasPorRecurso,
          costoPromedioHora: horasRealesTotales > 0 ? costoTotalCalculado / horasRealesTotales : 0
        } : null
      }
    })

    // Análisis transversal - agrupar por categoría EDT
    const resumenPorEdt = edtsUnificados.reduce((acc, edt) => {
      const categoria = edt.categoriaNombre
      if (!acc[categoria]) {
        acc[categoria] = {
          categoria: categoria,
          totalHorasPlanificadas: 0,
          totalHorasReales: 0,
          totalProyectos: 0,
          proyectos: [] as any[],
          costoTotalCalculado: 0,
          variacionHoras: 0,
          variacionPorcentual: 0
        }
      }
      
      acc[categoria].totalHorasPlanificadas += edt.horas.planificadas
      acc[categoria].totalHorasReales += edt.horas.reales
      acc[categoria].totalProyectos += 1
      acc[categoria].costoTotalCalculado += edt.analisisCosto?.costoTotalCalculado || 0
      
      // Calcular variación
      const variacion = acc[categoria].totalHorasReales - acc[categoria].totalHorasPlanificadas
      acc[categoria].variacionHoras = variacion
      acc[categoria].variacionPorcentual = acc[categoria].totalHorasPlanificadas > 0 
        ? (variacion / acc[categoria].totalHorasPlanificadas) * 100 
        : 0
      
      // Agregar proyecto si no existe ya
      const proyectoCodigo = edt.proyecto.codigo
      if (!acc[categoria].proyectos.find((p: any) => p.codigo === proyectoCodigo)) {
        acc[categoria].proyectos.push({
          codigo: proyectoCodigo,
          nombre: edt.proyecto.nombre,
          horasReales: edt.horas.reales
        })
      }
      
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      data: {
        edts: edtsUnificados,
        resumenTransversal: Object.values(resumenPorEdt),
        estadisticas: {
          totalEdts: edtsUnificados.length,
          totalProyectos: new Set(edtsUnificados.map(e => e.proyecto.id)).size,
          totalHorasReales: edtsUnificados.reduce((sum, e) => sum + e.horas.reales, 0),
          totalHorasPlanificadas: edtsUnificados.reduce((sum, e) => sum + e.horas.planificadas, 0),
          costoTotal: edtsUnificados.reduce((sum, e) => sum + (e.analisisCosto?.costoTotalCalculado || 0), 0)
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo EDTs unificados:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}