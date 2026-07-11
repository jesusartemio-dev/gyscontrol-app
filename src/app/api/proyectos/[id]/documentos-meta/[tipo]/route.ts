import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { DocumentoProyectoTipo } from '@/lib/documentosOficiales/tipoDocumento'

const TIPOS_VALIDOS: DocumentoProyectoTipo[] = ['MATRIZ_COMUNICACION', 'ORGANIGRAMA']

function tipoValido(tipo: string): tipo is DocumentoProyectoTipo {
  return (TIPOS_VALIDOS as string[]).includes(tipo)
}

// GET — obtiene (o crea vacía por upsert) la metadata del documento para este proyecto+tipo
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId, tipo } = await params
    if (!tipoValido(tipo)) return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })

    const meta = await prisma.documentoProyectoMeta.upsert({
      where: { proyectoId_tipo: { proyectoId, tipo } },
      create: { proyectoId, tipo },
      update: {},
    })

    return NextResponse.json(meta)
  } catch (error) {
    console.error('GET /api/proyectos/[id]/documentos-meta/[tipo]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — actualiza los campos de metadata del documento (código, revisión, firmas)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId, tipo } = await params
    if (!tipoValido(tipo)) return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
    const body = await req.json()

    const meta = await prisma.documentoProyectoMeta.upsert({
      where: { proyectoId_tipo: { proyectoId, tipo } },
      create: {
        proyectoId,
        tipo,
        codigoDocumento: body.codigoDocumento ?? null,
        revisionDocumento: body.revisionDocumento ?? '0',
        numeroConsultor: body.numeroConsultor ?? null,
        desarrolloNombre: body.desarrolloNombre ?? null,
        verificoNombre: body.verificoNombre ?? null,
        aproboNombre: body.aproboNombre ?? null,
        autorizoNombre: body.autorizoNombre ?? null,
      },
      update: {
        ...(body.codigoDocumento !== undefined && { codigoDocumento: body.codigoDocumento }),
        ...(body.revisionDocumento !== undefined && { revisionDocumento: body.revisionDocumento }),
        ...(body.numeroConsultor !== undefined && { numeroConsultor: body.numeroConsultor }),
        ...(body.desarrolloNombre !== undefined && { desarrolloNombre: body.desarrolloNombre }),
        ...(body.verificoNombre !== undefined && { verificoNombre: body.verificoNombre }),
        ...(body.aproboNombre !== undefined && { aproboNombre: body.aproboNombre }),
        ...(body.autorizoNombre !== undefined && { autorizoNombre: body.autorizoNombre }),
      },
    })

    return NextResponse.json(meta)
  } catch (error) {
    console.error('PATCH /api/proyectos/[id]/documentos-meta/[tipo]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
