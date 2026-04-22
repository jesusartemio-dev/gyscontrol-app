// ===================================================
// 📁 Archivo: from-proyecto/[id]/route.ts
// 📌 Descripción: Crea una lista técnica basada en los ProyectoEquipoItem
// 🧠 Uso: POST → Genera ListaEquipo + ítems desde los equipos técnicos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarCreacion } from '@/lib/services/audit'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await context.params

  try {
    // ✅ Obtener sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    // 1. Obtener todos los ProyectoEquipoItem del proyecto
    const items = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: { proyectoEquipoCotizado: { proyectoId } },
      include: {
        proyectoEquipoCotizado: true,
      },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No hay equipos técnicos registrados en el proyecto' },
        { status: 400 }
      )
    }

    // 2. Crear nueva ListaEquipo + ítems dentro de una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaLista = await tx.listaEquipo.create({
        data: {
          id: `lista-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId,
          responsableId: session.user.id,
          codigo: `LST-${Date.now()}`, // Código único temporal
          nombre: 'Lista desde Cotización',
          numeroSecuencia: 1, // Número de secuencia inicial
          updatedAt: new Date()
        },
      })

      const nuevosItems = items.map((item, index) =>
        tx.listaEquipoItem.create({
          data: {
            id: `lista-item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            listaId: nuevaLista.id,
            proyectoEquipoItemId: item.id,
            proyectoEquipoId: item.proyectoEquipoId,
            responsableId: session.user.id,
            codigo: item.codigo,
            descripcion: item.descripcion || '',
            marca: item.marca || '', // ✅ Copiar marca
            categoria: item.categoria || '', // ✅ Copiar categoria
            unidad: item.unidad || 'UND',
            cantidad: item.cantidad,
            presupuesto: item.precioCliente || 0,
            catalogoEquipoId: item.catalogoEquipoId ?? null,
            origen: 'cotizado', // ✅ Campo requerido
            estado: 'borrador', // ✅ Campo requerido
            updatedAt: new Date()
          },
        })
      )

      await Promise.all(nuevosItems)


      return nuevaLista
    })

    // ✅ Registrar en auditoría
    try {
      await registrarCreacion(
        'LISTA_EQUIPO',
        resultado.id,
        session.user.id,
        resultado.nombre,
        {
          codigo: resultado.codigo,
          origen: 'from-proyecto',
          totalItems: items.length,
        }
      )
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
    }

    return NextResponse.json(resultado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno al generar la lista desde equipos técnicos: ' + String(error) },
      { status: 500 }
    )
  }
}
