import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFileContent } from '@/lib/services/googleDrive'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'no-auth' }, { status: 401 })

  const fileId = process.env.GOOGLE_DRIVE_IPERC_TEMPLATE_FILE_ID
  if (!fileId) return NextResponse.json({ error: 'no-fileid' }, { status: 500 })

  const result = await getFileContent(fileId)

  const firstBytes = Array.from(result.data.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  const text = result.data.toString('binary')
  const tieneMediaXml = text.includes('xl/media/')
  const tieneDrawingXml = text.includes('xl/drawings/')

  return NextResponse.json({
    fileId,
    fileName: result.fileName,
    mimeType: result.mimeType,
    sizeBytes: result.data.length,
    sizeKB: (result.data.length / 1024).toFixed(1),
    firstBytesHex: firstBytes,
    esZipValido: firstBytes.startsWith('50 4b'),
    contieneMediaFolder: tieneMediaXml,
    contieneDrawingsFolder: tieneDrawingXml,
  })
}
