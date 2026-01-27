import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId') || 'current'
    const equipoId = searchParams.get('equipoId') || 'default'
    const periodo = searchParams.get('periodo') || 'mensual'
    const filtro = searchParams.get('filtro') || 'todos'
    const fechaLimite = searchParams.get('fechaLimite') || new Date().toISOString().split('T')[0]

    const fechaInicio = new Date(fechaLimite)
    if (periodo === 'semanal') {
      fechaInicio.setDate(fechaInicio.getDate() - 7)
    } else {
      fechaInicio.setMonth(fechaInicio.getMonth() - 1)
    }

    // Obtener todos los usuarios del equipo (simulado)
    const usuariosEquipo = await prisma.user.findMany({
      where: {
        role: { in: ['colaborador', 'proyectos', 'coordinador', 'gestor'] }
      },
      take: 10 // Limitar para demo
    })

    const miembros = []

    for (const usuario of usuariosEquipo) {
      const registrosHoras = await prisma.registroHoras.findMany({
        where: {
          usuarioId: usuario.id,
          fechaTrabajo: {
            gte: fechaInicio,
            lte: new Date(fechaLimite)
          }
        },
        include: {
          proyecto: true
        }
      })

      const horasTotales = registrosHoras.reduce((sum, r) => sum + r.horasTrabajadas, 0)
      const horasPlanificadas = horasTotales * 1.2 // Simulado
      const eficiencia = horasPlanificadas > 0 ? (horasTotales / horasPlanificadas) * 100 : 0

      // Determinar estado basado en eficiencia
      let estado: 'excelente' | 'bueno' | 'regular' | 'bajo'
      if (eficiencia >= 95) estado = 'excelente'
      else if (eficiencia >= 80) estado = 'bueno'
      else if (eficiencia >= 60) estado = 'regular'
      else estado = 'bajo'

      // Filtrar por estado si se especificó
      if (filtro !== 'todos' && estado !== filtro) {
        continue
      }

      const diasTrabajados = new Set(
        registrosHoras.map(r => r.fechaTrabajo.toDateString())
      ).size

      const proyectosActivos = new Set(registrosHoras.map(r => r.proyectoId)).size

      // Generar alertas por miembro
      const alertas = []
      if (eficiencia < 70) {
        alertas.push('Eficiencia por debajo del 70%')
      }
      if (horasTotales > 50) {
        alertas.push('Horas trabajadas excesivas (>50h)')
      }
      if (diasTrabajados < 10) {
        alertas.push('Pocos días trabajados en el período')
      }

      miembros.push({
        id: usuario.id,
        nombre: usuario.name || 'Sin nombre',
        rol: usuario.role,
        horasTotales,
        horasPlanificadas,
        eficiencia,
        diasTrabajados,
        proyectosActivos,
        estado,
        alertas
      })
    }

    // Calcular métricas del equipo
    const horasTotalesEquipo = miembros.reduce((sum, m) => sum + m.horasTotales, 0)
    const promedioEficiencia = miembros.length > 0 
      ? miembros.reduce((sum, m) => sum + m.eficiencia, 0) / miembros.length
      : 0
    const miembrosActivos = miembros.filter(m => m.horasTotales > 0).length

    // Alertas generales del equipo
    const alertas = []
    if (promedioEficiencia < 75) {
      alertas.push({
        miembro: 'Equipo General',
        tipo: 'bajo_rendimiento' as const,
        mensaje: 'La eficiencia promedio del equipo está por debajo del 75%',
        severidad: 'alta' as const
      })
    }

    // Comparativa de eficiencia para gráficos
    const comparativaEficiencia = miembros.map(m => ({
      nombre: m.nombre.split(' ')[0], // Solo primer nombre
      eficiencia: m.eficiencia,
      horas: m.horasTotales,
      proyectos: m.proyectosActivos
    }))

    // Tendencia del equipo (simulada)
    const tendenciaEquipo = []
    for (let i = 0; i < 4; i++) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - (i + 1) * 7)
      tendenciaEquipo.push({
        periodo: `Sem ${i + 1}`,
        horas: horasTotalesEquipo * (0.8 + Math.random() * 0.4), // Variación simulación
        eficiencia: promedioEficiencia * (0.8 + Math.random() * 0.4)
      })
    }
    tendenciaEquipo.reverse()

    // Capacitación necesaria (simulada)
    const capacitacionNecesaria = []
    const miembrosConBajaEficiencia = miembros.filter(m => m.eficiencia < 70)
    for (const miembro of miembrosConBajaEficiencia) {
      const areas = ['Gestión de Tiempo', 'Habilidades Técnicas', 'Comunicación', 'Liderazgo']
      const areaAleatoria = areas[Math.floor(Math.random() * areas.length)]
      capacitacionNecesaria.push({
        miembro: miembro.nombre,
        area: areaAleatoria,
        urgencia: miembro.eficiencia < 50 ? 'alta' as const : 'media' as const
      })
    }

    const metricas = {
      miembros,
      horasTotalesEquipo,
      promedioEficiencia,
      miembrosActivos,
      alertas,
      comparativaEficiencia,
      tendenciaEquipo,
      capacitacionNecesaria
    }

    return NextResponse.json({ data: metricas })

  } catch (error) {
    console.error('Error obteniendo reportes de equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}