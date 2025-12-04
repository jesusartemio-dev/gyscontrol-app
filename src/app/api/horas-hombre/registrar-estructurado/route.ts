/**
 * API de Registro de Horas Estructurado - Unificado con EDTs
 * 
 * Reemplaza la API de registro simple por una que garantiza:
 * - Registro de horas por EDT específico
 * - Sincronización automática con servicios del proyecto
 * - Trazabilidad completa para análisis de costos
 * - Cumplimiento de requerimientos de análisis transversal
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

const registrarHorasEstructuradoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.number().positive(),
  descripcion: z.string().min(1),
  proyectoId: z.string(),
  proyectoEdtId: z.string(),
  proyectoTareaId: z.string().optional(),
  proyectoActividadId: z.string().optional(),
  recursoId: z.string().optional(),
  observaciones: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = registrarHorasEstructuradoSchema.parse(body)

    const { 
      fecha, 
      horas, 
      descripcion, 
      proyectoId, 
      proyectoEdtId, 
      proyectoTareaId, 
      proyectoActividadId,
      recursoId,
      observaciones 
    } = validatedData

    // Verificar que el proyecto existe y el usuario tiene acceso
    const proyecto = await prisma.proyecto.findFirst({
      where: {
        id: proyectoId,
        OR: [
          { comercialId: session.user.id },
          { gestorId: session.user.id },
          { 
            proyectoEdts: { 
              some: { 
                id: proyectoEdtId,
                responsableId: session.user.id 
              } 
            } 
          }
        ]
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        servicios: {
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
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado o sin acceso' },
        { status: 404 }
      )
    }

    // Verificar que el EDT existe y pertenece al proyecto
    const proyectoEdt = await prisma.proyectoEdt.findFirst({
      where: {
        id: proyectoEdtId,
        proyectoId: proyectoId
      },
      select: {
        id: true,
        nombre: true,
        categoriaServicioId: true,
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        estado: true
      }
    })

    if (!proyectoEdt) {
      return NextResponse.json(
        { error: 'EDT no encontrado en el proyecto' },
        { status: 404 }
      )
    }

    // Si se proporciona actividad o tarea, verificar que pertenece al EDT
    if (proyectoTareaId || proyectoActividadId) {
      const elementoValido = await prisma.proyectoTarea.findFirst({
        where: {
          id: proyectoTareaId || undefined,
          proyectoEdtId: proyectoEdtId
        }
      })

      if (proyectoTareaId && !elementoValido) {
        return NextResponse.json(
          { error: 'La tarea especificada no pertenece al EDT seleccionado' },
          { status: 400 }
        )
      }
    }

    // Buscar servicio relacionado con el EDT
    const servicioRelacionado = proyecto.servicios.find(servicio =>
      servicio.edt?.nombre === proyectoEdt.categoriaServicio?.nombre
    )

    if (!servicioRelacionado) {
      return NextResponse.json(
        { error: `No se encontró servicio relacionado con el EDT ${proyectoEdt.categoriaServicio?.nombre}` },
        { status: 400 }
      )
    }

    // Obtener recurso (usar el proporcionado o el primero disponible)
    let recursoSeleccionado
    if (recursoId) {
      recursoSeleccionado = await prisma.recurso.findUnique({
        where: { id: recursoId },
        select: { id: true, nombre: true, costoHora: true }
      })
    } else {
      recursoSeleccionado = await prisma.recurso.findFirst({
        select: { id: true, nombre: true, costoHora: true }
      })
    }

    if (!recursoSeleccionado) {
      return NextResponse.json(
        { error: 'No se encontró recurso disponible' },
        { status: 404 }
      )
    }

    // Crear registro de horas estructurado
    const registroHoras = await prisma.registroHoras.create({
      data: {
        proyectoId,
        proyectoServicioId: servicioRelacionado.id, // Vincular con servicio real
        categoria: proyectoEdt.categoriaServicio?.nombre || 'general',
        nombreServicio: servicioRelacionado.nombre,
        recursoId: recursoSeleccionado.id,
        recursoNombre: recursoSeleccionado.nombre,
        usuarioId: session.user.id,
        fechaTrabajo: new Date(fecha),
        horasTrabajadas: horas,
        descripcion,
        observaciones: observaciones || null,
        proyectoEdtId: proyectoEdtId, // Vincular con EDT específico
        proyectoTareaId: proyectoTareaId || null,
        categoriaServicioId: proyectoEdt.categoriaServicioId, // Para análisis transversal
        origen: 'oficina',
        aprobado: false
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        categoriaServicioRef: {
          select: {
            id: true,
            nombre: true
          }
        },
        recurso: {
          select: {
            id: true,
            nombre: true,
            costoHora: true
          }
        }
      }
    })

    // Actualizar horas reales del EDT
    await prisma.proyectoEdt.update({
      where: { id: proyectoEdtId },
      data: {
        horasReales: {
          increment: horas
        }
      }
    })

    // Calcular costo total del registro
    const costoTotal = horas * recursoSeleccionado.costoHora

    return NextResponse.json({
      success: true,
      message: `Se registraron ${horas}h en ${proyectoEdt.categoriaServicio?.nombre} - ${proyecto.codigo}`,
      data: {
        id: registroHoras.id,
        horasRegistradas: horas,
        costoCalculado: costoTotal,
        proyecto: {
          id: proyecto.id,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo
        },
        edt: {
          id: proyectoEdt.id,
          categoria: proyectoEdt.categoriaServicio?.nombre,
          nombre: proyectoEdt.nombre
        },
        servicio: {
          id: servicioRelacionado.id,
          nombre: servicioRelacionado.nombre
        },
        recurso: {
          id: recursoSeleccionado.id,
          nombre: recursoSeleccionado.nombre,
          costoHora: recursoSeleccionado.costoHora
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error registrando horas estructurado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtener resumen de registros por EDT
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const edtId = searchParams.get('edtId')
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    const whereClause: any = {
      usuarioId: session.user.id
    }

    if (proyectoId) {
      whereClause.proyectoId = proyectoId
    }

    if (edtId) {
      whereClause.proyectoEdtId = edtId
    }

    if (fechaInicio || fechaFin) {
      whereClause.fechaTrabajo = {}
      if (fechaInicio) {
        whereClause.fechaTrabajo.gte = new Date(fechaInicio)
      }
      if (fechaFin) {
        whereClause.fechaTrabajo.lte = new Date(fechaFin)
      }
    }

        const registros = await prisma.registroHoras.findMany({
          where: whereClause,
          include: {
            proyecto: {
              select: {
                id: true,
                nombre: true,
                codigo: true
              }
            },
            categoriaServicioRef: {
              select: {
                id: true,
                nombre: true
              }
            },
            recurso: {
              select: {
                id: true,
                nombre: true,
                costoHora: true
              }
            }
          },
          orderBy: {
            fechaTrabajo: 'desc'
          }
        })

        // Calcular resumen por EDT
        const resumenPorEdt = registros.reduce((acc, registro) => {
          const categoria = registro.categoriaServicioRef?.nombre || 'Sin categoría'
          if (!acc[categoria]) {
            acc[categoria] = {
              categoria: categoria,
              totalHoras: 0,
              totalCosto: 0,
              registros: 0
            }
          }
          
          const costoHora = registro.recurso?.costoHora || 0
          const horas = Number(registro.horasTrabajadas) || 0
          
          acc[categoria].totalHoras += horas
          acc[categoria].totalCosto += horas * costoHora
          acc[categoria].registros += 1
          
          return acc
        }, {} as Record<string, any>)

        return NextResponse.json({
          success: true,
          data: {
            registros: registros.map(r => ({
              id: r.id,
              fecha: r.fechaTrabajo,
              horas: r.horasTrabajadas,
              descripcion: r.descripcion,
              observaciones: r.observaciones,
              costo: r.horasTrabajadas * (r.recurso?.costoHora || 0),
              proyecto: r.proyecto,
              categoria: r.categoriaServicioRef?.nombre,
              recurso: r.recurso
            })),
            resumen: Object.values(resumenPorEdt)
          }
        })

  } catch (error) {
    console.error('Error obteniendo registros:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}