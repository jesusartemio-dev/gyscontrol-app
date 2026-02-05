/**
 * API para EDTs Unificados - Análisis Transversal por EDT
 *
 * Unifica las EDTs del servicio y del cronograma para análisis transversal
 * Permite ver todas las horas por EDT (PLC, HMI, ING) a través de múltiples proyectos
 *
 * ✅ CORREGIDO: Solo usa cronograma de EJECUCIÓN
 * ✅ CORREGIDO: Filtra por fechaTrabajo de RegistroHoras (no por fechaInicioPlan del EDT)
 * ✅ Las horas REALES se calculan de los registros de horas en el período seleccionado
 * ✅ Las horas PLAN vienen de las tareas o del EDT (sin filtro de fecha)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión del usuario
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('❌ EDTS-UNIFICADOS: No hay sesión válida')
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ EDTS-UNIFICADOS: Usuario autenticado:', session.user.id)

    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('soloActivos') === 'true'
    const incluirHoras = searchParams.get('incluirHoras') === 'true'
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    // Construir filtro para registros de horas (por fechaTrabajo)
    const registroHorasWhere: any = {}
    if (fechaInicio) {
      registroHorasWhere.fechaTrabajo = {
        ...registroHorasWhere.fechaTrabajo,
        gte: new Date(fechaInicio)
      }
    }
    if (fechaFin) {
      // Agregar 1 día para incluir todo el día fin
      const fechaFinDate = new Date(fechaFin)
      fechaFinDate.setDate(fechaFinDate.getDate() + 1)
      registroHorasWhere.fechaTrabajo = {
        ...registroHorasWhere.fechaTrabajo,
        lt: fechaFinDate
      }
    }

    const hayFiltroFechas = fechaInicio || fechaFin
    console.log(`📅 EDTS-UNIFICADOS: Filtro de fechas: ${hayFiltroFechas ? `${fechaInicio} a ${fechaFin}` : 'Sin filtro (TODO)'}`)

    // Filtrar SOLO EDTs de cronograma de ejecución
    const whereClause: any = {
      proyectoCronograma: {
        tipo: 'ejecucion'
      }
    }

    if (soloActivos) {
      whereClause.estado = { not: 'cancelado' }
    }

    // Obtener EDTs con registros de horas filtrados por fecha
    const edts = await prisma.proyectoEdt.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        edtId: true,
        edt: {
          select: {
            id: true,
            nombre: true,
            descripcion: true
          }
        },
        proyectoCronograma: {
          select: {
            id: true,
            tipo: true
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
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
        // Tareas para calcular horas planificadas
        proyectoTarea: {
          select: {
            id: true,
            horasEstimadas: true,
            horasReales: true,
            estado: true
          }
        },
        // ✅ Registros de horas FILTRADOS por fechaTrabajo
        registroHoras: {
          where: hayFiltroFechas ? registroHorasWhere : undefined,
          select: {
            id: true,
            horasTrabajadas: true,
            fechaTrabajo: true,
            descripcion: true,
            recursoNombre: true,
            recursoId: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { proyecto: { codigo: 'asc' } },
        { orden: 'asc' }
      ]
    })

    console.log(`✅ EDTS-UNIFICADOS: Encontrados ${edts.length} EDTs de cronograma de ejecución`)

    // Procesar EDTs
    const edtsUnificados = edts.map(edt => {
      // Horas PLANIFICADAS: desde tareas o fallback a EDT (SIN filtro de fecha)
      const horasTareasPlan = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
        return sum + Number(tarea.horasEstimadas || 0)
      }, 0) || 0

      const horasPlanificadas = horasTareasPlan > 0
        ? horasTareasPlan
        : Number(edt.horasPlan || 0)

      // ✅ Horas REALES: desde RegistroHoras filtrados por fecha
      // Si hay filtro de fechas, usar SOLO los registros en ese período
      // Si no hay filtro, usar el total de registros o fallback a tareas/EDT
      let horasRealesTotales = 0

      if (hayFiltroFechas) {
        // Con filtro: sumar solo los registros de horas en el período
        horasRealesTotales = edt.registroHoras?.reduce((sum, registro) => {
          return sum + Number(registro.horasTrabajadas || 0)
        }, 0) || 0
      } else {
        // Sin filtro (TODO): usar lógica anterior (tareas o EDT)
        const horasTareasReales = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
          return sum + Number(tarea.horasReales || 0)
        }, 0) || 0

        horasRealesTotales = horasTareasReales > 0
          ? horasTareasReales
          : Number(edt.horasReales || 0)
      }

      // Calcular avance
      const porcentajeAvance = horasPlanificadas > 0
        ? Math.round((horasRealesTotales / horasPlanificadas) * 100 * 10) / 10
        : 0

      // Calcular horas por recurso si se incluyen
      let horasPorRecurso: any[] = []
      let costoTotalCalculado = 0

      if (incluirHoras && edt.registroHoras) {
        const resumenHoras = edt.registroHoras.reduce((acc, registro) => {
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
          acc[recursoNombre].costoTotal += horas * 25

          return acc
        }, {} as Record<string, any>)

        horasPorRecurso = Object.values(resumenHoras) as any[]
        costoTotalCalculado = Object.values(resumenHoras).reduce((total: number, rec: any) => total + rec.costoTotal, 0)
      }

      return {
        id: edt.id,
        nombre: edt.nombre,
        categoriaId: edt.edtId,
        categoriaNombre: edt.edt?.nombre || 'Sin categoría',
        categoriaDescripcion: edt.edt?.descripcion,
        proyecto: {
          id: edt.proyecto.id,
          nombre: edt.proyecto.nombre,
          codigo: edt.proyecto.codigo,
          estado: edt.proyecto.estado,
          fechaInicio: edt.proyecto.fechaInicio,
          fechaFin: edt.proyecto.fechaFin
        },
        responsable: edt.user ? {
          id: edt.user.id,
          name: edt.user.name,
          email: edt.user.email,
          role: edt.user.role
        } : null,
        horas: {
          planificadas: Math.round(horasPlanificadas * 10) / 10,
          reales: Math.round(horasRealesTotales * 10) / 10,
          diferencia: Math.round((horasRealesTotales - horasPlanificadas) * 10) / 10,
          porcentajeAvance
        },
        tareasCount: edt.proyectoTarea?.length || 0,
        registrosCount: edt.registroHoras?.length || 0,
        estado: edt.estado,
        fechas: {
          inicioPlan: edt.fechaInicioPlan,
          finPlan: edt.fechaFinPlan
        },
        descripcion: edt.descripcion,
        orden: edt.orden,
        analisisCosto: incluirHoras ? {
          costoTotalCalculado,
          horasPorRecurso,
          costoPromedioHora: horasRealesTotales > 0 ? costoTotalCalculado / horasRealesTotales : 0
        } : null
      }
    })

    // ✅ Cuando hay filtro de fechas, solo incluir EDTs con horas reales > 0
    const edtsFiltrados = hayFiltroFechas
      ? edtsUnificados.filter(edt => edt.horas.reales > 0 || edt.registrosCount > 0)
      : edtsUnificados

    // DEBUG: Verificar datos procesados
    console.log(`🔍 DEBUG EDTS-UNIFICADOS: ${edtsUnificados.length} EDTs totales, ${edtsFiltrados.length} con horas en período`)
    edtsFiltrados.forEach((edt, index) => {
      console.log(`   ${index + 1}. ${edt.proyecto.codigo} - ${edt.categoriaNombre}: Plan ${edt.horas.planificadas}h, Real ${edt.horas.reales}h, Registros: ${edt.registrosCount}`)
    })

    // Análisis transversal - agrupar por categoría EDT
    const resumenPorEdt = edtsFiltrados.reduce((acc, edt) => {
      const categoria = edt.categoriaNombre
      if (!acc[categoria]) {
        acc[categoria] = {
          categoria: categoria,
          categoriaId: edt.categoriaId,
          totalHorasPlanificadas: 0,
          totalHorasReales: 0,
          totalProyectos: 0,
          proyectos: [] as any[],
          costoTotalCalculado: 0,
          variacionHoras: 0,
          variacionPorcentual: 0,
          porcentajeAvance: 0
        }
      }

      acc[categoria].totalHorasPlanificadas += edt.horas.planificadas
      acc[categoria].totalHorasReales += edt.horas.reales
      acc[categoria].totalProyectos += 1
      acc[categoria].costoTotalCalculado += edt.analisisCosto?.costoTotalCalculado || 0

      // Calcular variación
      const variacion = acc[categoria].totalHorasReales - acc[categoria].totalHorasPlanificadas
      acc[categoria].variacionHoras = Math.round(variacion * 10) / 10
      acc[categoria].variacionPorcentual = acc[categoria].totalHorasPlanificadas > 0
        ? Math.round((variacion / acc[categoria].totalHorasPlanificadas) * 100 * 10) / 10
        : 0

      // Calcular porcentaje de avance
      acc[categoria].porcentajeAvance = acc[categoria].totalHorasPlanificadas > 0
        ? Math.round((acc[categoria].totalHorasReales / acc[categoria].totalHorasPlanificadas) * 100 * 10) / 10
        : 0

      // Agregar o actualizar proyecto - acumular horas si ya existe
      const proyectoCodigo = edt.proyecto.codigo
      const proyectoExistente = acc[categoria].proyectos.find((p: any) => p.codigo === proyectoCodigo)
      if (proyectoExistente) {
        proyectoExistente.horasPlanificadas += edt.horas.planificadas
        proyectoExistente.horasReales += edt.horas.reales
      } else {
        acc[categoria].proyectos.push({
          codigo: proyectoCodigo,
          nombre: edt.proyecto.nombre,
          horasPlanificadas: edt.horas.planificadas,
          horasReales: edt.horas.reales
        })
      }

      return acc
    }, {} as Record<string, any>)

    // DEBUG: Resumen por EDT
    console.log(`📊 RESUMEN POR EDT (${hayFiltroFechas ? 'filtrado por fechaTrabajo' : 'sin filtro'}):`)
    Object.values(resumenPorEdt).forEach((resumen: any) => {
      console.log(`   ${resumen.categoria}: ${resumen.totalProyectos} proyectos, Plan ${resumen.totalHorasPlanificadas}h, Real ${resumen.totalHorasReales}h`)
    })

    return NextResponse.json({
      success: true,
      data: {
        edts: edtsFiltrados,
        resumenTransversal: Object.values(resumenPorEdt),
        estadisticas: {
          totalEdts: edtsFiltrados.length,
          totalProyectos: new Set(edtsFiltrados.map(e => e.proyecto.id)).size,
          totalHorasReales: edtsFiltrados.reduce((sum, e) => sum + e.horas.reales, 0),
          totalHorasPlanificadas: edtsFiltrados.reduce((sum, e) => sum + e.horas.planificadas, 0),
          costoTotal: edtsFiltrados.reduce((sum, e) => sum + (e.analisisCosto?.costoTotalCalculado || 0), 0)
        },
        filtro: {
          tipo: hayFiltroFechas ? 'fechaTrabajo' : 'sin_filtro',
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null
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