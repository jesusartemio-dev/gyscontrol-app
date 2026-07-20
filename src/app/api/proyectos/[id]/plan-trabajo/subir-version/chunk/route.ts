import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/proyectos/[id]/plan-trabajo/subir-version/chunk
 * Paso 2 (reemplaza la subida directa navegador→Drive, que choca con CORS:
 * Drive crea el archivo pero no manda Access-Control-Allow-Origin en la
 * respuesta, así que el navegador nunca puede leer el driveFileId). En vez
 * de eso, el navegador manda el archivo en pedazos chicos (bien por debajo
 * del límite de tamaño de request de las funciones serverless) a ESTE
 * endpoint, que reenvía cada pedazo — server a server, sin CORS — a la
 * sesión resumable de Drive que ya se inició en /subir-version/iniciar.
 * Cuando Drive confirma que ya recibió todo el archivo, este endpoint
 * devuelve el driveFileId final para que el cliente llame a /completar.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role } = session.user
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial', 'coordinador', 'proyectos']
  const esGestorODirectivo =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const sessionUri = req.headers.get('x-session-uri')
  const rangeStart = req.headers.get('x-range-start')
  const rangeEnd = req.headers.get('x-range-end')
  const totalSize = req.headers.get('x-total-size')
  if (!sessionUri || rangeStart === null || rangeEnd === null || totalSize === null) {
    return NextResponse.json({ error: 'Faltan datos del pedazo a subir' }, { status: 400 })
  }
  if (!sessionUri.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
    return NextResponse.json({ error: 'Sesión de subida inválida' }, { status: 400 })
  }

  const buffer = Buffer.from(await req.arrayBuffer())

  let driveRes: Response
  try {
    driveRes = await fetch(sessionUri, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}` },
      body: buffer,
    })
  } catch (e) {
    console.error('[subir-version/chunk] Error de red reenviando pedazo a Drive:', e)
    return NextResponse.json({ error: 'No se pudo subir este pedazo a Drive' }, { status: 502 })
  }

  if (driveRes.status === 308) {
    return NextResponse.json({ data: { done: false } })
  }

  if (driveRes.status === 200 || driveRes.status === 201) {
    const archivo = await driveRes.json().catch(() => null)
    if (!archivo?.id) {
      return NextResponse.json({ error: 'Drive no devolvió el id del archivo subido' }, { status: 500 })
    }
    return NextResponse.json({ data: { done: true, driveFileId: archivo.id as string } })
  }

  const texto = await driveRes.text().catch(() => '')
  console.error(`[subir-version/chunk] Drive rechazó el pedazo (${driveRes.status}):`, texto)
  return NextResponse.json({ error: 'Drive rechazó este pedazo del archivo' }, { status: 502 })
}
