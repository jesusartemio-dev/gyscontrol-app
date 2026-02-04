/**
 * API para obtener timesheet semanal del usuario
 *
 * Retorna las horas registradas por día en una semana específica
 * Formato: ISO week (ej: 2025-W03 para semana 3 de 2025)
 *
 * VERSIÓN CON BASE DE DATOS REAL
 */

import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión para filtrar por usuario
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ Timesheet semanal: No hay sesión válida')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ Timesheet semanal: Sesión válida', {
      userId: session.user.id,
      email: session.user.email
    })

    const { searchParams } = new URL(request.url)
    const semanaISO = searchParams.get('semana') || format(new Date(), 'yyyy-\'W\'ww')

    // Parsear semana ISO (ej: "2025-W03")
    const [year, week] = semanaISO.split('-W').map(Number)
    const fechaReferencia = new Date(year, 0, 1 + (week - 1) * 7)
    const inicioSemana = startOfWeek(fechaReferencia, { weekStartsOn: 1 }) // Lunes
    const finSemana = endOfWeek(fechaReferencia, { weekStartsOn: 1 }) // Domingo

    console.log(`🔍 Buscando registros de horas para semana: ${semanaISO}`)
    console.log(`📅 Rango: ${format(inicioSemana, 'yyyy-MM-dd')} a ${format(finSemana, 'yyyy-MM-dd')}`)

    // 1. CONSULTA PRINCIPAL: Obtener registros de horas reales de la BD
    console.log(`🔍 DEBUG: UsuarioId para consulta: ${session.user.id}`)
    console.log(`🔍 DEBUG: Rango inicio: ${inicioSemana} (${format(inicioSemana, 'yyyy-MM-dd HH:mm:ss')})`)
    console.log(`🔍 DEBUG: Rango fin: ${finSemana} (${format(finSemana, 'yyyy-MM-dd HH:mm:ss')})`)
    
    const registrosHoras = await prisma.registroHoras.findMany({
      where: {
        usuarioId: session.user.id,  // ✅ FILTRAR POR USUARIO ACTUAL
        fechaTrabajo: {
          gte: inicioSemana,
          lte: finSemana
        }
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        },
        recurso: {
          select: {
            nombre: true
          }
        },
        edt: {
          select: {
            id: true,
            nombre: true
          }
        },
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edt: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        proyectoTarea: {
          select: {
            id: true,
            nombre: true,
            proyectoActividad: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaTrabajo: 'asc'
      }
    })

    console.log(`✅ Encontrados ${registrosHoras.length} registros de horas en la BD`)
    
    // DEBUG: Verificar si hay registros del usuario sin filtro de fecha
    const todosRegistrosUsuario = await prisma.registroHoras.findMany({
      where: {
        usuarioId: session.user.id
      },
      orderBy: {
        fechaTrabajo: 'desc'
      },
      take: 5  // Solo los últimos 5 para debug
    })
    
    console.log(`🔍 DEBUG: Total registros del usuario (últimos 5):`)
    todosRegistrosUsuario.forEach((registro, index) => {
      console.log(`   ${index + 1}. ID: ${registro.id}`)
      console.log(`      Fecha: ${registro.fechaTrabajo} (${format(new Date(registro.fechaTrabajo), 'yyyy-MM-dd HH:mm:ss')})`)
      console.log(`      Proyecto: ${registro.proyectoId}`)
      console.log(`      Horas: ${registro.horasTrabajadas}`)
    })

    // 2. PROCESAR DATOS POR DÍA
    const diasSemana = []
    let diaActual = inicioSemana
    let totalHorasSemana = 0
    let diasTrabajados = 0

    for (let i = 0; i < 7; i++) {
      const fechaDia = diaActual
      
      // Filtrar registros para este día específico
      const registrosDia = registrosHoras.filter(registro => {
        const fechaRegistro = new Date(registro.fechaTrabajo)
        return format(fechaRegistro, 'yyyy-MM-dd') === format(fechaDia, 'yyyy-MM-dd')
      })

      // Calcular total de horas del día
      const totalHorasDia = registrosDia.reduce((sum, registro) => sum + registro.horasTrabajadas, 0)
      
      if (totalHorasDia > 0) {
        diasTrabajados++
        totalHorasSemana += totalHorasDia
      }

      // Formatear registros para el frontend
      const registrosFormateados = registrosDia.map(registro => ({
        id: registro.id,
        horas: registro.horasTrabajadas,
        descripcion: registro.descripcion || registro.observaciones || 'Sin descripción',
        // Formato jerárquico: Código Proyecto-EDT-Actividad:Tarea
        proyectoNombre: registro.proyecto ? `${registro.proyecto.codigo} - ${registro.proyecto.nombre}` : 'Sin proyecto',
        // ✅ Usar el nombre del ProyectoEdt seleccionado, no el del catálogo
        edtNombre: registro.proyectoEdt?.nombre || registro.edt?.nombre || 'Sin EDT',
        actividadNombre: registro.proyectoTarea?.proyectoActividad?.nombre || null,
        tareaNombre: registro.proyectoTarea?.nombre || null,
        tareaTipo: 'registro',
        aprobado: registro.aprobado,
        fecha: registro.fechaTrabajo,
        recursoNombre: registro.recurso?.nombre || 'Sin recurso'
      }))

      diasSemana.push({
        fecha: fechaDia,
        fechaString: format(fechaDia, 'yyyy-MM-dd'),
        diaNombre: format(fechaDia, 'EEEE', { locale: es }),
        totalHoras: Math.round(totalHorasDia * 10) / 10,
        registros: registrosFormateados
      })

      diaActual = addDays(diaActual, 1)
    }

    // 3. CALCULAR MÉTRICAS DE LA SEMANA
    const promedioDiario = diasTrabajados > 0 ? Math.round((totalHorasSemana / diasTrabajados) * 10) / 10 : 0

    // Calcular vs semana anterior (buscar registros de la semana anterior)
    const semanaAnteriorInicio = addDays(inicioSemana, -7)
    const semanaAnteriorFin = addDays(finSemana, -7)
    
    const registrosSemanaAnterior = await prisma.registroHoras.findMany({
      where: {
        usuarioId: session.user.id,  // ✅ FILTRAR POR USUARIO ACTUAL
        fechaTrabajo: {
          gte: semanaAnteriorInicio,
          lte: semanaAnteriorFin
        }
      }
    })

    const totalHorasSemanaAnterior = registrosSemanaAnterior.reduce((sum, registro) => sum + registro.horasTrabajadas, 0)
    const vsSemanaAnterior = totalHorasSemanaAnterior > 0
      ? Math.round(((totalHorasSemana - totalHorasSemanaAnterior) / totalHorasSemanaAnterior) * 100 * 10) / 10
      : 0

    const resumenSemana = {
      semana: semanaISO,
      semanaInicio: format(inicioSemana, 'yyyy-MM-dd'),
      semanaFin: format(finSemana, 'yyyy-MM-dd'),
      totalHoras: Math.round(totalHorasSemana * 10) / 10,
      diasTrabajados,
      promedioDiario,
      vsSemanaAnterior
    }

    // 4. AGRUPAR POR PROYECTO
    const proyectosMap = new Map()
    
    registrosHoras.forEach(registro => {
      const proyectoId = registro.proyecto?.id
      const proyectoNombre = registro.proyecto?.nombre || 'Sin nombre'
      const clienteNombre = registro.proyecto?.cliente?.nombre || 'Sin cliente'
      
      if (!proyectoId) return
      
      if (!proyectosMap.has(proyectoId)) {
        proyectosMap.set(proyectoId, {
          proyectoId,
          nombre: proyectoNombre,
          cliente: clienteNombre,
          horas: 0,
          registros: 0
        })
      }
      
      const proyecto = proyectosMap.get(proyectoId)
      proyecto.horas += registro.horasTrabajadas
      proyecto.registros += 1
    })

    const proyectosTrabajados = Array.from(proyectosMap.values()).map(proyecto => ({
      ...proyecto,
      horas: Math.round(proyecto.horas * 10) / 10
    }))

    console.log(`📊 Resumen: ${totalHorasSemana}h totales, ${diasTrabajados} días trabajados, ${proyectosTrabajados.length} proyectos`)

    return NextResponse.json({
      success: true,
      data: {
        resumenSemana,
        diasSemana,
        proyectosTrabajados,
        semana: semanaISO,
        metadata: {
          totalRegistros: registrosHoras.length,
          fechaConsulta: new Date().toISOString(),
          rangoBusqueda: {
            inicio: format(inicioSemana, 'yyyy-MM-dd'),
            fin: format(finSemana, 'yyyy-MM-dd')
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error obteniendo timesheet semanal:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}