// ===================================================
// 📁 Archivo: [proyectoEquipoId]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/from-proyecto-equipo/[proyectoEquipoId]/route.ts
// 🔧 Descripción: API para convertir un ProyectoEquipo específico en ListaEquipo
//
// 🧠 Uso: Endpoint para conversión directa ProyectoEquipo → ListaEquipo
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ POST: Convertir ProyectoEquipo en ListaEquipo
export async function POST(req: Request, context: { params: Promise<{ proyectoEquipoId: string }> }) {
  try {
    const { proyectoEquipoId } = await context.params
    const { proyectoId } = await req.json()

    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ✅ Validar parámetros
    if (!proyectoEquipoId || !proyectoId) {
      return NextResponse.json(
        { error: 'ProyectoEquipoId y proyectoId son requeridos' },
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

    // ✅ Obtener los items disponibles del ProyectoEquipo
    const proyectoEquipoItems = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        proyectoEquipoId: proyectoEquipoId,
        OR: [
          { estado: 'pendiente' },
          { listaId: null } // ✅ Incluir items sin lista asignada
        ]
      }
    })

    // ✅ Verificar que tenga items disponibles para convertir
    if (!proyectoEquipoItems || proyectoEquipoItems.length === 0) {
      return NextResponse.json(
        { error: 'El ProyectoEquipo no tiene items disponibles para convertir' },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items NO estén ya en listas activas (evitar duplicados)
    const itemsYaEnListas = proyectoEquipoItems.filter(item =>
      item.estado === 'en_lista' && item.listaId !== null
    )
    if (itemsYaEnListas.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes items ya están asignados a listas activas: ${itemsYaEnListas.map(item => item.descripcion || 'Sin descripción').join(', ')}`
        },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items no estén asignados a otras listas (pero permitir múltiples listas)
    const itemsEnOtrasListas = proyectoEquipoItems.filter(item =>
      item.estado === 'pendiente' && item.listaId !== null
    )
    if (itemsEnOtrasListas.length > 0) {
      // Esto es válido - los items pueden estar en múltiples listas
      console.log(`Items en múltiples listas: ${itemsEnOtrasListas.length}`)
    }

    // ✅ Obtener el número de secuencia para este proyecto
    const ultimoNumero = await prisma.listaEquipo.findFirst({
      where: { proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    const numeroSecuencia = (ultimoNumero?.numeroSecuencia || 0) + 1

    // ✅ Generar código siguiendo el patrón estándar: {codigoProyecto}-LST-{correlativo}
    const codigo = `${proyectoEquipo.proyecto.codigo}-LST-${String(numeroSecuencia).padStart(3, '0')}`

    // ✅ Crear la ListaEquipo en una transacción
    const nuevaLista = await prisma.$transaction(async (tx) => {
      // 1. Crear la ListaEquipo
      const lista = await tx.listaEquipo.create({
        data: {
          codigo,
          nombre: `${proyectoEquipo.nombre} - Lista Técnica`,
          estado: 'borrador',
          numeroSecuencia,
          proyectoId,
          responsableId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // 2. Crear los ListaEquipoItem desde ProyectoEquipoItem
      for (const [index, item] of proyectoEquipoItems.entries()) {
        await tx.listaEquipoItem.create({
          data: {
            listaId: lista.id,
            proyectoEquipoItemId: item.id,
            codigo: item.codigo, // ✅ Usar código original del catálogo
            descripcion: item.descripcion,
            unidad: item.unidad || 'UND',
            cantidad: item.cantidad,
            cantidadPedida: 0,
            estado: 'borrador',
            origen: 'cotizado' as const,
            responsableId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      // 3. Asociar los ProyectoEquipoItem a la lista (mantener estado 'pendiente')
      // Solo cambiar a 'en_lista' cuando se convierta en pedido
      await tx.proyectoEquipoCotizadoItem.updateMany({
        where: {
          id: { in: proyectoEquipoItems.map(item => item.id) }
        },
        data: {
          listaId: lista.id
          // estado permanece como 'pendiente' para permitir múltiples listas
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
      message: 'Lista técnica creada exitosamente desde ProyectoEquipo'
    })

  } catch (error) {
    console.error('Error convirtiendo ProyectoEquipo a ListaEquipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la lista técnica' },
      { status: 500 }
    )
  }
}