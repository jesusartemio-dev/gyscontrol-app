/**
 * API para aprobar un registro de campo
 * PUT /api/horas-hombre/campo/[id]/aprobar
 *
 * Al aprobar:
 * 1. Cambia estado a 'aprobado'
 * 2. Crea RegistroHoras individuales para cada miembro de cada tarea
 * 3. Actualiza horasReales de cada tarea del cronograma si aplica
 * 4. Envía notificaciones a los miembros
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { ProgresoService } from '@/lib/services/progresoService'
import { obtenerCostosHoraPENBatch } from '@/lib/utils/costoHoraSnapshot'

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

    // Obtener registro con tareas y miembros
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
        supervisor: { select: { id: true, name: true, email: true } },
        tareas: {
          include: {
            proyectoTarea: {
              select: {
                id: true,
                nombre: true,
                proyectoActividad: { select: { id: true, nombre: true } }
              }
            },
            miembros: {
              include: {
                usuario: { select: { id: true, name: true, email: true } }
              }
            }
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
      where: { activo: true },
      select: { id: true, nombre: true }
    })

    if (!recurso) {
      return NextResponse.json(
        { error: 'No hay recursos disponibles en el sistema' },
        { status: 400 }
      )
    }

    // Determinar categoría base
    const categoriaBase = registro.proyectoEdt?.nombre ||
                          registro.proyectoEdt?.edt?.nombre ||
                          proyectoServicio.edt?.nombre ||
                          'campo'

    // Snapshot del costo hora de todos los miembros de la cuadrilla
    const todosUsuarioIds = [...new Set(
      registro.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
    )]
    const costosHoraMap = await obtenerCostosHoraPENBatch(todosUsuarioIds)

    // Ejecutar transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const registrosHorasCreados: string[] = []
      let totalHorasRegistradas = 0
      const tareasActualizadas: Map<string, number> = new Map()

      // Iterar por cada tarea
      for (const tarea of registro.tareas) {
        // Determinar nombre del servicio/tarea
        const nombreServicio = tarea.proyectoTarea?.nombre ||
                               tarea.nombreTareaExtra ||
                               proyectoServicio.nombre ||
                               'Trabajo de Campo'

        // Crear RegistroHoras para cada miembro de esta tarea
        for (const miembro of tarea.miembros) {
          const nuevoRegistroId = randomUUID()

          await tx.registroHoras.create({
            data: {
              id: nuevoRegistroId,
              proyectoId: registro.proyectoId,
              proyectoServicioId: proyectoServicio.id,
              categoria: categoriaBase,
              nombreServicio: nombreServicio,
              recursoId: recurso.id,
              recursoNombre: recurso.nombre,
              usuarioId: miembro.usuarioId,
              fechaTrabajo: registro.fechaTrabajo,
              horasTrabajadas: miembro.horas,
              descripcion: tarea.descripcion || registro.descripcion,
              observaciones: miembro.observaciones,
              aprobado: true,
              proyectoEdtId: registro.proyectoEdtId,
              edtId: registro.proyectoEdt?.edtId,
              proyectoTareaId: tarea.proyectoTareaId,
              origen: 'campo',
              ubicacion: registro.ubicacion,
              costoHora: costosHoraMap.get(miembro.usuarioId) || null,
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

          // Acumular horas por tarea del cronograma
          if (tarea.proyectoTareaId) {
            const horasActuales = tareasActualizadas.get(tarea.proyectoTareaId) || 0
            tareasActualizadas.set(tarea.proyectoTareaId, horasActuales + miembro.horas)
          }
        }
      }

      // Actualizar horasReales de cada tarea del cronograma afectada
      for (const [tareaId, horas] of tareasActualizadas.entries()) {
        await tx.proyectoTarea.update({
          where: { id: tareaId },
          data: {
            horasReales: { increment: horas },
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
        totalHorasRegistradas,
        tareasActualizadas: tareasActualizadas.size
      }
    })

    // Auto-actualizar progreso de tareas afectadas (no-blocking)
    for (const [tareaId] of Array.from(new Map(
      registro.tareas
        .filter(t => t.proyectoTareaId)
        .map(t => [t.proyectoTareaId!, true] as [string, boolean])
    ))) {
      try {
        await ProgresoService.actualizarProgresoTarea(tareaId)
      } catch (err) {
        console.error(`⚠️ Error actualizando progreso de tarea ${tareaId}:`, err)
      }
    }

    console.log(`✅ APROBAR CAMPO: Aprobado registro ${id}, creados ${resultado.registrosHorasCreados.length} registros de horas, ${resultado.tareasActualizadas} tareas actualizadas`)

    return NextResponse.json({
      success: true,
      message: `Registro aprobado. Se crearon ${resultado.registrosHorasCreados.length} registros de horas (${resultado.totalHorasRegistradas}h total)`,
      data: {
        registroId: id,
        estado: 'aprobado',
        registrosHorasCreados: resultado.registrosHorasCreados.length,
        totalHorasRegistradas: resultado.totalHorasRegistradas,
        tareasActualizadas: resultado.tareasActualizadas
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
