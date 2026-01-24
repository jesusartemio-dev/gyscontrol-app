/**
 * API para registro de horas hombre
 *
 * Permite registrar, actualizar y eliminar horas trabajadas
 * Compatibilidad con el componente TimesheetSemanal
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const registrarHorasSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.number().positive(),
  descripcion: z.string().min(1),
  proyectoId: z.string(),
  edtId: z.string().optional(),
  tareaId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ POST registrar: No hay sesión válida', { session })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ POST registrar: Sesión válida', {
      userId: session.user.id,
      email: session.user.email
    })

    const body = await request.json()
    const validatedData = registrarHorasSchema.parse(body)

const { fecha, horas, descripcion, proyectoId, edtId, tareaId } = validatedData

    console.log('📝 POST registrar: Datos originales', {
      fecha_original: fecha,
      tipo_fecha: typeof fecha
    })
    
    // Corregir problema de timezone
    const fechaCorregida = new Date(fecha + 'T12:00:00.000Z') // Forzar al mediodía UTC
    console.log('📝 POST registrar: Fecha corregida', {
      fecha_original: fecha,
      fecha_corregida: fechaCorregida,
      fecha_corregida_local: fechaCorregida.toLocaleString('es-CO'),
      timestamp: fechaCorregida.getTime()
    })

    console.log('📝 POST registrar: Datos validados', {
      fecha, horas, descripcion, proyectoId, edtId, tareaId
    })

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      console.log('❌ POST registrar: Proyecto no encontrado', { proyectoId })
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ POST registrar: Proyecto encontrado', { proyecto })

    // Buscar un servicio del proyecto para asociar
    let proyectoServicio = null
    if (edtId) {
      // Buscar el EDT para obtener su categoría
      const edtInfo = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        select: { nombre: true }
      })

      // Buscar servicios del proyecto que coincidan con el nombre del EDT
      if (edtInfo) {
        proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
          where: {
            proyectoId,
            categoria: edtInfo.nombre
          },
          select: { id: true, nombre: true }
        })
      }
    }
    
    // Si no se encontró servicio por categoría, usar el primero disponible
    if (!proyectoServicio) {
      proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
        where: { proyectoId },
        select: { id: true, nombre: true }
      })
    }

    if (!proyectoServicio) {
      console.log('❌ POST registrar: No se encontró servicio del proyecto', { proyectoId })
      return NextResponse.json(
        { error: 'No se encontró un servicio asociado al proyecto' },
        { status: 404 }
      )
    }

    console.log('✅ POST registrar: Servicio encontrado', { proyectoServicio })

    // Buscar un recurso disponible o usar el primero disponible
    const recurso = await prisma.recurso.findFirst({
      select: { id: true, nombre: true }
    })

    if (!recurso) {
      console.log('❌ POST registrar: No hay recursos disponibles')
      return NextResponse.json(
        { error: 'No hay recursos disponibles en el sistema' },
        { status: 404 }
      )
    }

    console.log('✅ POST registrar: Recurso encontrado', { recurso })

    // Si hay un EDT seleccionado, obtener su categoría del catálogo
    let edtCatalogoId: string | null = null
    if (edtId) {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        select: { edtId: true }
      })
      edtCatalogoId = edt?.edtId || null
    }

    try {
      // Crear registro de horas
      const registroHoras = await prisma.registroHoras.create({
        data: {
          id: `reg-hrs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId,
          proyectoServicioId: proyectoServicio.id,
          categoria: 'general',
          nombreServicio: proyectoServicio.nombre,
          recursoId: recurso.id,
          recursoNombre: recurso.nombre,
          usuarioId: session.user.id,
          fechaTrabajo: fechaCorregida, // ✅ CORRECCIÓN DE TIMEZONE APLICADA
          horasTrabajadas: horas,
          descripcion,
          proyectoEdtId: edtId || null,
          proyectoTareaId: tareaId || null,
          edtId: edtCatalogoId || null,
          origen: 'oficina',
          updatedAt: new Date()
        },
        include: {
          proyecto: {
            select: {
              nombre: true
            }
          }
        }
      })

      console.log('✅ POST registrar: Registro creado exitosamente', { registroHoras })

      return NextResponse.json({
        success: true,
        message: `Se registraron ${horas}h en ${proyecto.nombre}`,
        data: {
          id: registroHoras.id,
          horasRegistradas: horas,
          proyecto: proyecto.nombre
        }
      })
    } catch (dbError) {
      console.error('❌ POST registrar: Error de base de datos completo:', dbError)
      console.error('❌ POST registrar: Stack trace:', dbError instanceof Error ? dbError.stack : 'No stack')
      
      // Extraer información más detallada del error
      let errorDetails = {
        message: 'Unknown error',
        code: 'UNKNOWN_ERROR',
        field: 'unknown',
        originalMessage: ''
      }
      
      if (dbError instanceof Error) {
        const errorMessage = dbError.message
        errorDetails.originalMessage = errorMessage
        
        console.log('🔍 DEBUG: Error message contains:', {
          contains_proyectoEdtId: errorMessage.includes('proyectoEdtId'),
          contains_proyectoServicioId: errorMessage.includes('proyectoServicioId'),
          contains_edtId: errorMessage.includes('edtId'),
          contains_proyectoTareaId: errorMessage.includes('proyectoTareaId'),
          contains_recursoId: errorMessage.includes('recursoId'),
          contains_usuarioId: errorMessage.includes('usuarioId'),
          contains_Foreign: errorMessage.includes('Foreign key'),
          contains_constraint: errorMessage.includes('constraint')
        })
        
        // Detectar tipo específico de error
        if (errorMessage.includes('Foreign key constraint')) {
          errorDetails = {
            message: 'Foreign key constraint violated',
            code: 'FOREIGN_KEY_VIOLATION',
            field: errorMessage.includes('proyectoEdtId') ? 'proyectoEdtId' :
                   errorMessage.includes('proyectoServicioId') ? 'proyectoServicioId' :
                   errorMessage.includes('edtId') ? 'edtId' :
                   errorMessage.includes('proyectoTareaId') ? 'proyectoTareaId' :
                   errorMessage.includes('recursoId') ? 'recursoId' :
                   errorMessage.includes('usuarioId') ? 'usuarioId' : 'unknown',
            originalMessage: errorMessage
          }
        } else if (errorMessage.includes('Invalid')) {
          errorDetails = {
            message: 'Invalid data provided',
            code: 'INVALID_DATA',
            field: 'data',
            originalMessage: errorMessage
          }
        } else {
          errorDetails = {
            message: errorMessage,
            code: 'DATABASE_ERROR',
            field: 'database',
            originalMessage: errorMessage
          }
        }
      }
      
      return NextResponse.json(
        {
          error: 'Error de base de datos',
          details: errorDetails,
          debug: {
            edtId,
            tareaId,
            proyectoId,
            servicioId: proyectoServicio?.id,
            recursoId: recurso.id,
            userId: session.user.id,
            // Validar que todos los IDs existan
            validaciones: {
              edtExiste: await prisma.proyectoEdt.findUnique({ where: { id: edtId }, select: { id: true } }).then(r => !!r),
              tareaExiste: tareaId ? await prisma.proyectoTarea.findUnique({ where: { id: tareaId }, select: { id: true } }).then(r => !!r) : 'no_tarea',
              proyectoExiste: await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } }).then(r => !!r),
              servicioExiste: await prisma.proyectoServicioCotizado.findUnique({ where: { id: proyectoServicio?.id }, select: { id: true } }).then(r => !!r),
              recursoExiste: await prisma.recurso.findUnique({ where: { id: recurso.id }, select: { id: true } }).then(r => !!r),
              usuarioExiste: await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } }).then(r => !!r)
            }
          }
        },
        { status: 500 }
      )
    }
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.log('❌ POST registrar: Error de validación', validationError.errors)
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationError.errors },
        { status: 400 }
      )
    }

    console.error('❌ POST registrar: Error general:', validationError)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: validationError instanceof Error ? validationError.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ PUT registrar: No hay sesión válida', { session })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ PUT registrar: Sesión válida', {
      userId: session.user.id,
      email: session.user.email
    })

    const body = await request.json()
    const { id, fecha, horas, descripcion } = body

    // Verificar que el registro existe y pertenece al usuario
    const registroExistente = await prisma.registroHoras.findUnique({
      where: { id },
      select: { id: true, usuarioId: true }
    })

    if (!registroExistente || registroExistente.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar registro
    const registroActualizado = await prisma.registroHoras.update({
      where: { id },
      data: {
        fechaTrabajo: new Date(fecha), // Para PUT no necesitamos corrección especial
        horasTrabajadas: horas,
        descripcion
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Registro actualizado correctamente',
      data: {
        id: registroActualizado.id,
        horasRegistradas: horas
      }
    })

  } catch (error) {
    console.error('Error actualizando registro:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ DELETE registrar: No hay sesión válida', { session })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ DELETE registrar: Sesión válida', {
      userId: session.user.id,
      email: session.user.email
    })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID del registro requerido' },
        { status: 400 }
      )
    }

    // Verificar que el registro existe y pertenece al usuario
    const registroExistente = await prisma.registroHoras.findUnique({
      where: { id },
      select: { id: true, usuarioId: true }
    })

    if (!registroExistente || registroExistente.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar registro
    await prisma.registroHoras.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Registro eliminado correctamente'
    })

  } catch (error) {
    console.error('Error eliminando registro:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}