// ===================================================
// Archivo: /api/lista-equipo/enviar/[id]/route.ts
// Descripción: Envía una lista técnica a revisión
//
// Uso: Cambia el estado de la lista y de los ProyectoEquipoItem relacionados
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificarPorRol } from '@/lib/utils/notificaciones'
import { crearEvento } from '@/lib/utils/trazabilidad'

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: listaId } = await context.params

  try {
    const session = await getServerSession(authOptions)

    // 1. Obtener la lista con datos del proyecto para la notificación
    const lista = await prisma.listaEquipo.findUnique({
      where: { id: listaId },
      select: {
        codigo: true,
        responsableId: true,
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { listaEquipoItem: true } },
      },
    })

    // 2. Obtener ítems de la lista con vínculo a ProyectoEquipoItem
    const items = await prisma.listaEquipoItem.findMany({
      where: { listaId },
      select: { proyectoEquipoItemId: true },
    })

    // 3. Generar actualizaciones en los ProyectoEquipoItem (estado: en_lista)
    const actualizaciones = items
      .filter((item) => item.proyectoEquipoItemId)
      .map((item) =>
        prisma.proyectoEquipoCotizadoItem.update({
          where: { id: item.proyectoEquipoItemId! },
          data: { estado: 'en_lista' },
        })
      )

    // 4. Ejecutar en una transacción: actualizaciones + cambio de estado de la lista
    await prisma.$transaction([
      ...actualizaciones,
      prisma.listaEquipo.update({
        where: { id: listaId },
        data: { estado: 'por_revisar' },
      }),
    ])

    // 5. Notificar a logísticos (fire-and-forget)
    if (lista?.proyecto) {
      notificarPorRol(prisma, ['logistico', 'admin'], {
        titulo: 'Lista técnica enviada a revisión',
        mensaje: `${lista.codigo || 'Lista'} del proyecto ${lista.proyecto.codigo} requiere cotización`,
        tipo: 'info',
        prioridad: 'media',
        entidadTipo: 'ListaEquipo',
        entidadId: listaId,
        accionUrl: `/logistica/listas/${listaId}`,
        accionTexto: 'Ver lista',
      })
    }

    // 6. Evento de trazabilidad (fire-and-forget)
    const userId = session?.user?.id || lista?.responsableId || 'system'
    crearEvento(prisma, {
      listaEquipoId: listaId,
      proyectoId: lista?.proyecto?.id || null,
      tipo: 'lista_enviada',
      descripcion: `Lista ${lista?.codigo || listaId} enviada a revisión con ${lista?._count?.listaEquipoItem || 0} items`,
      usuarioId: userId,
      metadata: {
        listaCodigo: lista?.codigo,
        proyectoCodigo: lista?.proyecto?.codigo,
        totalItems: lista?._count?.listaEquipoItem || 0,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al enviar lista: ' + String(error) },
      { status: 500 }
    )
  }
}
