// ===================================================
// 📁 Archivo: /api/lista-equipo/route.ts
// 🔧 Descripción: API para obtener y crear listas de equipos con código automático por proyecto
// 🧠 Uso: GET para listar por proyecto, POST para crear nueva con código secuencial
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-29
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { EstadoListaEquipo } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarCreacion } from '@/lib/services/audit'

const listaEquipoSchema = z.object({
  proyectoId: z.string().min(1, 'El proyectoId es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  fechaNecesaria: z.string().optional(), // ✅ fecha límite para completar la lista
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const data = await prisma.listaEquipo.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
        ...(estado ? { estado: estado as EstadoListaEquipo } : {}),
      },
      include: {
        proyecto: true,
        user: true,
        listaEquipoItem: {
          include: {
            listaEquipo: true,
            proveedor: true,
            cotizacionProveedorItems: true,
            pedidoEquipoItem: {
              include: {
                pedidoEquipo: true
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // ✅ Calculate montoEstimado and cantidadPedida for each lista
    const dataWithMontos = data.map((lista: any) => {
      const items = lista.listaEquipoItem || []
      const montoEstimado = items.reduce((total: number, item: any) => {
        // Use the best available price: cotización > precioElegido > presupuesto
        const cotizaciones = item.cotizacionProveedorItems || []
        const mejorCotizacion = cotizaciones.length > 0
          ? Math.min(...cotizaciones.map((c: any) => c.precioUnitario || 0))
          : 0
        const precioUnitario = mejorCotizacion > 0
          ? mejorCotizacion
          : (item.precioElegido || item.presupuesto || 0)

        return total + (precioUnitario * (item.cantidad || 0))
      }, 0)

      // 🔄 Calculate cantidadPedida for each item
      const itemsWithCantidadPedida = items.map((item: any) => {
        const pedidos = item.pedidoEquipoItem || []
        const cantidadPedida = pedidos.reduce((total: number, pedidoItem: any) => {
          return total + (pedidoItem.cantidadPedida || 0)
        }, 0)

        return {
          ...item,
          lista: item.listaEquipo,
          cotizaciones: item.cotizacionProveedorItems,
          pedidos: item.pedidoEquipoItem,
          cantidadPedida
        }
      })

      // Count total cotizaciones across all items
      const totalCotizaciones = items.reduce((sum: number, item: any) => {
        return sum + (item.cotizacionProveedorItems?.length || 0)
      }, 0)

      return {
        ...lista,
        responsable: lista.user,
        items: itemsWithCantidadPedida,
        montoEstimado,
        _count: {
          ...(lista as any)._count,
          cotizacionProveedorItem: totalCotizaciones
        }
      }
    })

    return NextResponse.json(dataWithMontos)
  } catch (error) {
    console.error('❌ Error en GET /lista-equipo:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const parsed = listaEquipoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Error de validación', detalles: parsed.error.errors },
        { status: 400 }
      )
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: parsed.data.proyectoId },
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    const ultimaLista = await prisma.listaEquipo.findFirst({
      where: { proyectoId: parsed.data.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })

    const nuevoNumero = ultimaLista ? ultimaLista.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-LST-${String(nuevoNumero).padStart(3, '0')}`

    const nuevaListaRaw = await prisma.listaEquipo.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId: parsed.data.proyectoId,
        responsableId: session.user.id,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
        nombre: parsed.data.nombre,
        fechaNecesaria: parsed.data.fechaNecesaria ? new Date(parsed.data.fechaNecesaria) : null,
        updatedAt: new Date()
      },
      include: {
        proyecto: true,
        user: true,
        listaEquipoItem: {
          include: {
            listaEquipo: true,
            proveedor: true,
            cotizacionProveedorItems: true,
            pedidoEquipoItem: {
              include: {
                pedidoEquipo: true
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: true,
              },
            },
          },
        },
      },
    })

    // Map for frontend compatibility
    const nuevaLista = {
      ...nuevaListaRaw,
      responsable: nuevaListaRaw.user,
      items: nuevaListaRaw.listaEquipoItem
    }

    // ✅ Registrar en auditoría
    try {
      await registrarCreacion(
        'LISTA_EQUIPO',
        nuevaLista.id,
        session.user.id,
        nuevaLista.nombre,
        {
          proyecto: proyecto.nombre,
          codigo: nuevaLista.codigo,
          fechaNecesaria: parsed.data.fechaNecesaria
        }
      )
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No fallar la creación por error de auditoría
    }

    return NextResponse.json(nuevaLista)
  } catch (error) {
    console.error('❌ Error en POST /lista-equipo:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
