import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'current'
    const periodo = searchParams.get('periodo') || 'mensual'
    const fechaLimite = searchParams.get('fechaLimite') || new Date().toISOString().split('T')[0]

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const fechaInicio = new Date(fechaLimite)
    if (periodo === 'semanal') {
      fechaInicio.setDate(fechaInicio.getDate() - 7)
    } else {
      fechaInicio.setMonth(fechaInicio.getMonth() - 1)
    }

    // Obtener registros de horas del usuario en el período
    const registrosHoras = await prisma.registroHoras.findMany({
      where: {
        usuarioId: userId === 'current' ? currentUser.id : userId,
        fechaTrabajo: {
          gte: fechaInicio,
          lte: new Date(fechaLimite)
        }
      },
      include: {
        proyecto: true,
        recurso: true
      }
    })

    // Calcular métricas de productividad
    const horasTotales = registrosHoras.reduce((sum, r) => sum + r.horasTrabajadas, 0)
    const horasPlanificadas = horasTotales * 1.2 // Simulado: 20% más que real
    const eficiencia = horasPlanificadas > 0 ? (horasTotales / horasPlanificadas) * 100 : 0

    const proyectos = new Map()
    const tipos = new Map()

    registrosHoras.forEach(registro => {
      // Agrupar por proyecto
      if (proyectos.has(registro.proyecto.nombre)) {
        proyectos.set(registro.proyecto.nombre, 
          proyectos.get(registro.proyecto.nombre) + registro.horasTrabajadas)
      } else {
        proyectos.set(registro.proyecto.nombre, registro.horasTrabajadas)
      }

      // Agrupar por tipo (simulado basado en recurso)
      const tipo = registro.recurso.nombre || 'General'
      if (tipos.has(tipo)) {
        tipos.set(tipo, tipos.get(tipo) + registro.horasTrabajadas)
      } else {
        tipos.set(tipo, registro.horasTrabajadas)
      }
    })

    const horasPorProyecto = Array.from(proyectos.entries()).map(([nombre, horas]) => ({
      nombre,
      horas
    }))

    const distribucionTiempo = Array.from(tipos.entries()).map(([nombre, horas], index) => ({
      nombre,
      horas,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][index % 6]
    }))

    // Comparativa histórica (últimas 4 semanas)
    const comparativaHistorica = []
    for (let i = 0; i < 4; i++) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - (i + 1) * 7)
      
      const registrosComparativos = await prisma.registroHoras.findMany({
        where: {
          usuarioId: userId === 'current' ? currentUser.id : userId,
          fechaTrabajo: {
            gte: new Date(fecha.getTime() - 7 * 24 * 60 * 60 * 1000),
            lte: fecha
          }
        }
      })

      const horas = registrosComparativos.reduce((sum, r) => sum + r.horasTrabajadas, 0)
      comparativaHistorica.push({
        periodo: `Sem ${i + 1}`,
        horas,
        objetivo: 40 // Objetivo semanal simulado
      })
    }

    comparativaHistorica.reverse()

    // Generar alertas basadas en datos
    const alertas = []
    if (eficiencia < 70) {
      alertas.push({
        tipo: 'bajo_rendimiento',
        mensaje: 'La eficiencia está por debajo del 70%. Revisar objetivos y carga de trabajo.',
        severidad: eficiencia < 50 ? 'alta' : 'media'
      })
    }
    if (horasTotales > 50) {
      alertas.push({
        tipo: 'horas_exceso',
        mensaje: 'Horas trabajadas exceden las 50h. Considerar redistribución de carga.',
        severidad: 'media'
      })
    }
    if (horasTotales < 20) {
      alertas.push({
        tipo: 'objetivo_pendiente',
        mensaje: 'Horas trabajadas por debajo del objetivo mínimo de 40h.',
        severidad: 'baja'
      })
    }

    // Calcular días trabajados (unique dates)
    const diasTrabajados = new Set(
      registrosHoras.map(r => r.fechaTrabajo.toDateString())
    ).size

    // Proyectos activos (proyectos con horas registradas)
    const proyectosActivos = new Set(registrosHoras.map(r => r.proyectoId)).size

    const metricas = {
      horasTotales,
      horasPlanificadas,
      eficiencia,
      diasTrabajados,
      proyectosActivos,
      cumplimientoObjetivo: horasTotales >= 40 ? 100 : (horasTotales / 40) * 100,
      tendenciaSemanal: 5.2, // Simulado
      horasPorProyecto,
      distribucionTiempo,
      comparativaHistorica,
      alertas
    }

    return NextResponse.json({ data: metricas })

  } catch (error) {
    console.error('Error obteniendo productividad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}