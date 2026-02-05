/**
 * API para aprobar un registro de campo
 * PUT /api/horas-hombre/campo/[id]/aprobar
 *
 * Al aprobar:
 * 1. Cambia estado a 'aprobado'
 * 2. Crea RegistroHoras individuales para cada miembro
 * 3. Actualiza horasReales de la tarea si aplica
 * 4. Envía notificaciones a los miembros
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    // Solo gestores, gerentes y admins pueden aprobar
    const rolesPermitidos = ['admin', 'gerente', 'gestor']
    if (!rolesPermitidos.includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para aprobar registros' },
        { status: 403 }
      )
    }

    const aprobadorId = session.user.id

    // Obtener registro con miembros
    const registro = await prisma.registroHorasCampo.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edtId: true,
            edt: { select: { nombre: true } }
          }
        },
        proyectoTarea: { select: { id: true, nombre: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        miembros: {
          include: {
            usuario: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    if (!registro) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    if (registro.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar registros pendientes' },
        { status: 400 }
      )
    }

    // Obtener servicio del proyecto para crear RegistroHoras
    const proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
      where: { proyectoId: registro.proyectoId },
      select: {
        id: true,
        nombre: true,
        edtId: true,
        edt: { select: { nombre: true } }
      }
    })

    if (!proyectoServicio) {
      return NextResponse.json(
        { error: 'No hay servicio asociado al proyecto' },
        { status: 400 }
      )
    }

    // Obtener un recurso por defecto
    const recurso = await prisma.recurso.findFirst({
      select: { id: true, nombre: true }
    })

    if (!recurso) {
      return NextResponse.json(
        { error: 'No hay recursos disponibles en el sistema' },
        { status: 400 }
      )
    }

    // Determinar categoría
    const categoriaFinal = registro.proyectoEdt?.nombre ||
                          registro.proyectoEdt?.edt?.nombre ||
                          proyectoServicio.edt?.nombre ||
                          'campo'

    // Ejecutar transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const registrosHorasCreados: string[] = []
      let totalHorasRegistradas = 0

      // Crear RegistroHoras para cada miembro
      for (const miembro of registro.miembros) {
        const nuevoRegistroId = randomUUID()

        await tx.registroHoras.create({
          data: {
            id: nuevoRegistroId,
            proyectoId: registro.proyectoId,
            proyectoServicioId: proyectoServicio.id,
            categoria: categoriaFinal,
            nombreServicio: proyectoServicio.nombre || registro.proyectoEdt?.nombre || 'Trabajo de Campo',
            recursoId: recurso.id,
            recursoNombre: recurso.nombre,
            usuarioId: miembro.usuarioId,
            fechaTrabajo: registro.fechaTrabajo,
            horasTrabajadas: miembro.horas,
            descripcion: registro.descripcion,
            observaciones: miembro.observaciones,
            aprobado: true,
            proyectoEdtId: registro.proyectoEdtId,
            edtId: registro.proyectoEdt?.edtId,
            proyectoTareaId: registro.proyectoTareaId,
            origen: 'campo',
            ubicacion: registro.ubicacion,
            updatedAt: new Date()
          }
        })

        // Vincular RegistroHoras al miembro
        await tx.registroHorasCampoMiembro.update({
          where: { id: miembro.id },
          data: { registroHorasId: nuevoRegistroId }
        })

        registrosHorasCreados.push(nuevoRegistroId)
        totalHorasRegistradas += miembro.horas
      }

      // Actualizar horasReales de la tarea si existe
      if (registro.proyectoTareaId) {
        await tx.proyectoTarea.update({
          where: { id: registro.proyectoTareaId },
          data: {
            horasReales: { increment: totalHorasRegistradas },
            updatedAt: new Date()
          }
        })
      }

      // Actualizar estado del registro de campo
      const registroActualizado = await tx.registroHorasCampo.update({
        where: { id },
        data: {
          estado: 'aprobado',
          fechaAprobacion: new Date(),
          aprobadoPorId: aprobadorId
        }
      })

      return {
        registro: registroActualizado,
        registrosHorasCreados,
        totalHorasRegistradas
      }
    })

    // TODO: Enviar notificaciones a los miembros
    // for (const miembro of registro.miembros) {
    //   await crearNotificacion({
    //     titulo: 'Horas registradas por supervisor',
    //     mensaje: `Se registraron ${miembro.horas}h en "${registro.proyecto.nombre}"`,
    //     tipo: 'success',
    //     prioridad: 'media',
    //     usuarioId: miembro.usuarioId,
    //     entidadTipo: 'registro_horas_campo',
    //     entidadId: id,
    //     accionUrl: '/mi-trabajo/timesheet',
    //     accionTexto: 'Ver Timesheet'
    //   })
    // }

    console.log(`✅ APROBAR CAMPO: Aprobado registro ${id}, creados ${resultado.registrosHorasCreados.length} registros de horas`)

    return NextResponse.json({
      success: true,
      message: `Registro aprobado. Se crearon ${resultado.registrosHorasCreados.length} registros de horas (${resultado.totalHorasRegistradas}h total)`,
      data: {
        registroId: id,
        estado: 'aprobado',
        registrosHorasCreados: resultado.registrosHorasCreados.length,
        totalHorasRegistradas: resultado.totalHorasRegistradas
      }
    })

  } catch (error) {
    console.error('❌ APROBAR REGISTRO CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error aprobando registro de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
