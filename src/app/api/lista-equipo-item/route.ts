// ===================================================
// 📁 Archivo: lista-equipo-item/route.ts
// 📌 Ubicación: src/app/api/lista-equipo-item/route.ts
// 🔧 Descripción: API para gestionar ítems de lista de equipos
// 🧠 Uso: GET para listar ítems, POST para crear nuevo ítem
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-07-04
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ListaEquipoItemPayload } from '@/types/payloads'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createId } from '@paralleldrive/cuid2'

// ✅ Obtener todos los ítems
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    // 🔍 Construir filtros dinámicamente
    const whereClause: any = {}

    if (proyectoId) {
      whereClause.listaEquipo = {
        proyectoId: proyectoId
      }
    }

    console.log('🔍 DEBUG API lista-equipo-item - Filtros aplicados:', whereClause)

    const items = await prisma.listaEquipoItem.findMany({
      where: whereClause,
      include: {
        listaEquipo: true,
        proveedor: true,
        catalogoEquipo: {
          include: {
            categoriaEquipo: true
          }
        },
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: true
          }
        },
        proyectoEquipoCotizado: true,
        verificadoPor: {
          select: { id: true, name: true, email: true }
        },
        cotizacionProveedorItems: {
          include: {
            cotizacionProveedor: {
              select: {
                id: true,
                codigo: true,
                proveedor: {
                  select: { nombre: true },
                },
              },
            },
          },
          orderBy: { codigo: 'asc' },
        },
      },
      orderBy: { codigo: 'asc' },
    })

    return new NextResponse(JSON.stringify(items), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('❌ Error GET listaEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al obtener los ítems: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Crear nuevo ítem
export async function POST(request: Request) {
  try {
    // ✅ Obtener sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as ListaEquipoItemPayload

    // 📌 Validación básica de campos obligatorios
    if (
      typeof body.listaId !== 'string' ||
      typeof body.codigo !== 'string' ||
      typeof body.descripcion !== 'string' ||
      typeof body.unidad !== 'string'
    ) {
      console.warn('⚠️ Faltan campos obligatorios en el payload:', body)
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    // 📌 Validación de enums
    const valoresEstado = [
      'borrador',
      'por_revisar',
      'por_cotizar',
      'por_validar',
      'por_aprobar',
      'aprobado',
      'rechazado',
    ]

    const valoresOrigen = ['cotizado', 'nuevo', 'reemplazo']

    if (body.estado && !valoresEstado.includes(body.estado)) {
      console.error('❌ Estado inválido:', body.estado)
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    if (body.origen && !valoresOrigen.includes(body.origen)) {
      console.error('❌ Origen inválido:', body.origen)
      return NextResponse.json({ error: 'Origen inválido' }, { status: 400 })
    }

    // 📦 Log completo del payload recibido
    console.log('📥 Payload recibido en API lista-equipo-item:', body)

    // ✅ Crear nuevo ítem
    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        id: createId(), // ✅ Generar ID manualmente ya que el schema no tiene @default(cuid())
        listaId: body.listaId,
        proyectoEquipoItemId: body.proyectoEquipoItemId || null,
        proyectoEquipoId: body.proyectoEquipoId || null,
        reemplazaProyectoEquipoCotizadoItemId: body.reemplazaProyectoEquipoCotizadoItemId || null, // ✅ actualizado
        proveedorId: body.proveedorId || null,
        cotizacionSeleccionadaId: body.cotizacionSeleccionadaId || null,
        catalogoEquipoId: body.catalogoEquipoId || null,
        responsableId: session.user.id,
        codigo: body.codigo,
        descripcion: body.descripcion,
        categoria: body.categoria || 'SIN-CATEGORIA',
        tipoItem: body.tipoItem || 'equipo',
        unidad: body.unidad,
        marca: body.marca || 'SIN-MARCA',
        cantidad: body.cantidad ?? 0,
        verificado: body.verificado ?? false,
        comentarioRevision: body.comentarioRevision || null,
        presupuesto: body.presupuesto ?? null,
        precioElegido: body.precioElegido ?? null,
        costoElegido: body.costoElegido ?? null,
        costoPedido: body.costoPedido ?? 0,
        costoReal: body.costoReal ?? 0,
        cantidadPedida: body.cantidadPedida ?? 0,
        cantidadEntregada: body.cantidadEntregada ?? 0,
        origen: body.origen ?? 'nuevo',
        estado: body.estado ?? 'borrador',
        updatedAt: new Date(),
      } as any,
      include: {
        listaEquipo: true,
        proveedor: true,
        catalogoEquipo: {
          include: {
            categoriaEquipo: true
          }
        },
        pedidoEquipoItem: {
          include: {
            pedidoEquipo: true
          }
        },
        proyectoEquipoCotizado: true,
        cotizacionProveedorItems: {
          include: {
            cotizacionProveedor: {
              select: {
                id: true,
                codigo: true,
                proveedor: {
                  select: { nombre: true },
                },
              },
            },
          },
          orderBy: { codigo: 'asc' },
        },
      },
    })

    console.log('✅ Ítem creado correctamente:', nuevo)

    // 🔄 Paso 2: Actualizar listaEquipoSeleccionadoId en ProyectoEquipoItem si aplica
    if (body.proyectoEquipoItemId) {
      await prisma.proyectoEquipoCotizadoItem.update({
        where: { id: body.proyectoEquipoItemId },
        data: {
          listaEquipoSeleccionadoId: nuevo.id,
          estado: 'en_lista',
        },
      })
      console.log(`🔄 ProyectoEquipoItem actualizado con listaEquipoSeleccionadoId: ${nuevo.id}`)
    }

    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error POST listaEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem: ' + String(error) },
      { status: 500 }
    )
  }
}
