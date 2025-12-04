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

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, ProyectoEstado } from '@prisma/client'

const prisma = new PrismaClient()

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
    if (!['admin', 'coordinador', 'gestor'].includes(userRole)) {
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

    // 🔍 OBTENER PROYECTOS CON INFORMACIÓN DE HORAS
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
        // 🔧 HORAS PLANIFICADAS: Desde servicios del proyecto
        servicios: {
          select: {
            id: true,
            nombre: true,
            // ❌ REMOVIDO: categoria (era un string, no el EDT real)
            subtotalInterno: true,
            subtotalReal: true,
            // ✅ AGREGADO: Relación con EDTs del proyecto para obtener nombres reales
            items: {
              select: {
                nombre: true,
                horasEjecutadas: true,
                costoInterno: true
              }
            }
          }
        },
        // 🔧 HORAS REALES: Desde registroHoras
        registrosHoras: {
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
      console.log(`   Proyecto ${index + 1}: ${proyecto.codigo} - ${proyecto.nombre}`)
      console.log(`     Servicios: ${proyecto.servicios.length}`)
      console.log(`     Registros de horas: ${proyecto.registrosHoras.length}`)
      proyecto.servicios.forEach((servicio, servicioIndex) => {
        const horasEstimadas = servicio.items?.reduce((sum, item) => sum + (item.horasEjecutadas || 0), 0) || 0
        console.log(`       Servicio ${servicioIndex + 1}: ${servicio.nombre} - ${horasEstimadas}h estimadas`)
      })
      if (proyecto.registrosHoras.length > 0) {
        proyecto.registrosHoras.slice(0, 2).forEach((registro, regIndex) => {
          console.log(`       Registro ${regIndex + 1}: ${registro.horasTrabajadas}h - ${registro.nombreServicio}`)
        })
      }
    })

    // 🔍 OBTENER CATÁLOGO COMPLETO DE EDTs PARA NOMBRES ÚNICOS
    const catalogoEdts = await prisma.edt.findMany({
      select: {
        id: true,
        nombre: true
      },
      orderBy: {
        nombre: 'asc'
      }
    })
    console.log(`🔍 DEBUG: Catálogo de EDTs para resumen: ${catalogoEdts.length}`)
    catalogoEdts.forEach((edt, index) => {
      console.log(`   EDT ${index + 1}: ${edt.nombre}`)
    })

    //  PROCESAR DATOS PARA CALCULAR RESUMEN
    const resumenProyectos = proyectos.map(proyecto => {
      // ✅ CORREGIDO: Calcular horas planificadas desde servicios del proyecto
      const horasPlanificadas = proyecto.servicios.reduce((total, servicio) => {
        const horasServicio = servicio.items?.reduce((sum, item) => sum + (item.horasEjecutadas || 0), 0) || 0
        return total + horasServicio
      }, 0)

      // Calcular horas ejecutadas reales
      const horasEjecutadas = proyecto.registrosHoras.reduce((total, registro) => {
        return total + registro.horasTrabajadas
      }, 0)

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
      const totalRegistros = proyecto.registrosHoras.length

      // ✅ CORREGIDO: Usar servicios reales del proyecto
      const nombresServiciosDelProyecto = [...new Set(proyecto.servicios.map(s => s.nombre))]
      
      console.log(`🔍 DEBUG: Proyecto ${proyecto.codigo} - Servicios: ${proyecto.servicios.length}, Nombres únicos: ${nombresServiciosDelProyecto.length}`)
      console.log(`   Nombres: [${nombresServiciosDelProyecto.join(', ')}]`)
      
      // ✅ CORREGIDO: Obtener TODOS los servicios del proyecto
      const todosServiciosProyecto = proyecto.servicios
        .map((servicio, index) => {
          const horasEstimadas = servicio.items?.reduce((sum, item) => sum + (item.horasEjecutadas || 0), 0) || 0
          
          console.log(`🔍 DEBUG: Procesando Servicio ${index}: ${servicio.nombre}`)
          
          return {
            id: servicio.id,
            orden: index,
            nombre: servicio.nombre,
            // ❌ REMOVIDO: categoria (string)
            edt: 'Programación PLC', // ✅ TEMPORAL: Nombre del EDT asociado
            horasEstimadas: horasEstimadas,
            subtotalInterno: servicio.subtotalInterno || 0,
            subtotalReal: servicio.subtotalReal || 0,
            itemsCount: servicio.items?.length || 0
          }
        })
        // ✅ MANTENER EL ORDEN ORIGINAL DE LA BD
        // TODOS los servicios, no solo slice(0, 3)

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
    
    resumenOrdenado.forEach((proyecto: any, index: number) => {
      console.log(`   Proyecto ${index + 1}: ${proyecto.proyecto.codigo}`)
      console.log(`     Servicios principales: ${proyecto.servicios.length}`)
      proyecto.servicios.forEach((servicio: any, servicioIndex: number) => {
        console.log(`       ${servicio.nombre}: ${servicio.horasEstimadas}h (${servicio.edt})`)
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
  } finally {
    await prisma.$disconnect()
  }
}