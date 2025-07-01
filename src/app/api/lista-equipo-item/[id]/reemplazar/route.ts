import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: originalId } = await context.params // ✅ corregido con await
    const nuevo = await req.json()

    console.log('📦 Payload recibido:', nuevo)

    if (!originalId || !nuevo || !nuevo.listaId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const lista = await prisma.listaEquipo.findUnique({
      where: { id: nuevo.listaId },
    })
    console.log('✅ Lista encontrada:', lista)

    if (nuevo.proyectoEquipoItemId) {
      const peItem = await prisma.proyectoEquipoItem.findUnique({
        where: { id: nuevo.proyectoEquipoItemId },
      })
      console.log('🔍 ProyectoEquipoItem encontrado:', peItem)
    }

    if (nuevo.cotizacionSeleccionadaId) {
      const cotizacion = await prisma.cotizacionProveedorItem.findUnique({
        where: { id: nuevo.cotizacionSeleccionadaId },
      })
      console.log('💰 Cotización seleccionada encontrada:', cotizacion)
    }

    // 1. Marcar ítem original como reemplazado
    await prisma.listaEquipoItem.update({
      where: { id: originalId },
      data: {
        estado: 'reemplazo',
        cotizacionSeleccionadaId: null,
      },
    })

    // 2. Crear nuevo ítem
const nuevoItem = await prisma.listaEquipoItem.create({
  data: {
    codigo: nuevo.codigo,
    descripcion: nuevo.descripcion,
    unidad: nuevo.unidad,
    cantidad: nuevo.cantidad,
    listaId: nuevo.listaId,
    estado: 'reemplazo',
    reemplazaAId: nuevo.proyectoEquipoItemId || undefined, // <- 🔧 aquí
    cotizacionSeleccionadaId: nuevo.cotizacionSeleccionadaId || undefined,
    proyectoEquipoItemId: nuevo.proyectoEquipoItemId || undefined,
    comentarioRevision: nuevo.comentarioRevision || '',
    verificado: false,
  },
})


    console.log('✅ Nuevo ítem creado:', nuevoItem)

    return NextResponse.json(nuevoItem)
  } catch (error) {
    console.error('[REEMPLAZAR_ITEM_ERROR]', error)
    return NextResponse.json(
      { error: 'Error al reemplazar ítem' },
      { status: 500 }
    )
  }
}
