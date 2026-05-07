import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarDocxMatriz } from '@/lib/matrizComunicacion/exportDocx'
import { generarSiglas } from '@/lib/matrizComunicacion/utils'

function parseCeldas(json: string): { siglas: string; valor: string }[] {
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    if (arr.length > 0 && typeof arr[0] === 'object' && 'siglas' in arr[0]) return arr
    return []
  } catch {
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const [matriz, proyecto] = await Promise.all([
      prisma.matrizComunicacion.findUnique({
        where: { proyectoId },
        include: { filas: { orderBy: { orden: 'asc' } } },
      }),
      prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          nombre: true,
          codigo: true,
          cliente: { select: { nombre: true } },
          orgNodos: {
            where: { userId: { not: null } },
            orderBy: { orden: 'asc' },
            select: {
              cargoLabel: true,
              empresaOverride: true,
              telefonoOverride: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  empleado: { select: { telefono: true } },
                },
              },
            },
          },
        },
      }),
    ])

    if (!matriz) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const usadas = new Set<string>()
    const personal = proyecto.orgNodos
      .filter(n => n.user?.name)
      .map(n => {
        const siglas = generarSiglas(n.user!.name!, usadas)
        usadas.add(siglas)
        return {
          siglas,
          nombre: n.user!.name!,
          cargo: n.cargoLabel,
          empresa: n.empresaOverride ?? 'GYS Control Industrial SAC',
          celular: n.telefonoOverride ?? n.user?.empleado?.telefono ?? '',
          correo: n.user!.email,
        }
      })

    const filas = matriz.filas.map(f => ({
      orden: f.orden,
      edtNombre: f.informacion,
      frecuencia: f.frecuencia,
      medio: f.medio,
      celdas: parseCeldas(f.receptores),
    }))

    const today = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const codigo = `${proyecto.codigo}-MAC`

    const buffer = await generarDocxMatriz({
      proyecto: proyecto.nombre,
      cliente: proyecto.cliente?.nombre ?? '',
      codigoDocumento: codigo,
      revision: matriz.version,
      fecha: today,
      personal,
      filas,
    })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${codigo}.docx"`,
      },
    })
  } catch (error) {
    console.error('GET /api/proyectos/[id]/matriz-comunicacion/docx:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
