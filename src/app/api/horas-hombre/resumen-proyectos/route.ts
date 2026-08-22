/**
 * API para resumen de proyectos - Horas ejecutadas vs planificadas
 * 
 * Vista consolidada de todos los proyectos mostrando:
 * - Total de horas ejecutadas (reales)
 * - Total de horas planificadas
 * - Porcentaje de avance
 * - Estado del proyecto
 * - Comparación ejecutadas vs planificadas
 * 
 * Solo para administradores/gestores
 */

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { ProyectoEstado } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión y permisos
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ Resumen proyectos: No hay sesión válida')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos (admin, coordinador, gestor)
    const userRole = session.user.role
    if (!tieneRol(session, ['admin', 'coordinador', 'gestor'])) {
      console.log('❌ Resumen proyectos: Sin permisos suficientes', { role: userRole })
      return NextResponse.json(
        { error: 'Permisos insuficientes. Se requiere rol de administrador, coordinador o gestor' },
        { status: 403 }
      )
    }

    console.log('✅ Resumen proyectos: Acceso autorizado', {
      userId: session.user.id,
      role: userRole
    })

    const { searchParams } = new URL(request.url)
    const estadoFiltro = searchParams.get('estado') as ProyectoEstado | null
    const proyectoFiltro = searchParams.get('proyectoId')

    // 🔍 OBTENER PROYECTOS CON INFORMACIÓN DE HORAS DESDE EJECUCIÓN
    const proyectos = await prisma.proyecto.findMany({
      where: {
        ...(estadoFiltro && { estado: estadoFiltro }),
        ...(proyectoFiltro && { id: proyectoFiltro })
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        progresoGeneral: true,
        cliente: {
          select: {
            nombre: true
          }
        },
        // ✅ SOLO cronograma de EJECUCIÓN (comercial y planificación son solo línea base)
        proyectoCronograma: {
          where: {
            tipo: 'ejecucion'
          },
          select: {
            id: true,
            tipo: true,
            proyectoEdt: {
              select: {
                id: true,
                nombre: true,
                horasPlan: true,
                horasReales: true,
                estado: true,
                edt: {
                  select: {
                    nombre: true
                  }
                },
                // ✅ Obtener tareas para calcular horas estimadas/reales a nivel tarea
                proyectoTarea: {
                  select: {
                    id: true,
                    nombre: true,
                    horasEstimadas: true,
                    horasReales: true,
                    estado: true
                  }
                }
              }
            }
          }
        },
        // 🔧 HORAS REALES: Desde registroHoras (backup)
        registroHoras: {
          select: {
            horasTrabajadas: true,
            fechaTrabajo: true,
            nombreServicio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Encontrados ${proyectos.length} proyectos`)

    // DEBUG: Verificar datos de los proyectos
    console.log(`🔍 DEBUG: Verificando datos de proyectos:`)
    proyectos.forEach((proyecto, index) => {
      const cronogramaEjecucion = proyecto.proyectoCronograma?.[0]
      const edts = cronogramaEjecucion?.proyectoEdt || []
      console.log(`   Proyecto ${index + 1}: ${proyecto.codigo} - ${proyecto.nombre}`)
      console.log(`     Cronograma ejecución: ${cronogramaEjecucion ? 'Sí' : 'No (sin planificación de ejecución)'}`)
      console.log(`     EDTs: ${edts.length}`)
      console.log(`     Registros de horas: ${proyecto.registroHoras.length}`)
      edts.forEach((edt: any, edtIndex: number) => {
        const horasPlan = Number(edt.horasPlan || 0)
        const horasReales = Number(edt.horasReales || 0)
        const tareasCount = edt.proyectoTarea?.length || 0
        console.log(`       EDT ${edtIndex + 1}: ${edt.nombre} - Plan: ${horasPlan}h, Real: ${horasReales}h, Tareas: ${tareasCount}`)
      })
    })

    //  PROCESAR DATOS PARA CALCULAR RESUMEN
    const resumenProyectos = proyectos.map(proyecto => {
      // ✅ SOLO usar cronograma de EJECUCIÓN (comercial y planificación son línea base)
      const cronogramaEjecucion = proyecto.proyectoCronograma?.[0]
      const edtsDelProyecto = cronogramaEjecucion?.proyectoEdt || []
      const tieneCronogramaEjecucion = !!cronogramaEjecucion

      // ✅ CORREGIDO: Calcular horas planificadas desde EDTs del proyecto
      // Preferir suma de horasEstimadas de tareas (más preciso), fallback a horasPlan del EDT
      let horasPlanificadas = 0
      edtsDelProyecto.forEach((edt: any) => {
        // Primero intentar suma de tareas (más preciso)
        const horasTareasPlan = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
          return sum + Number(tarea.horasEstimadas || 0)
        }, 0) || 0

        if (horasTareasPlan > 0) {
          horasPlanificadas += horasTareasPlan
        } else {
          // Fallback: usar horasPlan del EDT si no hay tareas
          horasPlanificadas += Number(edt.horasPlan || 0)
        }
      })

      // ✅ CORREGIDO: Calcular horas ejecutadas desde:
      // Preferir suma de horasReales de tareas (más preciso), fallback a horasReales del EDT
      let horasEjecutadas = 0
      edtsDelProyecto.forEach((edt: any) => {
        // Primero intentar suma de tareas (más preciso)
        const horasTareasReales = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
          return sum + Number(tarea.horasReales || 0)
        }, 0) || 0

        if (horasTareasReales > 0) {
          horasEjecutadas += horasTareasReales
        } else {
          // Fallback: usar horasReales del EDT si no hay tareas con horas
          horasEjecutadas += Number(edt.horasReales || 0)
        }
      })

      // Si aún no hay horas ejecutadas, usar registroHoras como fallback
      if (horasEjecutadas === 0) {
        horasEjecutadas = proyecto.registroHoras.reduce((total, registro) => {
          return total + Number(registro.horasTrabajadas || 0)
        }, 0)
      }

      // Calcular porcentaje de avance
      const porcentajeAvance = horasPlanificadas > 0
        ? Math.round((horasEjecutadas / horasPlanificadas) * 100 * 10) / 10
        : 0

      // Calcular diferencia (exceso o déficit)
      const diferenciaHoras = horasEjecutadas - horasPlanificadas

      // Determinar estado de las horas
      let estadoHoras: 'en_plazo' | 'exceso' | 'sin_planificacion' = 'sin_planificacion'
      if (horasPlanificadas > 0) {
        if (horasEjecutadas <= horasPlanificadas) {
          estadoHoras = 'en_plazo'
        } else {
          estadoHoras = 'exceso'
        }
      }

      // Contar registros de horas
      const totalRegistros = proyecto.registroHoras.length

      console.log(`🔍 DEBUG: Proyecto ${proyecto.codigo} - Cronograma ejecución: ${tieneCronogramaEjecucion ? 'Sí' : 'No'}, EDTs: ${edtsDelProyecto.length}, Plan: ${horasPlanificadas}h, Real: ${horasEjecutadas}h`)

      // ✅ CORREGIDO: Obtener los EDTs del proyecto como "servicios"
      const todosServiciosProyecto = edtsDelProyecto.map((edt: any, index: number) => {
        // Calcular horas de las tareas de este EDT
        const horasEstimadas = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
          return sum + Number(tarea.horasEstimadas || 0)
        }, 0) || Number(edt.horasPlan || 0)

        const horasReales = edt.proyectoTarea?.reduce((sum: number, tarea: any) => {
          return sum + Number(tarea.horasReales || 0)
        }, 0) || Number(edt.horasReales || 0)

        return {
          id: edt.id,
          orden: index,
          nombre: edt.nombre,
          edt: edt.edt?.nombre || edt.nombre,
          horasEstimadas: Math.round(horasEstimadas * 10) / 10,
          subtotalInterno: 0,
          subtotalReal: Math.round(horasReales * 10) / 10,
          itemsCount: edt.proyectoTarea?.length || 0
        }
      })

      return {
        proyecto: {
          id: proyecto.id,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          cliente: proyecto.cliente?.nombre || 'Sin cliente',
          estado: proyecto.estado,
          progresoGeneral: proyecto.progresoGeneral,
          fechaInicio: proyecto.fechaInicio,
          fechaFin: proyecto.fechaFin
        },
        metricas: {
          horasPlanificadas: Math.round(horasPlanificadas * 10) / 10,
          horasEjecutadas: Math.round(horasEjecutadas * 10) / 10,
          diferenciaHoras: Math.round(diferenciaHoras * 10) / 10,
          porcentajeAvance: porcentajeAvance,
          totalRegistros,
          estadoHoras
        },
        servicios: todosServiciosProyecto
      }
    })

    // 🔢 CALCULAR MÉTRICAS GENERALES
    const totalHorasPlanificadas = resumenProyectos.reduce((total, proyecto) =>
      total + proyecto.metricas.horasPlanificadas, 0
    )

    const totalHorasEjecutadas = resumenProyectos.reduce((total, proyecto) =>
      total + proyecto.metricas.horasEjecutadas, 0
    )

    const proyectosEnPlazo = resumenProyectos.filter(p => p.metricas.estadoHoras === 'en_plazo').length
    const proyectosConExceso = resumenProyectos.filter(p => p.metricas.estadoHoras === 'exceso').length
    const proyectosSinPlanificacion = resumenProyectos.filter(p => p.metricas.estadoHoras === 'sin_planificacion').length

    // 🔢 ORDENAR POR PORCENTAJE DE AVANCE
    const resumenOrdenado = resumenProyectos.sort((a, b) =>
      b.metricas.porcentajeAvance - a.metricas.porcentajeAvance
    )

    // DEBUG: Verificar datos procesados
    console.log(`📊 Resumen procesado para enviar:`)
    console.log(`   Total proyectos procesados: ${resumenOrdenado.length}`)
    console.log(`   Total planificadas: ${totalHorasPlanificadas}h`)
    console.log(`   Total ejecutadas: ${totalHorasEjecutadas}h`)
    console.log(`   Proyectos en plazo: ${proyectosEnPlazo}`)
    console.log(`   Proyectos con exceso: ${proyectosConExceso}`)
    console.log(`   Proyectos sin planificación: ${proyectosSinPlanificacion}`)

    resumenOrdenado.forEach((proyecto: any, index: number) => {
      console.log(`   Proyecto ${index + 1}: ${proyecto.proyecto.codigo} - Plan: ${proyecto.metricas.horasPlanificadas}h, Real: ${proyecto.metricas.horasEjecutadas}h`)
      console.log(`     EDTs/Servicios: ${proyecto.servicios?.length || 0}`)
      proyecto.servicios?.slice(0, 3).forEach((servicio: any, servicioIndex: number) => {
        console.log(`       ${servicio.nombre}: Plan ${servicio.horasEstimadas}h, Real ${servicio.subtotalReal}h`)
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        resumenGeneral: {
          totalProyectos: resumenProyectos.length,
          totalHorasPlanificadas: Math.round(totalHorasPlanificadas * 10) / 10,
          totalHorasEjecutadas: Math.round(totalHorasEjecutadas * 10) / 10,
          porcentajeGeneral: totalHorasPlanificadas > 0 
            ? Math.round((totalHorasEjecutadas / totalHorasPlanificadas) * 100 * 10) / 10 
            : 0,
          proyectosEnPlazo,
          proyectosConExceso,
          proyectosSinPlanificacion
        },
        proyectos: resumenOrdenado,
        metadata: {
          fechaConsulta: new Date().toISOString(),
          filtrosAplicados: {
            estado: estadoFiltro || 'todos'
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error generando resumen de proyectos:', error)
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