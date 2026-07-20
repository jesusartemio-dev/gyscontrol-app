import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFile, getFileContent, uploadFile } from '@/lib/services/googleDrive'
import { getOrCreatePlanTrabajoFolder } from '@/lib/planTrabajo/getOrCreatePlanTrabajoFolder'
import { getOrCreateAlcanceImagenesFolder } from '@/lib/planTrabajo/getOrCreateAlcanceImagenesFolder'
import { redimensionarImagen } from '@/lib/planTrabajo/redimensionarImagen'
import { extraerImagenesDeDocx } from '@/lib/planTrabajo/extraerImagenesDeDocx'
import { calcularNumerosDeFigura } from '@/lib/planTrabajo/numerosDeFigura'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/proyectos/[id]/plan-trabajo/subir-version/completar
 * Paso 3 de 3. El navegador ya subió el archivo DIRECTO a Drive (ver
 * subir-version/iniciar); acá solo llega el id del archivo creado — nunca
 * los bytes, así que no choca con el límite de tamaño de request. Se
 * valida que el archivo esté en la carpeta esperada, se descarga desde
 * Drive para extraer imágenes, y se registra como la nueva versión
 * OFICIAL vigente del Plan de Trabajo. Las fotos que ya estaban en el
 * sistema se reconocen por su caption "Figura N." (ver
 * extraerImagenesDeDocx.ts) y no se duplican; las fotos genuinamente
 * nuevas quedan en PlanTrabajoImagenPendiente para asignarlas a mano
 * (ver .../imagenes-pendientes).
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
    select: { id: true, codigo: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
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

  const planDb = await prisma.planTrabajo.findUnique({ where: { proyectoId } })
  if (!planDb) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  let body: { driveFileId?: string; archivoNombre?: string; tamanioBytes?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const { driveFileId, archivoNombre, tamanioBytes } = body
  if (!driveFileId || !archivoNombre || typeof tamanioBytes !== 'number') {
    return NextResponse.json({ error: 'Faltan datos del archivo subido' }, { status: 400 })
  }

  const driveFolderId = await getOrCreatePlanTrabajoFolder(proyecto.codigo)

  const driveFile = await getFile(driveFileId)
  if (!driveFile.parents?.includes(driveFolderId)) {
    return NextResponse.json({ error: 'El archivo no corresponde a este proyecto' }, { status: 400 })
  }
  if (!driveFile.webViewLink) {
    return NextResponse.json({ error: 'El archivo subido no tiene link de Drive' }, { status: 500 })
  }

  // La fila nueva pasa a ser la vigente — se apaga cualquier otra del mismo plan.
  const [, generacion] = await prisma.$transaction([
    prisma.planTrabajoGeneracion.updateMany({
      where: { planTrabajoId: planDb.id, vigente: true },
      data: { vigente: false },
    }),
    prisma.planTrabajoGeneracion.create({
      data: {
        planTrabajoId: planDb.id,
        numeroRevision: planDb.numeroRevision ?? 'A',
        driveFileId,
        webViewLink: driveFile.webViewLink,
        driveFolderId,
        archivoNombre,
        tamanioBytes,
        origen: 'IMPORTADO',
        vigente: true,
        snapshotData: { plan: planDb, organigramaPngBase64: '' },
        generadoPorId: userId,
      },
    }),
  ])

  // Extraer imágenes del docx e identificar cuáles ya existían (por su
  // caption "Figura N.") — el resto son fotos nuevas, quedan pendientes.
  let imagenesNuevasPendientes = 0
  try {
    const { data: buffer } = await getFileContent(driveFileId)
    const extraidas = extraerImagenesDeDocx(buffer)
    if (extraidas.length > 0) {
      const imagenesAlcance = await prisma.planTrabajoImagen.findMany({ where: { planTrabajoId: planDb.id } })
      const alcanceDetallado = (planDb.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []
      const numerosDeFigura = calcularNumerosDeFigura(alcanceDetallado, imagenesAlcance)
      const figuraYaExiste = new Set(numerosDeFigura.values())

      const imagenesFolderId = await getOrCreateAlcanceImagenesFolder(proyecto.codigo)

      for (const img of extraidas) {
        if (img.numeroFigura !== null && figuraYaExiste.has(img.numeroFigura)) continue

        try {
          const bytesRedimensionados = await redimensionarImagen(img.bytes, img.mimeType)
          const driveImg = await uploadFile({
            folderId: imagenesFolderId,
            fileName: `${Date.now()}_${img.nombreArchivoOriginal}`,
            mimeType: img.mimeType,
            buffer: bytesRedimensionados,
          })
          if (!driveImg.id) continue

          await prisma.planTrabajoImagenPendiente.create({
            data: {
              planTrabajoId: planDb.id,
              generacionId: generacion.id,
              driveFileId: driveImg.id,
              nombreArchivo: img.nombreArchivoOriginal,
              tipoArchivo: img.mimeType,
              tamano: bytesRedimensionados.length,
              orden: img.orden,
            },
          })
          imagenesNuevasPendientes++
        } catch (e) {
          console.error('[subir-version/completar] Error subiendo una imagen extraída (no bloqueante):', e)
        }
      }
    }
  } catch (e) {
    console.error('[subir-version/completar] Error extrayendo imágenes del docx (no bloqueante, la versión ya se subió):', e)
  }

  return NextResponse.json({ data: { generacion, imagenesNuevasPendientes } }, { status: 201 })
}
