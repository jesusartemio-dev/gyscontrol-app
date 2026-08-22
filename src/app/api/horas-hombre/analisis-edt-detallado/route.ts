/**
 * API para análisis EDT detallado - Comparación Cotizado vs Planificado vs Ejecutado
 * 
 * Vista granular que muestra por cada EDT:
 * - Horas cotizadas (vendidas en cotización)
 * - Horas planificadas (en cronograma del proyecto)
 * - Horas ejecutadas (realmente trabajadas)
 * - Desviaciones y análisis presupuestario
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
      console.log('❌ Análisis EDT: No hay sesión válida')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos (admin, coordinador, gestor)
    const userRole = session.user.role
    if (!tieneRol(session, ['admin', 'coordinador', 'gestor'])) {
      console.log('❌ Análisis EDT: Sin permisos suficientes', { role: userRole })
      return NextResponse.json(
        { error: 'Permisos insuficientes. Se requiere rol de administrador, coordinador o gestor' },
        { status: 403 }
      )
    }

    console.log('✅ Análisis EDT: Acceso autorizado', {
      userId: session.user.id,
      role: userRole
    })

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const estadoFiltro = searchParams.get('estado') as ProyectoEstado | null

    // 🔍 OBTENER PROYECTOS CON ANÁLISIS EDT DETALLADO
    const proyectos = await prisma.proyecto.findMany({
      where: {
        ...(proyectoId && { id: proyectoId }),
        ...(estadoFiltro && { estado: estadoFiltro })
      },
      include: {
        cliente: {
          select: {
            nombre: true
          }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        // 🔧 HORAS PLANIFICADAS: Desde EDT del cronograma (incluir todos)
        proyectoEdt: {
          include: {
            edt: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 🔧 HORAS REALES: Desde registroHoras agrupadas por EDT
            registroHoras: {
              select: {
                horasTrabajadas: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
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
    console.log(`🔍 DEBUG: Catálogo de EDTs disponibles: ${catalogoEdts.length}`)
    catalogoEdts.forEach((edt, index) => {
      console.log(`   EDT ${index + 1}: ${edt.nombre} (ID: ${edt.id})`)
    })
    
    // 🔍 DEBUG: Proyectos con EDTs
    const proyectosConEdts = await prisma.proyecto.findMany({
      where: {
        proyectoEdt: {
          some: {}
        }
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        proyectoEdt: {
          select: {
            id: true
          }
        }
      }
    })
    console.log(`🔍 DEBUG: Proyectos con EDTs: ${proyectosConEdts.length}`)
    proyectosConEdts.forEach((proyecto, index) => {
      console.log(`   Proyecto con EDTs ${index + 1}: ${proyecto.codigo} - ${proyecto.nombre} (${proyecto.proyectoEdt.length} EDTs)`)
    })

    // DEBUG: Log de proyectos y sus EDTs
    console.log(`🔍 DEBUG: Proyectos encontrados: ${proyectos.length}`)
    proyectos.forEach((proyecto, index) => {
      console.log(`   Proyecto ${index + 1}: ${proyecto.codigo} - ${proyecto.nombre}`)
      console.log(`   EDTs en proyecto: ${proyecto.proyectoEdt.length}`)
      proyecto.proyectoEdt.forEach((edt, edtIndex) => {
        console.log(`     EDT ${edtIndex + 1}: ${edt.edt.nombre} (ID: ${edt.id})`)
      })
    })

    console.log(`✅ Encontrados ${proyectos.length} proyectos para análisis EDT`)

    // 🔍 OBTENER HORAS COTIZADAS POR EDT
    const horasCotizadasMap = new Map<string, number>()
    
    for (const proyecto of proyectos) {
      if (proyecto.cotizacionId) {
        // Obtener horas cotizadas desde la cotización
        const cotizacionData = await prisma.cotizacion.findUnique({
          where: { id: proyecto.cotizacionId },
          include: {
            cotizacionServicio: {
              include: {
                cotizacionServicioItem: {
                  select: {
                    edtId: true,
                    horaTotal: true
                  }
                }
              }
            }
          }
        })

        if (cotizacionData) {
          // Agrupar horas cotizadas por EDT (edtId)
          for (const servicio of cotizacionData.cotizacionServicio) {
            for (const item of servicio.cotizacionServicioItem) {
              const edtNombre = item.edtId
              const horasCotizadas = parseFloat(item.horaTotal?.toString() || '0')

              const key = `${proyecto.id}_${edtNombre}`
              horasCotizadasMap.set(key, horasCotizadas)
            }
          }
        }
      }
    }

    // 🔢 PROCESAR DATOS PARA CADA PROYECTO Y EDT
    const analisisProyectos = []

    console.log(`🔍 DEBUG: Iniciando procesamiento de ${proyectos.length} proyectos`)

    for (const proyecto of proyectos) {
      const analisisEdts = []
      
      console.log(`🔍 DEBUG: Procesando proyecto ${proyecto.codigo} - EDTs encontrados: ${proyecto.proyectoEdt.length}`)

      for (const proyectoEdt of proyecto.proyectoEdt) {
        console.log(`   🔍 DEBUG: Procesando EDT: ${proyectoEdt.edt.nombre} (ID: ${proyectoEdt.id})`)
        
        // 🔧 ASIGNAR NOMBRES ÚNICOS BASADOS EN EL CATÁLOGO COMPLETO
        let edtNombre = proyectoEdt.edt.nombre
        
        // Obtener nombres únicos de EDTs del proyecto
        const nombresEdtsDelProyecto = [...new Set(proyecto.proyectoEdt.map(pe => pe.edt.nombre))]
        
        // Si hay nombres duplicados (como múltiples "GES"), usar el catálogo para asignar nombres únicos
        if (nombresEdtsDelProyecto.length === 1 && nombresEdtsDelProyecto[0] === 'GES' && catalogoEdts.length > 0) {
          const indexEnProyecto = proyecto.proyectoEdt.findIndex(pe => pe.id === proyectoEdt.id)
          
          // Asignar nombres del catálogo basándose en el orden del proyecto
          if (indexEnProyecto < catalogoEdts.length) {
            edtNombre = catalogoEdts[indexEnProyecto].nombre
          } else {
            // Si hay más EDTs en el proyecto que en el catálogo, usar un patrón simple
            const sufijoExtra = indexEnProyecto - catalogoEdts.length + 1
            edtNombre = `EDT-${sufijoExtra + catalogoEdts.length}`
          }
        }
        
        const proyectoEdtId = proyectoEdt.id

        // 🔧 1. HORAS COTIZADAS
        const keyCotizado = `${proyecto.id}_${edtNombre}`
        const horasCotizadas = horasCotizadasMap.get(keyCotizado) || 0

        // 🔧 2. HORAS PLANIFICADAS
        const horasPlanificadas = parseFloat(proyectoEdt.horasPlan?.toString() || '0')

        // 🔧 3. HORAS EJECUTADAS
        const horasEjecutadas = proyectoEdt.registroHoras.reduce((total, registro) => {
          return total + registro.horasTrabajadas
        }, 0)

        // 🔢 CALCULAR DESVIACIONES
        const desviacionPlanVsCotizado = horasPlanificadas - horasCotizadas
        const desviacionEjecVsCotizado = horasEjecutadas - horasCotizadas
        const desviacionEjecVsPlan = horasEjecutadas - horasPlanificadas

        // 📊 CALCULAR PORCENTAJES
        const porcentajeEjecVsCotizado = horasCotizadas > 0 
          ? Math.round((horasEjecutadas / horasCotizadas) * 100 * 10) / 10 
          : 0

        const porcentajeEjecVsPlan = horasPlanificadas > 0 
          ? Math.round((horasEjecutadas / horasPlanificadas) * 100 * 10) / 10 
          : 0

        // 🎯 DETERMINAR ESTADO
        let estado: 'en_presupuesto' | 'sobre_cotizado' | 'sub_cotizado' | 'sin_cotizacion' = 'sin_cotizacion'
        if (horasCotizadas > 0) {
          if (horasEjecutadas <= horasCotizadas) {
            estado = 'en_presupuesto'
          } else {
            estado = 'sobre_cotizado'
          }
        }

        // Si hay planificación pero no cotización
        if (horasCotizadas === 0 && horasPlanificadas > 0) {
          estado = 'sub_cotizado'
        }

        analisisEdts.push({
          edt: {
            id: proyectoEdtId,
            nombre: edtNombre,
            proyectoEdtId: proyectoEdtId
          },
          horas: {
            cotizadas: Math.round(horasCotizadas * 10) / 10,
            planificadas: Math.round(horasPlanificadas * 10) / 10,
            ejecutadas: Math.round(horasEjecutadas * 10) / 10
          },
          desviaciones: {
            planVsCotizado: Math.round(desviacionPlanVsCotizado * 10) / 10,
            ejecVsCotizado: Math.round(desviacionEjecVsCotizado * 10) / 10,
            ejecVsPlan: Math.round(desviacionEjecVsPlan * 10) / 10
          },
          porcentajes: {
            ejecVsCotizado: porcentajeEjecVsCotizado,
            ejecVsPlan: porcentajeEjecVsPlan
          },
          estado
        })
      }
      
      console.log(`✅ DEBUG: Proyecto ${proyecto.codigo} procesado - EDTs analizados: ${analisisEdts.length}`)

      // 🔢 CALCULAR TOTALES DEL PROYECTO
      const totalesProyecto = analisisEdts.reduce((total, edt) => {
        total.cotizadas += edt.horas.cotizadas
        total.planificadas += edt.horas.planificadas
        total.ejecutadas += edt.horas.ejecutadas
        return total
      }, { cotizadas: 0, planificadas: 0, ejecutadas: 0 })

      analisisProyectos.push({
        proyecto: {
          id: proyecto.id,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          cliente: proyecto.cliente?.nombre || 'Sin cliente',
          estado: proyecto.estado,
          cotizacion: proyecto.cotizacion ? {
            codigo: proyecto.cotizacion.codigo,
            nombre: proyecto.cotizacion.nombre
          } : null
        },
        edts: analisisEdts,
        totales: {
          cotizadas: Math.round(totalesProyecto.cotizadas * 10) / 10,
          planificadas: Math.round(totalesProyecto.planificadas * 10) / 10,
          ejecutadas: Math.round(totalesProyecto.ejecutadas * 10) / 10
        }
      })
    }

    // 🔢 CALCULAR MÉTRICAS GENERALES
    const totalGeneral = analisisProyectos.reduce((total, proyecto) => {
      total.cotizadas += proyecto.totales.cotizadas
      total.planificadas += proyecto.totales.planificadas
      total.ejecutadas += proyecto.totales.ejecutadas
      return total
    }, { cotizadas: 0, planificadas: 0, ejecutadas: 0 })

    // Contar EDTs por estado
    let edtsEnPresupuesto = 0
    let edtsSobreCotizados = 0
    let edtsSubCotizados = 0
    let edtsSinCotizacion = 0

    analisisProyectos.forEach(proyecto => {
      proyecto.edts.forEach(edt => {
        switch (edt.estado) {
          case 'en_presupuesto': edtsEnPresupuesto++; break
          case 'sobre_cotizado': edtsSobreCotizados++; break
          case 'sub_cotizado': edtsSubCotizados++; break
          case 'sin_cotizacion': edtsSinCotizacion++; break
        }
      })
    })

    console.log(`📊 Análisis EDT calculado:`)
    console.log(`   Total proyectos: ${analisisProyectos.length}`)
    console.log(`   Total EDTs: ${analisisProyectos.reduce((total, p) => total + p.edts.length, 0)}`)
    console.log(`   Total cotizadas: ${totalGeneral.cotizadas}h`)
    console.log(`   Total planificadas: ${totalGeneral.planificadas}h`)
    console.log(`   Total ejecutadas: ${totalGeneral.ejecutadas}h`)
    console.log(`   EDTs en presupuesto: ${edtsEnPresupuesto}`)
    console.log(`   EDTs sobre cotizados: ${edtsSobreCotizados}`)

    return NextResponse.json({
      success: true,
      data: {
        resumenGeneral: {
          totalProyectos: analisisProyectos.length,
          totalEdts: analisisProyectos.reduce((total, p) => total + p.edts.length, 0),
          horasTotales: {
            cotizadas: Math.round(totalGeneral.cotizadas * 10) / 10,
            planificadas: Math.round(totalGeneral.planificadas * 10) / 10,
            ejecutadas: Math.round(totalGeneral.ejecutadas * 10) / 10
          },
          edtsPorEstado: {
            en_presupuesto: edtsEnPresupuesto,
            sobre_cotizado: edtsSobreCotizados,
            sub_cotizado: edtsSubCotizados,
            sin_cotizacion: edtsSinCotizacion
          }
        },
        proyectos: analisisProyectos,
        metadata: {
          fechaConsulta: new Date().toISOString(),
          filtrosAplicados: {
            proyectoId: proyectoId || 'todos',
            estado: estadoFiltro || 'todos'
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en análisis EDT:', error)
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