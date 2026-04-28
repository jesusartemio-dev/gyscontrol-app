import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Desglosar un cotizado item — selecciona listas y, opcionalmente,
// los lista items específicos que componen el desglose dentro de cada lista.
//
// Body soportado (nuevo formato):
//   {
//     listas: [{ listaId: string, listaItemIds: string[] }, ...],
//     nota?: string
//   }
//
// Body legacy (compatibilidad):
//   { listaIds: string[], nota?: string }
//   → equivale a listas con listaItemIds vacíos.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    type ListaPayload = { listaId: string; listaItemIds?: string[] }
    let listas: ListaPayload[] = []
    const nota: string | undefined = body?.nota

    if (Array.isArray(body?.listas)) {
      listas = body.listas as ListaPayload[]
    } else if (Array.isArray(body?.listaIds)) {
      listas = (body.listaIds as string[]).map((listaId) => ({ listaId, listaItemIds: [] }))
    }

    if (listas.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos una lista' }, { status: 400 })
    }

    const item = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id },
      select: { id: true, estado: true, codigo: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    if (item.estado !== 'pendiente' && item.estado !== 'desglosado') {
      return NextResponse.json(
        { error: `No se puede desglosar un item en estado "${item.estado}"` },
        { status: 400 }
      )
    }

    const allListaItemIds = listas.flatMap((l) => l.listaItemIds || [])

    // Validar que los lista items existen, pertenecen a la lista declarada
    // y son candidatos válidos (libres o ya asociados a este mismo desglose).
    if (allListaItemIds.length > 0) {
      const validacion = await prisma.listaEquipoItem.findMany({
        where: { id: { in: allListaItemIds } },
        select: {
          id: true,
          listaId: true,
          origen: true,
          proyectoEquipoItemId: true,
          reemplazaProyectoEquipoCotizadoItemId: true,
          desgloseDeProyectoEquipoCotizadoItemId: true,
          codigo: true,
        },
      })

      const validacionMap = new Map(validacion.map((v) => [v.id, v]))

      for (const l of listas) {
        for (const liId of l.listaItemIds || []) {
          const v = validacionMap.get(liId)
          if (!v) {
            return NextResponse.json(
              { error: `Lista item ${liId} no existe` },
              { status: 400 }
            )
          }
          if (v.listaId !== l.listaId) {
            return NextResponse.json(
              { error: `Lista item ${v.codigo} no pertenece a la lista declarada` },
              { status: 400 }
            )
          }
          const yaAsociadoAEsteDesglose = v.desgloseDeProyectoEquipoCotizadoItemId === id
          const esCandidatoLibre =
            v.origen === 'nuevo' &&
            !v.proyectoEquipoItemId &&
            !v.reemplazaProyectoEquipoCotizadoItemId &&
            !v.desgloseDeProyectoEquipoCotizadoItemId
          if (!yaAsociadoAEsteDesglose && !esCandidatoLibre) {
            return NextResponse.json(
              { error: `Lista item ${v.codigo} no es candidato válido para este desglose` },
              { status: 400 }
            )
          }
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Reemplazar registros DesgloseEquipoItem (a nivel de lista)
      await tx.desgloseEquipoItem.deleteMany({
        where: { proyectoEquipoCotizadoItemId: id },
      })
      if (listas.length > 0) {
        await tx.desgloseEquipoItem.createMany({
          data: listas.map((l) => ({
            proyectoEquipoCotizadoItemId: id,
            listaEquipoId: l.listaId,
            nota: nota || null,
          })),
        })
      }

      // 2. Resetear todas las líneas previamente asociadas a este desglose
      await tx.listaEquipoItem.updateMany({
        where: { desgloseDeProyectoEquipoCotizadoItemId: id },
        data: { desgloseDeProyectoEquipoCotizadoItemId: null },
      })

      // 3. Marcar las líneas seleccionadas
      if (allListaItemIds.length > 0) {
        await tx.listaEquipoItem.updateMany({
          where: { id: { in: allListaItemIds } },
          data: { desgloseDeProyectoEquipoCotizadoItemId: id },
        })
      }

      // 4. Actualizar estado del cotizado
      return tx.proyectoEquipoCotizadoItem.update({
        where: { id },
        data: {
          estado: 'desglosado',
          updatedAt: new Date(),
        },
        include: {
          desgloses: {
            include: {
              listaEquipo: { select: { id: true, codigo: true, nombre: true } },
            },
          },
          listaEquipoItemsDesglose: {
            select: {
              id: true,
              listaId: true,
              codigo: true,
              descripcion: true,
              cantidad: true,
              unidad: true,
              listaEquipo: { select: { id: true, codigo: true, nombre: true } },
            },
          },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al desglosar item:', error)
    return NextResponse.json({ error: 'Error al desglosar item' }, { status: 500 })
  }
}

// DELETE: Revertir desglose (volver a pendiente y limpiar líneas asociadas)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const updated = await prisma.$transaction(async (tx) => {
      await tx.desgloseEquipoItem.deleteMany({
        where: { proyectoEquipoCotizadoItemId: id },
      })

      await tx.listaEquipoItem.updateMany({
        where: { desgloseDeProyectoEquipoCotizadoItemId: id },
        data: { desgloseDeProyectoEquipoCotizadoItemId: null },
      })

      return tx.proyectoEquipoCotizadoItem.update({
        where: { id },
        data: {
          estado: 'pendiente',
          updatedAt: new Date(),
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al revertir desglose:', error)
    return NextResponse.json({ error: 'Error al revertir desglose' }, { status: 500 })
  }
}
