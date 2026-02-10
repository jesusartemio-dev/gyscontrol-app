// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/metricas/route.ts
// 🔧 Descripción: API para cálculo de métricas del cronograma
// 🎯 Funcionalidades: KPIs, eficiencia, progreso y alertas
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Construir filtros para EDTs
    const edtWhere: any = { proyectoId: id }
    if (cronogramaId) {
      edtWhere.proyectoCronogramaId = cronogramaId
    }

    // ✅ Obtener todos los EDTs del proyecto/cronograma
    const edts = await (prisma as any).proyectoEdt.findMany({
      where: edtWhere,
      include: {
        proyectoTarea: {
          include: {
            registroHoras: true
          }
        },
        registroHoras: true
      }
    })

    // ✅ Calcular métricas
    const totalEdts = edts.length

    const edtsPorEstado = edts.reduce((acc: any, edt: any) => {
      acc[edt.estado] = (acc[edt.estado] || 0) + 1
      return acc
    }, {})

    const edtsPlanificados = edtsPorEstado['planificado'] || 0
    const edtsEnProgreso = edtsPorEstado['en_progreso'] || 0
    const edtsCompletados = edtsPorEstado['completado'] || 0
    const edtsRetrasados = edts.filter((edt: any) => {
      if (!edt.fechaFinPlan) return false
      const fechaFin = new Date(edt.fechaFinPlan)
      const hoy = new Date()
      return edt.estado !== 'completado' && fechaFin < hoy
    }).length

    // ✅ Calcular horas totales
    const horasPlanTotal = edts.reduce((sum: number, edt: any) => sum + (edt.horasPlan || 0), 0)
    const horasRealesTotal = edts.reduce((sum: number, edt: any) => {
      const horasEdt = edt.registroHoras?.reduce((s: number, r: any) => s + r.horasTrabajadas, 0) || 0
      const horasTareas = edt.proyectoTarea?.reduce((s: number, tarea: any) => {
        return s + (tarea.registroHoras?.reduce((ss: number, r: any) => ss + r.horasTrabajadas, 0) || 0)
      }, 0) || 0
      return sum + horasEdt + horasTareas
    }, 0)

    // ✅ Calcular promedios
    const promedioAvance = totalEdts > 0
      ? edts.reduce((sum: number, edt: any) => sum + (edt.porcentajeAvance || 0), 0) / totalEdts
      : 0

    const eficienciaGeneral = horasPlanTotal > 0
      ? (horasRealesTotal / horasPlanTotal) * 100
      : 0

    // ✅ Calcular cumplimiento de fechas
    const edtsConFechaFin = edts.filter((edt: any) => edt.fechaFinPlan)
    const edtsCumplidos = edtsConFechaFin.filter((edt: any) => {
      if (edt.estado === 'completado') return true
      const fechaFin = new Date(edt.fechaFinPlan!)
      const hoy = new Date()
      return fechaFin >= hoy
    }).length

    const cumplimientoFechas = edtsConFechaFin.length > 0
      ? (edtsCumplidos / edtsConFechaFin.length) * 100
      : 100

    // ✅ Calcular desviación presupuestaria (simplificada)
    // Por ahora usamos la eficiencia como proxy
    const desviacionPresupuestaria = Math.abs(100 - eficienciaGeneral)

    const metricas = {
      totalEdts,
      edtsPlanificados,
      edtsEnProgreso,
      edtsCompletados,
      edtsRetrasados,
      horasPlanTotal,
      horasRealesTotal,
      promedioAvance,
      eficienciaGeneral,
      cumplimientoFechas,
      desviacionPresupuestaria,
      fechaCalculo: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: metricas
    })

  } catch (error) {
    console.error('Error al calcular métricas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}