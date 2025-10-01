// ===================================================
// 📁 Archivo: distribuir/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/distribuir/route.ts
// 🔧 Descripción: API para distribución avanzada de ProyectoEquipo en múltiples ListaEquipo
//
// 🧠 Uso: Endpoint para crear múltiples listas con asignación granular de items
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ListaDistribucionPayload {
  proyectoId: string
  proyectoEquipoId: string
  nombre: string
  descripcion: string
  itemsIds: string[]
}

export async function POST(req: Request) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const payload: ListaDistribucionPayload = await req.json()
    const { proyectoId, proyectoEquipoId, nombre, descripcion, itemsIds } = payload

    // ✅ Validar parámetros
    if (!proyectoId || !proyectoEquipoId || !nombre || !itemsIds || itemsIds.length === 0) {
      return NextResponse.json(
        { error: 'Parámetros incompletos: proyectoId, proyectoEquipoId, nombre, descripcion e itemsIds son requeridos' },
        { status: 400 }
      )
    }

    // ✅ Verificar que el ProyectoEquipo existe y pertenece al proyecto
    const proyectoEquipo = await prisma.proyectoEquipoCotizado.findFirst({
      where: {
        id: proyectoEquipoId,
        proyectoId: proyectoId
      },
      include: {
        proyecto: true
      }
    })

    if (!proyectoEquipo) {
      return NextResponse.json(
        { error: 'ProyectoEquipo no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Verificar que los items existen y pertenecen al ProyectoEquipo
    const proyectoEquipoItems = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        id: { in: itemsIds },
        proyectoEquipoId: proyectoEquipoId
      }
    })

    if (proyectoEquipoItems.length !== itemsIds.length) {
      return NextResponse.json(
        { error: 'Algunos items no existen o no pertenecen al ProyectoEquipo' },
        { status: 400 }
      )
    }

    // ✅ Generar código único para la lista
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const codigo = `LE-${timestamp}-${randomSuffix}`

    // ✅ Obtener el número de secuencia para este proyecto
    const ultimoNumero = await prisma.listaEquipo.findFirst({
      where: { proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    const numeroSecuencia = (ultimoNumero?.numeroSecuencia || 0) + 1

    // ✅ Crear la ListaEquipo y sus items en una transacción
    const nuevaLista = await prisma.$transaction(async (tx) => {
      // 1. Crear la ListaEquipo
      const lista = await tx.listaEquipo.create({
        data: {
          codigo,
          nombre,
          estado: 'borrador',
          numeroSecuencia,
          proyectoId,
          responsableId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // 2. Crear los ListaEquipoItem desde los ProyectoEquipoItem seleccionados
      for (const [index, itemId] of itemsIds.entries()) {
        const proyectoItem = proyectoEquipoItems.find(item => item.id === itemId)
        if (!proyectoItem) continue

        await tx.listaEquipoItem.create({
          data: {
            listaId: lista.id,
            proyectoEquipoItemId: proyectoItem.id,
            codigo: `${lista.codigo}-${index + 1}`,
            descripcion: proyectoItem.descripcion,
            unidad: proyectoItem.unidad || 'UND',
            cantidad: proyectoItem.cantidad,
            cantidadPedida: 0,
            estado: 'borrador',
            origen: 'cotizado' as const,
            responsableId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      // 3. Actualizar el estado de los ProyectoEquipoItem a 'en_lista'
      await tx.proyectoEquipoCotizadoItem.updateMany({
        where: {
          id: { in: itemsIds }
        },
        data: {
          estado: 'en_lista',
          listaId: lista.id
        }
      })

      return lista
    })

    // ✅ Retornar la lista creada con sus items
    const listaCompleta = await prisma.listaEquipo.findUnique({
      where: { id: nuevaLista.id },
      include: {
        proyecto: true,
        responsable: true,
        items: {
          include: {
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      ...listaCompleta,
      message: `Lista "${nombre}" creada exitosamente con ${itemsIds.length} items`
    })

  } catch (error) {
    console.error('Error en distribución avanzada:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la lista' },
      { status: 500 }
    )
  }
}
