// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/crm/oportunidades/[id]
// 🔧 Descripción: API para gestión de oportunidad específica
// ✅ GET: Obtener oportunidad por ID
// ✅ PUT: Actualizar oportunidad
// ✅ DELETE: Eliminar oportunidad
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener oportunidad por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            ruc: true,
            sector: true,
            tamanoEmpresa: true,
            sitioWeb: true,
            frecuenciaCompra: true
          }
        },
        comercial: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            totalCliente: true,
            grandTotal: true,
            fechaEnvio: true
          }
        },
        actividades: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { fecha: 'desc' }
        },
        _count: {
          select: {
            actividades: true
          }
        }
      }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(oportunidad)

  } catch (error) {
    console.error('❌ Error al obtener oportunidad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Actualizar oportunidad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // ✅ Verificar que la oportunidad existe
    const oportunidadExistente = await prisma.crmOportunidad.findUnique({
      where: { id }
    })

    if (!oportunidadExistente) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Preparar datos de actualización
    const updateData: any = {}

    if (data.nombre !== undefined) updateData.nombre = data.nombre
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    if (data.valorEstimado !== undefined) {
      updateData.valorEstimado = data.valorEstimado ? parseFloat(data.valorEstimado) : null
    }
    if (data.probabilidad !== undefined) {
      updateData.probabilidad = data.probabilidad ? parseInt(data.probabilidad) : 0
    }
    if (data.fechaCierreEstimada !== undefined) {
      updateData.fechaCierreEstimada = data.fechaCierreEstimada ? new Date(data.fechaCierreEstimada) : null
    }
    if (data.fuente !== undefined) updateData.fuente = data.fuente
    if (data.estado !== undefined) updateData.estado = data.estado
    if (data.prioridad !== undefined) updateData.prioridad = data.prioridad
    if (data.notas !== undefined) updateData.notas = data.notas
    if (data.competencia !== undefined) updateData.competencia = data.competencia

    // ✅ Validar y asignar clienteId si se proporciona
    if (data.clienteId !== undefined) {
      if (data.clienteId) {
        const clienteExiste = await prisma.cliente.findUnique({
          where: { id: data.clienteId },
          select: { id: true }
        })
        if (!clienteExiste) {
          return NextResponse.json(
            { error: 'El cliente seleccionado no existe' },
            { status: 400 }
          )
        }
      }
      updateData.clienteId = data.clienteId
    }

    // ✅ Validar y asignar responsableId si se proporciona
    if (data.responsableId !== undefined) {
      if (data.responsableId) {
        const usuarioExiste = await prisma.user.findUnique({
          where: { id: data.responsableId },
          select: { id: true }
        })
        if (!usuarioExiste) {
          return NextResponse.json(
            { error: 'El responsable seleccionado no existe' },
            { status: 400 }
          )
        }
      }
      updateData.responsableId = data.responsableId
    }

    // ✅ Actualizar fecha de último contacto si se actualiza algún campo relevante
    if (Object.keys(updateData).length > 0) {
      updateData.fechaUltimoContacto = new Date()
    }

    // ✅ Actualizar oportunidad
    const oportunidadActualizada = await prisma.crmOportunidad.update({
      where: { id },
      data: updateData,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            ruc: true,
            sector: true
          }
        },
        comercial: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true
          }
        }
      }
    })

    return NextResponse.json(oportunidadActualizada)

  } catch (error: any) {
    console.error('❌ Error al actualizar oportunidad:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Los datos de relación (cliente o responsable) no son válidos' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Eliminar oportunidad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // ✅ Verificar que la oportunidad existe
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        comercialId: true,
        responsableId: true
      }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Verificar permisos (solo el comercial o responsable pueden eliminar)
    if (oportunidad.comercialId !== session.user.id && oportunidad.responsableId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tiene permisos para eliminar esta oportunidad' },
        { status: 403 }
      )
    }

    // ✅ Eliminar oportunidad (las actividades se eliminan automáticamente por cascade)
    await prisma.crmOportunidad.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Oportunidad eliminada exitosamente',
      id
    })

  } catch (error) {
    console.error('❌ Error al eliminar oportunidad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}