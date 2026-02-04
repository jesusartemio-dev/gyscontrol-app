/**
 * API para supervisión de horas-hombre del proyecto
 *
 * Acceso para administradores/gestores para ver todas las horas
 * registradas en un proyecto por todo el equipo de trabajo.
 *
 * Parámetros:
 * - proyectoId: ID del proyecto a supervisar (OPCIONAL - si no se proporciona, muestra todos los proyectos)
 * - semana: Semana ISO (ej: 2025-W03) - opcional
 * - fechaInicio, fechaFin: Rango de fechas - opcional
 */

import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión y permisos
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ Supervisión proyecto: No hay sesión válida')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos (admin, coordinador, gestor)
    const userRole = session.user.role
    if (!['admin', 'coordinador', 'gestor'].includes(userRole)) {
      console.log('❌ Supervisión proyecto: Sin permisos suficientes', { role: userRole })
      return NextResponse.json(
        { error: 'Permisos insuficientes. Se requiere rol de administrador, coordinador o gestor' },
        { status: 403 }
      )
    }

    console.log('✅ Supervisión proyecto: Acceso autorizado', {
      userId: session.user.id,
      role: userRole
    })

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const semanaISO = searchParams.get('semana')
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    // 🔧 MEJORA: proyectoId es OPCIONAL - si no se proporciona, obtener todos los proyectos
    let proyecto = null
    let todosProyectos = false

    if (proyectoId) {
      // Verificar que el proyecto específico existe
      proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true,
          codigo: true,
          cliente: { select: { nombre: true } },
          estado: true
        }
      })

      if (!proyecto) {
        return NextResponse.json(
          { error: 'Proyecto no encontrado' },
          { status: 404 }
        )
      }
    } else {
      // Modo "todos los proyectos" - obtener información consolidada
      todosProyectos = true
      proyecto = {
        id: 'todos',
        nombre: 'Todos los Proyectos',
        codigo: 'CONSOLIDADO',
        cliente: 'Consolidado',
        estado: 'todos'
      }
    }

    console.log(`🔍 ${todosProyectos ? 'Consultando TODOS los proyectos' : `Consultando horas del proyecto: ${proyecto.codigo} - ${proyecto.nombre}`}`)

    // Determinar rango de fechas
    let inicioPeriodo: Date
    let finPeriodo: Date

    if (fechaInicio && fechaFin) {
      inicioPeriodo = new Date(fechaInicio)
      finPeriodo = new Date(fechaFin)
    } else if (semanaISO) {
      const [year, week] = semanaISO.split('-W').map(Number)
      const fechaReferencia = new Date(year, 0, 1 + (week - 1) * 7)
      inicioPeriodo = startOfWeek(fechaReferencia, { weekStartsOn: 1 })
      finPeriodo = endOfWeek(fechaReferencia, { weekStartsOn: 1 })
    } else {
      // Usar semana actual por defecto
      const hoy = new Date()
      inicioPeriodo = startOfWeek(hoy, { weekStartsOn: 1 })
      finPeriodo = endOfWeek(hoy, { weekStartsOn: 1 })
    }

    console.log(`📅 Rango de consulta: ${format(inicioPeriodo, 'yyyy-MM-dd')} a ${format(finPeriodo, 'yyyy-MM-dd')}`)

    // 1. CONSULTA PRINCIPAL: Todas las horas del proyecto (sin filtro de usuario)
    const registrosHoras = await prisma.registroHoras.findMany({
      where: {
        // 🔧 Solo filtrar por proyectoId si se especifica (no null)
        ...(proyectoId && { proyectoId: proyectoId }),
        fechaTrabajo: {
          gte: inicioPeriodo,
          lte: finPeriodo
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
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
        },
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            cliente: { select: { nombre: true } }
          }
        }
      },
      orderBy: [
        { fechaTrabajo: 'asc' },
        { usuarioId: 'asc' }
      ]
    })

    console.log(`✅ Encontradas ${registrosHoras.length} horas del proyecto en el período`)

    // 2. PROCESAR DATOS POR DÍA Y USUARIO
    const diasSemana = []
    let totalHorasProyecto = 0
    let usuariosActivos = new Set()

    for (let i = 0; i < 7; i++) {
      const fechaDia = addDays(inicioPeriodo, i)
      
      // Filtrar registros para este día específico
      const registrosDia = registrosHoras.filter(registro => {
        const fechaRegistro = new Date(registro.fechaTrabajo)
        return format(fechaRegistro, 'yyyy-MM-dd') === format(fechaDia, 'yyyy-MM-dd')
      })

      // Calcular total de horas del día
      const totalHorasDia = registrosDia.reduce((sum, registro) => {
        usuariosActivos.add(registro.usuarioId)
        return sum + registro.horasTrabajadas
      }, 0)
      
      totalHorasProyecto += totalHorasDia

      // Formatear registros para el frontend
      const registrosFormateados = registrosDia.map(registro => {
        // Extraer solo el código del proyecto
        const codigoProyecto = `${proyecto.codigo} - ${proyecto.nombre}`
        const getTextoJerarquico = () => {
          let texto = proyecto.codigo

          // ✅ Usar proyectoEdt.nombre primero, luego edt.nombre como fallback
          const edtNombre = registro.proyectoEdt?.nombre || registro.edt?.nombre
          if (edtNombre && edtNombre !== 'Sin EDT') {
            texto += `-"${edtNombre}"`
          }
          
          if (registro.proyectoTarea?.proyectoActividad?.nombre) {
            texto += `-"${registro.proyectoTarea.proyectoActividad.nombre}"`
          }
          
          if (registro.proyectoTarea?.nombre) {
            texto += `:${registro.proyectoTarea.nombre}`
          }
          
          return texto
        }

        return {
          id: registro.id,
          horas: registro.horasTrabajadas,
          descripcion: registro.descripcion || registro.observaciones || 'Sin descripción',
          proyectoNombre: codigoProyecto,
          textoJerarquico: getTextoJerarquico(),
          usuario: {
            id: registro.user.id,
            nombre: registro.user.name || registro.user.email,
            email: registro.user.email
          },
          recursoNombre: registro.recurso?.nombre || 'Sin recurso',
          tareaTipo: 'registro',
          aprobado: registro.aprobado,
          fecha: registro.fechaTrabajo
        }
      })

      diasSemana.push({
        fecha: fechaDia,
        fechaString: format(fechaDia, 'yyyy-MM-dd'),
        diaNombre: format(fechaDia, 'EEEE', { locale: es }),
        totalHoras: Math.round(totalHorasDia * 10) / 10,
        registros: registrosFormateados
      })
    }

    // 3. RESUMEN POR USUARIO
    const usuariosMap = new Map()
    
    registrosHoras.forEach(registro => {
      const usuarioId = registro.user.id
      const usuarioNombre = registro.user.name || registro.user.email
      
      if (!usuariosMap.has(usuarioId)) {
        usuariosMap.set(usuarioId, {
          usuarioId,
          nombre: usuarioNombre,
          email: registro.user.email,
          horas: 0,
          registros: 0,
          diasActivos: new Set()
        })
      }
      
      const usuario = usuariosMap.get(usuarioId)
      usuario.horas += registro.horasTrabajadas
      usuario.registros += 1
      usuario.diasActivos.add(format(new Date(registro.fechaTrabajo), 'yyyy-MM-dd'))
    })

    const resumenUsuarios = Array.from(usuariosMap.values()).map(usuario => ({
      ...usuario,
      horas: Math.round(usuario.horas * 10) / 10,
      diasActivos: usuario.diasActivos.size
    })).sort((a, b) => b.horas - a.horas)

    // 4. MÉTRICAS DEL PROYECTO
    const promedioDiario = Math.round((totalHorasProyecto / 7) * 10) / 10
    const promedioPorUsuario = usuariosActivos.size > 0 ? Math.round((totalHorasProyecto / usuariosActivos.size) * 10) / 10 : 0

    const resumenProyecto = {
      proyecto: {
        id: proyecto.id,
        codigo: proyecto.codigo,
        nombre: proyecto.nombre,
        cliente: typeof proyecto.cliente === 'string' ? proyecto.cliente : (proyecto.cliente?.nombre || 'Sin cliente'),
        estado: proyecto.estado
      },
      periodo: {
        inicio: format(inicioPeriodo, 'yyyy-MM-dd'),
        fin: format(finPeriodo, 'yyyy-MM-dd'),
        semana: semanaISO || 'N/A'
      },
      metricas: {
        totalHoras: Math.round(totalHorasProyecto * 10) / 10,
        usuariosActivos: usuariosActivos.size,
        promedioDiario,
        promedioPorUsuario,
        totalRegistros: registrosHoras.length
      }
    }

    console.log(`📊 Resumen proyecto: ${totalHorasProyecto}h totales, ${usuariosActivos.size} usuarios, ${resumenUsuarios.length} colaboradores`)

    return NextResponse.json({
      success: true,
      data: {
        resumenProyecto,
        diasSemana,
        resumenUsuarios,
        metadata: {
          totalRegistros: registrosHoras.length,
          fechaConsulta: new Date().toISOString(),
          rangoBusqueda: {
            inicio: format(inicioPeriodo, 'yyyy-MM-dd'),
            fin: format(finPeriodo, 'yyyy-MM-dd')
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error supervisando horas del proyecto:', error)
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