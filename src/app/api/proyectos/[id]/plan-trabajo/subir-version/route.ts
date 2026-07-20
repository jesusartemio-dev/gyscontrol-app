import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/services/googleDrive'
import { getOrCreatePlanTrabajoFolder } from '@/lib/planTrabajo/getOrCreatePlanTrabajoFolder'
import { getOrCreateAlcanceImagenesFolder } from '@/lib/planTrabajo/getOrCreateAlcanceImagenesFolder'
import { redimensionarImagen } from '@/lib/planTrabajo/redimensionarImagen'
import { extraerImagenesDeDocx } from '@/lib/planTrabajo/extraerImagenesDeDocx'
import { calcularNumerosDeFigura } from '@/lib/planTrabajo/numerosDeFigura'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

type Ctx = { params: Promise<{ id: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_TAMANO_BYTES = 20 * 1024 * 1024

/**
 * POST /api/proyectos/[id]/plan-trabajo/subir-version
 * Sube el .docx que Proyectos editó a mano fuera de la app (corrigió
 * redacción, a veces pegó fotos nuevas) como la nueva versión OFICIAL
 * vigente del Plan de Trabajo. Las fotos que ya estaban en el sistema se
 * reconocen por su caption "Figura N." (ver extraerImagenesDeDocx.ts) y no
 * se duplican; las fotos genuinamente nuevas quedan en
 * PlanTrabajoImagenPendiente para que alguien las asigne a mano a la tarea
 * correcta (ver .../imagenes-pendientes).
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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se espera multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("file")' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return NextResponse.json({ error: 'Solo se admiten archivos .docx' }, { status: 400 })
  }
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: `El archivo supera el límite de ${MAX_TAMANO_BYTES / 1024 / 1024}MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const driveFolderId = await getOrCreatePlanTrabajoFolder(proyecto.codigo)
  const archivoNombre = `PT_${proyecto.codigo}_Rev${planDb.numeroRevision}_editado.docx`
  const driveFile = await uploadFile({
    folderId: driveFolderId,
    fileName: archivoNombre,
    mimeType: MIME_DOCX,
    buffer,
  })
  if (!driveFile.id || !driveFile.webViewLink) {
    return NextResponse.json({ error: 'Error subiendo el archivo a Drive' }, { status: 500 })
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
        driveFileId: driveFile.id,
        webViewLink: driveFile.webViewLink,
        driveFolderId,
        archivoNombre,
        tamanioBytes: buffer.length,
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
          console.error('[subir-version] Error subiendo una imagen extraída (no bloqueante):', e)
        }
      }
    }
  } catch (e) {
    console.error('[subir-version] Error extrayendo imágenes del docx (no bloqueante, la versión ya se subió):', e)
  }

  return NextResponse.json({ data: { generacion, imagenesNuevasPendientes } }, { status: 201 })
}
