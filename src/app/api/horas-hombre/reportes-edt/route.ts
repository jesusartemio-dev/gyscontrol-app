/**
 * API para reportes de horas-hombre por EDT
 * 
 * Proporciona reportes detallados de horas registradas por EDT,
 * incluyendo resumen de horas, progreso por elemento y métricas de avance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔐 Verificar permisos
    const rolesPermitidos = ['admin', 'gerente', 'proyectos', 'comercial']
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para reportes' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tipoReporte = searchParams.get('tipo') || 'resumen'
    const proyectoId = searchParams.get('proyectoId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const edtId = searchParams.get('edtId')

    let reporte: any = {}

    switch (tipoReporte) {
      case 'resumen':
        reporte = await generarReporteResumen({ proyectoId, fechaDesde, fechaHasta, edtId })
        break
      case 'detalle-edt':
        reporte = await generarReporteDetalleEdt({ proyectoId, fechaDesde, fechaHasta, edtId })
        break
      case 'progreso':
        reporte = await generarReporteProgreso({ proyectoId, fechaDesde, fechaHasta, edtId })
        break
      case 'eficiencia':
        reporte = await generarReporteEficiencia({ proyectoId, fechaDesde, fechaHasta, edtId })
        break
      case 'timeline':
        reporte = await generarReporteTimeline({ proyectoId, fechaDesde, fechaHasta, edtId })
        break
      default:
        return NextResponse.json(
          { error: 'Tipo de reporte no válido' },
          { status: 400 }
        )
    }

    logger.info(`📊 Reporte EDT generado: ${tipoReporte} - Usuario: ${session.user.email}`)

    return NextResponse.json({
      success: true,
      tipo: tipoReporte,
      filtros: { proyectoId, fechaDesde, fechaHasta, edtId },
      generadoEn: new Date(),
      ...reporte
    })

  } catch (error) {
    logger.error('❌ Error generando reporte EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// 📊 Reporte Resumen por EDT
async function generarReporteResumen(filtros: any) {
  const { proyectoId, fechaDesde, fechaHasta, edtId } = filtros

  // Construir filtros
  const whereClause: any = {}
  if (proyectoId) whereClause.proyectoId = proyectoId
  if (edtId) whereClause.id = edtId

  // Filtro de fechas para registros de horas
  const fechaFiltro: any = {}
  if (fechaDesde) fechaFiltro.gte = new Date(fechaDesde)
  if (fechaHasta) fechaFiltro.lte = new Date(fechaHasta)

  // Métricas generales por EDT
  const edts = await prisma.proyectoEdt.findMany({
    where: whereClause,
    include: {
      proyecto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          cliente: {
            select: { nombre: true }
          }
        }
      },
      edt: {
        select: { nombre: true }
      },
      user: {
        select: { name: true, email: true }
      },
      registroHoras: fechaDesde || fechaHasta ? {
        where: {
          fechaTrabajo: fechaFiltro
        },
        select: {
          horasTrabajadas: true,
          fechaTrabajo: true,
          user: {
            select: { name: true }
          }
        }
      } : {
        select: {
          horasTrabajadas: true,
          fechaTrabajo: true,
          user: {
            select: { name: true }
          }
        }
      },
      proyectoActividad: {
        select: {
          id: true,
          nombre: true,
          horasReales: true,
          horasPlan: true,
          porcentajeAvance: true
        }
      },
      proyectoTarea: {
        select: {
          id: true,
          nombre: true
        }
      }
    },
    orderBy: {
      orden: 'asc'
    }
  })

  // Calcular métricas por EDT
  const resumenEdts = edts.map((edt: any) => {
    const horasPlan = Number(edt.horasPlan || 0)
    const horasReales = Number(edt.horasReales)
    const horasRegistradas = edt.registroHoras.reduce((sum: number, reg: any) => sum + Number(reg.horasTrabajadas), 0)
    const eficiencia = horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0
    const avance = edt.porcentajeAvance || 0
    
    // Calcular total de elementos (actividades + tareas)
    const totalElementos = edt.proyectoActividad.length + edt.proyectoTarea.length
    const elementosCompletados = edt.proyectoActividad.filter((a: any) => a.porcentajeAvance >= 100).length
    const avanceElementos = totalElementos > 0 ? (elementosCompletados / totalElementos) * 100 : 0

    return {
      id: edt.id,
      nombre: edt.nombre,
      proyecto: edt.proyecto,
      edt: edt.edt,
      user: edt.user,
      horasPlan,
      horasReales,
      horasRegistradas,
      eficiencia,
      avance,
      avanceElementos,
      estado: edt.estado,
      totalElementos,
      elementosCompletados,
      fechaInicioPlan: edt.fechaInicioPlan,
      fechaFinPlan: edt.fechaFinPlan,
      actividades: edt.proyectoActividad,
      tareas: edt.proyectoTarea
    }
  })

  // Estadísticas generales
  const estadisticas = {
    totalEdts: edts.length,
    horasPlanTotal: resumenEdts.reduce((sum: number, edt: any) => sum + edt.horasPlan, 0),
    horasRealesTotal: resumenEdts.reduce((sum: number, edt: any) => sum + edt.horasReales, 0),
    horasRegistradasTotal: resumenEdts.reduce((sum: number, edt: any) => sum + edt.horasRegistradas, 0),
    promedioAvance: resumenEdts.reduce((sum: number, edt: any) => sum + edt.avance, 0) / resumenEdts.length,
    eficienciaPromedio: resumenEdts.reduce((sum: number, edt: any) => sum + edt.eficiencia, 0) / resumenEdts.length
  }

  return {
    data: {
      resumen: estadisticas,
      edts: resumenEdts
    }
  }
}

// 📋 Reporte Detalle por EDT específico
async function generarReporteDetalleEdt(filtros: any) {
  const { proyectoId, fechaDesde, fechaHasta, edtId } = filtros

  if (!edtId) {
    throw new Error('EDT ID requerido para reporte detallado')
  }

  const whereClause: any = { id: edtId }
  if (proyectoId) whereClause.proyectoId = proyectoId

  const fechaFiltro: any = {}
  if (fechaDesde) fechaFiltro.gte = new Date(fechaDesde)
  if (fechaHasta) fechaFiltro.lte = new Date(fechaHasta)

  const edt = await prisma.proyectoEdt.findUnique({
    where: whereClause,
    include: {
      proyecto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          cliente: { select: { nombre: true } }
        }
      },
      edt: { select: { nombre: true } },
      user: { select: { name: true, email: true } },
      registroHoras: {
        where: {
          fechaTrabajo: fechaFiltro
        },
        include: {
          user: { select: { name: true, email: true } },
          recurso: { select: { nombre: true } }
        },
        orderBy: { fechaTrabajo: 'desc' }
      },
      proyectoActividad: {
        select: {
          id: true,
          nombre: true,
          horasReales: true,
          horasPlan: true,
          porcentajeAvance: true,
          responsableId: true
        },
        orderBy: { orden: 'asc' }
      },
      proyectoTarea: {
        select: {
          id: true,
          nombre: true,
          responsableId: true
        },
        orderBy: { orden: 'asc' }
      }
    }
  })

  if (!edt) {
    throw new Error('EDT no encontrado')
  }

  // Obtener información de responsables
  const responsableIds = [
    ...edt.proyectoActividad.map((a: any) => a.userId).filter(Boolean),
    ...edt.proyectoTarea.map((t: any) => t.userId).filter(Boolean)
  ]

  const usuarios = await prisma.user.findMany({
    where: { id: { in: responsableIds } },
    select: { id: true, name: true }
  })

  const responsableMap = new Map(usuarios.map(u => [u.id, u.name]))

  // Calcular horas por elemento
  const actividadesConHoras = edt.proyectoActividad.map((actividad: any) => {
    const horasRegistradas = 0 // Los registros de horas están a nivel de EDT, no de actividad individual
    return {
      ...actividad,
      horasRegistradas,
      eficiencia: Number(actividad.horasPlan || 0) > 0 ? (Number(actividad.horasReales) / Number(actividad.horasPlan)) * 100 : 0,
      responsableNombre: responsableMap.get(actividad.userId || '') || 'Sin responsable'
    }
  })

  const tareasConHoras = edt.proyectoTarea.map((tarea: any) => ({
    ...tarea,
    horasRegistradas: 0,
    responsableNombre: responsableMap.get(tarea.userId || '') || 'Sin responsable'
  }))

  return {
    data: {
      edt: {
        ...edt,
        actividades: actividadesConHoras,
        tareas: tareasConHoras
      },
      resumen: {
        horasPlan: Number(edt.horasPlan || 0),
        horasReales: Number(edt.horasReales),
        totalRegistros: edt.registroHoras.length,
        usuariosActivos: [...new Set(edt.registroHoras.map((reg: any) => reg.user.name).filter(Boolean))].length
      }
    }
  }
}

// 📈 Reporte de Progreso
async function generarReporteProgreso(filtros: any) {
  const { proyectoId, fechaDesde, fechaHasta, edtId } = filtros

  const whereClause: any = {}
  if (proyectoId) whereClause.proyectoId = proyectoId
  if (edtId) whereClause.id = edtId

  const fechaFiltro: any = {}
  if (fechaDesde) fechaFiltro.gte = new Date(fechaDesde)
  if (fechaHasta) fechaFiltro.lte = new Date(fechaHasta)

  const progreso = await prisma.proyectoEdt.findMany({
    where: whereClause,
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      proyectoActividad: {
        select: {
          id: true,
          nombre: true,
          porcentajeAvance: true,
          horasPlan: true,
          horasReales: true
        }
      },
      proyectoTarea: {
        select: {
          id: true,
          nombre: true,
          porcentajeCompletado: true
        }
      }
    }
  })

  const datosProgreso = progreso.map((edt: any) => {
    const totalActividades = edt.proyectoActividad.length
    const totalTareas = edt.proyectoTarea.length
    const actividadesCompletadas = edt.proyectoActividad.filter((a: any) => a.porcentajeAvance >= 100).length
    const tareasCompletadas = edt.proyectoTarea.filter((t: any) => t.porcentajeCompletado >= 100).length
    
    const progresoActividades = totalActividades > 0 ? (actividadesCompletadas / totalActividades) * 100 : 0
    const progresoTareas = totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0
    const progresoGeneral = (progresoActividades + progresoTareas) / 2

    return {
      id: edt.id,
      nombre: edt.nombre,
      proyecto: edt.proyecto,
      avanceGeneral: edt.porcentajeAvance,
      progresoCalculado: progresoGeneral,
      horasPlan: Number(edt.horasPlan || 0),
      horasReales: Number(edt.horasReales),
      eficienciaHoras: Number(edt.horasPlan || 0) > 0 ? (Number(edt.horasReales) / Number(edt.horasPlan)) * 100 : 0,
      actividades: {
        total: totalActividades,
        completadas: actividadesCompletadas,
        progreso: progresoActividades
      },
      tareas: {
        total: totalTareas,
        completadas: tareasCompletadas,
        progreso: progresoTareas
      }
    }
  })

  return {
    data: {
      progreso: datosProgreso,
      estadisticas: {
        promedioAvance: datosProgreso.reduce((sum: number, d: any) => sum + d.avanceGeneral, 0) / datosProgreso.length,
        promedioEficiencia: datosProgreso.reduce((sum: number, d: any) => sum + d.eficienciaHoras, 0) / datosProgreso.length,
        edtsCompletos: datosProgreso.filter((d: any) => d.avanceGeneral >= 100).length,
        edtsEnProgreso: datosProgreso.filter((d: any) => d.avanceGeneral > 0 && d.avanceGeneral < 100).length
      }
    }
  }
}

// ⚡ Reporte de Eficiencia
async function generarReporteEficiencia(filtros: any) {
  const { proyectoId, fechaDesde, fechaHasta, edtId } = filtros

  const whereClause: any = {}
  if (proyectoId) whereClause.proyectoId = proyectoId
  if (edtId) whereClause.id = edtId

  const edts = await prisma.proyectoEdt.findMany({
    where: {
      ...whereClause,
      horasPlan: { gt: 0 }
    },
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      user: { select: { name: true } }
    }
  })

  const eficiencia = edts.map((edt: any) => {
    const horasPlan = Number(edt.horasPlan || 0)
    const horasReales = Number(edt.horasReales)
    const variacion = horasPlan > 0 ? ((horasReales - horasPlan) / horasPlan) * 100 : 0
    
    let estado = 'eficiente'
    if (variacion > 20) estado = 'sobrecosto'
    else if (variacion < -10) estado = 'subcosto'

    return {
      id: edt.id,
      nombre: edt.nombre,
      proyecto: edt.proyecto,
      user: edt.user,
      horasPlan,
      horasReales,
      variacion,
      estado,
      eficiencia: horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0,
      avance: edt.porcentajeAvance
    }
  })

  // Estadísticas
  const estadisticas = {
    eficientes: eficiencia.filter((e: any) => e.estado === 'eficiente').length,
    sobrecostos: eficiencia.filter((e: any) => e.estado === 'sobrecosto').length,
    subcostos: eficiencia.filter((e: any) => e.estado === 'subcosto').length,
    variacionPromedio: eficiencia.reduce((sum: number, e: any) => sum + e.variacion, 0) / eficiencia.length
  }

  return {
    data: {
      eficiencia: eficiencia.sort((a: any, b: any) => b.eficiencia - a.eficiencia),
      estadisticas
    }
  }
}

// 📅 Reporte Timeline
async function generarReporteTimeline(filtros: any) {
  const { proyectoId, fechaDesde, fechaHasta, edtId } = filtros

  const whereClause: any = {}
  if (proyectoId) whereClause.proyectoId = proyectoId
  if (edtId) whereClause.id = edtId

  const fechaFiltro: any = {}
  if (fechaDesde) fechaFiltro.gte = new Date(fechaDesde)
  if (fechaHasta) fechaFiltro.lte = new Date(fechaHasta)

  const edts = await prisma.proyectoEdt.findMany({
    where: whereClause,
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      registroHoras: {
        where: {
          fechaTrabajo: fechaFiltro
        },
        select: {
          fechaTrabajo: true,
          horasTrabajadas: true,
          user: { select: { name: true } }
        },
        orderBy: { fechaTrabajo: 'asc' }
      }
    },
    orderBy: { fechaInicioPlan: 'asc' }
  })

  const timeline = edts.map((edt: any) => {
    const registrosPorFecha = edt.registroHoras.reduce((acc: Record<string, { total: number, usuarios: string[] }>, reg: any) => {
      const fecha = reg.fechaTrabajo.toISOString().split('T')[0]
      if (!acc[fecha]) acc[fecha] = { total: 0, usuarios: [] }
      acc[fecha].total += Number(reg.horasTrabajadas)
      const userName = reg.user.name || 'Usuario sin nombre'
      if (!acc[fecha].usuarios.includes(userName)) {
        acc[fecha].usuarios.push(userName)
      }
      return acc
    }, {})

    return {
      id: edt.id,
      nombre: edt.nombre,
      proyecto: edt.proyecto,
      fechaInicioPlan: edt.fechaInicioPlan,
      fechaFinPlan: edt.fechaFinPlan,
      fechaInicioReal: edt.fechaInicioReal,
      fechaFinReal: edt.fechaFinReal,
      estado: edt.estado,
      registrosPorFecha
    }
  })

  return {
    data: { timeline }
  }
}