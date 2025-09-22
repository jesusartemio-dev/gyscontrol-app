// ===================================================
// 📁 Archivo: /api/lista-equipo/route.ts
// 🔧 Descripción: API para obtener y crear listas de equipos con código automático por proyecto
// 🧠 Uso: GET para listar por proyecto, POST para crear nueva con código secuencial
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-29
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const data = await prisma.listaEquipo.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
      },
      include: {
        proyecto: true,
        responsable: true,
        items: {
          include: {
            lista: true, // ✅ Relación agregada
            proveedor: true,
            cotizaciones: true,
            pedidos: {
              include: {
                pedido: true
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
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
    const dataWithMontos = data.map(lista => {
      const montoEstimado = lista.items.reduce((total, item) => {
        // Use the best available price: cotización > precioElegido > presupuesto
        const mejorCotizacion = item.cotizaciones.length > 0 
          ? Math.min(...item.cotizaciones.map(c => c.precioUnitario || 0))
          : 0
        const precioUnitario = mejorCotizacion > 0 
          ? mejorCotizacion 
          : (item.precioElegido || item.presupuesto || 0)
        
        return total + (precioUnitario * (item.cantidad || 0))
      }, 0)

      // 🔄 Calculate cantidadPedida for each item
      const itemsWithCantidadPedida = lista.items.map(item => {
        const cantidadPedida = item.pedidos.reduce((total, pedidoItem) => {
          return total + (pedidoItem.cantidadPedida || 0)
        }, 0)
        
        return {
          ...item,
          cantidadPedida
        }
      })

      return {
        ...lista,
        montoEstimado,
        items: itemsWithCantidadPedida
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

    const nuevaLista = await prisma.listaEquipo.create({
      data: {
        proyectoId: parsed.data.proyectoId,
        responsableId: session.user.id,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
        nombre: parsed.data.nombre,
        fechaNecesaria: parsed.data.fechaNecesaria ? new Date(parsed.data.fechaNecesaria) : null, // ✅ fecha necesaria
      } satisfies Prisma.ListaEquipoUncheckedCreateInput,
      include: {
        proyecto: true,
        responsable: true,
        items: {
          include: {
            lista: true, // ✅ Relación agregada
            proveedor: true,
            cotizaciones: true,
            pedidos: {
              include: {
                pedido: true // ✅ Incluir relación al pedido padre para acceder al código
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
              },
            },
          },
        },
      },
    })

    // ✅ Registrar en auditoría
    try {
      await registrarCreacion(
        'LISTA_EQUIPO',
        nuevaLista.id,
        session.user.id,
        nuevaLista.nombre,
        {
          proyecto: nuevaLista.proyecto.nombre,
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
