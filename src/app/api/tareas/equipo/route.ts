/**
 * API para obtener metricas del equipo de trabajo
 *
 * "Equipo" se refiere a los usuarios que tienen tareas asignadas en proyectos.
 * No es una entidad separada, sino una vista de los colaboradores activos.
 *
 * Devuelve estadisticas de usuarios con tareas asignadas:
 * - Horas registradas
 * - Tareas completadas/asignadas
 * - Eficiencia
 * - Proyectos activos
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  startOfMonth,
  endOfMonth,
  differenceInDays
} from 'date-fns'

interface MiembroEquipo {
  id: string
  nombre: string
  email: string
  rol: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  estado: 'activo' | 'inactivo' | 'vacaciones'
  ultimoRegistro: Date | null
  proyectosActivos: number
}

interface ProyectoEquipo {
  id: string
  nombre: string
  codigo: string
  miembros: MiembroEquipo[]
  horasTotales: number
  tareasTotales: number
  tareasCompletadas: number
  progresoGeneral: number
}

export async function GET(_request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Solo coordinadores, gestores y admin pueden ver el equipo
    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver el equipo' },
        { status: 403 }
      )
    }

    const ahora = new Date()
    const inicioMes = startOfMonth(ahora)
    const finMes = endOfMonth(ahora)

    // Obtener ProyectoTareas con responsables asignados
    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: {
        responsableId: { not: null }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        proyectoEdt: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estado: true,
                progresoGeneral: true
              }
            }
          }
        },
        registroHoras: {
          where: {
            fechaTrabajo: {
              gte: inicioMes,
              lte: finMes
            }
          }
        }
      }
    })

    // También obtener tareas del modelo Tarea con responsables
    const tareasSimples = await prisma.tarea.findMany({
      where: {
        responsableId: { not: null },
        estado: { not: 'cancelada' }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        proyectoServicioCotizado: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estado: true,
                progresoGeneral: true
              }
            }
          }
        }
      }
    })

    // Obtener registros de horas del mes actual para calcular horas por usuario
    const registrosHorasMes = await prisma.registroHoras.findMany({
      where: {
        fechaTrabajo: {
          gte: inicioMes,
          lte: finMes
        }
      },
      select: {
        usuarioId: true,
        horasTrabajadas: true,
        fechaTrabajo: true,
        proyectoId: true
      }
    })

    // Agrupar registros por usuario
    const horasPorUsuario = new Map<string, { total: number, ultimoRegistro: Date | null, proyectos: Set<string> }>()
    registrosHorasMes.forEach(r => {
      const datos = horasPorUsuario.get(r.usuarioId) || { total: 0, ultimoRegistro: null, proyectos: new Set() }
      datos.total += r.horasTrabajadas
      if (!datos.ultimoRegistro || r.fechaTrabajo > datos.ultimoRegistro) {
        datos.ultimoRegistro = r.fechaTrabajo
      }
      if (r.proyectoId) {
        datos.proyectos.add(r.proyectoId)
      }
      horasPorUsuario.set(r.usuarioId, datos)
    })

    // Construir mapa de miembros
    const miembrosGlobal = new Map<string, MiembroEquipo>()
    const proyectosMap = new Map<string, ProyectoEquipo>()

    // Procesar ProyectoTareas
    proyectoTareas.forEach(tarea => {
      const proyecto = tarea.proyectoEdt?.proyecto
      if (!proyecto || !tarea.user) return

      // Agregar/actualizar miembro
      const userId = tarea.user.id
      if (!miembrosGlobal.has(userId)) {
        const datosHoras = horasPorUsuario.get(userId) || { total: 0, ultimoRegistro: null, proyectos: new Set() }
        miembrosGlobal.set(userId, {
          id: userId,
          nombre: tarea.user.name || 'Sin nombre',
          email: tarea.user.email || '',
          rol: tarea.user.role || 'colaborador',
          horasRegistradas: datosHoras.total,
          horasObjetivo: 160,
          tareasCompletadas: 0,
          tareasAsignadas: 0,
          eficiencia: 0,
          estado: 'activo',
          ultimoRegistro: datosHoras.ultimoRegistro,
          proyectosActivos: datosHoras.proyectos.size
        })
      }

      const miembro = miembrosGlobal.get(userId)!
      miembro.tareasAsignadas++
      if (tarea.estado === 'completada') {
        miembro.tareasCompletadas++
      }

      // Agregar/actualizar proyecto
      if (!proyectosMap.has(proyecto.id)) {
        proyectosMap.set(proyecto.id, {
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          miembros: [],
          horasTotales: 0,
          tareasTotales: 0,
          tareasCompletadas: 0,
          progresoGeneral: proyecto.progresoGeneral || 0
        })
      }

      const pData = proyectosMap.get(proyecto.id)!
      pData.tareasTotales++
      if (tarea.estado === 'completada') {
        pData.tareasCompletadas++
      }
      const horasTarea = tarea.registroHoras.reduce((sum: number, r: { horasTrabajadas: number }) => sum + r.horasTrabajadas, 0)
      pData.horasTotales += horasTarea
    })

    // Procesar Tareas simples
    tareasSimples.forEach(tarea => {
      const proyecto = tarea.proyectoServicioCotizado?.proyecto
      if (!tarea.user) return

      const userId = tarea.user.id
      if (!miembrosGlobal.has(userId)) {
        const datosHoras = horasPorUsuario.get(userId) || { total: 0, ultimoRegistro: null, proyectos: new Set() }
        miembrosGlobal.set(userId, {
          id: userId,
          nombre: tarea.user.name || 'Sin nombre',
          email: tarea.user.email || '',
          rol: tarea.user.role || 'colaborador',
          horasRegistradas: datosHoras.total,
          horasObjetivo: 160,
          tareasCompletadas: 0,
          tareasAsignadas: 0,
          eficiencia: 0,
          estado: 'activo',
          ultimoRegistro: datosHoras.ultimoRegistro,
          proyectosActivos: datosHoras.proyectos.size
        })
      }

      const miembro = miembrosGlobal.get(userId)!
      miembro.tareasAsignadas++
      if (tarea.estado === 'completada') {
        miembro.tareasCompletadas++
      }

      // Agregar al proyecto si existe
      if (proyecto) {
        if (!proyectosMap.has(proyecto.id)) {
          proyectosMap.set(proyecto.id, {
            id: proyecto.id,
            nombre: proyecto.nombre,
            codigo: proyecto.codigo,
            miembros: [],
            horasTotales: 0,
            tareasTotales: 0,
            tareasCompletadas: 0,
            progresoGeneral: proyecto.progresoGeneral || 0
          })
        }

        const pData = proyectosMap.get(proyecto.id)!
        pData.tareasTotales++
        if (tarea.estado === 'completada') {
          pData.tareasCompletadas++
        }
      }
    })

    // Calcular eficiencia y estado de cada miembro
    miembrosGlobal.forEach(miembro => {
      if (miembro.tareasAsignadas > 0) {
        miembro.eficiencia = Math.round((miembro.tareasCompletadas / miembro.tareasAsignadas) * 100)
      }

      if (miembro.ultimoRegistro) {
        const diasSinRegistro = differenceInDays(ahora, miembro.ultimoRegistro)
        if (diasSinRegistro > 7) {
          miembro.estado = 'inactivo'
        }
      } else {
        miembro.estado = 'inactivo'
      }
    })

    // Asignar miembros a proyectos
    proyectoTareas.forEach(tarea => {
      const proyecto = tarea.proyectoEdt?.proyecto
      if (!proyecto || !tarea.user) return

      const pData = proyectosMap.get(proyecto.id)
      const miembro = miembrosGlobal.get(tarea.user.id)
      if (pData && miembro && !pData.miembros.find(m => m.id === miembro.id)) {
        pData.miembros.push(miembro)
      }
    })

    tareasSimples.forEach(tarea => {
      const proyecto = tarea.proyectoServicioCotizado?.proyecto
      if (!proyecto || !tarea.user) return

      const pData = proyectosMap.get(proyecto.id)
      const miembro = miembrosGlobal.get(tarea.user.id)
      if (pData && miembro && !pData.miembros.find(m => m.id === miembro.id)) {
        pData.miembros.push(miembro)
      }
    })

    // Convertir a arrays
    const proyectos = Array.from(proyectosMap.values())
      .filter(p => p.miembros.length > 0)
      .sort((a, b) => b.tareasTotales - a.tareasTotales)

    const todosLosMiembros = Array.from(miembrosGlobal.values())
      .sort((a, b) => b.tareasAsignadas - a.tareasAsignadas)

    // Calcular metricas globales
    const totalMiembros = todosLosMiembros.length
    const miembrosActivos = todosLosMiembros.filter(m => m.estado === 'activo').length
    const horasTotalesEquipo = todosLosMiembros.reduce((sum, m) => sum + m.horasRegistradas, 0)
    const tareasTotalesEquipo = todosLosMiembros.reduce((sum, m) => sum + m.tareasAsignadas, 0)
    const tareasCompletadasEquipo = todosLosMiembros.reduce((sum, m) => sum + m.tareasCompletadas, 0)
    const eficienciaPromedio = totalMiembros > 0
      ? Math.round(todosLosMiembros.reduce((sum, m) => sum + m.eficiencia, 0) / totalMiembros)
      : 0
    const progresoPromedioProyectos = proyectos.length > 0
      ? Math.round(proyectos.reduce((sum, p) => sum + p.progresoGeneral, 0) / proyectos.length)
      : 0

    // Alertas
    const miembrosBajoRendimiento = todosLosMiembros.filter(m => m.eficiencia < 70 && m.tareasAsignadas > 0)
    const miembrosSinRegistro = todosLosMiembros.filter(m => {
      if (!m.ultimoRegistro) return true
      const diasSinRegistro = differenceInDays(ahora, m.ultimoRegistro)
      return diasSinRegistro > 3
    })

    return NextResponse.json({
      success: true,
      data: {
        proyectos,
        miembros: todosLosMiembros,
        metricas: {
          totalMiembros,
          miembrosActivos,
          horasTotalesEquipo: Math.round(horasTotalesEquipo * 10) / 10,
          tareasTotalesEquipo,
          tareasCompletadasEquipo,
          eficienciaPromedio,
          progresoPromedioProyectos,
          proyectosActivos: proyectos.length
        },
        alertas: {
          bajoRendimiento: miembrosBajoRendimiento.length,
          sinRegistroReciente: miembrosSinRegistro.length
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo equipo:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}
