import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { renderOrganigramaPlantillaOficial } from '@/lib/services/Organigrama/renderizarOrganigramaPlantillaOficial'

const MAX_TAMANO_BYTES = 15 * 1024 * 1024

// POST — recibe el PNG del árbol capturado en el navegador (no hay render
// server-side del organigrama) y devuelve el .docx con la plantilla oficial.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Body inválido — se espera multipart/form-data' }, { status: 400 })
    }

    const file = formData.get('imagen')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo ("imagen")' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se admiten imágenes' }, { status: 400 })
    }
    if (file.size > MAX_TAMANO_BYTES) {
      return NextResponse.json({ error: `La imagen supera el límite de ${MAX_TAMANO_BYTES / 1024 / 1024}MB` }, { status: 400 })
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        nombre: true,
        codigo: true,
        sede: true,
        etapa: true,
        ordenCompraCliente: true,
        cliente: { select: { nombre: true, logoUrl: true } },
      },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Upsert perezoso: a diferencia de la Matriz (que tiene un gate real
    // "generar con IA"), el organigrama ya existe en cuanto hay ProyectoOrgNodo
    // — no hay una acción de "generar documento" que deba preceder a la meta.
    const meta = await prisma.documentoProyectoMeta.upsert({
      where: { proyectoId_tipo: { proyectoId, tipo: 'ORGANIGRAMA' } },
      create: { proyectoId, tipo: 'ORGANIGRAMA' },
      update: {},
    })

    const imagenBuffer = Buffer.from(await file.arrayBuffer())

    let buffer: Buffer
    try {
      buffer = await renderOrganigramaPlantillaOficial({
        proyecto: {
          nombre: proyecto.nombre,
          clienteNombre: proyecto.cliente?.nombre ?? '',
          clienteLogoUrl: proyecto.cliente?.logoUrl ?? null,
          sede: proyecto.sede,
          etapa: proyecto.etapa,
          ordenCompraCliente: proyecto.ordenCompraCliente,
        },
        documento: {
          codigoDocumento: meta.codigoDocumento,
          revisionDocumento: meta.revisionDocumento,
          numeroConsultor: meta.numeroConsultor,
          desarrolloNombre: meta.desarrolloNombre,
          verificoNombre: meta.verificoNombre,
          aproboNombre: meta.aproboNombre,
          autorizoNombre: meta.autorizoNombre,
        },
        organigramaImagenBuffer: imagenBuffer,
      })
    } catch (e) {
      console.error('[organigrama-plantilla] Error al renderizar:', e instanceof Error ? e.message : e)
      return NextResponse.json({ error: 'No se pudo generar el Word del organigrama' }, { status: 500 })
    }

    const codigo = meta.codigoDocumento || `OR-${proyecto.codigo || proyectoId.substring(0, 8)}-GYS-001`
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${codigo}.docx"`,
      },
    })
  } catch (error) {
    console.error('POST /api/proyectos/[id]/organigrama/docx:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
