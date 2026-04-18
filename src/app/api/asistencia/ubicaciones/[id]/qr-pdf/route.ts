import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { construirPayloadQrEstatico, generarQrEstatico } from '@/lib/utils/qrTotp'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const ubicacion = await prisma.ubicacion.findUnique({ where: { id } })
  if (!ubicacion) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })

  const token = generarQrEstatico(ubicacion.qrSecret, ubicacion.id)
  const payload = construirPayloadQrEstatico(token)
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 600, margin: 2 })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setFontSize(22)
  pdf.text('Control de Asistencia', 105, 25, { align: 'center' })
  pdf.setFontSize(16)
  pdf.text(ubicacion.nombre, 105, 38, { align: 'center' })
  pdf.setFontSize(11)
  pdf.text(`Tipo: ${ubicacion.tipo.toUpperCase()}`, 105, 46, { align: 'center' })
  if (ubicacion.direccion) pdf.text(ubicacion.direccion, 105, 52, { align: 'center' })

  pdf.addImage(qrDataUrl, 'PNG', 55, 60, 100, 100)

  pdf.setFontSize(12)
  pdf.text('Escanea este código desde la app GySControl', 105, 175, { align: 'center' })
  pdf.text('para marcar tu ingreso o salida', 105, 182, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 105, 280, { align: 'center' })

  const bytes = pdf.output('arraybuffer')
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="qr-${ubicacion.nombre.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
